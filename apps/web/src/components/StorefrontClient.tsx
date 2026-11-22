'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  Clock,
  MapPin,
  Phone,
  ShoppingBag,
  Plus,
  Minus,
  X,
  CheckCircle2,
  Wallet,
  Banknote,
  Search,
  ShieldCheck,
  QrCode,
  UserCheck,
  Star,
  MessageSquare,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';

interface CartLine {
  lineKey: string;
  productId: string;
  name: string;
  basePrice: number;
  unitPrice: number;
  qty: number;
  selectedOptions: { label: string; extraPrice: number }[];
}

function checkIsOpen(business: any, hours: any[]) {
  if (business.is_manually_paused) {
    return { open: false, label: 'Pausado temporalmente' };
  }

  const nowStr = new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' });
  const colombiaNow = new Date(nowStr);
  const dayOfWeek = colombiaNow.getDay();
  const currentTime = colombiaNow.toTimeString().slice(0, 8);

  const todayHours = hours?.find((h) => h.day_of_week === dayOfWeek);
  if (!todayHours || todayHours.is_closed) {
    return { open: false, label: 'Cerrado hoy' };
  }

  if (currentTime >= todayHours.open_time && currentTime <= todayHours.close_time) {
    return { open: true, label: `Abierto hasta ${todayHours.close_time.slice(0, 5)}` };
  }

  return { open: false, label: `Abre a las ${todayHours.open_time.slice(0, 5)}` };
}

function sanitizeWhatsappPhone(raw: string) {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('3')) return `57${digits}`;
  return digits;
}

