'use client'
import { useState, useEffect } from 'react'
import { useCart } from '@/lib/cart'
import { useCliente } from '@/lib/clienteContext'
import { useRouter } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase'
import { ArrowLeft, MapPin, Phone, User, MessageSquare, Banknote, CreditCard, QrCode, Zap, Calendar, Clock } from 'lucide-react'

const EMPRESA_ID = 'd7366f17-abf7-4b2b-8cbe-26bb0d04aafa'

type PagOpt = { id: string; label: string; icon: React.ElementType; desc: string }

const PAGAMENTOS_BASE: PagOpt[] = [
  { id: 'pix',            label: 'PIX',     icon: QrCode,    desc: 'Aprovação instantânea' },
  { id: 'dinheiro',       label: 'Dinheiro', icon: Banknote,  desc: 'Pague na entrega'      },
  { id: 'cartao_credito', label: 'Crédito',  icon: CreditCard,desc: 'Maquininha na entrega' },
  { id: 'cartao_debito',  label: 'Débito',   icon: CreditCard,desc: 'Maquininha na entrega' },
]
const PAGAMENTO_MENSAL: PagOpt = { id: 'pagamento_mensal', label: 'Mensal', icon: Calendar, desc: 'Fatura ao fim do mês' }

const URGENCIAS = [
  { id: 'normal',   label: 'Normal',   desc: 'Próxima rota',   icon: Clock    },
  { id: 'urgente',  label: 'Urgente',  desc: 'Prioridade máx', icon: Zap      },
  { id: 'agendado', label: 'Agendar',  desc: 'Data e hora',    icon: Calendar },
]

