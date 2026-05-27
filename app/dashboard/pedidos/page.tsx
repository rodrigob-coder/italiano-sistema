'use client'
import { useEffect, useState } from 'react'
import { createAdminClient } from '@/lib/supabase'
import { ShoppingBag, Search, Calendar, CreditCard, X, ChevronRight, Zap, Building2, Phone, ArrowLeft, Truck } from 'lucide-react'

const sb = createAdminClient()

type Pedido = {
  id: string; status: string; valor_total: string | null; forma_pagamento: string | null
  data_entrega_solicitada: string | null; hora_entrega: string | null; criado_em: string
  cliente_id: string | null; observacoes: string | null; Urgencia_do_pedido: string | null
  numero_pedido: string | null; produto_pedido: string | null
}
type Cliente = { id: string; nome_empresa: string; endereco: string | null; telefone: string | null }

const FLOW = ['pedido_iniciado', 'confirmando', 'recebido', 'entregue', 'cancelado']

const S: Record<string, { bg: string; text: string; border: string; label: string }> = {
  pedido_iniciado: { bg: 'bg-[#FF9500]/10', text: 'text-[#FF9500]', border: 'border-[#FF9500]/20', label: 'Novo'        },
  confirmando:     { bg: 'bg-[#007AFF]/10', text: 'text-[#007AFF]', border: 'border-[#007AFF]/20', label: 'Confirmando' },
  recebido:        { bg: 'bg-[#AF52DE]/10', text: 'text-[#AF52DE]', border: 'border-[#AF52DE]/20', label: 'Em entrega'  },
  entregue:        { bg: 'bg-[#06C167]/10', text: 'text-[#06C167]', border: 'border-[#06C167]/20', label: 'Entregue'    },
  cancelado:       { bg: 'bg-[#FF3B30]/10', text: 'text-[#FF3B30]', border: 'border-[#FF3B30]/20', label: 'Cancelado'   },
}

