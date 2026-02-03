
import { createClient } from '@supabase/supabase-js';
import { User, UserRole, Module, QuizAttempt, AppConfig, Broadcast, CalendarEvent, AdminUser, Notification } from '../types';

const supabaseUrl = 'https://lybzvkuvjnxbfbaddnfc.supabase.co';
const supabaseKey = 'sb_publishable_E9oPLgg2ZNx-ovOTTtM81A_s4tKPG3f';

export const supabase = createClient(supabaseUrl, supabaseKey);

export class SupabaseService {

  static async getWelcomeMessage(): Promise<string> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'welcome_message')
      .single();
    if (error || !data) return "Estamos felices de acompañarte. Comienza en el Módulo 1.";
    return data.value;
  }

  static async updateWelcomeMessage(text: string): Promise<void> {
    await supabase.from('app_settings').upsert({ key: 'welcome_message', value: text });
  }

  static async uploadFile(file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'dat';
      const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
      const cleanName = baseName.replace(/[^a-zA-Z0-9]/g, '_'); 
      const fileName = `${Date.now()}_${cleanName}.${fileExt}`;
      const { error } = await supabase.storage.from('module-files').upload(fileName, file, { cacheControl: '3600', upsert: true });
      if (error) throw new Error(`Storage Error: ${error.message}`);
      const { data } = supabase.storage.from('module-files').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error: any) {
      throw new Error(error.message || "Error desconocido al subir archivo.");
    }
  }

  static async loginStudent(email: string, passwordInput: string): Promise<User | null> {
    const { data, error } = await supabase.from('users').select('*').eq('email', email).eq('role', 'STUDENT').single();
    if (error || !data) return null;
    if (data.password !== passwordInput) return null;
    return this.mapUser(data);
  }

  static async checkAdminStatus(email: string): Promise<{ status: 'NOT_FOUND' | 'NEEDS_SETUP' | 'ACTIVE'; name?: string }> {
    const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
    if (error || !data) return { status: 'NOT_FOUND' };
    if (data.role !== 'ADMIN') return { status: 'NOT_FOUND' };
    if (!data.password) return { status: 'NEEDS_SETUP', name: data.name };
    return { status: 'ACTIVE', name: data.name };
  }

  static async loginAdmin(email: string, passwordInput: string): Promise<User> {
    const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
    if (error || !data) throw new Error("Usuario no encontrado");
    if (data.role !== 'ADMIN') throw new Error("No es administrador");
    if (!data.password) throw new Error("La cuenta requiere configuración.");
    if (data.password !== passwordInput) throw new Error("Contraseña incorrecta");
    return this.mapUser(data);
  }

  static async setupAdminPassword(email: string, newPassword: string): Promise<User> {
      const { data, error } = await supabase.from('users').update({ password: newPassword }).eq('email', email).select().single();
      if (error) throw new Error("Error al configurar contraseña");
      return this.mapUser(data);
  }

  static async register(userData: any): Promise<User> {
    const { data: newUser, error } = await supabase.from('users').insert([{
        name: userData.name,
        email: userData.email,
        password: userData.password,
        age: userData.age,
        marital_status: userData.maritalStatus,
        role: 'STUDENT',
        sacraments: userData.sacramentTypes || [],
        phone: userData.phone,
        address: userData.address,
        birth_place: userData.birthPlace, 
        completed_modules: [],
        average_score: 0
    }]).select().single();
    
    // REQUERIMIENTO: Mostrar error detallado de Supabase para depuración real
    if (error) throw new Error(error.message || 'Error al registrar en la base de datos.');

    const welcomeMsg = await this.getWelcomeMessage();
    await supabase.from('notifications').insert([{ user_id: newUser.id, message: welcomeMsg, read: false, timestamp: Date.now(), type: 'success' }]);
    return this.mapUser(newUser);
  }

  static async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*').order('name', { ascending: true }); 
    if (error) return [];
    return data.map((u: any) => this.mapUser(u));
  }

  static async deleteUser(id: string): Promise<void> {
      // REQUERIMIENTO: Ejecutar DELETE con confirmación de error para evitar desincronización en UI
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw new Error(`No se pudo eliminar el usuario: ${error.message}`);
  }

  // REQUERIMIENTO: Nueva función para restablecer contraseña de alumnos (password a null)
  static async resetStudentPassword(id: string): Promise<void> {
      const { error } = await supabase.from('users').update({ password: null }).eq('id', id);
      if (error) throw new Error(`Error al restablecer contraseña: ${error.message}`);
  }

  static async updateUser(user: User): Promise<User> {
    const { data, error } = await supabase.from('users').update({
        name: user.name,
        age: user.age,
        phone: user.phone,
        address: user.address,
        sacraments: user.sacramentTypes,
        marital_status: user.maritalStatus,
        birth_place: user.birthPlace,
        completed_modules: user.completedModules
      }).eq('id', user.id).select().single();
    if(error) throw new Error(error.message);
    return this.mapUser(data);
  }

  static async getModules(): Promise<Module[]> {
    const { data, error } = await supabase.from('modules').select('*').order('order', { ascending: true });
    if (error) return [];
    return data.map((m: any) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      order: m.order,
      imageUrl: m.image_url,
      videoUrl: '', 
      content: '', 
      topics: m.topics || [], 
      resources: m.resources || [],
      questions: m.questions || []
    }));
  }

  static async updateModule(updatedModule: Module): Promise<void> {
    const cleanTopics = Array.isArray(updatedModule.topics) ? updatedModule.topics : [];
    const { error } = await supabase.from('modules').upsert({
        id: updatedModule.id, 
        title: updatedModule.title,
        description: updatedModule.description,
        image_url: updatedModule.imageUrl,
        topics: cleanTopics, 
        questions: updatedModule.questions,
        resources: updatedModule.resources,
        order: updatedModule.order 
      });
    if (error) throw new Error(error.message);
  }

  static async deleteModule(id: string): Promise<void> {
    await supabase.from('modules').delete().eq('id', id);
  }

  static async getAppConfig(): Promise<AppConfig> {
    const { data, error } = await supabase.from('app_config').select('*').single();
    if (error || !data) return { heroImage: 'https://picsum.photos/1200/400', landingBackground: '', primaryColor: 'blue' };
    return { 
      heroImage: data.hero_image, 
      landingBackground: data.landing_background, 
      primaryColor: data.primary_color 
    };
  }

  static async updateAppConfig(config: AppConfig): Promise<void> {
    await supabase.from('app_config').upsert({ id: 1, hero_image: config.heroImage, landing_background: config.landingBackground, primary_color: config.primaryColor });
  }

  static async getAdminList(): Promise<AdminUser[]> {
    const { data, error } = await supabase.from('users').select('*').eq('role', 'ADMIN');
    if (error || !data) return [];
    return data.map((u: any) => ({ id: u.id, name: u.name, email: u.email, password: u.password, isSuperAdmin: u.is_super_admin || false }));
  }

  static async inviteAdmin(name: string, email: string): Promise<void> {
     const { data: existingUser } = await supabase.from('users').select('id, role').eq('email', email).single();
     if (existingUser) {
        await supabase.from('users').update({ role: 'ADMIN', password: null, name: name }).eq('id', existingUser.id);
     } else {
        await supabase.from('users').insert([{ name: name, email: email, role: 'ADMIN', password: null, is_super_admin: false, completed_modules: [] }]);
     }
  }

  static async resetAdminAccess(id: string): Promise<void> {
      await supabase.from('users').update({ password: null }).eq('id', id);
  }

  static async getNotifications(userId: string): Promise<Notification[]> {
      const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('timestamp', { ascending: false });
      if (error) return [];
      return data.map((n: any) => ({ id: n.id, userId: n.user_id, message: n.message, read: n.read, timestamp: n.timestamp, type: n.type }));
  }

  static async getBroadcastHistory(): Promise<Broadcast[]> {
      const { data, error } = await supabase.from('broadcasts').select('*').order('sent_at', { ascending: false });
      if (error) return [];
      return data.map((b: any) => ({ id: b.id, title: b.title, body: b.body, importance: b.importance, sentAt: b.sent_at, recipientsCount: b.recipients_count }));
  }

  static async sendBroadcast(title: string, body: string, importance: string): Promise<void> {
      const students = await this.getAllUsers(); 
      const targetUsers = students.filter(u => u.role === 'STUDENT');
      await supabase.from('broadcasts').insert([{ id: Date.now().toString(), title, body, importance, sent_at: Date.now(), recipients_count: targetUsers.length }]);
      if (targetUsers.length > 0) {
          const notifications = targetUsers.map(u => ({ user_id: u.id, message: `${title}: ${body}`, read: false, timestamp: Date.now(), type: importance === 'high' ? 'alert' : 'message' }));
          await supabase.from('notifications').insert(notifications);
      }
  }

  static async deleteBroadcast(id: string): Promise<void> {
      await supabase.from('broadcasts').delete().eq('id', id);
  }

  static async getEvents(): Promise<CalendarEvent[]> {
      const { data, error } = await supabase.from('calendar_events').select('*');
      if (error) return [];
      return data.map((e: any) => ({ id: e.id, date: e.date, location: e.location, time: e.time, duration: e.duration, cost: e.cost }));
  }

  static async addEvent(event: CalendarEvent): Promise<void> {
      const { error } = await supabase.from('calendar_events').insert([{ id: event.id, date: event.date, location: event.location, time: event.time, duration: event.duration, cost: event.cost }]);
      if (error) throw new Error("Error guardando evento.");
  }

  static async deleteEvent(id: string): Promise<void> {
      await supabase.from('calendar_events').delete().eq('id', id);
  }

  static async updateEvent(event: CalendarEvent): Promise<void> {
      await supabase.from('calendar_events').update({ date: event.date, location: event.location, time: event.time, duration: event.duration, cost: event.cost }).eq('id', event.id);
  }

  static getAttempts(userId: string): QuizAttempt[] { 
    return []; 
  } 

  static async submitQuiz(userId: string, moduleId: string, score: number): Promise<{ passed: boolean; lockedUntil?: number }> { 
     const passed = score >= 80;
     let lockedUntil: number | undefined;
     
     // 1. Registrar el intento en la tabla histórica
     await supabase.from('quiz_attempts').insert([{
         user_id: userId,
         module_id: moduleId,
         score: score,
         passed: passed,
         timestamp: Date.now()
     }]);

     if (passed) {
        try {
            // 2. Actualizar lista de módulos completados
            const { data: user } = await supabase.from('users').select('completed_modules').eq('id', userId).single();
            const currentModules = user?.completed_modules || [];
            if (!currentModules.includes(moduleId)) {
                await supabase.from('users').update({ completed_modules: [...currentModules, moduleId] }).eq('id', userId);
            }

            // 3. RECALCULAR PROMEDIO GENERAL (Requerimiento)
            const { data: attempts } = await supabase.from('quiz_attempts').select('score').eq('user_id', userId).eq('passed', true);
            if (attempts && attempts.length > 0) {
                const sum = attempts.reduce((acc, curr) => acc + curr.score, 0);
                const avg = sum / attempts.length;
                await supabase.from('users').update({ average_score: avg }).eq('id', userId);
            }
        } catch (error) { console.error("Error actualizando progreso:", error); }
     } else {
        lockedUntil = Date.now() + (48 * 60 * 60 * 1000);
     }
     return { passed, lockedUntil }; 
  }

  private static mapUser(dbUser: any): User {
    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role as UserRole,
      age: dbUser.age,
      maritalStatus: dbUser.marital_status,
      birthPlace: dbUser.birth_place,
      phone: dbUser.phone,
      address: dbUser.address,
      sacramentTypes: dbUser.sacraments || [],
      completedModules: dbUser.completed_modules || [],
      averageScore: dbUser.average_score || 0,
      isSuperAdmin: dbUser.is_super_admin
    };
  }
}
