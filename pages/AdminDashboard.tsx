import React, { useState, useEffect, useRef } from 'react';
import { User, Module, Question, Topic, AdminUser, Broadcast, CalendarEvent, AppConfig } from '../types';
// CAMBIO 1: Conectamos a Supabase (La Nube)
import { SupabaseService as MockService } from '../services/supabase';
// CAMBIO 2: Borramos 'ResponsiveContainer' de esta lista para que no falle la pantalla
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Users, BookOpen, AlertTriangle, Trash2, Edit, Save, Plus, X, FileText, Link as LinkIcon, Image as ImageIcon, Video, UserCheck, Activity, ChevronLeft, ChevronRight, HelpCircle, CheckCircle, Upload, File, Shield, RotateCcw, Megaphone, Send, Calendar as CalendarIcon, Clock, DollarSign, MapPin, Settings, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// Función para limpiar links de YouTube
const normalizeYoutube = (url: string) => {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11)
    ? `https://www.youtube.com/watch?v=${match[2]}`
    : url;
};

interface Props {
  view: string;
  currentUser: User; // Need to know who is viewing to enable SuperAdmin features
}

export const AdminDashboard: React.FC<Props> = ({ view, currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingQuizModule, setEditingQuizModule] = useState<Module | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const settingsImageInputRef = useRef<HTMLInputElement>(null);
  
  // Team Management State
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  
  // Lifted state for Carousel Navigation
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);

  // Broadcast State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastImportance, setBroadcastImportance] = useState<'normal' | 'high'>('normal');
  const [broadcastHistory, setBroadcastHistory] = useState<Broadcast[]>([]);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Calendar State
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // YYYY-MM-DD
  const [showEventModal, setShowEventModal] = useState(false);
  
  // Event Form State
  const [evtLocation, setEvtLocation] = useState('');
  const [evtTime, setEvtTime] = useState('');
  const [evtDuration, setEvtDuration] = useState('');
  const [evtCost, setEvtCost] = useState('');

  useEffect(() => {
    loadData();
    // Reset specific states when changing views
    setEditingQuizModule(null);
  }, [view]);

  // Effect to initialize editingModule when entering the modules view
  useEffect(() => {
    if (view === 'modules' && modules.length > 0 && !editingModule) {
      setEditingModule(modules[currentModuleIndex]);
    }
  }, [view, modules, currentModuleIndex, editingModule]);

  const loadData = async () => {
    setUsers(await MockService.getAllUsers());
    const loadedModules = await MockService.getModules();
    setModules(loadedModules);
    setAppConfig(MockService.getAppConfig());
    
    if (view === 'team') {
        setAdmins(await MockService.getAdminList());
    }

    if (view === 'notifications') {
      setBroadcastHistory(await MockService.getBroadcastHistory());
    }

    if (view === 'calendar') {
        setCalendarEvents(await MockService.getEvents());
    }
    
    // Refresh object references to avoid stale data
    if (editingModule) {
        const fresh = loadedModules.find(m => m.id === editingModule.id);
        if (fresh) setEditingModule(fresh);
    }
    if (editingQuizModule) {
        const fresh = loadedModules.find(m => m.id === editingQuizModule.id);
        if (fresh) setEditingQuizModule(fresh);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
      await MockService.deleteUser(userId);
      loadData();
    }
  };

  const handleSaveModule = async (moduleToSave: Module | null = editingModule) => {
    if (moduleToSave) {
      await MockService.updateModule(moduleToSave);
      loadData();
      alert('Cambios guardados correctamente.');
    }
  };

  const handleSaveConfig = async () => {
      if (appConfig) {
          await MockService.updateAppConfig(appConfig);
          loadData();
          alert('Configuración guardada. Recarga la página para ver cambios de fondo.');
      }
  };

  // --- EXPORT HANDLERS ---
  const handleExportExcel = () => {
    const students = users.filter(u => u.role !== 'ADMIN');
    const data = students.map(s => ({
      'Nombre Completo': s.name,
      'Email': s.email,
      'Edad': s.age || 'N/A',
      'Estado Civil': s.maritalStatus || 'N/A',
      'Teléfono': s.phone || 'N/A',
      'Dirección': s.address || 'N/A',
      'Sacramentos': s.sacramentTypes?.join(', ') || 'N/A',
      'Progreso': `${s.completedModules.length}/${modules.length} Módulos`
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Catecumenos");
    XLSX.writeFile(workbook, `Directorio_Catecumenos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = () => {
    const students = users.filter(u => u.role !== 'ADMIN');
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text("Directorio de Catecúmenos", 14, 20);
    
    // Metadata
    doc.setFontSize(11);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 14, 28);
    doc.text(`Total de registros: ${students.length}`, 14, 34);

    // Table
    const tableColumn = ["Nombre", "Email", "Edad", "Civil", "Teléfono", "Sacramentos"];
    const tableRows = students.map(s => [
      s.name,
      s.email,
      s.age?.toString() || '',
      s.maritalStatus || '',
      s.phone || '',
      s.sacramentTypes?.join(', ') || ''
    ]);

    autoTable(doc, {
      startY: 40,
      head: [tableColumn],
      body: tableRows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
    });

    doc.save(`Directorio_Catecumenos_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // --- TEAM MANAGEMENT HANDLERS ---
  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;
    try {
        await MockService.inviteAdmin(inviteName, inviteEmail);
        setInviteName('');
        setInviteEmail('');
        loadData();
        alert('Administrador invitado correctamente.');
    } catch (error: any) {
        alert(error.message);
    }
  };

  const handleResetAdmin = async (adminId: string) => {
      if (window.confirm('¿Restablecer el acceso de este administrador? La próxima vez que ingrese, se le pedirá crear una nueva contraseña.')) {
          await MockService.resetAdminAccess(adminId);
          loadData();
      }
  };

  // --- BROADCAST HANDLERS ---
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastBody) return;
    
    setSendingBroadcast(true);
    try {
      await MockService.sendBroadcast(broadcastTitle, broadcastBody, broadcastImportance);
      setBroadcastTitle('');
      setBroadcastBody('');
      setBroadcastImportance('normal');
      loadData(); // Reload history
      alert('Mensaje enviado a todos los alumnos correctamente.');
    } catch (error: any) {
      alert('Error enviando mensaje: ' + error.message);
    } finally {
      setSendingBroadcast(false);
    }
  };

  // --- CALENDAR HANDLERS ---
  const handleDayClick = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    setSelectedDate(formattedDate);
    // Reset Form
    setEvtLocation('');
    setEvtTime('');
    setEvtDuration('');
    setEvtCost('');
    setShowEventModal(true);
  };

  const handleSaveEvent = async (notify: boolean) => {
    if (!selectedDate || !evtLocation || !evtTime) {
      alert('Por favor completa al menos Lugar y Horario.');
      return;
    }

    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      date: selectedDate,
      location: evtLocation,
      time: evtTime,
      duration: evtDuration,
      cost: evtCost
    };

    try {
      await MockService.addEvent(newEvent);
      
      if (notify) {
        const title = "Nuevo Curso Presencial Disponible";
        const msg = `Se ha abierto una fecha en ${evtLocation} para el ${selectedDate}. Horario: ${evtTime}. Costo: ${evtCost}. ¡Completa tus módulos virtuales para poder asistir!`;
        await MockService.sendBroadcast(title, msg, 'high');
        alert('Evento guardado y alumnos notificados.');
      } else {
        alert('Evento guardado en calendario.');
      }

      setShowEventModal(false);
      loadData(); // Reload events
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  // --- NAVIGATION LOGIC (MODULES VIEW) ---
  const handleNextModule = () => {
    if (modules.length === 0) return;
    const newIndex = currentModuleIndex === modules.length - 1 ? 0 : currentModuleIndex + 1;
    setCurrentModuleIndex(newIndex);
    setEditingModule(modules[newIndex]);
  };

  const handlePrevModule = () => {
    if (modules.length === 0) return;
    const newIndex = currentModuleIndex === 0 ? modules.length - 1 : currentModuleIndex - 1;
    setCurrentModuleIndex(newIndex);
    setEditingModule(modules[newIndex]);
  };

  const handleCreateNewModule = async () => {
    const newModule: Module = {
        id: Date.now().toString(),
        title: `Nuevo Módulo ${modules.length + 1}`,
        description: '',
        topics: [],
        order: modules.length + 1,
        questions: [],
        resources: []
    };
    
    await MockService.updateModule(newModule);
    const updatedModules = await MockService.getModules();
    setModules(updatedModules);
    
    // Jump to the new module
    const newIndex = updatedModules.length - 1;
    setCurrentModuleIndex(newIndex);
    setEditingModule(updatedModules[newIndex]);
  };

  // --- TOPIC LOGIC ---
  const handleAddTopic = () => {
      if (!editingModule) return;
      const newTopic: Topic = {
          id: Date.now().toString(),
          title: '',
          videoUrl: '',
          summary: ''
      };
      setEditingModule({
          ...editingModule,
          topics: [...(editingModule.topics || []), newTopic]
      });
  };

  const handleRemoveTopic = (index: number) => {
      if (!editingModule || !editingModule.topics) return;
      const newTopics = [...editingModule.topics];
      newTopics.splice(index, 1);
      setEditingModule({ ...editingModule, topics: newTopics });
  };

  const handleTopicChange = (index: number, field: keyof Topic, value: string) => {
      if (!editingModule || !editingModule.topics) return;
      const newTopics = [...editingModule.topics];
      newTopics[index] = { ...newTopics[index], [field]: value };
      setEditingModule({ ...editingModule, topics: newTopics });
  };

  // --- FILE UPLOAD LOGIC ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && editingModule) {
          const file = e.target.files[0];
          const newResource = {
              name: file.name,
              url: '#', // In a real app, this would be the upload URL
              type: 'pdf' as const, // Default to PDF for icon
              file: file
          };
          setEditingModule({
              ...editingModule,
              resources: [...(editingModule.resources || []), newResource]
          });
      }
  };

  const handleRemoveResource = (index: number) => {
      if (!editingModule) return;
      const newRes = [...(editingModule.resources || [])];
      newRes.splice(index, 1);
      setEditingModule({...editingModule, resources: newRes});
  };

  // Image Upload Simulators
  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && editingModule) {
          // Simulate local preview
          const url = URL.createObjectURL(e.target.files[0]);
          setEditingModule({...editingModule, imageUrl: url});
      }
  };
  
  const handleSettingsImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && appConfig) {
           // Simulate local preview
           const url = URL.createObjectURL(e.target.files[0]);
           setAppConfig({...appConfig, landingBackground: url});
      }
  };

  // --- SUB-VIEWS RENDERERS ---

 const renderStatsView = () => {
    // 1. Cálculos de estadísticas
    const students = users.filter(u => u.role !== 'ADMIN');
    const totalStudents = students.length;
    // Usuarios que no han completado ningún módulo
    const stuckUsers = users.filter(u => u.role === 'STUDENT' && u.completedModules.length === 0).length;
    // Total de módulos completados globalmente
    const totalCompletions = students.reduce((acc, s) => acc + s.completedModules.length, 0);
    // Usuarios listos para presencial (todos los módulos completados)
    const readyForInPerson = students.filter(s => modules.length > 0 && s.completedModules.length === modules.length).length;

    // 2. Preparar datos para la gráfica
    const completionStats = modules.map(m => ({
      name: `Módulo ${m.order}`,
      completados: students.filter(s => s.completedModules.includes(m.id)).length,
      pendientes: Math.max(0, students.length - students.filter(s => s.completedModules.includes(m.id)).length)
    }));

    // Evitar que la gráfica falle si no hay datos
    if (completionStats.length === 0) {
        completionStats.push({ name: 'Sin datos', completados: 0, pendientes: 0 });
    }

    return (
      <div className="space-y-8">
        {/* Tarjetas de Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center text-indigo-600 mb-2">
              <Users className="mr-2" /> <span className="font-bold">Total Catecúmenos</span>
            </div>
            <p className="text-4xl font-bold text-gray-800">{students.length}</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center text-green-600 mb-2">
              <Activity className="mr-2" />
            </div>
            <p className="text-gray-500 text-sm font-medium uppercase">Retención Global</p>
            <h3 className="text-3xl font-bold text-gray-800">
              {totalStudents > 0 && modules.length > 0 ? Math.round((totalCompletions / (totalStudents * modules.length)) * 100) : 0}%
            </h3>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center text-purple-600 mb-2">
              <UserCheck className="mr-2" /> <span className="font-bold">Confirmados Presencial</span>
            </div>
            <p className="text-4xl font-bold text-gray-800">{readyForInPerson}</p>
            <p className="text-xs text-gray-500 mt-1">Aprobados 100% online</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center text-orange-500 mb-2">
              <AlertTriangle className="mr-2" /> <span className="font-bold">Usuarios Estancados</span>
            </div>
            <p className="text-4xl font-bold text-gray-800">{stuckUsers}</p>
          </div>
        </div>

        {/* Gráfica Blindada (Sin ResponsiveContainer) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Progreso Global de la Clase</h3>
          <div className="h-80 w-full overflow-x-auto">
            <div style={{ minWidth: '600px' }}>
                <BarChart width={800} height={300} data={completionStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip cursor={{fill: '#f3f4f6'}} />
                    <Legend />
                    <Bar dataKey="completados" fill="#4f46e5" name="Aprobados" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pendientes" fill="#e5e7eb" name="Pendientes" radius={[4, 4, 0, 0]} />
                </BarChart>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCalendarView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    // Generate dynamic year range
    const years = Array.from({ length: 11 }, (_, i) => year - 5 + i);

    // Logic to get days
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const emptySlots = Array.from({ length: firstDay });
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Filter upcoming events for list
    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingEvents = calendarEvents
        .filter(e => e.date >= todayStr)
        .sort((a, b) => a.date.localeCompare(b.date));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT: Calendar Grid */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <button 
                      onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                      className="p-2 hover:bg-gray-200 rounded-full text-gray-600"
                    >
                        <ChevronLeft />
                    </button>
                    
                    <div className="flex gap-2 items-center">
                        <select 
                            value={month} 
                            onChange={(e) => setCurrentDate(new Date(year, parseInt(e.target.value), 1))}
                            className="bg-white border-gray-300 border text-gray-800 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 font-bold uppercase cursor-pointer hover:bg-gray-50"
                        >
                            {monthNames.map((m, idx) => (
                                <option key={idx} value={idx}>{m}</option>
                            ))}
                        </select>
                        <select 
                            value={year} 
                            onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value), month, 1))}
                            className="bg-white border-gray-300 border text-gray-800 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 font-bold cursor-pointer hover:bg-gray-50"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <button 
                      onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                      className="p-2 hover:bg-gray-200 rounded-full text-gray-600"
                    >
                        <ChevronRight />
                    </button>
                </div>
                
                <div className="p-6">
                    <div className="grid grid-cols-7 gap-2 text-center mb-4">
                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                            <div key={d} className="text-xs font-bold text-gray-400 uppercase">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {emptySlots.map((_, i) => <div key={`empty-${i}`}></div>)}
                        {daysArray.map(day => {
                            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                            const hasEvent = calendarEvents.some(e => e.date === dateStr);
                            const isSelected = selectedDate === dateStr;
                            
                            return (
                                <button
                                    key={day}
                                    onClick={() => handleDayClick(day)}
                                    className={`
                                        h-14 rounded-lg flex flex-col items-center justify-center relative transition-colors
                                        ${isSelected ? 'bg-indigo-600 text-white' : 'hover:bg-gray-50 bg-white border border-gray-100'}
                                    `}
                                >
                                    <span className="font-semibold text-sm">{day}</span>
                                    {hasEvent && (
                                        <span className={`w-2 h-2 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-green-500'}`}></span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* RIGHT: Upcoming Events List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-fit">
                <div className="p-6 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center">
                        <Calendar className="mr-2 text-indigo-600" size={20} />
                        Próximos Eventos
                    </h3>
                </div>
                <div className="p-0">
                    {upcomingEvents.length === 0 ? (
                        <div className="p-6 text-center text-gray-400 text-sm">No hay eventos próximos.</div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {upcomingEvents.map(evt => (
                                <div key={evt.id} className="p-4 hover:bg-gray-50">
                                    <div className="font-bold text-indigo-900">{evt.date}</div>
                                    <div className="text-gray-800 font-medium">{evt.location}</div>
                                    <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                        <Clock size={14}/> {evt.time}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL for Event Creation */}
            {showEventModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                        <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
                            <h3 className="font-bold">Agendar Curso Presencial</h3>
                            <button onClick={() => setShowEventModal(false)}><X /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">
                                Fecha: {selectedDate}
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Lugar / Parroquia</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                                    <input 
                                        type="text" 
                                        value={evtLocation}
                                        onChange={e => setEvtLocation(e.target.value)}
                                        className="pl-10 w-full border border-gray-300 rounded-lg p-2"
                                        placeholder="Ej: Salón Parroquial"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Horario</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                                        <input 
                                            type="text" 
                                            value={evtTime}
                                            onChange={e => setEvtTime(e.target.value)}
                                            className="pl-10 w-full border border-gray-300 rounded-lg p-2"
                                            placeholder="Ej: 10:00 AM"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Duración</label>
                                    <input 
                                        type="text" 
                                        value={evtDuration}
                                        onChange={e => setEvtDuration(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2"
                                        placeholder="Ej: 5 hrs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Costo de Recuperación</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                                    <input 
                                        type="text" 
                                        value={evtCost}
                                        onChange={e => setEvtCost(e.target.value)}
                                        className="pl-10 w-full border border-gray-300 rounded-lg p-2"
                                        placeholder="Ej: $50.00"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex gap-3 pt-4">
                                <button 
                                    onClick={() => handleSaveEvent(false)}
                                    className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200"
                                >
                                    Solo Guardar
                                </button>
                                <button 
                                    onClick={() => handleSaveEvent(true)}
                                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 flex justify-center items-center"
                                >
                                    <Megaphone size={16} className="mr-2"/> Guardar y Notificar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  };

  const renderNotificationsView = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
        {/* LEFT: COMPOSE */}
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-fit">
          <div className="mb-6 pb-4 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
              <Send className="mr-2 text-indigo-600" size={20}/>
              Redactar Aviso
            </h3>
            <p className="text-sm text-gray-500">Envía mensajes a todos los alumnos.</p>
          </div>
          
          <form onSubmit={handleSendBroadcast} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título del Aviso</label>
              <input 
                type="text" 
                value={broadcastTitle} 
                onChange={e => setBroadcastTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ej: Reunión Próxima Semana"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
              <textarea 
                value={broadcastBody} 
                onChange={e => setBroadcastBody(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 h-32 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Escribe el contenido del mensaje..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Importancia</label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input 
                    type="radio" 
                    name="importance" 
                    value="normal" 
                    checked={broadcastImportance === 'normal'}
                    onChange={() => setBroadcastImportance('normal')}
                    className="mr-2 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-gray-700">Normal</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input 
                    type="radio" 
                    name="importance" 
                    value="high" 
                    checked={broadcastImportance === 'high'}
                    onChange={() => setBroadcastImportance('high')}
                    className="mr-2 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-red-600 font-medium">Alta / Urgente</span>
                </label>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={sendingBroadcast}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold shadow hover:bg-indigo-700 disabled:opacity-70 flex justify-center items-center mt-4 transition-colors"
            >
              {sendingBroadcast ? 'Enviando...' : 'Enviar a Todos los Alumnos'}
            </button>
          </form>
        </div>

        {/* RIGHT: HISTORY */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50">
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
              <Megaphone className="mr-2 text-gray-600" size={20}/>
              Historial de Comunicados
            </h3>
          </div>
          
          <div className="overflow-y-auto p-0 flex-1">
            {broadcastHistory.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <p>No se han enviado comunicados aún.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {broadcastHistory.map((broadcast) => (
                  <div key={broadcast.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900 text-lg">{broadcast.title}</h4>
                      {broadcast.importance === 'high' && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                          Alta Prioridad
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-3 whitespace-pre-wrap">{broadcast.body}</p>
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>Enviado a {broadcast.recipientsCount} alumnos</span>
                      <span>{new Date(broadcast.sentAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTeamView = () => {
      // Only Super Admin can perform actions, but others might see list (or not, as per requirement "protected")
      const isSuper = currentUser.isSuperAdmin;

      return (
          <div className="space-y-6">
              {/* Invite Section (Super Admin Only) */}
              {isSuper && (
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                          <Plus className="mr-2 text-indigo-600" size={20}/>
                          Invitar Nuevo Administrador
                      </h3>
                      <form onSubmit={handleInviteAdmin} className="flex gap-4 items-end">
                          <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                              <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)} className="w-full border rounded p-2" required />
                          </div>
                          <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="w-full border rounded p-2" required />
                          </div>
                          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                              Enviar Invitación
                          </button>
                      </form>
                  </div>
              )}

              {/* Admin List */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                      <h3 className="font-bold text-gray-800">Equipo de Catequistas</h3>
                  </div>
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                              {isSuper && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>}
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {admins.map(admin => (
                              <tr key={admin.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{admin.name}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{admin.email}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      {admin.password === null ? (
                                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">Pendiente / Reset</span>
                                      ) : (
                                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 border border-green-200">Activo</span>
                                      )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {admin.isSuperAdmin ? 'Super Admin' : 'Catequista'}
                                  </td>
                                  {isSuper && (
                                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                          {!admin.isSuperAdmin && (
                                              <button 
                                                  onClick={() => handleResetAdmin(admin.id)}
                                                  className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded border border-indigo-100 flex items-center ml-auto"
                                                  title="Restablecer contraseña (el usuario deberá crear una nueva)"
                                              >
                                                  <RotateCcw size={14} className="mr-1"/> Reset
                                              </button>
                                          )}
                                      </td>
                                  )}
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      );
  };

  const renderUsersView = () => {
    const students = users.filter(u => u.role !== 'ADMIN');
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-gray-800">Directorio de Catecúmenos</h3>
            <span className="text-sm text-gray-500">{students.length} registrados</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-sm transition-colors"
            >
              <FileSpreadsheet size={16} /> Exportar Excel
            </button>
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium shadow-sm transition-colors"
            >
              <FileText size={16} /> Exportar PDF
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre / Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Edad / Estado Civil</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sacramentos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progreso</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map(student => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{student.name}</div>
                    <div className="text-sm text-gray-500">{student.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{student.age} años</div>
                    <div className="text-sm text-gray-500">{student.maritalStatus || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {student.sacramentTypes?.map(s => (
                        <span key={s} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-full bg-gray-200 rounded-full h-2.5 w-24">
                      <div 
                        className="bg-green-500 h-2.5 rounded-full" 
                        style={{ width: `${(student.completedModules.length / Math.max(modules.length, 1)) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 mt-1 inline-block">
                      {student.completedModules.length} / {modules.length} Módulos
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleDeleteUser(student.id)}
                      className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-full hover:bg-red-100 transition-colors"
                      title="Eliminar / Depurar Usuario"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">No hay estudiantes registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  const renderSettingsView = () => {
      if (!appConfig) return <div>Cargando configuración...</div>;
      
      return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 max-w-4xl mx-auto">
              <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center">
                      <Settings className="mr-2 text-indigo-600" size={20}/>
                      Configuración General y Apariencia
                  </h3>
              </div>
              
              <div className="p-8 space-y-8">
                  {/* Landing Background */}
                  <div>
                      <h4 className="font-bold text-gray-700 mb-4">Imagen de Fondo (Pantalla de Inicio)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-600 mb-1">URL de la Imagen</label>
                                  <input 
                                      type="text" 
                                      value={appConfig.landingBackground}
                                      onChange={(e) => setAppConfig({...appConfig, landingBackground: e.target.value})}
                                      className="w-full border border-gray-300 rounded p-2 text-sm"
                                  />
                              </div>
                              <div className="flex items-center gap-4">
                                  <input 
                                      type="file" 
                                      ref={settingsImageInputRef} 
                                      className="hidden" 
                                      onChange={handleSettingsImageUpload}
                                      accept="image/*"
                                  />
                                  <button 
                                      onClick={() => settingsImageInputRef.current?.click()}
                                      className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium text-sm hover:bg-gray-50 flex items-center shadow-sm w-full justify-center"
                                  >
                                      <Upload size={16} className="mr-2"/> Subir Imagen Local
                                  </button>
                              </div>
                              <p className="text-xs text-gray-500">
                                  Se recomienda una imagen horizontal de alta resolución (1920x1080).
                                  El sistema aplicará automáticamente un filtro oscuro para legibilidad.
                              </p>
                          </div>
                          
                          <div className="border rounded-lg overflow-hidden h-48 bg-gray-100 relative group">
                              <img src={appConfig.landingBackground} alt="Preview" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  <span className="text-white font-bold border-2 border-white px-4 py-2 rounded">Vista Previa Overlay</span>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Student Hero */}
                  <div className="pt-6 border-t border-gray-100">
                      <h4 className="font-bold text-gray-700 mb-4">Imagen Hero (Dashboard Estudiante)</h4>
                      <div className="space-y-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-600 mb-1">URL de la Imagen</label>
                                  <input 
                                      type="text" 
                                      value={appConfig.heroImage}
                                      onChange={(e) => setAppConfig({...appConfig, heroImage: e.target.value})}
                                      className="w-full border border-gray-300 rounded p-2 text-sm"
                                  />
                              </div>
                      </div>
                  </div>
                  
                  <div className="pt-6 border-t border-gray-100 flex justify-end">
                       <button 
                          onClick={handleSaveConfig}
                          className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow hover:bg-indigo-700 flex items-center font-bold"
                        >
                          <Save className="mr-2" /> Guardar Configuración
                        </button>
                  </div>
              </div>
          </div>
      );
  };

  const renderModulesView = () => {
    if (modules.length === 0 && !editingModule) {
         return (
             <div className="text-center p-12 bg-white rounded-xl shadow">
                 <p className="text-gray-500 mb-4">No hay módulos configurados.</p>
                 <button onClick={handleCreateNewModule} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                     Crear Primer Módulo
                 </button>
             </div>
         )
    }

    if (!editingModule) return <div className="p-8 text-center">Cargando editor...</div>;

    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-4xl mx-auto flex flex-col min-h-[600px]">
        {/* CAROUSEL HEADER */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
            <button onClick={handlePrevModule} className="p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors">
                <ChevronLeft size={24} />
            </button>
            
            <div className="text-center">
                <h3 className="font-bold text-gray-800 text-lg flex items-center justify-center">
                    {editingModule.title}
                </h3>
                <span className="text-xs text-gray-500 font-medium">
                    Módulo {currentModuleIndex + 1} de {modules.length}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <button onClick={handleNextModule} className="p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors mr-2">
                    <ChevronRight size={24} />
                </button>
                <div className="h-6 w-px bg-gray-300 mx-2"></div>
                <button 
                    onClick={handleCreateNewModule} 
                    className="flex items-center gap-1 text-sm bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-200 font-medium"
                    title="Añadir módulo al final"
                >
                    <Plus size={16} /> <span className="hidden sm:inline">Nuevo</span>
                </button>
            </div>
        </div>

        {/* EDITOR BODY with KEY to force re-render when switching modules */}
        <div className="p-8 space-y-8 overflow-y-auto flex-1" key={editingModule.id}>
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700">Título del Módulo</label>
              <input 
                type="text" 
                value={editingModule.title}
                onChange={(e) => setEditingModule({...editingModule, title: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm border p-2"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700">Orden</label>
              <input 
                type="number" 
                value={editingModule.order}
                onChange={(e) => setEditingModule({...editingModule, order: parseInt(e.target.value)})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm border p-2"
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-800">Objetivo del Módulo (Editable)</label>
              <textarea 
                value={editingModule.description}
                onChange={(e) => setEditingModule({...editingModule, description: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm border p-3 bg-gray-800 text-white"
                rows={2}
                placeholder="Breve descripción de lo que el alumno aprenderá..."
              />
            </div>

             {/* ENHANCED COVER IMAGE SECTION */}
             <div className="col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-sm font-bold text-gray-800 flex items-center mb-2">
                  <ImageIcon size={16} className="mr-2 text-indigo-600"/> Imagen de Portada del Módulo
              </label>
              <div className="flex gap-4 items-start">
                  <div className="flex-1 space-y-3">
                      <div>
                          <label className="text-xs text-gray-500 font-medium">Opción A: Pegar URL</label>
                          <input 
                            type="text" 
                            value={editingModule.imageUrl || ''}
                            onChange={(e) => setEditingModule({...editingModule, imageUrl: e.target.value})}
                            className="block w-full border-gray-300 rounded-md shadow-sm border p-2 text-sm text-gray-600"
                            placeholder="https://..."
                          />
                      </div>
                      <div>
                           <label className="text-xs text-gray-500 font-medium block mb-1">Opción B: Subir Archivo</label>
                           <input 
                              type="file" 
                              ref={coverImageInputRef} 
                              className="hidden" 
                              onChange={handleCoverImageUpload}
                              accept="image/*"
                           />
                           <button 
                              onClick={() => coverImageInputRef.current?.click()}
                              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium text-sm hover:bg-gray-100 flex items-center shadow-sm w-full"
                          >
                              <Upload size={16} className="mr-2"/> Seleccionar Imagen Local
                          </button>
                      </div>
                  </div>
                  {/* Preview */}
                  <div className="w-32 h-32 bg-gray-200 rounded-lg overflow-hidden border border-gray-300 flex-shrink-0">
                      {editingModule.imageUrl ? (
                          <img src={editingModule.imageUrl} alt="Cover" className="w-full h-full object-cover" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <ImageIcon size={32} />
                          </div>
                      )}
                  </div>
              </div>
            </div>
          </div>

          {/* FILE UPLOAD SECTION */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
              <h4 className="font-bold text-blue-900 mb-4 flex items-center">
                  <FileText className="mr-2" size={20}/> Materiales de Estudio
              </h4>
              
              <div className="space-y-3 mb-4">
                  {(editingModule.resources || []).map((res, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-3 rounded border border-blue-100 shadow-sm">
                          <div className="flex items-center">
                              <File className="text-blue-500 mr-2" size={18} />
                              <span className="text-sm font-medium text-gray-700">{res.name}</span>
                          </div>
                          <button 
                              onClick={() => handleRemoveResource(idx)}
                              className="text-gray-400 hover:text-red-500"
                              title="Eliminar archivo"
                          >
                              <X size={18}/>
                          </button>
                      </div>
                  ))}
                  {(editingModule.resources || []).length === 0 && (
                      <p className="text-sm text-blue-400 italic">No hay archivos cargados.</p>
                  )}
              </div>

              <div className="flex items-center gap-4">
                  <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileUpload}
                  />
                  <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white border border-blue-300 text-blue-700 px-4 py-2 rounded-md font-medium text-sm hover:bg-blue-50 flex items-center shadow-sm"
                  >
                      <Upload size={16} className="mr-2"/> Subir / Agregar Archivo
                  </button>
                  <p className="text-xs text-blue-500">Sube el material de lectura principal (PDF/Doc).</p>
              </div>
          </div>

          {/* DYNAMIC TOPICS SECTION */}
          <div>
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-bold text-gray-800">Temas y Contenido Multimedia</h4>
                <button 
                    onClick={handleAddTopic}
                    className="text-indigo-600 font-medium text-sm flex items-center hover:text-indigo-800"
                >
                    <Plus size={16} className="mr-1"/> Agregar Tema
                </button>
            </div>

            <div className="space-y-6">
                {(editingModule.topics || []).map((topic, index) => (
                    <div key={topic.id || index} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 relative">
                        <button 
                            onClick={() => handleRemoveTopic(index)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
                            title="Eliminar Tema"
                        >
                            <X size={18}/>
                        </button>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            {/* INPUT 1: TÍTULO (Sin el onBlur) */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Título del Tema {index + 1}</label>
                                <input 
                                    type="text" 
                                    value={topic.title}
                                    onChange={(e) => handleTopicChange(index, 'title', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm font-medium text-gray-900"
                                    placeholder="Ej: La Creación"
                                />
                            </div>

                            {/* INPUT 2: VIDEO (Con el onBlur) */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center"><Video size={12} className="mr-1"/> Link de YouTube</label>
                                <input 
                                    type="text" 
                                    value={topic.videoUrl}
                                    onChange={(e) => handleTopicChange(index, 'videoUrl', e.target.value)}
                                    onBlur={(e) => handleTopicChange(index, 'videoUrl', normalizeYoutube(e.target.value))}
                                    className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-sm text-gray-600"
                                    placeholder="https://youtube.com/..."
                                />
                            </div>
                        </div>
                        
                        <div>
                             <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Resumen / Notas del Tema</label>
                             <textarea 
                                value={topic.summary}
                                onChange={(e) => handleTopicChange(index, 'summary', e.target.value)}
                                className="w-full bg-gray-800 text-gray-200 border-none rounded p-3 text-sm"
                                rows={3}
                                placeholder="Puntos clave del video o tema..."
                             />
                        </div>
                    </div>
                ))}
                {(editingModule.topics || []).length === 0 && (
                     <div className="text-center p-8 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                        <p className="text-gray-500 text-sm">No has agregado temas a este módulo.</p>
                     </div>
                )}
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <button 
              onClick={() => handleSaveModule(editingModule)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg shadow hover:bg-green-700 flex items-center font-bold sticky bottom-0"
            >
              <Save className="mr-2" /> Guardar Contenido
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderExamsView = () => {
    // 1. If we are editing a specific quiz, show the editor
    if (editingQuizModule) {
        return (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-4xl mx-auto flex flex-col min-h-[600px]">
                 <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <button onClick={() => setEditingQuizModule(null)} className="flex items-center text-gray-600 hover:text-indigo-600">
                         <ChevronLeft className="mr-1" /> Volver a Lista
                    </button>
                    <h3 className="font-bold text-gray-800 text-lg">Editando Cuestionario: {editingQuizModule.title}</h3>
                    <div className="w-20"></div> {/* Spacer */}
                 </div>
                 
                 <div className="p-8 space-y-8 overflow-y-auto flex-1">
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-start mb-6">
                        <HelpCircle className="text-blue-500 mt-1 mr-3 flex-shrink-0" />
                        <p className="text-sm text-blue-800">
                            Configura las preguntas para la evaluación final de este módulo. 
                            Recuerda que el alumno necesita un 80% de aciertos para aprobar.
                        </p>
                    </div>

                    {editingQuizModule.questions.map((q, qIdx) => (
                    <div key={q.id} className="mb-4 p-4 border rounded-lg bg-gray-50">
                        <div className="flex justify-between mb-2">
                        <label className="text-xs font-bold uppercase text-gray-500">Pregunta {qIdx + 1}</label>
                        <button 
                            onClick={() => {
                            const newQs = [...editingQuizModule.questions];
                            newQs.splice(qIdx, 1);
                            setEditingQuizModule({...editingQuizModule, questions: newQs});
                            }}
                            className="text-red-500 text-xs hover:underline"
                        >
                            Eliminar
                        </button>
                        </div>
                        <input 
                        className="w-full mb-3 p-2 border rounded"
                        placeholder="Escribe la pregunta aquí..."
                        value={q.text}
                        onChange={(e) => {
                            const newQs = [...editingQuizModule.questions];
                            newQs[qIdx].text = e.target.value;
                            setEditingQuizModule({...editingQuizModule, questions: newQs});
                        }}
                        />
                        <div className="space-y-2 pl-4">
                        {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center">
                            <input 
                                type="radio" 
                                name={`correct-${q.id}`} 
                                checked={q.correctIndex === oIdx} 
                                onChange={() => {
                                const newQs = [...editingQuizModule.questions];
                                newQs[qIdx].correctIndex = oIdx;
                                setEditingQuizModule({...editingQuizModule, questions: newQs});
                                }}
                                className="mr-2"
                            />
                            <input 
                                className="flex-1 p-1 border rounded text-sm"
                                placeholder={`Opción ${String.fromCharCode(65 + oIdx)}`}
                                value={opt}
                                onChange={(e) => {
                                const newQs = [...editingQuizModule.questions];
                                newQs[qIdx].options[oIdx] = e.target.value;
                                setEditingQuizModule({...editingQuizModule, questions: newQs});
                                }}
                            />
                            </div>
                        ))}
                        </div>
                    </div>
                    ))}
                    <button 
                        onClick={() => setEditingQuizModule({
                            ...editingQuizModule, 
                            questions: [...editingQuizModule.questions, { 
                            id: Math.random().toString(), 
                            text: '', 
                            options: ['', '', '', ''], 
                            correctIndex: 0 
                            }]
                        })}
                        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-600 transition-colors flex justify-center items-center"
                    >
                    <Plus size={16} className="mr-1" /> Agregar Nueva Pregunta
                    </button>

                    <div className="flex justify-end pt-6 border-t">
                        <button 
                        onClick={() => handleSaveModule(editingQuizModule)}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg shadow hover:bg-green-700 flex items-center font-bold"
                        >
                        <Save className="mr-2" /> Guardar Cuestionario
                        </button>
                    </div>
                 </div>
            </div>
        )
    }

    // 2. Default View: List of Cards
    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-100 mb-6">
                 <h2 className="text-xl font-bold text-gray-800 mb-2">Gestión de Exámenes</h2>
                 <p className="text-gray-500">Selecciona un módulo para crear o editar su cuestionario de evaluación.</p>
            </div>

            <div className="space-y-4">
                {modules.map((mod) => {
                    const hasExam = mod.questions && mod.questions.length > 0;
                    return (
                        <div key={mod.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-xs font-bold uppercase text-indigo-600 tracking-wider">Módulo {mod.order}</span>
                                    {hasExam ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                            <CheckCircle size={12} className="mr-1"/> {mod.questions.length} Preguntas Activas
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                                            <AlertTriangle size={12} className="mr-1"/> Sin Examen Configurado
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">{mod.title}</h3>
                                <p className="text-gray-500 text-sm mt-1">{mod.description}</p>
                            </div>
                            
                            <button 
                                onClick={() => setEditingQuizModule(mod)}
                                className={`
                                    px-4 py-2 rounded-lg font-medium border flex items-center justify-center transition-colors whitespace-nowrap
                                    ${hasExam 
                                        ? 'border-indigo-600 text-indigo-600 hover:bg-indigo-50' 
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 border-transparent'}
                                `}
                            >
                                <HelpCircle size={18} className="mr-2" />
                                {hasExam ? 'Editar Cuestionario' : 'Crear Cuestionario'}
                            </button>
                        </div>
                    )
                })}
                {modules.length === 0 && (
                    <div className="text-center p-12 text-gray-400">No hay módulos creados aún. Ve a la sección de "Módulos" para crear uno.</div>
                )}
            </div>
        </div>
    );
  };

  return (
    <div>
      {view === 'dashboard' && renderStatsView()}
      {view === 'users' && renderUsersView()}
      {view === 'modules' && renderModulesView()}
      {view === 'exams' && renderExamsView()}
      {view === 'notifications' && renderNotificationsView()}
      {view === 'calendar' && renderCalendarView()}
      {view === 'team' && renderTeamView()}
      {view === 'settings' && renderSettingsView()}
    </div>
  );
};
