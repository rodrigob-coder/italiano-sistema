'use client'
import { useEffect, useState } from 'react'
import { createAdminClient } from '@/lib/supabase'
import { ShoppingBag, Users, MessageSquare, TrendingUp, Clock, Zap, ArrowUpRight, DollarSign } from 'lucide-react'

const sb = createAdminClient()

type Pedido  = { id: string; status: string; valor_total: string | null; criado_em: string; cliente_id: string; numero_pedido: string | null }
type Cliente = { id: string; nome_empresa: string }

const STATUS_COR: Record<string, { bg: string; text: string; label: string; border: string }> = {
  pedido_iniciado: { bg: 'bg-[#FF9500]/10', text: 'text-[#FF9500]', label: 'Novo',        border: 'border-[#FF9500]' },
  confirmando:     { bg: 'bg-[#007AFF]/10', text: 'text-[#007AFF]', label: 'Confirmando', border: 'border-[#007AFF]' },
  recebido:        { bg: 'bg-[#AF52DE]/10', text: 'text-[#AF52DE]', label: 'Em entrega',  border: 'border-[#AF52DE]' },
  entregue:        { bg: 'bg-[#06C167]/10', text: 'text-[#06C167]', label: 'Entregue',    border: 'border-[#06C167]' },
  cancelado:       { bg: 'bg-[#EF233C]/10', text: 'text-[#EF233C]', label: 'Cancelado',   border: 'border-[#EF233C]' },
}

