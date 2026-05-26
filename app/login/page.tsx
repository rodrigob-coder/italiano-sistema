'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    const sb = createClient()
    const { error } = await sb.auth.signInWithPassword({ email, password: senha })
    if (error) { setErro('Email ou senha incorretos'); setLoading(false); return }
    router.replace('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🍕</div>
          <h1 className="text-xl font-bold text-white">Italiano</h1>
          <p className="text-sm text-zinc-500 mt-1">Sistema de Gestão</p>
        </div>

        <form onSubmit={entrar} className="bg-[#161616] border border-[#222] rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="seu@email.com"
              className="w-full bg-[#141414] border border-[#242424] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Senha</label>
            <input
              type="password" value={senha} onChange={e => setSenha(e.target.value)} required
              placeholder="••••••••"
              className="w-full bg-[#141414] border border-[#242424] rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
            />
          </div>
          {erro && <p className="text-xs text-red-400">{erro}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
