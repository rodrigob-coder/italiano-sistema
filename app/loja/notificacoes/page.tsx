'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCliente } from '@/lib/clienteContext'
import { createAdminClient } from '@/lib/supabase'
import { ArrowLeft, Bell, BellOff, X } from 'lucide-react'

const sb = createAdminClient()

type Notif = {
  id: string
  titulo: string
  mensagem: string
  lido: boolean
  criado_em: string
  cliente_id: string | null
}

export default function NotificacoesPage() {
  const router = useRouter()
  const { cliente } = useCliente()
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const [popup, setPopup] = useState<Notif | null>(null)

  useEffect(() => { carregar() }, [cliente])

  async function carregar() {
    setLoading(true)
    let q = sb.from('notificacoes').select('*').order('criado_em', { ascending: false })
    if (cliente) {
      q = q.or(`cliente_id.eq.${cliente.id},cliente_id.is.null`)
    } else {
      q = q.is('cliente_id', null)
    }
    const { data } = await q
    setNotifs((data || []) as Notif[])
    setLoading(false)
  }

  async function marcarLida(id: string) {
    await sb.from('notificacoes').update({ lido: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, lido: true } : n))
  }

  async function marcarTodasLidas() {
    const ids = notifs.filter(n => !n.lido).map(n => n.id)
    if (ids.length === 0) return
    await sb.from('notificacoes').update({ lido: true }).in('id', ids)
    setNotifs(prev => prev.map(n => ({ ...n, lido: true })))
  }

  function fmtData(d: string) {
    const dt = new Date(d)
    const now = new Date()
    const diff = now.getTime() - dt.getTime()
    if (diff < 60000) return 'agora'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`
    return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  const naoLidas = notifs.filter(n => !n.lido).length

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="sticky top-0 z-40 bg-[#080808]/95 backdrop-blur-md border-b border-white/[0.06] px-4 pt-14 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-[#141414] border border-white/[0.08] flex items-center justify-center">
              <ArrowLeft size={18} className="text-white/70" />
            </button>
            <div>
              <h1 className="text-white font-black text-lg">Notificações</h1>
              {naoLidas > 0 && <p className="text-white/35 text-xs">{naoLidas} não lida{naoLidas > 1 ? 's' : ''}</p>}
            </div>
          </div>
          {naoLidas > 0 && (
            <button onClick={marcarTodasLidas} className="text-[#EF233C] text-xs font-bold">
              Marcar todas
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-2">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#141414] rounded-2xl h-20 animate-pulse" />
          ))
        ) : notifs.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-4">
            <BellOff size={44} className="text-white/10" strokeWidth={1} />
            <p className="text-white/30 text-sm">Nenhuma notificação</p>
          </div>
        ) : (
          notifs.map(n => (
            <button
              key={n.id}
              onClick={() => { setPopup(n); if (!n.lido) marcarLida(n.id) }}
              className={`w-full text-left rounded-2xl p-4 border transition-all active:scale-[0.99] ${
                n.lido
                  ? 'bg-[#141414] border-white/[0.04]'
                  : 'bg-[#1a1010] border-[#EF233C]/20'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  n.lido ? 'bg-white/[0.06]' : 'bg-[#EF233C]/15'
                }`}>
                  <Bell size={16} className={n.lido ? 'text-white/30' : 'text-[#EF233C]'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-bold truncate ${n.lido ? 'text-white/60' : 'text-white'}`}>
                      {n.titulo || 'Notificação'}
                    </p>
                    <span className="text-white/25 text-[10px] shrink-0">{fmtData(n.criado_em)}</span>
                  </div>
                  <p className={`text-xs mt-0.5 leading-relaxed line-clamp-2 ${n.lido ? 'text-white/30' : 'text-white/60'}`}>
                    {n.mensagem}
                  </p>
                  {!n.lido && (
                    <span className="inline-block mt-1.5 text-[9px] font-bold text-[#EF233C] uppercase tracking-wide">
                      toque para abrir
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Popup de notificação */}
      {popup && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-6 sm:pb-0"
          onClick={() => setPopup(null)}>
          <div className="bg-[#1a1a1a] border border-white/[0.1] rounded-3xl w-full max-w-sm p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EF233C]/15 flex items-center justify-center">
                <Bell size={22} className="text-[#EF233C]" />
              </div>
              <button onClick={() => setPopup(null)} className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/[0.08] transition-colors">
                <X size={18} />
              </button>
            </div>
            <h2 className="text-white font-black text-lg leading-tight mb-2">{popup.titulo || 'Notificação'}</h2>
            <p className="text-white/60 text-sm leading-relaxed mb-5">{popup.mensagem}</p>
            <div className="flex items-center justify-between">
              <span className="text-white/25 text-xs">{fmtData(popup.criado_em)}</span>
              <button onClick={() => setPopup(null)}
                className="bg-[#EF233C] text-white text-sm font-bold px-5 py-2.5 rounded-xl">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