function getInitials(name: string) {
  return (name || 'CL')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

function normalizeSocialUrl(raw: string, platform: 'instagram' | 'facebook' | 'tiktok') {
  const val = (raw || '').trim();
  if (!val) return '';
  if (/^https?:\/\//i.test(val)) return val;
  const handle = val.replace(/^@/, '');
  if (platform === 'instagram') return `https://instagram.com/${handle}`;
  if (platform === 'tiktok') return `https://tiktok.com/@${handle}`;
  return `https://facebook.com/${handle}`;
}

export default function StorefrontClient({ businesses, singleStoreMode = false }: { businesses: any[]; singleStoreMode?: boolean }) {
  const [carts, setCarts] = useState<Record<string, CartLine[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [loggedProfile, setLoggedProfile] = useState<any | null>(null);

  // Modal de personalización / adiciones
  const [customizing, setCustomizing] = useState<{ biz: any; prod: any } | null>(null);
  const [chosenOptions, setChosenOptions] = useState<{ label: string; extraPrice: number }[]>([]);

  // Modal de reseñas (negocio o producto individual)
  const [reviewTarget, setReviewTarget] = useState<{ biz: any; prod?: any } | null>(null);
  const [localReviews, setLocalReviews] = useState<any[]>(() =>
    (businesses || []).flatMap((b) => b.reviews || [])
  );
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [sendingReview, setSendingReview] = useState(false);

  const cartReadyRef = useRef(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data?.user;
      if (!user) return;
      setCurrentUser(user);
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (prof) {
        setLoggedProfile(prof);
      } else {
        setLoggedProfile({
          full_name: user.user_metadata?.full_name || '',
          phone: user.user_metadata?.phone || '',
          default_address: user.user_metadata?.default_address || '',
        });
      }
    });
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('pueblonuevo_carts_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          setCarts(parsed);
        }
      }
    } catch {
      // Ignorar errores de storage
    } finally {
      cartReadyRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!cartReadyRef.current) return;
    try {
      window.localStorage.setItem('pueblonuevo_carts_v2', JSON.stringify(carts));
    } catch {
      // Ignorar cuota
    }
  }, [carts]);

  const [checkoutBiz, setCheckoutBiz] = useState<any | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<
    'Nequi / Bancolombia / Transferencia' | 'Efectivo contra entrega'
  >('Nequi / Bancolombia / Transferencia');
  const [submitting, setSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const openCheckoutForBusiness = (biz: any) => {
    setCheckoutBiz(biz);
    if (loggedProfile) {
      setCustomerName((prev) => prev || loggedProfile.full_name || '');
      setCustomerPhone((prev) => prev || loggedProfile.phone || '');
      setDeliveryAddress((prev) => prev || loggedProfile.default_address || '');
    }
  };

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set((businesses || []).map((b) => (b.category || '').trim()).filter(Boolean))
    );
    return ['Todas', ...unique];
  }, [businesses]);

  const filteredBusinesses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return (businesses || []).filter((biz) => {
      const matchesCat =
        selectedCategory === 'Todas' || (biz.category || '').trim() === selectedCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      const inName = (biz.name || '').toLowerCase().includes(q);
      const inCat = (biz.category || '').toLowerCase().includes(q);
      const inProducts = (biz.products || []).some((p: any) =>
        (p.name || '').toLowerCase().includes(q)
      );
      return inName || inCat || inProducts;
    });
  }, [businesses, searchTerm, selectedCategory]);

  const isValidColombiaMobile = (rawPhone: string) => {
    const digits = rawPhone.replace(/\D/g, '');
    return /^3\d{9}$/.test(digits);
  };

  const getProductTotalQtyInCart = (bizId: string, prodId: string) => {
    return (carts[bizId] || [])
      .filter((l) => l.productId === prodId)
      .reduce((acc, l) => acc + l.qty, 0);
  };

  const addProductLine = (
    biz: any,
    prod: any,
    options: { label: string; extraPrice: number }[] = []
  ) => {
    const currentTotalForProd = getProductTotalQtyInCart(biz.id, prod.id);
    if (currentTotalForProd >= Number(prod.stock_quantity || 0)) return;

    const sortedLabels = [...options].map((o) => o.label).sort().join('|');
    const lineKey = `${prod.id}::${sortedLabels}`;
    const extrasSum = options.reduce((acc, o) => acc + Number(o.extraPrice || 0), 0);
    const unitPrice = Number(prod.price) + extrasSum;

    setCarts((prev) => {
      const lines = [...(prev[biz.id] || [])];
      const idx = lines.findIndex((l) => l.lineKey === lineKey);
      if (idx >= 0) {
        lines[idx] = { ...lines[idx], qty: lines[idx].qty + 1 };
      } else {
        lines.push({
          lineKey,
          productId: prod.id,
          name: prod.name,
          basePrice: Number(prod.price),
          unitPrice,
          qty: 1,
          selectedOptions: options,
        });
      }
      return { ...prev, [biz.id]: lines };
    });
  };

  const decrementProductQty = (bizId: string, prodId: string) => {
    setCarts((prev) => {
      const lines = [...(prev[bizId] || [])];
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].productId === prodId) {
          if (lines[i].qty > 1) {
            lines[i] = { ...lines[i], qty: lines[i].qty - 1 };
          } else {
            lines.splice(i, 1);
          }
          break;
        }
      }
      return { ...prev, [bizId]: lines };
    });
  };

  const handleProductPlusClick = (biz: any, prod: any) => {
    const opts = Array.isArray(prod.customization_options) ? prod.customization_options : [];
    if (opts.length > 0) {
      setCustomizing({ biz, prod });
      setChosenOptions([]);
    } else {
      addProductLine(biz, prod, []);
    }
  };

  const getCartSummary = (biz: any) => {
    const lines = carts[biz.id] || [];
    const subtotal = lines.reduce((acc, it) => acc + it.unitPrice * it.qty, 0);
    const deliveryFee = lines.length > 0 ? Number(biz.delivery_fee || 0) : 0;
    const total = subtotal + deliveryFee;
    const totalItems = lines.reduce((acc, it) => acc + it.qty, 0);

    return { lines, subtotal, deliveryFee, total, totalItems };
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutBiz) return;

    const summary = getCartSummary(checkoutBiz);
    if (summary.lines.length === 0) return;

    if (isSubmittingRef.current || submitting) return;
    isSubmittingRef.current = true;
    setSubmitting(true);

    const cleanName = customerName.trim();
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const cleanAddress = deliveryAddress.trim();

    if (!cleanName || !isValidColombiaMobile(cleanPhone) || !cleanAddress || !acceptedPrivacy) {
      isSubmittingRef.current = false;
      setSubmitting(false);
      alert('Verifica tu nombre, celular válido de 10 dígitos, dirección y autorización de datos.');
      return;
    }

    const orderItemsPayload = summary.lines.map((l) => ({
      id: l.productId,
      name:
        l.selectedOptions.length > 0
          ? `${l.name} (${l.selectedOptions.map((o) => o.label).join(', ')})`
          : l.name,
      qty: l.qty,
      price: l.unitPrice,
    }));

    const { data: insertedOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        business_id: checkoutBiz.id,
        customer_name: cleanName,
        customer_phone: cleanPhone,
        delivery_address: cleanAddress,
        payment_method: paymentMethod,
        items: orderItemsPayload,
        subtotal: summary.subtotal,
        delivery_fee: summary.deliveryFee,
        total: summary.total,
        status: 'pendiente',
      })
      .select()
      .single();

    if (orderError) {
      isSubmittingRef.current = false;
      setSubmitting(false);
      alert(`Error al guardar pedido: ${orderError.message}`);
      return;
    }

    // Agrupar cantidades por productId para descontar inventario
    const qtyByProd: Record<string, number> = {};
    for (const l of summary.lines) {
      qtyByProd[l.productId] = (qtyByProd[l.productId] || 0) + l.qty;
    }
    await supabase.rpc('decrement_stock_batch', {
      p_items: Object.entries(qtyByProd).map(([id, qty]) => ({ id, qty })),
    });

    const orderCode = insertedOrder?.id ? insertedOrder.id.slice(0, 6).toUpperCase() : 'WEB';

    const itemsText = orderItemsPayload
      .map((it) => `• ${it.qty}x ${it.name} ($${(it.price * it.qty).toLocaleString('es-CO')})`)
      .join('\n');

    const ticket = [
      `🔥 *NUEVO PEDIDO #${orderCode}* - ${checkoutBiz.name}`,
      `👤 *Cliente:* ${cleanName} (${cleanPhone})`,
      `📍 *Dirección:* ${cleanAddress}`,
      `💳 *Pago:* ${paymentMethod}`,
      ``,
      `*Detalle del pedido:*`,
      itemsText,
      ``,
      `🛵 Domicilio: $${summary.deliveryFee.toLocaleString('es-CO')} COP`,
      `💰 *TOTAL A PAGAR: $${summary.total.toLocaleString('es-CO')} COP*`,
    ].join('\n');

    setCarts((prev) => ({ ...prev, [checkoutBiz.id]: [] }));
    isSubmittingRef.current = false;
    setSubmitting(false);
    const phone = sanitizeWhatsappPhone(checkoutBiz.phone_whatsapp);
    setCheckoutBiz(null);

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(ticket)}`, '_blank');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget || !currentUser || !commentInput.trim()) return;
    setSendingReview(true);

    const authorName =
      loggedProfile?.full_name || currentUser.user_metadata?.full_name || 'Vecino de Pueblo Nuevo';

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        business_id: reviewTarget.biz.id,
        product_id: reviewTarget.prod?.id || null,
        user_id: currentUser.id,
        author_name: authorName,
        rating: ratingInput,
        comment: commentInput.trim(),
      })
      .select()
      .single();

    setSendingReview(false);
    if (error) {
      alert(`No se pudo publicar tu comentario: ${error.message}`);
      return;
    }

    if (data) {
      setLocalReviews((prev) => [data, ...prev]);
    }
    setCommentInput('');
    setRatingInput(5);
  };

  const getRatingStats = (bizId: string, prodId?: string) => {
    const matching = localReviews.filter((r) =>
      prodId ? r.business_id === bizId && r.product_id === prodId : r.business_id === bizId
    );
    if (matching.length === 0) return { count: 0, avg: 0, list: [] };
    const sum = matching.reduce((acc, r) => acc + Number(r.rating || 5), 0);
    return {
      count: matching.length,
      avg: (sum / matching.length).toFixed(1),
      list: matching,
    };
  };

  return (
    <>
      {loggedProfile && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-2xl text-xs font-bold">
          <span className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            Hola {loggedProfile.full_name || 'vecino/a'} — tus datos de entrega están listos para autocompletar al pedir.
          </span>
        </div>
      )}

      {/* Buscador y Filtros Rápidos */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white border border-neutral-200 rounded-2xl p-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar tienda o producto (ej. acetaminofén, salchipapa, bebida)..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-[#F7F7F5] border border-neutral-200 rounded-xl focus:outline-none focus:border-[#111111]"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap cursor-pointer transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#111111] text-white'
                  : 'bg-[#F7F7F5] text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filteredBusinesses.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center text-sm text-neutral-500">
          No encontramos negocios o productos con &ldquo;{searchTerm}&rdquo;.
        </div>
      ) : (
        <div className={singleStoreMode ? "grid grid-cols-1 gap-6" : "grid grid-cols-1 md:grid-cols-2 gap-6"}>
          {filteredBusinesses.map((biz: any, idx: number) => {
            const status = checkIsOpen(biz, biz.business_hours);
            const summary = getCartSummary(biz);
            const waPhone = sanitizeWhatsappPhone(biz.phone_whatsapp);
            const bizRating = getRatingStats(biz.id);

            return (
              <article
                key={biz.id}
                style={{ animationDelay: `${Math.min(idx * 50, 250)}ms` }}
                className="animate-phantom p5-store-card rounded-2xl p-6 flex flex-col justify-between"
              >
                <div>
                  {/* Cabecera con Avatar por Defecto / Foto + Redes + Valoración */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {biz.logo_url ? (
                        <img
                          src={biz.logo_url}
                          alt={biz.name}
                          loading="lazy"
                          className="w-12 h-12 rounded-2xl object-cover border border-neutral-200 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-[#111111] text-white font-black text-sm flex items-center justify-center shrink-0 relative overflow-hidden">
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#E60012]" />
                          <span>{getInitials(biz.name)}</span>
                        </div>
                      )}

                      <div>
                        <span className="p5-slash-badge inline-block text-[10px] font-extrabold uppercase tracking-wider text-neutral-700 bg-neutral-100 px-2.5 py-0.5">
                          {biz.category}
                        </span>
                        <h3 className="text-xl font-black mt-1 tracking-tight text-[#111111]">
                          {biz.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setReviewTarget({ biz })}
                          className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-600 hover:underline cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span>
                            {bizRating.count > 0
                              ? `${bizRating.avg} (${bizRating.count} opiniones)`
                              : 'Sé el primero en opinar'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <span
                      className={`p5-slash-badge text-[11px] font-extrabold px-3 py-1 flex items-center gap-1.5 shrink-0 ${
                        status.open
                          ? 'bg-emerald-500/15 text-emerald-800'
                          : 'bg-[#E60012]/10 text-[#E60012]'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          status.open ? 'bg-emerald-600' : 'bg-[#E60012]'
                        }`}
                      />
                      {status.open ? 'ABIERTO' : 'CERRADO'}
                    </span>
                  </div>

                  {/* Info operativa + Redes sociales */}
                  <div className="mt-4 space-y-1.5 text-xs text-neutral-600 font-medium">
                    <p className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#E60012]" />
                      {status.label}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                      {biz.address} • Domicilio: ${Number(biz.delivery_fee || 0).toLocaleString('es-CO')} COP
                    </p>
                    <p className="flex items-center gap-2">
                      <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                      {biz.payment_info}
                    </p>

                    {(biz.instagram_url || biz.facebook_url || biz.tiktok_url) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {biz.instagram_url && (
                          <a
                            href={normalizeSocialUrl(biz.instagram_url, 'instagram')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-neutral-100 hover:bg-[#E60012] hover:text-white"
                          >
                            Instagram <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {biz.facebook_url && (
                          <a
                            href={normalizeSocialUrl(biz.facebook_url, 'facebook')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-neutral-100 hover:bg-[#111111] hover:text-white"
                          >
                            Facebook <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {biz.tiktok_url && (
                          <a
                            href={normalizeSocialUrl(biz.tiktok_url, 'tiktok')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-neutral-100 hover:bg-[#111111] hover:text-white"
                          >
                            TikTok <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* En vitrina principal: vista limpia tipo Rappi; dentro de la tienda: menú completo */}
                  {!singleStoreMode ? (
                    <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                      <span className="font-bold">
                        {(biz.products || []).length} {(biz.products || []).length === 1 ? "producto disponible" : "productos disponibles"}
                      </span>
                      <span className="text-[11px] font-extrabold text-emerald-700">
                        Domicilio rápido en Pueblo Nuevo
                      </span>
                    </div>
                  ) : (
                  <div className="mt-5 pt-4 border-t border-neutral-100">
                    <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-[#E60012]" /> Selecciona tus productos
                    </h4>
                    <ul className="space-y-2.5">
                      {(biz.products || []).map((prod: any) => {
                        const qty = getProductTotalQtyInCart(biz.id, prod.id);
                        const outOfStock = prod.stock_quantity <= 0;
                        const prodRating = getRatingStats(biz.id, prod.id);
                        const hasCustom =
                          Array.isArray(prod.customization_options) &&
                          prod.customization_options.length > 0;

                        return (
                          <li
                            key={prod.id}
                            className="group flex items-center justify-between gap-3 text-sm bg-[#F7F7F5] transition-colors px-3.5 py-2.5 rounded-xl"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {prod.image_url && (
                                <img
                                  src={prod.image_url}
                                  alt={prod.name}
                                  loading="lazy"
                                  className="w-12 h-12 rounded-xl object-cover border border-neutral-200 shrink-0"
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-[#111111] truncate">{prod.name}</p>
                                {prod.description && (
                                  <p className="text-[11px] text-neutral-500 truncate">
                                    {prod.description}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 mt-0.5">
                                  <span className="font-extrabold text-[#111111]">
                                    ${Number(prod.price).toLocaleString('es-CO')}
                                  </span>
                                  <span>•</span>
                                  <span>{outOfStock ? 'Agotado' : `${prod.stock_quantity} disp.`}</span>
                                  <button
                                    type="button"
                                    onClick={() => setReviewTarget({ biz, prod })}
                                    className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-600 hover:underline cursor-pointer"
                                    title="Ver o escribir opinión de este producto"
                                  >
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                                    {prodRating.count > 0 ? prodRating.avg : 'Opinar'}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {!outOfStock && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {qty > 0 ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => decrementProductQty(biz.id, prod.id)}
                                      className="w-7 h-7 rounded-lg bg-white border border-neutral-300 hover:border-[#111111] flex items-center justify-center cursor-pointer"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-6 text-center font-black text-xs">{qty}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleProductPlusClick(biz, prod)}
                                      className="w-7 h-7 rounded-lg bg-[#111111] text-white hover:bg-[#E60012] flex items-center justify-center cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleProductPlusClick(biz, prod)}
                                    className="px-2.5 py-1.5 rounded-lg bg-white border border-neutral-300 hover:bg-[#111111] hover:text-white hover:border-[#111111] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                  >
                                    {hasCustom && <SlidersHorizontal className="w-3 h-3 text-[#E60012]" />}
                                    <span>{hasCustom ? 'Armar' : '+ Agregar'}</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  )}
                </div>

                {!singleStoreMode ? (
                  <Link
                    href={`/tienda/${biz.slug}`}
                    className="p5-pill-btn mt-6 w-full flex items-center justify-between bg-[#111111] hover:bg-[#E60012] text-white text-xs font-extrabold uppercase tracking-wider px-5 py-3.5 shadow-sm"
                  >
                    <span>Entrar a la tienda</span>
                    <span>Ver menú ({(biz.products || []).length}) →</span>
                  </Link>
                ) : summary.totalItems > 0 ? (
                  <button
                    type="button"
                    onClick={() => openCheckoutForBusiness(biz)}
                    className="p5-pill-btn mt-6 w-full flex items-center justify-between bg-[#E60012] hover:bg-[#111111] text-white text-xs font-extrabold uppercase tracking-wider px-5 py-3.5 cursor-pointer shadow-md"
                  >
                    <span>Confirmar Pedido ({summary.totalItems})</span>
                    <span>${summary.total.toLocaleString('es-CO')} COP →</span>
                  </button>
                ) : (
                  <a
                    href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                      `Hola ${biz.name}, vi su catálogo en Comercio Local y quiero hacer una consulta.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p5-pill-btn mt-6 w-full flex items-center justify-center gap-2 bg-[#111111] hover:bg-[#E60012] text-white text-xs font-extrabold uppercase tracking-wider py-3.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Escribir por WhatsApp</span>
                  </a>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Modal de Personalización / Adiciones del Producto */}
      {customizing && (
        <div
          onClick={() => setCustomizing(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-modal-pop w-full max-w-md bg-white border border-neutral-200 rounded-2xl p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="p5-slash-badge bg-[#E60012] text-white text-[10px] font-black uppercase px-2 py-0.5">
                  Personaliza tu pedido
                </span>
                <h3 className="text-lg font-black mt-1">{customizing.prod.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setCustomizing(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-[#111111] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Selecciona si deseas quitar ingredientes o sumar adiciones:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(customizing.prod.customization_options || []).map((opt: any, i: number) => {
                const checked = chosenOptions.some((c) => c.label === opt.label);
                return (
                  <label
                    key={i}
                    className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold cursor-pointer ${
                      checked
                        ? 'border-[#E60012] bg-[#E60012]/5'
                        : 'border-neutral-200 bg-[#F7F7F5]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setChosenOptions((prev) =>
                            checked
                              ? prev.filter((c) => c.label !== opt.label)
                              : [...prev, { label: opt.label, extraPrice: Number(opt.extraPrice || 0) }]
                          );
                        }}
                        className="accent-[#E60012]"
                      />
                      <span>{opt.label}</span>
                    </span>
                    <span className="text-emerald-700">
                      {Number(opt.extraPrice || 0) > 0
                        ? `+$${Number(opt.extraPrice).toLocaleString('es-CO')}`
                        : 'Sin costo'}
                    </span>
                  </label>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                addProductLine(customizing.biz, customizing.prod, chosenOptions);
                setCustomizing(null);
              }}
              className="p5-pill-btn w-full bg-[#111111] hover:bg-[#E60012] text-white text-xs font-extrabold uppercase py-3 cursor-pointer"
            >
              Agregar al Carrito • $
              {(
                Number(customizing.prod.price) +
                chosenOptions.reduce((s, o) => s + Number(o.extraPrice || 0), 0)
              ).toLocaleString('es-CO')}{' '}
              COP
            </button>
          </div>
        </div>
      )}

      {/* Modal de Reseñas y Valoraciones (Negocio o Producto) */}
      {reviewTarget && (
        <div
          onClick={() => setReviewTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-modal-pop w-full max-w-md bg-white border border-neutral-200 rounded-2xl p-5 space-y-4 shadow-2xl max-h-[88vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="p5-slash-badge bg-amber-400 text-[#111111] text-[10px] font-black uppercase px-2 py-0.5">
                  {reviewTarget.prod ? 'Opinión del Producto' : 'Opiniones del Negocio'}
                </span>
                <h3 className="text-base font-black mt-1">
                  {reviewTarget.prod ? reviewTarget.prod.name : reviewTarget.biz.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-[#111111] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-3 bg-[#F7F7F5] p-3.5 rounded-xl border border-neutral-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Tu calificación:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingInput(star)}
                      className="cursor-pointer"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= ratingInput
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-neutral-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={2}
                required
                placeholder="Cuéntale a otros vecinos qué tal estuvo la atención, calidad o domicilio..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl"
              />
              <button
                type="submit"
                disabled={sendingReview}
                className="w-full bg-[#111111] hover:bg-[#E60012] text-white text-xs font-extrabold uppercase py-2.5 rounded-xl cursor-pointer"
              >
                {sendingReview ? 'Publicando...' : 'Publicar Valoración'}
              </button>
            </form>

            <div className="space-y-2.5">
              <p className="text-xs font-black uppercase text-neutral-500 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Comentarios recientes
              </p>
              {(() => {
                const stats = getRatingStats(reviewTarget.biz.id, reviewTarget.prod?.id);
                if (stats.list.length === 0) {
                  return (
                    <p className="text-xs text-neutral-400">
                      Todavía no hay comentarios aquí. ¡Deja el primero!
                    </p>
                  );
                }
                return stats.list.map((rev: any) => (
                  <div
                    key={rev.id}
                    className="p-3 rounded-xl bg-[#F7F7F5] border border-neutral-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black">{rev.author_name}</span>
                      <span className="text-amber-600 font-bold">
                        {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                      </span>
                    </div>
                    <p className="text-neutral-600 leading-relaxed">{rev.comment}</p>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Checkout */}
      {checkoutBiz && (
        <div
          onClick={() => setCheckoutBiz(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-modal-pop w-full max-w-md bg-white border border-neutral-200 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
          >
            <div className="bg-[#111111] text-white px-5 py-4 flex items-center justify-between">
              <div>
                <span className="p5-slash-badge bg-[#E60012] text-white text-[10px] font-black uppercase px-2 py-0.5">
                  Finalizar Pedido
                </span>
                <h3 className="font-black text-base mt-1">{checkoutBiz.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutBiz(null)}
                className="text-neutral-400 hover:text-white p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmOrder} className="p-5 space-y-4 text-sm">
              {(() => {
                const s = getCartSummary(checkoutBiz);
                return (
                  <div className="bg-[#F7F7F5] rounded-xl p-3.5 space-y-1.5 text-xs">
                    {s.lines.map((it) => (
                      <div key={it.lineKey} className="flex justify-between font-medium text-neutral-700">
                        <span>
                          {it.qty}x {it.name}
                          {it.selectedOptions.length > 0 && (
                            <span className="block text-[10px] text-neutral-500">
                              ({it.selectedOptions.map((o) => o.label).join(', ')})
                            </span>
                          )}
                        </span>
                        <span className="font-bold text-[#111111]">
                          ${(it.unitPrice * it.qty).toLocaleString('es-CO')}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-neutral-200 pt-1.5 flex justify-between text-neutral-500">
                      <span>Valor del domicilio</span>
                      <span>${s.deliveryFee.toLocaleString('es-CO')} COP</span>
                    </div>
                    <div className="flex justify-between font-black text-sm text-[#111111] pt-1">
                      <span>Total a pagar</span>
                      <span className="text-[#E60012]">${s.total.toLocaleString('es-CO')} COP</span>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                    Aquí va tu nombre y apellido
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Valentina Mendoza"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                    Aquí va tu número de celular / WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: 3001234567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                    Aquí va tu dirección exacta y barrio en Pueblo Nuevo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Calle 12 # 8-40, Barrio El Centro"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-extrabold uppercase text-neutral-500 mb-2">
                  ¿Cómo vas a pagar?
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Nequi / Bancolombia / Transferencia')}
                    className={`p-3 rounded-xl border text-left text-xs font-bold flex flex-col gap-1 cursor-pointer ${
                      paymentMethod === 'Nequi / Bancolombia / Transferencia'
                        ? 'border-[#E60012] bg-[#E60012]/5 text-[#111111]'
                        : 'border-neutral-200 text-neutral-600'
                    }`}
                  >
                    <Wallet className="w-4 h-4 text-[#E60012]" />
                    <span>Nequi / Bancolombia</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Efectivo contra entrega')}
                    className={`p-3 rounded-xl border text-left text-xs font-bold flex flex-col gap-1 cursor-pointer ${
                      paymentMethod === 'Efectivo contra entrega'
                        ? 'border-[#111111] bg-neutral-100 text-[#111111]'
                        : 'border-neutral-200 text-neutral-600'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Efectivo al recibir</span>
                  </button>
                </div>

                {paymentMethod === 'Nequi / Bancolombia / Transferencia' && (
                  <div className="mt-2.5 text-[11px] bg-emerald-50 text-emerald-900 border border-emerald-200 p-3 rounded-xl space-y-2">
                    <p className="font-medium">
                      Datos de pago del local: <strong>{checkoutBiz.payment_info}</strong>.
                    </p>
                    {checkoutBiz.qr_code_url && (
                      <div className="pt-1 flex flex-col items-center bg-white border border-emerald-200 rounded-lg p-2.5">
                        <span className="text-[10px] font-black uppercase text-emerald-800 flex items-center gap-1 mb-1.5">
                          <QrCode className="w-3.5 h-3.5" /> Código QR del Comercio
                        </span>
                        <img
                          src={checkoutBiz.qr_code_url}
                          alt={`Código QR de ${checkoutBiz.name}`}
                          className="w-40 h-40 object-contain rounded-md"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <label className="flex items-start gap-2.5 text-[11px] text-neutral-600 bg-[#F7F7F5] p-3 rounded-xl border border-neutral-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedPrivacy}
                  onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                  className="mt-0.5 accent-[#E60012]"
                />
                <span>
                  <strong className="text-[#111111] inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" /> Habeas Data (Ley 1581):
                  </strong>{' '}
                  Autorizo el uso de mis datos únicamente para coordinar este pedido con <strong>{checkoutBiz.name}</strong>.
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="p5-pill-btn w-full flex items-center justify-center gap-2 bg-[#E60012] hover:bg-[#111111] text-white text-xs font-extrabold uppercase tracking-wider py-3.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Registrando pedido...' : 'Enviar Pedido y Abrir WhatsApp'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
