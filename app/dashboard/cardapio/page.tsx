'use client'
import { useEffect, useState } from 'react'
import { createAdminClient } from '@/lib/supabase'
import { Plus, Pencil, Trash2, Search, X, Package, Image as ImageIcon } from 'lucide-react'
import { toTitleCase } from '@/lib/titleCase'

const sb = createAdminClient()

type Produto = { Categoria: string; Código: number; Produto: string; Preço: string; Unidade: string; foto_url?: string | null }
type Form = Omit<Produto, 'Código'> & { Código: string }

const vazio: Form = { Categoria: '', Código: '', Produto: '', Preço: '', Unidade: 'UN', foto_url: '' }
const unidades = ['UN', 'KG', 'PT', 'CX']

type CatConfig = { emoji: string; color: string; gradient: string; badge: string }

function getCatConfig(categoria: string): CatConfig {
  const c = (categoria || '').toLowerCase()
  if (c.includes('salgado'))  return { emoji: '🥟', color: '#FF9500', gradient: 'from-[#FF9500]/25 to-[#FF9500]/5', badge: 'bg-[#FF9500]/15 text-[#FF9500]' }
  if (c.includes('assado'))   return { emoji: '🥐', color: '#FFD60A', gradient: 'from-[#FFD60A]/25 to-[#FFD60A]/5', badge: 'bg-[#FFD60A]/15 text-[#FFD60A]' }
  if (c.includes('churros') || c.includes('doce')) return { emoji: '🍩', color: '#FF375F', gradient: 'from-[#FF375F]/25 to-[#FF375F]/5', badge: 'bg-[#FF375F]/15 text-[#FF375F]' }
  if (c.includes('hamburguer') || c.includes('burger')) return { emoji: '🍔', color: '#FF3B30', gradient: 'from-[#FF3B30]/25 to-[#FF3B30]/5', badge: 'bg-[#FF3B30]/15 text-[#FF3B30]' }
  if (c.includes('pizza') || c.includes('calzone') || c.includes('esfiha')) return { emoji: '🍕', color: '#FF3B30', gradient: 'from-[#FF3B30]/25 to-[#FF3B30]/5', badge: 'bg-[#FF3B30]/15 text-[#FF3B30]' }
  if (c.includes('kibe'))     return { emoji: '🧆', color: '#FF9F0A', gradient: 'from-[#FF9F0A]/25 to-[#FF9F0A]/5', badge: 'bg-[#FF9F0A]/15 text-[#FF9F0A]' }
  if (c.includes('polenta'))  return { emoji: '🌽', color: '#FFD60A', gradient: 'from-[#FFD60A]/25 to-[#FFD60A]/5', badge: 'bg-[#FFD60A]/15 text-[#FFD60A]' }
  if (c.includes('risolis') || c.includes('risol')) return { emoji: '🥙', color: '#FF9500', gradient: 'from-[#FF9500]/25 to-[#FF9500]/5', badge: 'bg-[#FF9500]/15 text-[#FF9500]' }
  return { emoji: '📦', color: '#AF52DE', gradient: 'from-[#AF52DE]/25 to-[#AF52DE]/5', badge: 'bg-[#AF52DE]/15 text-[#AF52DE]' }
}

function getProductEmoji(nome: string): string {
  const n = nome.toLowerCase()
  if (n.includes('coxinha'))    return '🍗'
  if (n.includes('frango'))     return '🍗'
  if (n.includes('queijo'))     return '🧀'
  if (n.includes('pizza'))      return '🍕'
  if (n.includes('esfiha'))     return '🥙'
  if (n.includes('kibe'))       return '🧆'
  if (n.includes('churros'))    return '🍩'
  if (n.includes('polenta'))    return '🌽'
  if (n.includes('hamburguer') || n.includes('burger')) return '🍔'
  if (n.includes('risolis') || n.includes('risol'))     return '🥙'
  if (n.includes('calzone'))    return '🫓'
  if (n.includes('doce') || n.includes('brigadeiro'))   return '🍰'
  if (n.includes('torta'))      return '🥧'
  if (n.includes('pao') || n.includes('pão'))           return '🍞'
  if (n.includes('salsicha') || n.includes('hot'))      return '🌭'
  if (n.includes('camarao') || n.includes('camarão'))   return '🦐'
  if (n.includes('bacalhau'))   return '🐟'
  if (n.includes('carne') || n.includes('bife'))        return '🥩'
  if (n.includes('linguica') || n.includes('linguiça')) return '🍖'
  if (n.includes('pastel'))     return '🥐'
  return '🥟'
}

