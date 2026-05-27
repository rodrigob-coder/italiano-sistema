'use client'
import { useCart } from '@/lib/cart'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { getCatConfig } from '@/app/loja/page'
import Link from 'next/link'

export default function CarrinhoPage() {
  const { items, updateQty, removeItem, count, total } = useCart()
  const router = useRouter()

  if (count === 0) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center gap-6 px-8">
        <div className="w-24 h-24 rounded-3xl bg-[#141414] border border-white/[0.06] flex items-center justify-center">
          <ShoppingBag size={36} className="text-white/20" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <h2 className="text-white font-black text-xl mb-2">Carrinho vazio</h2>
          <p className="text-white/35 text-sm leading-relaxed">Adicione produtos do cardápio para continuar</p>
        </div>
        <Link href="/loja"
          className="px-8 py-3.5 rounded-2xl bg-[#EF233C] text-white font-black text-sm active:scale-95 transition-transform"
          style={{ boxShadow: '0 4px 20px #EF233C40' }}>
          Ver cardápio
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#080808]/95 backdrop-blur-md border-b border-white/[0.06] px-4 pt-14 pb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-[#141414] border border-white/[0.08] flex items-center justify-center">
            <ArrowLeft size={18} className="text-white/70" />
          </button>
          <div>
            <h1 className="text-white font-black text-lg leading-tight">Seu pedido</h1>
            <p className="text-white/35 text-xs">{count} {count === 1 ? 'item' : 'itens'}</p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-4 space-y-3">
        {items.map(item => {
          const cfg = getCatConfig(item.categoria)
          const subtotal = parseFloat(item.preco.replace(',', '.')) * item.qty
          return (
            <div key={item.codigo} className="bg-[#141414] border border-white/[0.06] rounded-2xl p-4 flex items-center gap-4">
              {/* Emoji icon */}
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 text-3xl"
                style={{ background: `${cfg.color}18` }}>
                {cfg.emoji}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold leading-tight truncate mb-0.5">{item.nome}</p>
                <p className="text-white/30 text-xs">{item.categoria}</p>
                <p className="text-[#F59E0B] font-black text-sm mt-1">
                  R$ {subtotal.toFixed(2).replace('.', ',')}
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <button onClick={() => removeItem(item.codigo)} className="text-white/20 hover:text-[#EF233C] transition-colors">
                  <Trash2 size={15} />
                </button>
                <div className="flex items-center gap-2 bg-[#1f1f1f] rounded-xl px-2 py-1.5">
                  <button onClick={() => updateQty(item.codigo, -1)}
                    className="w-6 h-6 rounded-lg bg-white/[0.06] flex items-center justify-center active:scale-90 transition-transform">
                    <Minus size={12} className="text-white" strokeWidth={2.5} />
                  </button>
                  <span className="text-white font-black text-sm min-w-[20px] text-center tabular-nums">{item.qty}</span>
                  <button onClick={() => updateQty(item.codigo, 1)}
                    className="w-6 h-6 rounded-lg bg-white/[0.06] flex items-center justify-center active:scale-90 transition-transform">
                    <Plus size={12} className="text-white" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Order summary */}
      <div className="mx-4 bg-[#141414] border border-white/[0.06] rounded-2xl p-4 space-y-3">
        <h3 className="text-white font-bold text-sm mb-3">Resumo do pedido</h3>
        <div className="flex justify-between text-sm">
          <span className="text-white/50">Subtotal ({count} itens)</span>
          <span className="text-white font-semibold">R$ {total.toFixed(2).replace('.', ',')}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/50">Entrega</span>
          <span className="text-[#06C167] font-bold">Grátis</span>
        </div>
        <div className="border-t border-white/[0.06] pt-3 flex justify-between">
          <span className="text-white font-bold">Total</span>
          <span className="text-[#F59E0B] font-black text-lg">R$ {total.toFixed(2).replace('.', ',')}</span>
        </div>
      </div>

      {/* Add more */}
      <div className="px-4 mt-3">
        <Link href="/loja"
          className="block text-center py-3 rounded-2xl border border-white/[0.1] text-white/50 text-sm font-semibold hover:text-white hover:border-white/20 transition-colors">
          + Adicionar mais itens
        </Link>
      </div>

      {/* Checkout CTA */}
      <div className="fixed bottom-[76px] left-4 right-4 z-40">
        <Link href="/loja/finalizar"
          className="flex items-center justify-between px-5 py-4 rounded-2xl font-black text-white shadow-2xl active:scale-[0.98] transition-transform"
          style={{ background: '#EF233C', boxShadow: '0 8px 32px #EF233C50' }}>
          <span className="text-sm">Ir para pagamento</span>
          <span className="text-base">R$ {total.toFixed(2).replace('.', ',')}</span>
        </Link>
      </div>
    </div>
  )
}
