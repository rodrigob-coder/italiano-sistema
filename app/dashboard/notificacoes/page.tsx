'use client'
import { useEffect, useState } from 'react'
import { createAdminClient } from '@/lib/supabase'
import { Bell, Send, Users, User, Trash2, Search } from 'lucide-react'

const sb = createAdminClient()

type Cliente = { id: string; nome_empresa: string; telefone: string }
type Notif = { id: string; titulo: string; mensagem: string; lido: boolean; criado_em: string; cliente_id: string | null }

export default function NotificacoesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [busca, setBusca] = useState('')
  const [destino, setDestino] = useState<'todos' | string>('todos')
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    sb.from('clientes').select('id, nome_empresa, telefone').order('nome_empresa').then(({ data }) => setClientes((data || []) as Cliente[]))
    carregarNotifs()
  }, [])

  async function carregarNotifs() {
    const { data } = await sb.from('notificacoes').select('*').order('criado_em', { ascending: false }).limit(50)
    setNotifs((data || []) as Notif[])
  }

  async function enviar() {
    if (!titulo.trim() || !mensagem.trim()) { setToast('Preencha título e mensagem'); return }
    setEnviando(true)

    const row: Record<string, unknown> = {
      titulo:    titulo.trim(),
      mensagem:  mensagem.trim(),
      lido:      false,
      criado_em: new Date().toISOString(),
    }

    if (destino === 'todos') {
      // Insert one broadcast notification (cliente_id = null)
      row.cliente_id = null
    } else {
      row.cliente_id = destino
    }

    const { error } = await sb.from('notificacoes').insert(row)
    setEnviando(false)
    if (error) { setToast('Erro: ' + error.message); return }

    setTitulo('')
    setMensagem('')
    setDestino('todos')
    setToast('Notificação enviada!')
    carregarNotifs()
    setTimeout(() => setToast(''), 3000)
  }

  async function excluir(id: string) {
    await sb.from('notificacoes').delete().eq('id', id)
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  function fmtData(d: string) {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const clisFiltrados = clientes.filter(c =>
    c.nome_empresa.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone.includes(busca)
  )

  const destinoLabel = destino === 'todos'
    ? 'Todos os clientes'
    : clientes.find(c => c.id === destino)?.nome_empresa || 'Cliente selecionado'

  return (
    <div className="h-full flex flex-col bg-black">
      <div className="px-4 md:px-6 py-4 md:py-5 border-b border-white/[0.07]">
        <h1 className="text-xl font-bold text-white">Notificações</h1>
        <p className="text-xs text-white/30 mt-0.5">Envie avisos para clientes da loja</p>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">

        {/* Compose */}
        <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Bell size={16} className="text-white/40" /> Nova notificação
          </h2>

          {/* Destinatário */}
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wide block mb-2">Destinatário</label>
            <div className="flex gap-2 mb-2">
              <button onClick={() => setDestino('todos')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                  destino === 'todos' ? 'bg-white text-black border-white' : 'bg-white/[0.05] border-white/[0.08] text-white/50 hover:text-white'
                }`}>
                <Users size={13} /> Todos
              </button>
              <button onClick={() => setDestino('')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                  destino !== 'todos' ? 'bg-white text-black border-white' : 'bg-white/[0.05] border-white/[0.08] text-white/50 hover:text-white'
                }`}>
                <User size={13} /> Cliente específico
              </button>
            </div>

            {destino !== 'todos' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-3 py-2">
                  <Search size={13} className="text-white/25" />
                  <input value={busca} onChange={e => setBusca(e.target.value)}
                    placeholder="Buscar cliente..." className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none" />
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl border border-white/[0.06] bg-[#1a1a1a] p-1.5">
                  {clisFiltrados.slice(0, 20).map(c => (
                    <button key={c.id} onClick={() => { setDestino(c.id); setBusca('') }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                        destino === c.id ? 'bg-white text-black' : 'text-white/70 hover:bg-white/[0.06]'
                      }`}>
                      <span className="font-semibold">{c.nome_empresa}</span>
                      <span className="text-xs ml-2 opacity-50">{c.telefone}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {destino && destino !== 'todos' && (
              <p className="text-xs text-[#06C167] font-semibold mt-1">✓ {destinoLabel}</p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wide block mb-2">Título</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Promoção especial hoje!" maxLength={80}
              className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wide block mb-2">Mensagem</label>
            <textarea value={mensagem} onChange={e => setMensagem(e.target.value)}
              placeholder="Escreva a mensagem para os clientes..." rows={3} maxLength={500}
              className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors resize-none"
            />
            <p className="text-right text-xs text-white/20 mt-1">{mensagem.length}/500</p>
          </div>

          <button onClick={enviar} disabled={enviando || !titulo.trim() || !mensagem.trim() || (destino !== 'todos' && !destino)}
            className="flex items-center gap-2 justify-center w-full py-3 rounded-xl font-bold text-sm bg-white text-black hover:bg-white/90 disabled:bg-white/20 disabled:text-white/30 transition-colors">
            <Send size={15} />
            {enviando ? 'Enviando...' : 'Enviar notificação'}
          </button>
        </div>

        {/* History */}
        <div>
          <h2 className="text-sm font-bold text-white/60 mb-3">Enviadas recentemente</h2>
          {notifs.length === 0 ? (
            <p className="text-white/25 text-sm text-center py-8">Nenhuma notificação enviada</p>
          ) : (
            <div className="space-y-2">
              {notifs.map(n => {
                const dest = n.cliente_id
                  ? clientes.find(c => c.id === n.cliente_id)?.nome_empresa || 'Cliente'
                  : 'Todos'
                return (
                  <div key={n.id} className="bg-[#111] border border-white/[0.06] rounded-xl px-4 py-3 flex items-start gap-3 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-white truncate">{n.titulo}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/30 shrink-0">→ {dest}</span>
                      </div>
                      <p className="text-xs text-white/40 line-clamp-1">{n.mensagem}</p>
                      <p className="text-[10px] text-white/20 mt-1">{fmtData(n.criado_em)}</p>
                    </div>
                    <button onClick={() => excluir(n.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/30 hover:text-[#EF233C] hover:bg-[#EF233C]/10 transition-all shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#06C167] text-black text-sm font-bold px-5 py-3 rounded-xl shadow-2xl z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
