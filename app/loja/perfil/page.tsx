'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCliente } from '@/lib/clienteContext'
import { createAdminClient } from '@/lib/supabase'
import { ArrowLeft, LogOut, Star, Bell, Settings, Phone, Mail, MapPin, Building2, Save } from 'lucide-react'

const sb = createAdminClient()

export default function PerfilPage() {
  const router = useRouter()
  const { cliente, logout, refresh } = useCliente()
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({
    nome_empresa:            cliente?.nome_empresa || '',
    email:                   cliente?.email || '',
    rua_avenida:             cliente?.rua_avenida || '',
    numero_endereco_empresa: cliente?.numero_endereco_empresa || '',
    bairro_empresa:          cliente?.bairro_empresa || '',
    cidade_empresa:          cliente?.cidade_empresa || '',
    cep_empresa:             cliente?.cep_empresa || '',
  })

  if (!cliente) {
    router.replace('/loja/login?next=/loja/perfil')
    return null
  }

  const cli = cliente

  function set(k: keyof typeof form, v: string) { setForm(prev => ({ ...prev, [k]: v })) }

  async function salvar() {
    setSalvando(true)
    const { error } = await sb.from('clientes').update({
      ...form,
      atualizado_em: new Date().toISOString(),
    }).eq('id', cli.id)
    await refresh()
    setSalvando(false)
    if (error) { setToast('Erro ao salvar'); return }
    setToast('Dados atualizados!')
    setEditando(false)
    setTimeout(() => setToast(''), 3000)
  }

  function sair() {
    logout()
    router.replace('/loja')
  }

  const pontos = cli.pontos ?? 0

  return (
    <div className="min-h-screen bg-[#080808]">
      <div className="sticky top-0 z-40 bg-[#080808]/95 backdrop-blur-md border-b border-white/[0.06] px-4 pt-14 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-xl bg-[#141414] border border-white/[0.08] flex items-center justify-center">
          <ArrowLeft size={18} className="text-white/70" />
        </button>
        <h1 className="text-white font-black text-lg">Minha conta</h1>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Avatar + name */}
        <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EF233C]/20 flex items-center justify-center text-2xl font-black text-[#EF233C]">
            {cli.nome_empresa.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-base truncate">{cli.nome_empresa}</p>
            <p className="text-white/30 text-xs truncate">{cli.telefone}</p>
          </div>
        </div>

        {/* Points */}
        <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/15 flex items-center justify-center">
            <Star size={22} className="text-[#F59E0B]" fill="#F59E0B" />
          </div>
          <div>
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wide">Seus pontos</p>
            <p className="text-white font-black text-2xl">{pontos}</p>
          </div>
          <div className="ml-auto text-white/20 text-xs text-right">
            Acumule pontos<br/>em cada pedido
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-[#141414] border border-white/[0.06] rounded-2xl overflow-hidden">
          <button onClick={() => router.push('/loja/notificacoes')}
            className="w-full flex items-center gap-4 px-5 py-4 border-b border-white/[0.06] active:bg-white/[0.04]">
            <Bell size={18} className="text-white/40" />
            <span className="text-white text-sm font-semibold flex-1 text-left">Notificações</span>
            <span className="text-white/20 text-xs">›</span>
          </button>
          <button onClick={() => setEditando(e => !e)}
            className="w-full flex items-center gap-4 px-5 py-4 active:bg-white/[0.04]">
            <Settings size={18} className="text-white/40" />
            <span className="text-white text-sm font-semibold flex-1 text-left">Editar dados</span>
            <span className="text-white/20 text-xs">{editando ? '▲' : '›'}</span>
          </button>
        </div>

        {/* Edit form */}
        {editando && (
          <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5 space-y-3">
            <h2 className="text-white font-bold text-sm flex items-center gap-2">
              <Building2 size={15} className="text-white/30" /> Dados cadastrais
            </h2>
            {[
              { k: 'nome_empresa',            label: 'Nome / Empresa',    icon: Building2 },
              { k: 'email',                   label: 'E-mail',            icon: Mail      },
              { k: 'rua_avenida',             label: 'Rua / Avenida',     icon: MapPin    },
              { k: 'numero_endereco_empresa',  label: 'Número',            icon: MapPin    },
              { k: 'bairro_empresa',          label: 'Bairro',            icon: MapPin    },
              { k: 'cidade_empresa',          label: 'Cidade',            icon: MapPin    },
              { k: 'cep_empresa',             label: 'CEP',               icon: MapPin    },
            ].map(({ k, label }) => (
              <div key={k}>
                <label className="text-xs text-white/30 uppercase tracking-wide font-semibold block mb-1">{label}</label>
                <input
                  value={(form as Record<string, string>)[k]}
                  onChange={e => set(k as keyof typeof form, e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-white/20 transition-colors"
                />
              </div>
            ))}
            <button onClick={salvar} disabled={salvando}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-black text-sm bg-white disabled:opacity-50">
              <Save size={15} />
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        )}

        {/* Contact info read-only */}
        <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5 space-y-3">
          <p className="text-white/30 text-xs font-semibold uppercase tracking-wide">Contato</p>
          <div className="flex items-center gap-3 text-sm text-white/60">
            <Phone size={14} className="text-white/25 shrink-0" />
            {cli.telefone}
          </div>
          {cli.email && (
            <div className="flex items-center gap-3 text-sm text-white/60">
              <Mail size={14} className="text-white/25 shrink-0" />
              {cli.email}
            </div>
          )}
        </div>

        {/* Logout */}
        <button onClick={sair}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#141414] border border-white/[0.06] text-[#EF233C] font-bold text-sm active:scale-[0.98] transition-transform">
          <LogOut size={16} />
          Sair da conta
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#06C167] text-black text-sm font-bold px-5 py-3 rounded-xl shadow-2xl z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
