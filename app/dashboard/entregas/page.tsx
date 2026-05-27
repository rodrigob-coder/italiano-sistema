'use client'
import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { createAdminClient } from '@/lib/supabase'
import {
  Truck, RefreshCw, Clock, CheckCircle2, Navigation2, Plus, X,
  Zap, Package, MapPin, ChevronDown, ChevronRight, Circle,
} from 'lucide-react'
import type { RotaMapa } from '@/components/MapaEntregas'

const MapaEntregas = dynamic(() => import('@/components/MapaEntregas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#111] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-white/20">
        <MapPin size={28} strokeWidth={1} />
        <span className="text-sm">Carregando mapa...</span>
      </div>
    </div>
  ),
})

const EMPRESA_ID = 'd7366f17-abf7-4b2b-8cbe-26bb0d04aafa'
const CORES      = ['#007AFF', '#AF52DE', '#FF9500', '#5AC8FA', '#FF2D55', '#34C759']

type EntregaDetalhe = {
  id: string; pedido_id: string; rota_id: string; cliente_id: string
  numero_sequencia: number; status: string
  latitude: number | null; longitude: number | null
  endereco: string | null; hora_inicio: string | null; hora_fim: string | null
  anotacoes: string | null; telefone: string | null
  pedido?: any; cliente?: any
}

type RotaDetalhe = {
  id: string; motorista_id: string; status: string; data: string
  distancia_total: number | null; tempo_estimado: number | null
  iniciado_em: string | null
  motoristaNome: string
  motoristaLat?: number; motoristaLng?: number
  entregas: EntregaDetalhe[]
  cor: string
}

type Pedido = {
  id: string; numero_pedido: string | null; cliente_id: string | null
  status: string; valor_total: string | null; hora_entrega: string | null
  Urgencia_do_pedido: string | null; produto_pedido: string | null
}

type Motorista = { id: string; nome: string }

const STATUS_ENT: Record<string, { label: string; cor: string }> = {
  pendente:     { label: 'Pendente',    cor: '#555'     },
  em_andamento: { label: 'Em rota',     cor: '#007AFF'  },
  entregue:     { label: 'Entregue',    cor: '#06C167'  },
  cancelado:    { label: 'Cancelado',   cor: '#FF3B30'  },
}

