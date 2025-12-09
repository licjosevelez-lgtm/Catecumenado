
import React, { useState, useEffect } from 'react';
import { MockService } from '../services/mockDb';
import { User, AppConfig } from '../types';
import { Lock, User as UserIcon, MapPin, Phone, Calendar, Mail, ChevronDown, CheckSquare, Square, ShieldCheck, BookOpen, ArrowRight, ArrowLeft, Heart } from 'lucide-react';

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
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 caret-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
      />
    </div>
  </div>
);

type LoginView = 'LANDING' | 'STUDENT_AUTH' | 'ADMIN_EMAIL' | 'ADMIN_SETUP' | 'ADMIN_LOGIN';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [currentView, setCurrentView] = useState<LoginView>('LANDING');
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    const c = MockService.getAppConfig();
    setConfig(c);
  }, []);
  
  // Admin Flow State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminPassConfirm, setAdminPassConfirm] = useState('');
  
  // Student Flow State
  const [isRegistering, setIsRegistering] = useState(false); // Toggle between Login/Register inside STUDENT_AUTH
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPass, setStudentPass] = useState('');
  const [studentPassConfirm, setStudentPassConfirm] = useState(''); // New State for Confirmation
  
  // Registration Data
  const [fullName, setFullName] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  
  // REFACTOR: Age and Marital Status instead of BirthDate
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

  // --- Handlers ---

  const handleAdminEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // 1. Buscamos al usuario en Supabase
      const admin = await MockService.checkAdminStatus(adminEmail);

      // 2. Si es null, es que no existe o no es admin
      if (!admin) {
        throw new Error('Este correo no está autorizado como administrador.');
      }

      // 3. Si existe, guardamos su nombre para el saludo
      setAdminName(admin.name || 'Catequista');

      // 4. DECISIÓN: ¿Tiene contraseña o no?
      // Si la contraseña está vacía (null o string vacío), lo mandamos a CREAR (SETUP).
      // Si ya tiene contraseña (como 'admin123'), lo mandamos a LOGUEARSE (LOGIN).
      if (!admin.password) {
        setCurrentView('ADMIN_SETUP');
      } else {
        setCurrentView('ADMIN_LOGIN');
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al verificar el correo.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    // Admin Password Validation
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
        // Validation Logic
        if (!fullName || !studentEmail || !studentPass || !age || !phone) {
          throw new Error('Por favor completa todos los campos obligatorios (*)');
        }
        
        // Check Password Match
        if (studentPass !== studentPassConfirm) {
           throw new Error('Las contraseñas no coinciden');
        }

        if (selectedSacraments.length === 0) {
          throw new Error('Debes seleccionar al menos un sacramento');
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
        // Simple Student Login Check
        const user = await MockService.loginStudent(studentEmail);
        if (user) {
          // In a real app check password here
          onLogin(user);
        } else {
          throw new Error('Estudiante no encontrado. Regístrate primero.');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Views ---

  const renderLanding = () => (
    <div className="flex flex-col items-center w-full max-w-5xl relative z-10">
      <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-10 text-center drop-shadow-xl tracking-tight leading-tight">
        Catecismo Virtual Franciscanos TOR
      </h1>
      
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
        {/* Student Option */}
        <div 
          onClick={() => setCurrentView('STUDENT_AUTH')}
          className="bg-white/95 backdrop-blur-sm p-10 rounded-2xl shadow-2xl hover:shadow-2xl hover:scale-105 transition-all cursor-pointer flex flex-col items-center text-center group border border-white/50"
        >
          <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-inner">
            <BookOpen size={48} />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-3">Soy Catecúmeno</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Accede a tus materiales, exámenes y sigue tu progreso en la formación.
          </p>
          <div className="mt-8 px-6 py-2 bg-indigo-50 rounded-full text-indigo-700 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors flex items-center">
            Ingresar <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform"/>
          </div>
        </div>

        {/* Admin Option */}
        <div 
          onClick={() => setCurrentView('ADMIN_EMAIL')}
          className="bg-white/95 backdrop-blur-sm p-10 rounded-2xl shadow-2xl hover:shadow-2xl hover:scale-105 transition-all cursor-pointer flex flex-col items-center text-center group border border-white/50"
        >
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 mb-8 group-hover:bg-gray-800 group-hover:text-white transition-colors shadow-inner">
            <ShieldCheck size={48} />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-3">Soy Administrador</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Gestión de módulos, usuarios y supervisión del catecismo.
          </p>
          <div className="mt-8 px-6 py-2 bg-gray-100 rounded-full text-gray-800 font-bold group-hover:bg-gray-800 group-hover:text-white transition-colors flex items-center">
            Acceso Admin <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform"/>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdminFlow = () => (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden my-8 relative z-10">
      <button 
        onClick={() => { setError(''); setCurrentView('LANDING'); setAdminEmail(''); setAdminPass(''); setAdminPassConfirm(''); }} 
        className="absolute top-4 left-4 text-gray-400 hover:text-gray-600"
      >
        <ArrowLeft size={24} />
      </button>

      <div className="bg-gray-800 px-8 py-6 text-white text-center">
        <h2 className="text-2xl font-bold tracking-tight">Acceso Administrativo</h2>
        <p className="mt-2 text-gray-300 text-sm">Zona restringida para catequistas</p>
      </div>

      <div className="px-8 py-6">
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-700 rounded">
            <p>{error}</p>
          </div>
        )}

        {/* STEP 1: EMAIL */}
        {currentView === 'ADMIN_EMAIL' && (
          <form onSubmit={handleAdminEmailSubmit}>
            <p className="text-sm text-gray-600 mb-4 text-center">Ingresa tu correo autorizado para continuar.</p>
            <InputField label="Correo Institucional" type="email" value={adminEmail} onChange={setAdminEmail} icon={Mail} required />
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 mt-4"
            >
              {loading ? 'Verificando...' : 'Continuar'}
            </button>
          </form>
        )}

        {/* STEP 2A: SETUP PASSWORD */}
        {currentView === 'ADMIN_SETUP' && (
          <form onSubmit={handleAdminSetup}>
             <div className="mb-4 text-center">
                <div className="inline-block p-3 bg-green-100 rounded-full text-green-600 mb-2">
                   <ShieldCheck size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Bienvenido, {adminName}</h3>
                <p className="text-sm text-gray-500">Es tu primer ingreso. Configura tu contraseña.</p>
             </div>
             
             <InputField label="Nueva Contraseña" type="password" value={adminPass} onChange={setAdminPass} icon={Lock} required placeholder="Mínimo 6 caracteres" />
             <InputField label="Confirmar Contraseña" type="password" value={adminPassConfirm} onChange={setAdminPassConfirm} icon={Lock} required placeholder="Repite la contraseña" />

             <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none mt-4"
            >
              {loading ? 'Configurando...' : 'Guardar y Acceder'}
            </button>
          </form>
        )}

        {/* STEP 2B: LOGIN */}
        {currentView === 'ADMIN_LOGIN' && (
           <form onSubmit={handleAdminLogin}>
              <div className="mb-4 text-center">
                 <h3 className="text-lg font-bold text-gray-800">Hola de nuevo, {adminName}</h3>
                 <p className="text-sm text-gray-500">{adminEmail}</p>
              </div>

              <InputField label="Contraseña" type="password" value={adminPass} onChange={setAdminPass} icon={Lock} required />
              
              <button
               type="submit"
               disabled={loading}
               className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none mt-4"
             >
               {loading ? 'Entrando...' : 'Iniciar Sesión'}
             </button>
           </form>
        )}
      </div>
    </div>
  );

  const renderStudentAuth = () => (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden my-8 relative z-10">
       <button 
        onClick={() => { setError(''); setCurrentView('LANDING'); }} 
        className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 z-10"
      >
        <ArrowLeft size={24} />
      </button>

      <div className="bg-indigo-600 px-8 py-6 text-white text-center">
        <h2 className="text-3xl font-bold tracking-tight">Catecismo Virtual</h2>
        <p className="mt-2 text-indigo-100 text-sm">{isRegistering ? 'Crea tu cuenta' : 'Ingresa a tu cuenta'}</p>
      </div>

      <div className="px-8 py-6">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 text-sm text-red-700 rounded">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleStudentAuth}>
             {isRegistering ? (
                 <div className="space-y-2">
                    <InputField label="Nombre Completo" value={fullName} onChange={setFullName} icon={UserIcon} required />
                    <InputField label="Correo Electrónico" type="email" value={studentEmail} onChange={setStudentEmail} icon={Mail} required />
                    
                    {/* Password Fields with Confirmation */}
                    <InputField label="Contraseña" type="password" value={studentPass} onChange={setStudentPass} icon={Lock} required placeholder="Crea una contraseña" />
                    <InputField label="Confirmar Contraseña" type="password" value={studentPassConfirm} onChange={setStudentPassConfirm} icon={Lock} required placeholder="Repite tu contraseña" />
                    
                    {/* NEW: Age and Marital Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <InputField 
                            label="Edad" 
                            type="number" 
                            value={age} 
                            onChange={setAge} 
                            icon={Calendar} 
                            required 
                            min={18} 
                            max={99} 
                        />
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estado Civil <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Heart size={18} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
                                <select 
                                    value={maritalStatus} 
                                    onChange={(e) => setMaritalStatus(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm appearance-none"
                                >
                                    {MARITAL_STATUS_OPTIONS.map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <InputField label="Lugar Nacimiento" value={birthPlace} onChange={setBirthPlace} icon={MapPin} />
                    <InputField label="Teléfono (WhatsApp)" type="tel" value={phone} onChange={setPhone} icon={Phone} required />
                    <InputField label="Dirección Actual" value={address} onChange={setAddress} icon={MapPin} />
                    
                    {/* Collapsible Multi-Select for Sacraments */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sacramentos a Realizar <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setSacramentListOpen(!isSacramentListOpen)}
                          className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 flex items-center justify-between text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <span className="block truncate text-sm text-gray-900">
                            {selectedSacraments.length > 0 
                              ? `${selectedSacraments.length} seleccionado(s)` 
                              : 'Seleccionar...'}
                          </span>
                          <ChevronDown size={16} className={`text-gray-500 transition-transform ${isSacramentListOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isSacramentListOpen && (
                          <div className="mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto sm:text-sm z-10 border border-gray-200">
                            {AVAILABLE_SACRAMENTS.map((sac) => {
                              const isSelected = selectedSacraments.includes(sac);
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
                        {selectedSacraments.map(s => (
                          <span key={s} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-6 flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      {loading ? 'Registrando...' : 'Crear Cuenta'}
                    </button>
                 </div>
             ) : (
                 <>
                    <InputField label="Correo Electrónico" type="email" value={studentEmail} onChange={setStudentEmail} icon={Mail} required />
                    <InputField label="Contraseña" type="password" value={studentPass} onChange={setStudentPass} icon={Lock} required />
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 mt-6"
                    >
                      {loading ? 'Entrando...' : 'Ingresar'}
                    </button>
                 </>
             )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {isRegistering ? '¿Ya tienes cuenta?' : '¿Eres nuevo catecúmeno?'}
              <button
                onClick={() => { setIsRegistering(!isRegistering); setError(''); setStudentPassConfirm(''); }}
                className="ml-1 font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none underline"
              >
                {isRegistering ? 'Inicia Sesión' : 'Regístrate Aquí'}
              </button>
            </p>
          </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
       {/* Background */}
       <div className="absolute inset-0 z-0">
          <img
            src={config?.landingBackground || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&q=80&w=1000'}
            alt="Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60"></div>
       </div>

       {/* Views */}
       {currentView === 'LANDING' && renderLanding()}
       {(currentView.startsWith('ADMIN')) && renderAdminFlow()}
       {currentView === 'STUDENT_AUTH' && renderStudentAuth()}
    </div>
  );
};
