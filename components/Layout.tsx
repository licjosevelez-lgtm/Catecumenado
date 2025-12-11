
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { LogOut, Bell, BookOpen, BarChart2, User as UserIcon, Settings, Menu, X, LayoutDashboard, Library, ClipboardCheck, Shield, Megaphone, Calendar } from 'lucide-react';
// IMPORTANTE: Cambiamos a SupabaseService
import { SupabaseService as MockService } from '../services/supabase';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  title: string;
  currentView?: string;
  onViewChange?: (view: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, title, currentView, onViewChange }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  useEffect(() => {
    if (user) {
      // SupabaseService.getNotifications devuelve array vacío por ahora para evitar errores
      const notifs = MockService.getNotifications(user.id);
      setNotifications(notifs);
    }
  }, [user]);

  if (!user) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  const NavItem = ({ icon: Icon, label, viewId, active }: any) => {
    const isActive = active || (currentView && viewId === currentView);
    return (
      <button 
        onClick={() => onViewChange && viewId ? onViewChange(viewId) : null}
        className={`w-full flex items-center space-x-3 px-4 py-3 cursor-pointer transition-colors text-left
        ${isActive ? 'bg-indigo-50 text-indigo-700 border-r-4 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}
      >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </button>
    );
  }

  const getNotificationStyle = (type: string) => {
    switch(type) {
      case 'alert': return 'bg-red-50 border-l-4 border-red-500';
      case 'success': return 'bg-green-50 border-l-4 border-green-500';
      case 'message': return 'bg-blue-50 border-l-4 border-blue-500';
      default: return 'bg-white border-l-4 border-transparent'; // info
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center z-20 relative">
        <h1 className="text-lg font-bold text-indigo-900 leading-tight">Catecismo Virtual Franciscanos TOR</h1>
        <button onClick={() => setSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-10 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-indigo-900 flex items-center leading-tight">
            <BookOpen className="mr-2 text-indigo-600 flex-shrink-0" />
            Catecismo Virtual Franciscanos TOR
          </h2>
          <p className="text-sm text-gray-500 mt-2">{user.role === UserRole.ADMIN ? 'Panel Administrativo' : 'Portal del Catecúmeno'}</p>
        </div>

        <nav className="mt-6">
          {user.role === UserRole.ADMIN ? (
             <>
               <NavItem icon={LayoutDashboard} label="Tablero" viewId="dashboard" />
               <NavItem icon={UserIcon} label="Usuarios" viewId="users" />
               <NavItem icon={Library} label="Módulos & Contenido" viewId="modules" />
               <NavItem icon={ClipboardCheck} label="Exámenes" viewId="exams" />
               <NavItem icon={Calendar} label="Calendarización" viewId="calendar" />
               <NavItem icon={Megaphone} label="Notificaciones" viewId="notifications" />
               <NavItem icon={Settings} label="Configuración" viewId="settings" />
               <NavItem icon={Shield} label="Gestión de Equipo" viewId="team" />
             </>
          ) : (
             <>
                <NavItem icon={BookOpen} label="Mis Cursos" viewId="dashboard" />
                <NavItem icon={UserIcon} label="Mi Perfil" viewId="profile" />
             </>
          )}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-100">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 truncate w-32">{user.name}</p>
              <p className="text-xs text-gray-500">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} className="mr-2" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm py-4 px-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          
          <div className="relative">
            <button 
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className="p-2 rounded-full text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all relative"
            >
              <Bell size={24} />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifPanel && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
                <div className="p-3 bg-gray-50 border-b font-medium text-sm text-gray-700">Notificaciones</div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">No hay notificaciones nuevas</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`p-3 border-b text-sm ${getNotificationStyle(n.type)}`}>
                        <p className="text-gray-800">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
