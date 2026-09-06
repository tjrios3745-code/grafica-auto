'use client';

import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ItemPedido {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

interface OrcamentoData {
  cliente_nome: string;
  titulo_servico: string;
  descricao_geral: string;
  itens: ItemPedido[];
  valor_total: number;
  entrada_50?: number;
  restante_50?: number;
  prazo_execucao: string;
  validade_proposta: string;
  condicoes_pagamento: string;
}

export default function GfoxHome() {
  const dadosGrafica = {
    nome: 'Gfox Gráfica e Soluções',
    slogan: 'Gráfica Rápida & Estamparia',
    site: 'www.graficagfox.com.br',
    whatsapp1: '5597984326004',
    whatsapp1Formatado: '(97) 98432-6004',
    whatsapp2: '5597981232504',
    whatsapp2Formatado: '(97) 98123-2504',
    endereco: 'Rua Rosângela Coca, 168 - Jardim Lara, Tefé - AM, CEP 69557-215',
    chavePix: '97984326004',
    pixFavorecido: 'RAYANA LIMA',
    pixBanco: 'Cloudwalk IP LTDA',
  };

  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [inputTexto, setInputTexto] = useState('');
  const [loading, setLoading] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [resultado, setResultado] = useState<OrcamentoData | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  const atalhosGfox = [
    { label: '👕 10x Dry Colmeia (Atacado)', texto: '10 Camisas Dry Colméia adulto personalizadas, manga curta' },
    { label: '👕 10x Cacharrel (Atacado)', texto: '10 Camisas em tecido Cacharrel personalizadas' },
    { label: '✨ 10x Dry 3D Premium', texto: '10 Camisas Dry 3D personalizadas' },
    { label: '👶 5x Infantil Cacharrel', texto: '05 Camisas infantis tamanho 8 em tecido Cacharrel' },
    { label: '➕ 10x Manga Longa XL', texto: '10 Camisas Dry Colméia manga comprida tamanho XL' },
    { label: '🎨 Criação de Logotipo/Arte', texto: 'Criação de logotipo e modelo de camisa exclusivo do zero' },
  ];

  function inserirAtalho(texto: string) {
    setInputTexto((prev) => (prev ? `${prev}, ${texto}` : texto));
  }

  async function alternarGravacao() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Reconhecimento de voz não suportado neste navegador. Use o Google Chrome.');
      return;
    }

    if (gravando) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setGravando(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());

      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setGravando(true);
        setErro(null);
      };

      recognition.onresult = (event: any) => {
        let textoAtual = '';
        for (let i = 0; i < event.results.length; i++) {
          textoAtual += event.results[i][0].transcript + ' ';
        }
        setInputTexto(textoAtual.trim());
      };

      recognition.onerror = () => setGravando(false);
      recognition.onend = () => setGravando(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      alert('Permissão de microfone negada. Autorize no navegador.');
      setGravando(false);
    }
  }

  async function handleCalcularOrcamento(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!inputTexto.trim()) return;

    if (gravando && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setGravando(false);
    }

    setLoading(true);
    setErro(null);

    try {
      const res = await fetch('/api/orcamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: inputTexto,
          clienteNome: clienteNome || 'Cliente',
          clienteTelefone: clienteTelefone || '',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Falha ao processar orçamento.');
      }

      setResultado(data);
    } catch (err: any) {
      setErro(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  }

  function gerarPDF() {
    if (!resultado) return;

    const doc = new jsPDF();

    // Faixa Superior Roxa Gfox
    doc.setFillColor(76, 29, 149);
    doc.rect(0, 0, 210, 54, 'F');

    // Cápsula Branca de Contraste para a Logo
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(12, 6, 32, 42, 3, 3, 'F');

    // Inserção da Logo Vertical
    const logoImg = new Image();
    logoImg.src = '/logo-gfox-vertical.png';
    try {
      doc.addImage(logoImg, 'PNG', 14, 8, 28, 38);
    } catch (e) {}

    // Cabeçalho da Empresa
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(251, 191, 36);
    doc.text('Gfox Gráfica e Soluções', 48, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`WhatsApp: ${dadosGrafica.whatsapp1Formatado} / ${dadosGrafica.whatsapp2Formatado}`, 48, 23);
    doc.text(`Endereço: ${dadosGrafica.endereco}`, 48, 29);
    doc.text(`Cliente: ${clienteNome || 'Consumidor'} | Contato: ${clienteTelefone || 'Não informado'}`, 48, 36);
    doc.text('Fazemos Entrega • Pagamento: Pix, Cartão Débito e Crédito', 48, 43);

    const dataHoje = new Date().toLocaleDateString('pt-BR');
    doc.setFontSize(8.5);
    doc.setTextColor(226, 232, 240);
    doc.text(`Data: ${dataHoje}`, 196, 16, { align: 'right' });
    doc.text(`Cotação: #${Math.floor(1000 + Math.random() * 9000)}`, 196, 23, { align: 'right' });
    doc.text(`Validade: ${resultado.validade_proposta || '7 dias'}`, 196, 29, { align: 'right' });

    // Detalhes do Pedido
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 27, 75);
    doc.text(resultado.titulo_servico, 14, 65);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const descLinhas = doc.splitTextToSize(resultado.descricao_geral, 182);
    doc.text(descLinhas, 14, 72);

    const startYTable = 75 + descLinhas.length * 5;

    const tableBody = resultado.itens.map((item) => [
      item.descricao,
      item.quantidade ? `${item.quantidade} un` : '1 un',
      item.valor_unitario ? `R$ ${item.valor_unitario.toFixed(2)}` : '-',
      `R$ ${item.valor_total.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: startYTable,
      head: [['Item / Especificação', 'Qtd', 'Unitário', 'Total']],
      body: tableBody,
      headStyles: {
        fillColor: [76, 29, 149],
        textColor: [251, 191, 36],
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 105 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 28, halign: 'right' },
        3: { cellWidth: 24, halign: 'right' },
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;
    const entrada = resultado.entrada_50 || resultado.valor_total / 2;
    const restante = resultado.restante_50 || resultado.valor_total / 2;

    // Resumo Financeiro
    doc.setFillColor(254, 252, 232);
    doc.roundedRect(120, finalY, 76, 30, 2, 2, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Entrada (50% na encomenda):', 124, finalY + 8);
    doc.text(`R$ ${entrada.toFixed(2)}`, 192, finalY + 8, { align: 'right' });

    doc.text('Restante (na finalização):', 124, finalY + 16);
    doc.text(`R$ ${restante.toFixed(2)}`, 192, finalY + 16, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(76, 29, 149);
    doc.text('Total do Pedido:', 124, finalY + 25);
    doc.setTextColor(217, 119, 6);
    doc.text(`R$ ${resultado.valor_total.toFixed(2)}`, 192, finalY + 25, { align: 'right' });

    // Condições Oficiais
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 27, 75);
    doc.text('Condições de Fornecimento Gfox:', 14, finalY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('• Prazo: 7 dias úteis após aprovação da arte e confirmação da entrada.', 14, finalY + 15);
    doc.text('• Pagamento: 50% na encomenda e restante na entrega (Pix, Débito e Crédito).', 14, finalY + 21);
    doc.text('• Logotipos/Modelos: R$ 100,00 com 2 alterações inclusas (+R$ 20,00 por extra).', 14, finalY + 27);
    doc.text('• Fazemos Entrega em Tefé - AM.', 14, finalY + 33);

    // Box Pix Oficial com os dados da Rayana Lima
    doc.setFillColor(245, 243, 255);
    doc.setDrawColor(221, 214, 254);
    doc.roundedRect(14, finalY + 40, 182, 22, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(76, 29, 149);
    doc.text(`DADOS PARA PAGAMENTO PIX (50% DE ENTRADA: R$ ${entrada.toFixed(2)}):`, 18, finalY + 47);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(109, 40, 217);
    doc.text(
      `Chave Pix (Telefone): ${dadosGrafica.chavePix}  |  Favorecido: ${dadosGrafica.pixFavorecido}  |  Instituição: ${dadosGrafica.pixBanco}`,
      18,
      finalY + 55
    );

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Gfox Gráfica e Soluções • Rua Rosângela Coca, 168 - Jardim Lara, Tefé - AM • www.graficagfox.com.br', 105, 286, { align: 'center' });

    doc.save(`Orcamento_Gfox_${clienteNome ? clienteNome.replace(/\s+/g, '_') : 'Cliente'}.pdf`);
  }

  function fecharNoWhatsApp(numeroEscolhido: string) {
    if (!resultado) return;

    const entrada = resultado.entrada_50 || resultado.valor_total / 2;

    const itensMensagem = resultado.itens
      .map((it) => `• *${it.quantidade || 1}x ${it.descricao}* - R$ ${it.valor_total.toFixed(2)}`)
      .join('%0A');

    const textoZap =
      `*NOVO PEDIDO - GFOX GRÁFICA*%0A%0A` +
      `*Cliente:* ${clienteNome || 'Não informado'}%0A` +
      `*WhatsApp:* ${clienteTelefone || 'Não informado'}%0A%0A` +
      `*Itens Solicitados:*%0A${itensMensagem}%0A%0A` +
      `*Valor Total:* R$ ${resultado.valor_total.toFixed(2)}%0A` +
      `*Sinal de Entrada (50%):* R$ ${entrada.toFixed(2)}%0A` +
      `*Chave Pix para Entrada:* ${dadosGrafica.chavePix} (${dadosGrafica.pixFavorecido} - ${dadosGrafica.pixBanco})%0A` +
      `*Forma de Pagamento:* Pix, Cartão Débito ou Crédito%0A` +
      `*Prazo:* 7 dias úteis após validação da arte%0A%0A` +
      `Gerei o orçamento pelo site e gostaria de confirmar a produção e envio da arte!`;

    window.open(`https://wa.me/${numeroEscolhido}?text=${textoZap}`, '_blank');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-400 selection:text-slate-950 pb-12">
      {/* Header com Logo em Destaque e Telefones Oficiais */}
      <header className="border-b border-purple-900/40 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-white shadow-md flex items-center justify-center">
              <img
                src="/logo-gfox-vertical.png"
                alt="Gfox Gráfica e Soluções"
                className="h-12 sm:h-14 w-auto object-contain"
              />
            </div>
            <div>
              <span className="text-lg sm:text-xl font-black tracking-tight text-white block leading-none">
                Gfox <span className="text-amber-400">Gráfica</span>
              </span>
              <span className="text-[11px] text-purple-300 font-medium tracking-wide">
                Gráfica Rápida & Estamparia • Tefé - AM
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <a
              href={`https://wa.me/${dadosGrafica.whatsapp1}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-300 bg-purple-950/80 hover:bg-purple-900 border border-purple-800/80 px-2.5 py-1 rounded-lg transition"
            >
              📞 {dadosGrafica.whatsapp1Formatado}
            </a>
            <a
              href={`https://wa.me/${dadosGrafica.whatsapp2}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-300 bg-purple-950/80 hover:bg-purple-900 border border-purple-800/80 px-2.5 py-1 rounded-lg transition"
            >
              📞 {dadosGrafica.whatsapp2Formatado}
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 pt-8 pb-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-800 text-purple-300 text-xs font-semibold mb-3">
          <span>📍 {dadosGrafica.endereco}</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight mb-2">
          Calcule seu orçamento em <span className="text-amber-400">segundos</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Tecidos Cacharrel, Dry Colméia e Dry 3D. Fazemos entrega em Tefé e aceitamos Pix e Cartão (Débito/Crédito).
        </p>
      </section>

      {/* Formulário Interativo */}
      <section className="max-w-3xl mx-auto px-4">
        <div className="bg-slate-900/95 border border-purple-900/40 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
          
          {/* Passo 1 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-amber-400 text-purple-950 font-black text-xs flex items-center justify-center">1</span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Seus Dados
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                placeholder="Seu Nome Completo"
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-amber-400 focus:outline-none"
              />
              <input
                type="text"
                value={clienteTelefone}
                onChange={(e) => setClienteTelefone(e.target.value)}
                placeholder="Seu WhatsApp (ex: 97 98400-0000)"
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Passo 2 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-purple-950 font-black text-xs flex items-center justify-center">2</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  O que você quer orçar?
                </h3>
              </div>
              <span className="text-[11px] text-purple-300">Clique nas opções abaixo</span>
            </div>

            {/* Chips Rápidos Gfox */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {atalhosGfox.map((at, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => inserirAtalho(at.texto)}
                  className="text-xs bg-purple-950/60 hover:bg-purple-900 border border-purple-800/80 text-purple-200 hover:text-amber-300 px-3 py-1.5 rounded-lg transition active:scale-95 cursor-pointer font-medium"
                >
                  {at.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <textarea
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 focus:outline-none rounded-2xl p-4 text-sm text-slate-200 placeholder:text-slate-600 resize-none transition"
                rows={3}
                placeholder="Exemplo: '12 camisas Dry Colméia manga curta e 2 com manga longa tamanho XL'..."
                value={inputTexto}
                onChange={(e) => setInputTexto(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-3">
              <button
                type="button"
                onClick={alternarGravacao}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border ${
                  gravando
                    ? 'bg-red-500 text-white animate-pulse border-red-400 shadow-lg shadow-red-500/30'
                    : 'bg-purple-950/70 hover:bg-purple-900/90 text-amber-400 border-purple-800'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                {gravando ? '🔴 Gravando... Toque p/ parar' : '🎙️ Falar Pedido por Voz'}
              </button>

              <button
                type="button"
                onClick={() => handleCalcularOrcamento()}
                disabled={loading || !inputTexto.trim()}
                className="flex-1 py-3 px-6 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-slate-800 disabled:text-slate-600 text-purple-950 font-black text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-amber-400/10 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-purple-950 border-t-transparent rounded-full animate-spin"></div>
                    Aplicando Tabela Gfox...
                  </>
                ) : (
                  'Calcular Orçamento na Hora ➔'
                )}
              </button>
            </div>
          </div>

          {erro && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              <strong>Atenção:</strong> {erro}
            </div>
          )}

          {/* Resultado */}
          {resultado && (
            <div className="border-t border-purple-900/40 pt-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs uppercase font-black tracking-widest text-amber-400">
                    Proposta Comercial Oficial
                  </span>
                  <p className="text-xs text-slate-400">Regras oficiais de atacado e adicionais calculadas</p>
                </div>
                <button
                  type="button"
                  onClick={gerarPDF}
                  className="px-4 py-2 bg-purple-900/60 hover:bg-purple-800 text-purple-200 font-semibold text-xs rounded-xl border border-purple-700/60 transition flex items-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Baixar Proposta em PDF
                </button>
              </div>

              <div className="bg-slate-950 border border-purple-900/40 rounded-2xl p-4 sm:p-5 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-100">{resultado.titulo_servico}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{resultado.descricao_geral}</p>
                </div>

                {/* Tabela de Produtos */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-purple-300">
                        <th className="pb-2">Especificação</th>
                        <th className="pb-2 text-center">Quantidade</th>
                        <th className="pb-2 text-right">Unitário</th>
                        <th className="pb-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-slate-300">
                      {resultado.itens.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5">{item.descricao}</td>
                          <td className="py-2.5 text-center font-medium">{item.quantidade || 1} un</td>
                          <td className="py-2.5 text-right text-slate-400">
                            {item.valor_unitario ? `R$ ${item.valor_unitario.toFixed(2)}` : '-'}
                          </td>
                          <td className="py-2.5 text-right font-bold text-amber-400">
                            R$ {item.valor_total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Condição de Pagamento 50/50 */}
                <div className="bg-purple-950/40 p-4 rounded-xl border border-purple-900/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[11px] text-purple-300 block">Entrada de 50% (Sinal):</span>
                    <span className="text-lg font-black text-amber-300">
                      R$ {((resultado.entrada_50 || resultado.valor_total / 2)).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-purple-300 block">Restante (na Entrega):</span>
                    <span className="text-lg font-black text-slate-200">
                      R$ {((resultado.restante_50 || resultado.valor_total / 2)).toFixed(2)}
                    </span>
                  </div>
                  <div className="sm:text-right border-t sm:border-t-0 border-purple-900/60 pt-2 sm:pt-0">
                    <span className="text-[11px] text-purple-300 block">Valor Total:</span>
                    <span className="text-xl font-black text-amber-400">
                      R$ {resultado.valor_total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Box Pix na Tela */}
                <div className="bg-purple-950/60 border border-purple-800/80 rounded-xl p-3.5 space-y-1">
                  <div className="text-xs font-bold text-amber-400">
                    Chave Pix para Pagamento da Entrada (50%):
                  </div>
                  <div className="text-xs text-slate-200">
                    <strong>Chave (Telefone):</strong> {dadosGrafica.chavePix}
                  </div>
                  <div className="text-xs text-slate-400">
                    <strong>Favorecido:</strong> {dadosGrafica.pixFavorecido} • <strong>Instituição:</strong> {dadosGrafica.pixBanco}
                  </div>
                </div>

                <div className="text-xs text-slate-400 bg-slate-900/80 p-3 rounded-lg space-y-1">
                  <div>⏱️ <strong>Prazo:</strong> 7 dias úteis após validação da arte e confirmação da entrada.</div>
                  <div>💳 <strong>Pagamento:</strong> Pix, Cartão de Débito e Crédito.</div>
                  <div>🚚 <strong>Entrega:</strong> Fazemos entrega em Tefé - AM.</div>
                </div>

                {/* Botões para Enviar no WhatsApp */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold uppercase text-purple-300 block text-center">
                    Confirmar Pedido Diretamente no WhatsApp:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => fecharNoWhatsApp(dadosGrafica.whatsapp1)}
                      className="py-3.5 px-3 bg-amber-400 hover:bg-amber-300 text-purple-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer active:scale-[0.99]"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.288.043.088.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.352.101.173.449.741.963 1.199.662.589 1.22.771 1.393.858.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.144.39-.086s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z" />
                      </svg>
                      Enviar no WhatsApp (97) 98432-6004
                    </button>
                    <button
                      type="button"
                      onClick={() => fecharNoWhatsApp(dadosGrafica.whatsapp2)}
                      className="py-3.5 px-3 bg-purple-900 hover:bg-purple-800 text-amber-300 border border-purple-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-[0.99]"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.288.043.088.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.352.101.173.449.741.963 1.199.662.589 1.22.771 1.393.858.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.144.39-.086s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z" />
                      </svg>
                      Enviar no WhatsApp (97) 98123-2504
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Rodapé Oficial */}
      <footer className="mt-8 text-center text-xs text-slate-500 space-y-1">
        <p>© 2026 {dadosGrafica.nome} • {dadosGrafica.slogan}</p>
        <p>{dadosGrafica.endereco}</p>
      </footer>
    </div>
  );
}