import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyAJ2ZGh_MPIKXk0u6NwWFIfcIlw1_g-hb4";
const genAI = new GoogleGenerativeAI(API_KEY);

export const geminiModel = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.4,
    topP: 0.8,
    topK: 40,
  }
});

/**
 * Função para processar chat com contexto financeiro
 */
export async function askGemini(prompt: string, context: any) {
  const chat = geminiModel.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: `Você é o Dyad AI, um assistente financeiro pessoal inteligente. 
        Você tem acesso aos dados do usuário abaixo para responder perguntas de forma precisa, amigável e útil.
        
        DADOS DO USUÁRIO:
        ${JSON.stringify(context, null, 2)}
        
        REGRAS:
        1. Responda sempre em Português (PT-BR).
        2. Seja conciso mas informativo.
        3. Se o usuário perguntar sobre saldos ou gastos, use os dados fornecidos.
        4. Use Markdown para formatar valores em negrito.
        5. Se não encontrar uma informação específica, diga que não tem acesso a esse detalhe no momento.` }],
      },
      {
        role: "model",
        parts: [{ text: "Entendido. Sou o Dyad AI e estou pronto para ajudar com suas finanças baseando-me nos seus dados reais. Como posso ajudar hoje?" }],
      },
    ],
  });

  const result = await chat.sendMessage(prompt);
  return result.response.text();
}

/**
 * Função para parsear comando de voz em JSON de transação
 */
export async function parseVoiceWithGemini(transcript: string, categories: any[]) {
  const prompt = `
    Analise a seguinte frase dita pelo usuário e extraia os dados para um lançamento financeiro.
    FRASE: "${transcript}"
    
    CATEGORIAS DISPONÍVEIS:
    ${categories.map(c => `${c.id}: ${c.name} (${c.kind})`).join('\n')}
    
    Retorne APENAS um JSON no seguinte formato:
    {
      "amount": number,
      "description": "string",
      "type": "INCOME" | "EXPENSE" | "TRANSFER",
      "categoryId": "string (id da categoria mais adequada)"
    }
  `;

  const result = await geminiModel.generateContent(prompt);
  const text = result.response.text();
  const jsonStr = text.replace(/```json|```/g, "").trim();
  return JSON.parse(jsonStr);
}

/**
 * Função para analisar imagem de comprovante (OCR)
 */
export async function analyzeReceipt(base64Image: string, categories: any[]) {
  const prompt = `
    Analise esta imagem de comprovante fiscal ou recibo e extraia os dados para um lançamento financeiro.
    
    CATEGORIAS DISPONÍVEIS:
    ${categories.map(c => `${c.id}: ${c.name}`).join('\n')}
    
    Retorne APENAS um JSON no seguinte formato:
    {
      "amount": number,
      "description": "string (nome do estabelecimento)",
      "date": "YYYY-MM-DD",
      "categoryId": "string (id da categoria mais adequada)"
    }
  `;

  const result = await geminiModel.generateContent([
    prompt,
    {
      inlineData: {
        data: base64Image.split(',')[1],
        mimeType: "image/jpeg"
      }
    }
  ]);

  const text = result.response.text();
  const jsonStr = text.replace(/```json|```/g, "").trim();
  return JSON.parse(jsonStr);
}

/**
 * Função para gerar previsão de fluxo de caixa
 */
export async function getCashflowPrediction(history: any[]) {
  const prompt = `
    Com base no histórico de transações abaixo, projete o saldo final para os próximos 3 meses.
    Identifique padrões recorrentes (aluguel, salário, assinaturas).
    
    HISTÓRICO:
    ${JSON.stringify(history, null, 2)}
    
    Retorne APENAS um JSON no formato:
    {
      "predictions": [
        { "month": "YYYY-MM", "projectedBalance": number, "reason": "string" }
      ],
      "insight": "string (uma dica curta de economia)"
    }
  `;

  const result = await geminiModel.generateContent(prompt);
  const text = result.response.text();
  const jsonStr = text.replace(/```json|```/g, "").trim();
  return JSON.parse(jsonStr);
}