import { supabase } from '@/lib/supabase';
import AuthGate from '@/components/AuthGate';
import StorefrontClient from '@/components/StorefrontClient';
import AiChatWidget from '@/components/AiChatWidget';
import Link from 'next/link';
import { ArrowLeft, Store } from 'lucide-react';
import { notFound } from 'next/navigation';

export const revalidate = 15;

export default async function SingleStorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: biz } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!biz) {
    notFound();
  }

  const [prodRes, hoursRes, revRes] = await Promise.all([
    supabase.from('products').select('*').eq('business_id', biz.id).order('name'),
    supabase.from('business_hours').select('*').eq('business_id', biz.id),
    supabase
      .from('reviews')
      .select('*')
      .eq('business_id', biz.id)
      .order('created_at', { ascending: false }),
  ]);

  const enrichedBusiness = {
    ...biz,
    products: prodRes.data || [],
    business_hours: hoursRes.data || [],
    reviews: revRes.data || [],
  };

  return (
    <AuthGate>
      <main className="min-h-screen bg-[#F7F7F5] text-[#111111] pb-24">
        <header className="bg-white/95 border-b border-neutral-200/80 sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
            <Link
              href="/"
              className="p5-pill-btn inline-flex items-center gap-2 bg-neutral-100 hover:bg-[#111111] hover:text-white px-3.5 py-2 text-xs font-extrabold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Todas las tiendas</span>
            </Link>

            <div className="flex items-center gap-2">
              <div className="bg-[#111111] text-white p-1.5 rounded-lg">
                <Store className="w-4 h-4" />
              </div>
              <span className="font-black text-sm tracking-tight">EvoNuevo</span>
            </div>
          </div>
        </header>

        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <StorefrontClient businesses={[enrichedBusiness]} singleStoreMode />
        </section>

        <AiChatWidget />
      </main>
    </AuthGate>
  );
}
