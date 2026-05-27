'use client'
import { useEffect, useState } from 'react'
import { createAdminClient } from '@/lib/supabase'
import { Users, Truck, Headphones, ShieldCheck, Search, MoreHorizontal, UserPlus, Circle, Phone, Mail, X, ArrowLeft, UserCheck } from 'lucide-react'

const sb = createAdminClient()

type Usuario = { id: string; email: string; nome: string; tipo: string; status: string; phone: string | null; criado_em: string; ultimo_login: string | null }

const TIPOS = [
  { value: 'todos',     label: 'Todos',      icon: Users,       cor: '' },
  { value: 'gerente',   label: 'Gerentes',   icon: ShieldCheck, cor: '#AF52DE' },
  { value: 'atendente', label: 'Atendentes', icon: Headphones,  cor: '#007AFF' },
  { value: 'motorista', label: 'Motoristas', icon: Truck,       cor: '#06C167' },
  { value: 'vendedor',  label: 'Vendedores', icon: UserCheck,   cor: '#FF9500' },
]

const TIPO_INFO: Record<string, { label: string; cor: string; bg: string; icon: any }> = {
  gerente:   { label: 'Gerente',   cor: '#AF52DE', bg: 'bg-[#AF52DE]/10', icon: ShieldCheck },
  atendente: { label: 'Atendente', cor: '#007AFF', bg: 'bg-[#007AFF]/10', icon: Headphones  },
  motorista: { label: 'Motorista', cor: '#06C167', bg: 'bg-[#06C167]/10', icon: Truck       },
  vendedor:  { label: 'Vendedor',  cor: '#FF9500', bg: 'bg-[#FF9500]/10', icon: UserCheck   },
}

const STATUS_INFO: Record<string, { label: string; dot: string; text: string }> = {
  ativo:    { label: 'Ativo',    dot: 'bg-[#06C167]', text: 'text-[#06C167]' },
  inativo:  { label: 'Inativo',  dot: 'bg-white/20',  text: 'text-white/30'  },
  pendente: { label: 'Pendente', dot: 'bg-[#FF9500]',  text: 'text-[#FF9500]' },
}

function fmtTel(t: string | null) {
  if (!t) return null
  const d = t.replace(/\D/g, '')
  if (d.length === 13) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  return t
}
function iniciais(nome: string) { return nome.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase() }
const AVATAR_COLORS = ['#007AFF','#AF52DE','#06C167','#FF9500','#FF3B30']
function avatarCor(id: string) { return AVATAR_COLORS[id.charCodeAt(0) % AVATAR_COLORS.length] }

