'use client';

import { useState } from 'react';
import { useEffect } from 'react';
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

export default function StorefrontClient({ businesses }: { businesses: any[] }) {
  // Carrito por negocio: { [businessId]: { [productId]: qty } }
  const [carts, setCarts] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("pueblonuevo_carts_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setCarts(parsed);
        }
      }
    } catch {
      // Ignorar errores de acceso a localStorage
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("pueblonuevo_carts_v1", JSON.stringify(carts));
    } catch {
      // Ignorar errores de cuota o modo privado
    }
  }, [carts]);
  const [checkoutBiz, setCheckoutBiz] = useState<any | null>(null);

  // Datos del cliente en el checkout
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Nequi / Transferencia' | 'Efectivo contra entrega'>(
    'Nequi / Transferencia'
  );
  const [submitting, setSubmitting] = useState(false);

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

    setSubmitting(true);

    const cleanName = customerName.trim();
    const cleanPhone = customerPhone.replace(/\D/g, "");
    const cleanAddress = deliveryAddress.trim();

    if (!cleanName) {
      setSubmitting(false);
      alert("Por favor escribe tu nombre para el pedido.");
      return;
    }
    if (cleanPhone.length < 10) {
      setSubmitting(false);
      alert("Por favor ingresa un número de teléfono o WhatsApp válido (10 dígitos).");
      return;
    }
    if (!cleanAddress) {
      setSubmitting(false);
      alert("Por favor ingresa la dirección de entrega en Pueblo Nuevo.");
      return;
    }

    // 1. Registrar el pedido en Supabase verificando errores
    const { data: insertedOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        business_id: checkoutBiz.id,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        delivery_address: deliveryAddress.trim(),
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
      setSubmitting(false);
      alert(`Error al guardar pedido: ${orderError.message}`);
      return;
    }

    // 2. Descontar unidades del inventario inmediatamente
    for (const item of summary.items) {
      const originalProd = (checkoutBiz.products || []).find((p: any) => p.id === item.id);
      if (originalProd) {
        const nextStock = Math.max(0, Number(originalProd.stock_quantity) - Number(item.qty));
        const { error: stockErr } = await supabase
          .from('products')
          .update({ stock_quantity: nextStock })
          .eq('id', item.id);
        if (stockErr) {
          alert(`Error al descontar stock: ${stockErr.message}`);
        }
      }
    }

    const orderCode = insertedOrder?.id ? insertedOrder.id.slice(0, 6).toUpperCase() : 'WEB';

    // 2. Armar ticket estructurado para WhatsApp del dueño
    const itemsText = summary.items
      .map((it: any) => `• ${it.qty}x ${it.name} ($${(it.price * it.qty).toLocaleString('es-CO')})`)
      .join('\n');

    const ticket = [
      `🔥 *NUEVO PEDIDO #${orderCode}* - ${checkoutBiz.name}`,
      `👤 *Cliente:* ${customerName.trim()} (${customerPhone.trim()})`,
      `📍 *Dirección:* ${deliveryAddress.trim()}`,
      `💳 *Pago:* ${paymentMethod}`,
      ``,
      `*Detalle del pedido:*`,
      itemsText,
      ``,
      `🛵 Domicilio: $${summary.deliveryFee.toLocaleString('es-CO')} COP`,
      `💰 *TOTAL A PAGAR: $${summary.total.toLocaleString('es-CO')} COP*`,
    ].join('\n');

    // Limpiar carrito de esa tienda y abrir WhatsApp
    setCarts((prev) => ({ ...prev, [checkoutBiz.id]: {} }));
    setSubmitting(false);
    const phone = checkoutBiz.phone_whatsapp;
    setCheckoutBiz(null);

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(ticket)}`, '_blank');
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(businesses || []).map((biz: any, idx: number) => {
          const status = checkIsOpen(biz, biz.business_hours);
          const bizCart = carts[biz.id] || {};
          const summary = getCartSummary(biz);

          return (
            <article
              key={biz.id}
              style={{ animationDelay: `${idx * 100}ms` }}
              className="animate-phantom p5-store-card rounded-2xl p-6 flex flex-col justify-between"
            >
              <div>
                {/* Encabezado del Comercio */}
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
                        status.open ? 'bg-emerald-600 animate-ping' : 'bg-[#E60012]'
                      }`}
                    />
                    {status.open ? 'ABIERTO' : 'CERRADO'}
                  </span>
                </div>

                {/* Horario, Dirección y Medios de Pago */}
                <div className="mt-4 space-y-1.5 text-xs text-neutral-600 font-medium">
                  <p className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#E60012]" />
                    {status.label}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                    {biz.address} • Domicilio: ${Number(biz.delivery_fee).toLocaleString('es-CO')} COP
                  </p>
                  <p className="flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                    {biz.payment_info}
                  </p>
                </div>

                {/* Productos con selector rápido */}
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
                              <span>
                                {outOfStock ? 'Agotado' : `${prod.stock_quantity} disp.`}
                              </span>
                            </div>
                          </div>

                          {/* Controles + / - */}
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

              {/* Botón Principal de Pedido */}
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
                  href={`https://wa.me/${biz.phone_whatsapp}?text=${encodeURIComponent(
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

      {/* Modal de Checkout y Pago */}
      {checkoutBiz && (
        <div
          onClick={() => setCheckoutBiz(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-modal-pop w-full max-w-md bg-white border border-neutral-200 rounded-2xl shadow-2xl overflow-hidden"
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
              {/* Resumen de cuenta */}
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
                  placeholder="Tu número de celular / WhatsApp"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
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

              {/* Selector de Pago */}
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