export default function EntregasPage() {
  const [rotas,          setRotas]          = useState<RotaDetalhe[]>([])
  const [pedidosSemRota, setPedidosSemRota] = useState<Pedido[]>([])
  const [motoristas,     setMotoristas]     = useState<Motorista[]>([])
  const [cliMap,         setCliMap]         = useState<Record<string, any>>({})
  const [pedMap,         setPedMap]         = useState<Record<string, Pedido>>({})
  const [gpsMap,         setGpsMap]         = useState<Record<string, any>>({})
  const [ultima,         setUltima]         = useState('')
  const [selectedMot,   setSelectedMot]    = useState<string | null>(null)
  const [expandedRota,  setExpandedRota]   = useState<string | null>(null)
  const [modalAberto,   setModalAberto]    = useState(false)
  const [novaRota,      setNovaRota]       = useState({ motoristaId: '', pedidos: [] as string[] })
  const [criando,       setCriando]        = useState(false)
  const sb = createAdminClient()

  const carregar = useCallback(async () => {
    const [
      { data: rotasData },
      { data: entData },
      { data: pedData },
      { data: cliData },
      { data: motData },
      { data: gpsData },
    ] = await Promise.all([
      sb.from('rotas').select('*').order('criado_em', { ascending: false }),
      sb.from('entregas').select('*').order('numero_sequencia'),
      sb.from('pedidos').select('*').in('status', ['confirmando', 'recebido', 'entregue']).order('criado_em'),
      sb.from('clientes').select('*'),
      sb.from('users').select('id, nome').eq('tipo', 'motorista').eq('status', 'ativo'),
      sb.from('rastreamento_gps').select('*').order('timestamp', { ascending: false }),
    ])

    const newCliMap: Record<string, any> = {}
    ;(cliData || []).forEach((c: any) => { newCliMap[c.id] = c })

    const newPedMap: Record<string, Pedido> = {}
    ;(pedData || []).forEach((p: any) => { newPedMap[p.id] = p })

    const newGpsMap: Record<string, any> = {}
    ;(gpsData || []).forEach((g: any) => { if (!newGpsMap[g.motorista_id]) newGpsMap[g.motorista_id] = g })

    const entPorRota: Record<string, any[]> = {}
    ;(entData || []).forEach((e: any) => {
      if (!entPorRota[e.rota_id]) entPorRota[e.rota_id] = []
      entPorRota[e.rota_id].push(e)
    })

    const today = new Date().toISOString().slice(0, 10)
    const entregasPedidoIds = new Set((entData || []).map((e: any) => e.pedido_id))

    const rotasEnrich: RotaDetalhe[] = (rotasData || [])
      .filter((r: any) => r.data === today || r.status === 'em_andamento')
      .map((r: any, idx: number) => {
        const gps = newGpsMap[r.motorista_id]
        const ents = (entPorRota[r.id] || [])
          .sort((a: any, b: any) => a.numero_sequencia - b.numero_sequencia)
          .map((e: any) => ({
            ...e,
            pedido:  newPedMap[e.pedido_id],
            cliente: newCliMap[e.cliente_id],
          }))
        const motorista = (motData || []).find((m: any) => m.id === r.motorista_id)
        return {
          ...r,
          motoristaNome: motorista?.nome || 'Motorista',
          motoristaLat:  gps ? parseFloat(gps.latitude)  : undefined,
          motoristaLng:  gps ? parseFloat(gps.longitude) : undefined,
          entregas: ents,
          cor: CORES[idx % CORES.length],
        }
      })

    const semRota = (pedData || []).filter((p: any) =>
      p.status === 'confirmando' && !entregasPedidoIds.has(p.id)
    )

    setRotas(rotasEnrich)
    setPedidosSemRota(semRota)
    setMotoristas((motData || []) as Motorista[])
    setCliMap(newCliMap)
    setPedMap(newPedMap)
    setGpsMap(newGpsMap)
    setUltima(new Date().toLocaleTimeString('pt-BR'))
  }, [])

  useEffect(() => {
    carregar()
    const canal = sb.channel('entregas-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rastreamento_gps' }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entregas' },         carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rotas' },            carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' },          carregar)
      .subscribe()
    const timer = setInterval(carregar, 20000)
    return () => { sb.removeChannel(canal); clearInterval(timer) }
  }, [carregar])

  async function criarRota() {
    if (!novaRota.motoristaId || novaRota.pedidos.length === 0) return
    setCriando(true)
    const rotaId = crypto.randomUUID()
    const today  = new Date().toISOString().slice(0, 10)

    await sb.from('rotas').insert({
      id: rotaId, empresa_id: EMPRESA_ID,
      data: today, motorista_id: novaRota.motoristaId,
      status: 'em_andamento',
      iniciado_em: new Date().toISOString(),
      criado_em:   new Date().toISOString(),
    })

    const inserts = novaRota.pedidos.map((pedId, idx) => {
      const ped = pedMap[pedId]
      const cli = ped?.cliente_id ? cliMap[ped.cliente_id] : null
      const lat  = cli?.latitude  ? parseFloat(cli.latitude)  : null
      const lng  = cli?.longitude ? parseFloat(cli.longitude) : null
      const rua  = cli?.['rua/avenida'] || ''
      const num  = cli?.['numero_endereço_empresa'] || ''
      const bairro = cli?.bairro_empresa || ''
      const end  = [rua, num].filter(Boolean).join(', ') + (bairro ? ` — ${bairro}, Irati/PR` : '')
      return {
        id: crypto.randomUUID(),
        pedido_id: pedId, rota_id: rotaId,
        cliente_id: ped?.cliente_id || null,
        numero_sequencia: idx + 1,
        status: 'pendente',
        data_entrega: today,
        latitude: lat, longitude: lng,
        endereco: end || null,
        telefone: cli?.telefone || null,
        criado_em: new Date().toISOString(),
      }
    })
    await sb.from('entregas').insert(inserts)

    for (const pedId of novaRota.pedidos) {
      await sb.from('pedidos').update({ status: 'recebido', atualizado_em: new Date().toISOString() }).eq('id', pedId)
    }

    setModalAberto(false)
    setNovaRota({ motoristaId: '', pedidos: [] })
    setCriando(false)
    await carregar()
  }

  async function marcarEmAndamento(entId: string) {
    await sb.from('entregas').update({ status: 'em_andamento', hora_inicio: new Date().toISOString() }).eq('id', entId)
    await carregar()
  }

  async function marcarEntregue(entId: string, pedId: string) {
    await Promise.all([
      sb.from('entregas').update({ status: 'entregue', hora_fim: new Date().toISOString() }).eq('id', entId),
      sb.from('pedidos').update({ status: 'entregue', atualizado_em: new Date().toISOString() }).eq('id', pedId),
    ])
    await carregar()
  }

  // Map data
  const rotasMapa: RotaMapa[] = rotas.map(r => {
    const totalParadas = r.entregas.length
    const totalEntregues = r.entregas.filter(e => e.status === 'entregue').length
    const finalizada = totalParadas > 0 && totalEntregues === totalParadas
    return {
      id: r.id,
      motoristaId:   r.motorista_id,
      motoristaNome: r.motoristaNome,
      motoristaLat:  r.motoristaLat,
      motoristaLng:  r.motoristaLng,
      stops: r.entregas.map(e => ({
        seq:         e.numero_sequencia,
        lat:         typeof e.latitude  === 'number' ? e.latitude  : parseFloat(String(e.latitude  || 0)),
        lng:         typeof e.longitude === 'number' ? e.longitude : parseFloat(String(e.longitude || 0)),
        endereco:    e.endereco || '',
        clienteNome: e.cliente?.nome_empresa || 'Cliente',
        status:      e.status,
        pedidoNum:   e.pedido?.numero_pedido || `#${e.pedido_id?.slice(0, 8)}`,
      })),
      cor: r.cor,
      finalizada,
    }
  })

  const totalEntregues = rotas.flatMap(r => r.entregas).filter(e => e.status === 'entregue').length
  const totalEmRota    = rotas.flatMap(r => r.entregas).filter(e => e.status === 'em_andamento').length

  return (
    <div className="h-full flex bg-black">

      {/* ── Sidebar ── */}
      <div className="w-80 shrink-0 border-r border-white/[0.06] flex flex-col bg-[#0a0a0a] overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-base font-bold text-white">Entregas GPS</h1>
            <div className="flex items-center gap-2">
              <button onClick={carregar} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors">
                <RefreshCw size={14} />
              </button>
              <button onClick={() => setModalAberto(true)}
                className="flex items-center gap-1.5 bg-white text-black text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-white/90 transition-colors">
                <Plus size={13} /> Criar Rota
              </button>
            </div>
          </div>
          {ultima && (
            <div className="flex items-center gap-1.5 text-xs text-white/25">
              <Clock size={11} /> Atualizado {ultima}
            </div>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-px bg-white/[0.04] border-b border-white/[0.04]">
          {[
            { label: 'Rotas ativas', value: rotas.filter(r => r.status === 'em_andamento').length, icon: Truck,        cor: '#007AFF' },
            { label: 'Em rota',      value: totalEmRota,                                           icon: Navigation2,  cor: '#FF9500' },
            { label: 'Entregues',    value: totalEntregues,                                        icon: CheckCircle2, cor: '#06C167' },
          ].map(({ label, value, icon: Icon, cor }) => (
            <div key={label} className="bg-[#0a0a0a] px-2 py-3.5 flex flex-col items-center gap-1">
              <Icon size={16} style={{ color: cor }} />
              <div className="text-xl font-bold text-white">{value}</div>
              <div className="text-[10px] text-white/25 text-center leading-tight">{label}</div>
            </div>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Pedidos prontos para distribuir */}
          {pedidosSemRota.length > 0 && (
            <div className="px-4 pt-4 pb-3 border-b border-white/[0.04]">
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-xs font-semibold text-white/30 uppercase tracking-wide">Prontos para distribuir</div>
                <span className="bg-[#FF9500]/15 text-[#FF9500] text-[10px] font-bold px-2 py-0.5 rounded-full">{pedidosSemRota.length}</span>
              </div>
              <div className="space-y-1.5">
                {pedidosSemRota.map(p => {
                  const cli = p.cliente_id ? cliMap[p.cliente_id] : null
                  return (
                    <div key={p.id} className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-white">{p.numero_pedido || `#${p.id.slice(0,8)}`}</span>
                        {p.Urgencia_do_pedido && (
                          <span className="text-[9px] bg-[#FF9500]/15 text-[#FF9500] px-1.5 py-0.5 rounded-full font-bold">URGENTE</span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/50 truncate">{cli?.nome_empresa || '—'}</div>
                      {p.hora_entrega && <div className="text-[10px] text-white/25 mt-0.5">Entregar até {p.hora_entrega}</div>}
                    </div>
                  )
                })}
              </div>
              <button onClick={() => setModalAberto(true)}
                className="w-full mt-2.5 text-xs font-semibold text-[#007AFF] py-2 rounded-xl border border-[#007AFF]/20 hover:bg-[#007AFF]/[0.08] transition-colors flex items-center justify-center gap-1.5">
                <Plus size={12} /> Montar rota de entrega
              </button>
            </div>
          )}

          {/* Rotas */}
          <div className="px-4 pt-4 pb-4">
            <div className="text-xs font-semibold text-white/30 uppercase tracking-wide mb-3">Rotas de hoje</div>
            {rotas.length === 0 ? (
              <div className="text-xs text-white/20 py-8 text-center flex flex-col items-center gap-3">
                <Truck size={24} strokeWidth={1} className="text-white/10" />
                Nenhuma rota criada hoje
              </div>
            ) : (
              <div className="space-y-2">
                {rotas.map(rota => {
                  const total     = rota.entregas.length
                  const entregues = rota.entregas.filter(e => e.status === 'entregue').length
                  const expanded  = expandedRota === rota.id
                  const selMot    = selectedMot  === rota.motorista_id

                  return (
                    <div key={rota.id} className={`rounded-xl border overflow-hidden transition-all ${selMot ? 'border-white/20' : 'border-white/[0.07]'}`}>

                      {/* Rota card header */}
                      <div className="flex">
                        <button
                          onClick={() => setSelectedMot(selMot ? null : rota.motorista_id)}
                          className={`flex-1 text-left px-3.5 py-3 flex items-center gap-3 transition-colors ${selMot ? 'bg-white/[0.07]' : 'bg-white/[0.02] hover:bg-white/[0.04]'}`}
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-lg" style={{ background: rota.cor + '22' }}>
                            🚚
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-white truncate">{rota.motoristaNome}</div>
                            <div className="text-[10px] text-white/30 mt-0.5">{entregues}/{total} entregues · {STATUS_ENT[rota.status]?.label ?? rota.status}</div>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <div className="w-14 h-1.5 rounded-full bg-white/[0.1] overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: total ? `${(entregues / total) * 100}%` : '0%', background: rota.cor }} />
                            </div>
                            <div className="text-[9px] text-white/25">{total ? Math.round((entregues / total) * 100) : 0}%</div>
                          </div>
                        </button>
                        <button
                          onClick={() => setExpandedRota(expanded ? null : rota.id)}
                          className="px-3 border-l border-white/[0.06] text-white/30 hover:text-white hover:bg-white/[0.04] transition-colors">
                          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </div>

                      {/* Stops list */}
                      {expanded && (
                        <div className="border-t border-white/[0.06]">
                          {rota.entregas.map(e => {
                            const s = STATUS_ENT[e.status] || STATUS_ENT.pendente
                            return (
                              <div key={e.id} className="px-3.5 py-3 bg-black/25 border-b border-white/[0.04] last:border-b-0">
                                <div className="flex items-start gap-2.5">
                                  <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5"
                                    style={{ borderColor: s.cor, color: s.cor }}>
                                    {e.status === 'entregue' ? '✓' : e.numero_sequencia}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-semibold text-white truncate">
                                      {e.cliente?.nome_empresa || '—'}
                                      <span className="text-white/30 font-normal ml-1.5">{e.pedido?.numero_pedido || ''}</span>
                                    </div>
                                    <div className="text-[10px] text-white/30 truncate mt-0.5">{e.endereco || '—'}</div>
                                    {e.hora_inicio && (
                                      <div className="text-[10px] text-white/20 mt-0.5">
                                        {new Date(e.hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        {e.hora_fim && ` → ${new Date(e.hora_fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                                      </div>
                                    )}
                                    {e.anotacoes && <div className="text-[10px] text-[#FF9500]/70 mt-1 italic">{e.anotacoes}</div>}
                                  </div>
                                </div>

                                {/* Actions */}
                                {e.status !== 'entregue' && e.status !== 'cancelado' && (
                                  <div className="flex gap-1.5 mt-2 ml-8">
                                    {e.status === 'pendente' && (
                                      <button onClick={() => marcarEmAndamento(e.id)}
                                        className="text-[10px] px-2.5 py-1 rounded-lg font-semibold bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF]/20 transition-colors">
                                        Iniciar
                                      </button>
                                    )}
                                    <button onClick={() => marcarEntregue(e.id, e.pedido_id)}
                                      className="text-[10px] px-2.5 py-1 rounded-lg font-semibold bg-[#06C167]/10 text-[#06C167] hover:bg-[#06C167]/20 transition-colors">
                                      Marcar entregue
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          })}

                          {/* Timing footer */}
                          {rota.iniciado_em && (
                            <div className="px-3.5 py-2 bg-black/40 flex items-center gap-4">
                              <div className="text-[10px] text-white/25">
                                Saída {new Date(rota.iniciado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              {rota.tempo_estimado && (
                                <div className="text-[10px] text-white/25">~{rota.tempo_estimado}min estimado</div>
                              )}
                              {rota.distancia_total && (
                                <div className="text-[10px] text-white/25">{rota.distancia_total}km</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Map ── */}
      <div className="flex-1 relative">
        <MapaEntregas rotas={rotasMapa} selectedMotoristaId={selectedMot} />

        {/* Legend */}
        <div className="absolute top-4 left-4 bg-black/80 backdrop-blur border border-white/[0.1] rounded-xl px-4 py-3 space-y-1.5 text-[11px]">
          {rotas.map(r => (
            <div key={r.id} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.cor }} />
              <span className="text-white/60 font-medium">{r.motoristaNome}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1 border-t border-white/[0.08]">
            <div className="w-2.5 h-2.5 rounded-full bg-[#06C167] shrink-0" />
            <span className="text-white/40">Entregue</span>
            <div className="w-2.5 h-2.5 rounded-full bg-[#555] shrink-0 ml-2" />
            <span className="text-white/40">Pendente</span>
          </div>
        </div>

        {/* Live indicator */}
        <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-xs font-semibold text-[#06C167] bg-black/80 backdrop-blur px-3 py-1.5 rounded-full border border-[#06C167]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#06C167] animate-pulse" />
          Ao vivo · 20s
        </div>
      </div>

      {/* ── Modal Criar Rota ── */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-[#111] border border-white/[0.1] rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl">

            {/* Modal header */}
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <div>
                <h2 className="font-bold text-white text-base">Criar Roteiro de Entrega</h2>
                <p className="text-xs text-white/30 mt-0.5">Selecione motorista e pedidos — a sequência é a ordem de seleção</p>
              </div>
              <button onClick={() => setModalAberto(false)} className="p-2 text-white/30 hover:text-white rounded-xl hover:bg-white/[0.06]">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Selecionar motorista */}
              <div>
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wide block mb-2">Motorista</label>
                {motoristas.length === 0 ? (
                  <div className="text-sm text-white/25 py-3 text-center">Nenhum motorista cadastrado</div>
                ) : (
                  <div className="space-y-2">
                    {motoristas.map(m => {
                      const gps = gpsMap[m.id]
                      const sel = novaRota.motoristaId === m.id
                      return (
                        <button key={m.id} onClick={() => setNovaRota(prev => ({ ...prev, motoristaId: m.id }))}
                          className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                            sel ? 'bg-white border-white' : 'bg-white/[0.04] border-white/[0.08] hover:border-white/20'
                          }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 ${sel ? 'bg-black/10' : 'bg-white/[0.08]'}`}>
                            🚚
                          </div>
                          <div className="flex-1">
                            <div className={`text-sm font-semibold ${sel ? 'text-black' : 'text-white'}`}>{m.nome}</div>
                            <div className={`text-xs ${sel ? 'text-black/40' : 'text-white/30'}`}>{gps ? 'GPS ativo' : 'GPS não detectado'}</div>
                          </div>
                          {gps && <span className="w-2 h-2 rounded-full bg-[#06C167] shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Selecionar pedidos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-wide">Pedidos confirmados</label>
                  <span className="text-xs text-white/30">{novaRota.pedidos.length} selecionados</span>
                </div>
                {pedidosSemRota.length === 0 ? (
                  <div className="text-sm text-white/25 py-6 text-center flex flex-col items-center gap-2">
                    <Package size={20} className="text-white/15" />
                    Nenhum pedido confirmado disponível
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pedidosSemRota.map((p, idx) => {
                      const cli    = p.cliente_id ? cliMap[p.cliente_id] : null
                      const sel    = novaRota.pedidos.includes(p.id)
                      const seqNum = novaRota.pedidos.indexOf(p.id) + 1
                      return (
                        <button key={p.id}
                          onClick={() => setNovaRota(prev => ({
                            ...prev,
                            pedidos: sel ? prev.pedidos.filter(id => id !== p.id) : [...prev.pedidos, p.id],
                          }))}
                          className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${
                            sel ? 'bg-white/[0.08] border-white/30' : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15'
                          }`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-all mt-0.5 ${
                              sel ? 'bg-white text-black' : 'bg-white/[0.08] text-white/30'
                            }`}>
                              {sel ? seqNum : idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-white">{p.numero_pedido || `#${p.id.slice(0,8)}`}</span>
                                {p.Urgencia_do_pedido && (
                                  <span className="text-[9px] bg-[#FF9500]/15 text-[#FF9500] px-1.5 py-0.5 rounded-full font-bold">URGENTE</span>
                                )}
                                {p.valor_total && (
                                  <span className="text-xs text-[#06C167] font-semibold">R$ {p.valor_total}</span>
                                )}
                              </div>
                              <div className="text-xs text-white/50 mt-0.5">{cli?.nome_empresa || '—'}</div>
                              {cli?.['rua/avenida'] && (
                                <div className="text-[10px] text-white/25 mt-0.5 truncate">
                                  {cli['rua/avenida']}, {cli['numero_endereço_empresa']} — {cli.bairro_empresa}
                                </div>
                              )}
                              {p.produto_pedido && (
                                <div className="text-[10px] text-white/20 mt-1 truncate">{p.produto_pedido}</div>
                              )}
                            </div>
                            {p.hora_entrega && (
                              <div className="text-[10px] text-white/30 shrink-0 mt-0.5">até {p.hora_entrega}</div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-white/[0.08] flex gap-3">
              <button onClick={() => setModalAberto(false)}
                className="flex-1 py-3 rounded-xl border border-white/[0.1] text-white/50 hover:text-white hover:border-white/20 text-sm font-semibold transition-colors">
                Cancelar
              </button>
              <button onClick={criarRota}
                disabled={!novaRota.motoristaId || novaRota.pedidos.length === 0 || criando}
                className="flex-1 py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 disabled:bg-white/20 disabled:text-black/30 transition-colors">
                {criando ? 'Criando...' : `Criar rota · ${novaRota.pedidos.length} parada${novaRota.pedidos.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