export default function CardapioPage() {
  const [itens, setItens] = useState<Produto[]>([])
  const [filtro, setFiltro] = useState('')
  const [catFiltro, setCatFiltro] = useState('Todas')
  const [form, setForm] = useState<Form>(vazio)
  const [editando, setEditando] = useState<number | null>(null)
  const [modal, setModal] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState('')

  const categorias = ['Todas', ...Array.from(new Set(itens.map(i => i.Categoria?.trim()).filter(Boolean))).sort()]
  const filtrados = itens.filter(i => {
    const cat = i.Categoria?.trim() || ''
    return (catFiltro === 'Todas' || cat === catFiltro) && (!filtro || i.Produto?.toLowerCase().includes(filtro.toLowerCase()) || cat.toLowerCase().includes(filtro.toLowerCase()))
  })

  useEffect(() => {
    carregar()
    const canal = sb.channel('cardapio-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cardapio' }, carregar)
      .subscribe()
    return () => { sb.removeChannel(canal) }
  }, [])

  async function carregar() {
    const { data } = await sb.from('cardapio').select('*').order('Categoria').order('Produto')
    const seen = new Set<string>()
    const unicos = (data || []).filter((p: Record<string, unknown>) => {
      const key = String(p.Produto ?? '').trim().toUpperCase()
      if (!key || seen.has(key)) return false
      seen.add(key); return true
    })
    setItens(unicos as Produto[])
  }

  function abrirNovo() { setForm(vazio); setEditando(null); setModal(true) }
  function abrirEditar(p: Produto) { setForm({ ...p, Código: String(p.Código), foto_url: p.foto_url || '' }); setEditando(p.Código); setModal(true) }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    const row = { ...form, Código: Number(form.Código), foto_url: form.foto_url?.trim() || null }
    const { error } = editando !== null
      ? await sb.from('cardapio').update(row).eq('Código', editando)
      : await sb.from('cardapio').insert(row)
    setSalvando(false)
    if (error) { setToast('Erro: ' + error.message); return }
    setToast(editando !== null ? 'Produto atualizado!' : 'Produto adicionado!')
    setModal(false)
    carregar()
    setTimeout(() => setToast(''), 3000)
  }

  async function excluir(codigo: number) {
    if (!confirm('Excluir este produto?')) return
    await sb.from('cardapio').delete().eq('Código', codigo)
    carregar()
  }

  return (
    <div className="h-full flex flex-col bg-black">
      <div className="px-4 md:px-6 py-4 md:py-5 border-b border-white/[0.07]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Cardápio</h1>
            <p className="text-xs text-white/30 mt-0.5">{itens.length} produtos · {filtrados.length} visíveis</p>
          </div>
          <button onClick={abrirNovo} className="flex items-center gap-2 bg-white hover:bg-white/90 text-black text-sm font-bold px-3 md:px-4 py-2.5 rounded-xl transition-colors shadow-md">
            <Plus size={15} /> <span className="hidden sm:inline">Novo produto</span>
          </button>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
          <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Buscar produto ou categoria..."
            className="w-full bg-[#1a1a1a] border border-white/[0.07] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/[0.14] transition-colors"
          />
          {filtro && <button onClick={() => setFiltro('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"><X size={14} /></button>}
        </div>
      </div>

      <div className="px-4 md:px-6 py-3 border-b border-white/[0.04] flex gap-2 overflow-x-auto no-scrollbar">
        {categorias.map(c => {
          const cfg = c !== 'Todas' ? getCatConfig(c) : null
          return (
            <button key={c} onClick={() => setCatFiltro(c)}
              className={`shrink-0 text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap ${catFiltro === c ? 'bg-white text-black shadow-md' : 'bg-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.10]'}`}>
              {cfg ? `${cfg.emoji} ${c}` : c}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Package size={44} className="text-white/10 mb-4" strokeWidth={1} />
            <p className="text-sm text-white/25">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtrados.map((p, i) => {
              const cfg = getCatConfig(p.Categoria)
              const prodEmoji = getProductEmoji(p.Produto)
              const nomeFormatado = toTitleCase(p.Produto)
              return (
                <div key={`${p.Código}-${i}`} className="bg-[#111] border border-white/[0.07] rounded-2xl overflow-hidden hover:border-white/[0.14] transition-all group">
                  <div className={`h-28 md:h-32 flex items-center justify-center bg-gradient-to-b ${cfg.gradient} relative overflow-hidden`}>
                    {p.foto_url ? (
                      <img src={p.foto_url} alt={nomeFormatado} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-0.5 select-none">
                        <span className="text-4xl drop-shadow-lg">{prodEmoji}</span>
                        <span className="text-xl opacity-40">{cfg.emoji}</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => abrirEditar(p)} className="w-7 h-7 rounded-lg bg-black/60 backdrop-blur flex items-center justify-center text-white/60 hover:text-white transition-colors"><Pencil size={12} /></button>
                      <button onClick={() => excluir(p.Código)} className="w-7 h-7 rounded-lg bg-black/60 backdrop-blur flex items-center justify-center text-white/60 hover:text-[#EF233C] transition-colors"><Trash2 size={12} /></button>
                    </div>
                    {p.foto_url && (
                      <div className="absolute bottom-1 right-1 w-5 h-5 rounded-md bg-black/50 backdrop-blur flex items-center justify-center">
                        <ImageIcon size={10} className="text-white/60" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-1.5">
                    <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{p.Categoria}</span>
                    <div className="text-sm font-bold text-white leading-tight line-clamp-2" title={nomeFormatado}>{nomeFormatado}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-[#06C167]">R$ {p.Preço}</span>
                      <span className="text-[10px] text-white/30 font-medium">{p.Unidade}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#06C167] text-black text-sm font-bold px-5 py-3 rounded-xl shadow-2xl z-50">{toast}</div>}

      {modal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-[#111] border border-white/[0.08] rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-white text-lg">{editando !== null ? 'Editar produto' : 'Novo produto'}</h2>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={salvar} className="space-y-4">
              {([
                { id: 'Código',  label: 'Código',  type: 'number', placeholder: '123'                        },
                { id: 'Produto', label: 'Produto',  type: 'text',   placeholder: 'Coxinha de Frango 10und'   },
                { id: 'Preço',   label: 'Preço',    type: 'text',   placeholder: '21,75'                     },
              ] as const).map(f => (
                <div key={f.id}>
                  <label className="block text-xs font-semibold text-white/40 mb-1.5 uppercase tracking-wide">{f.label}</label>
                  <input type={f.type} required value={(form as Record<string, string>)[f.id]} placeholder={f.placeholder}
                    onChange={e => setForm(prev => ({ ...prev, [f.id]: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-1.5 uppercase tracking-wide">Categoria</label>
                <input list="cats" value={form.Categoria} required placeholder="Ex: Salgados Fritos"
                  onChange={e => setForm(prev => ({ ...prev, Categoria: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                />
                <datalist id="cats">{categorias.filter(c => c !== 'Todas').map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-1.5 uppercase tracking-wide">Unidade</label>
                <select value={form.Unidade} onChange={e => setForm(prev => ({ ...prev, Unidade: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 transition-colors">
                  {unidades.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/40 mb-1.5 uppercase tracking-wide flex items-center gap-1">
                  <ImageIcon size={11} /> Foto do produto (URL)
                </label>
                <input type="url" value={form.foto_url || ''} placeholder="https://exemplo.com/foto.jpg"
                  onChange={e => setForm(prev => ({ ...prev, foto_url: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                />
                {form.foto_url && (
                  <div className="mt-2 rounded-xl overflow-hidden h-24 bg-[#1a1a1a]">
                    <img src={form.foto_url} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <p className="text-[10px] text-white/20 mt-1">Deixe vazio para usar emoji automático baseado no nome.</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 bg-white/[0.06] border border-white/[0.08] text-white/60 text-sm font-semibold py-3 rounded-xl hover:text-white transition-colors">Cancelar</button>
                <button type="submit" disabled={salvando} className="flex-1 bg-white hover:bg-white/90 disabled:bg-white/20 text-black text-sm font-bold py-3 rounded-xl transition-colors">{salvando ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
