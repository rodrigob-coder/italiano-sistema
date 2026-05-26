'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { MessageSquare, Search, User } from 'lucide-react'

type Msg = {
  id: string
  numero_telefone: string
  mensagem_entrada: string | null
  mensagem_saida: string | null
  status: string | null
  atendente_responsavel: string | null
  criado_em: string
  ordem_mensagens: number
}

type Conversa = { telefone: string; mensagens: Msg[]; ultima: string; status: string }

export default function ConversasPage() {
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const [filtro, setFiltro] = useState('')
  const sb = createClient()

  useEffect(() => {
    carregar()
    const canal = sb
      .channel('msgs-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens_whatsapp' }, carregar)
      .subscribe()
    return () => { sb.removeChannel(canal) }
  }, [])

  async function carregar() {
    const { data } = await sb
      .from('mensagens_whatsapp')
      .select('*')
      .order('ordem_mensagens', { ascending: false })
      .limit(200)

    const agrupado: Record<string, Msg[]> = {}
    ;(data || []).forEach((m: Msg) => {
      if (!agrupado[m.numero_telefone]) agrupado[m.numero_telefone] = []
      agrupado[m.numero_telefone].push(m)
    })

    const lista: Conversa[] = Object.entries(agrupado).map(([tel, msgs]) => ({
      telefone: tel,
      mensagens: msgs.sort((a, b) => a.ordem_mensagens - b.ordem_mensagens),
      ultima: msgs[0]?.criado_em || '',
      status: msgs[0]?.status || '',
    })).sort((a, b) => b.ultima.localeCompare(a.ultima))

    setConversas(lista)
    if (!selecionada && lista.length > 0) setSelecionada(lista[0].telefone)
  }

  const filtradas = conversas.filter(c => c.telefone.includes(filtro))
  const atual = conversas.find(c => c.telefone === selecionada)

  function fmtTel(tel: string) {
    const d = tel.replace(/\D/g, '')
    if (d.length >= 13) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`
    return tel
  }

  function fmtData(s: string) {
    if (!s) return ''
    return s.replace('T', ' ').slice(0, 16)
  }

  return (
    <div className="h-[calc(100vh-0px)] flex">
      {/* Lista de conversas */}
      <div className="w-72 shrink-0 border-r border-[#1e1e1e] flex flex-col">
        <div className="p-4 border-b border-[#1e1e1e]">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={15} className="text-violet-400" />
            <span className="font-semibold text-sm text-white">Conversas</span>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={filtro} onChange={e => setFiltro(e.target.value)}
              placeholder="Buscar número..."
              className="w-full bg-[#141414] border border-[#242424] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[#1a1a1a]">
          {filtradas.map(c => (
            <button key={c.telefone} onClick={() => setSelecionada(c.telefone)}
              className={`w-full text-left px-4 py-3 hover:bg-white/[0.03] transition-colors ${selecionada === c.telefone ? 'bg-violet-600/10 border-r-2 border-violet-500' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                  <User size={14} className="text-zinc-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{fmtTel(c.telefone)}</div>
                  <div className="text-xs text-zinc-500 truncate">{c.mensagens.at(-1)?.mensagem_entrada || c.mensagens.at(-1)?.mensagem_saida || '—'}</div>
                </div>
              </div>
              <div className="mt-1 ml-10 text-[10px] text-zinc-600">{fmtData(c.ultima)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 flex flex-col">
        {!atual ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">Selecione uma conversa</div>
        ) : (
          <>
            <div className="px-5 py-3.5 border-b border-[#1e1e1e] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                <User size={14} className="text-zinc-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{fmtTel(atual.telefone)}</div>
                <div className="text-xs text-zinc-500">{atual.mensagens.length} mensagens</div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {atual.mensagens.map(m => (
                <div key={m.id}>
                  {m.mensagem_entrada && (
                    <div className="flex justify-start">
                      <div className="max-w-[70%] bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl rounded-tl-none px-3.5 py-2.5">
                        <p className="text-sm text-white whitespace-pre-wrap">{m.mensagem_entrada}</p>
                        <p className="text-[10px] text-zinc-500 mt-1">{fmtData(m.criado_em)}</p>
                      </div>
                    </div>
                  )}
                  {m.mensagem_saida && (
                    <div className="flex justify-end mt-1">
                      <div className="max-w-[70%] bg-violet-600/20 border border-violet-500/20 rounded-xl rounded-tr-none px-3.5 py-2.5">
                        <p className="text-sm text-violet-100 whitespace-pre-wrap">{m.mensagem_saida}</p>
                        <p className="text-[10px] text-violet-400/70 mt-1">{fmtData(m.criado_em)} · {m.atendente_responsavel || 'bot'}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
