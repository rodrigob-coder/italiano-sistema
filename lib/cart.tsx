'use client'
import { createContext, useContext, useEffect, useState } from 'react'

export type CartItem = {
  codigo: number
  nome: string
  preco: string
  categoria: string
  unidade: string
  qty: number
}

type Ctx = {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'qty'>) => void
  updateQty: (codigo: number, delta: number) => void
  removeItem: (codigo: number) => void
  clearCart: () => void
  count: number
  total: number
}

const CartContext = createContext<Ctx | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    try { const s = localStorage.getItem('it_cart'); if (s) setItems(JSON.parse(s)) } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem('it_cart', JSON.stringify(items)) } catch {}
  }, [items])

  const addItem = (item: Omit<CartItem, 'qty'>) =>
    setItems(prev => {
      const idx = prev.findIndex(i => i.codigo === item.codigo)
      if (idx >= 0) return prev.map((i, j) => j === idx ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...item, qty: 1 }]
    })

  const updateQty = (codigo: number, delta: number) =>
    setItems(prev =>
      prev.flatMap(i => {
        if (i.codigo !== codigo) return [i]
        const q = i.qty + delta
        return q <= 0 ? [] : [{ ...i, qty: q }]
      })
    )

  const removeItem = (codigo: number) => setItems(prev => prev.filter(i => i.codigo !== codigo))
  const clearCart = () => setItems([])

  const count = items.reduce((s, i) => s + i.qty, 0)
  const total = items.reduce((s, i) => {
    const p = parseFloat(i.preco.replace(',', '.'))
    return s + (isNaN(p) ? 0 : p * i.qty)
  }, 0)

  return (
    <CartContext.Provider value={{ items, addItem, updateQty, removeItem, clearCart, count, total }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart fora do CartProvider')
  return ctx
}
