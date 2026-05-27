'use client'
import { useEffect, useState } from 'react'
import { createAdminClient } from '@/lib/supabase'
import { BarChart2, TrendingUp, Package, Truck, Users, ShoppingBag, RefreshCw, Calendar } from 'lucide-react'

const sb = createAdminClient()

type RelDia = {
  totalPedidos: number
  pedidosEntregues: number
  ticketMedio: number
  receitaTotal: number
  pedidosCancelados: number
}

type MotoristaRel = { nome: string; entregues: number; emRota: number }
type VendedorRel  = { nome: string; pedidos: number; receita: number }
type StatusRel    = { status: string; label: string; count: number; cor: string }

const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  pedido_iniciado: { label: 'Novo',        cor: '#FF9500' },
  confirmando:     { label: 'Confirmando', cor: '#007AFF' },
  recebido:        { label: 'Em entrega',  cor: '#AF52DE' },
  entregue:        { label: 'Entregue',    cor: '#06C167' },
  cancelado:       { label: 'Cancelado',   cor: '#FF3B30' },
}

export default function RelatoriosPage() {
  const [data, setData] = useState('')
  const [loading, setLoading] = useState(true)
  const [relDia, setRelDia]       = useState<RelDia | null>(null)
  const [motoristas, setMotoristas] = useState<MotoristaRel[]>([])
  const [vendedores, setVendedores] = useState<VendedorRel[]>([])
  const [statusRel, setStatusRel]   = useState<StatusRel[]>([])
  const [periodo, setPeriodo]       = useState<'hoje' | '7d' | '30d'>('hoje')

  useEffect(() => { setData(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })) }, [])
  useEffect(() => { carregar() }, [periodo])

  async function carregar() {
    setLoading(true)
    const hoje = new Date()
    const inicio = new Date(hoje)
    if (periodo === '7d')  inicio.setDate(hoje.getDate() - 7)
    if (periodo === '30d') inicio.setDate(hoje.getDate() - 30)
    const dataInicio = inicio.toISOString().slice(0, 10)
    const hoje10 = hoje.toISOString().slice(0, 10)

    const [{ data: pedidos }, { data: entregas }, { data: rotasData }] = await Promise.all([
      sb.from('pedidos').select('*').gte('criado_em', dataInicio + 'T00:00:00'),
      sb.from('entregas').select('*, rotas(motorista_id)').eq('status', 'entregue').gte('hora_fim', dataInicio + 'T00:00:00'),
      sb.from('rotas').select('id, motorista_id').gte('criado_em', dataInicio + 'T00:00:00'),
    ])

    const peds = (pedidos || []) as any[]
    const total = peds.length
    const entregues = peds.filter(p => p.status === 'entregue').length
    const cancelados = peds.filter(p => p.status === 'cancelado').length
    const receita = peds
      .filter(p => p.status === 'entregue' && p.valor_total)
      .reduce((s, p) => s + parseFloat((p.valor_total || '0').replace(',', '.')), 0)
    const ticket = entregues > 0 ? receita / entregues : 0

    setRelDia({ totalPedidos: total, pedidosEntregues: entregues, ticketMedio: ticket, receitaTotal: receita, pedidosCancelados: cancelados })

    // Status distribution
    const statusCount: Record<string, number> = {}
    peds.forEach(p => { statusCount[p.status] = (statusCount[p.status] || 0) + 1 })
    const statusArr: StatusRel[] = Object.entries(statusCount).map(([status, count]) => ({
      status, count,
      label: STATUS_LABEL[status]?.label || status,
      cor:   STATUS_LABEL[status]?.cor   || '#fff',
    })).sort((a, b) => b.count - a.count)
    setStatusRel(statusArr)

    // Vendedores externos
    const vendMap: Record<string, { pedidos: number; receita: number }> = {}
    peds.filter(p => p.vendedor_nome).forEach(p => {
      const v = p.vendedor_nome
      if (!vendMap[v]) vendMap[v] = { pedidos: 0, receita: 0 }
      vendMap[v].pedidos++
      if (p.valor_total) vendMap[v].receita += parseFloat(p.valor_total.replace(',', '.'))
    })
    setVendedores(Object.entries(vendMap).map(([nome, d]) => ({ nome, ...d })).sort((a, b) => b.pedidos - a.pedidos))

    // Motoristas — entregas
    const motCount: Record<string, { entregues: number; emRota: number }> = {}
    const motIds = [...new Set((rotasData || []).map((r: any) => r.motorista_id).filter(Boolean))]
    if (motIds.length > 0) {
      const { data: usersData } = await sb.from('users').select('id, nome').in('id', motIds)
      const motNomes: Record<string, string> = {}
      ;(usersData || []).forEach((u: any) => { motNomes[u.id] = u.nome })

      const rotaMotMap: Record<string, string> = {}
      ;(rotasData || []).forEach((r: any) => { rotaMotMap[r.id] = motNomes[r.motorista_id] || 'Motorista' })

      ;(entregas || []).forEach((e: any) => {
        const rota = (e as any).rotas
        const motId = rota?.motorista_id
        if (!motId) return
        const nome = motNomes[motId] || 'Motorista'
        if (!motCount[nome]) motCount[nome] = { entregues: 0, emRota: 0 }
        motCount[nome].entregues++
      })
    }
    setMotoristas(Object.entries(motCount).map(([nome, d]) => ({ nome, ...d })).sort((a, b) => b.entregues - a.entregues))

    setLoading(false)
  }

  const fmtR = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="h-full overflow-y-auto bg-black">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-5">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2"><BarChart2 size={20} /> Relatórios Gerais</h1>
            <p className="text-xs text-white/30 mt-0.5 capitalize">{data}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-[#111] border border-white/[0.08] rounded-xl overflow-hidden">
              {(['hoje','7d','30d'] as const).map(p => (
                <button key={p} onClick={() => setPeriodo(p)}
                  className={`px-3 py-2 text-xs font-semibold transition-colors ${periodo === p ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}>
                  {p === 'hoje' ? 'Hoje' : p === '7d' ? '7 dias' : '30 dias'}
                </button>
              ))}
            </div>
            <button onClick={carregar} className="p-2 rounded-xl bg-[#111] border border-white/[0.08] text-white/40 hover:text-white transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[...Array(4)].map((_, i) => <div key={i} className="bg-[#111] rounded-2xl h-24 animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* KPIs */}
            {relDia && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { icon: Package,    label: 'Total de pedidos',  value: relDia.totalPedidos,       color: '#007AFF', fmt: String },
                  { icon: Truck,      label: 'Entregues',          value: relDia.pedidosEntregues,   color: '#06C167', fmt: String },
                  { icon: TrendingUp, label: 'Receita',            value: relDia.receitaTotal,       color: '#F59E0B', fmt: fmtR  },
                  { icon: ShoppingBag,label: 'Ticket médio',       value: relDia.ticketMedio,        color: '#AF52DE', fmt: fmtR  },
                ].map(({ icon: Icon, label, value, color, fmt }) => (
                  <div key={label} className="bg-[#111] border border-white/[0.07] rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
                        <Icon size={15} style={{ color }} />
                      </div>
                      <span className="text-xs text-white/40 leading-tight">{label}</span>
                    </div>
                    <div className="text-xl font-black text-white">{fmt(value as number)}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4 mb-4">

              {/* Status dos pedidos */}
              <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-5">
                <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Package size={14} className="text-white/40" /> Status dos pedidos</h2>
                {statusRel.length === 0 ? (
                  <p className="text-white/25 text-sm text-center py-4">Nenhum dado</p>
                ) : (
                  <div className="space-y-3">
                    {statusRel.map(s => {
                      const total = statusRel.reduce((acc, x) => acc + x.count, 0)
                      const pct = total > 0 ? Math.round((s.count / total) * 100) : 0
                      return (
                        <div key={s.status}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold" style={{ color: s.cor }}>{s.label}</span>
                            <span className="text-white/50">{s.count} · {pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: s.cor }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Entregas por motorista */}
              <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-5">
                <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Truck size={14} className="text-white/40" /> Entregas por motorista</h2>
                {motoristas.length === 0 ? (
                  <p className="text-white/25 text-sm text-center py-4">Nenhuma entrega no período</p>
                ) : (
                  <div className="space-y-3">
                    {motoristas.map((m, i) => (
                      <div key={m.nome} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#06C167]/15 flex items-center justify-center text-[11px] font-bold text-[#06C167] shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{m.nome}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-black text-[#06C167]">{m.entregues}</div>
                          <div className="text-[10px] text-white/30">entregas</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pedidos por vendedor externo */}
              <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-5">
                <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Users size={14} className="text-white/40" /> Pedidos por vendedor externo</h2>
                {vendedores.length === 0 ? (
                  <p className="text-white/25 text-sm text-center py-4">Nenhum pedido externo no período</p>
                ) : (
                  <div className="space-y-3">
                    {vendedores.map((v, i) => (
                      <div key={v.nome} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#FF9500]/15 flex items-center justify-center text-[11px] font-bold text-[#FF9500] shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{v.nome}</div>
                          <div className="text-[10px] text-white/30">{v.pedidos} pedido{v.pedidos !== 1 ? 's' : ''}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-[#F59E0B]">{fmtR(v.receita)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resumo cancelados */}
              {relDia && (
                <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-5 flex flex-col justify-between">
                  <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Calendar size={14} className="text-white/40" /> Resumo do período</h2>
                  <div className="space-y-3">
                    {[
                      { label: 'Total de pedidos',        value: relDia.totalPedidos,             color: '#007AFF' },
                      { label: 'Entregues com sucesso',   value: relDia.pedidosEntregues,         color: '#06C167' },
                      { label: 'Cancelados',              value: relDia.pedidosCancelados,        color: '#FF3B30' },
                      { label: 'Taxa de entrega',
                        value: relDia.totalPedidos > 0
                          ? `${Math.round((relDia.pedidosEntregues / relDia.totalPedidos) * 100)}%`
                          : '—',
                        color: '#AF52DE' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span className="text-white/40">{label}</span>
                        <span className="font-bold" style={{ color }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
