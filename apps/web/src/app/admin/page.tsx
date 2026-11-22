'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import Link from 'next/link';
import {
  Store,
  FileSpreadsheet,
  Plus,
  AlertTriangle,
  Power,
  ArrowLeft,
  DollarSign,
  Package,
  RefreshCw,
} from 'lucide-react';

export default function AdminDashboard() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBizId, setSelectedBizId] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulario de nuevo producto
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (selectedBizId) {
      fetchProducts(selectedBizId);
    }
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

  const currentBiz = businesses.find((b) => b.id === selectedBizId);

  // Pausar o reanudar tienda
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

  // Crear producto nuevo
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

  // Ajustar stock rápido (+1 / -1)
  async function updateStock(prodId: string, newQty: number) {
    if (newQty < 0) return;
    await supabase.from('products').update({ stock_quantity: newQty }).eq('id', prodId);
    setProducts((prev) =>
      prev.map((p) => (p.id === prodId ? { ...p, stock_quantity: newQty } : p))
    );
  }

  // Cálculos financieros del inventario
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

  // Generar y descargar archivo Excel (.xlsx)
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
    return <div className="p-8 text-slate-600">Cargando panel administrativo...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Barra superior */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600"
              title="Volver al catálogo público"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-bold text-lg">Panel de Gestión y Costos</h1>
              <p className="text-xs text-slate-500">Control de inventario, márgenes y reposición</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedBizId}
              onChange={(e) => setSelectedBizId(e.target.value)}
              className="text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
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
                className={`flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-xl border cursor-pointer transition-colors ${
                  currentBiz.is_manually_paused
                    ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <Power className="w-4 h-4" />
                {currentBiz.is_manually_paused ? 'Tienda Pausada (Activar)' : 'Tienda Activa (Pausar)'}
              </button>
            )}

            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Excel
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Tarjetas de Resumen Financiero */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
              <span>Capital Invertido en Stock</span>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold mt-2">${totalInvestedCost.toLocaleString('es-CO')} COP</p>
            <p className="text-xs text-slate-500 mt-1">Costo total de la mercancía actual</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
              <span>Valor Estimado de Venta</span>
              <Package className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700 mt-2">
              ${totalRetailValue.toLocaleString('es-CO')} COP
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Ganancia bruta proyectada: ${(totalRetailValue - totalInvestedCost).toLocaleString('es-CO')} COP
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
              <span>Costo de Reposición (Restock)</span>
              <RefreshCw className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600 mt-2">
              ${restockNeededCost.toLocaleString('es-CO')} COP
            </p>
            <p className="text-xs text-slate-500 mt-1">Inversión necesaria para alcanzar stock mínimo</p>
          </div>
        </section>

        {/* Formulario para agregar nuevo producto */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-base mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" /> Agregar Producto o Postre al Inventario
          </h2>
          <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <input
              type="text"
              required
              placeholder="Nombre (ej: Torta Tres Leches)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="lg:col-span-2 text-sm px-3 py-2 border border-slate-300 rounded-xl"
            />
            <input
              type="number"
              required
              placeholder="Costo unitario ($)"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className="text-sm px-3 py-2 border border-slate-300 rounded-xl"
            />
            <input
              type="number"
              required
              placeholder="Precio venta ($)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="text-sm px-3 py-2 border border-slate-300 rounded-xl"
            />
            <input
              type="number"
              required
              placeholder="Stock inicial"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="text-sm px-3 py-2 border border-slate-300 rounded-xl"
            />
            <button
              type="submit"
              disabled={saving}
              className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2 px-4 rounded-xl cursor-pointer"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <input
              type="text"
              placeholder="Descripción corta (ingredientes, porción, presentación)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="sm:col-span-2 lg:col-span-4 text-sm px-3 py-2 border border-slate-300 rounded-xl"
            />
            <div className="lg:col-span-2 flex items-center gap-2 text-xs text-slate-600">
              <span>Avisar reposición bajo de:</span>
              <input
                type="number"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-20 text-sm px-2 py-2 border border-slate-300 rounded-xl"
              />
              <span>uds</span>
            </div>
          </form>
        </section>

        {/* Tabla Detallada de Inventario y Costos */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="py-3.5 px-4">Producto</th>
                  <th className="py-3.5 px-4">Costo Unit.</th>
                  <th className="py-3.5 px-4">Precio Venta</th>
                  <th className="py-3.5 px-4">Margen</th>
                  <th className="py-3.5 px-4">Stock Actual</th>
                  <th className="py-3.5 px-4">Estado Reposición</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((prod) => {
                  const unitProfit = Number(prod.price) - Number(prod.cost_price || 0);
                  const isLowStock = Number(prod.stock_quantity) <= Number(prod.min_stock || 5);
                  const missing = Math.max(0, Number(prod.min_stock || 5) - Number(prod.stock_quantity));

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{prod.name}</p>
                        <p className="text-xs text-slate-500">{prod.description}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        ${Number(prod.cost_price || 0).toLocaleString('es-CO')}
                      </td>
                      <td className="py-3.5 px-4 font-semibold">
                        ${Number(prod.price).toLocaleString('es-CO')}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-700 font-medium">
                        +${unitProfit.toLocaleString('es-CO')}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateStock(prod.id, prod.stock_quantity - 1)}
                            className="w-7 h-7 rounded-lg border border-slate-300 hover:bg-slate-100 font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-bold">{prod.stock_quantity}</span>
                          <button
                            onClick={() => updateStock(prod.id, prod.stock_quantity + 1)}
                            className="w-7 h-7 rounded-lg border border-slate-300 hover:bg-slate-100 font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isLowStock ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Reponer {missing > 0 ? `${missing} uds ($${(missing * Number(prod.cost_price || 0)).toLocaleString('es-CO')})` : 'pronto'}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                            Stock saludable
                          </span>
                        )}
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
