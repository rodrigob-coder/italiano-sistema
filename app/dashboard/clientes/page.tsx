'use client'
import { useEffect, useState } from 'react'
import { createAdminClient } from '@/lib/supabase'
import { Plus, Search, X, Pencil, Phone, Mail, MapPin, ChevronRight, Building2, ToggleLeft, ToggleRight, ArrowLeft, Save, Star, CreditCard } from 'lucide-react'

const sb = createAdminClient()

type Cliente = {
  id: string; nome_empresa: string; telefone: string | null; email: string | null
  rua_avenida: string | null; numero_endereco_empresa: string | null
  bairro_empresa: string | null; cidade_empresa: string | null; cep_empresa: string | null
  'rua/avenida': string | null; 'numero_endereço_empresa': string | null
  latitude: number | null; longitude: number | null; status: string | null; criado_em: string
  pagamento_mensal: boolean | null; pontos: number | null
}
type ClienteComPedidos = Cliente & { total_pedidos: number }

type EditForm = {
  nome_empresa: string; telefone: string; email: string
  rua_avenida: string; numero_endereco_empresa: string
  bairro_empresa: string; cidade_empresa: string; cep_empresa: string
  pagamento_mensal: boolean; pontos: string
}

const AVATAR_COLORS = ['#06C167','#007AFF','#FF9500','#AF52DE','#EF233C','#FFD60A','#FF375F','#30D158','#64D2FF']

function getAvatarColor(nome: string) { return AVATAR_COLORS[(nome.charCodeAt(0) || 0) % AVATAR_COLORS.length] }
function getInitials(nome: string) {
  const parts = nome.trim().split(/\s+/)
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : nome.slice(0, 2).toUpperCase()
}

