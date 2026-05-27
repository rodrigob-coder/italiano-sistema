'use client'
import { useState } from 'react'
import { createAdminClient } from '@/lib/supabase'
import { Search, Package, Clock, CheckCircle2, Truck, XCircle, ChevronDown, ChevronUp } from 'lucide-react'

const STATUS: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  pedido_iniciado: { label: 'Recebido',    icon: Clock,         color: '#F59E0B', bg: '#F59E0B15' },
  confirmando:     { label: 'Confirmando', icon: Clock,         color: '#FF9500', bg: '#FF950015' },
  recebido:        { label: 'Em preparo',  icon: Package,       color: '#007AFF', bg: '#007AFF15' },
  entregue:        { label: 'Entregue',    icon: CheckCircle2,  color: '#06C167', bg: '#06C16715' },
  a_caminho:       { label: 'A caminho',   icon: Truck,         color: '#AF52DE', bg: '#AF52DE15' },
  cancelado:       { label: 'Cancelado',   icon: XCircle,       color: '#EF233C', bg: '#EF233C15' },
}

type Pedido = {
  id: string
  numero_pedido: string | null
  status: string
  valor_total: string | null
  produto_pedido: string | null
  observacoes: string | null
  criado_em: string
  forma_pagamento: string | null
}

function fmtTel(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

function PedidoCard({ p }: { p: Pedido }) {
  const [open, setOpen] = useState(false)
  const s = STATUS[p.status] || { label: p.status, icon: Clock, color: '#888', bg: '#88888815' }
  const Icon = s.icon
  const data = new Date(p.criado_em).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="bg-[#141414] border border-white/[0.06] rounded-2xl overflow-hidden">
      <button className="w-full text-left px-4 py-4 flex items-center gap-3" onClick={() => setOpen(o => !o)}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
          <Icon size={18} style={{ color: s.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold text-sm">{p.numero_pedido || `#${p.id.slice(0,8)}`}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: s.color, background: s.bg }}>
              {s.label}
            </span>
          </div>
          <p className="text-white/35 text-xs mt-0.5">{data}</p>
        </div>
        <div className="text-right shrink-0">
          {p.valor_total && (
            <p className="text-[#F59E0B] font-black text-sm">R$ {p.valor_total}</p>
          )}
          {open ? <ChevronUp size={14} className="text-white/30 ml-auto mt-1" /> : <ChevronDown size={14} className="text-white/30 ml-auto mt-1" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-white/[0.06] pt-3 space-y-2">
          {p.produto_pedido && (
            <div>
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wide mb-1">Itens</p>
              <p className="text-sm text-white/70 leading-relaxed">{p.produto_pedido}</p>
            </div>
          )}
          {p.forma_pagamento && (
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wide">Pagamento:</p>
              <p className="text-xs text-white/60 capitalize">{p.forma_pagamento.replace('_', ' ')}</p>
            </div>
          )}
          {p.observacoes && (
            <div>
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wide mb-1">Observações</p>
              <p className="text-xs text-white/50 leading-relaxed">{p.observacoes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PedidosPage() {
  const [telefone, setTelefone] = useState('')
  const [pedidos, setPedidos]   = useState<Pedido[] | null>(null)
  const [loading, setLoading]   = useState(false)
  const [erro, setErro]         = useState('')
  const sb = createAdminClient()

  async function buscar() {
    const tel = telefone.replace(/\D/g, '')
    if (tel.length < 10) { setErro('Digite um telefone válido'); return }
    setLoading(true)
    setErro('')

    const tel55 = '55' + tel
    const { data: cliData } = await sb.from('clientes').select('id').eq('telefone', tel55).maybeSingle()

    let query = sb.from('pedidos').select('id, numero_pedido, status, valor_total, produto_pedido, observacoes, criado_em, forma_pagamento')
      .order('criado_em', { ascending: false })

    if (cliData?.id) {
      query = query.eq('cliente_id', cliData.id)
    } else {
      query = query.like('observacoes', `%Tel: ${telefone}%`)
    }

    const { data, error } = await query.limit(20)
    if (error) { setErro('Erro ao buscar pedidos'); setLoading(false); return }
    setPedidos((data as Pedido[]) || [])
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#080808]/95 backdrop-blur-md border-b border-white/[0.06] px-4 pt-14 pb-4">
        <h1 className="text-white font-black text-lg">Meus pedidos</h1>
        <p className="text-white/35 text-xs mt-0.5">Acompanhe o status dos seus pedidos</p>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Busca por telefone */}
        <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5 space-y-3">
          <p className="text-white/50 text-sm">Digite o telefone usado no pedido</p>
          <div className="flex gap-2">
            <input
              value={telefone}
              onChange={e => setTelefone(fmtTel(e.target.value))}
              placeholder="(42) 99999-0000"
              type="tel"
              className="flex-1 bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors"
            />
            <button
              onClick={buscar}
              disabled={loading}
              className="px-4 py-3 rounded-xl bg-[#EF233C] text-white font-bold text-sm disabled:opacity-50 flex items-center gap-2 active:scale-[0.98] transition-transform shrink-0">
              <Search size={15} />
              {loading ? '...' : 'Buscar'}
            </button>
          </div>
          {erro && <p className="text-[#EF233C] text-xs">{erro}</p>}
        </div>

        {/* Resultados */}
        {pedidos !== null && (
          pedidos.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-white/[0.06] flex items-center justify-center">
                <Package size={28} className="text-white/20" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-white/50 font-semibold text-sm">Nenhum pedido encontrado</p>
                <p className="text-white/25 text-xs mt-1">Verifique o número de telefone</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-white/30 text-xs font-medium">{pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} encontrado{pedidos.length !== 1 ? 's' : ''}</p>
              {pedidos.map(p => <PedidoCard key={p.id} p={p} />)}
            </div>
          )
        )}

        {pedidos === null && (
          <div className="flex flex-col items-center py-16 gap-4 text-center">
            <span className="text-5xl">📋</span>
            <p className="text-white/25 text-sm leading-relaxed max-w-xs">
              Consulte seus pedidos digitando o telefone que usou no cadastro
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
