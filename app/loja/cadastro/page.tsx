'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCliente } from '@/lib/clienteContext'
import { createAdminClient } from '@/lib/supabase'
import { ArrowLeft, Building2 } from 'lucide-react'

const sb = createAdminClient()

type Form = {
  nome_empresa: string
  telefone: string
  email: string
  rua_avenida: string
  numero_endereco_empresa: string
  bairro_empresa: string
  cidade_empresa: string
  cep_empresa: string
}

const vazio: Form = {
  nome_empresa: '', telefone: '', email: '',
  rua_avenida: '', numero_endereco_empresa: '',
  bairro_empresa: '', cidade_empresa: 'Irati', cep_empresa: '',
}

function Field({ label, value, onChange, placeholder, type = 'text', required = true }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-white/30 uppercase tracking-wide block mb-1.5">
        {label}{required && <span className="text-[#EF233C] ml-0.5">*</span>}
      </label>
      <input
        type={type} value={value} required={required}
        onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors"
      />
    </div>
  )
}

export default function CadastroPage() {
  const router = useRouter()
  const { login } = useCliente()
  const [form, setForm] = useState<Form>(vazio)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  function set(k: keyof Form, v: string) { setForm(prev => ({ ...prev, [k]: v })) }

  function fmtTel(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 2) return d
    if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  }

  function fmtCep(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 8)
    return d.length > 5 ? `${d.slice(0,5)}-${d.slice(5)}` : d
  }

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome_empresa.trim()) { setErro('Nome da empresa é obrigatório'); return }
    if (form.telefone.replace(/\D/g, '').length < 10) { setErro('Telefone inválido'); return }

    setSalvando(true)
    setErro('')

    const tel = '55' + form.telefone.replace(/\D/g, '')

    // Check if already exists
    const { data: existe } = await sb.from('clientes').select('id').eq('telefone', tel).maybeSingle()
    if (existe) {
      setSalvando(false)
      setErro('Este telefone já está cadastrado. Faça login.')
      return
    }

    const { error } = await sb.from('clientes').insert({
      nome_empresa:            form.nome_empresa.trim(),
      telefone:                tel,
      email:                   form.email.trim() || null,
      rua_avenida:             form.rua_avenida.trim() || null,
      numero_endereco_empresa: form.numero_endereco_empresa.trim() || null,
      bairro_empresa:          form.bairro_empresa.trim() || null,
      cidade_empresa:          form.cidade_empresa.trim() || null,
      cep_empresa:             form.cep_empresa.replace(/\D/g, '') || null,
      pontos:                  0,
      criado_em:               new Date().toISOString(),
      atualizado_em:           new Date().toISOString(),
    })

    if (error) {
      setSalvando(false)
      setErro('Erro ao cadastrar: ' + error.message)
      return
    }

    // Auto-login after registration
    await login(form.telefone)
    setSalvando(false)

    const next = new URLSearchParams(window.location.search).get('next') || '/loja'
    router.replace(next)
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="sticky top-0 z-40 bg-[#080808]/95 backdrop-blur-md border-b border-white/[0.06] px-4 pt-14 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-[#141414] border border-white/[0.08] flex items-center justify-center">
          <ArrowLeft size={18} className="text-white/70" />
        </button>
        <div>
          <h1 className="text-white font-black text-lg">Criar conta</h1>
          <p className="text-white/35 text-xs">Preencha seus dados de entrega</p>
        </div>
      </div>

      <form onSubmit={cadastrar} className="px-4 py-5 space-y-4 pb-32">
        <section className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-bold text-sm flex items-center gap-2">
            <Building2 size={15} className="text-white/30" /> Empresa / Nome
          </h2>
          <Field label="Nome da empresa / seu nome" value={form.nome_empresa}
            onChange={v => set('nome_empresa', v)} placeholder="Mercado Central Ltda" />
          <Field label="Telefone / WhatsApp" value={form.telefone}
            onChange={v => set('telefone', fmtTel(v))} placeholder="(42) 99999-0000" type="tel" />
          <Field label="E-mail" value={form.email} required={false}
            onChange={v => set('email', v)} placeholder="contato@empresa.com" type="email" />
        </section>

        <section className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-bold text-sm">Endereço de entrega</h2>
          <Field label="Rua / Avenida" value={form.rua_avenida} required={false}
            onChange={v => set('rua_avenida', v)} placeholder="Av. Brasil" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Número" value={form.numero_endereco_empresa} required={false}
              onChange={v => set('numero_endereco_empresa', v)} placeholder="123" />
            <Field label="CEP" value={form.cep_empresa} required={false}
              onChange={v => set('cep_empresa', fmtCep(v))} placeholder="84500-000" />
          </div>
          <Field label="Bairro" value={form.bairro_empresa} required={false}
            onChange={v => set('bairro_empresa', v)} placeholder="Centro" />
          <Field label="Cidade" value={form.cidade_empresa} required={false}
            onChange={v => set('cidade_empresa', v)} placeholder="Irati" />
        </section>

        {erro && (
          <div className="bg-[#EF233C]/10 border border-[#EF233C]/30 rounded-2xl px-4 py-3 text-sm text-[#EF233C]">
            {erro}
          </div>
        )}

        <button type="submit" disabled={salvando}
          className="w-full py-4 rounded-2xl font-black text-white text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
          style={{ background: '#EF233C', boxShadow: '0 8px 32px #EF233C50' }}>
          {salvando ? 'Cadastrando...' : 'Criar conta'}
        </button>

        <p className="text-center text-white/30 text-xs">
          Já tem conta?{' '}
          <a href="/loja/login" className="text-[#EF233C] font-bold">Entrar</a>
        </p>
      </form>
    </div>
  )
}
