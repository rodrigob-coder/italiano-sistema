'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCliente } from '@/lib/clienteContext'
import { ArrowLeft, Phone } from 'lucide-react'
import Link from 'next/link'

export default function LoginLojaPage() {
  const router = useRouter()
  const { login } = useCliente()
  const [tel, setTel] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  function fmtTel(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 2) return d
    if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  }

  async function entrar() {
    if (tel.replace(/\D/g, '').length < 10) { setErro('Digite um telefone válido'); return }
    setCarregando(true)
    setErro('')
    const { ok, erro: e } = await login(tel)
    setCarregando(false)
    if (!ok) { setErro(e || 'Erro ao entrar'); return }
    const next = new URLSearchParams(window.location.search).get('next') || '/loja'
    router.replace(next)
  }

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      <div className="px-4 pt-14 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-[#141414] border border-white/[0.08] flex items-center justify-center">
          <ArrowLeft size={18} className="text-white/70" />
        </button>
        <h1 className="text-white font-black text-lg">Entrar</h1>
      </div>

      <div className="flex-1 flex flex-col px-4 pt-8 gap-6">
        <div className="flex flex-col items-center gap-3 mb-4">
          <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-3xl shadow-lg">🍞</div>
          <p className="text-white/40 text-sm text-center">Entre com seu telefone cadastrado<br/>para acompanhar seus pedidos</p>
        </div>

        <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-white/30 uppercase tracking-wide block mb-2">
              <Phone size={11} className="inline mr-1" />Telefone / WhatsApp
            </label>
            <input
              value={tel}
              onChange={e => setTel(fmtTel(e.target.value))}
              placeholder="(42) 99999-0000"
              type="tel"
              className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors"
            />
          </div>

          {erro && (
            <div className="bg-[#EF233C]/10 border border-[#EF233C]/30 rounded-xl px-4 py-3 text-sm text-[#EF233C]">
              {erro}
            </div>
          )}

          <button
            onClick={entrar}
            disabled={carregando}
            className="w-full py-3.5 rounded-xl font-black text-white text-sm disabled:opacity-50 transition-all active:scale-[0.98]"
            style={{ background: '#EF233C' }}
          >
            {carregando ? 'Verificando...' : 'Entrar'}
          </button>
        </div>

        <div className="text-center">
          <p className="text-white/30 text-sm">Ainda não tem cadastro?</p>
          <Link href="/loja/cadastro" className="text-[#EF233C] text-sm font-bold">
            Criar conta agora
          </Link>
        </div>
      </div>
    </div>
  )
}
