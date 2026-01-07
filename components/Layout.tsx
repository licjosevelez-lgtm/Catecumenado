
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { LogOut, Bell, BookOpen, User as UserIcon, Settings, Menu, X, LayoutDashboard, Library, ClipboardCheck, Shield, Megaphone, Calendar, Home } from 'lucide-react';
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
      const loadNotifs = async () => {
        const notifs = await MockService.getNotifications(user.id);
        setNotifications(notifs);
      };
      loadNotifs();
    }
  }, [user]);

  // Cerrar el menú al cambiar de vista en móvil
  const handleViewChange = (viewId: string) => {
    if (onViewChange) onViewChange(viewId);
    setSidebarOpen(false);
  };

  if (!user) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  const NavItem = ({ icon: Icon, label, viewId }: any) => {
    const isActive = currentView && viewId === currentView;
    return (
      <button 
        onClick={() => handleViewChange(viewId)}
        className={`w-full flex items-center space-x-3 px-4 min-h-[48px] cursor-pointer transition-colors text-left
        ${isActive ? 'bg-indigo-50 text-indigo-700 border-r-4 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}
      >
        <Icon size={22} />
        <span className="font-semibold">{label}</span>
      </button>
    );
  };

  const getNotificationStyle = (type: string) => {
    switch(type) {
      case 'alert': return 'bg-red-50 border-l-4 border-red-500';
      case 'success': return 'bg-green-50 border-l-4 border-green-500';
      case 'message': return 'bg-blue-50 border-l-4 border-blue-500';
      default: return 'bg-white border-l-4 border-transparent';
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const day = date.getDate();
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${day}/${months[date.getMonth()]} • ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const hasUnread = notifications.some(n => !n.read);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row overflow-hidden">
      
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Header - Fixed at top with safe area support */}
      <div className="md:hidden bg-white shadow-sm px-4 pt-[env(safe-area-inset-top,16px)] pb-3 flex justify-between items-center z-30 sticky top-0">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-600 active:bg-gray-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-sm font-bold text-indigo-900 truncate max-w-[200px]">Franciscanos TOR</h1>
        </div>
        
        <div className="flex items-center">
          <button 
            onClick={() => setShowNotifPanel(!showNotifPanel)}
            className="p-2 text-indigo-600 relative min-h-[44px] min-w-[44px]"
          >
            <Bell size={24} />
            {hasUnread && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
          </button>
        </div>
      </div>

      {/* Sidebar - Enhanced for Native App feel */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out
        pt-[env(safe-area-inset-top,0px)]
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:shadow-lg md:w-64
      `}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-indigo-900 flex items-center leading-tight">
              <BookOpen className="mr-2 text-indigo-600 flex-shrink-0" />
              LMS Catequesis
            </h2>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">
              {user.role === UserRole.ADMIN ? 'Administración' : 'Catecúmeno'}
            </p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 text-gray-400">
            <X size={24} />
          </button>
        </div>

        <nav className="mt-4 overflow-y-auto h-[calc(100vh-200px)]">
          {user.role === UserRole.ADMIN ? (
             <div className="space-y-1">
               <NavItem icon={LayoutDashboard} label="Tablero" viewId="dashboard" />
               <NavItem icon={UserIcon} label="Usuarios" viewId="users" />
               <NavItem icon={Library} label="Contenidos" viewId="modules" />
               <NavItem icon={ClipboardCheck} label="Exámenes" viewId="exams" />
               <NavItem icon={Calendar} label="Cronograma" viewId="calendar" />
               <NavItem icon={Megaphone} label="Comunicados" viewId="notifications" />
               <NavItem icon={Settings} label="Personalización" viewId="settings" />
               <NavItem icon={Shield} label="Equipo" viewId="team" />
             </div>
          ) : (
             <div className="space-y-1">
                <NavItem icon={Home} label="Inicio" viewId="dashboard" />
                <NavItem icon={BookOpen} label="Módulos" viewId="courses" />
                <NavItem icon={Calendar} label="Calendario" viewId="calendar" />
                <NavItem icon={UserIcon} label="Perfil" viewId="profile" />
             </div>
          )}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-100 bg-white pb-[max(16px,env(safe-area-inset-bottom))]">
          <div className="flex items-center mb-4 px-2">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
              {user.name.charAt(0)}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center w-full px-4 min-h-[44px] text-sm font-bold text-red-600 rounded-xl bg-red-50 active:bg-red-100 transition-colors"
          >
            <LogOut size={18} className="mr-3" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Desktop Header Only */}
        <header className="hidden md:flex bg-white shadow-sm py-4 px-6 justify-between items-center z-20">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          
          <div className="relative">
            <button 
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className={`p-2 rounded-full transition-all relative ${
                hasUnread 
                  ? 'text-indigo-600 bg-indigo-50 ring-2 ring-indigo-100' 
                  : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              <Bell size={24} className={hasUnread ? 'animate-pulse' : ''} />
              {hasUnread && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
            </button>
          </div>
        </header>

        {/* Floating Notification Panel for Mobile & Desktop */}
        {showNotifPanel && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifPanel(false)} />
            <div className="absolute right-4 top-16 md:top-20 w-[calc(100vw-32px)] md:w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-fade-in">
              <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                <span className="font-bold text-sm text-gray-700">Notificaciones</span>
                <button onClick={() => setShowNotifPanel(false)} className="text-gray-400"><X size={18}/></button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">No hay avisos nuevos</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`p-4 border-b text-sm transition-colors active:bg-gray-50 ${getNotificationStyle(n.type)}`}>
                      <p className="text-gray-800 font-medium leading-tight">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-tighter">{formatDate(n.timestamp)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* Page Content - Scrollable area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8 pb-[max(32px,env(safe-area-inset-bottom))]">
          {/* Mobile Title */}
          <div className="md:hidden mb-4">
            <h2 className="text-2xl font-black text-gray-900 leading-tight">{title}</h2>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
};
