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
  Lock,
  LogOut,
  Store,
  BarChart3,
  Sparkles,
  UserPlus,
  LogIn,
  QrCode,
  ShoppingBag,
} from 'lucide-react';

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') +
    '-' +
    Math.random().toString(36).slice(2, 6)
  );
}

export default function AdminDashboard() {
  const [sessionUser, setSessionUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [businessDemoMode, setBusinessDemoMode] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [registerRole, setRegisterRole] = useState<'customer' | 'merchant'>('merchant');

  // Campos de Auth y Perfil
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Campos interactivos de Creación / Configuración de Negocio
  const [showNewBizModal, setShowNewBizModal] = useState(false);
  const [bizName, setBizName] = useState('');
  const [bizCategory, setBizCategory] = useState('Comidas Rápidas y Postres');
  const [bizWhatsapp, setBizWhatsapp] = useState('');
  const [bizAddress, setBizAddress] = useState('');
  const [bizDeliveryFee, setBizDeliveryFee] = useState('3000');
  const [paymentChannel, setPaymentChannel] = useState<'Nequi' | 'Bancolombia' | 'Daviplata' | 'Nequi y Bancolombia' | 'Efectivo contra entrega'>('Nequi');
  const [paymentAccount, setPaymentAccount] = useState('');
  const [nequiNumber, setNequiNumber] = useState('');
  const [bancolombiaAccount, setBancolombiaAccount] = useState('');
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [creatingBiz, setCreatingBiz] = useState(false);

  // Estado del Panel de Comerciante
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [selectedBizId, setSelectedBizId] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Formulario de Productos
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [saving, setSaving] = useState(false);
  const [prodImageFile, setProdImageFile] = useState<File | null>(null);
  const [prodCustomOptionsText, setProdCustomOptionsText] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [igUrl, setIgUrl] = useState('');
  const [fbUrl, setFbUrl] = useState('');
  const [ttUrl, setTtUrl] = useState('');
  const [savingBrand, setSavingBrand] = useState(false);

  // IA y Gráficos
  const [aiAdvice, setAiAdvice] = useState('');
  const [aiEngine, setAiEngine] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [activeChartBar, setActiveChartBar] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'register') {
        setAuthMode('register');
      }
      if (params.get('role') === 'customer') {
        setAuthMode('register');
        setRegisterRole('customer');
      }
    }

    let isDemo = false;
    try {
      isDemo = window.sessionStorage.getItem("evonuevo_business_demo") === "1";
    } catch {}
    if (isDemo) {
      setBusinessDemoMode(true);
      const demoBiz = {
        id: "demo-biz-1",
        name: "Smash & Parrilla El Parque",
        slug: "smash-parrilla-pueblo-nuevo",
        category: "Comidas Rápidas y Postres",
        phone_whatsapp: "573001112233",
        address: "Frente al Parque Principal, Pueblo Nuevo",
        delivery_fee: 3000,
        payment_info: "Nequi: 3001112233 | Bancolombia: Ahorros 412-889900-11",
        logo_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80",
        instagram_url: "@smashparrilla_pn",
        facebook_url: "smashparrillapueblonuevo",
        tiktok_url: "@smashparrilla",
        is_manually_paused: false,
      };
      setSessionUser({ email: "demo.negocio@evonuevo.local" });
      setUserProfile({ full_name: "Administrador Demo (Local)" });
      setBusinesses([demoBiz]);
      setSelectedBizId(demoBiz.id);
      setProducts([
        {
          id: "demo-p-1",
          business_id: demoBiz.id,
          name: "Doble Smash Bacon Burger",
          description: "Doble carne artesanal, queso cheddar, tocineta y salsa de la casa",
          price: 19000,
          cost_price: 9500,
          stock_quantity: 24,
          min_stock: 8,
        },
        {
          id: "demo-p-2",
          business_id: demoBiz.id,
          name: "Salchipapa Suprema Costeña",
          description: "Papa criolla y francesa, salchicha ranchera, pollo y queso costeño",
          price: 22000,
          cost_price: 11000,
          stock_quantity: 4,
          min_stock: 8,
        },
        {
          id: "demo-p-3",
          business_id: demoBiz.id,
          name: "Limonada de Coco Frappé",
          description: "Refrescante con crema de coco y hielo granizado",
          price: 9500,
          cost_price: 3800,
          stock_quantity: 18,
          min_stock: 6,
        },
        {
          id: "demo-p-4",
          business_id: demoBiz.id,
          name: "Combo Alitas BBQ x6",
          description: "Seis alitas glaseadas en salsa BBQ artesanal con papas",
          price: 17500,
          cost_price: 8200,
          stock_quantity: 3,
          min_stock: 6,
        },
      ]);
      setOrders([
        {
          id: "ord-demo-101",
          business_id: demoBiz.id,
          customer_name: "Camila Rodríguez",
          customer_phone: "3005551234",
          delivery_address: "Barrio El Centro, Calle 11 # 6-20",
          payment_method: "Nequi / Bancolombia / Transferencia",
          items: [{ id: "demo-p-1", name: "Doble Smash Bacon Burger (Extra queso cheddar)", qty: 2, price: 22000 }],
          subtotal: 44000,
          delivery_fee: 3000,
          total: 47000,
          status: "pendiente",
        },
        {
          id: "ord-demo-102",
          business_id: demoBiz.id,
          customer_name: "Andrés Martínez",
          customer_phone: "3128889900",
          delivery_address: "Barrio Las Mercedes, Cra 8 # 14-10",
          payment_method: "Efectivo contra entrega",
          items: [{ id: "demo-p-2", name: "Salchipapa Suprema Costeña", qty: 1, price: 22000 }],
          subtotal: 22000,
          delivery_fee: 3000,
          total: 25000,
          status: "entregado",
        },
      ]);
      setAuthChecking(false);
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user ?? null;
      setSessionUser(user);
      if (user) {
        await loadProfile(user.id);
      }
      setAuthChecking(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      setSessionUser(user);
      if (user) {
        await loadProfile(user.id);
      } else {
        setUserProfile(null);
      }
      setAuthChecking(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function loadProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setUserProfile(data);
      setFullName(data.full_name || '');
      setUserPhone(data.phone || '');
      setUserAddress(data.default_address || '');
    }
  }

  useEffect(() => {
    if (!sessionUser) {
      setBusinesses([]);
      setSelectedBizId('');
      setProducts([]);
      setOrders([]);
      return;
    }
    fetchMyBusinesses(sessionUser.id);
  }, [sessionUser]);

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

  async function uploadQrIfSelected(ownerId: string): Promise<string | null> {
    if (!qrFile) return null;
    const ext = qrFile.name.split('.').pop() || 'png';
    const filePath = `${ownerId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('qr-codes').upload(filePath, qrFile, {
      upsert: true,
    });
    if (error) {
      console.warn('No se pudo subir el QR:', error.message);
      return null;
    }
    const { data } = supabase.storage.from('qr-codes').getPublicUrl(filePath);
    return data?.publicUrl || null;
  }

  function buildPaymentLabel() {
    if (paymentChannel === 'Efectivo contra entrega') {
      return paymentAccount.trim()
        ? `Efectivo contra entrega (${paymentAccount.trim()})`
        : 'Efectivo contra entrega';
    }
    if (paymentChannel === 'Nequi y Bancolombia') {
      const parts: string[] = [];
      if (nequiNumber.trim()) parts.push(`Nequi: ${nequiNumber.trim()}`);
      if (bancolombiaAccount.trim()) parts.push(`Bancolombia: ${bancolombiaAccount.trim()}`);
      return parts.length > 0 ? parts.join(' | ') : 'Nequi y Bancolombia';
    }
    return paymentAccount.trim()
      ? `${paymentChannel}: ${paymentAccount.trim()}`
      : paymentChannel;
  }

  async function createBusinessForOwner(ownerId: string) {
    const cleanPhone = (bizWhatsapp || userPhone).replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
    const qrUrl = await uploadQrIfSelected(ownerId);

    const { data: newBiz, error: bizErr } = await supabase
      .from('businesses')
      .insert({
        owner_id: ownerId,
        name: bizName.trim(),
        slug: slugify(bizName.trim()),
        category: bizCategory.trim(),
        phone_whatsapp: formattedPhone,
        address: bizAddress.trim() || userAddress.trim() || 'Pueblo Nuevo, Córdoba',
        delivery_fee: Number(bizDeliveryFee || 0),
        payment_info: buildPaymentLabel(),
        qr_code_url: qrUrl,
        is_manually_paused: false,
      })
      .select()
      .single();

    if (bizErr) throw new Error(bizErr.message);

    const defaultHours = Array.from({ length: 7 }, (_, day) => ({
      business_id: newBiz.id,
      day_of_week: day,
      open_time: '07:00:00',
      close_time: '22:00:00',
      is_closed: false,
    }));
    await supabase.from('business_hours').insert(defaultHours);

    return newBiz;
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setAuthMessage('');
    setAuthLoading(true);

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw new Error(error.message);
      } else {
        if (!fullName.trim()) {
          throw new Error('Por favor escribe tu nombre y apellido.');
        }
        if (registerRole === 'merchant' && (!bizName.trim() || !bizWhatsapp.trim())) {
          throw new Error('Completa el nombre de tu local y tu número de WhatsApp.');
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              role: registerRole,
              full_name: fullName.trim(),
              phone: userPhone.trim(),
              default_address: userAddress.trim(),
            },
          },
        });
        if (error) throw new Error(error.message);

        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            role: registerRole,
            full_name: fullName.trim(),
            phone: userPhone.trim(),
            default_address: userAddress.trim(),
          });

          if (registerRole === 'merchant') {
            await createBusinessForOwner(data.user.id);
          }

          if (!data.session) {
            setAuthMessage(
              'Cuenta registrada con éxito. Revisa tu correo para confirmarla y luego inicia sesión.'
            );
            setAuthMode('login');
          }
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'No se pudo completar el proceso.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSaveCustomerProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionUser) return;
    setCreatingBiz(true);
    await supabase.from('profiles').upsert({
      id: sessionUser.id,
      role: 'customer',
      full_name: fullName.trim(),
      phone: userPhone.trim(),
      default_address: userAddress.trim(),
    });
    setUserProfile({
      id: sessionUser.id,
      role: 'customer',
      full_name: fullName.trim(),
      phone: userPhone.trim(),
      default_address: userAddress.trim(),
    });
    setCreatingBiz(false);
    alert('Tus datos de cliente se guardaron. Al ir al catálogo se autocompletarán en tu pedido.');
  }

  async function handleCreateExtraBusiness(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionUser || !bizName.trim()) return;
    setCreatingBiz(true);
    try {
      const created = await createBusinessForOwner(sessionUser.id);
      setBizName('');
      setBizWhatsapp('');
      setBizAddress('');
      setPaymentAccount('');
      setQrFile(null);
      setShowNewBizModal(false);
      await fetchMyBusinesses(sessionUser.id, created.id);
    } catch (err: any) {
      alert(`Error creando el negocio: ${err.message}`);
    } finally {
      setCreatingBiz(false);
    }
  }

  async function handleLogout() {
    try {
      window.sessionStorage.removeItem("evonuevo_business_demo");
      window.sessionStorage.removeItem("evonuevo_guest");
    } catch {}
    setBusinessDemoMode(false);
    await supabase.auth.signOut();
    setSessionUser(null);
  }

  async function fetchMyBusinesses(userId: string, preferredId?: string) {
    setLoading(true);
    const { data } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', userId)
      .order('name');

    const list = data || [];
    setBusinesses(list);
    if (list.length > 0) {
      setSelectedBizId(preferredId || list[0].id);
    } else {
      setSelectedBizId('');
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
  useEffect(() => {
    if (!currentBiz) return;
    setIgUrl(currentBiz.instagram_url || '');
    setFbUrl(currentBiz.facebook_url || '');
    setTtUrl(currentBiz.tiktok_url || '');
  }, [currentBiz?.id]);

  const totalInvestedCost = products.reduce(
    (acc, p) => acc + Number(p.cost_price || 0) * Number(p.stock_quantity || 0),
    0
  );
  const totalRetailValue = products.reduce(
    (acc, p) => acc + Number(p.price || 0) * Number(p.stock_quantity || 0),
    0
  );
  const projectedProfit = Math.max(0, totalRetailValue - totalInvestedCost);
  const restockNeededCost = products.reduce((acc, p) => {
    const missing = Math.max(0, Number(p.min_stock || 5) - Number(p.stock_quantity || 0));
    return acc + missing * Number(p.cost_price || 0);
  }, 0);

  async function requestAiAdvice() {
    if (!currentBiz) return;
    setLoadingAdvice(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_AI_API_URL ||
        process.env.NEXT_PUBLIC_AI_BOT_URL ||
        'https://local-commerce-ai-bot.onrender.com';
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
      setAiEngine(data.engine || 'Multi-IA');
    } catch {
      setAiAdvice('No se pudo conectar con el motor Multi-IA en este momento.');
    } finally {
      setLoadingAdvice(false);
    }
  }

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

  async function uploadCatalogMedia(file: File | null, folder: string): Promise<string | null> {
    if (!file || !selectedBizId) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${selectedBizId}/${folder}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('catalog-media').upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from('catalog-media').getPublicUrl(path);
    return data?.publicUrl || null;
  }

  async function handleSaveBrandAndSocials(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBiz) return;
    setSavingBrand(true);
    const uploadedLogo = await uploadCatalogMedia(logoFile, 'logo');
    const updates: any = {
      instagram_url: igUrl.trim() || null,
      facebook_url: fbUrl.trim() || null,
      tiktok_url: ttUrl.trim() || null,
    };
    if (uploadedLogo) updates.logo_url = uploadedLogo;

    await supabase.from('businesses').update(updates).eq('id', currentBiz.id);
    setBusinesses((prev) =>
      prev.map((b) => (b.id === currentBiz.id ? { ...b, ...updates } : b))
    );
    setLogoFile(null);
    setSavingBrand(false);
    alert('Imagen de perfil y redes sociales actualizadas.');
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBizId || !name || !price) return;
    setSaving(true);

    const uploadedProdImg = await uploadCatalogMedia(prodImageFile, 'product');
    const parsedOptions = prodCustomOptionsText
      .split(',')
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((item) => {
        const match = item.match(/^(.*?)\(\+(\d+)\)$/);
        if (match) {
          return { label: match[1].trim(), extraPrice: Number(match[2]) };
        }
        return { label: item, extraPrice: 0 };
      });

    await supabase.from('products').insert({
      business_id: selectedBizId,
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      cost_price: Number(costPrice || 0),
      stock_quantity: Number(stock || 0),
      min_stock: Number(minStock || 5),
      image_url: uploadedProdImg,
      customization_options: parsedOptions,
      is_available: true,
    });

    setName('');
    setDescription('');
    setPrice('');
    setCostPrice('');
    setStock('');
    setMinStock('5');
    setProdImageFile(null);
    setProdCustomOptionsText('');
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

  const renderBusinessFormFields = () => (
    <div className="pt-2 border-t border-neutral-200 space-y-3">
      <p className="text-[11px] font-black uppercase tracking-wider text-[#E60012]">
        Datos Interactivos de tu Local / Emprendimiento
      </p>

      <div>
        <label className="block text-[11px] font-bold text-neutral-600 mb-1">
          Aquí va el nombre de tu local o emprendimiento
        </label>
        <input
          type="text"
          required
          placeholder="Ej: Postres y Salchipapas El Parque"
          value={bizName}
          onChange={(e) => setBizName(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[11px] font-bold text-neutral-600 mb-1">
            Categoría del negocio
          </label>
          <select
            value={bizCategory}
            onChange={(e) => setBizCategory(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl text-xs font-bold"
          >
            <option>Comidas Rápidas y Postres</option>
            <option>Droguería y Salud</option>
            <option>Supermercado y Tienda</option>
            <option>Variedades y Regalos</option>
            <option>Servicios Locales</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-neutral-600 mb-1">
            Aquí va el WhatsApp del negocio (10 dígitos)
          </label>
          <input
            type="tel"
            required
            placeholder="Ej: 3001234567"
            value={bizWhatsapp}
            onChange={(e) => setBizWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 12))}
            className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[11px] font-bold text-neutral-600 mb-1">
            Aquí va la dirección o barrio del local
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Cra 10 # 14-20, Centro"
            value={bizAddress}
            onChange={(e) => setBizAddress(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-neutral-600 mb-1">
            Aquí va el valor del domicilio en COP
          </label>
          <input
            type="number"
            min="0"
            required
            placeholder="Ej: 3000"
            value={bizDeliveryFee}
            onChange={(e) => setBizDeliveryFee(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-2.5">
        <div>
          <label className="block text-[11px] font-bold text-neutral-600 mb-1">
            Medio de cobro principal
          </label>
          <select
            value={paymentChannel}
            onChange={(e) => setPaymentChannel(e.target.value as any)}
            className="w-full px-3 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl text-xs font-bold"
          >
            <option value="Nequi">Nequi</option>
            <option value="Bancolombia">Bancolombia</option>
            <option value="Daviplata">Daviplata</option>
            <option value="Nequi y Bancolombia">Nequi y Bancolombia</option>
            <option value="Efectivo contra entrega">Efectivo contra entrega</option>
          </select>
        </div>

        {paymentChannel === 'Nequi y Bancolombia' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                Aquí va tu número de Nequi
              </label>
              <input
                type="tel"
                placeholder="Ej: 3001234567"
                value={nequiNumber}
                onChange={(e) => setNequiNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                Aquí va tu cuenta Bancolombia
              </label>
              <input
                type="text"
                placeholder="Ej: Ahorros 123-456789-00"
                value={bancolombiaAccount}
                onChange={(e) => setBancolombiaAccount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-[11px] font-bold text-neutral-600 mb-1">
              {paymentChannel === 'Efectivo contra entrega'
                ? 'Nota de efectivo (opcional)'
                : `Aquí va tu número / cuenta de ${paymentChannel}`}
            </label>
            <input
              type="text"
              placeholder={
                paymentChannel === 'Efectivo contra entrega'
                  ? 'Ej: Llevamos cambio de $50.000'
                  : paymentChannel === 'Bancolombia'
                  ? 'Ej: Ahorros 123-456789-00'
                  : 'Ej: 3001234567'
              }
              value={paymentAccount}
              onChange={(e) => setPaymentAccount(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
            />
          </div>
        )}
      </div>

      <div className="bg-[#F7F7F5] border border-dashed border-neutral-300 rounded-xl p-3">
        <label className="block text-[11px] font-bold text-neutral-700 mb-1 flex items-center gap-1.5">
          <QrCode className="w-3.5 h-3.5 text-[#E60012]" />
          Código QR de pago (opcional — Nequi, Bancolombia o Bre-B)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setQrFile(e.target.files?.[0] || null)}
          className="text-xs text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#111111] file:text-white hover:file:bg-[#E60012] cursor-pointer"
        />
        {qrFile && (
          <p className="text-[11px] text-emerald-700 font-bold mt-1">
            QR seleccionado: {qrFile.name}
          </p>
        )}
      </div>
    </div>
  );

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center p-6 font-bold text-sm">
        Verificando sesión...
      </div>
    );
  }

  // Pantalla de Login o Registro (Clientes y Negocios)
  if (!sessionUser) {
    return (
      <main className="min-h-screen bg-[#F7F7F5] text-[#111111] flex flex-col justify-between p-4">
        <div className="max-w-lg w-full mx-auto my-auto py-8 space-y-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-extrabold text-neutral-600 hover:text-[#111111]"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al catálogo público
          </Link>

          <div className="bg-white border border-neutral-200 rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-[#111111] text-white p-6">
              <span className="p5-slash-badge bg-[#E60012] text-white text-[10px] font-black uppercase px-2.5 py-0.5">
                Acceso Pueblo Nuevo
              </span>
              <h1 className="text-xl font-black mt-2">
                {authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta Nueva'}
              </h1>
              <p className="text-xs text-neutral-400 mt-1">
                {authMode === 'login'
                  ? 'Entra como cliente para autocompletar tus pedidos o como comerciante para gestionar tu tienda.'
                  : 'Regístrate como cliente para pedir más rápido o registra tu local y empieza a vender.'}
              </p>
            </div>

            <div className="grid grid-cols-2 border-b border-neutral-200 text-xs font-black">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                }}
                className={`py-3 flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-white text-[#E60012] border-b-2 border-[#E60012]'
                    : 'bg-[#F7F7F5] text-neutral-500'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" /> Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthError('');
                }}
                className={`py-3 flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMode === 'register'
                    ? 'bg-white text-[#E60012] border-b-2 border-[#E60012]'
                    : 'bg-[#F7F7F5] text-neutral-500'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" /> Registrarse
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="p-6 space-y-3.5 text-sm">
              {authError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {authError}
                </div>
              )}
              {authMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
                  {authMessage}
                </div>
              )}

              {authMode === 'register' && (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRegisterRole('customer')}
                    className={`p-3 rounded-xl border text-left text-xs font-extrabold cursor-pointer ${
                      registerRole === 'customer'
                        ? 'border-[#111111] bg-[#111111] text-white'
                        : 'border-neutral-200 bg-[#F7F7F5] text-neutral-700'
                    }`}
                  >
                    🛍️ Soy Cliente
                    <span className="block text-[10px] font-normal opacity-80 mt-0.5">
                      Guardo mis datos para pedir
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegisterRole('merchant')}
                    className={`p-3 rounded-xl border text-left text-xs font-extrabold cursor-pointer ${
                      registerRole === 'merchant'
                        ? 'border-[#E60012] bg-[#E60012] text-white'
                        : 'border-neutral-200 bg-[#F7F7F5] text-neutral-700'
                    }`}
                  >
                    🏪 Tengo un Negocio
                    <span className="block text-[10px] font-normal opacity-90 mt-0.5">
                      Publico tienda y gestiono stock
                    </span>
                  </button>
                </div>
              )}

              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      Aquí va tu nombre y apellido
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Carlos Andrés Pérez"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                        Aquí va tu celular (10 dígitos)
                      </label>
                      <input
                        type="tel"
                        placeholder="Ej: 3104567890"
                        value={userPhone}
                        onChange={(e) => setUserPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                        Aquí va tu dirección de entrega
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Barrio Las Mercedes, Cra 8"
                        value={userAddress}
                        onChange={(e) => setUserAddress(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  required
                  placeholder="tucorreo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl focus:outline-none focus:border-[#111111]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                  Contraseña (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl focus:outline-none focus:border-[#111111]"
                />
              </div>

              {authMode === 'register' && registerRole === 'merchant' && renderBusinessFormFields()}

              <button
                type="submit"
                disabled={authLoading}
                className="p5-pill-btn w-full flex items-center justify-center gap-2 bg-[#E60012] hover:bg-[#111111] text-white text-xs font-extrabold uppercase tracking-wider py-3.5 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {authLoading
                    ? 'Guardando...'
                    : authMode === 'login'
                    ? 'Entrar'
                    : registerRole === 'customer'
                    ? 'Crear Cuenta de Cliente'
                    : 'Crear Cuenta y Abrir Panel'}
                </span>
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return <div className="p-8 font-bold">Cargando tu cuenta...</div>;
  }

  // Vista para cuenta de Cliente o cuenta sin negocio aún (permite editar datos de cliente o activar negocio)
  if (businesses.length === 0) {
    return (
      <main className="min-h-screen bg-[#F7F7F5] text-[#111111] p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between bg-white border border-neutral-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-2.5 rounded-xl bg-[#F7F7F5] hover:bg-[#111111] hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <p className="text-xs text-neutral-500">Sesión iniciada como</p>
                <p className="font-black text-sm">{sessionUser.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-[#E60012] cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Cerrar sesión
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tarjeta Perfil Cliente */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-[#111111] font-black text-sm uppercase">
                <ShoppingBag className="w-4 h-4 text-emerald-600" /> Mis Datos de Domicilio (Cliente)
              </div>
              <p className="text-xs text-neutral-500">
                Guarda tus datos para que aparezcan listos cuando pidas en cualquier tienda de Pueblo Nuevo.
              </p>
              <form onSubmit={handleSaveCustomerProfile} className="space-y-3 text-sm">
                <input
                  type="text"
                  required
                  placeholder="Nombre y apellido"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
                />
                <input
                  type="tel"
                  required
                  placeholder="Celular (3001234567)"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
                />
                <input
                  type="text"
                  required
                  placeholder="Dirección y barrio en Pueblo Nuevo"
                  value={userAddress}
                  onChange={(e) => setUserAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
                />
                <button
                  type="submit"
                  disabled={creatingBiz}
                  className="w-full bg-[#111111] hover:bg-emerald-600 text-white text-xs font-extrabold uppercase py-3 rounded-xl cursor-pointer"
                >
                  Guardar Mis Datos de Cliente
                </button>
                <Link
                  href="/"
                  className="block text-center text-xs font-extrabold text-[#E60012] pt-1 hover:underline"
                >
                  Ir al catálogo a hacer un pedido →
                </Link>
              </form>
            </div>

            {/* Tarjeta Activar Mini-negocio */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-[#111111] font-black text-sm uppercase">
                <Store className="w-4 h-4 text-[#E60012]" /> ¿También tienes un negocio?
              </div>
              <p className="text-xs text-neutral-500">
                Activa tu tienda para gestionar inventario, pedidos, cobros y ver gráficos.
              </p>
              <form onSubmit={handleCreateExtraBusiness} className="space-y-3 text-sm">
                {renderBusinessFormFields()}
                <button
                  type="submit"
                  disabled={creatingBiz}
                  className="p5-pill-btn w-full bg-[#E60012] hover:bg-[#111111] text-white text-xs font-extrabold uppercase py-3 cursor-pointer"
                >
                  {creatingBiz ? 'Creando...' : 'Desbloquear Panel de Negocio'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Gráficos interactivos
  const pendingOrders = orders.filter((o) => o.status === 'pendiente');
  const deliveredOrders = orders.filter((o) => o.status === 'entregado');
  const canceledOrders = orders.filter((o) => o.status === 'cancelado');

  const totalCapitalPie = Math.max(1, totalInvestedCost + projectedProfit);
  const costPct = Math.round((totalInvestedCost / totalCapitalPie) * 100);
  const profitPct = 100 - costPct;

  const topMarginProducts = [...products]
    .map((p) => ({
      id: p.id,
      name: p.name,
      margin: Math.max(0, Number(p.price) - Number(p.cost_price || 0)),
      stock: Number(p.stock_quantity || 0),
      min: Number(p.min_stock || 5),
    }))
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 5);

  const maxMargin = Math.max(1, ...topMarginProducts.map((p) => p.margin));

  return (
    <main className="min-h-screen bg-[#F7F7F5] text-[#111111] pb-20">
      <header className="bg-white/95 border-b border-neutral-200 sticky top-0 z-30">
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
                {userProfile?.full_name ? `${userProfile.full_name} • ` : ''}
                <strong className="text-[#111111]">{sessionUser.email}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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

            <button
              type="button"
              onClick={() => setShowNewBizModal(true)}
              className="p5-pill-btn flex items-center gap-1.5 bg-neutral-100 hover:bg-[#111111] text-neutral-800 hover:text-white text-xs font-extrabold px-3.5 py-2.5 cursor-pointer"
            >
              <Store className="w-3.5 h-3.5" /> + Negocio
            </button>

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
                {currentBiz.is_manually_paused ? 'Pausada' : 'Activa'}
              </button>
            )}

            <button
              onClick={exportToExcel}
              className="p5-pill-btn flex items-center gap-2 bg-[#111111] hover:bg-[#E60012] text-white text-xs font-extrabold uppercase tracking-wide px-4 py-2.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>

            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl border border-neutral-300 hover:border-[#E60012] hover:text-[#E60012] cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Bandeja de Pedidos Entrantes */}
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
                        <CheckCircle className="w-3.5 h-3.5" /> Entregado
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

          <div className="animate-phantom p5-store-card rounded-2xl p-5" style={{ animationDelay: '60ms' }}>
            <div className="flex items-center justify-between text-neutral-500 text-xs font-black uppercase">
              <span>Valor de Venta</span>
              <Package className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-700 mt-2">
              ${totalRetailValue.toLocaleString('es-CO')} COP
            </p>
            <p className="text-xs text-neutral-500 mt-1 font-semibold">
              Ganancia proyectada: +${projectedProfit.toLocaleString('es-CO')} COP
            </p>
          </div>

          <div className="animate-phantom p5-store-card rounded-2xl p-5" style={{ animationDelay: '120ms' }}>
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

        {/* Gráficos Juguetones + Diagnóstico IA */}
        <section className="animate-phantom p5-store-card rounded-2xl p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#E60012]" />
                Radiografía Visual del Negocio{' '}
                {aiEngine && <span className="text-xs text-[#E60012]">({aiEngine})</span>}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Gráficos automáticos en tiempo real con lectura clara de tus números y consejos IA
              </p>
            </div>
            <button
              type="button"
              onClick={requestAiAdvice}
              disabled={loadingAdvice}
              className="p5-pill-btn flex items-center gap-2 bg-[#111111] hover:bg-[#E60012] text-white text-xs font-extrabold uppercase tracking-wider px-4 py-2.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loadingAdvice ? 'Analizando con IA...' : 'Explicar con Multi-IA'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="bg-[#F7F7F5] border border-neutral-200 rounded-2xl p-4 flex flex-col justify-between">
              <p className="text-xs font-black uppercase text-neutral-600">
                1. Mezcla de Valor en Bodega
              </p>
              <div className="my-4 flex items-center justify-center gap-5">
                <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e5e5" strokeWidth="4.5" />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#111111"
                    strokeWidth="4.5"
                    strokeDasharray={`${costPct * 0.88} 100`}
                    className="transition-all duration-700 ease-out"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="4.5"
                    strokeDasharray={`${profitPct * 0.88} 100`}
                    strokeDashoffset={`-${costPct * 0.88}`}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="space-y-1.5 text-xs">
                  <p className="font-bold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#111111]" />
                    Costo: {costPct}%
                  </p>
                  <p className="font-bold text-emerald-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Ganancia: {profitPct}%
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-neutral-600 leading-relaxed">
                Por cada $100 que vendas de tu inventario actual, <strong>${profitPct}</strong> son ganancia libre tras cubrir el costo de mercancía.
              </p>
            </div>

            <div className="bg-[#F7F7F5] border border-neutral-200 rounded-2xl p-4 flex flex-col justify-between">
              <p className="text-xs font-black uppercase text-neutral-600">
                2. Top Productos por Ganancia Unitaria
              </p>
              <div className="my-3 space-y-2.5">
                {topMarginProducts.length === 0 ? (
                  <p className="text-xs text-neutral-400">Agrega productos para ver sus barras.</p>
                ) : (
                  topMarginProducts.map((item) => {
                    const widthPct = Math.max(12, Math.round((item.margin / maxMargin) * 100));
                    const isLow = item.stock <= item.min;
                    const isSelected = activeChartBar === item.id;
                    return (
                      <div
                        key={item.id}
                        onMouseEnter={() => setActiveChartBar(item.id)}
                        onMouseLeave={() => setActiveChartBar(null)}
                        className="space-y-1 cursor-pointer"
                      >
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="truncate max-w-[60%]">{item.name}</span>
                          <span className={isLow ? 'text-[#E60012]' : 'text-emerald-700'}>
                            +${item.margin.toLocaleString('es-CO')} ({item.stock} uds)
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-neutral-200 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${widthPct}%` }}
                            className={`h-full rounded-full transition-all duration-500 ease-out ${
                              isLow
                                ? 'bg-[#E60012]'
                                : isSelected
                                ? 'bg-emerald-500 scale-y-110'
                                : 'bg-[#111111]'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <p className="text-[11px] text-neutral-600 leading-relaxed">
                Las barras en <strong className="text-[#E60012]">rojo</strong> indican productos con stock bajo que conviene surtir primero.
              </p>
            </div>

            <div className="bg-[#F7F7F5] border border-neutral-200 rounded-2xl p-4 flex flex-col justify-between">
              <p className="text-xs font-black uppercase text-neutral-600">
                3. Termómetro de Pedidos Web
              </p>
              <div className="my-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white rounded-xl p-2.5 border border-neutral-200">
                    <p className="text-lg font-black text-amber-600">{pendingOrders.length}</p>
                    <p className="text-[10px] font-bold text-neutral-500 uppercase">Pendientes</p>
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-neutral-200">
                    <p className="text-lg font-black text-emerald-600">{deliveredOrders.length}</p>
                    <p className="text-[10px] font-bold text-neutral-500 uppercase">Entregados</p>
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-neutral-200">
                    <p className="text-lg font-black text-neutral-500">{canceledOrders.length}</p>
                    <p className="text-[10px] font-bold text-neutral-500 uppercase">Cancelados</p>
                  </div>
                </div>
                <div className="w-full h-3 bg-neutral-200 rounded-full overflow-hidden flex">
                  {orders.length > 0 && (
                    <>
                      <div
                        style={{ width: `${(deliveredOrders.length / orders.length) * 100}%` }}
                        className="bg-emerald-500 transition-all duration-500"
                      />
                      <div
                        style={{ width: `${(pendingOrders.length / orders.length) * 100}%` }}
                        className="bg-amber-400 transition-all duration-500"
                      />
                      <div
                        style={{ width: `${(canceledOrders.length / orders.length) * 100}%` }}
                        className="bg-neutral-400 transition-all duration-500"
                      />
                    </>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-neutral-600 leading-relaxed">
                {orders.length === 0
                  ? 'Aún no entran pedidos web; comparte tu enlace de Comercio Local por WhatsApp.'
                  : `Llevas ${deliveredOrders.length} de ${orders.length} pedidos completados.`}
              </p>
            </div>
          </div>

          {aiAdvice && (
            <div className="p-4 rounded-xl bg-[#F7F7F5] border border-neutral-200 text-xs leading-relaxed whitespace-pre-line">
              {aiAdvice}
            </div>
          )}
        </section>

        {/* Identidad Visual (Foto opcional) y Redes Sociales del Local */}
        <section className="animate-phantom p5-store-card rounded-2xl p-6">
          <h2 className="font-black text-sm uppercase tracking-wide mb-3">
            Perfil Visual y Redes Sociales del Local (Opcional)
          </h2>
          <p className="text-xs text-neutral-500 mb-4">
            Si no subes foto de perfil, tu negocio usa automáticamente un avatar estilizado con sus iniciales.
          </p>
          <form onSubmit={handleSaveBrandAndSocials} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">Foto o Logo del Local</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-neutral-600 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#111111] file:text-white cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">Instagram (@usuario o link)</label>
              <input
                type="text"
                placeholder="@milocal_pn"
                value={igUrl}
                onChange={(e) => setIgUrl(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-[#F7F7F5] border border-neutral-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">Facebook (página o link)</label>
              <input
                type="text"
                placeholder="facebook.com/milocal"
                value={fbUrl}
                onChange={(e) => setFbUrl(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-[#F7F7F5] border border-neutral-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-neutral-600 mb-1">TikTok (@usuario o link)</label>
              <input
                type="text"
                placeholder="@milocal_tiktok"
                value={ttUrl}
                onChange={(e) => setTtUrl(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-[#F7F7F5] border border-neutral-300 rounded-xl"
              />
            </div>
            <button
              type="submit"
              disabled={savingBrand}
              className="p5-pill-btn bg-[#111111] hover:bg-[#E60012] text-white text-xs font-extrabold uppercase py-2.5 px-4 cursor-pointer"
            >
              {savingBrand ? 'Guardando...' : 'Guardar Perfil y Redes'}
            </button>
          </form>
        </section>

        {/* Formulario Nuevo Producto */}
        <section className="animate-phantom p5-store-card rounded-2xl p-6">
          <h2 className="font-black text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#E60012]" /> Nuevo Producto
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
            <div className="sm:col-span-2 lg:col-span-4">
              <input
                type="text"
                placeholder="Personalización / Adiciones (opcional, ej: Sin cebolla, Sin tomate, Extra queso (+3000))"
                value={prodCustomOptionsText}
                onChange={(e) => setProdCustomOptionsText(e.target.value)}
                className="w-full text-xs font-medium px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-300 rounded-xl"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-2 flex items-center">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProdImageFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-neutral-600 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#111111] file:text-white cursor-pointer"
              />
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

      {/* Modal para agregar otro mini-negocio */}
      {showNewBizModal && (
        <div
          onClick={() => setShowNewBizModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="animate-modal-pop w-full max-w-lg bg-white rounded-2xl border border-neutral-200 p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-black">Registrar otro local o mini-negocio</h3>
            <form onSubmit={handleCreateExtraBusiness} className="space-y-3 text-sm">
              {renderBusinessFormFields()}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewBizModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-100 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingBiz}
                  className="flex-1 py-2.5 rounded-xl bg-[#E60012] text-white text-xs font-extrabold uppercase cursor-pointer"
                >
                  {creatingBiz ? 'Guardando...' : 'Guardar Negocio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
