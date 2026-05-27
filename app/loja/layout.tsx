import { CartProvider } from '@/lib/cart'
import { ClienteProvider } from '@/lib/clienteContext'
import BottomNavLoja from '@/components/BottomNavLoja'

export const metadata = {
  title: 'Italiano — Loja',
  description: 'Faça seu pedido de salgados e assados direto da fábrica',
}

export default function LojaLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClienteProvider>
      <CartProvider>
        <div className="min-h-screen bg-[#080808] pb-[72px]">
          {children}
        </div>
        <BottomNavLoja />
      </CartProvider>
    </ClienteProvider>
  )
}
