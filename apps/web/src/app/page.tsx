import { supabase } from '@/lib/supabase';
import AiChatWidget from '@/components/AiChatWidget';
import StorefrontClient from '@/components/StorefrontClient';
import AuthGate from '@/components/AuthGate';
import Link from 'next/link';
import { Store, LayoutDashboard, ShieldCheck, Sparkles, Scale } from 'lucide-react';

export const revalidate = 15;

export default async function HomePage() {
  const [bizRes, prodRes, hoursRes, revRes] = await Promise.all([
    supabase.from('businesses').select('*').order('name', { ascending: true }),
    supabase.from('products').select('*'),
    supabase.from('business_hours').select('*'),
    supabase.from('reviews').select('*').order('created_at', { ascending: false }),
  ]);

  const rawBusinesses = bizRes.data || [];
  const allProducts = prodRes.data || [];
  const allHours = hoursRes.data || [];
  const allReviews = revRes.data || [];

  const businesses = rawBusinesses.map((biz: any) => ({
    ...biz,
    products: allProducts.filter((p: any) => p.business_id === biz.id),
    business_hours: allHours.filter((h: any) => h.business_id === biz.id),
    reviews: allReviews.filter((r: any) => r.business_id === biz.id),
  }));

  return (
    <AuthGate>
      <main className="min-h-screen bg-[#F7F7F5] text-[#111111] pb-24 flex flex-col justify-between">
        <div>
          <header className="bg-white/95 border-b border-neutral-200/80 sticky top-0 z-40">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="bg-[#111111] text-white p-2.5 rounded-xl relative overflow-hidden">
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#E60012]" />
                  <Store className="w-5 h-5 relative z-10" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-black text-lg tracking-tight">EvoNuevo</h1>
                    <span className="p5-slash-badge text-[10px] font-extrabold uppercase tracking-wider bg-[#E60012] text-white px-2.5 py-0.5">
                      En Vivo
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 font-medium">
                    Pueblo Nuevo, Córdoba • Directorio y Domicilios
                  </p>
                </div>
              </div>

              <Link
                href="/admin"
                className="p5-pill-btn flex items-center gap-2 bg-[#111111] hover:bg-[#E60012] text-white px-4 py-2 text-xs font-extrabold tracking-wide"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Panel de Mi Local / Cuenta</span>
              </Link>
            </div>
          </header>

          <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
            <div className="animate-phantom flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-200 pb-6">
              <div>
                <span className="p5-slash-badge inline-block bg-[#111111] text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 mb-2">
                  Directorio Municipal
                </span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111111]">
                  Tiendas y Emprendimientos
                </h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Personaliza tu pedido, revisa valoraciones reales o pregúntale al asistente.
                </p>
              </div>
            </div>

            <StorefrontClient businesses={businesses} />
          </section>
        </div>

        <footer className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-8 pb-6 mt-12 border-t border-neutral-200 text-xs text-neutral-500 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white border border-neutral-200 rounded-2xl p-4">
            <div className="space-y-1">
              <p className="font-black text-[#111111] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Privacidad y Habeas Data
              </p>
              <p className="text-[11px] leading-relaxed">
                Conforme a la Ley 1581 de 2012 (Colombia), los datos de contacto se usan exclusivamente para gestionar domicilios con el comercio elegido y nunca se comercializan.
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-black text-[#111111] flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-[#E60012]" /> Intermediación Transparente
              </p>
              <p className="text-[11px] leading-relaxed">
                EvoNuevo conecta vecinos y emprendimientos. La preparación, precios finales, facturación y entrega corresponden directamente a cada comercio registrado.
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-black text-[#111111] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" /> Uso Responsable de IA
              </p>
              <p className="text-[11px] leading-relaxed">
                El asistente virtual consulta el catálogo registrado como apoyo informativo; en productos farmacéuticos no reemplaza fórmula ni orientación profesional.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400">
            <span>© 2026 EvoNuevo • Pueblo Nuevo, Córdoba</span>
            <span>Plataforma multi-comercio con inventario en tiempo real</span>
          </div>
        </footer>

        <AiChatWidget />
      </main>
    </AuthGate>
  );
}
