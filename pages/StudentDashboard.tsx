
import React, { useState, useEffect } from 'react';
import { User, Module, Topic } from '../types';
import { MockService } from '../services/mockDb';
import { PlayCircle, CheckCircle, Lock, BookOpen, Video, FileText, Download, User as UserIcon, Save, ChevronDown, CheckSquare, Square, MapPin, Phone, Calendar, Mail, ExternalLink, Heart } from 'lucide-react';
import { Quiz } from './Quiz';

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

  useEffect(() => {
    const loadData = async () => {
      const m = await MockService.getModules();
      setModules(m.sort((a, b) => a.order - b.order));
      setConfig(MockService.getAppConfig());
    };
    loadData();
  }, []);

  // Initialize profile data when user enters or user prop updates
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

  const isModuleLocked = (mod: Module) => {
    // Logic: Locked if previous module not completed (unless it's the first one)
    if (mod.order === 1) return false;
    const previousMod = modules.find(m => m.order === mod.order - 1);
    if (!previousMod) return false;
    return !user.completedModules.includes(previousMod.id);
  };

  const isModuleCompleted = (mod: Module) => user.completedModules.includes(mod.id);

  // Determine if all modules are complete for Face-to-Face access
  const allModulesComplete = modules.length > 0 && modules.every(m => user.completedModules.includes(m.id));

  // --- Profile Handlers ---
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

  // --- Views ---

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
                       {/* Read Only Email */}
                      <div className="opacity-60">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico (No editable)</label>
                          <div className="relative">
                                <Mail size={18} className="absolute left-3 top-2.5 text-gray-400"/>
                                <input 
                                    type="text" 
                                    value={user.email} 
                                    disabled 
                                    className="w-full pl-10 border border-gray-300 rounded-lg p-2 bg-gray-50 cursor-not-allowed"
                                />
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                          <div className="relative">
                                <UserIcon size={18} className="absolute left-3 top-2.5 text-gray-400"/>
                                <input 
                                    type="text" 
                                    value={profileData.name} 
                                    onChange={e => setProfileData({...profileData, name: e.target.value})}
                                    className="w-full pl-10 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Edad</label>
                              <div className="relative">
                                    <Calendar size={18} className="absolute left-3 top-2.5 text-gray-400"/>
                                    <input 
                                        type="number" 
                                        value={profileData.age} 
                                        onChange={e => setProfileData({...profileData, age: parseInt(e.target.value)})}
                                        className="w-full pl-10 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                        required
                                        min={18}
                                        max={99}
                                    />
                              </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estado Civil</label>
                            <div className="relative">
                                <Heart size={18} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
                                <select 
                                    value={profileData.maritalStatus} 
                                    onChange={(e) => setProfileData({...profileData, maritalStatus: e.target.value})}
                                    className="w-full pl-10 pr-8 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                                >
                                    {MARITAL_STATUS_OPTIONS.map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                      </div>
                      
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Lugar de Nacimiento</label>
                          <div className="relative">
                                <MapPin size={18} className="absolute left-3 top-2.5 text-gray-400"/>
                                <input 
                                    type="text" 
                                    value={profileData.birthPlace} 
                                    onChange={e => setProfileData({...profileData, birthPlace: e.target.value})}
                                    className="w-full pl-10 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                />
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (WhatsApp)</label>
                          <div className="relative">
                                <Phone size={18} className="absolute left-3 top-2.5 text-gray-400"/>
                                <input 
                                    type="tel" 
                                    value={profileData.phone} 
                                    onChange={e => setProfileData({...profileData, phone: e.target.value})}
                                    className="w-full pl-10 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Actual</label>
                          <textarea 
                              value={profileData.address} 
                              onChange={e => setProfileData({...profileData, address: e.target.value})}
                              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
                          />
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sacramentos a Realizar</label>
                        <div className="relative">
                            <button
                            type="button"
                            onClick={() => setSacramentListOpen(!isSacramentListOpen)}
                            className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 flex items-center justify-between text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                            <span className="block truncate text-sm text-gray-900">
                                {profileData.sacraments.length > 0 
                                ? `${profileData.sacraments.length} seleccionado(s)` 
                                : 'Seleccionar...'}
                            </span>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform ${isSacramentListOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isSacramentListOpen && (
                            <div className="absolute mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto sm:text-sm z-50 border border-gray-200">
                                {AVAILABLE_SACRAMENTS.map((sac) => {
                                const isSelected = profileData.sacraments.includes(sac);
                                return (
                                    <div 
                                    key={sac}
                                    onClick={() => toggleSacrament(sac)}
                                    className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-50 flex items-center"
                                    >
                                    <div className={`mr-3 ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`}>
                                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                    </div>
                                    <span className={`block truncate ${isSelected ? 'font-semibold text-indigo-900' : 'font-normal text-gray-900'}`}>
                                        {sac}
                                    </span>
                                    </div>
                                );
                                })}
                            </div>
                            )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                            {profileData.sacraments.map(s => (
                            <span key={s} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                                {s}
                            </span>
                            ))}
                        </div>
                      </div>

                      <div className="flex justify-end pt-4">
                          <button 
                              type="submit" 
                              disabled={savingProfile}
                              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium shadow hover:bg-indigo-700 flex items-center disabled:opacity-70"
                          >
                              {savingProfile ? 'Guardando...' : <><Save size={18} className="mr-2"/> Guardar Cambios</>}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      </div>
  );

  const renderDashboard = () => {
    if (activeModule) {
        if (takingQuiz) {
        return (
            <Quiz 
            module={activeModule} 
            userId={user.id} 
            onCancel={() => setTakingQuiz(false)}
            onComplete={(passed) => {
                setTakingQuiz(false);
                if (passed) setActiveModule(null); // Return to dashboard
                // Could force reload user here to update UI lock states
                window.location.reload(); 
            }}
            />
        );
        }

        return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-5xl mx-auto">
            {/* Module Content View */}
            <div className="p-8">
            <button onClick={() => setActiveModule(null)} className="text-sm text-gray-500 mb-6 hover:underline flex items-center">
                ← Volver al tablero
            </button>
            
            <div className="mb-8 border-b pb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 px-2 py-1 rounded">
                    Módulo {activeModule.order}
                </span>
                <h2 className="text-3xl font-bold text-gray-900 mt-2">{activeModule.title}</h2>
                <p className="text-lg text-gray-600 mt-2">{activeModule.description}</p>
            </div>
            
            {/* RESOURCES DOWNLOAD SECTION */}
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

            {/* TOPICS LIST (NO EMBED) */}
            <div className="space-y-6 mb-12">
                {(activeModule.topics || []).map((topic, idx) => (
                    <div key={idx} className="bg-white border-b border-gray-100 pb-6 last:border-0">
                        <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
                            <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3 font-bold flex-shrink-0">{idx + 1}</span>
                            {topic.title}
                        </h3>
                        
                        {topic.videoUrl && (
                            <div className="ml-11 mb-3">
                                <a 
                                    href={topic.videoUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-red-600 font-medium hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-sm border border-red-100 group"
                                >
                                    <ExternalLink size={16} className="mr-2" />
                                    ▶ Ver video en YouTube
                                </a>
                            </div>
                        )}

                        <div className="ml-11 text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-lg text-sm border-l-4 border-gray-300">
                            {topic.summary || "Sin resumen disponible."}
                        </div>
                    </div>
                ))}
                {(activeModule.topics || []).length === 0 && (
                    <div className="text-center text-gray-400 py-8">No hay temas cargados en este módulo.</div>
                )}
            </div>

            <div className="flex justify-center border-t pt-8">
                <button
                onClick={() => setTakingQuiz(true)}
                className="bg-indigo-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:bg-indigo-700 transform hover:scale-105 transition-all flex items-center"
                >
                <PlayCircle className="mr-2" />
                Realizar Examen del Módulo
                </button>
            </div>
            </div>
        </div>
        );
    }

    return (
        <div className="space-y-8">
        {/* Hero Section */}
        <div 
            className="h-64 rounded-2xl bg-cover bg-center shadow-md relative flex items-end overflow-hidden"
            style={{ backgroundImage: `url(${config.heroImage || 'https://picsum.photos/1200/400'})` }}
        >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
            <div className="relative z-10 p-8 text-white">
            <h1 className="text-3xl font-bold">Bienvenido, {user.name}</h1>
            <p className="opacity-90 mt-2">Continúa tu camino de fe. Tu progreso: {Math.round((user.completedModules.length / Math.max(modules.length, 1)) * 100)}%</p>
            </div>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modules.map((mod) => {
            const locked = isModuleLocked(mod);
            const completed = isModuleCompleted(mod);
            
            return (
                <div 
                key={mod.id}
                className={`
                    relative bg-white rounded-xl p-6 shadow-sm border-2 transition-all
                    ${locked ? 'border-gray-100 opacity-70 grayscale' : 'border-transparent hover:shadow-md hover:border-indigo-100'}
                    ${completed ? 'border-green-100' : ''}
                `}
                >
                <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 px-2 py-1 rounded">
                    Módulo {mod.order}
                    </span>
                    {completed ? (
                    <CheckCircle className="text-green-500" />
                    ) : locked ? (
                    <Lock className="text-gray-400" />
                    ) : (
                    <div className="h-6 w-6 rounded-full border-2 border-indigo-500"></div>
                    )}
                </div>
                
                <h3 className="text-xl font-bold text-gray-800 mb-2">{mod.title}</h3>
                <p className="text-gray-500 text-sm mb-6 h-10 overflow-hidden">{mod.description}</p>
                
                <button
                    disabled={locked}
                    onClick={() => setActiveModule(mod)}
                    className={`
                    w-full py-2 rounded-lg font-medium transition-colors flex justify-center items-center
                    ${locked ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}
                    ${completed ? 'bg-green-50 text-green-700 hover:bg-green-100' : ''}
                    `}
                >
                    {locked ? 'Bloqueado' : completed ? 'Repasar Módulo' : 'Comenzar'}
                </button>
                </div>
            );
            })}
        </div>

        {/* Face to Face Integration Pass */}
        {allModulesComplete && (
            <div className="bg-gradient-to-r from-yellow-100 to-orange-50 border border-yellow-200 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between shadow-sm">
            <div className="mb-4 md:mb-0">
                <h3 className="text-xl font-bold text-yellow-800">🎉 ¡Formación Teórica Completada!</h3>
                <p className="text-yellow-700 text-sm mt-1">Has desbloqueado tu Pase de Asistencia para las sesiones presenciales.</p>
            </div>
            <button className="bg-yellow-500 text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-yellow-600 transition-transform hover:-translate-y-1">
                Descargar Pase QR
            </button>
            </div>
        )}
        </div>
    );
  };

  return (
      <div>
          {view === 'profile' ? renderProfile() : renderDashboard()}
      </div>
  );
};
