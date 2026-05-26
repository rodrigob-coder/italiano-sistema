'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ShoppingBag, Users, MessageSquare, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react'

type Pedido = { id: string; status: string; valor_total: string | null; criado_em: string; cliente_id: string }
type Stats = { pedidos_hoje: number; pedidos_ativos: number; clientes: number; mensagens: number }

export default function DashboardPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [stats, setStats] = useState<Stats>({ pedidos_hoje: 0, pedidos_ativos: 0, clientes: 0, mensagens: 0 })
  const sb = createClient()

  useEffect(() => {
    carregarDados()

    // Realtime — atualiza quando novo pedido chega
    const canal = sb
      .channel('pedidos-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => carregarDados())
      .subscribe()

    return () => { sb.removeChannel(canal) }
  }, [])

  async function carregarDados() {
    const [{ data: ped }, { data: cli }, { count: msgs }] = await Promise.all([
      sb.from('pedidos').select('*').order('criado_em', { ascending: false }).limit(20),
      sb.from('clientes').select('id'),
      sb.from('mensagens_whatsapp').select('*', { count: 'exact', head: true }),
    ])
    const lista = (ped || []) as Pedido[]
    setPedidos(lista)
    setStats({
      pedidos_hoje: lista.filter(p => p.criado_em?.startsWith(new Date().toISOString().slice(0,10))).length,
      pedidos_ativos: lista.filter(p => ['pedido_iniciado','confirmando'].includes(p.status)).length,
      clientes: (cli || []).length,
      mensagens: msgs || 0,
    })
  }

  const statusCor: Record<string, string> = {
    pedido_iniciado: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    confirmando:     'bg-blue-500/15 text-blue-400 border-blue-500/30',
    recebido:        'bg-green-500/15 text-green-400 border-green-500/30',
    cancelado:       'bg-red-500/15 text-red-400 border-red-500/30',
    entregue:        'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-bold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500">Visão geral em tempo real</p>
      </div>

      {/* Cards de stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pedidos hoje',   value: stats.pedidos_hoje,  icon: TrendingUp,   cor: 'text-violet-400' },
          { label: 'Ativos agora',   value: stats.pedidos_ativos, icon: Clock,       cor: 'text-yellow-400' },
          { label: 'Clientes',       value: stats.clientes,      icon: Users,        cor: 'text-blue-400'   },
          { label: 'Mensagens',      value: stats.mensagens,     icon: MessageSquare, cor: 'text-green-400' },
        ].map(({ label, value, icon: Icon, cor }) => (
          <div key={label} className="bg-[#161616] border border-[#222] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-zinc-500 font-medium">{label}</span>
              <Icon size={16} className={cor} />
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Lista de pedidos recentes */}
      <div className="bg-[#161616] border border-[#222] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#222] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={15} className="text-violet-400" />
            <span className="font-semibold text-sm text-white">Pedidos Recentes</span>
          </div>
          <span className="text-xs text-zinc-500">Atualiza automaticamente</span>
        </div>
        <div className="divide-y divide-[#1e1e1e]">
          {pedidos.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-zinc-500">Nenhum pedido ainda</div>
          )}
          {pedidos.map(p => (
            <div key={p.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
                  <ShoppingBag size={14} className="text-violet-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">#{p.id.slice(0, 8)}</div>
                  <div className="text-xs text-zinc-500">{p.criado_em?.slice(0, 16).replace('T', ' ') || '—'}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {p.valor_total && (
                  <span className="text-sm font-semibold text-white">R$ {p.valor_total}</span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusCor[p.status] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                  {p.status?.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
