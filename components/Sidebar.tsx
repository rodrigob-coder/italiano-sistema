'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, MapPin, BookOpen, MessageSquare, Truck, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const nav = [
  { href: '/dashboard',            icon: LayoutDashboard, label: 'Dashboard'   },
  { href: '/dashboard/pedidos',    icon: ShoppingBag,     label: 'Pedidos'     },
  { href: '/dashboard/entregas',   icon: MapPin,          label: 'Entregas GPS'},
  { href: '/dashboard/cardapio',   icon: BookOpen,        label: 'Cardápio'    },
  { href: '/dashboard/conversas',  icon: MessageSquare,   label: 'Conversas'   },
  { href: '/motorista',            icon: Truck,           label: 'App Motorista'},
]

export default function Sidebar() {
  const path = usePathname()
  const router = useRouter()

  async function sair() {
    const sb = createClient()
    await sb.auth.signOut()
    router.replace('/login')
  }

  return (
    <aside className="w-56 shrink-0 bg-[#111] border-r border-[#1e1e1e] flex flex-col h-full">
      <div className="p-4 border-b border-[#1e1e1e]">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍕</span>
          <span className="font-bold text-white text-sm">Italiano</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = path === href || (href !== '/dashboard' && path.startsWith(href))
          return (
            <Link
              key={href} href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-violet-600/20 text-violet-400 font-medium'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-[#1e1e1e]">
        <button
          onClick={sair}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition-colors w-full"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  )
}
