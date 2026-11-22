'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Plus,
  AlertTriangle,
  Power,
  ArrowLeft,
  DollarSign,
  Package,
  RefreshCw,
  Trash2,
  BellRing,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function AdminDashboard() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBizId, setSelectedBizId] = useState<string>('');

  useEffect(() => {
    try {
      const savedBiz = window.localStorage.getItem('pueblonuevo_last_biz_id');
      if (savedBiz && !selectedBizId) {
        setSelectedBizId(savedBiz);
      }
    } catch {
      // Ignorar errores de storage
    }
  }, []);

  useEffect(() => {
    if (!selectedBizId) return;
    try {
      window.localStorage.setItem('pueblonuevo_last_biz_id', selectedBizId);
    } catch {
      // Ignorar errores de storage
    }
  }, [selectedBizId]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [saving, setSaving] = useState(false);
  const [aiAdvice, setAiAdvice] = useState('');
  const [aiEngine, setAiEngine] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  async function requestAiAdvice() {
    if (!currentBiz) return;
    setLoadingAdvice(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_AI_BOT_URL || 'http://localhost:8000';
      const lowItems = products
        .filter((p) => Number(p.stock_quantity) <= Number(p.min_stock || 5))
        .map((p) => `${p.name} (${p.stock_quantity} uds)`);
      const res = await fetch(`${apiUrl}/analyze-business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: currentBiz.name,
          invested_cost: totalInvestedCost,
          retail_value: totalRetailValue,
          restock_cost: restockNeededCost,
          low_stock_items: lowItems,
        }),
      });
      const data = await res.json();
      setAiAdvice(data.advice || '');
      setAiEngine(data.engine || '');
    } catch {
      setAiAdvice('No se pudo conectar con el motor Multi-IA.');
    } finally {
      setLoadingAdvice(false);
    }
  }

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (!selectedBizId) return;
    fetchProducts(selectedBizId);
    fetchOrders(selectedBizId);

    const channel = supabase
      .channel(`orders-live-${selectedBizId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${selectedBizId}` },
        () => {
          fetchOrders(selectedBizId);
        }
      )
      .subscribe();

    const onFocus = () => fetchOrders(selectedBizId);
    window.addEventListener('focus', onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
    };
  }, [selectedBizId]);

  async function fetchBusinesses() {
    setLoading(true);
    const { data } = await supabase.from('businesses').select('*').order('name');
    if (data && data.length > 0) {
      setBusinesses(data);
      setSelectedBizId(data[0].id);
    }
    setLoading(false);
  }

  async function fetchProducts(bizId: string) {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', bizId)
      .order('name');
    setProducts(data || []);
  }

  async function fetchOrders(bizId: string) {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('business_id', bizId)
      .order('created_at', { ascending: false });
    setOrders(data || []);
  }

  const currentBiz = businesses.find((b) => b.id === selectedBizId);

  async function togglePauseStore() {
    if (!currentBiz) return;
    const newState = !currentBiz.is_manually_paused;
    await supabase
      .from('businesses')
      .update({ is_manually_paused: newState })
      .eq('id', currentBiz.id);

    setBusinesses((prev) =>
      prev.map((b) => (b.id === currentBiz.id ? { ...b, is_manually_paused: newState } : b))
    );
  }

  async function handleOrderStatus(order: any, newStatus: 'entregado' | 'cancelado') {
    await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);

    // Si se cancela el pedido, devolver las unidades al inventario
    if (newStatus === 'cancelado' && Array.isArray(order.items)) {
      for (const item of order.items) {
        const prod = products.find((p) => p.id === item.id);
        if (prod) {
          const restoredQty = Number(prod.stock_quantity) + Number(item.qty);
          await supabase.from('products').update({ stock_quantity: restoredQty }).eq('id', prod.id);
        }
      }
      await fetchProducts(selectedBizId);
    }

    await fetchOrders(selectedBizId);
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBizId || !name || !price) return;
    setSaving(true);

    await supabase.from('products').insert({
      business_id: selectedBizId,
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      cost_price: Number(costPrice || 0),
      stock_quantity: Number(stock || 0),
      min_stock: Number(minStock || 5),
      is_available: true,
    });

    setName('');
    setDescription('');
    setPrice('');
    setCostPrice('');
    setStock('');
    setMinStock('5');
    await fetchProducts(selectedBizId);
    setSaving(false);
  }

  async function updateStock(prodId: string, newQty: number) {
    if (newQty < 0) return;
    await supabase.from('products').update({ stock_quantity: newQty }).eq('id', prodId);
    setProducts((prev) =>
      prev.map((p) => (p.id === prodId ? { ...p, stock_quantity: newQty } : p))
    );
  }

  async function deleteProduct(prodId: string) {
    if (!window.confirm('¿Seguro que deseas eliminar este producto?')) return;
    await supabase.from('products').delete().eq('id', prodId);
    setProducts((prev) => prev.filter((p) => p.id !== prodId));
  }

  const totalInvestedCost = products.reduce(
    (acc, p) => acc + Number(p.cost_price || 0) * Number(p.stock_quantity || 0),
    0
  );
  const totalRetailValue = products.reduce(
    (acc, p) => acc + Number(p.price || 0) * Number(p.stock_quantity || 0),
    0
  );
  const restockNeededCost = products.reduce((acc, p) => {
    const missing = Math.max(0, Number(p.min_stock || 5) - Number(p.stock_quantity || 0));
    return acc + missing * Number(p.cost_price || 0);
  }, 0);

  function exportToExcel() {
    if (!currentBiz) return;

    const rows = products.map((p) => {
      const unitProfit = Number(p.price) - Number(p.cost_price || 0);
      const missingUnits = Math.max(0, Number(p.min_stock || 5) - Number(p.stock_quantity));
      return {
        Producto: p.name,
        Descripcion: p.description || '',
        'Stock Actual': p.stock_quantity,
        'Stock Minimo': p.min_stock,
        'Costo Unitario (COP)': Number(p.cost_price || 0),
        'Precio Venta (COP)': Number(p.price),
        'Ganancia Unitaria (COP)': unitProfit,
        'Capital Invertido en Stock (COP)': Number(p.cost_price || 0) * p.stock_quantity,
        'Unidades a Reponer': missingUnits,
        'Costo Reposicion (COP)': missingUnits * Number(p.cost_price || 0),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario y Costos');
    XLSX.writeFile(workbook, `Inventario_${currentBiz.slug}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  if (loading) {
    return <div className="p-8 font-bold">Cargando panel de gestión...</div>;
  }

  const pendingOrders = orders.filter((o) => o.status === 'pendiente');

  return (
    <main className="min-h-screen bg-[#F7F7F5] text-[#111111] pb-20">
      <header className="bg-white/90 backdrop-blur-md border-b border-neutral-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p5-pill-btn p-2.5 bg-neutral-100 hover:bg-[#111111] hover:text-white"
              title="Volver al catálogo público"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-black text-lg tracking-tight">Panel de Gestión y Pedidos</h1>
              <p className="text-xs text-neutral-500 font-medium">
                Inventario, márgenes, reposición y ventas en vivo
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedBizId}
              onChange={(e) => setSelectedBizId(e.target.value)}
              className="text-sm font-bold bg-white border border-neutral-300 rounded-xl px-3.5 py-2"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {currentBiz && (
              <button
                onClick={togglePauseStore}
                className={`p5-pill-btn flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide px-4 py-2.5 cursor-pointer ${
                  currentBiz.is_manually_paused
                    ? 'bg-[#E60012] text-white'
                    : 'bg-emerald-500/20 text-emerald-900'
                }`}
              >
                <Power className="w-4 h-4" />
                {currentBiz.is_manually_paused ? 'Tienda Pausada' : 'Tienda Activa'}
              </button>
            )}

            <button
              onClick={exportToExcel}
              className="p5-pill-btn flex items-center gap-2 bg-[#111111] hover:bg-[#E60012] text-white text-xs font-extrabold uppercase tracking-wide px-4 py-2.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Excel
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Bandeja de Pedidos Pendientes */}
        <section className="animate-phantom p5-store-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
              <BellRing className="w-4 h-4 text-[#E60012]" />
              Pedidos Entrantes ({pendingOrders.length} pendientes)
            </h2>
            <button
              onClick={() => fetchOrders(selectedBizId)}
              className="text-xs font-bold text-neutral-500 hover:text-[#E60012] cursor-pointer"
            >
              Actualizar lista
            </button>
          </div>

          {orders.length === 0 ? (
            <p className="text-xs text-neutral-500">
              Aún no hay pedidos registrados desde el catálogo web para este negocio.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.slice(0, 6).map((ord) => (
                <div
                  key={ord.id}
                  className="bg-[#F7F7F5] border border-neutral-200 rounded-xl p-4 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm">
                        #{ord.id.slice(0, 6).toUpperCase()} • {ord.customer_name}
                      </span>
                      <span
                        className={`p5-slash-badge text-[10px] font-extrabold uppercase px-2.5 py-0.5 ${
                          ord.status === 'pendiente'
                            ? 'bg-amber-400/30 text-amber-900'
                            : ord.status === 'entregado'
                            ? 'bg-emerald-500/20 text-emerald-800'
                            : 'bg-neutral-200 text-neutral-600'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      📍 {ord.delivery_address} • 📞 {ord.customer_phone}
                    </p>
                    <p className="text-xs font-bold text-emerald-700 mt-1">
                      💳 {ord.payment_method} — Total: ${Number(ord.total).toLocaleString('es-CO')} COP
                    </p>
                    <ul className="mt-2 text-xs text-neutral-700 space-y-0.5">
                      {(ord.items || []).map((it: any, i: number) => (
                        <li key={i} className="bg-transparent! p-0!">
                          • {it.qty}x {it.name}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {ord.status === 'pendiente' && (
                    <div className="flex gap-2 pt-2 border-t border-neutral-200">
                      <button
                        onClick={() => handleOrderStatus(ord, 'entregado')}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Entregado (-Stock)
                      </button>
                      <button
                        onClick={() => handleOrderStatus(ord, 'cancelado')}
                        className="px-3 flex items-center justify-center gap-1 bg-neutral-200 hover:bg-[#E60012] hover:text-white text-neutral-700 text-xs font-bold py-2 rounded-lg cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Cancelar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Tarjetas Financieras */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="animate-phantom p5-store-card rounded-2xl p-5">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-black uppercase">
              <span>Capital en Bodega</span>
              <DollarSign className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black mt-2">${totalInvestedCost.toLocaleString('es-CO')} COP</p>
            <p className="text-xs text-neutral-500 mt-1">Costo total invertido en stock</p>
          </div>

          <div className="animate-phantom p5-store-card rounded-2xl p-5" style={{ animationDelay: '70ms' }}>
            <div className="flex items-center justify-between text-neutral-500 text-xs font-black uppercase">
              <span>Valor de Venta</span>
              <Package className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-700 mt-2">
              ${totalRetailValue.toLocaleString('es-CO')} COP
            </p>
            <p className="text-xs text-neutral-500 mt-1 font-semibold">
              Ganancia proyectada: +${(totalRetailValue - totalInvestedCost).toLocaleString('es-CO')} COP
            </p>
          </div>

          <div className="animate-phantom p5-store-card rounded-2xl p-5" style={{ animationDelay: '140ms' }}>
            <div className="flex items-center justify-between text-neutral-500 text-xs font-black uppercase">
              <span>Costo de Reposición</span>
              <RefreshCw className="w-4 h-4 text-[#E60012]" />
            </div>
            <p className="text-2xl font-black text-[#E60012] mt-2">
              ${restockNeededCost.toLocaleString('es-CO')} COP
            </p>
            <p className="text-xs text-neutral-500 mt-1">Para completar stock mínimo</p>
          </div>
        </section>

        {/* Asesor Financiero Multi-IA */}
        <section className="animate-phantom p5-store-card rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-sm uppercase tracking-wider">
                Asesor Financiero Multi-IA {aiEngine && <span className="text-xs text-[#E60012]">({aiEngine})</span>}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Analiza tus costos de bodega, márgenes y reposición urgente al instante
              </p>
            </div>
            <button
              type="button"
              onClick={requestAiAdvice}
              disabled={loadingAdvice}
              className="p5-pill-btn bg-[#111111] hover:bg-[#E60012] text-white text-xs font-extrabold uppercase tracking-wider px-4 py-2.5 cursor-pointer"
            >
              {loadingAdvice ? 'Analizando números...' : 'Pedir Diagnóstico IA'}
            </button>
          </div>
          {aiAdvice && (
            <div className="mt-4 p-4 rounded-xl bg-[#F7F7F5] border border-neutral-200 text-xs leading-relaxed whitespace-pre-line">
              {aiAdvice}
            </div>
          )}
        </section>

        {/* Formulario Nuevo Producto */}
        <section className="animate-phantom p5-store-card rounded-2xl p-6">
          <h2 className="font-black text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#E60012]" /> Nuevo Producto / Postre
          </h2>
          <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <input
              type="text"
              required
              placeholder="Nombre (ej: Torta Tres Leches)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="lg:col-span-2 text-sm font-medium px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-300 rounded-xl focus:outline-none focus:border-[#E60012]"
            />
            <input
              type="number"
              required
              placeholder="Costo unitario ($)"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className="text-sm font-medium px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-300 rounded-xl focus:outline-none focus:border-[#E60012]"
            />
            <input
              type="number"
              required
              placeholder="Precio venta ($)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="text-sm font-medium px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-300 rounded-xl focus:outline-none focus:border-[#E60012]"
            />
            <input
              type="number"
              required
              placeholder="Stock inicial"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="text-sm font-medium px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-300 rounded-xl focus:outline-none focus:border-[#E60012]"
            />
            <button
              type="submit"
              disabled={saving}
              className="p5-pill-btn bg-[#E60012] text-white text-xs font-black uppercase tracking-wider py-2.5 px-4 cursor-pointer"
            >
              {saving ? 'Guardando...' : '+ Agregar'}
            </button>
            <input
              type="text"
              placeholder="Descripción corta (ingredientes, porción, presentación)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="sm:col-span-2 lg:col-span-4 text-sm font-medium px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-300 rounded-xl focus:outline-none focus:border-[#E60012]"
            />
            <div className="lg:col-span-2 flex items-center gap-2 text-xs font-bold text-neutral-600">
              <span>Alertar bajo de:</span>
              <input
                type="number"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-20 text-sm font-bold px-2.5 py-2 bg-[#F7F7F5] border border-neutral-300 rounded-xl"
              />
              <span>uds</span>
            </div>
          </form>
        </section>

        {/* Tabla de Inventario */}
        <section className="animate-phantom bg-white border border-neutral-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#111111] text-white text-xs font-black uppercase tracking-wider">
                  <th className="py-3.5 px-4">Producto</th>
                  <th className="py-3.5 px-4">Costo Unit.</th>
                  <th className="py-3.5 px-4">Precio Venta</th>
                  <th className="py-3.5 px-4">Margen</th>
                  <th className="py-3.5 px-4">Stock Actual</th>
                  <th className="py-3.5 px-4">Estado Reposición</th>
                  <th className="py-3.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {products.map((prod) => {
                  const unitProfit = Number(prod.price) - Number(prod.cost_price || 0);
                  const isLowStock = Number(prod.stock_quantity) <= Number(prod.min_stock || 5);
                  const missing = Math.max(0, Number(prod.min_stock || 5) - Number(prod.stock_quantity));

                  return (
                    <tr key={prod.id} className="hover:bg-[#F7F7F5] transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#111111]">{prod.name}</p>
                        <p className="text-xs text-neutral-500">{prod.description}</p>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-neutral-600">
                        ${Number(prod.cost_price || 0).toLocaleString('es-CO')}
                      </td>
                      <td className="py-3.5 px-4 font-black">
                        ${Number(prod.price).toLocaleString('es-CO')}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-700 font-bold">
                        +${unitProfit.toLocaleString('es-CO')}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateStock(prod.id, prod.stock_quantity - 1)}
                            className="w-7 h-7 rounded-lg border border-neutral-300 hover:bg-[#111111] hover:text-white font-black cursor-pointer transition-colors"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-black">{prod.stock_quantity}</span>
                          <button
                            onClick={() => updateStock(prod.id, prod.stock_quantity + 1)}
                            className="w-7 h-7 rounded-lg border border-neutral-300 hover:bg-[#111111] hover:text-white font-black cursor-pointer transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isLowStock ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold bg-amber-400/30 text-amber-900 px-2.5 py-1 rounded-lg">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Reponer {missing > 0 ? `${missing} uds ($${(missing * Number(prod.cost_price || 0)).toLocaleString('es-CO')})` : 'pronto'}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-500/15 px-2.5 py-1 rounded-lg">
                            Stock saludable
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => deleteProduct(prod.id)}
                          className="p-2 text-neutral-400 hover:text-[#E60012] transition-colors cursor-pointer"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
