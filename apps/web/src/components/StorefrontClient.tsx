'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
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
} from 'lucide-react';

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

export default function StorefrontClient({ businesses }: { businesses: any[] }) {
  const [carts, setCarts] = useState<Record<string, Record<string, number>>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const cartReadyRef = useRef(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('pueblonuevo_carts_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          setCarts(parsed);
        }
      }
    } catch {
      // Ignorar errores de localStorage
    } finally {
      cartReadyRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!cartReadyRef.current) return;
    try {
      const currentRaw = window.localStorage.getItem('pueblonuevo_carts_v1');
      const isEmptyNext = Object.keys(carts || {}).length === 0;
      if (isEmptyNext && currentRaw && currentRaw !== '{}') return;
      window.localStorage.setItem('pueblonuevo_carts_v1', JSON.stringify(carts));
    } catch {
      // Ignorar errores de cuota
    }
  }, [carts]);

  const [checkoutBiz, setCheckoutBiz] = useState<any | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'Nequi / Transferencia' | 'Efectivo contra entrega'>(
    'Nequi / Transferencia'
  );
  const [submitting, setSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

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

  const updateQty = (bizId: string, prodId: string, delta: number, maxStock: number) => {
    setCarts((prev) => {
      const bizCart = { ...(prev[bizId] || {}) };
      const current = bizCart[prodId] || 0;
      const next = Math.max(0, Math.min(maxStock, current + delta));
      if (next === 0) {
        delete bizCart[prodId];
      } else {
        bizCart[prodId] = next;
      }
      return { ...prev, [bizId]: bizCart };
    });
  };

  const getCartSummary = (biz: any) => {
    const bizCart = carts[biz.id] || {};
    const items = (biz.products || [])
      .filter((p: any) => (bizCart[p.id] || 0) > 0)
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        qty: bizCart[p.id],
        price: Number(p.price),
      }));

    const subtotal = items.reduce((acc: number, it: any) => acc + it.price * it.qty, 0);
    const deliveryFee = items.length > 0 ? Number(biz.delivery_fee || 0) : 0;
    const total = subtotal + deliveryFee;
    const totalItems = items.reduce((acc: number, it: any) => acc + it.qty, 0);

    return { items, subtotal, deliveryFee, total, totalItems };
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutBiz) return;

    const summary = getCartSummary(checkoutBiz);
    if (summary.items.length === 0) return;

    if (isSubmittingRef.current || submitting) return;
    isSubmittingRef.current = true;
    setSubmitting(true);

    const cleanName = customerName.trim();
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const cleanAddress = deliveryAddress.trim();

    if (!cleanName) {
      isSubmittingRef.current = false;
      setSubmitting(false);
      alert('Por favor escribe tu nombre para el pedido.');
      return;
    }
    if (!isValidColombiaMobile(cleanPhone)) {
      isSubmittingRef.current = false;
      setSubmitting(false);
      alert('Ingresa un celular colombiano válido de 10 dígitos (ej: 3001234567).');
      return;
    }
    if (!cleanAddress) {
      isSubmittingRef.current = false;
      setSubmitting(false);
      alert('Por favor ingresa la dirección de entrega en Pueblo Nuevo.');
      return;
    }
    if (!acceptedPrivacy) {
      isSubmittingRef.current = false;
      setSubmitting(false);
      alert('Debes autorizar el uso de tus datos únicamente para gestionar este domicilio.');
      return;
    }

    const { data: insertedOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        business_id: checkoutBiz.id,
        customer_name: cleanName,
        customer_phone: cleanPhone,
        delivery_address: cleanAddress,
        payment_method: paymentMethod,
        items: summary.items,
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

    const { error: rpcErr } = await supabase.rpc('decrement_stock_batch', {
      p_items: summary.items.map((it: any) => ({ id: it.id, qty: Number(it.qty) || 0 })),
    });
    if (rpcErr) {
      console.warn('Aviso de inventario:', rpcErr.message);
    }

    const orderCode = insertedOrder?.id ? insertedOrder.id.slice(0, 6).toUpperCase() : 'WEB';

    const itemsText = summary.items
      .map((it: any) => `• ${it.qty}x ${it.name} ($${(it.price * it.qty).toLocaleString('es-CO')})`)
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

    setCarts((prev) => ({ ...prev, [checkoutBiz.id]: {} }));
    isSubmittingRef.current = false;
    setSubmitting(false);
    const phone = sanitizeWhatsappPhone(checkoutBiz.phone_whatsapp);
    setCheckoutBiz(null);

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(ticket)}`, '_blank');
  };

  return (
    <>
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
          No encontramos negocios o productos con &ldquo;{searchTerm}&rdquo;. Prueba otra palabra o categoría.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredBusinesses.map((biz: any, idx: number) => {
            const status = checkIsOpen(biz, biz.business_hours);
            const bizCart = carts[biz.id] || {};
            const summary = getCartSummary(biz);
            const waPhone = sanitizeWhatsappPhone(biz.phone_whatsapp);

            return (
              <article
                key={biz.id}
                style={{ animationDelay: `${Math.min(idx * 50, 250)}ms` }}
                className="animate-phantom p5-store-card rounded-2xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="p5-slash-badge inline-block text-[10px] font-extrabold uppercase tracking-wider text-neutral-700 bg-neutral-100 px-2.5 py-0.5">
                        {biz.category}
                      </span>
                      <h3 className="text-xl font-black mt-2 tracking-tight text-[#111111]">
                        {biz.name}
                      </h3>
                    </div>

                    <span
                      className={`p5-slash-badge text-[11px] font-extrabold px-3 py-1 flex items-center gap-1.5 ${
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
                  </div>

                  <div className="mt-5 pt-4 border-t border-neutral-100">
                    <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-[#E60012]" /> Selecciona tus productos
                    </h4>
                    <ul className="space-y-2.5">
                      {(biz.products || []).map((prod: any) => {
                        const qty = bizCart[prod.id] || 0;
                        const outOfStock = prod.stock_quantity <= 0;

                        return (
                          <li
                            key={prod.id}
                            className="group flex items-center justify-between gap-3 text-sm bg-[#F7F7F5] transition-colors px-3.5 py-2.5 rounded-xl"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-[#111111] truncate">{prod.name}</p>
                              <div className="flex items-center gap-2 text-xs text-neutral-500">
                                <span className="font-extrabold text-[#111111]">
                                  ${Number(prod.price).toLocaleString('es-CO')}
                                </span>
                                <span>•</span>
                                <span>{outOfStock ? 'Agotado' : `${prod.stock_quantity} disp.`}</span>
                              </div>
                            </div>

                            {!outOfStock && (
                              <div className="flex items-center gap-1.5">
                                {qty > 0 ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => updateQty(biz.id, prod.id, -1, prod.stock_quantity)}
                                      className="w-7 h-7 rounded-lg bg-white border border-neutral-300 hover:border-[#111111] flex items-center justify-center cursor-pointer"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-6 text-center font-black text-xs">{qty}</span>
                                    <button
                                      type="button"
                                      onClick={() => updateQty(biz.id, prod.id, 1, prod.stock_quantity)}
                                      className="w-7 h-7 rounded-lg bg-[#111111] text-white hover:bg-[#E60012] flex items-center justify-center cursor-pointer"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => updateQty(biz.id, prod.id, 1, prod.stock_quantity)}
                                    className="px-2.5 py-1.5 rounded-lg bg-white border border-neutral-300 hover:bg-[#111111] hover:text-white hover:border-[#111111] text-xs font-bold transition-colors cursor-pointer"
                                  >
                                    + Agregar
                                  </button>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                {summary.totalItems > 0 ? (
                  <button
                    type="button"
                    onClick={() => setCheckoutBiz(biz)}
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

      {/* Modal de Checkout y Pago */}
      {checkoutBiz && (
        <div
          onClick={() => setCheckoutBiz(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
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
                    {s.items.map((it: any) => (
                      <div key={it.id} className="flex justify-between font-medium text-neutral-700">
                        <span>
                          {it.qty}x {it.name}
                        </span>
                        <span className="font-bold text-[#111111]">
                          ${(it.price * it.qty).toLocaleString('es-CO')}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-neutral-200 pt-1.5 flex justify-between text-neutral-500">
                      <span>Domicilio</span>
                      <span>${s.deliveryFee.toLocaleString('es-CO')}</span>
                    </div>
                    <div className="flex justify-between font-black text-sm text-[#111111] pt-1">
                      <span>Total a pagar</span>
                      <span className="text-[#E60012]">${s.total.toLocaleString('es-CO')} COP</span>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Tu nombre completo"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl focus:outline-none focus:border-[#111111]"
                />
                <input
                  type="tel"
                  required
                  placeholder="Tu número de celular / WhatsApp (10 dígitos)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl focus:outline-none focus:border-[#111111]"
                />
                <input
                  type="text"
                  required
                  placeholder="Dirección exacta y barrio en Pueblo Nuevo"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div>
                <p className="text-xs font-extrabold uppercase text-neutral-500 mb-2">
                  ¿Cómo vas a pagar?
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Nequi / Transferencia')}
                    className={`p-3 rounded-xl border text-left text-xs font-bold flex flex-col gap-1 cursor-pointer transition-all ${
                      paymentMethod === 'Nequi / Transferencia'
                        ? 'border-[#E60012] bg-[#E60012]/5 text-[#111111]'
                        : 'border-neutral-200 text-neutral-600'
                    }`}
                  >
                    <Wallet className="w-4 h-4 text-[#E60012]" />
                    <span>Nequi / Transf.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Efectivo contra entrega')}
                    className={`p-3 rounded-xl border text-left text-xs font-bold flex flex-col gap-1 cursor-pointer transition-all ${
                      paymentMethod === 'Efectivo contra entrega'
                        ? 'border-[#111111] bg-neutral-100 text-[#111111]'
                        : 'border-neutral-200 text-neutral-600'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Efectivo al recibir</span>
                  </button>
                </div>
                {paymentMethod === 'Nequi / Transferencia' && (
                  <p className="mt-2 text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-lg font-medium">
                    Cuenta del comercio: <strong>{checkoutBiz.payment_info}</strong>. Adjunta el
                    comprobante en el chat de WhatsApp que se abrirá al confirmar.
                  </p>
                )}
              </div>

              {/* Aviso de Privacidad y Habeas Data (Ley 1581 de 2012) */}
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
                  Autorizo el uso de mi nombre, celular y dirección únicamente para coordinar y entregar este pedido con <strong>{checkoutBiz.name}</strong>.
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
