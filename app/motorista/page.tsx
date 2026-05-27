'use client'
import { useEffect, useState, useRef } from 'react'
import { Navigation2, MapPin, CheckCircle2, AlertCircle, Wifi, WifiOff, Cpu } from 'lucide-react'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export default function MotoristaPage() {
  const [nome, setNome] = useState('')
  const [motoristaId, setMotoristaId] = useState('')
  const [ativo, setAtivo] = useState(false)
  const [posicao, setPosicao] = useState<{ lat: number; lng: number } | null>(null)
  const [erro, setErro] = useState('')
  const [enviados, setEnviados] = useState(0)
  const [ultimoEnvio, setUltimoEnvio] = useState('')
  const [swPronto, setSwPronto] = useState(false)
  const [wakeLock, setWakeLock] = useState(false)

  const swRef = useRef<ServiceWorker | null>(null)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const watchRef = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const n = localStorage.getItem('motorista_nome') || ''
    const id = localStorage.getItem('motorista_id') || crypto.randomUUID()
    setNome(n); setMotoristaId(id)
    localStorage.setItem('motorista_id', id)
    registrarSW()
  }, [])

  useEffect(() => {
    function onSwMessage(e: MessageEvent) {
      if (e.data?.type === 'REQUEST_POSITION') {
        navigator.geolocation.getCurrentPosition(pos => {
          const { latitude: lat, longitude: lng } = pos.coords
          setPosicao({ lat, lng })
          swRef.current?.postMessage({ type: 'SEND_POSITION', lat, lng, motoristaId, nome: nome || 'Motorista', supabaseUrl: SB_URL, supabaseKey: SB_KEY })
        }, () => {}, { enableHighAccuracy: true, maximumAge: 10000 })
      }
    }
    navigator.serviceWorker?.addEventListener('message', onSwMessage)
    return () => navigator.serviceWorker?.removeEventListener('message', onSwMessage)
  }, [motoristaId, nome])

  async function registrarSW() {
    if (!('serviceWorker' in navigator)) return
    try {
      const reg = await navigator.serviceWorker.register('/sw-gps.js', { scope: '/' })
      await navigator.serviceWorker.ready
      swRef.current = reg.active
      setSwPronto(true)
    } catch {}
  }

  async function ativarWakeLock() {
    if (!('wakeLock' in navigator)) return
    try {
      wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
      setWakeLock(true)
      wakeLockRef.current!.addEventListener('release', () => setWakeLock(false))
    } catch {}
  }

  async function enviarPosicao(lat: number, lng: number) {
    setPosicao({ lat, lng })
    try {
      const res = await fetch(`${SB_URL}/rest/v1/rastreamento_gps`, {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ motorista_id: motoristaId, nome_motorista: nome || 'Motorista', latitude: lat.toString(), longitude: lng.toString(), timestamp: new Date().toISOString() }),
      })
      if (res.ok || res.status === 201) {
        setEnviados(n => n + 1)
        setUltimoEnvio(new Date().toLocaleTimeString('pt-BR'))
      }
    } catch {}
  }

  async function iniciar() {
    if (!nome.trim()) { setErro('Digite seu nome antes de iniciar'); return }
    localStorage.setItem('motorista_nome', nome)
    setErro('')
    if (!navigator.geolocation) { setErro('GPS não disponível neste dispositivo'); return }
    setAtivo(true)
    await ativarWakeLock()

    watchRef.current = navigator.geolocation.watchPosition(
      pos => enviarPosicao(pos.coords.latitude, pos.coords.longitude),
      err => setErro('Erro GPS: ' + err.message),
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        pos => enviarPosicao(pos.coords.latitude, pos.coords.longitude),
        () => {}, { enableHighAccuracy: true, maximumAge: 10000 }
      )
    }, 10000)

    const sw = (await navigator.serviceWorker.ready).active
    swRef.current = sw
    sw?.postMessage({ type: 'START_GPS', motoristaId, nome: nome || 'Motorista', supabaseUrl: SB_URL, supabaseKey: SB_KEY })
  }

  function parar() {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    swRef.current?.postMessage({ type: 'STOP_GPS' })
    wakeLockRef.current?.release().catch(() => {})
    setWakeLock(false)
    setAtivo(false)
  }

  useEffect(() => () => { parar() }, [])

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm space-y-4">
        {/* Header */}
        <div className="text-center mb-2">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-3xl mx-auto mb-4">🚚</div>
          <h1 className="text-2xl font-bold text-white">App Motorista</h1>
          <p className="text-sm text-white/30 mt-1">Italiano · Rastreamento GPS</p>
        </div>

        {/* Status principal */}
        <div className={`rounded-2xl border px-5 py-4 flex items-center gap-4 transition-all ${
          ativo ? 'bg-[#06C167]/8 border-[#06C167]/20' : 'bg-[#111] border-white/[0.06]'
        }`}>
          {ativo
            ? <Wifi size={22} className="text-[#06C167] shrink-0" />
            : <WifiOff size={22} className="text-white/30 shrink-0" />
          }
          <div className="flex-1">
            <div className={`text-sm font-bold ${ativo ? 'text-[#06C167]' : 'text-white/50'}`}>
              {ativo ? 'Rastreamento ativo' : 'Rastreamento pausado'}
            </div>
            {ativo && ultimoEnvio && (
              <div className="text-xs text-[#06C167]/60 mt-0.5">
                Último envio: {ultimoEnvio} · {enviados} posições enviadas
              </div>
            )}
          </div>
          {wakeLock && (
            <div className="text-[#007AFF]" title="Tela bloqueada — Wake Lock ativo">
              <Cpu size={14} />
            </div>
          )}
        </div>

        {/* Service Worker badge */}
        {swPronto && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#007AFF]/8 border border-[#007AFF]/15">
            <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF] animate-pulse shrink-0" />
            <span className="text-xs text-[#007AFF] font-medium">Service Worker ativo — funciona em background</span>
          </div>
        )}

        {/* Posição */}
        {posicao && (
          <div className="bg-[#111] border border-white/[0.06] rounded-2xl px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.08] flex items-center justify-center shrink-0">
              <MapPin size={16} className="text-[#06C167]" />
            </div>
            <div>
              <div className="text-xs text-white/30 mb-0.5">Posição atual</div>
              <div className="text-sm text-white font-mono font-bold">
                {posicao.lat.toFixed(5)}, {posicao.lng.toFixed(5)}
              </div>
            </div>
          </div>
        )}

        {/* Formulário */}
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">Seu nome</label>
            <input
              value={nome} onChange={e => setNome(e.target.value)} disabled={ativo}
              placeholder="João Silva"
              className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 disabled:opacity-40 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wide mb-2">ID do motorista</label>
            <input value={motoristaId.slice(0, 20) + '...'} readOnly
              className="w-full bg-black border border-white/[0.04] rounded-xl px-4 py-3 text-xs text-white/25 font-mono"
            />
          </div>

          {erro && (
            <div className="flex items-center gap-2.5 text-xs text-[#FF3B30] bg-[#FF3B30]/8 border border-[#FF3B30]/20 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="shrink-0" /> {erro}
            </div>
          )}

          {!ativo ? (
            <button onClick={iniciar}
              className="w-full bg-[#06C167] hover:bg-[#05b05a] text-black font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
              <Navigation2 size={18} /> Iniciar rastreamento
            </button>
          ) : (
            <button onClick={parar}
              className="w-full bg-[#FF3B30] hover:bg-[#e03528] text-white font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
              <CheckCircle2 size={18} /> Parar rastreamento
            </button>
          )}
        </div>

        <p className="text-xs text-white/20 text-center px-4 leading-relaxed">
          O GPS continua enviando mesmo com a tela bloqueada via Service Worker. Adicione ao início para melhor desempenho.
        </p>
      </div>
    </div>
  )
}
