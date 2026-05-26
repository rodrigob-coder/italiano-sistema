'use client'
import { useEffect, useRef } from 'react'

type Motorista = {
  id: string
  nome: string
  lat: number
  lng: number
  atualizado_em: string
}

type Entrega = {
  id: string
  destino_lat: number
  destino_lng: number
  endereco: string
  status: string
  motorista_nome?: string
}

type Props = {
  motoristas: Motorista[]
  entregas: Entrega[]
}

export default function MapaEntregas({ motoristas, entregas }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return

    async function initMap() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')

      // Consertar ícones padrão do Leaflet no Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      if (!mapInstance.current) {
        // Centro padrão: Blumenau/SC (ajuste conforme cidade do cliente)
        mapInstance.current = L.map(mapRef.current!).setView([-26.9, -49.07], 13)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
        }).addTo(mapInstance.current)
      }

      // Limpar markers antigos
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []

      // Ícone motorista (azul)
      const iconMotorista = L.divIcon({
        html: `<div style="background:#3b82f6;width:32px;height:32px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.4)">🚚</div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      // Ícone entrega (roxo)
      const iconEntrega = L.divIcon({
        html: `<div style="background:#8b5cf6;width:28px;height:28px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.4)">📍</div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      })

      // Plotar motoristas
      motoristas.forEach(m => {
        if (!m.lat || !m.lng) return
        const marker = L.marker([m.lat, m.lng], { icon: iconMotorista })
          .addTo(mapInstance.current)
          .bindPopup(`<b>${m.nome}</b><br>Atualizado: ${new Date(m.atualizado_em).toLocaleTimeString('pt-BR')}`)
        markersRef.current.push(marker)
      })

      // Plotar destinos de entrega
      entregas.forEach(e => {
        if (!e.destino_lat || !e.destino_lng) return
        const cor = e.status === 'entregue' ? '#22c55e' : e.status === 'em_rota' ? '#f59e0b' : '#8b5cf6'
        const marker = L.marker([e.destino_lat, e.destino_lng], { icon: iconEntrega })
          .addTo(mapInstance.current)
          .bindPopup(`<b>${e.endereco || 'Endereço'}</b><br>Status: ${e.status}${e.motorista_nome ? '<br>Motorista: ' + e.motorista_nome : ''}`)
        markersRef.current.push(marker)
      })

      // Ajustar zoom para incluir todos os pontos
      const todos = [
        ...motoristas.filter(m => m.lat).map(m => [m.lat, m.lng] as [number, number]),
        ...entregas.filter(e => e.destino_lat).map(e => [e.destino_lat, e.destino_lng] as [number, number]),
      ]
      if (todos.length > 0) {
        mapInstance.current.fitBounds(L.latLngBounds(todos), { padding: [40, 40] })
      }
    }

    initMap()
  }, [motoristas, entregas])

  return <div ref={mapRef} className="w-full h-full rounded-xl" style={{ minHeight: 480 }} />
}
