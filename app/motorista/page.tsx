'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Navigation, MapPin, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react'

export default function MotoristaPage() {
  const [nome, setNome] = useState('')
  const [motoristaId, setMotoristaId] = useState('')
  const [ativo, setAtivo] = useState(false)
  const [posicao, setPosicao] = useState<{ lat: number; lng: number } | null>(null)
  const [erro, setErro] = useState('')
  const [enviados, setEnviados] = useState(0)
  const [ultimoEnvio, setUltimoEnvio] = useState('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const watchRef = useRef<number | null>(null)
  const sb = createClient()

  // Carregar nome salvo
  useEffect(() => {
    const n = localStorage.getItem('motorista_nome') || ''
    const id = localStorage.getItem('motorista_id') || crypto.randomUUID()
    setNome(n)
    setMotoristaId(id)
    localStorage.setItem('motorista_id', id)
  }, [])

  async function enviarPosicao(lat: number, lng: number) {
    if (!motoristaId) return
    const { error } = await sb.from('rastreamento_gps').insert({
      motorista_id: motoristaId,
      nome_motorista: nome || 'Motorista',
      latitude: lat.toString(),
      longitude: lng.toString(),
      timestamp: new Date().toISOString(),
    })
    if (!error) {
      setEnviados(n => n + 1)
      setUltimoEnvio(new Date().toLocaleTimeString('pt-BR'))
    }
  }

  function iniciar() {
    if (!nome.trim()) { setErro('Digite seu nome antes de iniciar'); return }
    localStorage.setItem('motorista_nome', nome)
    setErro('')

    if (!navigator.geolocation) { setErro('GPS não disponível neste dispositivo'); return }

    setAtivo(true)
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        setPosicao({ lat, lng })
        enviarPosicao(lat, lng)
      },
      err => setErro('Erro GPS: ' + err.message),
      { enableHighAccuracy: true, maximumAge: 5000 }
    )

    // Envio forçado a cada 10s mesmo sem movimento
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(pos => {
        enviarPosicao(pos.coords.latitude, pos.coords.longitude)
      })
    }, 10000)
  }

  function parar() {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setAtivo(false)
  }

  useEffect(() => () => { parar() }, [])

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-4">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-2">🚚</div>
          <h1 className="text-xl font-bold text-white">App Motorista</h1>
          <p className="text-sm text-zinc-500">Italiano — Rastreamento GPS</p>
        </div>

        {/* Status GPS */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${ativo ? 'bg-green-500/10 border-green-500/30' : 'bg-[#161616] border-[#222]'}`}>
          {ativo ? <Wifi size={18} className="text-green-400" /> : <WifiOff size={18} className="text-zinc-500" />}
          <div>
            <div className={`text-sm font-semibold ${ativo ? 'text-green-400' : 'text-zinc-400'}`}>
              {ativo ? 'Rastreamento ativo' : 'Rastreamento pausado'}
            </div>
            {ativo && ultimoEnvio && (
              <div className="text-xs text-green-400/70">Último envio: {ultimoEnvio} · {enviados} enviados</div>
            )}
          </div>
        </div>

        {/* Posição atual */}
        {posicao && (
          <div className="bg-[#161616] border border-[#222] rounded-xl px-4 py-3 flex items-center gap-3">
            <MapPin size={18} className="text-violet-400 shrink-0" />
            <div>
              <div className="text-xs text-zinc-500 font-medium">Posição atual</div>
              <div className="text-sm text-white font-mono">{posicao.lat.toFixed(5)}, {posicao.lng.toFixed(5)}</div>
            </div>
          </div>
        )}

        {/* Formulário */}
        <div className="bg-[#161616] border border-[#222] rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Seu nome</label>
            <input
              value={nome} onChange={e => setNome(e.target.value)} disabled={ativo}
              placeholder="João Silva"
              className="w-full bg-[#141414] border border-[#242424] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">ID do motorista</label>
            <input value={motoristaId.slice(0, 18) + '...'} readOnly
              className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2.5 text-xs text-zinc-500 font-mono"
            />
          </div>

          {erro && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              <AlertCircle size={13} /> {erro}
            </div>
          )}

          {!ativo ? (
            <button onClick={iniciar} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
              <Navigation size={16} /> Iniciar rastreamento
            </button>
          ) : (
            <button onClick={parar} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
              <CheckCircle size={16} /> Parar rastreamento
            </button>
          )}
        </div>

        <p className="text-xs text-zinc-600 text-center px-2">
          Mantenha esta página aberta. O GPS envia sua posição automaticamente a cada 10 segundos para o painel do gestor.
        </p>
      </div>
    </div>
  )
}
