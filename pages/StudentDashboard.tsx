import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Module } from '../types';
import { MockService } from '../services/mockDb';
import { Lock, CheckCircle, PlayCircle, Video, FileText, User as UserIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Props {
  user: User;
  view: string;
  onUserUpdate: (u: User) => void;
}

export const StudentDashboard: React.FC<Props> = ({ user, view, onUserUpdate }) => {
  const [modules, setModules] = useState<Module[]>([]);
  
  // --- ESTADO PARA PERFIL ---
  const [profileData, setProfileData] = useState({
    name: user.name || '',
    age: user.age || 0,
    maritalStatus: user.maritalStatus || 'Soltero',
    birthPlace: user.birthPlace || '',
    phone: user.phone || '',
    address: user.address || '',
    sacraments: user.sacramentTypes || []
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');

  // Cargar módulos al iniciar
  useEffect(() => {
    const loadModules = async () => {
      const m = await MockService.getModules();
      setModules(m);
    };
    loadModules();
  }, []);

  // --- LÓGICA DE PROGRESO (CORREGIDA PARA SUPABASE) ---
  // Ahora leemos directo del usuario, no de un "contexto" externo
  const completedIds = user.completedModules || []; 
  const completedCount = completedIds.length;
  const totalModules = modules.length;
  // Evitamos división por cero si aún no cargan los módulos
  const percentage = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;

  const chartData = [
    { name: 'Completado', value: completedCount },
    { name: 'Pendiente', value: (totalModules - completedCount) > 0 ? (totalModules - completedCount) : 1 }, // El 1 es para que no se rompa la gráfica si es 0
  ];
  const COLORS = ['#10B981', '#E5E7EB'];

  // --- MANEJADORES DE PERFIL ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess('');

    try {
      const updatedUser: User = {
        ...user,
        name: profileData.name,
        age: Number(profileData.age),
        maritalStatus: profileData.maritalStatus, // No editable visualmente pero lo mantenemos
        birthPlace: profileData.birthPlace,
        phone: profileData.phone,
        address: profileData.address,
        sacramentTypes: profileData.sacraments
      };

      const result = await MockService.updateUser(updatedUser);
      onUserUpdate(result); // Actualizamos la App principal
      setProfileSuccess('Datos actualizados correctamente');
    } catch (error) {
      console.error(error);
    } finally {
      setSavingProfile(false);
    }
  };

  // --- RENDERIZADO CONDICIONAL ---

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Nombre - Editable */}
                 <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                    <input type="text" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} className="w-full p-2 border rounded-md" />
                 </div>

                 {/* Edad - Editable */}
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Edad</label>
                    <input type="number" min="15" max="99" value={profileData.age} onChange={e => setProfileData({...profileData, age: Number(e.target.value)})} className="w-full p-2 border rounded-md" />
                 </div>

                 {/* Estado Civil - Solo Lectura */}
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado Civil (No editable)</label>
                    <div className="w-full p-2 border bg-gray-50 text-gray-500 rounded-md">
                        {profileData.maritalStatus}
                    </div>
                 </div>

                 {/* Contacto */}
                 <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (WhatsApp)</label>
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

  // --- VISTA DASHBOARD (CURSOS) ---
  return (
    <div className="space-y-6">
      {/* Tarjeta de Bienvenida y Progreso */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hola, {user.name}</h2>
          <p className="text-gray-500 mt-1">
             {percentage === 100 
                ? "¡Felicidades! Has completado tu formación." 
                : `Has completado el ${percentage}% del curso.`}
          </p>
        </div>
        <div className="h-32 w-32 mt-4 md:mt-0">
          <ResponsiveContainer width="100%" height="100%">
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
        {modules.length === 0 && <p className="text-gray-400">Cargando módulos...</p>}
        
        {modules.map((mod, index) => {
          const isCompleted = completedIds.includes(mod.id);
          // Regla: El primer módulo siempre abierto. Los demás requieren que el anterior esté completado.
          const prevModule = index > 0 ? modules[index - 1] : null;
          const isLocked = index > 0 && prevModule && !completedIds.includes(prevModule.id);
          
          return (
             <ModuleCard key={mod.id} module={mod} isLocked={isLocked} isCompleted={isCompleted} />
          );
        })}
      </div>
    </div>
  );
};

// Componente Tarjeta de Módulo
const ModuleCard: React.FC<{ module: Module, isLocked: boolean, isCompleted: boolean }> = ({ module, isLocked, isCompleted }) => {
  const navigate = useNavigate();
  return (
    <div className={`relative bg-white rounded-lg shadow-sm border p-6 transition-all ${isLocked ? 'opacity-75 bg-gray-50' : 'hover:shadow-md'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold tracking-wide uppercase text-indigo-600">Módulo {module.order}</span>
            {isCompleted && <CheckCircle size={16} className="text-green-500" />}
            {isLocked && <Lock size={16} className="text-gray-400" />}
          </div>
          <h4 className="text-lg font-bold text-gray-900 mt-1">{module.title}</h4>
          <p className="text-gray-600 text-sm mt-2">{module.description}</p>
        </div>
        {module.imageUrl && (
          <img src={module.imageUrl} alt={module.title} className="w-24 h-16 object-cover rounded ml-4 bg-gray-200" />
        )}
      </div>
      
      <div className="mt-4 pt-4 border-t flex justify-between items-center">
        <div className="flex space-x-4 text-sm text-gray-500">
           <span className="flex items-center"><Video size={14} className="mr-1"/> Multimedia</span>
           <span className="flex items-center"><FileText size={14} className="mr-1"/> Examen</span>
        </div>
        
        <button 
          disabled={isLocked}
          onClick={() => navigate(`/student/module/${module.id}`)}
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
};
