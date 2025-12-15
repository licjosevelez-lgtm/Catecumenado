
import React, { useState, useEffect } from 'react';
import { User, Module, CalendarEvent } from '../types';
import { SupabaseService as MockService } from '../services/supabase';
import { PlayCircle, CheckCircle, Lock, BookOpen, Video, FileText, Download, User as UserIcon, Save, ChevronDown, CheckSquare, Square, MapPin, Phone, Calendar, Mail, ExternalLink, Heart, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Quiz } from './Quiz';
import { PieChart, Pie, Cell } from 'recharts';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';

interface Props {
  user: User;
  view?: string;
  onUserUpdate?: (user: User) => void;
}

const AVAILABLE_SACRAMENTS = [
  'Bautismo',
  'Primera Comunión',
  'Confirmación',
  'Matrimonio'
];

const MARITAL_STATUS_OPTIONS = [
    'Soltero',
    'Unión Libre',
    'Casado Civil',
    'Casado Iglesia'
];

export const StudentDashboard: React.FC<Props> = ({ user, view = 'dashboard', onUserUpdate }) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [takingQuiz, setTakingQuiz] = useState(false);
  const [config, setConfig] = useState({ heroImage: '' });

  // Calendar State
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Profile State
  const [profileData, setProfileData] = useState({
      name: '',
      age: 18,
      maritalStatus: 'Soltero',
      birthPlace: '',
      phone: '',
      address: '',
      sacraments: [] as string[]
  });
  const [isSacramentListOpen, setSacramentListOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');

  // Arrays seguros
  const safeCompletedModules = user.completedModules || [];

  useEffect(() => {
    const loadData = async () => {
      const m = await MockService.getModules();
      setModules(m.sort((a: Module, b: Module) => a.order - b.order));
      const conf = await MockService.getAppConfig();
      if (conf) setConfig(conf);
      const events = await MockService.getEvents();
      setCalendarEvents(events || []);
    };
    loadData();
  }, []);

  useEffect(() => {
    setProfileData({
        name: user.name || '',
        age: user.age || 18,
        maritalStatus: user.maritalStatus || 'Soltero',
        birthPlace: user.birthPlace || '',
        phone: user.phone || '',
        address: user.address || '',
        sacraments: user.sacramentTypes || []
    });
  }, [user]);

  // FIX: Reset active module when navigating to Dashboard (Home)
  useEffect(() => {
    if (view === 'dashboard') {
      setActiveModule(null);
      setTakingQuiz(false);
    }
  }, [view]);

  const isModuleLocked = (mod: Module) => {
    if (mod.order === 1) return false;
    const previousMod = modules.find(m => m.order === mod.order - 1);
    if (!previousMod) return false;
    return !safeCompletedModules.includes(previousMod.id);
  };

  const isModuleCompleted = (mod: Module) => safeCompletedModules.includes(mod.id);
  const allModulesComplete = modules.length > 0 && modules.every(m => safeCompletedModules.includes(m.id));

  // --- HELPER FUNCTIONS ---
  const formatDateSpanish = (dateString: string) => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const year = parts[0];
    const monthIndex = parseInt(parts[1]) - 1;
    const day = parts[2];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${day}/${months[monthIndex]}/${year}`;
  };

  const toggleSacrament = (sacrament: string) => {
    setProfileData(prev => ({
        ...prev,
        sacraments: prev.sacraments.includes(sacrament) 
        ? prev.sacraments.filter(s => s !== sacrament)
        : [...prev.sacraments, sacrament]
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess('');

    try {
        const updatedUser: User = {
            ...user,
            name: profileData.name,
            age: profileData.age,
            maritalStatus: profileData.maritalStatus,
            birthPlace: profileData.birthPlace,
            phone: profileData.phone,
            address: profileData.address,
            sacramentTypes: profileData.sacraments
        };
        
        await MockService.updateUser(updatedUser);
        if (onUserUpdate) onUserUpdate(updatedUser);
        
        setProfileSuccess('Tus datos han sido actualizados correctamente.');
        setTimeout(() => setProfileSuccess(''), 3000);
    } catch (error: any) {
        alert("Error al guardar perfil: " + error.message);
    } finally {
        setSavingProfile(false);
    }
  };

  const handleDownloadPass = async () => {
    try {
        // PDF Setup: Media carta aprox width 140mm, height 216mm
        const doc = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: [140, 216] 
        });

        // Background / Border
        doc.setLineWidth(1);
        doc.setDrawColor(200, 200, 200);
        doc.rect(5, 5, 130, 206);

        // Header Background
        doc.setFillColor(79, 70, 229); // Indigo 600
        doc.rect(5, 5, 130, 30, 'F');
        
        // Header Text
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("PASE DE INGRESO", 70, 18, { align: "center" });
        doc.setFontSize(10);
        doc.text("FASE PRESENCIAL", 70, 25, { align: "center" });

        // User Info
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text("Catecúmeno:", 70, 50, { align: "center" });
        
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(user.name || "Sin Nombre", 70, 60, { align: "center" });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`ID: ${user.id}`, 70, 68, { align: "center" });

        // Status
        doc.setTextColor(22, 163, 74); // Green 600
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("✔ MÓDULOS TEÓRICOS APROBADOS", 70, 85, { align: "center" });

        // QR Code
        // Use user ID or Email for unique identification
        const qrDataUrl = await QRCode.toDataURL(user.id, { margin: 1, width: 200 });
        doc.addImage(qrDataUrl, 'PNG', 40, 95, 60, 60);

        // Footer Instructions
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("Presenta este código QR al catequista", 70, 165, { align: "center" });
        doc.text("para registrar tu asistencia en la parroquia.", 70, 170, { align: "center" });
        
        // Timestamp
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generado: ${new Date().toLocaleDateString()}`, 70, 190, { align: "center" });

        doc.save(`Pase_Catequesis_${(user.name || 'usuario').replace(/\s+/g, '_')}.pdf`);

    } catch (error) {
        console.error("Error generating PDF pass", error);
        alert("Hubo un error generando el pase. Intenta nuevamente.");
    }
  };

  const progressData = [
    { name: 'Completado', value: safeCompletedModules.length },
    { name: 'Pendiente', value: Math.max(0, modules.length - safeCompletedModules.length) }
  ];
  const COLORS = ['#ffffff', 'rgba(255,255,255,0.3)'];

  const renderProfile = () => (
      <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center">
                  <UserIcon className="text-indigo-600 mr-2" size={20} />
                  <h3 className="font-bold text-gray-800">Editar Información Personal</h3>
              </div>
              <div className="p-8">
                  {profileSuccess && (
                      <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 text-sm text-green-700 rounded flex items-center">
                          <CheckCircle size={16} className="mr-2"/> {profileSuccess}
                      </div>
                  )}
                  <form onSubmit={handleSaveProfile} className="space-y-6">
                      <div className="opacity-60">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico (No editable)</label>
                          <div className="relative">
                                <Mail size={18} className="absolute left-3 top-2.5 text-gray-400"/>
                                <input type="text" value={user.email} disabled className="w-full pl-10 border border-gray-300 rounded-lg p-2 bg-gray-50 cursor-not-allowed"/>
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                          <div className="relative">
                                <UserIcon size={18} className="absolute left-3 top-2.5 text-gray-400"/>
                                <input type="text" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} className="w-full pl-10 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500" required/>
                          </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Edad</label>
                              <div className="relative">
                                    <Calendar size={18} className="absolute left-3 top-2.5 text-gray-400"/>
                                    <input type="number" value={profileData.age} onChange={e => setProfileData({...profileData, age: parseInt(e.target.value)})} className="w-full pl-10 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500" required min={15} max={99}/>
                              </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estado Civil</label>
                            <div className="relative">
                                <Heart size={18} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
                                <select value={profileData.maritalStatus} onChange={(e) => setProfileData({...profileData, maritalStatus: e.target.value})} className="w-full pl-10 pr-8 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 appearance-none bg-white">
                                    {MARITAL_STATUS_OPTIONS.map(status => (<option key={status} value={status}>{status}</option>))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Lugar de Nacimiento</label>
                          <div className="relative">
                                <MapPin size={18} className="absolute left-3 top-2.5 text-gray-400"/>
                                <input type="text" value={profileData.birthPlace} onChange={e => setProfileData({...profileData, birthPlace: e.target.value})} className="w-full pl-10 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"/>
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (WhatsApp)</label>
                          <div className="relative">
                                <Phone size={18} className="absolute left-3 top-2.5 text-gray-400"/>
                                <input type="tel" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} className="w-full pl-10 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500" required/>
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Actual</label>
                          <textarea value={profileData.address} onChange={e => setProfileData({...profileData, address: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 h-20 resize-none"/>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sacramentos a Realizar</label>
                        <div className="relative">
                            <button type="button" onClick={() => setSacramentListOpen(!isSacramentListOpen)} className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 flex items-center justify-between text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                <span className="block truncate text-sm text-gray-900">{profileData.sacraments.length > 0 ? `${profileData.sacraments.length} seleccionado(s)` : 'Seleccionar...'}</span>
                                <ChevronDown size={16} className={`text-gray-500 transition-transform ${isSacramentListOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isSacramentListOpen && (
                            <div className="absolute mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto sm:text-sm z-50 border border-gray-200">
                                {AVAILABLE_SACRAMENTS.map((sac) => {
                                const isSelected = profileData.sacraments.includes(sac);
                                return (
                                    <div key={sac} onClick={() => toggleSacrament(sac)} className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-50 flex items-center">
                                    <div className={`mr-3 ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`}>{isSelected ? <CheckSquare size={18} /> : <Square size={18} />}</div>
                                    <span className={`block truncate ${isSelected ? 'font-semibold text-indigo-900' : 'font-normal text-gray-900'}`}>{sac}</span>
                                    </div>
                                );
                                })}
                            </div>
                            )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                            {profileData.sacraments.map(s => (<span key={s} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">{s}</span>))}
                        </div>
                      </div>
                      <div className="flex justify-end pt-4">
                          <button type="submit" disabled={savingProfile} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium shadow hover:bg-indigo-700 flex items-center disabled:opacity-70">
                              {savingProfile ? 'Guardando...' : <><Save size={18} className="mr-2"/> Guardar Cambios</>}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      </div>
  );

  const renderCalendarView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    const years = Array.from({ length: 11 }, (_, i) => year - 5 + i);
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const emptySlots = Array.from({ length: firstDay });
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingEvents = calendarEvents
        .filter(e => e.date >= todayStr)
        .sort((a, b) => a.date.localeCompare(b.date));

    const handleDayClick = (day: number) => {
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        setSelectedDate(dateStr);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-gray-200 rounded-full text-gray-600"><ChevronLeft /></button>
                    <div className="flex gap-2 items-center">
                        <select value={month} onChange={(e) => setCurrentDate(new Date(year, parseInt(e.target.value), 1))} className="bg-white border-gray-300 border text-gray-800 text-sm rounded-lg p-2.5 font-bold uppercase">{monthNames.map((m, idx) => (<option key={idx} value={idx}>{m}</option>))}</select>
                        <select value={year} onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value), month, 1))} className="bg-white border-gray-300 border text-gray-800 text-sm rounded-lg p-2.5 font-bold">{years.map(y => (<option key={y} value={y}>{y}</option>))}</select>
                    </div>
                    <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-gray-200 rounded-full text-gray-600"><ChevronRight /></button>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-7 gap-2 text-center mb-4">{['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (<div key={d} className="text-xs font-bold text-gray-400 uppercase">{d}</div>))}</div>
                    <div className="grid grid-cols-7 gap-2">
                        {emptySlots.map((_, i) => <div key={`empty-${i}`}></div>)}
                        {daysArray.map(day => {
                            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                            const hasEvent = calendarEvents.some(e => e.date === dateStr);
                            const isSelected = selectedDate === dateStr;
                            return (
                                <button key={day} onClick={() => handleDayClick(day)} className={`h-14 rounded-lg flex flex-col items-center justify-center relative transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'hover:bg-gray-50 bg-white border border-gray-100'}`}>
                                    <span className="font-semibold text-sm">{day}</span>
                                    {hasEvent && (<span className={`w-2 h-2 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-green-500'}`}></span>)}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-fit">
                <div className="p-6 border-b border-gray-100 bg-gray-50"><h3 className="font-bold text-gray-800 flex items-center"><Calendar className="mr-2 text-indigo-600" size={20} /> Próximos Eventos</h3></div>
                <div className="p-0 max-h-[500px] overflow-y-auto">
                    {upcomingEvents.length === 0 ? (<div className="p-6 text-center text-gray-400 text-sm">No hay eventos próximos.</div>) : (
                        <div className="divide-y divide-gray-100">{upcomingEvents.map(evt => (
                             <div key={evt.id} className={`p-4 hover:bg-gray-50 group relative ${selectedDate === evt.date ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}>
                                 {/* Applied formatDateSpanish here */}
                                 <div className="font-bold text-indigo-900 capitalize">{formatDateSpanish(evt.date)}</div>
                                 <div className="text-gray-800 font-medium pr-8">{evt.location}</div>
                                 <div className="text-sm text-gray-500 flex items-center gap-2 mt-1"><Clock size={14}/> {evt.time}</div>
                             </div>
                        ))}</div>
                    )}
                </div>
            </div>
        </div>
    );
  };

  const renderContent = () => {
    if (activeModule) {
        if (takingQuiz) {
        return (
            <Quiz 
            module={activeModule} 
            userId={user.id} 
            onCancel={() => setTakingQuiz(false)}
            onComplete={(passed) => {
                setTakingQuiz(false);
                if (passed) {
                   setActiveModule(null);
                   const updatedModules = [...(user.completedModules || [])];
                   if (!updatedModules.includes(activeModule.id)) {
                      updatedModules.push(activeModule.id);
                   }
                   const updatedUser = { ...user, completedModules: updatedModules };
                   if (onUserUpdate) onUserUpdate(updatedUser);
                   alert("¡Felicidades! Has aprobado el módulo.");
                }
            }}
            />
        );
        }

        return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-5xl mx-auto">
            <div className="p-8">
            <button onClick={() => setActiveModule(null)} className="text-sm text-gray-500 mb-6 hover:underline flex items-center">← Volver al tablero</button>
            <div className="mb-8 border-b pb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 px-2 py-1 rounded">Módulo {activeModule.order}</span>
                <h2 className="text-3xl font-bold text-gray-900 mt-2">{activeModule.title}</h2>
                <p className="text-lg text-gray-600 mt-2">{activeModule.description}</p>
            </div>
            
            {(activeModule.resources || []).length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 mb-10">
                    <h3 className="font-bold text-blue-900 mb-3 flex items-center"><BookOpen className="mr-2"/> Documentos de Estudio</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {activeModule.resources!.map((res, idx) => (
                            <a key={idx} href={res.url} className="flex items-center bg-white p-3 rounded shadow-sm hover:shadow-md transition-shadow border border-blue-100 text-blue-700">
                                <FileText className="mr-2 flex-shrink-0" size={20}/>
                                <span className="truncate font-medium flex-1">{res.name}</span>
                                <Download size={16} className="ml-2 text-blue-400"/>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-6 mb-12">
                {(activeModule.topics || []).map((topic, idx) => (
                    <div key={idx} className="bg-white border-b border-gray-100 pb-6 last:border-0">
                        <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
                            <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 font-bold flex-shrink-0">{idx + 1}</span>
                            {topic.title}
                        </h3>
                        {topic.videoUrl && (
                            <div className="ml-11 mb-3">
                                <a href={topic.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-red-600 font-medium hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-sm border border-red-100 group"><ExternalLink size={16} className="mr-2" />▶ Ver video en YouTube</a>
                            </div>
                        )}
                        <div className="ml-11 text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-lg text-sm border-l-4 border-gray-300">{topic.summary || "Sin resumen disponible."}</div>
                    </div>
                ))}
                {(activeModule.topics || []).length === 0 && (<div className="text-center text-gray-400 py-8">No hay temas cargados en este módulo.</div>)}
            </div>
            <div className="flex justify-center border-t pt-8">
                <button onClick={() => setTakingQuiz(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-indigo-700 transform hover:scale-105 transition-all flex items-center"><PlayCircle className="mr-2" />Realizar Examen del Módulo</button>
            </div>
            </div>
        </div>
        );
    }

    // Logic for distinguishing "Inicio" (dashboard) vs "Mis Cursos" (courses)
    const showHero = view === 'dashboard';

    return (
        <div className="space-y-8">
        
        {/* HERO SECTION - Only shown on Home/Dashboard view */}
        {showHero ? (
            <div className="h-64 rounded-2xl bg-cover bg-center shadow-md relative flex items-center justify-between overflow-hidden" style={{ backgroundImage: `url(${config.heroImage || 'https://picsum.photos/1200/400'})` }}>
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>
                <div className="relative z-10 p-8 text-white flex-1">
                    <h1 className="text-3xl font-bold">Bienvenido, {user.name}</h1>
                    <p className="opacity-90 mt-2 text-lg">{safeCompletedModules.length === modules.length ? "¡Has completado toda tu formación teórica!" : "Continúa tu camino de fe."}</p>
                </div>
                <div className="relative z-10 p-8 hidden md:flex flex-col items-center">
                    <div style={{ width: 120, height: 120 }}>
                        <PieChart width={120} height={120}>
                            <Pie data={progressData} cx={60} cy={60} innerRadius={40} outerRadius={55} paddingAngle={5} dataKey="value" stroke="none">
                                {progressData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                            </Pie>
                        </PieChart>
                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none" style={{ paddingTop: '20px' }}><span className="text-xl font-bold text-white">{Math.round((safeCompletedModules.length / Math.max(modules.length, 1)) * 100)}%</span></div>
                    </div>
                    <span className="text-xs text-white/80 mt-2 font-medium uppercase tracking-widest">Progreso</span>
                </div>
            </div>
        ) : (
            // SIMPLE HEADER - Shown on Courses view
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    <BookOpen className="mr-2 text-indigo-600"/> Mis Cursos
                </h2>
                <p className="text-gray-500 mt-1">Accede a todo el material de estudio disponible.</p>
            </div>
        )}

        {/* MODULES GRID - Shown on both views */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modules.map((mod) => {
            const locked = isModuleLocked(mod);
            const completed = isModuleCompleted(mod);
            return (
                <div key={mod.id} className={`relative bg-white rounded-xl p-6 shadow-sm border-2 transition-all ${locked ? 'border-gray-100 opacity-70 grayscale' : 'border-transparent hover:shadow-md hover:border-indigo-100'} ${completed ? 'border-green-100' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 px-2 py-1 rounded">Módulo {mod.order}</span>
                    {completed ? (<CheckCircle className="text-green-500" />) : locked ? (<Lock className="text-gray-400" />) : (<div className="h-6 w-6 rounded-full border-2 border-indigo-500"></div>)}
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{mod.title}</h3>
                <p className="text-gray-500 text-sm mb-6 h-10 overflow-hidden">{mod.description}</p>
                <button disabled={locked} onClick={() => setActiveModule(mod)} className={`w-full py-2 rounded-lg font-medium transition-colors flex justify-center items-center ${locked ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'} ${completed ? 'bg-green-50 text-green-700 hover:bg-green-100' : ''}`}>
                    {locked ? 'Bloqueado' : completed ? 'Repasar Módulo' : 'Comenzar'}
                </button>
                </div>
            );
            })}
        </div>
        {allModulesComplete && (
            <div className="bg-gradient-to-r from-yellow-100 to-orange-50 border border-yellow-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between shadow-sm">
            <div className="mb-4 md:mb-0">
                <h3 className="text-xl font-bold text-yellow-800">🎉 ¡Formación Teórica Completada!</h3>
                <p className="text-yellow-700 text-sm mt-1">Has desbloqueado tu Pase de Asistencia para las sesiones presenciales.</p>
            </div>
            <button 
                onClick={handleDownloadPass}
                className="bg-yellow-500 text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-yellow-600 transition-transform hover:-translate-y-1 flex items-center"
            >
                <Download size={20} className="mr-2"/> Descargar Pase QR
            </button>
            </div>
        )}
        </div>
    );
  };

  return (
      <div>
          {view === 'profile' ? renderProfile() : view === 'calendar' ? renderCalendarView() : renderContent()}
      </div>
  );
};
