'use client'
import { useEffect, useState } from 'react'
import { createAdminClient } from '@/lib/supabase'
import { Search, ShoppingCart, Plus, Minus, Star } from 'lucide-react'
import { useCart } from '@/lib/cart'
import Link from 'next/link'

type Produto = { Código: number; Produto: string; Preço: string; Categoria: string; Unidade: string; foto_url?: string | null }

function normalizar(s: string) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function getCatConfig(cat: string) {
  const c = (cat || '').toLowerCase()
  if (c.includes('salgado') && !c.includes('assado')) return { emoji: '🥟', color: '#FF9500', bg: '#FF9500' }
  if (c.includes('assado'))      return { emoji: '🥐', color: '#FFD60A', bg: '#FFD60A' }
  if (c.includes('churros'))     return { emoji: '🍩', color: '#FF6B6B', bg: '#FF6B6B' }
  if (c.includes('doce'))        return { emoji: '🍰', color: '#FF375F', bg: '#FF375F' }
  if (c.includes('kibe'))        return { emoji: '🧆', color: '#FF9F0A', bg: '#FF9F0A' }
  if (c.includes('polenta'))     return { emoji: '🌽', color: '#FFD60A', bg: '#FFD60A' }
  if (c.includes('pizza') || c.includes('esfiha') || c.includes('calzone')) return { emoji: '🍕', color: '#EF233C', bg: '#EF233C' }
  if (c.includes('hamburguer') || c.includes('burger')) return { emoji: '🍔', color: '#EF233C', bg: '#EF233C' }
  if (c.includes('risolis') || c.includes('risol'))     return { emoji: '🥙', color: '#FF9500', bg: '#FF9500' }
  return { emoji: '📦', color: '#AF52DE', bg: '#AF52DE' }
}

