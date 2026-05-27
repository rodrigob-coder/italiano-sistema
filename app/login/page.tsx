'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [ver, setVer] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    const sb = createClient()
    const { error, data } = await sb.auth.signInWithPassword({ email, password: senha })
    if (error) { setErro('Email ou senha incorretos'); setLoading(false); return }
    if (data?.user) {
      createAdminClient().from('users').update({ ultimo_login: new Date().toISOString() }).eq('id', data.user.id).then(() => {})
    }
    router.replace('/dashboard')
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] bg-[#111] border-r border-white/[0.06] p-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-lg">🍞</div>
          <span className="font-bold text-white text-base">Italiano</span>
        </div>
        <div>
          <div className="text-4xl font-bold text-white leading-tight mb-4">
            Gestão inteligente<br />de entregas
          </div>
          <p className="text-white/40 text-sm leading-relaxed">
            Pedidos, rotas e rastreamento GPS em tempo real para distribuidoras de panificação.
          </p>
        </div>
        <div className="text-white/20 text-xs">© 2026 Italiano · Irati, PR</div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-lg">🍞</div>
            <span className="font-bold text-white text-base">Italiano</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Entrar na conta</h1>
            <p className="text-white/40 text-sm">Acesse o painel de gestão</p>
          </div>

          <form onSubmit={entrar} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wide">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="seu@email.com"
                className="w-full bg-[#111] border border-white/[0.1] rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-wide">Senha</label>
              <div className="relative">
                <input
                  type={ver ? 'text' : 'password'} value={senha} onChange={e => setSenha(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full bg-[#111] border border-white/[0.1] rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors pr-12"
                />
                <button type="button" onClick={() => setVer(!ver)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {ver ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {erro && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                {erro}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-white hover:bg-white/90 disabled:bg-white/20 text-black font-bold py-3.5 rounded-xl text-sm transition-colors mt-2"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
