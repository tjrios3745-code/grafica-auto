import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('ERRO: GEMINI_API_KEY não configurada no .env.local');
      return NextResponse.json(
        { error: 'Chave GEMINI_API_KEY não encontrada nas variáveis de ambiente.' },
        { status: 500 }
      );
    }

    const { prompt, clienteNome } = await req.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'Por favor, descreva o que deseja produzir.' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const regrasOficiaisGfox = `
DADOS INSTITUCIONAIS DA EMPRESA:
- Nome: Gfox Gráfica e Soluções (www.graficagfox.com.br)
- WhatsApp 1: (97) 98432-6004
- WhatsApp 2: (97) 98123-2504
- Endereço: Rua Rosângela Coca, 168 - Jardim Lara, Tefé - AM, CEP 69557-215
- Entregas: Fazemos Entrega em Tefé - AM
- Pagamento: Pix, Cartão de Débito e Crédito

REGRAS OFICIAIS DE PRODUTOS E PREÇOS:

1. CADERNETA DE SAÚDE PERSONALIZADA (TEMA À ESCOLHA DO CLIENTE):
   - Características gerais: Capa dura, encadernação Wire-o, laminação (brilho ou fosca). Arte e modelo conforme cliente desejar (cliente envia a referência). Todos os itens personalizados no tema escolhido.
   - Opção 1: REFORMA DE CADERNETA - R$ 50,00
     Incluso: Reforma da caderneta de saúde antiga, folhas adicionais, Cartão do SUS personalizado, chaveiro personalizado e fecho em elástico com passante.
   - Opção 2: KIT COMPLETO CADERNETA - R$ 80,00
     Incluso: Caderneta completa com miolo padrão do Ministério da Saúde, folhas adicionais, Cartão do SUS personalizado, chaveiro personalizado, fecho em elástico com passante e pasta de documentos personalizada.

2. CONFECÇÃO DE CAMISAS PERSONALIZADAS:
   - Tecidos: Cacharrel, Dry Colmeia (ou Dry), Dry 3D.
   - ATACADO (>= 10 unidades):
     • Cacharrel: R$ 35,00 un (Arte inclusa)
     • Dry Colmeia: R$ 40,00 un (Arte inclusa)
     • Dry 3D: R$ 50,00 un (Arte inclusa)
   - VAREJO (1 a 9 unidades avulsas):
     • Cacharrel: R$ 50,00 un (Sem arte inclusa)
     • Dry Colmeia: R$ 60,00 un (Sem arte inclusa)
     • Dry 3D: R$ 70,00 un (Sem arte inclusa)
   - Adicionais por camisa:
     • Manga comprida: + R$ 10,00 / unidade
     • Tamanho especial (XL e superiores): + R$ 10,00 / unidade
   - Grade Infantil (2 a 12 anos):
     • Cacharrel: R$ 30,00 un | Dry: R$ 35,00 un

3. CRIAÇÃO DE ARTE / LOGOTIPOS:
   - Criação exclusiva do zero: R$ 100,00 (2 alterações inclusas; após isso +R$ 20,00 por alteração).

4. OUTROS MATERIAIS GRÁFICOS:
   - Caneca cerâmica resinada: R$ 28,00 un (R$ 25,00 a partir de 5 un).
   - Panfletos 10x14cm (1000 un): R$ 180,00.
   - Banners em lona: R$ 65,00 m².
   - Adesivos em vinil: R$ 50,00 m².

5. TERMOS COMERCIAIS OBRIGATÓRIOS:
   - 50% de entrada na encomenda do serviço e o restante de 50% na finalização/entrega.
   - Prazo de entrega: 7 dias úteis a contar da finalização e confirmação da arte e do valor do pagamento inicial de 50%.
   - Validade da proposta: 7 dias corridos.
`;

    const systemPrompt = `Você é o calculador oficial da Gfox Gráfica e Soluções (Tefé - AM).
Analise o pedido do cliente e aplique com exatidão os preços e regras comerciais:

${regrasOficiaisGfox}

Instruções:
- Se o cliente pedir Reforma de Caderneta de Saúde, aplique R$ 50,00.
- Se o cliente pedir Kit Caderneta de Saúde, aplique R$ 80,00.
- Nas cadernetas, liste os itens inclusos (cartão do SUS, chaveiro, pasta, elástico com passante, etc.) na descrição.
- Para camisas, observe o volume (>= 10 atacado, < 10 varejo) e adicionais de manga longa/XL.
- Calcule entrada_50 (50%) e restante_50 (50%).

Retorne ESTRITAMENTE um JSON válido com esta estrutura:
{
  "cliente_nome": "${clienteNome || 'Cliente'}",
  "titulo_servico": string,
  "descricao_geral": string,
  "itens": [
    {
      "descricao": string,
      "quantidade": number,
      "valor_unitario": number,
      "valor_total": number
    }
  ],
  "valor_total": number,
  "entrada_50": number,
  "restante_50": number,
  "prazo_execucao": "7 dias úteis após confirmação da arte e entrada",
  "validade_proposta": "7 dias corridos",
  "condicoes_pagamento": "50% na encomenda e 50% na finalização"
}`;

    // Modelos oficiais ativos suportados pela API
    const modelosAtivos = [
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite'
    ];

    let response: any = null;
    let ultimoErro: any = null;

    for (const mod of modelosAtivos) {
      try {
        const chamadaComTimeout = ai.models.generateContent({
          model: mod,
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nPedido do Cliente:\n"${prompt}"` }] }],
          config: { responseMimeType: 'application/json' },
        });

        response = await Promise.race([
          chamadaComTimeout,
          new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout no modelo ${mod}`)), 8000))
        ]);

        if (response?.text) break;
      } catch (err: any) {
        console.warn(`Tentativa com modelo ${mod} falhou:`, err?.message || err);
        ultimoErro = err;
      }
    }

    if (!response || !response.text) {
      throw ultimoErro || new Error('Serviço temporariamente indisponível. Tente novamente em instantes.');
    }

    const dados = JSON.parse(response.text);
    if (!dados.entrada_50 && dados.valor_total) {
      dados.entrada_50 = dados.valor_total / 2;
      dados.restante_50 = dados.valor_total / 2;
    }

    return NextResponse.json(dados);
  } catch (error: any) {
    console.error('Erro na API /api/orcamento:', error);
    return NextResponse.json(
      { error: error?.message || 'Falha ao processar orçamento.' },
      { status: 500 }
    );
  }
}