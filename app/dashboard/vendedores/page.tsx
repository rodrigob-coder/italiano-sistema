'use client'
import { useEffect, useState } from 'react'
import { createAdminClient } from '@/lib/supabase'
import { createClient } from '@/lib/supabase'
import { Search, Plus, Minus, ShoppingBag, Check, X, Building2, Truck } from 'lucide-react'
import { toTitleCase } from '@/lib/titleCase'

const sb = createAdminClient()

const EMPRESA_ID = 'd7366f17-abf7-4b2b-8cbe-26bb0d04aafa'

type Cliente = { id: string; nome_empresa: string; telefone: string; rua_avenida?: string; bairro_empresa?: string; cidade_empresa?: string }
type Produto = { Código: number; Produto: string; Preço: string; Categoria: string; Unidade: string }
type ItemCarrinho = { codigo: number; nome: string; preco: string; qty: number; unidade: string }

const PAGAMENTOS = [
  { id: 'pix',            label: 'PIX'      },
  { id: 'dinheiro',       label: 'Dinheiro' },
  { id: 'cartao_credito', label: 'Crédito'  },
  { id: 'cartao_debito',  label: 'Débito'   },
  { id: 'pagamento_mensal', label: 'Mensal' },
]

export default function VendedoresPage() {
  const [clientes, setClientes]     = useState<Cliente[]>([])
  const [produtos, setProdutos]     = useState<Produto[]>([])
  const [clienteSel, setClienteSel] = useState<Cliente | null>(null)
  const [buscaCli, setBuscaCli]     = useState('')
  const [buscaProd, setBuscaProd]   = useState('')
  const [carrinho, setCarrinho]     = useState<ItemCarrinho[]>([])
  const [pagamento, setPagamento]   = useState('dinheiro')
  const [obs, setObs]               = useState('')
  const [enviando, setEnviando]     = useState(false)
  const [sucesso, setSucesso]       = useState('')
  const [erro, setErro]             = useState('')
  const [vendedorNome, setVendedorNome] = useState('Vendedor')
  const [step, setStep]             = useState<'cliente' | 'pedido'>('cliente')

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setVendedorNome(user.email.split('@')[0])
    })
    sb.from('clientes').select('id, nome_empresa, telefone, rua_avenida, bairro_empresa, cidade_empresa').order('nome_empresa').then(({ data }) => setClientes((data || []) as Cliente[]))
    sb.from('cardapio').select('*').order('Categoria').order('Produto').then(({ data }) => {
      const seen = new Set<string>()
      const unicos = (data || []).filter((p: Record<string, unknown>) => {
        const k = String(p.Produto ?? '').trim().toUpperCase()
        if (!k || seen.has(k)) return false
        seen.add(k); return true
      })
      setProdutos(unicos as Produto[])
    })
  }, [])

  function addItem(p: Produto) {
    setCarrinho(prev => {
      const ex = prev.find(i => i.codigo === p.Código)
      if (ex) return prev.map(i => i.codigo === p.Código ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { codigo: p.Código, nome: p.Produto, preco: p.Preço, qty: 1, unidade: p.Unidade }]
    })
  }

  function removeItem(codigo: number) {
    setCarrinho(prev => {
      const ex = prev.find(i => i.codigo === codigo)
      if (!ex) return prev
      if (ex.qty === 1) return prev.filter(i => i.codigo !== codigo)
      return prev.map(i => i.codigo === codigo ? { ...i, qty: i.qty - 1 } : i)
    })
  }

  const total = carrinho.reduce((s, i) => s + parseFloat(i.preco.replace(',', '.')) * i.qty, 0)
  const totalItens = carrinho.reduce((s, i) => s + i.qty, 0)

  const clisFiltrados = clientes.filter(c =>
    c.nome_empresa.toLowerCase().includes(buscaCli.toLowerCase()) ||
    (c.telefone || '').includes(buscaCli)
  )

  const prodFiltrados = produtos.filter(p =>
    p.Produto.toLowerCase().includes(buscaProd.toLowerCase()) ||
    p.Categoria.toLowerCase().includes(buscaProd.toLowerCase())
  )

  async function enviarPedido() {
    if (!clienteSel) { setErro('Selecione um cliente'); return }
    if (carrinho.length === 0) { setErro('Adicione ao menos um produto'); return }

    setEnviando(true)
    setErro('')

    const numPedido = `VND-${Date.now().toString().slice(-6)}`
    const produtoTexto = carrinho.map(i => `${i.nome} x${i.qty}`).join(', ')

    const { data: ped, error } = await sb.from('pedidos').insert({
      empresa_id:     EMPRESA_ID,
      cliente_id:     clienteSel.id,
      numero_pedido:  numPedido,
      status:         'pedido_iniciado',
      valor_total:    total.toFixed(2).replace('.', ','),
      forma_pagamento: pagamento,
      produto_pedido: produtoTexto,
      vendedor_nome:  vendedorNome,
      observacoes: [
        `Pedido externo por: ${vendedorNome}`,
        `Cliente: ${clienteSel.nome_empresa}`,
        `Tel: ${clienteSel.telefone}`,
        obs ? `Obs: ${obs}` : '',
      ].filter(Boolean).join(' | '),
      data_pedido:    new Date().toISOString(),
      criado_em:      new Date().toISOString(),
      atualizado_em:  new Date().toISOString(),
    }).select('id').single()

    if (error || !ped) { setErro('Erro ao enviar: ' + error?.message); setEnviando(false); return }

    await sb.from('itens_pedidos').insert(
      carrinho.map(i => ({
        pedido_id:      ped.id,
        produto_nome:   i.nome,
        quantidade:     String(i.qty),
        preco_unitario: i.preco,
        subtotal:       (parseFloat(i.preco.replace(',', '.')) * i.qty).toFixed(2).replace('.', ','),
        criado_em:      new Date().toISOString(),
      }))
    )

    setEnviando(false)
    setSucesso(`Pedido ${numPedido} enviado para ${clienteSel.nome_empresa}!`)
    setCarrinho([])
    setClienteSel(null)
    setStep('cliente')
    setBuscaCli('')
    setObs('')
    setTimeout(() => setSucesso(''), 5000)
  }

  return (
    <div className="h-full flex flex-col bg-black">
      <div className="px-4 md:px-6 py-4 md:py-5 border-b border-white/[0.07]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#007AFF]/15 flex items-center justify-center">
            <Truck size={18} className="text-[#007AFF]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Pedido Externo</h1>
            <p className="text-xs text-white/30">Vendedor: <span className="text-white/60 font-semibold">{vendedorNome}</span></p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left: Cliente + Produtos */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">

          {/* Step 1 — Cliente */}
          <div className="bg-[#111] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 size={14} className="text-white/40" /> Cliente
              </h2>
              {clienteSel && (
                <button onClick={() => { setClienteSel(null); setStep('cliente') }} className="text-white/30 hover:text-white"><X size={14} /></button>
              )}
            </div>

            {clienteSel ? (
              <div className="px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#007AFF]/20 flex items-center justify-center text-sm font-black text-[#007AFF]">
                  {clienteSel.nome_empresa.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{clienteSel.nome_empresa}</p>
                  <p className="text-xs text-white/40">{clienteSel.telefone}</p>
                </div>
                <Check size={16} className="text-[#06C167] ml-auto" />
              </div>
            ) : (
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-3 py-2.5">
                  <Search size={13} className="text-white/25" />
                  <input value={buscaCli} onChange={e => setBuscaCli(e.target.value)}
                    placeholder="Buscar cliente..." autoFocus
                    className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {clisFiltrados.slice(0, 15).map(c => (
                    <button key={c.id} onClick={() => { setClienteSel(c); setStep('pedido') }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors">
                      <p className="text-sm font-semibold text-white">{c.nome_empresa}</p>
                      <p className="text-xs text-white/30">{c.telefone}</p>
                    </button>
                  ))}
                  {buscaCli && clisFiltrados.length === 0 && (
                    <p className="text-xs text-white/25 text-center py-4">Nenhum cliente encontrado</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Step 2 — Produtos */}
          {clienteSel && (
            <div className="bg-[#111] border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/[0.06]">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShoppingBag size={14} className="text-white/40" /> Produtos
                </h2>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-3 py-2.5">
                  <Search size={13} className="text-white/25" />
                  <input value={buscaProd} onChange={e => setBuscaProd(e.target.value)}
                    placeholder="Buscar produto..."
                    className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none"
                  />
                </div>
                <div className="max-h-72 overflow-y-auto space-y-1">
                  {prodFiltrados.slice(0, 30).map(p => {
                    const item = carrinho.find(i => i.codigo === p.Código)
                    const qty = item?.qty || 0
                    return (
                      <div key={p.Código} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03]">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{toTitleCase(p.Produto)}</p>
                          <p className="text-xs text-white/30">{p.Categoria} · R$ {p.Preço}/{p.Unidade}</p>
                        </div>
                        {qty === 0 ? (
                          <button onClick={() => addItem(p)}
                            className="w-8 h-8 rounded-full bg-[#EF233C] flex items-center justify-center active:scale-90">
                            <Plus size={14} className="text-white" />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-[#EF233C] rounded-full px-2 py-1">
                            <button onClick={() => removeItem(p.Código)}><Minus size={12} className="text-white" /></button>
                            <span className="text-white text-xs font-black min-w-[16px] text-center">{qty}</span>
                            <button onClick={() => addItem(p)}><Plus size={12} className="text-white" /></button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Carrinho + Enviar */}
        <div className="w-full md:w-80 md:shrink-0 border-t md:border-t-0 md:border-l border-white/[0.07] bg-[#0a0a0a] flex flex-col">
          <div className="px-5 py-4 border-b border-white/[0.07]">
            <h2 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Carrinho</span>
              {totalItens > 0 && <span className="text-xs bg-[#EF233C] text-white px-2 py-0.5 rounded-full font-bold">{totalItens}</span>}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {carrinho.length === 0 ? (
              <p className="text-white/20 text-sm text-center py-8">Nenhum item</p>
            ) : (
              carrinho.map(i => (
                <div key={i.codigo} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{toTitleCase(i.nome)}</p>
                    <p className="text-[10px] text-white/30">R$ {i.preco} × {i.qty}</p>
                  </div>
                  <span className="text-xs font-bold text-white shrink-0">
                    R$ {(parseFloat(i.preco.replace(',', '.')) * i.qty).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              ))
            )}
          </div>

          {carrinho.length > 0 && (
            <div className="p-4 border-t border-white/[0.07] space-y-3">
              <div className="flex justify-between font-bold text-white text-sm">
                <span>Total</span>
                <span className="text-[#F59E0B]">R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>

              <div>
                <label className="text-[10px] text-white/30 uppercase tracking-wide font-semibold block mb-1.5">Pagamento</label>
                <select value={pagamento} onChange={e => setPagamento(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white outline-none">
                  {PAGAMENTOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-white/30 uppercase tracking-wide font-semibold block mb-1.5">Observações</label>
                <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} placeholder="..."
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 outline-none resize-none"
                />
              </div>

              {erro && <p className="text-xs text-[#EF233C] bg-[#EF233C]/10 rounded-xl px-3 py-2">{erro}</p>}

              <button onClick={enviarPedido} disabled={enviando || !clienteSel}
                className="w-full py-3 rounded-xl font-bold text-sm bg-[#EF233C] text-white hover:bg-[#EF233C]/90 disabled:opacity-40 transition-colors">
                {enviando ? 'Enviando...' : 'Confirmar pedido'}
              </button>
            </div>
          )}
        </div>
      </div>

      {sucesso && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#06C167] text-black text-sm font-bold px-5 py-3 rounded-xl shadow-2xl z-50 max-w-xs text-center">
          {sucesso}
        </div>
      )}
    </div>
  )
}
