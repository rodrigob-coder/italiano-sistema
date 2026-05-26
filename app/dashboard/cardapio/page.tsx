'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Plus, Pencil, Trash2, Search, BookOpen } from 'lucide-react'

type Produto = { Categoria: string; Código: number; Produto: string; Preço: string; Unidade: string }
type Form = Omit<Produto, 'Código'> & { Código: string }

const vazio: Form = { Categoria: '', Código: '', Produto: '', Preço: '', Unidade: 'UN' }
const unidades = ['UN', 'KG', 'PT', 'UN/caixa', 'CX']

export default function CardapioPage() {
  const [itens, setItens] = useState<Produto[]>([])
  const [filtro, setFiltro] = useState('')
  const [form, setForm] = useState<Form>(vazio)
  const [editando, setEditando] = useState<number | null>(null)
  const [modal, setModal] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const sb = createClient()

  const categorias = [...new Set(itens.map(i => i.Categoria))].sort()
  const filtrados = itens.filter(i =>
    i.Produto?.toLowerCase().includes(filtro.toLowerCase()) ||
    i.Categoria?.toLowerCase().includes(filtro.toLowerCase())
  )

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const { data } = await sb.from('cardapio').select('*').order('Categoria').order('Produto')
    setItens((data || []) as Produto[])
  }

  function abrirNovo() {
    setForm(vazio); setEditando(null); setModal(true)
  }

  function abrirEditar(p: Produto) {
    setForm({ ...p, Código: String(p.Código) }); setEditando(p.Código); setModal(true)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    const row = { ...form, Código: Number(form.Código) }
    let erro
    if (editando !== null) {
      const r = await sb.from('cardapio').update(row).eq('Código', editando)
      erro = r.error
    } else {
      const r = await sb.from('cardapio').insert(row)
      erro = r.error
    }
    setSalvando(false)
    if (erro) { setMsg('Erro: ' + erro.message); return }
    setMsg(editando !== null ? 'Produto atualizado!' : 'Produto adicionado!')
    setModal(false)
    carregar()
    setTimeout(() => setMsg(''), 3000)
  }

  async function excluir(codigo: number) {
    if (!confirm('Excluir este produto?')) return
    await sb.from('cardapio').delete().eq('Código', codigo)
    carregar()
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Cardápio</h1>
          <p className="text-sm text-zinc-500">{itens.length} produtos cadastrados</p>
        </div>
        <button onClick={abrirNovo} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Plus size={15} /> Novo produto
        </button>
      </div>

      {msg && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-2.5 rounded-lg">{msg}</div>}

      {/* Busca */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={filtro} onChange={e => setFiltro(e.target.value)}
          placeholder="Buscar produto ou categoria..."
          className="w-full bg-[#161616] border border-[#222] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Tabela */}
      <div className="bg-[#161616] border border-[#222] rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#222] flex items-center gap-2">
          <BookOpen size={14} className="text-violet-400" />
          <span className="font-semibold text-sm text-white">Produtos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {['Cód.','Categoria','Produto','Preço','Unidade',''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {filtrados.map(p => (
                <tr key={p.Código} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-zinc-500 font-mono text-xs">{p.Código}</td>
                  <td className="px-4 py-2.5">
                    <span className="bg-violet-600/15 text-violet-400 text-xs px-2 py-0.5 rounded-full">{p.Categoria}</span>
                  </td>
                  <td className="px-4 py-2.5 text-white font-medium">{p.Produto}</td>
                  <td className="px-4 py-2.5 text-green-400 font-semibold">R$ {p.Preço}</td>
                  <td className="px-4 py-2.5 text-zinc-400">{p.Unidade}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => abrirEditar(p)} className="p-1.5 rounded text-zinc-500 hover:text-violet-400 hover:bg-violet-400/10 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => excluir(p.Código)} className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161616] border border-[#222] rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-bold text-white">{editando !== null ? 'Editar produto' : 'Novo produto'}</h2>
            <form onSubmit={salvar} className="space-y-3">
              {([
                { id: 'Código', label: 'Código', type: 'number', placeholder: '123' },
                { id: 'Produto', label: 'Nome do produto', type: 'text', placeholder: 'COXINHA 10UND' },
                { id: 'Preço', label: 'Preço (ex: 21,75)', type: 'text', placeholder: '21,75' },
              ] as const).map(f => (
                <div key={f.id}>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">{f.label}</label>
                  <input
                    type={f.type} required value={(form as any)[f.id]} placeholder={f.placeholder}
                    onChange={e => setForm(prev => ({ ...prev, [f.id]: e.target.value }))}
                    className="w-full bg-[#141414] border border-[#242424] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Categoria</label>
                <input list="cats" value={form.Categoria} required placeholder="Padaria"
                  onChange={e => setForm(prev => ({ ...prev, Categoria: e.target.value }))}
                  className="w-full bg-[#141414] border border-[#242424] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                />
                <datalist id="cats">{categorias.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Unidade</label>
                <select value={form.Unidade} onChange={e => setForm(prev => ({ ...prev, Unidade: e.target.value }))}
                  className="w-full bg-[#141414] border border-[#242424] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500">
                  {unidades.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setModal(false)} className="flex-1 bg-[#1e1e1e] border border-[#2a2a2a] text-zinc-400 text-sm font-semibold py-2 rounded-lg hover:text-white transition-colors">Cancelar</button>
                <button type="submit" disabled={salvando} className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors">
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
