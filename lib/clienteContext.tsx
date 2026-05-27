'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createAdminClient } from '@/lib/supabase'

export type Cliente = {
  id: string
  nome_empresa: string
  telefone: string
  email?: string
  rua_avenida?: string
  numero_endereco_empresa?: string
  bairro_empresa?: string
  cidade_empresa?: string
  cep_empresa?: string
  pontos?: number
}

type ClienteCtx = {
  cliente: Cliente | null
  loading: boolean
  login: (telefone: string) => Promise<{ ok: boolean; erro?: string }>
  logout: () => void
  refresh: () => Promise<void>
}

const Ctx = createContext<ClienteCtx>({
  cliente: null, loading: true,
  login: async () => ({ ok: false }),
  logout: () => {},
  refresh: async () => {},
})

export function ClienteProvider({ children }: { children: React.ReactNode }) {
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const sb = createAdminClient()

  const loadFromStorage = useCallback(async () => {
    try {
      const raw = localStorage.getItem('italiano_cliente')
      if (!raw) { setLoading(false); return }
      const saved: Cliente = JSON.parse(raw)
      // Refresh from DB to get latest pontos etc.
      const { data } = await sb.from('clientes').select('*').eq('id', saved.id).maybeSingle()
      if (data) {
        const c = mapCliente(data)
        localStorage.setItem('italiano_cliente', JSON.stringify(c))
        setCliente(c)
      } else {
        localStorage.removeItem('italiano_cliente')
      }
    } catch {
      localStorage.removeItem('italiano_cliente')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadFromStorage() }, [loadFromStorage])

  async function login(telefone: string): Promise<{ ok: boolean; erro?: string }> {
    const tel = telefone.replace(/\D/g, '')
    const variants = [tel, '55' + tel, tel.replace(/^55/, '')]
    let found: Cliente | null = null
    for (const v of variants) {
      const { data } = await sb.from('clientes').select('*').eq('telefone', v).maybeSingle()
      if (data) { found = mapCliente(data); break }
    }
    if (!found) return { ok: false, erro: 'Telefone não encontrado. Cadastre-se primeiro.' }
    localStorage.setItem('italiano_cliente', JSON.stringify(found))
    setCliente(found)
    return { ok: true }
  }

  function logout() {
    localStorage.removeItem('italiano_cliente')
    setCliente(null)
  }

  async function refresh() { await loadFromStorage() }

  return <Ctx.Provider value={{ cliente, loading, login, logout, refresh }}>{children}</Ctx.Provider>
}

export function useCliente() { return useContext(Ctx) }

function mapCliente(d: Record<string, unknown>): Cliente {
  return {
    id:                       String(d.id ?? ''),
    nome_empresa:             String(d.nome_empresa ?? d.nome ?? ''),
    telefone:                 String(d.telefone ?? ''),
    email:                    d.email ? String(d.email) : undefined,
    rua_avenida:              d.rua_avenida ? String(d.rua_avenida) : undefined,
    numero_endereco_empresa:  d.numero_endereco_empresa ? String(d.numero_endereco_empresa) : undefined,
    bairro_empresa:           d.bairro_empresa ? String(d.bairro_empresa) : undefined,
    cidade_empresa:           d.cidade_empresa ? String(d.cidade_empresa) : undefined,
    cep_empresa:              d.cep_empresa ? String(d.cep_empresa) : undefined,
    pontos:                   typeof d.pontos === 'number' ? d.pontos : 0,
  }
}