export default function DashboardPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [clientes, setClientes] = useState<Record<string, string>>({})
  const [stats, setStats] = useState({ hoje: 0, ativos: 0, clientes: 0, mensagens: 0, receitaHoje: 0 })
  const [hora, setHora] = useState('')

  useEffect(() => {
    setHora(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    carregarDados()
    const canal = sb.channel('dash-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, carregarDados)
      .subscribe()
    return () => { sb.removeChannel(canal) }
  }, [])

  async function carregarDados() {
    const [{ data: ped }, { data: cli }, { count: msgs }] = await Promise.all([
      sb.from('pedidos').select('*').order('criado_em', { ascending: false }).limit(30),
      sb.from('clientes').select('id, nome_empresa'),
      sb.from('mensagens_whatsapp').select('*', { count: 'exact', head: true }),
    ])
    const lista = (ped || []) as Pedido[]
    const cliMap: Record<string, string> = {}
    ;(cli as Cliente[] || []).forEach(c => { cliMap[c.id] = c.nome_empresa })
    setPedidos(lista)
    setClientes(cliMap)

    const hoje = new Date().toISOString().slice(0, 10)
    const pedidosHoje = lista.filter(p => p.criado_em?.slice(0, 10) === hoje)
    const receitaHoje = pedidosHoje.reduce((sum, p) => {
      const val = parseFloat((p.valor_total || '0').replace(',', '.'))
      return sum + (isNaN(val) ? 0 : val)
    }, 0)

    setStats({
      hoje:        pedidosHoje.length,
      ativos:      lista.filter(p => ['pedido_iniciado', 'confirmando'].includes(p.status)).length,
      clientes:    (cli || []).length,
      mensagens:   msgs || 0,
      receitaHoje,
    })
  }

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const urgentes = pedidos.filter(p => p.status === 'pedido_iniciado')

  const kpis = [
    { label: 'Pedidos hoje',  value: stats.hoje,        icon: TrendingUp,   cor: '#06C167', sub: 'realizados hoje'    },
    { label: 'Receita hoje',  value: `R$ ${stats.receitaHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, cor: '#06C167', sub: 'faturamento do dia' },
    { label: 'Aguardando',    value: stats.ativos,      icon: Clock,        cor: '#FF9500', sub: 'precisam atenção'   },
    { label: 'Clientes',      value: stats.clientes,    icon: Users,        cor: '#007AFF', sub: 'cadastrados'        },
    { label: 'Mensagens',     value: stats.mensagens,   icon: MessageSquare,cor: '#AF52DE', sub: 'via WhatsApp'       },
  ]

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/40 text-xs md:text-sm capitalize">{hoje}</p>
          <h1 className="text-xl md:text-2xl font-bold text-white mt-0.5">Visão geral</h1>
        </div>
        <div className="flex items-center gap-2 bg-[#06C167]/10 border border-[#06C167]/20 text-[#06C167] text-xs font-semibold px-3 py-2 rounded-full">
          <span className="w-2 h-2 rounded-full bg-[#06C167] animate-pulse" />
          <span className="hidden sm:inline">Ao vivo · </span>{hora}
        </div>
      </div>

      {/* Urgency alert */}
      {urgentes.length > 0 && (
        <div className="bg-[#FF9500]/10 border border-[#FF9500]/30 rounded-2xl px-4 py-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF9500]/20 flex items-center justify-center shrink-0">
            <Zap size={18} className="text-[#FF9500]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-[#FF9500]">
              {urgentes.length} {urgentes.length === 1 ? 'pedido aguardando' : 'pedidos aguardando'} confirmação
            </div>
            <div className="text-xs text-[#FF9500]/60 mt-0.5">Verifique a aba Pedidos</div>
          </div>
          <div className="text-3xl font-black text-[#FF9500]/30">{urgentes.length}</div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {kpis.map(({ label, value, icon: Icon, cor, sub }) => (
          <div
            key={label}
            className="bg-[#111] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/[0.14] transition-shadow"
          >
            <div className="h-1" style={{ background: `linear-gradient(to right, ${cor}40, transparent)` }} />
            <div className="p-4 md:p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: cor + '20' }}>
                  <Icon size={18} style={{ color: cor }} />
                </div>
                <ArrowUpRight size={13} className="text-white/20 mt-0.5" />
              </div>
              <div className="text-xl md:text-2xl font-black text-white leading-none mb-1 tabular-nums">{value}</div>
              <div className="text-[10px] md:text-[11px] font-semibold text-white/40 uppercase tracking-wide leading-tight">{label}</div>
              <div className="text-[10px] text-white/25 mt-0.5 hidden md:block">{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pedidos recentes */}
      <div className="bg-[#111] border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-white/[0.07] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag size={16} className="text-white/40" />
            <span className="font-bold text-sm text-white">Pedidos recentes</span>
            <span className="text-xs bg-white/[0.07] text-white/40 px-2 py-0.5 rounded-full font-medium">{pedidos.length}</span>
          </div>
          <span className="text-[10px] md:text-[11px] text-white/25">Atualiza automaticamente</span>
        </div>

        {pedidos.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ShoppingBag size={36} className="text-white/10 mx-auto mb-3" strokeWidth={1} />
            <p className="text-sm text-white/25">Nenhum pedido ainda</p>
          </div>
        ) : (
          <div>
            {pedidos.slice(0, 12).map((p, i) => {
              const s = STATUS_COR[p.status] || { bg: 'bg-white/5', text: 'text-white/40', label: p.status, border: 'border-white/20' }
              const clientNome = clientes[p.cliente_id]
              const initials = clientNome
                ? clientNome.trim().split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
                : '?'
              return (
                <div key={p.id} className={`px-4 md:px-6 py-3.5 flex items-center gap-3 hover:bg-white/[0.025] transition-colors ${i > 0 ? 'border-t border-white/[0.04]' : ''}`}>
                  <div className={`w-1 h-9 rounded-full shrink-0`} style={{ background: s.text.includes('FF9500') ? '#FF9500' : s.text.includes('007AFF') ? '#007AFF' : s.text.includes('AF52DE') ? '#AF52DE' : s.text.includes('06C167') ? '#06C167' : '#EF233C', opacity: 0.7 }} />
                  <div className="w-8 h-8 rounded-xl bg-white/[0.07] flex items-center justify-center shrink-0 text-xs font-bold text-white/60">{initials}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{p.numero_pedido || `#${p.id.slice(0, 8)}`}</span>
                      {clientNome && <span className="text-xs text-white/50 truncate hidden sm:inline">{clientNome}</span>}
                    </div>
                    <div className="text-[11px] text-white/30 mt-0.5">
                      {new Date(p.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.valor_total && <span className="text-sm font-bold text-white hidden sm:inline">R$ {p.valor_total}</span>}
                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${s.bg} ${s.text}`}>{s.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
