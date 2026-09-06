import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('ERRO: GEMINI_API_KEY não configurada no .env.local');
      return NextResponse.json(
        { error: 'Chave GEMINI_API_KEY não encontrada no arquivo .env.local' },
        { status: 500 }
      );
    }

    const { prompt, clienteNome, clienteTelefone } = await req.json();

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
- Entregas: Fazemos Entrega
- Pagamento: Pix, Cartão de Débito e Crédito

REGRAS OFICIAIS DE PREÇOS E PRODUTOS:
1. TECIDOS:
   - Cacharrel
   - Dry Colmeia (ou Dry)
   - Dry 3D

2. VALORES POR VOLUME:
   - ATACADO (A partir de 10 unidades):
     • Cacharrel: R$ 35,00 / unidade (Arte inclusa)
     • Dry Colmeia: R$ 40,00 / unidade (Arte inclusa)
     • Dry 3D: R$ 50,00 / unidade (Arte inclusa)
   - VAREJO (1 a 9 unidades avulsas):
     • Cacharrel: R$ 50,00 / unidade (Não inclui arte)
     • Dry Colmeia: R$ 60,00 / unidade (Não inclui arte)
     • Dry 3D: R$ 70,00 / unidade (Não inclui arte)

3. TAMANHOS E ADICIONAIS POR PEÇA:
   - Grade Adulto: PP, P, M, G, GG (preço padrão da tabela).
   - Tamanho Especial XL e superiores: ACRESCENTA R$ 10,00 por peça sobre o valor base.
   - Grade Infantil (2, 4, 6, 8, 10 e 12 anos):
     • Cacharrel: R$ 30,00 / unidade
     • Dry: R$ 35,00 / unidade
   - Modelo Manga Comprida: ACRESCENTA R$ 10,00 por peça.

4. CRIAÇÃO DE ARTE E LOGOTIPOS:
   - Criação do zero de logotipo ou modelo de camisa: R$ 100,00 (permite 2 alterações dentro do serviço contratado; após isso acrescenta R$ 20,00 a cada alteração).
   - Em pedidos de camisas a partir de 10 unidades a arte da camisa já é inclusa.

5. OUTROS ITENS GRÁFICOS (se solicitados):
   - Caneca cerâmica resinada: R$ 28,00 un (a partir de 5 un: R$ 25,00).
   - Panfletos 10x14cm (1000 un): R$ 180,00.
   - Adesivos em vinil: R$ 50,00 m².
   - Banners em lona: R$ 65,00 m².

6. TERMOS COMERCIAIS OBRIGATÓRIOS:
   - Pagamento: 50% na encomenda do serviço e o restante na finalização.
   - Prazo de entrega: 7 dias úteis a contar da finalização e confirmação da arte e do valor do pagamento inicial.
   - Formas: Pix, Cartão de Débito e Crédito.
   - Fazemos Entrega.
   - Validade da proposta: 7 dias corridos.
`;

    const systemPrompt = `Você é o calculador oficial da Gfox Gráfica e Soluções (Tefé - AM).
Analise o pedido do cliente e aplique rigorosamente as regras de preços:

${regrasOficiaisGfox}

Instruções:
- Se a soma total das camisas for >= 10 un, aplique valor de atacado. Se for < 10 un, use varejo.
- Adicione +R$ 10,00 por peça para manga comprida ou tamanho XL/superior quando mencionados.
- Para tamanhos infantis (2 a 12 anos), adote o preço infantil correspondente.
- Se o cliente não especificar o tecido, use Dry Colmeia por padrão.
- Separe cada produto em um item com quantidade, valor unitário e total.
- Calcule entrada_50 (50% do total) e restante_50 (50% do total).

Retorne ESTRITAMENTE um JSON válido com este formato:
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

    // Modelos atuais rápidos da Google GenAI
    const modelosAtivos = [
      'gemini-3.7-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash'
    ];

    let response: any = null;
    let ultimoErro: any = null;

    for (const mod of modelosAtivos) {
      try {
        // Timeout de segurança por chamada para não prender a tela
        const chamadaComTimeout = ai.models.generateContent({
          model: mod,
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nPedido do Cliente:\n"${prompt}"` }] }],
          config: { responseMimeType: 'application/json' },
        });

        response = await Promise.race([
          chamadaComTimeout,
          new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout no modelo ${mod}`)), 7000))
        ]);

        if (response?.text) break;
      } catch (err: any) {
        console.warn(`Tentativa com ${mod} falhou ou expirou:`, err?.message || err);
        ultimoErro = err;
      }
    }

    if (!response || !response.text) {
      throw ultimoErro || new Error('Serviço temporariamente congestionado. Tente novamente em alguns instantes.');
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