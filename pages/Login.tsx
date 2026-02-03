
import React, { useState, useEffect } from 'react';
import { SupabaseService as MockService } from '../services/supabase';
import { User, AppConfig } from '../types';
import { Lock, User as UserIcon, MapPin, Phone, Calendar, Mail, ChevronDown, CheckSquare, Square, ShieldCheck, BookOpen, ArrowRight, ArrowLeft, Heart, Sun } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
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

const InputField = ({ label, type = "text", value, onChange, icon: Icon, required = false, placeholder = "", min, max }: any) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon size={18} className="text-gray-400" />
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white/50 text-gray-900 placeholder-gray-500 caret-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out backdrop-blur-sm"
      />
    </div>
  </div>
);

type LoginView = 'LANDING' | 'STUDENT_AUTH' | 'ADMIN_EMAIL' | 'ADMIN_SETUP' | 'ADMIN_LOGIN';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [currentView, setCurrentView] = useState<LoginView>('LANDING');
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      const c = await MockService.getAppConfig();
      setConfig(c);
    };
    loadConfig();
  }, []);
  
  // Admin Flow State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminPassConfirm, setAdminPassConfirm] = useState('');
  
  // Student Flow State
  const [isRegistering, setIsRegistering] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPass, setStudentPass] = useState('');
  const [studentPassConfirm, setStudentPassConfirm] = useState('');
  
  // Registration Data
  const [fullName, setFullName] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  
  const [age, setAge] = useState<number>(18);
  const [maritalStatus, setMaritalStatus] = useState('Soltero');

  const [selectedSacraments, setSelectedSacraments] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [isSacramentListOpen, setSacramentListOpen] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleSacrament = (sacrament: string) => {
    setSelectedSacraments(prev => 
      prev.includes(sacrament) 
        ? prev.filter(s => s !== sacrament)
        : [...prev, sacrament]
    );
  };

  const handleAdminEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await MockService.checkAdminStatus(adminEmail);
      if (result.status === 'NOT_FOUND') {
        throw new Error('Este correo no está autorizado como administrador.');
      } else if (result.status === 'NEEDS_SETUP') {
        setAdminName(result.name || '');
        setCurrentView('ADMIN_SETUP');
      } else {
        setAdminName(result.name || '');
        setCurrentView('ADMIN_LOGIN');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPass !== adminPassConfirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      const user = await MockService.setupAdminPassword(adminEmail, adminPass);
      onLogin(user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await MockService.loginAdmin(adminEmail, adminPass);
      onLogin(user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegistering) {
        // REQUERIMIENTO: Validación frontend con campos actualizados (age, maritalStatus)
        if (!fullName || !studentEmail || !studentPass || !studentPassConfirm || !age || !maritalStatus || !phone || !address) {
          throw new Error('Por favor completa todos los campos obligatorios (*)');
        }
        
        // REQUERIMIENTO: Validación explícita de coincidencia de contraseña
        if (studentPass !== studentPassConfirm) {
           throw new Error('Las contraseñas no coinciden');
        }

        if (selectedSacraments.length === 0) {
          throw new Error('Debes seleccionar al menos un sacramento para tu formación');
        }

        const newUser = await MockService.register({
          name: fullName,
          email: studentEmail,
          password: studentPass,
          birthPlace,
          age: age,
          maritalStatus: maritalStatus,
          sacramentTypes: selectedSacraments,
          address,
          phone
        });
        onLogin(newUser);
      } else {
        const user = await MockService.loginStudent(studentEmail, studentPass);
        if (user) {
          onLogin(user);
        } else {
          throw new Error('Credenciales incorrectas o estudiante no encontrado.');
        }
      }
    } catch (err: any) {
      // REQUERIMIENTO: Reporte de errores real para el usuario y logs técnicos
      console.error("Authentication/Registration failure:", err);
      setError(err.message || 'Ocurrió un error al intentar procesar tu solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const renderLanding = () => (
    <div className="flex flex-col items-center w-full max-w-6xl relative z-10 px-4">
      {/* Header Conceptual */}
      <div className="mb-12 text-center">
         <div className="inline-flex items-center justify-center p-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-4 shadow-lg">
             <Sun className="text-yellow-300 mr-2" size={24}/>
             <span className="text-white font-medium tracking-wider text-sm uppercase">Provincia de México</span>
         </div>
         <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4 drop-shadow-2xl tracking-tight leading-tight">
            Catecismo Virtual
         </h1>
         <p className="text-xl md:text-2xl text-white/90 font-light tracking-wide font-sans drop-shadow-md">
            Franciscanos TOR
         </p>
      </div>
      
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {/* Student Option */}
        <div 
          onClick={() => setCurrentView('STUDENT_AUTH')}
          className="group relative overflow-hidden bg-white/90 backdrop-blur-md p-8 md:p-10 rounded-2xl border border-white/50 shadow-2xl hover:shadow-[0_20px_50px_rgba(79,70,229,0.3)] hover:-translate-y-1 transition-all duration-300 cursor-pointer text-center"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-purple-500"></div>
          
          <div className="w-20 h-20 mx-auto bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-inner">
            <BookOpen size={40} />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Soy Catecúmeno</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Inicia o continúa tu formación espiritual. Accede a tus lecciones y exámenes.
          </p>
          
          <div className="flex items-center justify-center text-indigo-700 font-bold group-hover:text-indigo-600">
            Ingresar al Portal <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform"/>
          </div>
        </div>

        {/* Admin Option */}
        <div 
          onClick={() => setCurrentView('ADMIN_EMAIL')}
          className="group relative overflow-hidden bg-white/90 backdrop-blur-md p-8 md:p-10 rounded-2xl border border-white/50 shadow-2xl hover:shadow-[0_20px_50px_rgba(55,65,81,0.3)] hover:-translate-y-1 transition-all duration-300 cursor-pointer text-center"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-600 to-gray-900"></div>
          
          <div className="w-20 h-20 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center text-gray-700 mb-6 group-hover:scale-110 group-hover:bg-gray-800 group-hover:text-white transition-all duration-300 shadow-inner">
            <ShieldCheck size={40} />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Soy Administrador</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Gestión pastoral, supervisión de alumnos y administración de contenidos.
          </p>
          
          <div className="flex items-center justify-center text-gray-800 font-bold">
            Acceso Coordinación <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform"/>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdminFlow = () => (
    <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden my-8 relative z-10 border border-white/50 animate-fade-in-up">
      <button 
        onClick={() => { setError(''); setCurrentView('LANDING'); setAdminEmail(''); setAdminPass(''); setAdminPassConfirm(''); }} 
        className="absolute top-4 left-4 text-gray-400 hover:text-gray-700 transition-colors z-20"
      >
        <ArrowLeft size={24} />
      </button>

      <div className="bg-gray-900 px-8 py-8 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-white/5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
        <ShieldCheck size={48} className="mx-auto text-gray-400 mb-4 relative z-10" />
        <h2 className="text-2xl font-bold tracking-tight relative z-10">Acceso Administrativo</h2>
        <p className="mt-2 text-gray-400 text-sm relative z-10">Zona restringida para catequistas</p>
      </div>

      <div className="px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-700 rounded shadow-sm">
            <p className="font-medium">Error de acceso</p>
            <p>{error}</p>
          </div>
        )}

        {currentView === 'ADMIN_EMAIL' && (
          <form onSubmit={handleAdminEmailSubmit} className="space-y-4">
            <p className="text-sm text-gray-600 mb-4 text-center leading-relaxed">Ingresa tu correo institucional autorizado para verificar tus credenciales.</p>
            <InputField label="Correo Institucional" type="email" value={adminEmail} onChange={setAdminEmail} icon={Mail} required placeholder="nombre@ordenfranciscana.org" />
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-all transform active:scale-95"
            >
              {loading ? 'Verificando...' : 'Continuar'}
            </button>
          </form>
        )}

        {currentView === 'ADMIN_SETUP' && (
          <form onSubmit={handleAdminSetup} className="space-y-4">
             <div className="mb-6 text-center">
                <div className="inline-block p-3 bg-green-100 rounded-full text-green-600 mb-3 shadow-sm">
                   <ShieldCheck size={28} />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Bienvenido, {adminName}</h3>
                <p className="text-sm text-gray-500">Es tu primer ingreso. Configura una contraseña segura.</p>
             </div>
             
             <InputField label="Nueva Contraseña" type="password" value={adminPass} onChange={setAdminPass} icon={Lock} required />
             <InputField label="Confirmar Contraseña" type="password" value={adminPassConfirm} onChange={setAdminPassConfirm} icon={Lock} required />
             
             <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all mt-2"
            >
              {loading ? 'Configurando...' : 'Activar Cuenta'}
            </button>
          </form>
        )}

        {currentView === 'ADMIN_LOGIN' && (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="mb-8 text-center bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-600 shadow-md border border-gray-100">
                <UserIcon size={28} />
              </div>
              <h3 className="text-lg font-bold text-gray-800">{adminName}</h3>
              <p className="text-sm text-gray-500">{adminEmail}</p>
            </div>
            
            <InputField label="Contraseña" type="password" value={adminPass} onChange={setAdminPass} icon={Lock} required />
            
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-all transform active:scale-95"
            >
              {loading ? 'Iniciando...' : 'Ingresar al Panel'}
            </button>
          </form>
        )}
      </div>
    </div>
  );

  const renderStudentFlow = () => (
    <div className="max-w-2xl w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden my-8 relative z-10 transition-all duration-500 border border-white/50">
      <button 
        onClick={() => { setError(''); setCurrentView('LANDING'); setIsRegistering(false); }} 
        className="absolute top-4 left-4 text-white/80 hover:text-white z-20 transition-colors"
      >
        <ArrowLeft size={24} />
      </button>

      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-8 text-white text-center relative">
        <div className="absolute inset-0 bg-white/10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
        <h2 className="text-3xl font-bold tracking-tight relative z-10 font-serif">{isRegistering ? 'Inscripción Pastoral' : 'Bienvenido de Nuevo'}</h2>
        <p className="mt-2 text-indigo-100 text-sm relative z-10 tracking-wide">Formación en la fe para la vida.</p>
      </div>

      <div className="px-8 py-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-700 rounded flex items-center shadow-sm">
             <div className="mr-2 font-bold text-lg">!</div> {error}
          </div>
        )}

        <form onSubmit={handleStudentAuth} className="space-y-5">
          
          {isRegistering && (
            <div className="animate-fade-in">
               <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl mb-6 text-indigo-800 text-sm flex items-start">
                  <div className="mr-3 mt-0.5 text-indigo-500"><BookOpen size={20}/></div>
                  <div>Completa tu ficha de inscripción con datos reales. Esta información se usará para tus constancias.</div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div className="md:col-span-2">
                       <InputField label="Nombre Completo" value={fullName} onChange={setFullName} icon={UserIcon} required placeholder="Como aparece en tu acta" />
                   </div>
                   
                   <InputField label="Edad" type="number" value={age} onChange={(v: string) => setAge(parseInt(v))} icon={Calendar} required min={15} max={99} />
                   
                   <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estado Civil <span className="text-red-500">*</span></label>
                      <div className="relative">
                          <Heart size={18} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
                          <select 
                              value={maritalStatus} 
                              onChange={(e) => setMaritalStatus(e.target.value)}
                              className="block w-full pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white/50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm appearance-none backdrop-blur-sm"
                          >
                              {MARITAL_STATUS_OPTIONS.map(status => (
                                  <option key={status} value={status}>{status}</option>
                              ))}
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                      </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <InputField label="Lugar de Nacimiento" value={birthPlace} onChange={setBirthPlace} icon={MapPin} placeholder="Ciudad, Estado" />
                   <InputField label="Teléfono (WhatsApp)" type="tel" value={phone} onChange={setPhone} icon={Phone} required placeholder="Para notificaciones" />
               </div>
               
               <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección <span className="text-red-500">*</span></label>
                  <textarea 
                    value={address} 
                    onChange={(e) => setAddress(e.target.value)} 
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 bg-white/50 backdrop-blur-sm text-sm" 
                    rows={2}
                    required
                    placeholder="Calle, Número, Colonia"
                  />
               </div>

               <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sacramentos a realizar <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSacramentListOpen(!isSacramentListOpen)}
                      className="w-full bg-white/50 backdrop-blur-sm border border-gray-300 rounded-lg py-2.5 px-3 flex items-center justify-between text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:bg-white transition-colors"
                    >
                      <span className="block truncate text-sm text-gray-900 pl-8">
                        {selectedSacraments.length > 0 
                          ? `${selectedSacraments.length} seleccionado(s)` 
                          : 'Seleccionar de la lista...'}
                      </span>
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <CheckSquare size={18} className="text-gray-400" />
                      </div>
                      <ChevronDown size={16} className={`text-gray-500 transition-transform ${isSacramentListOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isSacramentListOpen && (
                      <div className="absolute mt-1 w-full bg-white shadow-xl max-h-60 rounded-lg py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto sm:text-sm z-50 border border-gray-200">
                        {AVAILABLE_SACRAMENTS.map((sac) => {
                          const isSelected = selectedSacraments.includes(sac);
                          return (
                            <div 
                              key={sac}
                              onClick={() => toggleSacrament(sac)}
                              className="cursor-pointer select-none relative py-3 pl-3 pr-9 hover:bg-indigo-50 flex items-center border-b border-gray-50 last:border-0"
                            >
                              <div className={`mr-3 ${isSelected ? 'text-indigo-600' : 'text-gray-300'}`}>
                                {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                              </div>
                              <span className={`block truncate ${isSelected ? 'font-bold text-indigo-900' : 'font-medium text-gray-700'}`}>
                                {sac}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedSacraments.map(s => (
                      <span key={s} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                        {s}
                      </span>
                    ))}
                  </div>
               </div>
            </div>
          )}

          <div className="pt-2">
              <InputField label="Correo Electrónico" type="email" value={studentEmail} onChange={setStudentEmail} icon={Mail} required placeholder="tucorreo@ejemplo.com" />
              <InputField label="Contraseña" type="password" value={studentPass} onChange={setStudentPass} icon={Lock} required />
              
              {isRegistering && (
                 <InputField label="Confirmar Contraseña" type="password" value={studentPassConfirm} onChange={setStudentPassConfirm} icon={Lock} required />
              )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 mt-8 transition-all transform hover:-translate-y-0.5 active:scale-95"
          >
            {loading ? (isRegistering ? 'Registrando...' : 'Entrando...') : (isRegistering ? 'Completar Registro' : 'Iniciar Sesión')}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-100 pt-6">
          <p className="text-sm text-gray-600">
            {isRegistering ? '¿Ya tienes una cuenta?' : '¿Es tu primera vez aquí?'}
            <button
              onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
              className="ml-2 font-bold text-indigo-600 hover:text-indigo-800 focus:outline-none hover:underline transition-colors"
            >
              {isRegistering ? 'Inicia Sesión' : 'Crea tu cuenta'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div 
        className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans bg-gray-900"
    >
        {/* Dynamic Background Image - Only renders if config exists */}
        {config?.landingBackground && (
             <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed z-0 transition-opacity duration-1000 animate-fade-in"
                style={{ 
                    backgroundImage: `url(${config.landingBackground})` 
                }}
            ></div>
        )}
        
        {/* Modern Overlay - Gradient Black for Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950/70 via-gray-900/40 to-gray-950/90 z-0"></div>

        {currentView === 'LANDING' && renderLanding()}
        {(currentView === 'ADMIN_EMAIL' || currentView === 'ADMIN_LOGIN' || currentView === 'ADMIN_SETUP') && renderAdminFlow()}
        {currentView === 'STUDENT_AUTH' && renderStudentFlow()}

        <footer className="absolute bottom-4 text-center text-white/40 text-xs z-10 w-full px-4">
            <p className="mb-1">© {new Date().getFullYear()} Orden Franciscana TOR - Provincia de México.</p>
            <p>Formando corazones en la fe.</p>
        </footer>
    </div>
  );
};
