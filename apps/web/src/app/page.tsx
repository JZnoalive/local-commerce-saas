import { supabase } from '@/lib/supabase';
import AiChatWidget from '@/components/AiChatWidget';
import StorefrontClient from '@/components/StorefrontClient';
import Link from 'next/link';
import { Store, LayoutDashboard } from 'lucide-react';

export default async function HomePage() {
  const { data: businesses } = await supabase
    .from('businesses')
    .select('*, business_hours(*), products(*)');

  return (
    <main className="min-h-screen bg-[#F7F7F5] text-[#111111] pb-28">
      <header className="bg-white/90 backdrop-blur-md border-b border-neutral-200/80 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="bg-[#111111] text-white p-2.5 rounded-xl relative overflow-hidden">
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#E60012]" />
              <Store className="w-5 h-5 relative z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-lg tracking-tight">Comercio Local</h1>
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
            className="p5-pill-btn flex items-center gap-2 bg-neutral-100 hover:bg-[#111111] text-neutral-800 hover:text-white px-4 py-2 text-xs font-bold tracking-wide"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Panel Comerciante</span>
          </Link>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="animate-phantom flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-200 pb-6">
          <div>
            <span className="p5-slash-badge inline-block bg-[#111111] text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 mb-2">
              Directorio Municipal
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111111]">
              Tiendas y Emprendimientos
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              Arma tu pedido con disponibilidad real o pregúntale directamente al asistente.
            </p>
          </div>
        </div>

        <StorefrontClient businesses={businesses || []} />
      </section>

      <AiChatWidget />
    </main>
  );
}
