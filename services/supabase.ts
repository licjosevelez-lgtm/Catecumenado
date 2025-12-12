
import { createClient } from '@supabase/supabase-js';
import { User, UserRole, Module, QuizAttempt } from '../types';

// --- CONFIGURACIÓN DE SUPABASE ---
const supabaseUrl = 'https://lybzvkuvjnxbfbaddnfc.supabase.co';
const supabaseKey = 'sb_publishable_E9oPLgg2ZNx-ovOTTtM81A_s4tKPG3f';

// Creación del cliente
export const supabase = createClient(supabaseUrl, supabaseKey);

// Clase de servicio compatible con tu código anterior
export class SupabaseService {

  // --- STORAGE (NUEVO) ---
  static async uploadFile(file: File): Promise<string> {
    // 1. Crear nombre único para evitar colisiones
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `${fileName}`;

    // 2. Subir al bucket 'module-files'
    const { data, error } = await supabase.storage
      .from('module-files')
      .upload(filePath, file);

    if (error) {
      console.error("Error subiendo archivo:", error);
      throw new Error("No se pudo subir el archivo. Verifica que el bucket 'module-files' exista y sea público.");
    }

    // 3. Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from('module-files')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  }

  // --- AUTENTICACIÓN ---
  static async loginStudent(email: string, passwordInput: string) {
    // 1. Buscamos el usuario por correo
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', 'STUDENT')
      .single();

    if (error || !data) return null;

    // 2. Verificamos la contraseña (simple)
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

    return { status: 'ACTIVE', name: data.name };
  }

  static async loginAdmin(email: string, passwordInput: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) throw new Error("Usuario no encontrado");
    if (data.password !== passwordInput) throw new Error("Contraseña incorrecta");
    if (data.role !== 'ADMIN') throw new Error("No es administrador");

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

  // --- DATOS ---
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
    console.log("🛠️ DEBUG: Guardando módulo ID:", updatedModule.id);

    // Aseguramos que topics sea un array válido para JSONB
    const cleanTopics = Array.isArray(updatedModule.topics) ? updatedModule.topics : [];
    
    // IMPORTANTE: Usamos 'upsert' en lugar de 'update'.
    const { data, error } = await supabase
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
      })
      .select();

    if (error) {
      console.error("❌ ERROR SUPABASE:", error);
      throw new Error(`Error al guardar: ${error.message}`);
    }

    console.log("✅ Guardado exitoso:", data);
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
        completed_modules: user.completedModules
      })
      .eq('id', user.id)
      .select()
      .single();

    if(error) throw error;
      return this.mapUser(data);
  }

  static async getAllUsers() {
    const { data, error } = await supabase.from('users').select('*').eq('role', 'STUDENT');
    if (error) return [];
    return data.map((u: any) => this.mapUser(u));
  }

  static async deleteUser(id: string) {
      await supabase.from('users').delete().eq('id', id);
  }

  // --- MAPPER (Traductor de Base de Datos a App) ---
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

  // Stubs for methods not yet in Supabase schema
  static getAppConfig() { return { heroImage: '', landingBackground: '', primaryColor: 'blue' }; }
  static async updateAppConfig(config: any) { }
  static async getAdminList() { return []; }
  static async inviteAdmin(name: string, email: string) { }
  static async resetAdminAccess(id: string) { }
  static getNotifications(userId: string) { return []; }
  static async getBroadcastHistory() { return []; }
  static async getEvents() { return []; }
  static async addEvent(event: any) { }
  static async sendBroadcast(title: string, body: string, importance: string) { }
  static getAttempts(userId: string): QuizAttempt[] { return []; }

  static async submitQuiz(userId: string, moduleId: string, score: number): Promise<{ passed: boolean; lockedUntil?: number }> { 
     const passed = score >= 80;
     let lockedUntil: number | undefined;
     
     if (passed) {
        try {
            const { data: user, error: fetchError } = await supabase
                .from('users')
                .select('completed_modules')
                .eq('id', userId)
                .single();
            
            if (fetchError) throw fetchError;

            const currentModules = user.completed_modules || [];
            if (!currentModules.includes(moduleId)) {
                const newModules = [...currentModules, moduleId];
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ completed_modules: newModules })
                    .eq('id', userId);
                if (updateError) throw updateError;
            }
        } catch (error) {
            console.error("Error actualizando progreso en Supabase:", error);
        }
     } else {
        lockedUntil = Date.now() + (48 * 60 * 60 * 1000);
     }

     return { passed, lockedUntil }; 
  }
}
