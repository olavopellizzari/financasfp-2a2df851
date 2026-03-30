import { GoogleGenerativeAI } from "@google/generative-ai";

// Busca a chave das variáveis de ambiente do Vite
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("Aviso: VITE_GEMINI_API_KEY não encontrada no arquivo .env");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

const TEXT_MODEL_NAME = "gemini-pro"; 
const VISION_MODEL_NAME = "gemini-1.5-flash"; 

export const geminiModel = genAI.getGenerativeModel({ 
  model: TEXT_MODEL_NAME,
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 1000,
  }
});

// Nova instância para o modelo de visão
export const visionModel = genAI.getGenerativeModel({ 
  model: VISION_MODEL_NAME,
  generationConfig: {
    temperature: 0.4,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 1000,
  }
});

/**
 * Função utilitária para extrair JSON de respostas de texto da IA
 */
export function extractJSON(text: string) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
  } catch (e) {
    console.error("Erro ao extrair JSON da resposta da IA:", text);
    throw new Error("A IA não retornou um formato de dados válido.");
  }
}

/**
 * Função base para chat simples
 */
export async function askGemini(prompt: string, context: string = "") {
  try {
    const fullPrompt = context ? `Contexto: ${context}\n\nPergunta: ${prompt}` : prompt;
    const result = await geminiModel.generateContent(fullPrompt);
    return result.response.text();
  } catch (error: any) {
    console.error("Erro na API Gemini:", error);
    throw error;
  }
}

export async function parseVoiceWithGemini(transcript: string, categories: any[]) {
  const catList = categories.slice(0, 20).map(c => `${c.id}:${c.name}`).join('|');
  const prompt = `Extraia JSON de: "${transcript}". Categorias: ${catList}. Formato: {"amount": number, "description": "string", "type": "INCOME"|"EXPENSE", "categoryId": "string"}`;
  const result = await geminiModel.generateContent(prompt);
  return extractJSON(result.response.text());
}

export async function analyzeReceipt(base64Image: string, categories: any[]) {
  const catList = categories.slice(0, 20).map(c => `${c.id}:${c.name}`).join('|');
  const prompt = `Analise o recibo e extraia os dados. Categorias disponíveis: ${catList}. Retorne JSON: {"amount": number, "description": "string", "type": "INCOME"|"EXPENSE", "categoryId": "string"}`;
  
  // Remove o prefixo "data:image/png;base64," se presente
  const base64Data = base64Image.split(',')[1] || base64Image;

  const imageParts = [
    { inlineData: { data: base64Data, mimeType: "image/jpeg" } } // Ajuste o mimeType se necessário
  ];
  
  const result = await visionModel.generateContent([prompt, ...imageParts]);
  return extractJSON(result.response.text());
}

export async function getCashflowPrediction(history: any[]) {
  const prompt = `Com base neste histórico: ${JSON.stringify(history.slice(0, 15))}, projete o saldo para os próximos 3 meses. Retorne JSON: {"predictions": [{"month": "YYYY-MM", "projectedBalance": number}], "insight": "string"}`;
  const result = await geminiModel.generateContent(prompt);
  return extractJSON(result.response.text());
}