type Tab = 'todos' | 'ativos' | 'inativos'

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-white/30 uppercase tracking-wide block mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors"
      />
    </div>
  )
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteComPedidos[]>([])
  const [filtro, setFiltro] = useState('')
  const [tab, setTab] = useState<Tab>('todos')
  const [selecionado, setSelecionado] = useState<ClienteComPedidos | null>(null)
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState(false)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    carregar()
    const canal = sb.channel('clientes-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, carregar)
      .subscribe()
    return () => { sb.removeChannel(canal) }
  }, [])

  async function carregar() {
    setLoading(true)
    const [{ data: clis }, { data: pedCounts }] = await Promise.all([
      sb.from('clientes').select('*').order('nome_empresa'),
      sb.from('pedidos').select('cliente_id'),
    ])
    const countMap: Record<string, number> = {}
    ;(pedCounts || []).forEach((p: { cliente_id: string }) => { countMap[p.cliente_id] = (countMap[p.cliente_id] || 0) + 1 })
    const lista = ((clis || []) as unknown as Cliente[]).map(c => ({ ...c, total_pedidos: countMap[c.id] || 0 })) as ClienteComPedidos[]
    setClientes(lista)
    if (selecionado) {
      const updated = lista.find(c => c.id === selecionado.id)
      if (updated) setSelecionado(updated)
    }
    setLoading(false)
  }

  async function toggleStatus(cliente: ClienteComPedidos) {
    const novoStatus = cliente.status === 'ativo' ? 'inativo' : 'ativo'
    await sb.from('clientes').update({ status: novoStatus }).eq('id', cliente.id)
    carregar()
  }

  function abrirEditar(c: ClienteComPedidos) {
    setEditForm({
      nome_empresa:            c.nome_empresa || '',
      telefone:                c.telefone || '',
      email:                   c.email || '',
      rua_avenida:             c.rua_avenida || c['rua/avenida'] || '',
      numero_endereco_empresa: c.numero_endereco_empresa || c['numero_endereço_empresa'] || '',
      bairro_empresa:          c.bairro_empresa || '',
      cidade_empresa:          c.cidade_empresa || '',
      cep_empresa:             c.cep_empresa || '',
      pagamento_mensal:        c.pagamento_mensal || false,
      pontos:                  String(c.pontos ?? 0),
    })
    setEditModal(true)
  }

  function setF(k: keyof EditForm, v: string | boolean) {
    setEditForm(prev => prev ? ({ ...prev, [k]: v }) : prev)
  }

  async function salvarEdicao() {
    if (!selecionado || !editForm) return
    setSalvando(true)
    const { error } = await sb.from('clientes').update({
      nome_empresa:            editForm.nome_empresa.trim(),
      telefone:                editForm.telefone.trim(),
      email:                   editForm.email.trim() || null,
      rua_avenida:             editForm.rua_avenida.trim() || null,
      numero_endereco_empresa: editForm.numero_endereco_empresa.trim() || null,
      bairro_empresa:          editForm.bairro_empresa.trim() || null,
      cidade_empresa:          editForm.cidade_empresa.trim() || null,
      cep_empresa:             editForm.cep_empresa.trim() || null,
      pagamento_mensal:        editForm.pagamento_mensal,
      pontos:                  parseInt(editForm.pontos) || 0,
      atualizado_em:           new Date().toISOString(),
    }).eq('id', selecionado.id)
    setSalvando(false)
    if (error) { setToast('Erro: ' + error.message); return }
    setToast('Cliente atualizado!')
    setEditModal(false)
    carregar()
    setTimeout(() => setToast(''), 3000)
  }

  const filtrados = clientes.filter(c => {
    const matchTab = tab === 'todos' ? true : tab === 'ativos' ? c.status === 'ativo' : c.status !== 'ativo'
    const q = filtro.toLowerCase()
    return matchTab && (!filtro || c.nome_empresa?.toLowerCase().includes(q) || c.telefone?.includes(filtro) || c.email?.toLowerCase().includes(q))
  })

  const counts = { todos: clientes.length, ativos: clientes.filter(c => c.status === 'ativo').length, inativos: clientes.filter(c => c.status !== 'ativo').length }
  const tabs: { key: Tab; label: string }[] = [{ key: 'todos', label: 'Todos' }, { key: 'ativos', label: 'Ativos' }, { key: 'inativos', label: 'Inativos' }]

  return (
    <div className="h-full flex bg-black overflow-hidden">
      {/* Main panel */}
      <div className={`flex-col flex-1 min-w-0 ${selecionado ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-4 md:px-6 py-4 md:py-5 border-b border-white/[0.07] flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">Clientes</h1>
              <span className="text-xs bg-white/[0.08] text-white/50 px-2.5 py-1 rounded-full font-semibold">{clientes.length}</span>
            </div>
          </div>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
            <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Buscar por nome, telefone, cidade..."
              className="w-full bg-[#1a1a1a] border border-white/[0.07] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/[0.14] transition-colors"
            />
            {filtro && <button onClick={() => setFiltro('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"><X size={14} /></button>}
          </div>
          <div className="flex gap-2">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all ${tab === t.key ? 'bg-white text-black shadow-md' : 'bg-white/[0.06] text-white/40 hover:text-white'}`}>
                {t.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? 'bg-black/20 text-black/70' : 'bg-white/[0.08] text-white/30'}`}>{counts[t.key]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-24"><div className="w-6 h-6 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>
          ) : filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24"><Building2 size={44} className="text-white/10 mb-4" strokeWidth={1} /><p className="text-sm text-white/25">Nenhum cliente encontrado</p></div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {filtrados.map(c => {
                const isAtivo = c.status === 'ativo'
                const color = getAvatarColor(c.nome_empresa || '')
                const initials = getInitials(c.nome_empresa || '?')
                const endereco = [c.rua_avenida || c['rua/avenida'], c.bairro_empresa, c.cidade_empresa].filter(Boolean).join(', ')
                const isSelected = selecionado?.id === c.id
                return (
                  <div key={c.id} onClick={() => setSelecionado(isSelected ? null : c)}
                    className={`px-4 md:px-6 py-4 flex items-center gap-3 cursor-pointer transition-all ${isSelected ? 'bg-white/[0.05]' : 'hover:bg-white/[0.025]'}`}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-black shrink-0 shadow-md" style={{ backgroundColor: color }}>{initials}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-white truncate">{c.nome_empresa}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${isAtivo ? 'bg-[#06C167]/15 text-[#06C167]' : 'bg-[#EF233C]/15 text-[#EF233C]'}`}>{isAtivo ? 'ativo' : 'inativo'}</span>
                        {c.pagamento_mensal && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 bg-[#AF52DE]/15 text-[#AF52DE]">Mensal</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-white/40">
                        {c.telefone && <span className="flex items-center gap-1"><Phone size={10} />{c.telefone}</span>}
                        {endereco && <span className="flex items-center gap-1 truncate"><MapPin size={10} />{endereco}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => toggleStatus(c)} className={`p-1.5 rounded-lg transition-colors ${isAtivo ? 'text-[#06C167]/60 hover:text-[#06C167] hover:bg-[#06C167]/10' : 'text-white/25 hover:text-white hover:bg-white/[0.08]'}`}>
                        {isAtivo ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                      <button onClick={() => { setSelecionado(c); setTimeout(() => abrirEditar(c), 50) }} className="p-1.5 rounded-lg text-white/25 hover:text-white hover:bg-white/[0.08] transition-colors">
                        <Pencil size={14} />
                      </button>
                      <ChevronRight size={14} className="text-white/20 ml-1" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detalhe */}
      {selecionado && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#111] md:relative md:inset-auto md:z-auto md:w-80 md:shrink-0 border-l border-white/[0.07] overflow-y-auto">
          <div className="px-5 py-4 border-b border-white/[0.07] flex items-center gap-3 sticky top-0 bg-[#111] z-10">
            <button onClick={() => setSelecionado(null)} className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors">
              <ArrowLeft size={16} />
              <span className="text-sm md:hidden">Voltar</span>
            </button>
            <span className="text-sm font-bold text-white flex-1">Detalhes</span>
            <button onClick={() => setSelecionado(null)} className="hidden md:block p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors"><X size={16} /></button>
          </div>

          <div className="p-5 space-y-5">
            <div className="flex flex-col items-center text-center gap-3 py-2">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-black shadow-lg" style={{ backgroundColor: getAvatarColor(selecionado.nome_empresa || '') }}>
                {getInitials(selecionado.nome_empresa || '?')}
              </div>
              <div>
                <div className="font-bold text-white text-base leading-tight">{selecionado.nome_empresa}</div>
                <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${selecionado.status === 'ativo' ? 'bg-[#06C167]/15 text-[#06C167]' : 'bg-[#EF233C]/15 text-[#EF233C]'}`}>
                    {selecionado.status === 'ativo' ? 'Ativo' : 'Inativo'}
                  </span>
                  {selecionado.pagamento_mensal && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-[#AF52DE]/15 text-[#AF52DE]">Pagamento Mensal</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-3 text-center">
                <div className="text-xl font-black text-white">{selecionado.total_pedidos}</div>
                <div className="text-[10px] text-white/40 mt-0.5">pedidos</div>
              </div>
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-3 text-center flex flex-col items-center">
                <div className="flex items-center gap-1">
                  <Star size={13} className="text-[#F59E0B]" fill="#F59E0B" />
                  <span className="text-xl font-black text-white">{selecionado.pontos ?? 0}</span>
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">pontos</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Contato</div>
              {[
                { icon: Phone, value: selecionado.telefone },
                { icon: Mail,  value: selecionado.email    },
              ].filter(f => f.value).map(({ icon: Icon, value }, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0"><Icon size={13} className="text-white/50" /></div>
                  <span className="text-sm text-white break-all">{value}</span>
                </div>
              ))}
            </div>

            {(selecionado.rua_avenida || selecionado['rua/avenida'] || selecionado.bairro_empresa || selecionado.cidade_empresa) && (
              <div className="space-y-3">
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Endereço</div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5"><MapPin size={13} className="text-white/50" /></div>
                  <div className="text-sm text-white space-y-0.5">
                    {(selecionado.rua_avenida || selecionado['rua/avenida']) && (
                      <div>{selecionado.rua_avenida || selecionado['rua/avenida']}{(selecionado.numero_endereco_empresa || selecionado['numero_endereço_empresa']) ? `, ${selecionado.numero_endereco_empresa || selecionado['numero_endereço_empresa']}` : ''}</div>
                    )}
                    {selecionado.bairro_empresa && <div className="text-white/50">{selecionado.bairro_empresa}</div>}
                    {selecionado.cidade_empresa && <div className="text-white/50">{selecionado.cidade_empresa}</div>}
                    {selecionado.cep_empresa && <div className="text-white/30 text-xs">CEP {selecionado.cep_empresa}</div>}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              <div className="flex justify-between text-xs">
                <span className="text-white/30">Cadastrado em</span>
                <span className="text-white/60">{selecionado.criado_em ? new Date(selecionado.criado_em).toLocaleDateString('pt-BR') : '—'}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button onClick={() => toggleStatus(selecionado)}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-colors ${selecionado.status === 'ativo' ? 'bg-[#EF233C]/10 text-[#EF233C] hover:bg-[#EF233C]/20' : 'bg-[#06C167]/10 text-[#06C167] hover:bg-[#06C167]/20'}`}>
                {selecionado.status === 'ativo' ? 'Desativar cliente' : 'Ativar cliente'}
              </button>
              <button onClick={() => abrirEditar(selecionado)} className="w-full bg-white hover:bg-white/90 text-black text-sm font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                <Pencil size={14} /> Editar informações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && editForm && selecionado && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4">
          <div className="bg-[#111] border border-white/[0.08] rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
              <h2 className="font-bold text-white text-base">Editar cliente</h2>
              <button onClick={() => setEditModal(false)} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06]"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <Field label="Nome / Empresa" value={editForm.nome_empresa} onChange={v => setF('nome_empresa', v)} />
              <Field label="Telefone" value={editForm.telefone} onChange={v => setF('telefone', v)} type="tel" />
              <Field label="E-mail" value={editForm.email} onChange={v => setF('email', v)} type="email" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rua / Avenida" value={editForm.rua_avenida} onChange={v => setF('rua_avenida', v)} />
                <Field label="Número" value={editForm.numero_endereco_empresa} onChange={v => setF('numero_endereco_empresa', v)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bairro" value={editForm.bairro_empresa} onChange={v => setF('bairro_empresa', v)} />
                <Field label="Cidade" value={editForm.cidade_empresa} onChange={v => setF('cidade_empresa', v)} />
              </div>
              <Field label="CEP" value={editForm.cep_empresa} onChange={v => setF('cep_empresa', v)} />
              <Field label="Pontos" value={editForm.pontos} onChange={v => setF('pontos', v)} type="number" />

              {/* Pagamento mensal toggle */}
              <div className="bg-[#AF52DE]/10 border border-[#AF52DE]/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard size={16} className="text-[#AF52DE]" />
                    <div>
                      <p className="text-sm font-bold text-white">Pagamento Mensal</p>
                      <p className="text-xs text-white/40">Habilita forma de pagamento especial</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setF('pagamento_mensal', !editForm.pagamento_mensal)}
                    className={`w-12 h-6 rounded-full transition-all relative ${editForm.pagamento_mensal ? 'bg-[#AF52DE]' : 'bg-white/[0.1]'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${editForm.pagamento_mensal ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 p-6 pt-0">
              <button onClick={() => setEditModal(false)} className="flex-1 py-3 rounded-xl bg-white/[0.06] text-white/60 text-sm font-semibold hover:text-white transition-colors">Cancelar</button>
              <button onClick={salvarEdicao} disabled={salvando}
                className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                <Save size={14} />{salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#06C167] text-black text-sm font-bold px-5 py-3 rounded-xl shadow-2xl z-[9999]">{toast}</div>}
    </div>
  )
}
