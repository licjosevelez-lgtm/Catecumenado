
import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
// IMPORTANTE: Cambiamos a SupabaseService para todo el flujo
import { SupabaseService as MockService } from './services/supabase';

function App() {
  // Estado inicial null para forzar login con Supabase
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false); // Cambiado a false ya que no hay chequeo de sesión persistente complejo
  const [adminView, setAdminView] = useState('dashboard');
  const [studentView, setStudentView] = useState('dashboard');

  useEffect(() => {
    // Aquí podrías implementar la recuperación de sesión de Supabase si quisieras
    // const session = MockService.getSession();
    setLoading(false);
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    setStudentView('dashboard'); // Reset student view on login
    setAdminView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setAdminView('dashboard');
    setStudentView('dashboard');
  };
  
  // New handler to refresh user data from sub-components
  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Cargando LMS...</div>;

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
