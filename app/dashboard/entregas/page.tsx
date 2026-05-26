'use client'
import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase'
import { MapPin, Truck, RefreshCw, Clock, CheckCircle, Navigation } from 'lucide-react'

const MapaEntregas = dynamic(() => import('@/components/MapaEntregas'), { ssr: false, loading: () => (
  <div className="w-full h-[480px] bg-[#141414] rounded-xl flex items-center justify-center">
    <span className="text-zinc-500 text-sm">Carregando mapa...</span>
  </div>
)})

type Motorista = { id: string; nome: string; lat: number; lng: number; atualizado_em: string }
type Entrega   = { id: string; destino_lat: number; destino_lng: number; endereco: string; status: string; motorista_nome?: string }

export default function EntregasPage() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string>('')
  const sb = createClient()

  const carregar = useCallback(async () => {
    const [{ data: gps }, { data: ent }] = await Promise.all([
      sb.from('rastreamento_gps').select('*').order('timestamp', { ascending: false }),
      sb.from('entregas').select('*, motorista_veiculo(motorista_id)').order('criado_em', { ascending: false }).limit(50),
    ])

    // Pegar última posição de cada motorista
    const porMotorista: Record<string, Motorista> = {}
    ;(gps || []).forEach((g: any) => {
      if (!porMotorista[g.motorista_id]) {
        porMotorista[g.motorista_id] = {
          id: g.motorista_id,
          nome: g.nome_motorista || `Motorista ${g.motorista_id?.slice(0,6)}`,
          lat: parseFloat(g.latitude),
          lng: parseFloat(g.longitude),
          atualizado_em: g.timestamp || g.criado_em || new Date().toISOString(),
        }
      }
    })
    setMotoristas(Object.values(porMotorista))

    setEntregas((ent || []).map((e: any) => ({
      id: e.id,
      destino_lat: parseFloat(e.latitude_destino || e.lat_destino || 0),
      destino_lng: parseFloat(e.longitude_destino || e.lng_destino || 0),
      endereco: e.endereco_destino || e.endereco || '',
      status: e.status || 'pendente',
      motorista_nome: e.motorista_id || '',
    })))

    setUltimaAtualizacao(new Date().toLocaleTimeString('pt-BR'))
  }, [])

  useEffect(() => {
    carregar()

    // Realtime GPS
    const canal = sb
      .channel('gps-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rastreamento_gps' }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entregas' }, carregar)
      .subscribe()

    const timer = setInterval(carregar, 15000) // fallback a cada 15s
    return () => { sb.removeChannel(canal); clearInterval(timer) }
  }, [carregar])

  const statusCor: Record<string, string> = {
    pendente:   'text-yellow-400 bg-yellow-500/10',
    em_rota:    'text-blue-400 bg-blue-500/10',
    entregue:   'text-green-400 bg-green-500/10',
    cancelado:  'text-red-400 bg-red-500/10',
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Entregas GPS</h1>
          <p className="text-sm text-zinc-500">Rastreamento em tempo real</p>
        </div>
        <div className="flex items-center gap-3">
          {ultimaAtualizacao && (
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Clock size={12} /> {ultimaAtualizacao}
            </span>
          )}
          <button onClick={carregar} className="flex items-center gap-1.5 text-xs bg-[#1e1e1e] border border-[#2a2a2a] text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors">
            <RefreshCw size={12} /> Atualizar
          </button>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Motoristas ativos', value: motoristas.length, icon: Truck,       cor: 'text-blue-400'   },
          { label: 'Em rota',           value: entregas.filter(e => e.status === 'em_rota').length, icon: Navigation, cor: 'text-yellow-400' },
          { label: 'Entregues hoje',    value: entregas.filter(e => e.status === 'entregue').length, icon: CheckCircle, cor: 'text-green-400' },
        ].map(({ label, value, icon: Icon, cor }) => (
          <div key={label} className="bg-[#161616] border border-[#222] rounded-xl p-4 flex items-center gap-3">
            <Icon size={20} className={cor} />
            <div>
              <div className="text-xl font-bold text-white">{value}</div>
              <div className="text-xs text-zinc-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Mapa */}
      <div className="bg-[#161616] border border-[#222] rounded-xl overflow-hidden p-3">
        <MapaEntregas motoristas={motoristas} entregas={entregas} />
      </div>

      {/* Lista de entregas */}
      <div className="bg-[#161616] border border-[#222] rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#222] flex items-center gap-2">
          <MapPin size={14} className="text-violet-400" />
          <span className="font-semibold text-sm text-white">Lista de Entregas</span>
        </div>
        <div className="divide-y divide-[#1e1e1e]">
          {entregas.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-zinc-500">Nenhuma entrega registrada</div>
          )}
          {entregas.slice(0, 20).map(e => (
            <div key={e.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.02]">
              <div>
                <div className="text-sm text-white font-medium">{e.endereco || '—'}</div>
                {e.motorista_nome && <div className="text-xs text-zinc-500">Motorista: {e.motorista_nome}</div>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCor[e.status] || 'text-zinc-400 bg-zinc-800'}`}>
                {e.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
