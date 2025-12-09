
import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
// CAMBIO 1: Importamos el servicio real y el cliente supabase
import { SupabaseService as MockService, supabase } from './services/supabase';

function App() {
  // CAMBIO 2: Iniciamos sin usuario (null) para obligar a verificar la sesión real
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminView, setAdminView] = useState('dashboard');
  const [studentView, setStudentView] = useState('dashboard');

  // CAMBIO 3: Lógica de "Persistencia" (Anti-Zombis)
  // Esto permite que si recargas la página, no te saque del sistema
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Buscamos si hay una sesión guardada en el navegador
        const storedUser = localStorage.getItem('catequesis_user');
        
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          
          // Verificamos si el usuario existe realmente en Supabase
          const { data: dbUser, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', parsedUser.email)
            .single();

          if (dbUser && !error) {
            // Si existe, traducimos los datos de la BD a tu App y lo dejamos pasar
            const mappedUser: User = {
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
            setUser(mappedUser);
          } else {
            // Si no existe en la nube (fue borrado), limpiamos la sesión local
            localStorage.removeItem('catequesis_user');
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Error verificando sesión", error);
        localStorage.removeItem('catequesis_user');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleLogin = (u: User) => {
    // Al entrar, guardamos la sesión en el navegador
    localStorage.setItem('catequesis_user', JSON.stringify(u));
    setUser(u);
    setStudentView('dashboard');
    setAdminView('dashboard');
  };

  const handleLogout = () => {
    // Al salir, borramos la sesión del navegador
    localStorage.removeItem('catequesis_user');
    setUser(null);
    setAdminView('dashboard');
    setStudentView('dashboard');
  };
  
  const handleUserUpdate = (updatedUser: User) => {
    // Si actualiza perfil, actualizamos también la sesión guardada
    localStorage.setItem('catequesis_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-indigo-600 font-semibold">Cargando Catecismo...</div>;

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Esta lógica se mantiene idéntica a tu código original
  const getTitle = () => {
    if (user.role === UserRole.STUDENT) {
        return studentView === 'profile' ? 'Mi Perfil' : 'Mis Cursos';
    }
    switch (adminView) {
      case 'dashboard': return 'Tablero Principal';
      case 'users': return 'Gestión de Usuarios';
      case 'modules': return 'Gestión de Contenido (CMS)';
      case 'exams': return 'Gestión de Exámenes';
      case 'team': return 'Equipo de Catequistas';
      case 'notifications': return 'Gestión de Comunicados';
      case 'calendar': return 'Calendarización de Cursos';
      case 'settings': return 'Configuración General';
      default: return 'Panel Admin';
    }
  };

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      title={getTitle()}
      currentView={user.role === UserRole.ADMIN ? adminView : studentView}
      onViewChange={user.role === UserRole.ADMIN ? setAdminView : setStudentView}
    >
      {user.role === UserRole.ADMIN ? (
        <AdminDashboard view={adminView} currentUser={user} />
      ) : (
        <StudentDashboard 
            user={user} 
            view={studentView} 
            onUserUpdate={handleUserUpdate} 
        />
      )}
    </Layout>
  );
}

export default App;
