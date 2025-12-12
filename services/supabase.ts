
import { createClient } from '@supabase/supabase-js';
import { User, UserRole, Module, QuizAttempt, AppConfig, Broadcast, CalendarEvent, AdminUser, Notification } from '../types';

// --- CONFIGURACIÓN DE SUPABASE ---
const supabaseUrl = 'https://lybzvkuvjnxbfbaddnfc.supabase.co';
const supabaseKey = 'sb_publishable_E9oPLgg2ZNx-ovOTTtM81A_s4tKPG3f';

export const supabase = createClient(supabaseUrl, supabaseKey);

export class SupabaseService {

  // --- SETTINGS (MENSAJE DE BIENVENIDA) ---
  static async getWelcomeMessage(): Promise<string> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'welcome_message')
      .single();
    
    // Fallback por si la tabla no existe o está vacía
    if (error || !data) {
        return "Estamos felices de acompañarte. Comienza en el Módulo 1.";
    }
    return data.value;
  }

  static async updateWelcomeMessage(text: string): Promise<void> {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'welcome_message', value: text });
    
    if (error) throw new Error("Error guardando mensaje: " + error.message);
  }

  // --- STORAGE ---
  static async uploadFile(file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'dat';
      // Saneamiento simple: alfanumérico y guiones bajos
      const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
      const cleanName = baseName.replace(/[^a-zA-Z0-9]/g, '_'); 
      const fileName = `${Date.now()}_${cleanName}.${fileExt}`;

      const { error } = await supabase.storage
        .from('module-files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error("Upload Error:", error);
        throw new Error(`Storage Error: ${error.message}`);
      }

      // En Supabase v2, getPublicUrl es síncrono y devuelve { data: { publicUrl } }
      const { data } = supabase.storage
        .from('module-files')
        .getPublicUrl(fileName);

      if (!data || !data.publicUrl) {
         throw new Error("No se pudo obtener la URL pública del archivo.");
      }

      return data.publicUrl;
    } catch (error: any) {
      console.error("Error en uploadFile:", error);
      throw new Error(error.message || "Error desconocido al subir archivo.");
    }
  }

  // --- AUTH & USERS ---
  static async loginStudent(email: string, passwordInput: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', 'STUDENT')
      .single();

    if (error || !data) return null;
    if (data.password !== passwordInput) return null;

    return this.mapUser(data);
  }

  static async checkAdminStatus(email: string): Promise<{ status: 'NOT_FOUND' | 'NEEDS_SETUP' | 'ACTIVE'; name?: string }> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) return { status: 'NOT_FOUND' };
    if (data.role !== 'ADMIN') return { status: 'NOT_FOUND' };
    
    if (!data.password) return { status: 'NEEDS_SETUP', name: data.name };

    return { status: 'ACTIVE', name: data.name };
  }

  static async loginAdmin(email: string, passwordInput: string): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) throw new Error("Usuario no encontrado");
    if (data.role !== 'ADMIN') throw new Error("No es administrador");
    if (!data.password) throw new Error("La cuenta requiere configuración.");
    if (data.password !== passwordInput) throw new Error("Contraseña incorrecta");

    return this.mapUser(data);
  }

  static async setupAdminPassword(email: string, newPassword: string): Promise<User> {
      const { data, error } = await supabase
      .from('users')
      .update({ password: newPassword })
      .eq('email', email)
      .select()
      .single();

      if (error) throw new Error("Error al configurar contraseña");
      return this.mapUser(data);
  }

  static async register(userData: any): Promise<User> {
    // 1. Insertar Usuario
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{
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
        completed_modules: []
      }])
      .select()
      .single();

    if (error) throw new Error('Error al registrar. El correo podría ya existir.');

    // 2. Obtener Mensaje de Bienvenida Dinámico
    const welcomeMsg = await this.getWelcomeMessage();

    // 3. Crear Notificación de Bienvenida
    await supabase.from('notifications').insert([{
        user_id: newUser.id,
        message: welcomeMsg,
        read: false,
        timestamp: Date.now(),
        type: 'success'
    }]);

    return this.mapUser(newUser);
  }

  static async getAllUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*'); 
    if (error) return [];
    return data.map((u: any) => this.mapUser(u));
  }

  static async deleteUser(id: string): Promise<void> {
      await supabase.from('users').delete().eq('id', id);
  }

  static async updateUser(user: User): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({
        name: user.name,
        age: user.age,
        phone: user.phone,
        address: user.address,
        sacraments: user.sacramentTypes,
        marital_status: user.maritalStatus,
        birth_place: user.birthPlace,
        completed_modules: user.completedModules
      })
      .eq('id', user.id)
      .select()
      .single();

    if(error) throw new Error(error.message);
    return this.mapUser(data);
  }

  // --- MODULES ---
  static async getModules(): Promise<Module[]> {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('order', { ascending: true });

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
    
    const { error } = await supabase
      .from('modules')
      .upsert({
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

  // --- CONFIGURACIÓN ---
  static async getAppConfig(): Promise<AppConfig> {
    const { data, error } = await supabase
      .from('app_config')
      .select('*')
      .single();

    if (error || !data) {
      return { heroImage: 'https://picsum.photos/1200/400', landingBackground: '', primaryColor: 'blue' };
    }

    return {
      heroImage: data.hero_image,
      landingBackground: data.landing_background,
      primaryColor: data.primary_color
    };
  }

  static async updateAppConfig(config: AppConfig): Promise<void> {
    const { error } = await supabase
      .from('app_config')
      .upsert({
        id: 1,
        hero_image: config.heroImage,
        landing_background: config.landingBackground,
        primary_color: config.primaryColor
      });
      
    if (error) throw error;
  }

  // --- EQUIPO (ADMINS) ---
  static async getAdminList(): Promise<AdminUser[]> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'ADMIN');
    
    if (error || !data) return [];
    
    return data.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        password: u.password,
        isSuperAdmin: u.is_super_admin || false
    }));
  }

  static async inviteAdmin(name: string, email: string): Promise<void> {
     const { error } = await supabase.from('users').insert([{
         name: name,
         email: email,
         role: 'ADMIN',
         password: null,
         is_super_admin: false,
         completed_modules: []
     }]);
     if (error) throw new Error(error.message);
  }

  static async resetAdminAccess(id: string): Promise<void> {
      await supabase.from('users').update({ password: null }).eq('id', id);
  }

  // --- NOTIFICACIONES & BROADCASTS ---
  static async getNotifications(userId: string): Promise<Notification[]> {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (error) return [];
      
      return data.map((n: any) => ({
          id: n.id,
          userId: n.user_id,
          message: n.message,
          read: n.read,
          timestamp: n.timestamp,
          type: n.type
      }));
  }

  static async getBroadcastHistory(): Promise<Broadcast[]> {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .order('sent_at', { ascending: false });

      if (error) return [];

      return data.map((b: any) => ({
          id: b.id,
          title: b.title,
          body: b.body,
          importance: b.importance,
          sentAt: b.sent_at,
          recipientsCount: b.recipients_count
      }));
  }

  static async sendBroadcast(title: string, body: string, importance: string): Promise<void> {
      const students = await this.getAllUsers(); 
      const targetUsers = students.filter(u => u.role === 'STUDENT');

      const { error: broadcastError } = await supabase.from('broadcasts').insert([{
          id: Date.now().toString(),
          title,
          body,
          importance,
          sent_at: Date.now(),
          recipients_count: targetUsers.length
      }]);

      if (broadcastError) throw new Error("Error guardando historial: " + broadcastError.message);

      if (targetUsers.length > 0) {
          const notifications = targetUsers.map(u => ({
              user_id: u.id,
              message: `${title}: ${body}`,
              read: false,
              timestamp: Date.now(),
              type: importance === 'high' ? 'alert' : 'message'
          }));

          const { error: notifError } = await supabase.from('notifications').insert(notifications);
          if (notifError) console.error("Error enviando notificaciones individuales", notifError);
      }
  }

  static async deleteBroadcast(id: string): Promise<void> {
      const { error } = await supabase.from('broadcasts').delete().eq('id', id);
      if (error) throw new Error("Error al eliminar comunicado: " + error.message);
  }

  // --- CALENDARIO ---
  static async getEvents(): Promise<CalendarEvent[]> {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*');
        
      if (error) return [];
      // Casting seguro
      return data.map((e: any) => ({
        id: e.id,
        date: e.date,
        location: e.location,
        time: e.time,
        duration: e.duration,
        cost: e.cost
      }));
  }

  static async addEvent(event: CalendarEvent): Promise<void> {
      // Limpiamos el objeto para asegurar que coincida EXACTAMENTE con la tabla
      // y no enviamos referencias u objetos anidados.
      const payload = {
        id: event.id,
        date: event.date,
        location: event.location,
        time: event.time,
        duration: event.duration,
        cost: event.cost
      };

      const { error } = await supabase
        .from('calendar_events')
        .insert([payload]);
        
      if (error) {
        // Mensaje de error detallado para el usuario
        if (error.message.includes("schema cache") || error.message.includes("Could not find")) {
           throw new Error("⚠️ ERROR CRÍTICO DE BASE DE DATOS: La estructura de la tabla no coincide. Por favor, ejecuta el Script SQL 'REPARACIÓN NUCLEAR' en Supabase para limpiar la caché.");
        }
        throw new Error("Error guardando evento: " + error.message);
      }
  }

  // --- QUIZ LOGIC ---
  static getAttempts(userId: string): QuizAttempt[] { 
    return []; 
  } 

  static async submitQuiz(userId: string, moduleId: string, score: number): Promise<{ passed: boolean; lockedUntil?: number }> { 
     const passed = score >= 80;
     let lockedUntil: number | undefined;
     
     if (passed) {
        try {
            const { data: user } = await supabase.from('users').select('completed_modules').eq('id', userId).single();
            const currentModules = user?.completed_modules || [];
            
            if (!currentModules.includes(moduleId)) {
                await supabase.from('users').update({ 
                    completed_modules: [...currentModules, moduleId] 
                }).eq('id', userId);
            }
        } catch (error) { console.error(error); }
     } else {
        lockedUntil = Date.now() + (48 * 60 * 60 * 1000);
     }
     return { passed, lockedUntil }; 
  }

  private static mapUser(dbUser: any): User {
    // Mapeo defensivo para asegurar que no falle si falta una columna en DB antigua
    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role as UserRole,
      age: dbUser.age,
      maritalStatus: dbUser.marital_status, // Mapeo snake_case a camelCase
      birthPlace: dbUser.birth_place,       // Mapeo snake_case a camelCase
      phone: dbUser.phone,
      address: dbUser.address,
      sacramentTypes: dbUser.sacraments || [], // Mapeo de nombre de columna
      completedModules: dbUser.completed_modules || [],
      isSuperAdmin: dbUser.is_super_admin
    };
  }
}
