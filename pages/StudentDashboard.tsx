import React, { useState, useEffect } from 'react';
import { User, Module } from '../types';
// Asegúrate de que esta ruta sea la correcta en tu proyecto
import { SupabaseService as MockService } from '../services/supabase';
import { Lock, CheckCircle, PlayCircle, Video, FileText, User as UserIcon, BookOpen, Download, ExternalLink } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Quiz } from './Quiz';

interface Props {
  user: User;
  view: string;
  onUserUpdate: (u: User) => void;
}

export const StudentDashboard: React.FC<Props> = ({ user, view, onUserUpdate }) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [takingQuiz, setTakingQuiz] = useState(false);
  
  // --- PERFIL BLINDADO ---
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    age: user?.age || 0,
    maritalStatus: user?.maritalStatus || 'Soltero',
    birthPlace: user?.birthPlace || '',
    phone: user?.phone || '',
    address: user?.address || '',
    sacraments: Array.isArray(user?.sacramentTypes) ? user.sacramentTypes : []
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');

  // Cargar módulos
  useEffect(() => {
    const loadModules = async () => {
      try {
        const m = await MockService.getModules();
        setModules(Array.isArray(m) ? m : []);
      } catch (error) {
        console.error("Error loading modules", error);
        setModules([]);
      }
    };
    loadModules();
  }, []);

  // --- CORRECCIÓN CRÍTICA DE LA GRÁFICA ---
  // Nos aseguramos de que completedIds sea siempre un array
  const completedIds = Array.isArray(user?.completedModules) ? user.completedModules : [];
  const completedCount = completedIds.length;
  // Si modules no ha cargado, asumimos 1 para evitar división por cero
  const totalModules = modules.length > 0 ? modules.length : 1; 
  const percentage = Math.round((completedCount / totalModules) * 100);

  // Datos seguros para Recharts
  const chartData = [
    { name: 'Completado', value: completedCount },
    { name: 'Pendiente', value: Math.max(0, modules.length - completedCount) },
  ];
  // Si todo es cero, ponemos un valor dummy para que no falle el render
  if (chartData[0].value === 0 && chartData[1].value === 0) {
      chartData[1].value = 1; 
  }

  const COLORS = ['#10B981', '#E5E7EB'];

  // --- MANEJADORES ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess('');

    try {
      const updatedUser: User = {
        ...user,
        name: profileData.name,
        age: Number(profileData.age),
        maritalStatus: profileData.maritalStatus,
        birthPlace: profileData.birthPlace,
        phone: profileData.phone,
        address: profileData.address,
        sacramentTypes: profileData.sacraments
      };

      const result = await MockService.updateUser(updatedUser);
      onUserUpdate(result);
      setProfileSuccess('Datos actualizados correctamente');
    } catch (error) {
      console.error(error);
    } finally {
      setSavingProfile(false);
    }
  };

  // --- VISTAS ---

  if (view === 'profile') {
    return (
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
            <UserIcon className="mr-2" /> Mi Perfil
        </h2>
        {profileSuccess && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
                {profileSuccess}
            </div>
        )}
        <form onSubmit={handleSaveProfile} className="space-y-6">
            {/* Formulario de perfil seguro */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                    <input type="text" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} className="w-full p-2 border rounded-md" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Edad</label>
                    <input type="number" min="15" max="99" value={profileData.age} onChange={e => setProfileData({...profileData, age: Number(e.target.value)})} className="w-full p-2 border rounded-md" />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado Civil (No editable)</label>
                    <div className="w-full p-2 border bg-gray-50 text-gray-500 rounded-md">
                        {profileData.maritalStatus}
                    </div>
                 </div>
                 <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input type="tel" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} className="w-full p-2 border rounded-md" />
                 </div>
            </div>
            <button disabled={savingProfile} className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-bold">
                {savingProfile ? 'Guardando...' : 'Guardar Cambios'}
            </button>
        </form>
      </div>
    );
  }

  if (activeModule) {
    if (takingQuiz) {
        return (
            <Quiz 
            module={activeModule} 
            userId={user.id} 
            onCancel={() => setTakingQuiz(false)}
            onComplete={(passed) => {
                setTakingQuiz(false);
                if (passed) setActiveModule(null);
                window.location.reload(); 
            }}
            />
        );
    }
    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-5xl mx-auto">
            <div className="p-8">
            <button onClick={() => setActiveModule(null)} className="text-sm text-gray-500 mb-6 hover:underline flex items-center">← Volver</button>
            <h2 className="text-3xl font-bold text-gray-900 mt-2">{activeModule.title}</h2>
            
            <div className="space-y-6 mt-8 mb-12">
                {activeModule.topics?.map((topic, idx) => (
                    <div key={idx} className="bg-white border-b border-gray-100 pb-6 last:border-0">
                        <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
                            <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 font-bold">{idx + 1}</span>
                            {topic.title}
                        </h3>
                        {topic.videoUrl && (
                            <div className="ml-11 mb-3">
                                <a href={topic.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-red-600 font-medium hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                                    <ExternalLink size={16} className="mr-2" /> ▶ Ver video en YouTube
                                </a>
                            </div>
                        )}
                        <div className="ml-11 text-gray-600 bg-gray-50 p-4 rounded-lg text-sm border-l-4 border-gray-300">
                            {topic.summary || "Sin resumen."}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-center border-t pt-8">
                <button onClick={() => setTakingQuiz(true)} className="bg-indigo-600 text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-indigo-700 flex items-center">
                <PlayCircle className="mr-2" /> Realizar Examen
                </button>
            </div>
            </div>
        </div>
    );
  }

  // VISTA DASHBOARD PRINCIPAL
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hola, {user?.name}</h2>
          <p className="text-gray-500 mt-1">
             {percentage === 100 
                ? "¡Felicidades! Has completado tu formación." 
                : `Has completado el ${percentage}% del curso.`}
          </p>
        </div>
        <div className="h-32 w-32 mt-4 md:mt-0">
          <ResponsiveContainer width="100%" height="100%">
            {/* Aquí es donde fallaba antes. Ahora está protegido */}
            <PieChart>
              <Pie data={chartData} innerRadius={25} outerRadius={40} paddingAngle={5} dataKey="value">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <h3 className="text-xl font-bold text-gray-800 mt-8 mb-4">Módulos de Aprendizaje</h3>
      <div className="space-y-4">
        {modules.map((mod, index) => {
          const isCompleted = completedIds.includes(mod.id);
          const prevModule = index > 0 ? modules[index - 1] : null;
          const isLocked = index > 0 && prevModule && !completedIds.includes(prevModule.id);
          
          return (
            <div key={mod.id} className={`relative bg-white rounded-lg shadow-sm border p-6 transition-all ${isLocked ? 'opacity-75 bg-gray-50' : 'hover:shadow-md'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold tracking-wide uppercase text-indigo-600">Módulo {mod.order}</span>
                    {isCompleted && <CheckCircle size={16} className="text-green-500" />}
                    {isLocked && <Lock size={16} className="text-gray-400" />}
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mt-1">{mod.title}</h4>
                  <p className="text-gray-600 text-sm mt-2">{mod.description}</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <div className="flex space-x-4 text-sm text-gray-500">
                   <span className="flex items-center"><Video size={14} className="mr-1"/> Multimedia</span>
                   <span className="flex items-center"><FileText size={14} className="mr-1"/> Examen</span>
                </div>
                
                <button 
                  disabled={isLocked}
                  onClick={() => setActiveModule(mod)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    isLocked 
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                      : isCompleted 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isLocked ? 'Bloqueado' : isCompleted ? 'Repasar' : 'Comenzar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
