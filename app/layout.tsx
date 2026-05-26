import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Italiano — Sistema',
  description: 'Gestão de pedidos, entregas e atendimento',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full bg-[#0d0d0d] text-[#e0e0e0] antialiased">{children}</body>
    </html>
  )
}
