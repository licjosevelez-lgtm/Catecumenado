import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { MockService } from './services/mockDb';
import { supabase } from './services/supabase'; // Importamos la conexión real

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminView, setAdminView] = useState('dashboard');
  const [studentView, setStudentView] = useState('dashboard');

  useEffect(() => {
    // ESTA ES LA FUNCIÓN NUEVA "ANTI-ZOMBIES"
    const checkSession = async () => {
      try {
        // 1. Buscamos si hay una sesión guardada en el almacenamiento local del navegador
        const storedUser = localStorage.getItem('catequesis_user');
        
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          
          // 2. ¡EL PASO CLAVE! Preguntamos a Supabase si este usuario sigue existiendo
          // Usamos el email para buscarlo en la base de datos real
          const { data: dbUser, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', parsedUser.email)
            .single();

          if (dbUser && !error) {
            // 3. Si existe, actualizamos la info (por si cambiaste algo) y lo dejamos pasar
            const mappedUser = {
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
            setUser(mappedUser);
          } else {
            // 4. Si NO existe en Supabase (lo borraste), borramos su sesión local
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
    // Al loguearse, guardamos la sesión en el navegador
    localStorage.setItem('catequesis_user', JSON.stringify(u));
    setUser(u);
    setStudentView('dashboard');
    setAdminView('dashboard');
  };

  const handleLogout = () => {
    // Al salir, borramos la sesión
    localStorage.removeItem('catequesis_user');
    setUser(null);
    setAdminView('dashboard');
    setStudentView('dashboard');
  };
  
  const handleUserUpdate = (updatedUser: User) => {
    localStorage.setItem('catequesis_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50 text-indigo-600 font-semibold">Verificando acceso...</div>;

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
