
import React, { useState, useEffect, useRef } from 'react';
import { User, Module, Question, Topic, AdminUser, Broadcast, CalendarEvent, AppConfig } from '../types';
import { SupabaseService as MockService } from '../services/supabase';
import { GeminiService } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Users, BookOpen, AlertTriangle, Trash2, Edit, Save, Plus, X, FileText, Link as LinkIcon, Image as ImageIcon, Video, UserCheck, Activity, ChevronLeft, ChevronRight, HelpCircle, CheckCircle, Upload, File, Shield, RotateCcw, Megaphone, Send, Calendar, Clock, DollarSign, MapPin, Settings, FileSpreadsheet, MessageSquare, RefreshCw, Download, Monitor, Layout as LayoutIcon, GripVertical } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  view: string;
  currentUser: User;
}

export const AdminDashboard: React.FC<Props> = ({ view, currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingQuizModule, setEditingQuizModule] = useState<Module | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Settings Image Refs (Files)
  const landingImageFileRef = useRef<HTMLInputElement>(null);
  const heroImageFileRef = useRef<HTMLInputElement>(null);
  
  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingLanding, setUploadingLanding] = useState(false);

  // Team Management State
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  
  // Lifted state for Carousel Navigation
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);

  // Broadcast & Welcome Message State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastImportance, setBroadcastImportance] = useState<'normal' | 'high'>('normal');
  const [broadcastHistory, setBroadcastHistory] = useState<Broadcast[]>([]);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [savingWelcome, setSavingWelcome] = useState(false);

  // Calendar State
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  // Event Form State
  const [evtLocation, setEvtLocation] = useState('');
  const [evtTime, setEvtTime] = useState('');
  const [evtDuration, setEvtDuration] = useState('');
  const [evtCost, setEvtCost] = useState('');

  // REQUERIMIENTO: Drag and Drop State
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

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

  useEffect(() => {
    loadData();
    setEditingQuizModule(null);
  }, [view]);

  useEffect(() => {
    if (view === 'modules' && modules.length > 0 && !editingModule) {
      setEditingModule(modules[currentModuleIndex]);
      setSelectedFile(null); 
    }
  }, [view, modules, currentModuleIndex, editingModule]);

  const loadData = async () => {
    setLoading(true);
    try {
      const allUsers = await MockService.getAllUsers();
      setUsers(allUsers || []);
      
      const loadedModules = await MockService.getModules();
      setModules(loadedModules || []);
      
      const config = await MockService.getAppConfig();
      setAppConfig(config);
      
      if (view === 'team') {
          const loadedAdmins = await MockService.getAdminList();
          setAdmins(loadedAdmins || []);
      }

      if (view === 'notifications') {
        const history = await MockService.getBroadcastHistory();
        setBroadcastHistory(history || []);
        const welcome = await MockService.getWelcomeMessage();
        setWelcomeMessage(welcome);
      }

      if (view === 'calendar') {
          const events = await MockService.getEvents();
          setCalendarEvents(events || []);
      }
      
      if (editingModule && loadedModules.length > 0) {
          const fresh = loadedModules.find(m => m.id === editingModule.id);
          if (fresh) setEditingModule(fresh);
      }
      if (editingQuizModule && loadedModules.length > 0) {
          const fresh = loadedModules.find(m => m.id === editingQuizModule.id);
          if (fresh) setEditingQuizModule(fresh);
      }
    } catch (error) {
       console.error("Error loading data:", error);
    } finally {
       setLoading(false);
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
      try {
        setUploadingFile(true);
        let updatedModule = { ...moduleToSave };

        if (selectedFile) {
           const publicUrl = await MockService.uploadFile(selectedFile);
           const newResource = {
             name: selectedFile.name,
             url: publicUrl,
             type: 'pdf' as const
           };
           updatedModule.resources = [...(updatedModule.resources || []), newResource];
        }

        await MockService.updateModule(updatedModule);
        
        setSelectedFile(null); 
        if (fileInputRef.current) fileInputRef.current.value = ''; 
        
        loadData();
        alert('Cambios guardados correctamente.');
      } catch (error: any) {
        console.error(error);
        alert(`Error al guardar: ${error.message}`);
      } finally {
        setUploadingFile(false);
      }
    }
  };

  const handleSaveConfig = async () => {
      if (appConfig) {
          await MockService.updateAppConfig(appConfig);
          loadData();
          alert('Configuración guardada exitosamente.');
      }
  };
  
  const handleSaveWelcomeMessage = async () => {
      setSavingWelcome(true);
      try {
          await MockService.updateWelcomeMessage(welcomeMessage);
          alert("Mensaje de bienvenida actualizado. Los próximos alumnos recibirán este mensaje.");
      } catch (e: any) {
          alert("Error: " + e.message);
      } finally {
          setSavingWelcome(false);
      }
  };

  // --- EXPORT HANDLERS ---
  const handleExportExcel = () => {
    const students = users.filter(u => u.role !== 'ADMIN');
    const data = students.map(s => ({
      'Nombre Completo': s.name,
      'Email': s.email,
      'Promedio': s.averageScore ? `${s.averageScore.toFixed(1)}%` : '0%',
      'Estado Civil': s.maritalStatus || 'N/A',
      'Edad': s.age || 'N/A',
      'Lugar Nacimiento': s.birthPlace || 'N/A',
      'Teléfono': s.phone || 'N/A',
      'Dirección': s.address || 'N/A',
      'Sacramentos Solicitados': (s.sacramentTypes || []).join(', ') || 'N/A',
      'Módulos Completados': `${(s.completedModules || []).length}/${modules.length}`
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Catecumenos");
    XLSX.writeFile(workbook, `Base_Datos_Catequesis_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = () => {
    const students = users.filter(u => u.role !== 'ADMIN');
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Directorio de Catecúmenos", 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 14, 28);
    doc.text(`Total de registros: ${students.length}`, 14, 34);

    const tableColumn = ["Nombre", "Email", "Promedio", "Estado Civil", "Teléfono", "Sacramentos"];
    const tableRows = students.map(s => [
      s.name,
      s.email,
      s.averageScore ? `${s.averageScore.toFixed(1)}%` : '0%',
      s.maritalStatus || '',
      s.phone || '',
      (s.sacramentTypes || []).join(', ') || ''
    ]);

    autoTable(doc, {
      startY: 40,
      head: [tableColumn],
      body: tableRows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`Directorio_Catecumenos_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // --- TEAM/BROADCAST/CALENDAR HANDLERS ---
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
      if (window.confirm('¿Restablecer el acceso de este administrador?')) {
          await MockService.resetAdminAccess(adminId);
          loadData();
      }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastBody) return;
    setSendingBroadcast(true);
    try {
      await MockService.sendBroadcast(broadcastTitle, broadcastBody, broadcastImportance);
      setBroadcastTitle('');
      setBroadcastBody('');
      setBroadcastImportance('normal');
      loadData(); 
      alert('Mensaje enviado a todos los alumnos correctamente.');
    } catch (error: any) {
      alert('Error enviando mensaje: ' + error.message);
    } finally {
      setSendingBroadcast(false);
    }
  };
  
  const handleDeleteBroadcast = async (id: string) => {
      if(window.confirm("¿Seguro que deseas eliminar este comunicado del historial?")) {
          try {
              await MockService.deleteBroadcast(id);
              loadData();
          } catch(e: any) {
              alert(e.message);
          }
      }
  };

  const handleLoadBroadcastToForm = (b: Broadcast) => {
      setBroadcastTitle(b.title);
      setBroadcastBody(b.body);
      setBroadcastImportance(b.importance);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDayClick = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const formattedDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    setSelectedDate(formattedDate);
    setEvtLocation('');
    setEvtTime('');
    setEvtDuration('');
    setEvtCost('');
    setEditingEventId(null);
    setShowEventModal(true);
  };
  
  const handleEditEvent = (evt: CalendarEvent) => {
      setEditingEventId(evt.id);
      setSelectedDate(evt.date);
      setEvtLocation(evt.location);
      setEvtTime(evt.time);
      setEvtDuration(evt.duration);
      setEvtCost(evt.cost);
      setShowEventModal(true);
  };
  
  const handleDeleteEvent = async (id: string) => {
      if(window.confirm("¿Seguro que deseas eliminar este evento?")) {
          try {
              await MockService.deleteEvent(id);
              setCalendarEvents(prev => prev.filter(e => e.id !== id));
          } catch(e: any) {
              alert("Error: " + e.message);
          }
      }
  };

  const handleSaveEvent = async (notify: boolean) => {
    if (!selectedDate || !evtLocation || !evtTime) {
      alert('Por favor completa al menos Lugar y Horario.');
      return;
    }
    const eventId = editingEventId || Date.now().toString();
    const eventData: CalendarEvent = {
      id: eventId,
      date: selectedDate,
      location: evtLocation,
      time: evtTime,
      duration: evtDuration,
      cost: evtCost
    };
    try {
      if (editingEventId) await MockService.updateEvent(eventData);
      else await MockService.addEvent(eventData);
      if (notify) {
        let title = editingEventId ? "⚠️ CAMBIO EN CRONOGRAMA" : "Nuevo Curso Presencial Disponible";
        let msg = editingEventId ? `CAMBIO: Curso en ${evtLocation} al ${formatDateSpanish(selectedDate)}` : `Se ha abierto una fecha en ${evtLocation} para el ${formatDateSpanish(selectedDate)}.`;
        await MockService.sendBroadcast(title, msg, 'high');
      }
      setShowEventModal(false);
      loadData();
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  // --- NAVIGATION LOGIC ---
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
    const newModule: Module = { id: Date.now().toString(), title: `Nuevo Módulo ${modules.length + 1}`, description: '', topics: [], order: modules.length + 1, questions: [], resources: [] };
    try {
        await MockService.updateModule(newModule);
        const updatedModules = await MockService.getModules();
        setModules(updatedModules);
        const newIndex = updatedModules.length - 1;
        setCurrentModuleIndex(newIndex);
        setEditingModule(updatedModules[newIndex]);
    } catch (e: any) {
        alert('Error creando módulo: ' + e.message);
    }
  };

  const handleDeleteModule = async () => {
      if (!editingModule) return;
      if (!window.confirm(`¿ELIMINAR el módulo "${editingModule.title}"?`)) return;
      try {
          await MockService.deleteModule(editingModule.id);
          const updatedModules = modules.filter(m => m.id !== editingModule.id);
          setModules(updatedModules);
          if (updatedModules.length > 0) { setEditingModule(updatedModules[0]); setCurrentModuleIndex(0); }
          else { setEditingModule(null); setCurrentModuleIndex(0); }
      } catch (e: any) {
          alert("Error eliminando: " + e.message);
      }
  };

  const handleAddTopic = () => {
      if (!editingModule) return;
      setEditingModule({ ...editingModule, topics: [...(editingModule.topics || []), { id: Date.now().toString(), title: '', videoUrl: '', summary: '' }] });
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
  };

  const handleRemoveResource = (index: number) => {
      if (!editingModule) return;
      const newRes = [...(editingModule.resources || [])];
      newRes.splice(index, 1);
      setEditingModule({...editingModule, resources: newRes});
  };
  
  const handleUploadLanding = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && appConfig) {
           setUploadingLanding(true);
           try {
               const url = await MockService.uploadFile(e.target.files[0]);
               setAppConfig({ ...appConfig, landingBackground: url });
           } catch (error: any) { alert(error.message); } finally { setUploadingLanding(false); }
      }
  };

  const handleUploadHero = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && appConfig) {
           setUploadingHero(true);
           try {
               const url = await MockService.uploadFile(e.target.files[0]);
               setAppConfig({ ...appConfig, heroImage: url });
           } catch (error: any) { alert(error.message); } finally { setUploadingHero(false); }
      }
  };

  // --- QUIZ MANAGEMENT LOGIC ---
  const handleAddQuestion = () => {
    if (!editingQuizModule) return;
    const newQ: Question = { id: Date.now().toString(), text: 'Nueva Pregunta', options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'], correctIndex: 0 };
    setEditingQuizModule({ ...editingQuizModule, questions: [...editingQuizModule.questions, newQ] });
  };

  const handleRemoveQuestion = (index: number) => {
      if (!editingQuizModule) return;
      const newQs = [...editingQuizModule.questions];
      newQs.splice(index, 1);
      setEditingQuizModule({ ...editingQuizModule, questions: newQs });
  };

  const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
      if (!editingQuizModule) return;
      const newQs = [...editingQuizModule.questions];
      newQs[index] = { ...newQs[index], [field]: value };
      setEditingQuizModule({ ...editingQuizModule, questions: newQs });
  };

  const handleQuestionOptionChange = (qIndex: number, optIndex: number, value: string) => {
      if (!editingQuizModule) return;
      const newQs = [...editingQuizModule.questions];
      const newOpts = [...newQs[qIndex].options];
      newOpts[optIndex] = value;
      newQs[qIndex] = { ...newQs[qIndex], options: newOpts };
      setEditingQuizModule({ ...editingQuizModule, questions: newQs });
  };

  // REQUERIMIENTO: Drag and Drop Logic
  const onDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const onDrop = (index: number) => {
    if (draggedItemIndex === null || !editingQuizModule) return;
    const newQuestions = [...editingQuizModule.questions];
    const draggedItem = newQuestions[draggedItemIndex];
    newQuestions.splice(draggedItemIndex, 1);
    newQuestions.splice(index, 0, draggedItem);
    setEditingQuizModule({ ...editingQuizModule, questions: newQuestions });
    setDraggedItemIndex(null);
  };

  const renderExamsView = () => {
    return (
        <div className="space-y-6">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                 <h3 className="font-bold text-gray-800 mb-4">Selecciona un Módulo para gestionar su examen</h3>
                 <div className="flex gap-4 overflow-x-auto pb-2">
                     {modules.map(m => (
                         <button 
                            key={m.id} 
                            onClick={() => setEditingQuizModule(m)}
                            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${editingQuizModule?.id === m.id ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                         >
                             {m.order}. {m.title}
                         </button>
                     ))}
                 </div>
             </div>

             {editingQuizModule && (
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                     <div className="flex justify-between items-center mb-6">
                         <div className="flex items-center">
                            <h3 className="font-bold text-lg text-gray-800 mr-4">Preguntas: {editingQuizModule.title}</h3>
                            <span className="text-xs text-indigo-500 font-bold bg-indigo-50 px-2 py-1 rounded flex items-center shadow-sm">
                                <GripVertical size={14} className="mr-1"/> Arrastra el icono para reordenar
                            </span>
                         </div>
                         <div className="flex gap-2">
                            <button 
                                onClick={handleAddQuestion}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium"
                            >
                                <Plus size={18} /> Agregar Pregunta
                            </button>
                         </div>
                     </div>

                     <div className="space-y-4">
                         {editingQuizModule.questions.length === 0 && (
                             <div className="text-center text-gray-400 py-8 border-2 border-dashed border-gray-200 rounded-lg">
                                 No hay preguntas configuradas.
                             </div>
                         )}
                         
                         {editingQuizModule.questions.map((q, idx) => (
                             <div 
                                key={q.id || idx} 
                                draggable
                                onDragStart={() => onDragStart(idx)}
                                onDragOver={(e) => onDragOver(e, idx)}
                                onDrop={() => onDrop(idx)}
                                className={`bg-gray-50 p-4 rounded-lg border border-gray-200 relative group transition-all duration-200 ${draggedItemIndex === idx ? 'opacity-30 border-indigo-500 shadow-inner scale-95' : 'hover:border-indigo-300'}`}
                             >
                                 <div className="flex gap-4">
                                     <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 py-2 hover:text-indigo-500 transition-colors">
                                         <GripVertical size={20}/>
                                     </div>
                                     <div className="flex-1">
                                         <div className="flex justify-between mb-3">
                                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pregunta {idx + 1}</label>
                                             <button onClick={() => handleRemoveQuestion(idx)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                         </div>
                                         <input 
                                            type="text" 
                                            value={q.text} 
                                            onChange={(e) => handleQuestionChange(idx, 'text', e.target.value)}
                                            className="w-full border-gray-300 rounded p-2 text-sm font-medium mb-3 focus:ring-1 focus:ring-indigo-500 transition-all"
                                         />
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                             {q.options.map((opt, optIdx) => (
                                                 <div key={optIdx} className="flex items-center gap-2">
                                                     <input 
                                                        type="radio" 
                                                        name={`correct-${q.id}`} 
                                                        checked={q.correctIndex === optIdx} 
                                                        onChange={() => handleQuestionChange(idx, 'correctIndex', optIdx)}
                                                        className="text-indigo-600 focus:ring-indigo-500"
                                                     />
                                                     <input 
                                                        type="text" 
                                                        value={opt} 
                                                        onChange={(e) => handleQuestionOptionChange(idx, optIdx, e.target.value)}
                                                        className={`flex-1 border-gray-300 rounded p-1.5 text-sm transition-colors ${q.correctIndex === optIdx ? 'bg-green-50 border-green-200 text-green-800' : ''}`}
                                                     />
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                 </div>
                             </div>
                         ))}
                     </div>

                     <div className="mt-6 flex justify-end">
                         <button 
                            onClick={() => handleSaveModule(editingQuizModule)}
                            className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-green-700 flex items-center transform active:scale-95 transition-all"
                         >
                             <Save className="mr-2" size={18}/> Guardar Examen
                         </button>
                     </div>
                 </div>
             )}
        </div>
    );
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  const renderStatsView = () => {
    const students = users.filter(u => u.role !== 'ADMIN');
    const totalCompletions = students.reduce((acc, s) => acc + (s.completedModules || []).length, 0);
    const readyForInPerson = students.filter(s => modules.length > 0 && (s.completedModules || []).length === modules.length).length;

    const completionStats = modules.map(m => ({
      name: `Módulo ${m.order}`,
      completados: students.filter(s => (s.completedModules || []).includes(m.id)).length,
      pendientes: students.length - students.filter(s => (s.completedModules || []).includes(m.id)).length
    }));

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center text-indigo-600 mb-2"><Users className="mr-2" /> <span className="font-bold">Total Catecúmenos</span></div>
            <p className="text-4xl font-bold text-gray-800">{students.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center text-green-600 mb-2"><Activity className="mr-2" /></div>
            <p className="text-gray-500 text-sm font-medium uppercase">Retención Global</p>
            <h3 className="text-3xl font-bold text-gray-800">{students.length > 0 && modules.length > 0 ? Math.round((totalCompletions / (students.length * modules.length)) * 100) : 0}%</h3>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center text-purple-600 mb-2"><UserCheck className="mr-2" /> <span className="font-bold">Confirmados Presencial</span></div>
            <p className="text-4xl font-bold text-gray-800">{readyForInPerson}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center text-orange-500 mb-2"><AlertTriangle className="mr-2" /> <span className="font-bold">Usuarios Estancados</span></div>
            <p className="text-4xl font-bold text-gray-800">{students.filter(s => (s.completedModules || []).length === 0).length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm"><h3 className="text-lg font-bold text-gray-800 mb-6">Progreso Global de la Clase</h3><div className="overflow-x-auto w-full"><BarChart width={800} height={300} data={completionStats}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="completados" fill="#4f46e5" name="Aprobados" /><Bar dataKey="pendientes" fill="#e5e7eb" name="Pendientes" /></BarChart></div></div>
      </div>
    );
  };
  
  const renderUsersView = () => { 
    const students = users.filter(u => u.role !== 'ADMIN');
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800">Directorio de Catecúmenos ({students.length})</h3>
          <div className="flex gap-2">
              <button onClick={handleExportExcel} className="px-3 py-1 bg-green-600 text-white rounded text-sm flex items-center hover:bg-green-700 shadow-sm"><FileSpreadsheet size={16} className="mr-1"/> Exportar Excel Full</button>
              <button onClick={handleExportPDF} className="px-3 py-1 bg-red-600 text-white rounded text-sm flex items-center hover:bg-red-700 shadow-sm"><FileText size={16} className="mr-1"/> PDF</button>
          </div>
        </div>
        <div className="p-0 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Promedio</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Estado Civil</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">WhatsApp</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Progreso</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {students.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-gray-900">{s.name}</div>
                                <div className="text-xs text-gray-400">{s.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${s.averageScore && s.averageScore >= 80 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                    {s.averageScore ? `${s.averageScore.toFixed(1)}%` : '-'}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                                {s.maritalStatus || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{s.phone || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(s.completedModules || []).length} / {modules.length}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => handleDeleteUser(s.id)} className="text-gray-300 hover:text-red-600 transition-colors"><Trash2 size={18}/></button></td>
                        </tr>
                    ))}
                    {students.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">No hay catecúmenos registrados.</td></tr>}
                </tbody>
            </table>
        </div>
      </div>
    );
  };
  
  const renderCalendarView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const emptySlots = Array.from({ length: new Date(year, month, 1).getDay() });
    const daysArray = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1);
    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingEvents = calendarEvents.filter(e => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date));
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                    <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-gray-200 rounded-full text-gray-600"><ChevronLeft /></button>
                    <div className="flex gap-2 items-center font-bold text-gray-800 uppercase tracking-widest">{monthNames[month]} {year}</div>
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
            <div className="bg-white rounded-xl shadow-sm border h-fit flex flex-col">
                <div className="p-6 border-b bg-gray-50"><h3 className="font-bold text-gray-800 flex items-center"><Calendar className="mr-2 text-indigo-600" size={20} /> Eventos Próximos</h3></div>
                <div className="p-0 overflow-y-auto max-h-[500px]">
                    {upcomingEvents.map(evt => (
                        <div key={evt.id} className="p-4 border-b hover:bg-gray-50 group relative">
                             <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleEditEvent(evt)} className="text-indigo-600"><Edit size={16}/></button><button onClick={() => handleDeleteEvent(evt.id)} className="text-red-600"><Trash2 size={16}/></button></div>
                             <div className="font-bold text-indigo-900 capitalize text-sm">{formatDateSpanish(evt.date)}</div>
                             <div className="text-gray-800 font-medium text-sm mt-1">{evt.location}</div>
                             <div className="text-xs text-gray-500 flex items-center gap-2 mt-1"><Clock size={12}/> {evt.time}</div>
                        </div>
                    ))}
                    {upcomingEvents.length === 0 && <div className="p-10 text-center text-gray-400 text-sm">Sin eventos.</div>}
                </div>
            </div>
            {showEventModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in-up">
                        <div className="bg-indigo-600 p-4 text-white flex justify-between items-center"><h3 className="font-bold">{editingEventId ? 'Editar' : 'Nuevo'}</h3><button onClick={() => setShowEventModal(false)}><X /></button></div>
                        <div className="p-6 space-y-4">
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha</label><input type="date" value={selectedDate || ''} onChange={e => setSelectedDate(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2" /></div>
                            <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Lugar</label><input type="text" value={evtLocation} onChange={e => setEvtLocation(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2" /></div>
                            <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Horario</label><input type="text" value={evtTime} onChange={e => setEvtTime(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2" /></div><div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Costo</label><input type="text" value={evtCost} onChange={e => setEvtCost(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2" /></div></div>
                            <div className="flex gap-3 pt-4"><button onClick={() => handleSaveEvent(false)} className="flex-1 bg-gray-100 py-2 rounded-lg font-bold">Guardar</button><button onClick={() => handleSaveEvent(true)} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold">Notificar</button></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  };

  const renderModulesView = () => {
    if (modules.length === 0 && !editingModule) return (<div className="text-center p-12 bg-white rounded-xl shadow"><button onClick={handleCreateNewModule} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Crear Primer Módulo</button></div>);
    if (!editingModule) return <div className="p-8 text-center">Cargando editor...</div>;

    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-4xl mx-auto flex flex-col min-h-[600px]">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
            <button onClick={handlePrevModule} className="p-2 rounded-full hover:bg-gray-200 text-gray-600"><ChevronLeft size={24} /></button>
            <div className="text-center"><h3 className="font-bold text-gray-800 text-lg">{editingModule.title}</h3><span className="text-xs text-gray-500 font-medium">Módulo {currentModuleIndex + 1} de {modules.length}</span></div>
            <div className="flex items-center gap-2">
                <button onClick={handleDeleteModule} className="p-2 text-red-500 hover:bg-red-50 rounded-full" title="Eliminar Módulo"><Trash2 size={20}/></button>
                <div className="h-6 w-px bg-gray-300 mx-2"></div>
                <button onClick={handleNextModule} className="p-2 rounded-full hover:bg-gray-200 text-gray-600 mr-2"><ChevronRight size={24} /></button>
                <button onClick={handleCreateNewModule} className="flex items-center gap-1 text-sm bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-200 font-medium"><Plus size={16} /> New</button>
            </div>
        </div>
        <div className="p-8 space-y-8 overflow-y-auto flex-1" key={editingModule.id}>
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1 space-y-4 w-full">
               <div><label className="block text-sm font-medium text-gray-700 mb-1">Título del Módulo</label><input type="text" value={editingModule.title} onChange={(e) => setEditingModule({...editingModule, title: e.target.value})} className="block w-full border-gray-300 rounded-md shadow-sm border p-2 focus:ring-indigo-500 focus:border-indigo-500"/></div>
               <div className="flex gap-4"><div className="w-24"><label className="block text-sm font-medium text-gray-700 mb-1">Orden</label><input type="number" value={editingModule.order} onChange={(e) => setEditingModule({...editingModule, order: parseInt(e.target.value)})} className="block w-full border-gray-300 rounded-md shadow-sm border p-2"/></div><div className="flex-1"><label className="block text-sm font-medium text-gray-700 mb-1">Objetivo</label><input type="text" value={editingModule.description} onChange={(e) => setEditingModule({...editingModule, description: e.target.value})} className="block w-full border-gray-300 rounded-md shadow-sm border p-2 text-sm"/></div></div>
            </div>
            <div className="w-full md:w-1/3 bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex flex-col justify-center"><label className="block text-sm font-bold text-indigo-800 mb-2 flex items-center"><FileText size={18} className="mr-2"/> Material PDF</label><input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".pdf" className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 mb-2"/>
               {selectedFile && <div className="text-xs text-green-700 flex items-center font-medium bg-green-50 p-1 rounded border border-green-100"><CheckCircle size={10} className="mr-1"/> Subir: {selectedFile.name}</div>}
               <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">{(editingModule.resources || []).map((res, idx) => (<div key={idx} className="flex justify-between items-center text-xs bg-white p-1.5 rounded border border-indigo-100 shadow-sm"><a href={res.url} target="_blank" rel="noreferrer" className="truncate flex-1 text-indigo-600 hover:underline mr-1">{res.name}</a><button onClick={() => handleRemoveResource(idx)} className="text-red-400 hover:text-red-600"><X size={12}/></button></div>))}</div>
            </div>
          </div>
          <div><div className="flex justify-between items-center mb-4"><h4 className="text-lg font-bold text-gray-800">Temas y Videos</h4><button onClick={handleAddTopic} className="text-indigo-600 font-medium text-sm flex items-center hover:text-indigo-800 bg-indigo-50 px-3 py-1 rounded-full"><Plus size={16} className="mr-1"/> Agregar Tema</button></div>
            <div className="space-y-4">
                {(editingModule.topics || []).map((topic, index) => (
                    <div key={topic.id || index} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 relative group hover:border-indigo-300 transition-colors">
                        <button onClick={() => handleRemoveTopic(index)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-5"><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Título del Tema</label><input type="text" value={topic.title} onChange={(e) => handleTopicChange(index, 'title', e.target.value)} className="w-full border-gray-300 rounded p-1.5 text-sm font-medium focus:ring-1 focus:ring-indigo-500"/></div>
                            <div className="md:col-span-7"><label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center"><Video size={12} className="mr-1"/> YouTube URL</label><input type="text" value={topic.videoUrl} onChange={(e) => handleTopicChange(index, 'videoUrl', e.target.value)} className="w-full border-gray-300 rounded p-1.5 text-sm text-gray-600 focus:ring-1 focus:ring-indigo-500" placeholder="https://youtube.com/..."/></div>
                            <div className="md:col-span-12"><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Resumen / Contenido</label><textarea value={topic.summary} onChange={(e) => handleTopicChange(index, 'summary', e.target.value)} className="w-full bg-gray-50 border-gray-200 rounded p-2 text-sm focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-colors" rows={2}/></div>
                        </div>
                    </div>
                ))}
            </div>
          </div>
          <div className="flex justify-end pt-6 border-t border-gray-100 sticky bottom-0 bg-white pb-2"><button onClick={() => handleSaveModule(editingModule)} disabled={uploadingFile} className="bg-green-600 text-white px-8 py-3 rounded-lg shadow-lg hover:bg-green-700 flex items-center font-bold disabled:opacity-70 transform hover:-translate-y-0.5 transition-all">{uploadingFile ? <><Upload className="animate-bounce mr-2"/> Subiendo PDF...</> : <><Save className="mr-2" /> Guardar Todo</>}</button></div>
        </div>
      </div>
    );
  };

  const renderNotificationsView = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><h3 className="font-bold text-gray-800 mb-4 flex items-center"><Megaphone className="mr-2 text-indigo-600"/> Enviar Comunicado Masivo</h3><form onSubmit={handleSendBroadcast} className="space-y-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Título</label><input type="text" value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} className="w-full border-gray-300 rounded-lg p-2" placeholder="Ej: Aviso Importante" required/></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label><textarea value={broadcastBody} onChange={e => setBroadcastBody(e.target.value)} rows={4} className="w-full border-gray-300 rounded-lg p-2" placeholder="Escribe tu mensaje aquí..." required/></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Importancia</label><select value={broadcastImportance} onChange={(e) => setBroadcastImportance(e.target.value as 'normal'|'high')} className="w-full border-gray-300 rounded-lg p-2 bg-white"><option value="normal">Normal</option><option value="high">Alta</option></select></div><button type="submit" disabled={sendingBroadcast} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold">{sendingBroadcast ? 'Enviando...' : 'Enviar a Todos'}</button></form></div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"><h3 className="font-bold text-gray-800 mb-4 flex items-center"><MessageSquare className="mr-2 text-indigo-600"/> Mensaje de Bienvenida</h3><textarea value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)} rows={3} className="w-full border-gray-300 rounded-lg p-2 text-sm" placeholder="Mensaje..."/><button onClick={handleSaveWelcomeMessage} disabled={savingWelcome} className="w-full bg-gray-800 text-white py-2 rounded-lg font-bold mt-2">{savingWelcome ? 'Guardando...' : 'Actualizar'}</button></div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border h-[600px] flex flex-col"><div className="p-6 border-b bg-gray-50"><h3 className="font-bold">Historial</h3></div><div className="flex-1 overflow-y-auto p-4 space-y-4">{broadcastHistory.map(b => (<div key={b.id} className="border p-4 rounded-lg hover:border-indigo-300 relative group bg-white shadow-sm"><div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => handleLoadBroadcastToForm(b)} className="text-gray-400 hover:text-indigo-600"><RefreshCw size={16}/></button><button onClick={() => handleDeleteBroadcast(b.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16}/></button></div><div className="flex justify-between mb-2"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${b.importance === 'high' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{b.importance === 'high' ? 'Alta' : 'Normal'}</span><span className="text-xs text-gray-400">{new Date(b.sentAt).toLocaleDateString()}</span></div><h4 className="font-bold text-gray-800">{b.title}</h4><p className="text-sm text-gray-600 mt-1">{b.body}</p></div>))}</div></div>
      </div>
    );
  };

  const renderTeamView = () => {
      return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                  <h3 className="font-bold text-gray-800 mb-6 flex items-center"><Shield className="mr-2 text-indigo-600"/> Invitar Nuevo Administrador</h3>
                  <form onSubmit={handleInviteAdmin} className="space-y-4">
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label><div className="relative"><UserCheck size={18} className="absolute left-3 top-2.5 text-gray-400"/><input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)} className="w-full pl-10 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500" required placeholder="Ej: Hno. Francisco"/></div></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label><div className="relative"><Send size={18} className="absolute left-3 top-2.5 text-gray-400"/><input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="w-full pl-10 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500" required placeholder="correo@institucion.org"/></div></div>
                      <div className="pt-2"><button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 flex justify-center items-center"><Plus size={18} className="mr-2"/> Enviar Invitación</button></div>
                  </form>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="p-6 border-b border-gray-100 bg-gray-50"><h3 className="font-bold text-gray-800">Equipo Actual</h3></div><div className="divide-y divide-gray-100">{admins.map(admin => (<div key={admin.id} className="p-4 flex items-center justify-between hover:bg-gray-50"><div className="flex items-center"><div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold mr-3">{admin.name.charAt(0)}</div><div><h4 className="font-bold text-gray-800 text-sm">{admin.name} {admin.isSuperAdmin && <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded ml-2">Super Admin</span>}</h4><p className="text-xs text-gray-500">{admin.email}</p></div></div><div className="flex items-center gap-2"><span className={`text-xs px-2 py-1 rounded font-bold ${admin.password ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{admin.password ? 'Activo' : 'Pendiente'}</span>{currentUser.isSuperAdmin && !admin.isSuperAdmin && (<button onClick={() => handleResetAdmin(admin.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"><RotateCcw size={16}/></button>)}</div></div>))}</div></div>
          </div>
      );
  };

  const renderSettingsView = () => {
      if (!appConfig) return <div>Cargando configuración...</div>;
      const SettingsCard = ({ title, icon: Icon, value, onChangeValue, onUpload, isUploading, fileInputRef, placeholder }: any) => (
         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <h4 className="font-bold text-gray-700 flex items-center mb-4 text-lg"><Icon className="mr-2 text-indigo-600" size={20}/> {title}</h4>
             <p className="text-sm text-gray-500 mb-6">{placeholder}</p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                     <div className="bg-gray-50 p-4 rounded-lg border border-gray-200"><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Opción A: Pegar URL</label><input type="text" value={value || ''} onChange={(e) => onChangeValue(e.target.value)} className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm w-full focus:ring-2 focus:ring-indigo-500" placeholder="https://ejemplo.com/imagen.jpg"/></div>
                     <div className="bg-gray-50 p-4 rounded-lg border border-gray-200"><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Opción B: Subir Archivo</label><button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-100 flex items-center justify-center shadow-sm">{isUploading ? 'Subiendo...' : <><Upload size={16} className="mr-2"/> Seleccionar Archivo</>}</button><input type="file" ref={fileInputRef} onChange={onUpload} accept="image/*" className="hidden"/></div>
                 </div>
                 <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Vista Previa</label><div className="relative group overflow-hidden rounded-lg border-2 border-gray-200 bg-gray-100 flex items-center justify-center aspect-video shadow-inner">{value ? <img src={value} className="w-full h-full object-cover"/> : <ImageIcon size={32} className="text-gray-300"/>}</div></div>
             </div>
         </div>
      );
      return (
          <div className="max-w-5xl mx-auto space-y-8"><h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center pb-2 border-b"><Settings className="mr-3"/> Configuración General</h3><SettingsCard title="Pantalla de Login" icon={Monitor} value={appConfig.landingBackground} onChangeValue={(val: string) => setAppConfig({...appConfig, landingBackground: val})} onUpload={handleUploadLanding} isUploading={uploadingLanding} fileInputRef={landingImageFileRef} placeholder="Fondo que ven los usuarios al iniciar sesión."/><SettingsCard title="Banner Dashboard" icon={LayoutIcon} value={appConfig.heroImage} onChangeValue={(val: string) => setAppConfig({...appConfig, heroImage: val})} onUpload={handleUploadHero} isUploading={uploadingHero} fileInputRef={heroImageFileRef} placeholder="Banner superior que ven los alumnos al ingresar."/><div className="flex justify-end pt-4"><button onClick={handleSaveConfig} className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-indigo-700 flex items-center"><Save size={18} className="mr-2"/> Guardar Configuración</button></div></div>
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
