import { GoogleGenAI } from "@google/genai";
import { Question, Module } from '../types';

// REMOVED TOP-LEVEL INITIALIZATION to prevent white screen on load if key is missing
// const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

export const GeminiService = {
  /**
   * Generates quiz questions based on a topic description.
   */
  generateQuizQuestions: async (topic: string, count: number = 3): Promise<Question[]> => {
    try {
      // Initialize inside the function to safe-guard against missing keys during app load
      // Using process.env.API_KEY as strictly required
      const apiKey = process.env.API_KEY;
      
      // If no key is present, throw specific error to be caught below
      if (!apiKey) throw new Error("API Key not found in environment variables");

      const ai = new GoogleGenAI({ apiKey: apiKey });

      const prompt = `
        Create a JSON array of ${count} quiz questions about "${topic}" for a Catholic Catechesis course.
        Structure: 
        [
          {
            "text": "Question text?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctIndex": 0 (integer 0-3 representing the correct option)
          }
        ]
        Do not include markdown formatting like \`\`\`json. Just return the raw JSON string.
      `;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
      });

      const text = response.text || "[]";
      // Basic cleanup if model adds markdown blocks despite instructions
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const questions = JSON.parse(jsonStr);
      
      // Add IDs
      return questions.map((q: any) => ({
        ...q,
        id: Math.random().toString(36).substr(2, 9)
      }));

    } catch (error) {
      console.error("Gemini API Error:", error);
      // Fallback questions in case of API failure or missing key
      return [
        {
          id: 'err1',
          text: `(Modo Offline/Error IA: ${topic}) ¿Cuál es la virtud teologal de la confianza?`,
          options: ['Fe', 'Esperanza', 'Caridad', 'Prudencia'],
          correctIndex: 1
        }
      ];
    }
  },

  /**
   * Analyzes student progress to give the Admin a summary.
   */
  analyzeStudentProgress: async (studentName: string, completedModules: string[], totalModules: number) => {
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) return `¡Sigue adelante, ${studentName}! (IA no disponible)`;

      const ai = new GoogleGenAI({ apiKey: apiKey });

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `
          Analyze this student's progress: ${studentName} has completed ${completedModules.length} out of ${totalModules} modules.
          Write a short, encouraging 1-sentence message the admin can send to them via WhatsApp.
        `,
      });
      return response.text;
    } catch (e) {
      return `¡Sigue adelante, ${studentName}! Vas muy bien.`;
    }
  }
};