function ProdutoCard({ produto }: { produto: Produto }) {
  const { items, addItem, updateQty } = useCart()
  const item = items.find(i => i.codigo === produto.Código)
  const qty  = item?.qty || 0
  const cfg  = getCatConfig(produto.Categoria)

  return (
    <div className="bg-[#141414] rounded-2xl overflow-hidden border border-white/[0.06] active:scale-[0.98] transition-transform">
      {/* Visual area */}
      <div className="h-32 relative flex items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(145deg, ${cfg.color}22 0%, ${cfg.color}06 100%)` }}>
        {produto.foto_url
          ? <img src={produto.foto_url} alt={produto.Produto} className="w-full h-full object-cover" />
          : <span className="text-5xl select-none drop-shadow-lg">{cfg.emoji}</span>
        }
        {/* Cart control overlay */}
        <div className="absolute bottom-2.5 right-2.5">
          {qty === 0 ? (
            <button
              onClick={() => addItem({ codigo: produto.Código, nome: produto.Produto, preco: produto.Preço, categoria: produto.Categoria, unidade: produto.Unidade })}
              className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
              style={{ background: '#EF233C', boxShadow: `0 4px 14px #EF233C44` }}>
              <Plus size={18} className="text-white" strokeWidth={3} />
            </button>
          ) : (
            <div className="flex items-center gap-1 rounded-full px-2.5 py-1.5 shadow-lg" style={{ background: '#EF233C' }}>
              <button onClick={() => updateQty(produto.Código, -1)} className="active:scale-90 transition-transform">
                <Minus size={13} className="text-white" strokeWidth={3} />
              </button>
              <span className="text-white text-sm font-black min-w-[16px] text-center tabular-nums">{qty}</span>
              <button onClick={() => addItem({ codigo: produto.Código, nome: produto.Produto, preco: produto.Preço, categoria: produto.Categoria, unidade: produto.Unidade })} className="active:scale-90 transition-transform">
                <Plus size={13} className="text-white" strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: cfg.color }}>
          {produto.Categoria}
        </p>
        <p className="text-white text-[13px] font-semibold leading-tight line-clamp-2 mb-2 min-h-[2.5rem]">
          {produto.Produto}
        </p>
        <div className="flex items-end justify-between">
          <div>
            <span className="text-[#F59E0B] font-black text-base">R$ {produto.Preço}</span>
            <span className="text-white/20 text-[10px] ml-1">/{produto.Unidade}</span>
          </div>
          {qty > 0 && (
            <span className="text-[#EF233C] text-[10px] font-bold bg-[#EF233C]/10 px-2 py-0.5 rounded-full">
              {qty} no cart
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LojaHome() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [catAtiva, setCatAtiva] = useState('Todos')
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const { count } = useCart()
  const sb = createAdminClient()

  useEffect(() => {
    sb.from('cardapio').select('*').order('Categoria').order('Produto').then(({ data }) => {
      const seen = new Set<string>()
      const unicos = (data || []).filter((p: any) => {
        const k = p.Produto?.trim().toUpperCase()
        if (!k || seen.has(k)) return false
        seen.add(k); return true
      })
      setProdutos(unicos as Produto[])
      setLoading(false)
    })
  }, [])

  const cats = ['Todos', ...Array.from(new Set(produtos.map(p => p.Categoria?.trim()).filter(Boolean))).sort()]

  const filtrados = produtos.filter(p => {
    const mc = catAtiva === 'Todos' || p.Categoria?.trim() === catAtiva
    const mb = !busca || normalizar(p.Produto).includes(normalizar(busca)) || normalizar(p.Categoria).includes(normalizar(busca))
    return mc && mb
  })

  return (
    <div className="min-h-screen bg-[#080808]">

      {/* ── Header ── */}
      <div className="sticky top-0 z-40 bg-[#080808]/95 backdrop-blur-md border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-14 md:pt-6 pb-4">
          {/* Brand row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-lg">🍞</div>
              <div>
                <h1 className="text-white font-black text-lg leading-tight">Italiano</h1>
                <p className="text-white/35 text-[11px] leading-tight">Distribuidora · Irati, PR</p>
              </div>
            </div>
            <Link href="/loja/carrinho" className="relative w-11 h-11 bg-[#141414] border border-white/[0.08] rounded-2xl flex items-center justify-center">
              <ShoppingCart size={19} className="text-white/70" />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#EF233C] text-white text-[10px] font-black flex items-center justify-center shadow-lg">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </Link>
          </div>

          {/* Info strip */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <Star size={12} className="text-[#F59E0B]" fill="#F59E0B" />
              <span className="text-white/60 text-xs font-semibold">4.9</span>
              <span className="text-white/25 text-xs">(1.2k)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#06C167] text-xs font-bold">Frete grátis</span>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-3 bg-[#181818] border border-white/[0.08] rounded-2xl px-4 py-3">
            <Search size={16} className="text-white/25 shrink-0" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="O que vai pedir hoje?"
              className="flex-1 bg-transparent text-white text-sm placeholder-white/20 outline-none"
            />
            {busca && (
              <button onClick={() => setBusca('')} className="text-white/30 text-xs font-semibold">✕</button>
            )}
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          {cats.map(c => {
            const cfg = c !== 'Todos' ? getCatConfig(c) : null
            const active = catAtiva === c
            return (
              <button key={c} onClick={() => setCatAtiva(c)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-bold transition-all whitespace-nowrap ${
                  active
                    ? 'bg-white text-black shadow-md'
                    : 'bg-[#181818] border border-white/[0.08] text-white/45 hover:text-white'
                }`}>
                {cfg && <span className="text-sm">{cfg.emoji}</span>}
                {c}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Products ── */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-[#141414] rounded-2xl h-52 animate-pulse" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-4">
            <span className="text-5xl">🍞</span>
            <p className="text-white/30 text-sm">Nenhum produto encontrado</p>
            <button onClick={() => { setCatAtiva('Todos'); setBusca('') }}
              className="text-[#EF233C] text-sm font-semibold">
              Ver todos os produtos
            </button>
          </div>
        ) : (
          <>
            <p className="text-white/25 text-xs mb-3 font-medium">{filtrados.length} produtos disponíveis</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filtrados.map(p => <ProdutoCard key={p.Código} produto={p} />)}
            </div>
          </>
        )}
      </div>

      {/* ── Floating cart button ── */}
      {count > 0 && (
        <div className="fixed bottom-[76px] left-4 right-4 z-40">
          <Link href="/loja/carrinho"
            className="flex items-center justify-between px-5 py-4 rounded-2xl shadow-2xl active:scale-[0.98] transition-transform"
            style={{ background: '#EF233C', boxShadow: '0 8px 32px #EF233C50' }}>
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-black">{count}</span>
            </div>
            <span className="text-white font-black text-base tracking-tight">Ver carrinho</span>
            <ShoppingCart size={20} className="text-white/80" />
          </Link>
        </div>
      )}
    </div>
  )
}
