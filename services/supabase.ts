import { createClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN DE SUPABASE ---
// Borra el texto entre comillas y pega tus datos reales.
// Deben quedar dentro de las comillas simples ' '

const supabaseUrl = https://lybzvkuvjnxbfbaddnfc.supabase.co
const supabaseKey = sb_publishable_E9oPLgg2ZNx-ovOTTtM81A_s4tKPG3f

// Creación del cliente
export const supabase = createClient(supabaseUrl, supabaseKey);

// Clase de servicio compatible con tu código anterior
export class SupabaseService {
  
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

    if (error || !data) return null;
    if (data.role !== 'ADMIN') return null;

    return this.mapUser(data);
  }

  static async loginAdmin(email: string, passwordInput: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) return null;
    if (data.password !== passwordInput) return null;
    if (data.role !== 'ADMIN') return null;

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
      videoUrl: '', // No usado en vista general
      content: '', 
      topics: m.topics || [], 
      documents: m.documents || []
    }));
  }

  static async updateUser(user: any) {
     const { data, error } = await supabase
      .from('users')
      .update({
         name: user.name,
         age: user.age,
         phone: user.phone,
         address: user.address,
         sacraments: user.sacramentTypes
      })
      .eq('id', user.id)
      .select()
      .single();
      
      if(error) throw error;
      return this.mapUser(data);
  }

  static async getUsers() {
    const { data, error } = await supabase.from('users').select('*').eq('role', 'STUDENT');
    if (error) return [];
    return data.map((u: any) => this.mapUser(u));
  }

  // --- MAPPER (Traductor de Base de Datos a App) ---
  private static mapUser(dbUser: any) {
    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
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

  static getAppConfig() { return null; }
}
