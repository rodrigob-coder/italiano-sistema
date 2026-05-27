'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [verificado, setVerificado] = useState(false)
  const router = useRouter()

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
      } else {
        setVerificado(true)
      }
    })
  }, [router])

  if (!verificado) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-black">
      {open && (
        <div className="fixed inset-0 bg-black/70 z-40 md:hidden" onClick={() => setOpen(false)} />
      )}
      <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:relative md:flex ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <Sidebar onClose={() => setOpen(false)} />
      </div>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="md:hidden h-14 px-4 flex items-center gap-3 border-b border-white/[0.07] bg-black shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="p-2 -ml-2 rounded-xl text-white/60 hover:text-white transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">🍞</span>
            <span className="text-sm font-bold text-white">Italiano</span>
          </div>
        </div>
        <main className="flex-1 overflow-y-auto min-h-0">{children}</main>
      </div>
    </div>
  )
}
