import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
// Importamos la conexión directa para validar la sesión al inicio
import { supabase } from './services/supabase';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminView, setAdminView] = useState('dashboard');
  const [studentView, setStudentView] = useState('dashboard');

  useEffect(() => {
    const checkSession = async () => {
      try {
        // 1. Buscamos si hay algo guardado en el navegador
        const storedUser = localStorage.getItem('catequesis_user');
        
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          
          // 2. PREGUNTAMOS A SUPABASE: "¿Este usuario es real?"
          const { data: dbUser, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', parsedUser.email)
            .single();

          if (dbUser && !error) {
            // 3. SI EXISTE: Actualizamos los datos frescos y dejamos pasar
            const mappedUser: User = {
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
                isSuperAdmin: dbUser.is_super_admin
            };
            setUser(mappedUser);
          } else {
            // 4. SI NO EXISTE (Error o Borrado): Limpiamos la basura automáticamente
            console.log("Sesión inválida detectada. Cerrando sesión...");
            localStorage.removeItem('catequesis_user');
            setUser(null);
          }
        }
      } catch (error) {
        // Si hay cualquier error raro (JSON corrupto, etc), limpiamos todo
        localStorage.removeItem('catequesis_user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleLogin = (u: User) => {
    localStorage.setItem('catequesis_user', JSON.stringify(u));
    setUser(u);
    // Reseteamos las vistas al entrar
    setStudentView('dashboard');
    setAdminView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('catequesis_user');
    setUser(null);
    setStudentView('dashboard');
    setAdminView('dashboard');
  };
  
  const handleUserUpdate = (updatedUser: User) => {
    localStorage.setItem('catequesis_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
      <p className="text-gray-500 font-medium">Verificando acceso...</p>
    </div>
  );

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

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
