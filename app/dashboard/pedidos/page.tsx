'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ShoppingBag, Search, Phone, Calendar, CreditCard } from 'lucide-react'

type Pedido = {
  id: string; status: string; valor_total: string | null; forma_pagamento: string | null
  data_entrega_solicitada: string | null; hora_entrega: string | null; criado_em: string
  cliente_id: string | null; observacoes: string | null; Urgencia_do_pedido: string | null
}

const STATUS_FLOW = ['pedido_iniciado','confirmando','recebido','entregue','cancelado']
const statusCor: Record<string, string> = {
  pedido_iniciado: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  confirmando:     'bg-blue-500/15 text-blue-400 border-blue-500/30',
  recebido:        'bg-violet-500/15 text-violet-400 border-violet-500/30',
  entregue:        'bg-green-500/15 text-green-400 border-green-500/30',
  cancelado:       'bg-red-500/15 text-red-400 border-red-500/30',
}

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [filtro, setFiltro] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('todos')
  const [selecionado, setSelecionado] = useState<Pedido | null>(null)
  const sb = createClient()

  useEffect(() => {
    carregar()
    const canal = sb.channel('pedidos-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, carregar)
      .subscribe()
    return () => { sb.removeChannel(canal) }
  }, [])

  async function carregar() {
    const { data } = await sb.from('pedidos').select('*').order('criado_em', { ascending: false })
    setPedidos((data || []) as Pedido[])
  }

  async function atualizarStatus(id: string, status: string) {
    await sb.from('pedidos').update({ status }).eq('id', id)
    carregar()
    if (selecionado?.id === id) setSelecionado(prev => prev ? { ...prev, status } : null)
  }

  const filtrados = pedidos.filter(p => {
    const matchStatus = statusFiltro === 'todos' || p.status === statusFiltro
    const matchBusca = !filtro || p.id.includes(filtro) || p.cliente_id?.includes(filtro) || false
    return matchStatus && matchBusca
  })

  return (
    <div className="flex h-full">
      {/* Lista */}
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        <div>
          <h1 className="text-lg font-bold text-white">Pedidos</h1>
          <p className="text-sm text-zinc-500">{pedidos.length} pedidos totais</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {['todos',...STATUS_FLOW].map(s => (
            <button key={s} onClick={() => setStatusFiltro(s)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                statusFiltro === s
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'bg-[#161616] border-[#222] text-zinc-400 hover:text-white'
              }`}
            >
              {s === 'todos' ? 'Todos' : s.replace('_',' ')}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={filtro} onChange={e => setFiltro(e.target.value)}
            placeholder="Buscar por ID..."
            className="w-full bg-[#161616] border border-[#222] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
          />
        </div>

        <div className="space-y-2">
          {filtrados.map(p => (
            <button key={p.id} onClick={() => setSelecionado(p)}
              className={`w-full text-left bg-[#161616] border rounded-xl p-4 hover:border-violet-500/30 transition-colors ${selecionado?.id === p.id ? 'border-violet-500/50' : 'border-[#222]'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={14} className="text-violet-400" />
                  <span className="text-sm font-mono text-white">#{p.id.slice(0,8)}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusCor[p.status] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                  {p.status?.replace('_',' ')}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1"><Calendar size={11} />{p.criado_em?.slice(0,10)}</span>
                {p.valor_total && <span className="text-green-400 font-semibold">R$ {p.valor_total}</span>}
                {p.Urgencia_do_pedido && <span className="text-orange-400">⚡ Urgente</span>}
              </div>
            </button>
          ))}
          {filtrados.length === 0 && <div className="text-center py-8 text-sm text-zinc-500">Nenhum pedido encontrado</div>}
        </div>
      </div>

      {/* Detalhe */}
      {selecionado && (
        <div className="w-80 shrink-0 border-l border-[#1e1e1e] p-5 overflow-y-auto space-y-5">
          <div>
            <div className="text-xs text-zinc-500 mb-1">Pedido</div>
            <div className="font-mono text-sm text-white">{selecionado.id}</div>
          </div>

          {/* Alterar status */}
          <div>
            <div className="text-xs font-semibold text-zinc-400 mb-2">Alterar status</div>
            <div className="space-y-1.5">
              {STATUS_FLOW.map(s => (
                <button key={s} onClick={() => atualizarStatus(selecionado.id, s)}
                  className={`w-full text-left text-xs px-3 py-2 rounded-lg border font-medium transition-colors ${
                    selecionado.status === s ? statusCor[s] : 'bg-[#141414] border-[#222] text-zinc-400 hover:text-white'
                  }`}
                >
                  {s === selecionado.status ? '✓ ' : ''}{s.replace('_',' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Infos */}
          <div className="space-y-3">
            {[
              { icon: Calendar, label: 'Criado em', value: selecionado.criado_em?.slice(0,16).replace('T',' ') },
              { icon: Calendar, label: 'Entrega', value: selecionado.data_entrega_solicitada },
              { icon: CreditCard, label: 'Pagamento', value: selecionado.forma_pagamento },
              { icon: Phone, label: 'Cliente ID', value: selecionado.cliente_id?.slice(0,12) },
            ].filter(f => f.value).map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-2.5">
                <Icon size={13} className="text-zinc-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-zinc-500">{label}</div>
                  <div className="text-xs text-white">{value}</div>
                </div>
              </div>
            ))}
            {selecionado.observacoes && (
              <div className="bg-[#141414] border border-[#222] rounded-lg p-3">
                <div className="text-xs text-zinc-500 mb-1">Observações</div>
                <div className="text-xs text-white">{selecionado.observacoes}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
