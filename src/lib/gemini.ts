import { GoogleGenerativeAI } from "@google/generative-ai";

// Chave API configurada para o nível gratuito
// Nota: Se o erro persistir, verifique se esta chave é válida no Google AI Studio
const API_KEY = "AIzaSyAJ2ZGh_MPIKXk0u6NwWFIfcIlw1_g-hb4";
const genAI = new GoogleGenerativeAI(API_KEY);

// Usando gemini-1.5-flash que é o padrão mais estável para contas gratuitas
const MODEL_NAME = "gemini-1.5-flash";

export const geminiModel = genAI.getGenerativeModel({ 
  model: MODEL_NAME,
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
  }
});

/**
 * Helper para extrair JSON de uma string que pode conter texto extra
 */
function extractJSON(text: string) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("Falha ao extrair JSON da resposta da IA:", text);
    throw new Error("A IA retornou um formato inesperado.");
  }
}

/**
 * Função para processar chat com contexto financeiro
 */
export async function askGemini(prompt: string, context: any) {
  try {
    // Simplifica o contexto para não exceder limites de tokens
    const simplifiedContext = {
      user: context.userName,
      balances: context.accounts?.map((a: any) => `${a.name}: ${a.balance}`).join(', '),
      recent: context.recentTransactions?.slice(0, 10).map((t: any) => `${t.date}: ${t.desc} (${t.val})`).join('; ')
    };

    const chat = geminiModel.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: `Você é o Dyad AI, assistente financeiro. 
          Contexto atual: Usuário ${simplifiedContext.user}. 
          Saldos: ${simplifiedContext.balances}. 
          Últimos gastos: ${simplifiedContext.recent}.
          Responda de forma curta e prestativa em PT-BR.` }],
        },
        {
          role: "model",
          parts: [{ text: "Olá! Sou o Dyad AI. Como posso ajudar com suas finanças hoje?" }],
        },
      ],
    });

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("Erro detalhado na chamada do Gemini:", error);
    // Se for erro de API Key, avisamos no console
    if (error.message?.includes("API_KEY_INVALID")) {
      console.error("A CHAVE API CONFIGURADA É INVÁLIDA.");
    }
    throw error;
  }
}

/**
 * Função para parsear comando de voz em JSON de transação
 */
export async function parseVoiceWithGemini(transcript: string, categories: any[]) {
  try {
    const prompt = `
      Extraia dados desta frase para um JSON financeiro: "${transcript}"
      Categorias: ${categories.slice(0, 20).map(c => `${c.id}:${c.name}`).join(', ')}
      Retorne APENAS o JSON: {"amount": number, "description": "string", "type": "INCOME"|"EXPENSE", "categoryId": "string"}
    `;

    const result = await geminiModel.generateContent(prompt);
    return extractJSON(result.response.text());
  } catch (error) {
    console.error("Erro no parse de voz:", error);
    throw error;
  }
}

/**
 * Função para analisar imagem de comprovante (OCR)
 */
export async function analyzeReceipt(base64Image: string, categories: any[]) {
  try {
    const prompt = `Analise este recibo e extraia: valor (amount), estabelecimento (description), data (YYYY-MM-DD) e id da categoria mais próxima entre: ${categories.slice(0, 15).map(c => `${c.id}:${c.name}`).join(', ')}. Retorne apenas JSON.`;

    const result = await geminiModel.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image.split(',')[1],
          mimeType: "image/jpeg"
        }
      }
    ]);

    return extractJSON(result.response.text());
  } catch (error) {
    console.error("Erro no OCR:", error);
    throw error;
  }
}

/**
 * Função para gerar previsão de fluxo de caixa
 */
export async function getCashflowPrediction(history: any[]) {
  try {
    const prompt = `Com base nestes gastos: ${JSON.stringify(history.slice(0, 20))}, projete o saldo para os próximos 3 meses. Retorne apenas JSON: {"predictions": [{"month": "YYYY-MM", "projectedBalance": number}], "insight": "string"}`;

    const result = await geminiModel.generateContent(prompt);
    return extractJSON(result.response.text());
  } catch (error) {
    console.error("Erro na previsão:", error);
    throw error;
  }
}