export default function EquipePage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [filtro, setFiltro] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('todos')
  const [selecionado, setSelecionado] = useState<Usuario | null>(null)
  const [menuAberto, setMenuAberto] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  useEffect(() => {
    carregar()
    const canal = sb.channel('equipe-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, carregar)
      .subscribe()
    return () => { sb.removeChannel(canal) }
  }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await sb.from('users').select('*').order('criado_em', { ascending: false })
    setUsuarios((data || []) as Usuario[])
    setLoading(false)
  }

  async function mudarStatus(id: string, status: string) {
    await sb.from('users').update({ status, atualizado_em: new Date().toISOString() }).eq('id', id)
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, status } : u))
    if (selecionado?.id === id) setSelecionado(prev => prev ? { ...prev, status } : null)
    setMenuAberto(null)
    mostrarToast(status === 'ativo' ? 'Usuário ativado' : 'Usuário desativado')
  }

  async function mudarTipo(id: string, tipo: string) {
    await sb.from('users').update({ tipo, atualizado_em: new Date().toISOString() }).eq('id', id)
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, tipo } : u))
    if (selecionado?.id === id) setSelecionado(prev => prev ? { ...prev, tipo } : null)
    mostrarToast('Função atualizada')
  }

  function mostrarToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const filtrados = usuarios.filter(u => {
    const matchTipo = tipoFiltro === 'todos' || u.tipo === tipoFiltro
    return matchTipo && (!filtro || u.nome?.toLowerCase().includes(filtro.toLowerCase()) || u.email?.toLowerCase().includes(filtro.toLowerCase()) || u.phone?.includes(filtro))
  })

  const contadores = TIPOS.reduce((acc, t) => ({ ...acc, [t.value]: t.value === 'todos' ? usuarios.length : usuarios.filter(u => u.tipo === t.value).length }), {} as Record<string, number>)

  return (
    <div className="flex h-full bg-black overflow-hidden">
      {/* Lista */}
      <div className={`flex-col flex-1 min-w-0 ${selecionado ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-4 md:px-6 py-4 md:py-5 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-white">Equipe</h1>
              <p className="text-xs text-white/30 mt-0.5">{usuarios.length} membros</p>
            </div>
            <a href="/registro" className="flex items-center gap-2 bg-white hover:bg-white/90 text-black text-sm font-bold px-3 md:px-4 py-2.5 rounded-xl transition-colors">
              <UserPlus size={15} /> <span className="hidden sm:inline">Novo membro</span>
            </a>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {TIPOS.map(({ value, label, icon: Icon }) => (
              <button key={value} onClick={() => setTipoFiltro(value)}
                className={`shrink-0 flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all ${tipoFiltro === value ? 'bg-white text-black' : 'bg-white/[0.06] text-white/40 hover:text-white'}`}>
                <Icon size={12} />
                {label}
                <span className={tipoFiltro === value ? 'text-black/50' : 'text-white/25'}>{contadores[value]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 md:px-6 py-3 border-b border-white/[0.04]">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
            <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Buscar por nome, email ou telefone..."
              className="w-full bg-[#111] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
          {loading && <div className="py-16 text-center text-sm text-white/25">Carregando...</div>}
          {!loading && filtrados.length === 0 && (
            <div className="py-16 text-center">
              <Users size={32} className="text-white/10 mx-auto mb-3" strokeWidth={1} />
              <p className="text-sm text-white/25">Nenhum membro encontrado</p>
            </div>
          )}
          {filtrados.map(u => {
            const ti = TIPO_INFO[u.tipo] || { label: u.tipo, cor: '#fff', bg: 'bg-white/5', icon: Users }
            const si = STATUS_INFO[u.status] || STATUS_INFO.ativo
            const TiIcon = ti.icon
            return (
              <div key={u.id} className={`px-4 md:px-6 py-4 flex items-center gap-3 hover:bg-white/[0.02] cursor-pointer transition-colors ${selecionado?.id === u.id ? 'bg-white/[0.03]' : ''}`} onClick={() => setSelecionado(u)}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-black" style={{ background: avatarCor(u.id) }}>
                  {iniciais(u.nome || u.email || '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-white truncate">{u.nome || 'Sem nome'}</span>
                    <span className={`flex items-center gap-1 text-[10px] font-semibold ${si.text}`}><Circle size={5} fill="currentColor" />{si.label}</span>
                  </div>
                  <div className="text-xs text-white/30 truncate">{u.email}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${ti.bg}`} style={{ color: ti.cor }}>
                    <TiIcon size={11} /><span className="hidden sm:inline">{ti.label}</span>
                  </span>
                  <div className="relative">
                    <button onClick={e => { e.stopPropagation(); setMenuAberto(menuAberto === u.id ? null : u.id) }}
                      className="p-1.5 rounded-lg text-white/20 hover:text-white hover:bg-white/[0.08] transition-colors">
                      <MoreHorizontal size={16} />
                    </button>
                    {menuAberto === u.id && (
                      <div className="absolute right-0 top-8 w-44 bg-[#1a1a1a] border border-white/[0.1] rounded-xl py-1.5 z-50 shadow-2xl">
                        <div className="px-3 py-1 text-[10px] text-white/25 font-semibold uppercase tracking-wide">Função</div>
                        {['gerente','atendente','motorista','vendedor'].map(t => (
                          <button key={t} onClick={e => { e.stopPropagation(); mudarTipo(u.id, t) }}
                            className={`w-full text-left text-xs px-3 py-2 hover:bg-white/[0.06] transition-colors ${u.tipo === t ? 'text-white font-semibold' : 'text-white/50'}`}>
                            {u.tipo === t ? '✓ ' : ''}{TIPO_INFO[t]?.label}
                          </button>
                        ))}
                        <div className="border-t border-white/[0.06] my-1" />
                        {u.status !== 'ativo' ? (
                          <button onClick={e => { e.stopPropagation(); mudarStatus(u.id, 'ativo') }} className="w-full text-left text-xs px-3 py-2 text-[#06C167] hover:bg-[#06C167]/10 transition-colors">Ativar</button>
                        ) : (
                          <button onClick={e => { e.stopPropagation(); mudarStatus(u.id, 'inativo') }} className="w-full text-left text-xs px-3 py-2 text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors">Desativar</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detalhe — overlay no mobile */}
      {selecionado && (() => {
        const ti = TIPO_INFO[selecionado.tipo] || { label: selecionado.tipo, cor: '#fff', bg: 'bg-white/5', icon: Users }
        const si = STATUS_INFO[selecionado.status] || STATUS_INFO.ativo
        const TiIcon = ti.icon
        return (
          <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a] md:relative md:inset-auto md:z-auto md:w-72 md:shrink-0 border-l border-white/[0.06] overflow-y-auto">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-3 sticky top-0 bg-[#0a0a0a] z-10">
              <button onClick={() => setSelecionado(null)} className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors">
                <ArrowLeft size={16} /><span className="text-sm md:hidden">Voltar</span>
              </button>
              <span className="font-bold text-white text-sm flex-1">Perfil</span>
              <button onClick={() => setSelecionado(null)} className="hidden md:block p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors"><X size={16} /></button>
            </div>

            <div className="flex-1 p-5 space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-xl font-bold text-black mb-3" style={{ background: avatarCor(selecionado.id) }}>
                  {iniciais(selecionado.nome || selecionado.email || '?')}
                </div>
                <div className="font-bold text-white text-base">{selecionado.nome || 'Sem nome'}</div>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <Circle size={6} className={si.text} fill="currentColor" />
                  <span className={`text-xs font-semibold ${si.text}`}>{si.label}</span>
                </div>
              </div>

              <div className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border ${ti.bg}`} style={{ borderColor: ti.cor + '30' }}>
                <TiIcon size={15} style={{ color: ti.cor }} />
                <span className="text-sm font-bold" style={{ color: ti.cor }}>{ti.label}</span>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-semibold text-white/30 uppercase tracking-wide">Contato</div>
                {[
                  { icon: Mail,  label: 'E-mail',   value: selecionado.email },
                  { icon: Phone, label: 'Telefone', value: fmtTel(selecionado.phone) },
                ].filter(f => f.value).map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 px-3.5 py-3 bg-white/[0.03] border border-white/[0.04] rounded-xl">
                    <Icon size={14} className="text-white/30 shrink-0" />
                    <div><div className="text-[10px] text-white/25">{label}</div><div className="text-xs text-white font-medium mt-0.5 break-all">{value}</div></div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-white/30 uppercase tracking-wide">Atividade</div>
                {[
                  { label: 'Cadastrado em', value: selecionado.criado_em?.slice(0,10) },
                  { label: 'Último acesso', value: selecionado.ultimo_login?.slice(0,16).replace('T',' ') || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <span className="text-white/30">{label}</span><span className="text-white font-medium">{value}</span>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-xs font-semibold text-white/30 uppercase tracking-wide mb-2">Alterar função</div>
                <div className="space-y-1.5">
                  {['gerente','atendente','motorista','vendedor'].map(t => {
                    const info = TIPO_INFO[t]; const InfoIcon = info.icon; const ativo = selecionado.tipo === t
                    return (
                      <button key={t} onClick={() => mudarTipo(selecionado.id, t)}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${ativo ? `${info.bg}` : 'bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.06]'}`}
                        style={ativo ? { color: info.cor, borderColor: info.cor + '30' } : {}}>
                        <InfoIcon size={14} />{info.label}{ativo && <span className="ml-auto text-xs">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                {selecionado.status !== 'ativo' ? (
                  <button onClick={() => mudarStatus(selecionado.id, 'ativo')} className="flex-1 bg-[#06C167]/10 border border-[#06C167]/20 text-[#06C167] text-sm font-bold py-2.5 rounded-xl hover:bg-[#06C167]/20 transition-colors">Ativar</button>
                ) : (
                  <button onClick={() => mudarStatus(selecionado.id, 'inativo')} className="flex-1 bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[#FF3B30] text-sm font-bold py-2.5 rounded-xl hover:bg-[#FF3B30]/20 transition-colors">Desativar</button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#06C167] text-black text-sm font-bold px-5 py-3 rounded-xl shadow-xl z-50">{toast}</div>}
      {menuAberto && <div className="fixed inset-0 z-40" onClick={() => setMenuAberto(null)} />}
    </div>
  )
}