export default function FinalizarPage() {
  const { items, total, count, clearCart } = useCart()
  const { cliente, loading } = useCliente()
  const router = useRouter()
  const sb = createAdminClient()

  const [pagamento, setPagamento] = useState('pix')
  const [urgencia, setUrgencia] = useState('normal')
  const [dataAgendada, setDataAgendada] = useState('')
  const [horaAgendada, setHoraAgendada] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!loading && !cliente) router.replace('/loja/login?next=/loja/finalizar')
  }, [cliente, loading, router])

  useEffect(() => {
    if (!loading && count === 0) router.replace('/loja')
  }, [count, loading, router])

  if (loading || !cliente) return null

  const cli = cliente

  // Build available payment options — include Mensal if client has it enabled
  const pagamentos: PagOpt[] = (cli as unknown as { pagamento_mensal?: boolean }).pagamento_mensal
    ? [...PAGAMENTOS_BASE, PAGAMENTO_MENSAL]
    : PAGAMENTOS_BASE

  const enderecoCompleto = [
    cli.rua_avenida,
    cli.numero_endereco_empresa,
    cli.bairro_empresa,
    cli.cidade_empresa,
  ].filter(Boolean).join(', ')

  async function finalizar() {
    if (!enderecoCompleto.trim()) { setErro('Seu cadastro não tem endereço. Atualize no perfil.'); return }
    if (urgencia === 'agendado' && !dataAgendada) { setErro('Escolha a data para agendamento.'); return }

    setEnviando(true)
    setErro('')

    const numPedido = `PED-${Date.now().toString().slice(-6)}`
    const produtoTexto = items.map(i => `${i.nome} x${i.qty}`).join(', ')

    const { data: ped, error } = await sb.from('pedidos').insert({
      empresa_id:              EMPRESA_ID,
      cliente_id:              cli.id,
      numero_pedido:           numPedido,
      status:                  'pedido_iniciado',
      valor_total:             total.toFixed(2).replace('.', ','),
      forma_pagamento:         pagamento,
      produto_pedido:          produtoTexto,
      Urgencia_do_pedido:      urgencia,
      data_entrega_solicitada: urgencia === 'agendado' ? dataAgendada : null,
      hora_entrega:            urgencia === 'agendado' ? horaAgendada || null : null,
      observacoes: [
        `Cliente: ${cli.nome_empresa}`,
        `Tel: ${cli.telefone}`,
        `Endereço: ${enderecoCompleto}`,
        observacoes ? `Obs: ${observacoes}` : '',
      ].filter(Boolean).join(' | '),
      data_pedido:   new Date().toISOString(),
      criado_em:     new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    }).select('id').single()

    if (error || !ped) {
      setErro('Erro ao enviar pedido. Tente novamente.')
      setEnviando(false)
      return
    }

    await sb.from('itens_pedidos').insert(
      items.map(i => ({
        pedido_id:      ped.id,
        produto_nome:   i.nome,
        quantidade:     String(i.qty),
        preco_unitario: i.preco,
        subtotal:       (parseFloat(i.preco.replace(',', '.')) * i.qty).toFixed(2).replace('.', ','),
        criado_em:      new Date().toISOString(),
      }))
    )

    clearCart()
    router.replace(`/loja/sucesso?num=${numPedido}&nome=${encodeURIComponent(cli.nome_empresa)}`)
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="sticky top-0 z-40 bg-[#080808]/95 backdrop-blur-md border-b border-white/[0.06] px-4 pt-14 pb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-[#141414] border border-white/[0.08] flex items-center justify-center">
            <ArrowLeft size={18} className="text-white/70" />
          </button>
          <div>
            <h1 className="text-white font-black text-lg">Finalizar pedido</h1>
            <p className="text-white/35 text-xs">{count} itens · R$ {total.toFixed(2).replace('.', ',')}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5 pb-32">

        {/* Dados do cliente */}
        <section className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold text-sm flex items-center gap-2">
              <User size={15} className="text-white/30" /> Seus dados
            </h2>
            <button onClick={() => router.push('/loja/perfil')} className="text-[#EF233C] text-xs font-bold">Editar</button>
          </div>
          <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-xl px-4 py-3 space-y-1.5">
            <p className="text-white text-sm font-semibold">{cli.nome_empresa}</p>
            <p className="text-white/40 text-xs flex items-center gap-1.5"><Phone size={11} /> {cli.telefone}</p>
            {enderecoCompleto && (
              <p className="text-white/40 text-xs flex items-center gap-1.5"><MapPin size={11} /> {enderecoCompleto}</p>
            )}
          </div>
          {!enderecoCompleto && <p className="text-[#FF9500] text-xs">⚠️ Endereço incompleto — atualize no perfil.</p>}
        </section>

        {/* Urgência / agendamento */}
        <section className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5">
          <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
            <Clock size={15} className="text-white/30" /> Prazo de entrega
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {URGENCIAS.map(({ id, label, desc, icon: Icon }) => (
              <button key={id} onClick={() => setUrgencia(id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all ${
                  urgencia === id
                    ? id === 'urgente' ? 'bg-[#FF9500]/10 border-[#FF9500]/40' : 'bg-[#EF233C]/10 border-[#EF233C]/40'
                    : 'bg-[#1a1a1a] border-white/[0.06]'
                }`}>
                <Icon size={18} className={urgencia === id ? (id === 'urgente' ? 'text-[#FF9500]' : 'text-[#EF233C]') : 'text-white/30'} />
                <div>
                  <p className={`text-xs font-bold ${urgencia === id ? (id === 'urgente' ? 'text-[#FF9500]' : 'text-[#EF233C]') : 'text-white'}`}>{label}</p>
                  <p className="text-white/30 text-[9px] mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
          {urgencia === 'agendado' && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-white/30 font-semibold uppercase tracking-wide block mb-1.5">Data</label>
                <input type="date" value={dataAgendada} onChange={e => setDataAgendada(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-white/30 font-semibold uppercase tracking-wide block mb-1.5">Horário</label>
                <input type="time" value={horaAgendada} onChange={e => setHoraAgendada(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-white/20"
                />
              </div>
            </div>
          )}
        </section>

        {/* Pagamento */}
        <section className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5">
          <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
            <CreditCard size={15} className="text-white/30" /> Forma de pagamento
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {pagamentos.map(({ id, label, icon: Icon, desc }) => (
              <button key={id} onClick={() => setPagamento(id)}
                className={`flex flex-col items-start gap-2 p-3.5 rounded-xl border text-left transition-all ${
                  pagamento === id
                    ? id === 'pagamento_mensal' ? 'bg-[#AF52DE]/10 border-[#AF52DE]/40' : 'bg-[#EF233C]/10 border-[#EF233C]/40'
                    : 'bg-[#1a1a1a] border-white/[0.06] hover:border-white/15'
                }`}>
                <Icon size={18} className={pagamento === id ? (id === 'pagamento_mensal' ? 'text-[#AF52DE]' : 'text-[#EF233C]') : 'text-white/30'} />
                <div>
                  <p className={`text-xs font-bold ${pagamento === id ? (id === 'pagamento_mensal' ? 'text-[#AF52DE]' : 'text-[#EF233C]') : 'text-white'}`}>{label}</p>
                  <p className="text-white/30 text-[10px] mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Observações */}
        <section className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5">
          <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <MessageSquare size={15} className="text-white/30" /> Observações (opcional)
          </h2>
          <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)}
            placeholder="Alguma instrução especial de entrega..."
            rows={3}
            className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors resize-none"
          />
        </section>

        {/* Resumo */}
        <section className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5 space-y-2.5">
          <h2 className="text-white font-bold text-sm mb-3">Resumo do pedido</h2>
          {items.map(i => (
            <div key={i.codigo} className="flex justify-between text-xs">
              <span className="text-white/50">{i.nome} × {i.qty}</span>
              <span className="text-white font-semibold">R$ {(parseFloat(i.preco.replace(',', '.')) * i.qty).toFixed(2).replace('.', ',')}</span>
            </div>
          ))}
          <div className="border-t border-white/[0.06] pt-2.5 flex justify-between">
            <span className="text-white font-bold text-sm">Total</span>
            <span className="text-[#F59E0B] font-black text-base">R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>
        </section>

        {erro && <div className="bg-[#EF233C]/10 border border-[#EF233C]/30 rounded-2xl px-4 py-3 text-sm text-[#EF233C]">{erro}</div>}
      </div>

      <div className="fixed bottom-[76px] left-4 right-4 z-40">
        <button onClick={finalizar} disabled={enviando || !enderecoCompleto}
          className="w-full py-4 rounded-2xl font-black text-white text-base disabled:opacity-40 active:scale-[0.98] transition-transform"
          style={{ background: '#EF233C', boxShadow: '0 8px 32px #EF233C50' }}>
          {enviando ? 'Enviando pedido...' : `Confirmar pedido · R$ ${total.toFixed(2).replace('.', ',')}`}
        </button>
      </div>
    </div>
  )
}
