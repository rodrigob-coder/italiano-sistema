'use client'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Home, ClipboardList } from 'lucide-react'
import { Suspense } from 'react'

function SucessoContent() {
  const params = useSearchParams()
  const router = useRouter()
  const num = params.get('num') || 'PED-??????'
  const nome = params.get('nome') || ''

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center px-6 gap-8">
      {/* Icon */}
      <div className="relative">
        <div className="w-28 h-28 rounded-3xl bg-[#06C167]/10 border border-[#06C167]/20 flex items-center justify-center">
          <CheckCircle2 size={52} className="text-[#06C167]" strokeWidth={1.5} />
        </div>
        <div className="absolute inset-0 rounded-3xl" style={{ boxShadow: '0 0 60px #06C16730' }} />
      </div>

      {/* Text */}
      <div className="text-center space-y-3">
        <h1 className="text-white font-black text-2xl leading-tight">
          Pedido enviado!
        </h1>
        {nome && (
          <p className="text-white/50 text-sm">
            Obrigado, <span className="text-white font-semibold">{nome}</span>!
          </p>
        )}
        <p className="text-white/35 text-sm leading-relaxed max-w-xs mx-auto">
          Seu pedido foi recebido e está sendo preparado. Em breve entraremos em contato.
        </p>
      </div>

      {/* Order number */}
      <div className="bg-[#141414] border border-white/[0.06] rounded-2xl px-8 py-5 text-center">
        <p className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-1.5">Número do pedido</p>
        <p className="text-white font-black text-2xl tracking-widest">{num}</p>
      </div>

      {/* Info cards */}
      <div className="w-full max-w-sm space-y-2">
        <div className="bg-[#141414] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center shrink-0">
            <span className="text-base">📱</span>
          </div>
          <p className="text-white/50 text-xs leading-relaxed">
            Acompanhe seu pedido pelo WhatsApp ou na aba <span className="text-white font-semibold">Pedidos</span>
          </p>
        </div>
        <div className="bg-[#141414] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#06C167]/10 flex items-center justify-center shrink-0">
            <span className="text-base">🚚</span>
          </div>
          <p className="text-white/50 text-xs leading-relaxed">
            Tempo estimado de entrega: <span className="text-white font-semibold">30–45 minutos</span>
          </p>
        </div>
      </div>

      {/* CTAs */}
      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={() => router.replace('/loja')}
          className="w-full py-4 rounded-2xl font-black text-white text-base active:scale-[0.98] transition-transform"
          style={{ background: '#EF233C', boxShadow: '0 8px 32px #EF233C50' }}>
          <Home size={18} className="inline mr-2 -mt-0.5" />
          Voltar ao cardápio
        </button>
        <button
          onClick={() => router.replace('/loja/pedidos')}
          className="w-full py-4 rounded-2xl font-bold text-white/60 text-sm border border-white/[0.08] bg-[#141414] active:scale-[0.98] transition-transform">
          <ClipboardList size={16} className="inline mr-2 -mt-0.5" />
          Ver meus pedidos
        </button>
      </div>
    </div>
  )
}

export default function SucessoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#EF233C] border-t-transparent animate-spin" />
      </div>
    }>
      <SucessoContent />
    </Suspense>
  )
}
