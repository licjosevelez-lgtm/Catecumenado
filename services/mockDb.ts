import { User, Module, Topic } from '../types';
import { supabase } from './supabase';

// Esta clase ahora conecta con SUPABASE en lugar de usar datos falsos
export class MockService {

  // --- AUTENTICACIÓN Y USUARIOS ---

  // Login de Estudiante
  static async loginStudent(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', 'STUDENT')
      .single();

    if (error || !data) return null;
    return this.mapUser(data);
  }

  // Login de Administrador
  static async loginAdmin(email: string, passwordInput: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) return null;
    
    // Verificación simple de contraseña (texto plano por ahora)
    if (data.password !== passwordInput) return null;
    
    // Verificar si es admin
    if (data.role !== 'ADMIN') return null;

    return this.mapUser(data);
  }

  // Registro
  static async register(userData: Partial<User>): Promise<User> {
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

    if (error) {
      console.error(error);
      throw new Error('Error al registrar usuario. Puede que el correo ya exista.');
    }
    return this.mapUser(data);
  }

  // Obtener todos los usuarios (Para el Admin)
  static async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'STUDENT'); // Solo traemos estudiantes para la lista

    if (error) return [];
    return data.map(u => this.mapUser(u));
  }
    
  // Actualizar Usuario
  static async updateUser(user: Partial<User>): Promise<User> {
     const { data, error } = await supabase
      .from('users')
      .update({
         name: user.name,
         age: user.age,
         birth_place: user.birthPlace,
         address: user.address,
         phone: user.phone
      })
      .eq('id', user.id)
      .select()
      .single();
      
      if(error) throw error;
      return this.mapUser(data);
  }

  // --- MÓDULOS Y CONTENIDO ---

  static async getModules(): Promise<Module[]> {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('order', { ascending: true });

    if (error) return [];
    
    // Mapear los datos de la BD a tu estructura de TS
    return data.map((m: any) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      order: m.order,
      imageUrl: m.image_url,
      videoUrl: m.video_url,
      content: m.content,
      topics: m.topics || [], 
      documents: m.documents || []
    }));
  }
  
  // Agregar un Tema nuevo a un módulo
  static async updateModuleTopics(moduleId: string, topics: Topic[]) {
      const { error } = await supabase
        .from('modules')
        .update({ topics: topics })
        .eq('id', moduleId);
        
      if (error) console.error("Error guardando temas", error);
  }

  // --- AYUDAS ---
  
  // Convierte los nombres de columnas de Supabase (snake_case) a tu código (camelCase)
  private static mapUser(dbUser: any): User {
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
      sacramentTypes: dbUser.sacraments,
      completedModules: dbUser.completed_modules,
      isSuperAdmin: dbUser.is_super_admin
    };
  }
  
  // Dummy functions para que no rompa el código viejo si algo falta
  static getAppConfig() { return null; } 
  static async saveAppConfig(c: any) {}
}