const PAG_LABEL: Record<string, string> = {
  pix: 'PIX', dinheiro: 'Dinheiro', cartao_credito: 'Crédito', cartao_debito: 'Débito', boleto: 'Boleto',
}

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [clientes, setClientes] = useState<Record<string, Cliente>>({})
  const [filtro, setFiltro] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('todos')
  const [selecionado, setSelecionado] = useState<Pedido | null>(null)
  const [motoristaMap, setMotoristaMap] = useState<Record<string, string>>({})

  useEffect(() => {
    carregar()
    const canal = sb.channel('pedidos-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, carregar)
      .subscribe()
    return () => { sb.removeChannel(canal) }
  }, [])

  async function carregar() {
    const [{ data: ped }, { data: cli }, { data: entData }] = await Promise.all([
      sb.from('pedidos').select('*').order('criado_em', { ascending: false }),
      sb.from('clientes').select('id, nome_empresa, endereco, telefone'),
      sb.from('entregas').select('pedido_id, rota_id, status').eq('status', 'entregue'),
    ])
    setPedidos((ped || []) as Pedido[])
    const cliMap: Record<string, Cliente> = {}
    ;(cli as Cliente[] || []).forEach(c => { cliMap[c.id] = c })
    setClientes(cliMap)

    if (entData && entData.length > 0) {
      const rotaIds = [...new Set((entData as any[]).map((e: any) => e.rota_id).filter(Boolean))]
      if (rotaIds.length > 0) {
        const { data: rotasData } = await sb.from('rotas').select('id, motorista_id').in('id', rotaIds)
        const motIds = [...new Set((rotasData || []).map((r: any) => r.motorista_id).filter(Boolean))]
        let motNomes: Record<string, string> = {}
        if (motIds.length > 0) {
          const { data: usersData } = await sb.from('users').select('id, nome').in('id', motIds)
          ;(usersData || []).forEach((u: any) => { motNomes[u.id] = u.nome })
        }
        const rotaMotMap: Record<string, string> = {}
        ;(rotasData || []).forEach((r: any) => { rotaMotMap[r.id] = motNomes[r.motorista_id] || 'Motorista' })
        const pedMot: Record<string, string> = {}
        ;(entData as any[]).forEach((e: any) => { if (e.rota_id && rotaMotMap[e.rota_id]) pedMot[e.pedido_id] = rotaMotMap[e.rota_id] })
        setMotoristaMap(pedMot)
      }
    }
  }

  async function atualizarStatus(id: string, status: string) {
    await sb.from('pedidos').update({ status }).eq('id', id)
    carregar()
    if (selecionado?.id === id) setSelecionado(prev => prev ? { ...prev, status } : null)
  }

  const filtrados = pedidos.filter(p => {
    const matchStatus = statusFiltro === 'todos' || p.status === statusFiltro
    const nomeCli = p.cliente_id ? (clientes[p.cliente_id]?.nome_empresa || '') : ''
    const matchBusca = !filtro || p.id.includes(filtro) || p.numero_pedido?.toLowerCase().includes(filtro.toLowerCase()) || nomeCli.toLowerCase().includes(filtro.toLowerCase())
    return matchStatus && matchBusca
  })

  const contadores = FLOW.reduce((acc, s) => ({ ...acc, [s]: pedidos.filter(p => p.status === s).length }), {} as Record<string, number>)

  return (
    <div className="flex h-full bg-black">
      {/* Lista */}
      <div className={`flex-1 flex flex-col min-w-0 ${selecionado ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="px-4 md:px-6 py-4 md:py-5 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white">Pedidos</h1>
              <p className="text-xs text-white/30 mt-0.5">{pedidos.length} · {filtrados.length} visíveis</p>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            {[{s:'todos',l:'Todos'}, ...FLOW.map(s => ({s,l:S[s]?.label||s}))].map(({s,l}) => (
              <button key={s} onClick={() => setStatusFiltro(s)}
                className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all ${
                  statusFiltro === s ? 'bg-white text-black' : 'bg-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.1]'
                }`}
              >
                {l}{s !== 'todos' && contadores[s] > 0 && ` · ${contadores[s]}`}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 md:px-6 py-3 border-b border-white/[0.04]">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
            <input value={filtro} onChange={e => setFiltro(e.target.value)}
              placeholder="Buscar por número ou cliente..."
              className="w-full bg-[#111] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
          {filtrados.map(p => {
            const s = S[p.status] || { bg: 'bg-white/5', text: 'text-white/40', border: 'border-white/10', label: p.status }
            return (
              <button key={p.id} onClick={() => setSelecionado(p)}
                className={`w-full text-left px-4 md:px-6 py-4 hover:bg-white/[0.02] transition-colors flex items-center gap-4 ${selecionado?.id === p.id ? 'bg-white/[0.03]' : ''}`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0`} style={{ background: p.status === 'pedido_iniciado' ? '#FF9500' : p.status === 'confirmando' ? '#007AFF' : p.status === 'recebido' ? '#AF52DE' : p.status === 'entregue' ? '#06C167' : '#FF3B30' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white">{p.numero_pedido || `#${p.id.slice(0,8)}`}</span>
                    {p.Urgencia_do_pedido && <Zap size={11} className="text-[#FF9500]" />}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/30">
                    {p.cliente_id && clientes[p.cliente_id] && (
                      <span className="text-white/50 font-medium truncate max-w-[120px]">{clientes[p.cliente_id].nome_empresa}</span>
                    )}
                    <span className="flex items-center gap-1 shrink-0"><Calendar size={10} />{p.criado_em?.slice(0,10)}</span>
                    {p.valor_total && <span className="text-[#06C167] font-semibold shrink-0">R$ {p.valor_total}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${s.bg} ${s.text} ${s.border}`}>{s.label}</span>
                  <ChevronRight size={14} className="text-white/20" />
                </div>
              </button>
            )
          })}
          {filtrados.length === 0 && (
            <div className="py-16 text-center text-sm text-white/25">Nenhum pedido encontrado</div>
          )}
        </div>
      </div>

      {/* Detalhe — fixed overlay no mobile, painel no desktop */}
      {selecionado && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a] md:relative md:inset-auto md:z-auto md:w-80 md:shrink-0 border-l border-white/[0.06]">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
            <button onClick={() => setSelecionado(null)} className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors">
              <ArrowLeft size={16} />
              <span className="text-sm md:hidden">Voltar</span>
            </button>
            <div className="flex-1">
              <div className="text-xs text-white/30">Pedido</div>
              <div className="font-bold text-white text-sm">{selecionado.numero_pedido || `#${selecionado.id.slice(0,8)}`}</div>
            </div>
            <button onClick={() => setSelecionado(null)} className="hidden md:block p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {(() => {
              const s = S[selecionado.status]
              return s ? (
                <div className={`px-4 py-3 rounded-xl border ${s.bg} ${s.border}`}>
                  <div className={`text-xs font-semibold uppercase tracking-wide ${s.text} mb-0.5`}>Status atual</div>
                  <div className={`text-base font-bold ${s.text}`}>{s.label}</div>
                </div>
              ) : null
            })()}

            <div>
              <div className="text-xs font-semibold text-white/30 uppercase tracking-wide mb-2">Atualizar status</div>
              <div className="space-y-1.5">
                {FLOW.map(status => {
                  const s = S[status]
                  const ativo = selecionado.status === status
                  return (
                    <button key={status} onClick={() => atualizarStatus(selecionado.id, status)}
                      className={`w-full text-left text-sm px-3.5 py-2.5 rounded-xl border font-medium transition-all ${
                        ativo ? `${s.bg} ${s.text} ${s.border}` : 'border-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.04] hover:border-white/[0.1]'
                      }`}
                    >
                      {ativo ? '✓ ' : ''}{s?.label || status}
                    </button>
                  )
                })}
              </div>
            </div>

            {selecionado.produto_pedido && (
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
                <div className="text-xs font-semibold text-white/30 uppercase tracking-wide mb-2">Itens</div>
                <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{selecionado.produto_pedido}</div>
              </div>
            )}

            {selecionado.cliente_id && clientes[selecionado.cliente_id] && (() => {
              const c = clientes[selecionado.cliente_id]
              return (
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 space-y-2">
                  <div className="text-xs font-semibold text-white/30 uppercase tracking-wide mb-3">Cliente</div>
                  <div className="flex items-start gap-2.5">
                    <Building2 size={13} className="text-white/25 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs text-white/30">Nome</div>
                      <div className="text-sm text-white font-semibold">{c.nome_empresa}</div>
                    </div>
                  </div>
                  {c.telefone && (
                    <div className="flex items-start gap-2.5">
                      <Phone size={13} className="text-white/25 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs text-white/30">Telefone</div>
                        <div className="text-sm text-white font-medium">{c.telefone}</div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            <div className="space-y-3">
              <div className="text-xs font-semibold text-white/30 uppercase tracking-wide">Detalhes</div>
              {[
                { icon: Calendar,   label: 'Criado em',  value: selecionado.criado_em?.slice(0,16).replace('T',' ')    },
                { icon: Calendar,   label: 'Entrega',    value: selecionado.data_entrega_solicitada                      },
                { icon: Calendar,   label: 'Horário',    value: selecionado.hora_entrega                                 },
                { icon: CreditCard, label: 'Pagamento',  value: PAG_LABEL[selecionado.forma_pagamento || ''] || selecionado.forma_pagamento },
                { icon: ShoppingBag,label: 'Valor',      value: selecionado.valor_total ? `R$ ${selecionado.valor_total}` : null },
                { icon: Truck,      label: 'Entregue por', value: selecionado.status === 'entregue' ? (motoristaMap[selecionado.id] || null) : null },
              ].filter(f => f.value).map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon size={13} className="text-white/25 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-white/30">{label}</div>
                    <div className="text-sm text-white font-medium">{value}</div>
                  </div>
                </div>
              ))}

              {selecionado.observacoes && (
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3.5 mt-2">
                  <div className="text-xs text-white/30 mb-1.5">Observações</div>
                  <div className="text-sm text-white/80 leading-relaxed">{selecionado.observacoes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
