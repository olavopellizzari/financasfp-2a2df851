import { GoogleGenerativeAI } from "@google/generative-ai";

// Busca a chave das variáveis de ambiente do Vite
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("Aviso: VITE_GEMINI_API_KEY não encontrada no arquivo .env");
}

const genAI = new GoogleGenerativeAI(API_KEY || "");

// Modelo otimizado para velocidade e custo zero (Flash)
const MODEL_NAME = "gemini-1.5-flash";

export const geminiModel = genAI.getGenerativeModel({ 
  model: MODEL_NAME,
  generationConfig: {
    temperature: 0.7,
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

// Funções específicas já existentes mantidas para compatibilidade
export async function parseVoiceWithGemini(transcript: string, categories: any[]) {
  const catList = categories.slice(0, 20).map(c => `${c.id}:${c.name}`).join('|');
  const prompt = `Extraia JSON de: "${transcript}". Categorias: ${catList}. Formato: {"amount": number, "description": "string", "type": "INCOME"|"EXPENSE", "categoryId": "string"}`;
  const result = await geminiModel.generateContent(prompt);
  return extractJSON(result.response.text());
}

export async function analyzeReceipt(base64Image: string, categories: any[]) {
  const catList = categories.slice(0, 15).map(c => `${c.id}:${c.name}`).join('|');
  const prompt = `Analise este comprovante. Extraia valor(amount), local(description), data(YYYY-MM-DD) e categoryId de: ${catList}. Retorne apenas JSON puro.`;
  const result = await geminiModel.generateContent([
    prompt,
    { inlineData: { data: base64Image.split(',')[1], mimeType: "image/jpeg" } }
  ]);
  return extractJSON(result.response.text());
}

export async function getCashflowPrediction(history: any[]) {
  const prompt = `Com base neste histórico: ${JSON.stringify(history.slice(0, 15))}, projete o saldo para os próximos 3 meses. Retorne JSON: {"predictions": [{"month": "YYYY-MM", "projectedBalance": number}], "insight": "string"}`;
  const result = await geminiModel.generateContent(prompt);
  return extractJSON(result.response.text());
}