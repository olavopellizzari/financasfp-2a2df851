import { GoogleGenerativeAI } from "@google/generative-ai";

// Chave API configurada para o nível gratuito
const API_KEY = "AIzaSyAJ2ZGh_MPIKXk0u6NwWFIfcIlw1_g-hb4";
const genAI = new GoogleGenerativeAI(API_KEY);

// Modelo estável
const MODEL_NAME = "gemini-1.5-flash";

export const geminiModel = genAI.getGenerativeModel({ 
  model: MODEL_NAME,
  generationConfig: {
    temperature: 0.5,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 500,
  }
});

function extractJSON(text: string) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
  } catch (e) {
    console.error("Erro ao extrair JSON:", text);
    throw new Error("Resposta da IA inválida.");
  }
}

export async function askGemini(prompt: string, context: any) {
  try {
    // Contexto ultra-simplificado para evitar erros de token
    const summary = `
      Usuário: ${context.userName || 'Usuário'}
      Saldos: ${context.accounts?.map((a: any) => `${a.name}: R$${a.balance}`).join(', ')}
      Últimos 5 gastos: ${context.recentTransactions?.slice(0, 5).map((t: any) => `${t.desc}(R$${t.val})`).join('; ')}
    `;

    const chat = geminiModel.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: `Você é o Dyad AI, assistente financeiro. Responda de forma curta. Dados: ${summary}` }],
        },
        {
          role: "model",
          parts: [{ text: "Olá! Sou o Dyad AI. Como posso ajudar com suas finanças?" }],
        },
      ],
    });

    const result = await chat.sendMessage(prompt);
    return result.response.text();
  } catch (error: any) {
    console.error("Erro Gemini:", error);
    throw error;
  }
}

export async function parseVoiceWithGemini(transcript: string, categories: any[]) {
  const catList = categories.slice(0, 15).map(c => `${c.id}:${c.name}`).join('|');
  const prompt = `Extraia JSON de: "${transcript}". Categorias: ${catList}. Formato: {"amount": number, "description": "string", "type": "INCOME"|"EXPENSE", "categoryId": "string"}`;
  const result = await geminiModel.generateContent(prompt);
  return extractJSON(result.response.text());
}

export async function analyzeReceipt(base64Image: string, categories: any[]) {
  const catList = categories.slice(0, 10).map(c => `${c.id}:${c.name}`).join('|');
  const prompt = `Extraia valor(amount), local(description), data(YYYY-MM-DD) e categoryId de: ${catList}. Retorne apenas JSON.`;
  const result = await geminiModel.generateContent([
    prompt,
    { inlineData: { data: base64Image.split(',')[1], mimeType: "image/jpeg" } }
  ]);
  return extractJSON(result.response.text());
}

export async function getCashflowPrediction(history: any[]) {
  const prompt = `Projete saldo 3 meses: ${JSON.stringify(history.slice(0, 10))}. Retorne JSON: {"predictions": [{"month": "YYYY-MM", "projectedBalance": number}], "insight": "string"}`;
  const result = await geminiModel.generateContent(prompt);
  return extractJSON(result.response.text());
}