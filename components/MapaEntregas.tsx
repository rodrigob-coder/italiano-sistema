'use client'
import { useEffect, useRef } from 'react'

export type StopMapa = {
  seq: number
  lat: number
  lng: number
  endereco: string
  clienteNome: string
  status: string
  pedidoNum: string
}

export type RotaMapa = {
  id: string
  motoristaId: string
  motoristaNome: string
  motoristaLat?: number
  motoristaLng?: number
  stops: StopMapa[]
  cor: string
  finalizada?: boolean
}

type Props = {
  rotas: RotaMapa[]
  selectedMotoristaId?: string | null
}

export default function MapaEntregas({ rotas, selectedMotoristaId }: Props) {
  const mapRef      = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const layersRef   = useRef<any[]>([])

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return
    let cancelled = false

    async function initMap() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      if (cancelled) return

      if (!mapInstance.current) {
        mapInstance.current = L.map(mapRef.current!).setView([-25.464, -50.651], 14)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
        }).addTo(mapInstance.current)
      }

      layersRef.current.forEach(l => { try { l.remove() } catch {} })
      layersRef.current = []

      const allPoints: [number, number][] = []

      rotas.forEach(rota => {
        const highlighted = !selectedMotoristaId || selectedMotoristaId === rota.motoristaId
        const alpha = highlighted ? 1 : 0.2
        const cor = rota.cor
        const sorted = [...rota.stops].sort((a, b) => a.seq - b.seq)
        const entregues = sorted.filter(s => s.status === 'entregue').length

        // Rota finalizada: só mostra o marcador do motorista, sem paradas nem linhas
        if (rota.finalizada) {
          if (rota.motoristaLat && rota.motoristaLng) {
            const icon = L.divIcon({
              html: `<div style="background:#555;width:34px;height:34px;border-radius:50%;border:2px solid rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.4);opacity:0.7">🚚</div>`,
              className: '',
              iconSize: [34, 34],
              iconAnchor: [17, 17],
            })
            const m = L.marker([rota.motoristaLat, rota.motoristaLng], { icon })
              .addTo(mapInstance.current)
              .bindPopup(`<b>${rota.motoristaNome}</b><br>Rota concluída — ${entregues}/${sorted.length} entregas`)
            layersRef.current.push(m)
            allPoints.push([rota.motoristaLat, rota.motoristaLng])
          }
          return
        }

        // Route polyline: driver → all stops in sequence
        const routePoints: [number, number][] = []
        if (rota.motoristaLat && rota.motoristaLng) routePoints.push([rota.motoristaLat, rota.motoristaLng])
        sorted.forEach(s => { if (s.lat && s.lng) routePoints.push([s.lat, s.lng]) })

        if (routePoints.length > 1) {
          const line = L.polyline(routePoints, {
            color: cor,
            weight: highlighted ? 3 : 1.5,
            opacity: highlighted ? 0.75 : 0.2,
            dashArray: '10, 6',
          }).addTo(mapInstance.current)
          layersRef.current.push(line)
        }

        // Truck marker at driver position
        if (rota.motoristaLat && rota.motoristaLng) {
          const icon = L.divIcon({
            html: `<div style="background:${cor};width:38px;height:38px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 3px 14px rgba(0,0,0,0.5);opacity:${alpha}">🚚</div>`,
            className: '',
            iconSize: [38, 38],
            iconAnchor: [19, 19],
          })
          const m = L.marker([rota.motoristaLat, rota.motoristaLng], { icon, zIndexOffset: 1000 })
            .addTo(mapInstance.current)
            .bindPopup(`<b>${rota.motoristaNome}</b><br>Em rota — ${entregues}/${sorted.length} entregas`)
          layersRef.current.push(m)
          allPoints.push([rota.motoristaLat, rota.motoristaLng])
        }

        // Numbered stop markers
        sorted.forEach(stop => {
          if (!stop.lat || !stop.lng) return
          const stopCor =
            stop.status === 'entregue'     ? '#06C167' :
            stop.status === 'em_andamento' ? cor       : '#555555'
          const label = stop.status === 'entregue' ? '✓' : String(stop.seq)
          const icon = L.divIcon({
            html: `<div style="background:${stopCor};width:32px;height:32px;border-radius:50%;border:2.5px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:13px;box-shadow:0 2px 10px rgba(0,0,0,0.4);opacity:${alpha}">${label}</div>`,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })
          const m = L.marker([stop.lat, stop.lng], { icon })
            .addTo(mapInstance.current)
            .bindPopup(
              `<b>${stop.seq}. ${stop.clienteNome}</b><br>` +
              `${stop.endereco || ''}<br>` +
              `Pedido: ${stop.pedidoNum}<br>` +
              `Status: ${stop.status}`
            )
          layersRef.current.push(m)
          allPoints.push([stop.lat, stop.lng])
        })
      })

      // Warehouse depot marker
      const depotIcon = L.divIcon({
        html: `<div style="background:#1a1a1a;width:34px;height:34px;border-radius:8px;border:2px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 2px 8px rgba(0,0,0,0.5)">🏭</div>`,
        className: '',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      })
      const depot = L.marker([-25.464, -50.651], { icon: depotIcon })
        .addTo(mapInstance.current)
        .bindPopup('<b>Depósito Italiano</b><br>Ponto de partida')
      layersRef.current.push(depot)
      allPoints.push([-25.464, -50.651])

      if (allPoints.length > 1) {
        mapInstance.current.fitBounds(L.latLngBounds(allPoints), { padding: [55, 55] })
      }
    }

    initMap()
    return () => { cancelled = true }
  }, [rotas, selectedMotoristaId])

  return <div ref={mapRef} className="w-full h-full" />
}
