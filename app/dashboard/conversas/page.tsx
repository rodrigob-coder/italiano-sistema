'use client'
import { useEffect, useState, useRef } from 'react'
import { createAdminClient } from '@/lib/supabase'
import { createClient } from '@/lib/supabase'
import { MessageSquare, Search, Bot, User, Phone, ArrowLeft, UserCheck, RotateCcw, Send } from 'lucide-react'

const sb = createAdminClient()

type Msg = {
  id: string; numero_telefone: string
  mensagem_entrada: string | null; mensagem_saida: string | null
  status: string | null; atendente_responsavel: string | null
  criado_em: string; ordem_mensagens: number
}
type Conversa = { telefone: string; mensagens: Msg[]; ultima: string; emAtendimentoHumano: boolean }

function fmtTel(tel: string) {
  const d = tel.replace(/\D/g, '')
  if (d.length >= 13) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`
  return tel
}
function fmtData(s: string) { return s ? s.replace('T', ' ').slice(0, 16) : '' }
function hora(s: string) { return s ? s.slice(11, 16) : '' }

export default function ConversasPage() {
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const [filtro, setFiltro] = useState('')
  const [nomeUsuario, setNomeUsuario] = useState('Atendente')
  const [loading, setLoading] = useState(false)
  const [textoMsg, setTextoMsg] = useState('')
  const [enviandoMsg, setEnviandoMsg] = useState(false)
  const msgEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setNomeUsuario(user.email.split('@')[0])
    })
    carregar()
    const canal = sb.channel('msgs-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_whatsapp' }, carregar)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensagens_whatsapp' }, carregar)
      .subscribe()
    return () => { sb.removeChannel(canal) }
  }, [])

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selecionada, conversas])

  async function carregar() {
    const { data } = await sb.from('mensagens_whatsapp')
      .select('*')
      .order('criado_em', { ascending: true })
      .limit(500)
    const agrupado: Record<string, Msg[]> = {}
    ;(data || []).forEach((m: Msg) => {
      if (!agrupado[m.numero_telefone]) agrupado[m.numero_telefone] = []
      agrupado[m.numero_telefone].push(m)
    })
    const lista: Conversa[] = Object.entries(agrupado).map(([tel, msgs]) => {
      const ultima = msgs.at(-1)
      const emAtendimentoHumano = ultima?.atendente_responsavel
        ? ultima.atendente_responsavel !== 'bot' && ultima.atendente_responsavel !== ''
        : false
      return { telefone: tel, mensagens: msgs, ultima: ultima?.criado_em || '', emAtendimentoHumano }
    }).sort((a, b) => b.ultima.localeCompare(a.ultima))
    setConversas(lista)
    if (!selecionada && lista.length > 0) setSelecionada(lista[0].telefone)
  }

  async function assumirAtendimento(telefone: string) {
    setLoading(true)
    // Update all messages from this phone to mark as human-attended
    await sb.from('mensagens_whatsapp')
      .update({ atendente_responsavel: nomeUsuario })
      .eq('numero_telefone', telefone)
    carregar()
    setLoading(false)
  }

  async function retornarParaBot(telefone: string) {
    setLoading(true)
    await sb.from('mensagens_whatsapp')
      .update({ atendente_responsavel: 'bot' })
      .eq('numero_telefone', telefone)
    carregar()
    setLoading(false)
  }

  async function enviarMensagem(telefone: string) {
    const texto = textoMsg.trim()
    if (!texto || enviandoMsg) return
    setEnviandoMsg(true)
    await sb.from('mensagens_whatsapp').insert({
      numero_telefone: telefone,
      mensagem_entrada: null,
      mensagem_saida: texto,
      atendente_responsavel: nomeUsuario,
      status: 'enviado',
      criado_em: new Date().toISOString(),
      ordem_mensagens: Date.now(),
    })
    setTextoMsg('')
    setEnviandoMsg(false)
    await carregar()
  }

  const filtradas = conversas.filter(c => c.telefone.includes(filtro))
  const atual = conversas.find(c => c.telefone === selecionada)

  return (
    <div className="h-full flex bg-black overflow-hidden">
      {/* Lista de conversas */}
      <div className={`${selecionada ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 md:shrink-0 border-r border-white/[0.06] bg-[#0a0a0a]`}>
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={15} className="text-white/40" />
              <span className="font-bold text-sm text-white">Conversas</span>
            </div>
            <span className="text-xs text-white/25 bg-white/[0.06] px-2 py-0.5 rounded-full">{conversas.length}</span>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Buscar número..."
              className="w-full bg-[#111] border border-white/[0.08] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/20"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtradas.map(c => {
            const ativa = selecionada === c.telefone
            const ultima = c.mensagens.at(-1)
            const preview = ultima?.mensagem_entrada || ultima?.mensagem_saida || '—'
            return (
              <button key={c.telefone} onClick={() => setSelecionada(c.telefone)}
                className={`w-full text-left px-4 py-3.5 hover:bg-white/[0.03] transition-colors border-b border-white/[0.04] ${ativa ? 'bg-white/[0.05]' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center shrink-0 text-white/50"><Phone size={15} /></div>
                    {c.emAtendimentoHumano && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#007AFF] border-2 border-[#0a0a0a] flex items-center justify-center">
                        <UserCheck size={8} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className={`text-xs font-bold truncate ${ativa ? 'text-white' : 'text-white/70'}`}>{fmtTel(c.telefone)}</div>
                      <div className="text-[10px] text-white/25 shrink-0 ml-1">{hora(c.ultima)}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="text-xs text-white/30 truncate flex-1">{preview}</div>
                      {c.emAtendimentoHumano
                        ? <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#007AFF]/15 text-[#007AFF] font-bold shrink-0">Humano</span>
                        : <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/30 font-bold shrink-0">Bot</span>
                      }
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
          {filtradas.length === 0 && <div className="py-12 text-center text-xs text-white/25">Nenhuma conversa</div>}
        </div>
      </div>

      {/* Chat */}
      <div className={`${!selecionada ? 'hidden md:flex' : 'flex'} flex-1 flex-col min-w-0`}>
        {!atual ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/20">
            <MessageSquare size={32} strokeWidth={1} />
            <span className="text-sm">Selecione uma conversa</span>
          </div>
        ) : (
          <>
            <div className="px-4 md:px-5 py-3.5 border-b border-white/[0.06] flex items-center gap-3 bg-[#0a0a0a]">
              <button onClick={() => setSelecionada(null)} className="md:hidden p-1.5 rounded-lg text-white/40 hover:text-white transition-colors">
                <ArrowLeft size={18} />
              </button>
              <div className="w-9 h-9 rounded-full bg-white/[0.08] flex items-center justify-center text-white/50"><Phone size={15} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">{fmtTel(atual.telefone)}</div>
                <div className="text-xs text-white/30">{atual.mensagens.length} mensagens</div>
              </div>
              {/* Assumir / Retornar bot */}
              {atual.emAtendimentoHumano ? (
                <button
                  onClick={() => retornarParaBot(atual.telefone)}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.14] transition-all"
                >
                  <RotateCcw size={13} />
                  <span className="hidden sm:inline">Retornar para bot</span>
                  <span className="sm:hidden">Bot</span>
                </button>
              ) : (
                <button
                  onClick={() => assumirAtendimento(atual.telefone)}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-[#007AFF]/15 text-[#007AFF] hover:bg-[#007AFF]/25 transition-all"
                >
                  <UserCheck size={13} />
                  <span className="hidden sm:inline">Assumir atendimento</span>
                  <span className="sm:hidden">Assumir</span>
                </button>
              )}
              <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ml-1 ${atual.emAtendimentoHumano ? 'bg-[#007AFF]/10 text-[#007AFF]' : 'bg-[#06C167]/10 text-[#06C167]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${atual.emAtendimentoHumano ? 'bg-[#007AFF]' : 'bg-[#06C167]'}`} />
                {atual.emAtendimentoHumano ? 'Humano' : 'Bot'}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 md:px-5 py-5 space-y-4">
              {atual.mensagens.map(m => (
                <div key={m.id} className="space-y-2">
                  {m.mensagem_entrada && (
                    <div className="flex items-end gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/[0.08] flex items-center justify-center shrink-0"><User size={12} className="text-white/40" /></div>
                      <div className="max-w-[80%] md:max-w-[72%]">
                        <div className="bg-[#1a1a1a] border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-3">
                          <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">{m.mensagem_entrada}</p>
                        </div>
                        <p className="text-[10px] text-white/20 mt-1 ml-1">{fmtData(m.criado_em)}</p>
                      </div>
                    </div>
                  )}
                  {m.mensagem_saida && (
                    <div className="flex items-end gap-2 justify-end">
                      <div className="max-w-[80%] md:max-w-[72%]">
                        <div className={`rounded-2xl rounded-br-md px-4 py-3 ${m.atendente_responsavel && m.atendente_responsavel !== 'bot' ? 'bg-[#007AFF]' : 'bg-white'}`}>
                          <p className={`text-sm whitespace-pre-wrap leading-relaxed ${m.atendente_responsavel && m.atendente_responsavel !== 'bot' ? 'text-white' : 'text-black'}`}>{m.mensagem_saida}</p>
                        </div>
                        <div className="flex items-center justify-end gap-1 mt-1 mr-1">
                          <p className="text-[10px] text-white/20">{fmtData(m.criado_em)}</p>
                          {m.atendente_responsavel && m.atendente_responsavel !== 'bot'
                            ? <><UserCheck size={10} className="text-[#007AFF]/50" /><p className="text-[10px] text-[#007AFF]/50">{m.atendente_responsavel}</p></>
                            : <><Bot size={10} className="text-white/20" /><p className="text-[10px] text-white/20">bot</p></>
                          }
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={msgEndRef} />
            </div>

            <div className="px-4 md:px-5 py-3 border-t border-white/[0.06] bg-[#0a0a0a]">
              {atual.emAtendimentoHumano ? (
                <div className="flex items-end gap-2">
                  <textarea
                    value={textoMsg}
                    onChange={e => setTextoMsg(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(atual.telefone) } }}
                    placeholder="Digite uma mensagem..."
                    rows={2}
                    className="flex-1 bg-[#111] border border-white/[0.1] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#007AFF]/40 resize-none transition-colors"
                  />
                  <button
                    onClick={() => enviarMensagem(atual.telefone)}
                    disabled={!textoMsg.trim() || enviandoMsg}
                    className="w-10 h-10 rounded-xl bg-[#007AFF] flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-[#0070e0] transition-colors mb-0.5"
                  >
                    <Send size={16} className="text-white" />
                  </button>
                </div>
              ) : (
                <div className="bg-[#111] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white/20 flex items-center gap-2">
                  <Bot size={14} />
                  Respostas gerenciadas pelo bot via n8n
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
