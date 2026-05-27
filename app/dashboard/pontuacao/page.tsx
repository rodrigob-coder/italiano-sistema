'use client'
import { useEffect, useState } from 'react'
import { createAdminClient } from '@/lib/supabase'
import { Star, Plus, Minus, Search, Trophy } from 'lucide-react'

const sb = createAdminClient()

type Cliente = { id: string; nome_empresa: string; telefone: string; pontos: number }

export default function PontuacaoPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<string | null>(null)
  const [delta, setDelta] = useState('')
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await sb.from('clientes').select('id, nome_empresa, telefone, pontos').order('pontos', { ascending: false })
    setClientes((data || []).map((c: Record<string, unknown>) => ({
      id:           String(c.id ?? ''),
      nome_empresa: String(c.nome_empresa ?? ''),
      telefone:     String(c.telefone ?? ''),
      pontos:       typeof c.pontos === 'number' ? c.pontos : 0,
    })))
    setLoading(false)
  }

  async function ajustarPontos(id: string, atual: number, op: 'add' | 'sub') {
    const d = parseInt(delta) || 0
    if (d <= 0) { setToast('Digite um valor válido'); return }
    const novo = op === 'add' ? atual + d : Math.max(0, atual - d)
    const { error } = await sb.from('clientes').update({ pontos: novo, atualizado_em: new Date().toISOString() }).eq('id', id)
    if (error) { setToast('Erro: ' + error.message); return }
    setClientes(prev => prev.map(c => c.id === id ? { ...c, pontos: novo } : c).sort((a, b) => b.pontos - a.pontos))
    setEditando(null)
    setDelta('')
    setToast(`Pontos ${op === 'add' ? 'adicionados' : 'removidos'}!`)
    setTimeout(() => setToast(''), 3000)
  }

  async function zerar(id: string) {
    if (!confirm('Zerar pontos deste cliente?')) return
    await sb.from('clientes').update({ pontos: 0, atualizado_em: new Date().toISOString() }).eq('id', id)
    setClientes(prev => prev.map(c => c.id === id ? { ...c, pontos: 0 } : c))
    setToast('Pontos zerados!')
    setTimeout(() => setToast(''), 3000)
  }

  const filtrados = clientes.filter(c =>
    c.nome_empresa.toLowerCase().includes(busca.toLowerCase()) ||
    c.telefone.includes(busca)
  )

  const top3 = filtrados.slice(0, 3)
  const resto = filtrados.slice(3)

  return (
    <div className="h-full flex flex-col bg-black">
      <div className="px-4 md:px-6 py-4 md:py-5 border-b border-white/[0.07]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Pontuação de Clientes</h1>
            <p className="text-xs text-white/30 mt-0.5">{clientes.length} clientes · {clientes.reduce((s, c) => s + c.pontos, 0)} pontos distribuídos</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/[0.07] rounded-xl px-3 py-2.5">
          <Search size={14} className="text-white/25" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente..."
            className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none" />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-4">
        {loading ? (
          [...Array(6)].map((_, i) => <div key={i} className="bg-[#111] rounded-2xl h-16 animate-pulse" />)
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-3">
            <Trophy size={44} className="text-white/10" strokeWidth={1} />
            <p className="text-white/25 text-sm">Nenhum cliente encontrado</p>
          </div>
        ) : (
          <>
            {/* Top 3 */}
            {!busca && top3.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-white/30 uppercase tracking-wide mb-3">Top clientes</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {top3.map((c, i) => (
                    <div key={c.id} className="bg-[#111] border border-white/[0.07] rounded-2xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${
                          i === 0 ? 'bg-[#FFD60A]/20 text-[#FFD60A]' : i === 1 ? 'bg-white/10 text-white/60' : 'bg-[#FF9500]/15 text-[#FF9500]'
                        }`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{c.nome_empresa}</p>
                          <p className="text-xs text-white/30 truncate">{c.telefone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Star size={14} className="text-[#F59E0B]" fill="#F59E0B" />
                        <span className="text-[#F59E0B] font-black text-lg">{c.pontos}</span>
                        <span className="text-white/30 text-xs">pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All list */}
            <div>
              {!busca && resto.length > 0 && <p className="text-xs font-semibold text-white/30 uppercase tracking-wide mb-3">Todos</p>}
              <div className="space-y-2">
                {(busca ? filtrados : resto).map((c, idx) => (
                  <div key={c.id} className="bg-[#111] border border-white/[0.06] rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xs font-bold text-white/20 w-5 text-right shrink-0">
                        {busca ? idx + 1 : idx + 4}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{c.nome_empresa}</p>
                        <p className="text-xs text-white/30">{c.telefone}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Star size={12} className="text-[#F59E0B]" fill="#F59E0B" />
                        <span className="text-white font-black text-sm">{c.pontos}</span>
                      </div>
                      <button
                        onClick={() => setEditando(editando === c.id ? null : c.id)}
                        className="ml-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/10 transition-all shrink-0"
                      >
                        Editar
                      </button>
                    </div>
                    {editando === c.id && (
                      <div className="px-4 py-3 border-t border-white/[0.06] bg-[#0d0d0d] flex items-center gap-2">
                        <input
                          type="number" min="1" value={delta}
                          onChange={e => setDelta(e.target.value)}
                          placeholder="Qtd de pontos"
                          className="flex-1 bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-white/20"
                        />
                        <button onClick={() => ajustarPontos(c.id, c.pontos, 'add')}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#06C167]/15 text-[#06C167] text-xs font-bold hover:bg-[#06C167]/25 transition-colors">
                          <Plus size={13} /> Add
                        </button>
                        <button onClick={() => ajustarPontos(c.id, c.pontos, 'sub')}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#EF233C]/10 text-[#EF233C] text-xs font-bold hover:bg-[#EF233C]/20 transition-colors">
                          <Minus size={13} /> Sub
                        </button>
                        <button onClick={() => zerar(c.id)}
                          className="px-3 py-2 rounded-lg bg-white/[0.04] text-white/30 text-xs font-bold hover:text-white hover:bg-white/[0.08] transition-colors">
                          Zerar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#06C167] text-black text-sm font-bold px-5 py-3 rounded-xl shadow-2xl z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
