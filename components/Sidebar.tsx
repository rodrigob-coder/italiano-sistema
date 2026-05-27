'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, ShoppingBag, MapPin, BookOpen, MessageSquare,
  Users, LogOut, ExternalLink, Building2, Truck, X, Bell, Star, UserCheck, BarChart2,
} from 'lucide-react'
import { createClient, createAdminClient } from '@/lib/supabase'

const nav = [
  { href: '/dashboard',                icon: LayoutDashboard, label: 'Dashboard'      },
  { href: '/dashboard/pedidos',        icon: ShoppingBag,     label: 'Pedidos'        },
  { href: '/dashboard/clientes',       icon: Building2,       label: 'Clientes'       },
  { href: '/dashboard/entregas',       icon: MapPin,          label: 'Entregas GPS'   },
  { href: '/dashboard/cardapio',       icon: BookOpen,        label: 'Cardápio'       },
  { href: '/dashboard/conversas',      icon: MessageSquare,   label: 'Conversas'      },
  { href: '/dashboard/equipe',         icon: Users,           label: 'Equipe'         },
  { href: '/dashboard/notificacoes',   icon: Bell,            label: 'Notificações'   },
  { href: '/dashboard/pontuacao',      icon: Star,            label: 'Pontuação'      },
  { href: '/dashboard/vendedores',     icon: UserCheck,       label: 'Pedido Externo' },
  { href: '/dashboard/relatorios',     icon: BarChart2,       label: 'Relatórios'     },
]

type UserInfo = { nome: string; role: string; initials: string }

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const path = usePathname()
  const router = useRouter()
  const [userInfo, setUserInfo] = useState<UserInfo>({ nome: 'Rodrigo Baggio', role: 'Gerente', initials: 'RB' })

  useEffect(() => {
    async function loadUser() {
      try {
        const auth = createClient()
        const sbAdmin = createAdminClient()
        const { data: { user } } = await auth.auth.getUser()
        if (!user) return
        const { data } = await sbAdmin.from('users').select('nome, role').eq('id', user.id).single()
        if (data) {
          const nome = (data as { nome: string; role: string }).nome || user.email || 'Usuário'
          const role = (data as { nome: string; role: string }).role || 'Membro'
          const parts = nome.trim().split(' ')
          const initials = parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : nome.slice(0, 2).toUpperCase()
          setUserInfo({ nome, role, initials })
        }
      } catch {
        // keep defaults
      }
    }
    loadUser()
  }, [])

  async function sair() {
    await createClient().auth.signOut()
    router.replace('/login')
  }

  const avatarColors = ['#06C167', '#007AFF', '#FF9500', '#AF52DE', '#EF233C']
  const avatarColor = avatarColors[userInfo.initials.charCodeAt(0) % avatarColors.length]

  return (
    <aside className="w-[240px] shrink-0 bg-[#111] flex flex-col h-full border-r border-white/[0.07]">
      {/* Logo */}
      <div className="px-5 h-16 flex items-center justify-between border-b border-white/[0.07]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-lg shrink-0 shadow-lg">
            🍞
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight tracking-tight">Italiano</div>
            <div className="text-[10px] text-white/30 leading-tight">Distribuidora</div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav principal */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto no-scrollbar">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = path === href || (href !== '/dashboard' && path.startsWith(href))
          return (
            <Link
              key={href} href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/40 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          )
        })}

        {/* Divider */}
        <div className="pt-3 mt-3 border-t border-white/[0.07] space-y-0.5">
          <Link
            href="/motorista"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <Truck size={16} strokeWidth={2} />
            App Motorista
            <ExternalLink size={11} className="ml-auto text-white/20" />
          </Link>
          <a href="/registro"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white hover:bg-white/[0.06] transition-all w-full">
            <Users size={16} strokeWidth={2} />
            Cadastrar membro
          </a>
        </div>
      </nav>

      {/* User profile + Sair */}
      <div className="px-3 py-4 border-t border-white/[0.07] space-y-2">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04]">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {userInfo.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate leading-tight">{userInfo.nome}</div>
            <div className="text-[10px] text-white/30 leading-tight">{userInfo.role}</div>
          </div>
        </div>
        <button
          onClick={sair}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-white/30 hover:text-[#EF233C] hover:bg-[#EF233C]/10 transition-all w-full"
        >
          <LogOut size={14} />
          Sair
        </button>
      </div>
    </aside>
  )
}
