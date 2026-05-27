'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Eye, EyeOff, CheckCircle2, Truck, Headphones, ShieldCheck } from 'lucide-react'

const TIPOS = [
  { value: 'motorista', label: 'Motorista',  icon: Truck,       desc: 'Realiza entregas e usa o app de rastreamento GPS' },
  { value: 'atendente', label: 'Atendente',  icon: Headphones,  desc: 'Gerencia conversas WhatsApp e pedidos' },
  { value: 'gerente',   label: 'Gerente',    icon: ShieldCheck, desc: 'Acesso completo ao sistema de gestão' },
]

export default function RegistroPage() {
  const router = useRouter()
  const [step, setStep] = useState<'form' | 'sucesso'>('form')
  const [ver, setVer] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', senha: '', confirmar: '', tipo: 'motorista',
  })

  function set(k: keyof typeof form, v: string) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function fmtTel(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 2)  return d
    if (d.length <= 7)  return `(${d.slice(0,2)}) ${d.slice(2)}`
    if (d.length <= 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
    return d
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (form.senha.length < 6) { setErro('A senha deve ter ao menos 6 caracteres'); return }
    if (form.senha !== form.confirmar) { setErro('As senhas não conferem'); return }
    if (!form.nome.trim()) { setErro('Digite seu nome completo'); return }

    setSalvando(true)
    const sb = createClient()

    // 1. Criar conta no Supabase Auth
    const { data: authData, error: authErr } = await sb.auth.signUp({
      email: form.email,
      password: form.senha,
      options: {
        data: { nome: form.nome, tipo: form.tipo },
      },
    })

    if (authErr) {
      if (authErr.message.includes('already registered')) {
        setErro('Este e-mail já está cadastrado. Tente fazer login.')
      } else {
        setErro('Erro ao criar conta: ' + authErr.message)
      }
      setSalvando(false)
      return
    }

    // 2. Inserir perfil na tabela users
    if (authData.user) {
      const telefoneNumeros = form.telefone.replace(/\D/g, '')
      const phone = telefoneNumeros ? `55${telefoneNumeros}` : ''

      await sb.from('users').insert({
        id: authData.user.id,
        email: form.email,
        nome: form.nome,
        tipo: form.tipo,
        phone,
        status: 'ativo',
        empresa_id: 'd7366f17-abf7-4b2b-8cbe-26bb0d04aafa',
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      })
    }

    setSalvando(false)
    setStep('sucesso')
  }

  if (step === 'sucesso') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-[#06C167]/15 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-[#06C167]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white mb-2">Cadastro realizado!</h1>
            <p className="text-white/40 text-sm leading-relaxed">
              Sua conta foi criada com sucesso. Verifique seu e-mail se solicitado,
              depois acesse o sistema normalmente.
            </p>
          </div>
          <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Nome</span>
              <span className="text-white font-medium">{form.nome}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Email</span>
              <span className="text-white font-medium">{form.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Função</span>
              <span className="text-white font-medium capitalize">{form.tipo}</span>
            </div>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-white hover:bg-white/90 text-black font-bold py-3.5 rounded-xl text-sm transition-colors"
          >
            Ir para o login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[380px] shrink-0 bg-[#111] border-r border-white/[0.06] p-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-lg">🍞</div>
          <span className="font-bold text-white text-base">Italiano</span>
        </div>
        <div>
          <div className="text-3xl font-bold text-white leading-tight mb-4">
            Bem-vindo à<br />equipe Italiano
          </div>
          <p className="text-white/40 text-sm leading-relaxed mb-6">
            Distribuidora de Panificação · Irati, PR
          </p>
          <div className="space-y-3">
            {TIPOS.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/[0.04]">
                <Icon size={16} className="text-white/50 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white">{label}</div>
                  <div className="text-xs text-white/30 mt-0.5">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-white/20 text-xs">
          Já tem conta?{' '}
          <a href="/login" className="text-white/50 hover:text-white underline transition-colors">Fazer login</a>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-lg">🍞</div>
            <span className="font-bold text-white text-base">Italiano · Cadastro</span>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-white">Criar sua conta</h1>
            <p className="text-white/40 text-sm mt-1">Preencha seus dados para acessar o sistema</p>
          </div>

          <form onSubmit={enviar} className="space-y-4">
            {/* Nome */}
            <div>
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wide block mb-1.5">Nome completo</label>
              <input
                required value={form.nome} onChange={e => set('nome', e.target.value)}
                placeholder="João da Silva"
                className="w-full bg-[#111] border border-white/[0.1] rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wide block mb-1.5">E-mail</label>
              <input
                required type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-[#111] border border-white/[0.1] rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
              />
            </div>

            {/* Telefone */}
            <div>
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wide block mb-1.5">Telefone / WhatsApp</label>
              <input
                type="tel" value={form.telefone}
                onChange={e => set('telefone', fmtTel(e.target.value))}
                placeholder="(42) 99999-0000"
                className="w-full bg-[#111] border border-white/[0.1] rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
              />
            </div>

            {/* Função */}
            <div>
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wide block mb-2">Sua função</label>
              <div className="grid grid-cols-3 gap-2">
                {TIPOS.map(({ value, label, icon: Icon }) => (
                  <button key={value} type="button" onClick={() => set('tipo', value)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-semibold transition-all ${
                      form.tipo === value
                        ? 'bg-white border-white text-black'
                        : 'bg-white/[0.04] border-white/[0.08] text-white/40 hover:text-white hover:border-white/20'
                    }`}>
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wide block mb-1.5">Senha</label>
              <div className="relative">
                <input
                  required type={ver ? 'text' : 'password'} value={form.senha}
                  onChange={e => set('senha', e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-[#111] border border-white/[0.1] rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 pr-12"
                />
                <button type="button" onClick={() => setVer(!ver)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {ver ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirmar senha */}
            <div>
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wide block mb-1.5">Confirmar senha</label>
              <input
                required type="password" value={form.confirmar}
                onChange={e => set('confirmar', e.target.value)}
                placeholder="Repita a senha"
                className="w-full bg-[#111] border border-white/[0.1] rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
              />
            </div>

            {/* Força da senha */}
            {form.senha && (
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => {
                    const forca = form.senha.length >= 12 ? 4 : form.senha.length >= 8 ? 3 : form.senha.length >= 6 ? 2 : 1
                    return (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                        i < forca ? (forca >= 4 ? 'bg-[#06C167]' : forca >= 3 ? 'bg-[#007AFF]' : 'bg-[#FF9500]') : 'bg-white/[0.08]'
                      }`} />
                    )
                  })}
                </div>
                <p className="text-xs text-white/25">
                  {form.senha.length < 6 ? 'Muito curta' : form.senha.length < 8 ? 'Fraca' : form.senha.length < 12 ? 'Boa' : 'Forte'}
                </p>
              </div>
            )}

            {/* Erro */}
            {erro && (
              <div className="bg-[#FF3B30]/8 border border-[#FF3B30]/20 rounded-xl px-4 py-3 text-sm text-[#FF3B30]">
                {erro}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={salvando}
              className="w-full bg-white hover:bg-white/90 disabled:bg-white/20 text-black font-bold py-3.5 rounded-xl text-sm transition-colors mt-2">
              {salvando ? 'Criando conta...' : 'Criar conta'}
            </button>

            <p className="text-center text-xs text-white/25 pt-1">
              Já tem conta?{' '}
              <a href="/login" className="text-white/50 hover:text-white underline transition-colors">Fazer login</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
