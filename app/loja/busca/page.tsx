'use client'
import { useEffect, useState } from 'react'
import { createAdminClient } from '@/lib/supabase'
import { Search, X } from 'lucide-react'
import { getCatConfig } from '@/app/loja/page'
import { useCart } from '@/lib/cart'
import { Plus, Minus } from 'lucide-react'

type Produto = { Código: number; Produto: string; Preço: string; Categoria: string; Unidade: string; foto_url?: string | null }

function normalizar(s: string) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export default function BuscaPage() {
  const [todos, setTodos]   = useState<Produto[]>([])
  const [busca, setBusca]   = useState('')
  const { items, addItem, updateQty } = useCart()
  const sb = createAdminClient()

  useEffect(() => {
    sb.from('cardapio').select('*').order('Produto').then(({ data }) => {
      const seen = new Set<string>()
      const unicos = (data || []).filter((p: any) => {
        const k = p.Produto?.trim().toUpperCase()
        if (!k || seen.has(k)) return false
        seen.add(k); return true
      })
      setTodos(unicos as Produto[])
    })
  }, [])

  const filtrados = busca.trim().length < 2 ? [] : todos.filter(p =>
    normalizar(p.Produto).includes(normalizar(busca)) ||
    normalizar(p.Categoria).includes(normalizar(busca))
  )

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#080808]/95 backdrop-blur-md border-b border-white/[0.06] px-4 pt-14 pb-4">
        <h1 className="text-white font-black text-lg mb-3">Buscar</h1>
        <div className="flex items-center gap-3 bg-[#181818] border border-white/[0.08] rounded-2xl px-4 py-3">
          <Search size={16} className="text-white/25 shrink-0" />
          <input
            autoFocus
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar produto ou categoria..."
            className="flex-1 bg-transparent text-white text-sm placeholder-white/20 outline-none"
          />
          {busca && (
            <button onClick={() => setBusca('')} className="text-white/30 text-xs font-semibold">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-4">
        {busca.trim().length < 2 ? (
          <div className="flex flex-col items-center py-20 gap-4 text-center">
            <span className="text-5xl">🔍</span>
            <p className="text-white/25 text-sm">Digite pelo menos 2 letras para buscar</p>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-4 text-center">
            <span className="text-4xl">😕</span>
            <p className="text-white/40 font-semibold text-sm">Nenhum produto encontrado</p>
            <p className="text-white/20 text-xs">para "{busca}"</p>
          </div>
        ) : (
          <>
            <p className="text-white/25 text-xs mb-3">{filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}</p>
            <div className="space-y-2">
              {filtrados.map(p => {
                const cfg = getCatConfig(p.Categoria)
                const item = items.find(i => i.codigo === p.Código)
                const qty = item?.qty || 0
                return (
                  <div key={p.Código} className="bg-[#141414] border border-white/[0.06] rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                      style={{ background: `${cfg.color}18` }}>
                      {p.foto_url
                        ? <img src={p.foto_url} alt={p.Produto} className="w-full h-full object-cover rounded-xl" />
                        : <span className="text-2xl">{cfg.emoji}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: cfg.color }}>
                        {p.Categoria}
                      </p>
                      <p className="text-white text-sm font-semibold leading-tight truncate">{p.Produto}</p>
                      <p className="text-[#F59E0B] font-black text-sm mt-0.5">R$ {p.Preço}
                        <span className="text-white/20 text-[10px] font-normal ml-1">/{p.Unidade}</span>
                      </p>
                    </div>
                    <div className="shrink-0">
                      {qty === 0 ? (
                        <button
                          onClick={() => addItem({ codigo: p.Código, nome: p.Produto, preco: p.Preço, categoria: p.Categoria, unidade: p.Unidade })}
                          className="w-9 h-9 rounded-full flex items-center justify-center"
                          style={{ background: '#EF233C' }}>
                          <Plus size={16} className="text-white" strokeWidth={3} />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 rounded-full px-2 py-1.5" style={{ background: '#EF233C' }}>
                          <button onClick={() => updateQty(p.Código, -1)} className="active:scale-90 transition-transform">
                            <Minus size={12} className="text-white" strokeWidth={3} />
                          </button>
                          <span className="text-white text-sm font-black min-w-[16px] text-center">{qty}</span>
                          <button onClick={() => addItem({ codigo: p.Código, nome: p.Produto, preco: p.Preço, categoria: p.Categoria, unidade: p.Unidade })} className="active:scale-90 transition-transform">
                            <Plus size={12} className="text-white" strokeWidth={3} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
