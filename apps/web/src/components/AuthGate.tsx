'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  Store,
  Lock,
  LogOut,
  LayoutDashboard,
  UserPlus,
  LogIn,
  QrCode,
  ShieldCheck,
  UserCheck,
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

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [hasBusiness, setHasBusiness] = useState(false);
  const [checking, setChecking] = useState(true);

  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [role, setRole] = useState<'customer' | 'merchant'>('customer');

  // Datos de usuario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(true);

  // Datos de local (solo si elige merchant)
  const [bizName, setBizName] = useState('');
  const [bizCategory, setBizCategory] = useState('Comidas Rápidas y Postres');
  const [bizWhatsapp, setBizWhatsapp] = useState('');
  const [bizAddress, setBizAddress] = useState('');
  const [bizDeliveryFee, setBizDeliveryFee] = useState('3000');
  const [paymentChannel, setPaymentChannel] = useState<
    'Nequi' | 'Bancolombia' | 'Daviplata' | 'Nequi y Bancolombia' | 'Efectivo contra entrega'
  >('Nequi');
  const [paymentAccount, setPaymentAccount] = useState('');
  const [qrFile, setQrFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  async function syncUserState(currentUser: any | null) {
    setUser(currentUser);
    if (!currentUser) {
      setProfile(null);
      setHasBusiness(false);
      setChecking(false);
      return;
    }

    const [{ data: prof }, { data: bizList }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', currentUser.id).single(),
      supabase.from('businesses').select('id').eq('owner_id', currentUser.id).limit(1),
    ]);

    setProfile(
      prof || {
        role: currentUser.user_metadata?.role || 'customer',
        full_name: currentUser.user_metadata?.full_name || currentUser.email,
      }
    );
    setHasBusiness((bizList && bizList.length > 0) || prof?.role === 'merchant');
    setChecking(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      syncUserState(data.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUserState(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function uploadQrIfSelected(ownerId: string): Promise<string | null> {
    if (!qrFile) return null;
    const ext = qrFile.name.split('.').pop() || 'png';
    const filePath = `${ownerId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('qr-codes').upload(filePath, qrFile, {
      upsert: true,
    });
    if (error) return null;
    const { data } = supabase.storage.from('qr-codes').getPublicUrl(filePath);
    return data?.publicUrl || null;
  }

  function buildPaymentLabel() {
    if (paymentChannel === 'Efectivo contra entrega') {
      return paymentAccount.trim()
        ? `Efectivo contra entrega (${paymentAccount.trim()})`
        : 'Efectivo contra entrega';
    }
    return paymentAccount.trim() ? `${paymentChannel}: ${paymentAccount.trim()}` : paymentChannel;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setSubmitting(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw new Error(error.message);
      } else {
        if (!fullName.trim()) {
          throw new Error('Por favor escribe tu nombre y apellido.');
        }
        if (!acceptedPrivacy) {
          throw new Error('Debes aceptar la autorización de datos (Habeas Data).');
        }
        if (role === 'merchant' && (!bizName.trim() || !(bizWhatsapp.trim() || phone.trim()))) {
          throw new Error('Completa el nombre de tu local y el número de WhatsApp.');
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              role,
              full_name: fullName.trim(),
              phone: phone.trim(),
              default_address: address.trim(),
            },
          },
        });
        if (error) throw new Error(error.message);

        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            role,
            full_name: fullName.trim(),
            phone: phone.trim(),
            default_address: address.trim(),
          });

          if (role === 'merchant') {
            const cleanPhone = (bizWhatsapp || phone).replace(/\D/g, '');
            const formattedPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
            const qrUrl = await uploadQrIfSelected(data.user.id);

            const { data: newBiz, error: bizErr } = await supabase
              .from('businesses')
              .insert({
                owner_id: data.user.id,
                name: bizName.trim(),
                slug: slugify(bizName.trim()),
                category: bizCategory.trim(),
                phone_whatsapp: formattedPhone,
                address: bizAddress.trim() || address.trim() || 'Pueblo Nuevo, Córdoba',
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
          }

          if (!data.session) {
            setInfoMsg(
              '¡Registro completado! Revisa tu correo electrónico para confirmar tu cuenta y luego inicia sesión.'
            );
            setMode('login');
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo completar el registro.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center p-6 font-bold text-sm text-[#111111]">
        Cargando Comercio Local Pueblo Nuevo...
      </div>
    );
  }

  // SI NO HAY SESIÓN: Pantalla Obligatoria de Registro / Login
  if (!user) {
    return (
      <main className="min-h-screen bg-[#F7F7F5] text-[#111111] flex items-center justify-center p-4 py-10">
        <div className="max-w-xl w-full bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-[#111111] text-white p-6 sm:p-7">
            <div className="flex items-center gap-3">
              <div className="bg-[#E60012] p-2.5 rounded-xl">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="p5-slash-badge bg-[#E60012] text-white text-[10px] font-black uppercase px-2.5 py-0.5">
                  Pueblo Nuevo, Córdoba
                </span>
                <h1 className="text-xl sm:text-2xl font-black mt-1">Comercio Local y Domicilios</h1>
              </div>
            </div>
            <p className="text-xs text-neutral-300 mt-3 leading-relaxed">
              Regístrate o inicia sesión para pedir domicilios en los comercios del municipio. Si tienes un local o mini-negocio, podrás gestionar tu inventario y también pedir domicilios.
            </p>
          </div>

          <div className="grid grid-cols-2 border-b border-neutral-200 text-xs font-black">
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
              }}
              className={`py-3.5 flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-[#E60012] border-b-2 border-[#E60012]'
                  : 'bg-[#F7F7F5] text-neutral-500'
              }`}
            >
              <UserPlus className="w-4 h-4" /> Crear Cuenta (Registro)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
              }}
              className={`py-3.5 flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-[#E60012] border-b-2 border-[#E60012]'
                  : 'bg-[#F7F7F5] text-neutral-500'
              }`}
            >
              <LogIn className="w-4 h-4" /> Ya tengo Cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {errorMsg}
              </div>
            )}
            {infoMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
                {infoMsg}
              </div>
            )}

            {mode === 'register' && (
              <>
                <div>
                  <p className="text-xs font-black uppercase text-neutral-500 mb-2">
                    1. Elige tu tipo de cuenta
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRole('customer')}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                        role === 'customer'
                          ? 'border-[#111111] bg-[#111111] text-white'
                          : 'border-neutral-200 bg-[#F7F7F5] text-neutral-800'
                      }`}
                    >
                      <span className="text-xs font-black block">🛍️ Soy Cliente</span>
                      <span className="text-[11px] opacity-80 block mt-0.5">
                        Pido domicilios en tiendas, droguerías y comidas del municipio.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('merchant')}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                        role === 'merchant'
                          ? 'border-[#E60012] bg-[#E60012] text-white'
                          : 'border-neutral-200 bg-[#F7F7F5] text-neutral-800'
                      }`}
                    >
                      <span className="text-xs font-black block">🏪 Tengo un Local / Negocio</span>
                      <span className="text-[11px] opacity-90 block mt-0.5">
                        Administro mi tienda, recibo pedidos y también puedo pedir domicilios.
                      </span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-neutral-200">
                  <p className="text-xs font-black uppercase text-neutral-500">
                    2. Tus datos personales y de entrega
                  </p>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      Aquí va tu nombre y apellido
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: María Camila Gómez"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                        Aquí va tu número de celular (10 dígitos)
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="Ej: 3001234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                        Aquí va tu dirección y barrio
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Barrio El Centro, Calle 10 # 5-12"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-3 pt-2 border-t border-neutral-200">
              <p className="text-xs font-black uppercase text-neutral-500">
                {mode === 'register' ? '3. Tu correo y contraseña de acceso' : 'Credenciales de acceso'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                    className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                    Contraseña (mín. 6 caracteres)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {mode === 'register' && role === 'merchant' && (
              <div className="space-y-3 pt-2 border-t border-neutral-200">
                <p className="text-xs font-black uppercase text-[#E60012]">
                  4. Datos de tu Local / Mini-negocio
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                    Aquí va el nombre de tu local o emprendimiento
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Asados y Fritos La Esquina"
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      Categoría del local
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
                      Aquí va el WhatsApp donde llegan los pedidos
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
                      Aquí va la dirección exacta del local
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Cra 9 # 11-25, Pueblo Nuevo"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      Cuenta donde te transfieren (Nequi, Bancolombia, etc.)
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
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      {paymentChannel === 'Efectivo contra entrega'
                        ? 'Nota de efectivo (opcional)'
                        : 'Aquí va tu número de cuenta o celular'}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        paymentChannel === 'Efectivo contra entrega'
                          ? 'Ej: Llevamos cambio'
                          : 'Ej: Nequi 3001234567 / Ahorros 012-345'
                      }
                      value={paymentAccount}
                      onChange={(e) => setPaymentAccount(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#F7F7F5] border border-neutral-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="bg-[#F7F7F5] border border-dashed border-neutral-300 rounded-xl p-3">
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-[#E60012]" />
                    Agregar Código QR de tu cuenta (opcional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setQrFile(e.target.files?.[0] || null)}
                    className="text-xs text-neutral-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#111111] file:text-white hover:file:bg-[#E60012] cursor-pointer"
                  />
                  {qrFile && (
                    <p className="text-[11px] text-emerald-700 font-bold mt-1">
                      QR listo: {qrFile.name}
                    </p>
                  )}
                </div>
              </div>
            )}

            {mode === 'register' && (
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
                  Autorizo el uso de mis datos personales únicamente para gestionar pedidos y domicilios dentro de Comercio Local Pueblo Nuevo.
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="p5-pill-btn w-full flex items-center justify-center gap-2 bg-[#E60012] hover:bg-[#111111] text-white text-xs font-extrabold uppercase tracking-wider py-3.5 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Procesando...'
                  : mode === 'login'
                  ? 'Entrar a la Plataforma'
                  : role === 'customer'
                  ? 'Registrarme y Pedir Domicilios'
                  : 'Registrar mi Local y Entrar'}
              </span>
            </button>
          </form>
        </div>
      </main>
    );
  }

  // SI YA HAY SESIÓN: Barra superior con rol + acceso a Panel de Local (si tiene negocio) + Catálogo de Domicilios
  return (
    <>
      <div className="bg-[#111111] text-white text-xs border-b border-neutral-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Hola, <strong>{profile?.full_name || user.email}</strong>
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-white/10 text-neutral-200">
              {hasBusiness ? 'Dueño de Local' : 'Cliente'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 font-extrabold text-amber-300 hover:text-white"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{hasBusiness ? 'Ir a Mi Panel de Local' : 'Mi Perfil / Activar Local'}</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 text-neutral-400 hover:text-[#E60012] font-bold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Salir
            </button>
          </div>
        </div>
      </div>
      {children}
    </>
  );
}
