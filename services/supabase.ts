import { createClient } from '@supabase/supabase-js';
import { User, UserRole, Module, QuizAttempt, AppConfig, Broadcast, CalendarEvent, AdminUser, Notification } from '../types';

// --- CONFIGURACIÓN DE SUPABASE ---
const supabaseUrl = 'https://lybzvkuvjnxbfbaddnfc.supabase.co';
const supabaseKey = 'sb_publishable_E9oPLgg2ZNx-ovOTTtM81A_s4tKPG3f';

export const supabase = createClient(supabaseUrl, supabaseKey);

export class SupabaseService {

  // --- STORAGE ---
  static async uploadFile(file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      // Limpiar nombre para evitar errores en URL
      const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${Date.now()}_${cleanName}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('module-files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('module-files')
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (error: any) {
      console.error("Error Storage:", error);
      throw new Error("No se pudo subir el archivo. Verifica en Supabase que el bucket 'module-files' exista y sea PÚBLICO.");
    }
  }

  // --- AUTH & USERS ---
  static async loginStudent(email: string, passwordInput: string) {
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

  static async checkAdminStatus(email: string) {
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

  static async loginAdmin(email: string, passwordInput: string) {
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

  static async setupAdminPassword(email: string, newPassword: string) {
      const { data, error } = await supabase
      .from('users')
      .update({ password: newPassword })
      .eq('email', email)
      .select()
      .single();

      if (error) throw new Error("Error al configurar contraseña");
      return this.mapUser(data);
  }

  static async register(userData: any) {
    const { data, error } = await supabase
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
        completed_modules: []
      }])
      .select()
      .single();

    if (error) throw new Error('Error al registrar. El correo podría ya existir.');
    return this.mapUser(data);
  }

  static async getAllUsers() {
    const { data, error } = await supabase.from('users').select('*'); 
    if (error) return [];
    return data.map((u: any) => this.mapUser(u));
  }

  static async deleteUser(id: string) {
      await supabase.from('users').delete().eq('id', id);
  }

  static async updateUser(user: any) {
    const { data, error } = await supabase
      .from('users')
      .update({
        name: user.name,
        age: user.age,
        phone: user.phone,
        address: user.address,
        sacraments: user.sacramentTypes,
        marital_status: user.maritalStatus,
        completed_modules: user.completedModules
      })
      .eq('id', user.id)
      .select()
      .single();

    if(error) throw error;
    return this.mapUser(data);
  }

  // --- MODULES ---
  static async getModules() {
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

  static async updateModule(updatedModule: Module) {
    const cleanTopics = Array.isArray(updatedModule.topics) ? updatedModule.topics : [];
    
    // Si el ID es temporal (creado con Date.now()), dejamos que el upsert maneje la creación
    // Nota: Para producción idealmente usaríamos UUIDs generados por la DB, pero esto mantiene compatibilidad
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

  // --- CONFIGURACIÓN (Ahora en Supabase) ---
  static async getAppConfig(): Promise<AppConfig> {
    const { data, error } = await supabase
      .from('app_config')
      .select('*')
      .single();

    if (error || !data) {
      // Default fallback
      return { heroImage: 'https://picsum.photos/1200/400', landingBackground: '', primaryColor: 'blue' };
    }

    return {
      heroImage: data.hero_image,
      landingBackground: data.landing_background,
      primaryColor: data.primary_color
    };
  }

  static async updateAppConfig(config: AppConfig) {
    const { error } = await supabase
      .from('app_config')
      .upsert({
        id: 1, // Siempre actualizamos la fila 1
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

  static async inviteAdmin(name: string, email: string) {
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

  static async resetAdminAccess(id: string) {
      await supabase.from('users').update({ password: null }).eq('id', id);
  }

  // --- NOTIFICACIONES & BROADCASTS (Ahora en Supabase) ---
  static async getNotifications(userId: string): Promise<Notification[]> {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (error) return [];
      
      // Mapear de snake_case a camelCase
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

  static async sendBroadcast(title: string, body: string, importance: string) {
      // 1. Obtener todos los alumnos
      const students = await this.getAllUsers(); // Filtra estudiantes internamente si es necesario, pero aquí trae todos
      const targetUsers = students.filter(u => u.role === 'STUDENT');

      // 2. Guardar en Historial (Broadcasts)
      const { error: broadcastError } = await supabase.from('broadcasts').insert([{
          id: Date.now().toString(),
          title,
          body,
          importance,
          sent_at: Date.now(),
          recipients_count: targetUsers.length
      }]);

      if (broadcastError) throw new Error("Error guardando historial: " + broadcastError.message);

      // 3. Insertar notificaciones individuales (Bulk Insert)
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

  // --- CALENDARIO (Ahora en Supabase) ---
  static async getEvents(): Promise<CalendarEvent[]> {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*');
        
      if (error) return [];
      return data as CalendarEvent[];
  }

  static async addEvent(event: CalendarEvent) {
      const { error } = await supabase
        .from('calendar_events')
        .insert([event]);
        
      if (error) throw new Error("Error guardando evento: " + error.message);
  }

  // --- QUIZ LOGIC ---
  static getAttempts(userId: string): QuizAttempt[] { return []; } 

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

  // Helper Mapper
  private static mapUser(dbUser: any) {
    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      password: dbUser.password,
      role: dbUser.role,
      age: dbUser.age,
      maritalStatus: dbUser.marital_status,
      birthPlace: dbUser.birth_place,
      phone: dbUser.phone,
      address: dbUser.address,
      sacramentTypes: dbUser.sacraments || [],
      completedModules: dbUser.completed_modules || [],
      isSuperAdmin: dbUser.is_super_admin
    };
  }
}
