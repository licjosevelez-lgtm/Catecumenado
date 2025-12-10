import { User, UserRole, Module, QuizAttempt, AppConfig, Notification, AdminUser, Broadcast, CalendarEvent } from '../types';
import { supabase } from './supabase';

export const INITIAL_ADMIN = null;

// Helper para convertir datos de BD (snake_case) a App (camelCase)
const mapUser = (dbUser: any): User => ({
  id: dbUser.id,
  name: dbUser.name,
  email: dbUser.email,
  role: dbUser.role as UserRole,
  isSuperAdmin: dbUser.is_super_admin,
  completedModules: dbUser.completed_modules || [],
  age: dbUser.age,
  maritalStatus: dbUser.marital_status,
  birthPlace: dbUser.birth_place,
  phone: dbUser.phone,
  address: dbUser.address,
  sacramentTypes: dbUser.sacraments || []
});

export const MockService = {
  // --- Admin Auth & Management ---
  
  getAdminList: async (): Promise<AdminUser[]> => {
    const { data } = await supabase.from('users').select('*').eq('role', 'ADMIN');
    return data?.map(u => ({ ...mapUser(u), password: u.password })) || [];
  },

  checkAdminStatus: async (email: string): Promise<{ status: 'NOT_FOUND' | 'NEEDS_SETUP' | 'ACTIVE', name?: string }> => {
    const { data, error } = await supabase
      .from('users')
      .select('name, password, role')
      .eq('email', email)
      .single();

    if (error || !data || data.role !== 'ADMIN') return { status: 'NOT_FOUND' };
    
    // Si la contraseña es NULL en la BD, devuelve NEEDS_SETUP
    if (!data.password) return { status: 'NEEDS_SETUP', name: data.name };
    
    return { status: 'ACTIVE', name: data.name };
  },

  loginAdmin: async (email: string, password?: string): Promise<User> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data || data.role !== 'ADMIN') throw new Error("Administrador no encontrado");

    // Si password es null, requiere setup
    if (!data.password) throw new Error("La cuenta requiere configuración de contraseña.");
    
    // Validar contraseña
    if (data.password !== password) throw new Error("Contraseña incorrecta");

    return mapUser(data);
  },

  setupAdminPassword: async (email: string, newPassword: string): Promise<User> => {
    // Primero verificamos que sea un usuario válido para setup
    const { data: user } = await supabase.from('users').select('*').eq('email', email).single();
    
    if (!user) throw new Error("Usuario no encontrado");
    if (user.password !== null) throw new Error("Esta cuenta ya tiene contraseña configurada");

    // Actualizamos la contraseña
    const { data, error } = await supabase
      .from('users')
      .update({ password: newPassword })
      .eq('email', email)
      .select()
      .single();

    if (error) throw new Error("Error al guardar contraseña");
    return mapUser(data);
  },

  // --- Student Auth ---
  loginStudent: async (email: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', 'STUDENT')
      .single();

    if (error || !data) return null;
    return mapUser(data);
  },

  register: async (userData: any): Promise<User> => {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: 'STUDENT',
        age: userData.age,
        marital_status: userData.maritalStatus,
        birth_place: userData.birthPlace,
        phone: userData.phone,
        address: userData.address,
        sacraments: userData.sacramentTypes || [],
        completed_modules: []
      }])
      .select()
      .single();

    if (error) throw new Error('El correo ya está registrado o hubo un error.');
    
    // Crear notificación de bienvenida
    await MockService.addNotification(data.id, '¡Bienvenido a tu catequesis digital! Comienza con el Módulo 1.');
    
    return mapUser(data);
  },
  
  updateUser: async (updatedUser: User): Promise<User> => {
     const { data, error } = await supabase
      .from('users')
      .update({
         name: updatedUser.name,
         age: updatedUser.age,
         phone: updatedUser.phone,
         address: updatedUser.address,
         sacraments: updatedUser.sacramentTypes,
         birth_place: updatedUser.birthPlace,
         completed_modules: updatedUser.completedModules
      })
      .eq('id', updatedUser.id)
      .select()
      .single();
      
      if(error) throw new Error("Error al actualizar perfil");
      return mapUser(data);
  },

  // --- Content (Módulos y Temas) ---
  getModules: async (): Promise<Module[]> => {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('order', { ascending: true });

    if (error) return [];
    
    // Mapeamos los datos de la BD a tu estructura Module
    return data.map((m: any) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      order: m.order,
      imageUrl: m.image_url,
      content: '', 
      videoUrl: '', 
      topics: m.topics || [], 
      resources: m.resources || m.documents || [], // Compatibilidad
      documents: m.documents || [],
      questions: m.questions || []
    }));
  },

  // Guarda los cambios hechos en el CMS (Temas, Links de Youtube)
  updateModule: async (updatedModule: Module): Promise<void> => {
    const { error } = await supabase
      .from('modules')
      .update({
        title: updatedModule.title,
        description: updatedModule.description,
        image_url: updatedModule.imageUrl,
        topics: updatedModule.topics, // Aquí se guardan los videos
        questions: updatedModule.questions,
        documents: updatedModule.resources
      })
      .eq('id', updatedModule.id);
      
    if (error) console.error("Error guardando módulo", error);
  },

  // --- Quiz Logic ---
  submitQuiz: async (userId: string, moduleId: string, score: number): Promise<{ passed: boolean, lockedUntil?: number }> => {
    const passed = score >= 80;
    
    // 1. Guardar notificación
    const msg = passed 
      ? `¡Felicidades! Aprobaste el módulo con ${score}%.`
      : `Has reprobado el examen (${score}%).`;
    await MockService.addNotification(userId, msg, passed ? 'success' : 'alert');

    // 2. Si aprobó, actualizar usuario
    if (passed) {
      // Traer usuario actual para no sobrescribir
      const { data: user } = await supabase.from('users').select('completed_modules').eq('id', userId).single();
      const currentModules = user?.completed_modules || [];
      
      if (!currentModules.includes(moduleId)) {
        const newModules = [...currentModules, moduleId];
        await supabase.from('users').update({ completed_modules: newModules }).eq('id', userId);
      }
    }

    return { 
      passed, 
      lockedUntil: passed ? undefined : Date.now() + (48 * 60 * 60 * 1000) 
    };
  },

  // --- Notifications ---
  getNotifications: async (userId: string): Promise<Notification[]> => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });
      
    return data?.map((n: any) => ({
      id: n.id,
      userId: n.user_id,
      message: n.message,
      type: n.type,
      read: n.read,
      timestamp: n.timestamp
    })) || [];
  },

  addNotification: async (userId: string, message: string, type: 'info'|'success'|'alert'|'message' = 'info') => {
    await supabase.from('notifications').insert([{
      user_id: userId,
      message,
      type,
      timestamp: Date.now()
    }]);
  },

  // --- Utilidades Extra ---
  getAppConfig: (): AppConfig => ({ 
      heroImage: 'https://picsum.photos/1200/400',
      landingBackground: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&q=80&w=1000',
      primaryColor: 'blue' 
  }),

  // Funciones dummy para compatibilidad si faltan en DB
  getAllUsers: async () => {
     const { data } = await supabase.from('users').select('*').eq('role', 'STUDENT');
     return data?.map(mapUser) || [];
  },
  
  deleteUser: async (id: string) => {
    await supabase.from('users').delete().eq('id', id);
  }
};
