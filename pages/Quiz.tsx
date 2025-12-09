import React, { useState, useEffect } from 'react';
import { Module, Question, QuizAttempt } from '../types';
import { MockService } from '../services/mockDb';
import { AlertCircle, CheckCircle, Clock, Lock } from 'lucide-react';

interface QuizProps {
  module: Module;
  userId: string;
  onComplete: (passed: boolean) => void;
  onCancel: () => void;
}

export const Quiz: React.FC<QuizProps> = ({ module, userId, onComplete, onCancel }) => {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Check for existing locks on mount
  useEffect(() => {
    const checkStatus = async () => {
      const attempts = MockService.getAttempts(userId);
      const moduleAttempts = attempts.filter(a => a.moduleId === module.id).sort((a, b) => b.timestamp - a.timestamp);
      
      if (moduleAttempts.length > 0) {
        const lastAttempt = moduleAttempts[0];
        // Rules of Business: If failed (<80), lock for 48 hours
        if (!lastAttempt.passed) {
          const hoursSince = (Date.now() - lastAttempt.timestamp) / (1000 * 60 * 60);
          if (hoursSince < 48) {
             setLockUntil(lastAttempt.timestamp + (48 * 60 * 60 * 1000));
          }
        }
      }
      setLoading(false);
    };
    checkStatus();
  }, [userId, module.id]);

  const handleAnswer = (optionIdx: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIdx] = optionIdx;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    // Calculate score
    let correctCount = 0;
    module.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctIndex) correctCount++;
    });
    
    const calculatedScore = Math.round((correctCount / module.questions.length) * 100);
    setScore(calculatedScore);
    setSubmitted(true);

    const result = await MockService.submitQuiz(userId, module.id, calculatedScore);
    
    if (!result.passed && result.lockedUntil) {
      setLockUntil(result.lockedUntil);
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando examen...</div>;

  // View: Locked State
  if (lockUntil && Date.now() < lockUntil) {
    const timeLeft = Math.ceil((lockUntil - Date.now()) / (1000 * 60 * 60));
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center max-w-2xl mx-auto">
        <Lock className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-red-800 mb-2">Examen Bloqueado</h3>
        <p className="text-red-700 mb-4">
          No alcanzaste la calificación mínima del 80% en tu último intento.
          Según las reglas de formación, debes repasar el material.
        </p>
        <div className="flex items-center justify-center text-red-600 font-medium">
          <Clock className="mr-2" />
          Disponible en: {timeLeft} horas
        </div>
        <button onClick={onCancel} className="mt-6 px-4 py-2 bg-white border border-red-300 rounded text-red-700 hover:bg-red-50">
          Volver al módulo
        </button>
      </div>
    );
  }

  // View: Result State
  if (submitted) {
    const passed = score >= 80;
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto text-center">
        {passed ? (
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
        ) : (
          <AlertCircle className="w-20 h-20 text-orange-500 mx-auto mb-4" />
        )}
        
        <h2 className="text-2xl font-bold mb-2">
          {passed ? '¡Aprobado!' : 'No Aprobado'}
        </h2>
        <p className="text-4xl font-black text-gray-800 mb-4">{score}%</p>
        
        <p className="text-gray-600 mb-8">
          {passed 
            ? 'Has demostrado dominio del tema. El siguiente módulo ha sido desbloqueado.' 
            : 'Necesitas un mínimo de 80% para avanzar. El examen se bloqueará por 48 horas para que estudies.'}
        </p>

        <button 
          onClick={() => onComplete(passed)}
          className={`px-6 py-3 rounded-md text-white font-medium ${passed ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'}`}
        >
          {passed ? 'Continuar' : 'Entendido'}
        </button>
      </div>
    );
  }

  // View: Taking Quiz
  const question = module.questions[currentQuestionIdx];
  const isLast = currentQuestionIdx === module.questions.length - 1;
  const canGoNext = answers[currentQuestionIdx] !== undefined;

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
      <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
        <h3 className="font-bold text-lg">Examen: {module.title}</h3>
        <span className="text-sm opacity-80">Pregunta {currentQuestionIdx + 1} de {module.questions.length}</span>
      </div>

      <div className="p-6">
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
          <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${((currentQuestionIdx + 1) / module.questions.length) * 100}%` }}></div>
        </div>

        <h4 className="text-xl font-medium text-gray-800 mb-6">{question.text}</h4>

        <div className="space-y-3">
          {question.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(idx)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                answers[currentQuestionIdx] === idx 
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span> {opt}
            </button>
          ))}
        </div>

        <div className="mt-8 flex justify-between">
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            Cancelar
          </button>
          
          <button
            disabled={!canGoNext}
            onClick={() => {
              if (isLast) handleSubmit();
              else setCurrentQuestionIdx(prev => prev + 1);
            }}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLast ? 'Finalizar Examen' : 'Siguiente Pregunta'}
          </button>
        </div>
      </div>
    </div>
  );
};
