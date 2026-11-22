import { supabase } from '@/lib/supabase';
import AiChatWidget from '@/components/AiChatWidget';
import { Store, Clock, MapPin, Phone, ShoppingBag } from 'lucide-react';


function checkIsOpen(business: any, hours: any[]) {
  if (business.is_manually_paused) {
    return { open: false, label: 'Pausado temporalmente' };
  }

  // Obtener hora actual en Colombia (America/Bogota)
  const nowStr = new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' });
  const colombiaNow = new Date(nowStr);
  const dayOfWeek = colombiaNow.getDay(); // 0 = Domingo ... 6 = Sábado
  const currentTime = colombiaNow.toTimeString().slice(0, 8); // "HH:MM:SS"

  const todayHours = hours?.find((h) => h.day_of_week === dayOfWeek);
  if (!todayHours || todayHours.is_closed) {
    return { open: false, label: 'Cerrado hoy' };
  }

  if (currentTime >= todayHours.open_time && currentTime <= todayHours.close_time) {
    return { open: true, label: `Abierto hasta ${todayHours.close_time.slice(0, 5)}` };
  }

  return { open: false, label: `Abre a las ${todayHours.open_time.slice(0, 5)}` };
}

export default async function HomePage() {
  const { data: businesses } = await supabase
    .from('businesses')
    .select('*, business_hours(*), products(*)');

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Encabezado */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 text-white p-2 rounded-xl">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Comercio Local</h1>
              <p className="text-xs text-slate-500">Pueblo Nuevo, Córdoba • Directorio y Domicilios</p>
            </div>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-medium">
            En vivo
          </span>
        </div>
      </header>

      {/* Listado de Comercios */}
      <section className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tiendas y Restaurantes</h2>
          <p className="text-sm text-slate-600 mt-1">
            Consulta disponibilidad real o pregúntale directamente a nuestro asistente abajo a la derecha.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(businesses || []).map((biz: any) => {
            const status = checkIsOpen(biz, biz.business_hours);
            const whatsappMsg = encodeURIComponent(
              `Hola ${biz.name}, vi su catálogo en Comercio Local y quiero hacer un pedido.`
            );

            return (
              <article
                key={biz.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
              >
                <div>
                  {/* Cabecera del Negocio */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                        {biz.category}
                      </span>
                      <h3 className="text-xl font-bold mt-2">{biz.name}</h3>
                    </div>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                        status.open
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          status.open ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}
                      />
                      {status.open ? 'Abierto' : 'Cerrado'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <p className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {status.label}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {biz.address} • Domicilio: ${Number(biz.delivery_fee).toLocaleString('es-CO')} COP
                    </p>
                  </div>

                  {/* Productos Destacados */}
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <h4 className="text-xs font-semibold uppercase text-slate-400 mb-3 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5" /> Productos disponibles
                    </h4>
                    <ul className="space-y-2.5">
                      {(biz.products || []).map((prod: any) => (
                        <li
                          key={prod.id}
                          className="flex items-center justify-between text-sm bg-slate-50 p-2.5 rounded-xl"
                        >
                          <div>
                            <p className="font-medium text-slate-800">{prod.name}</p>
                            <p className="text-xs text-slate-500">
                              {prod.stock_quantity > 0
                                ? `${prod.stock_quantity} disponibles`
                                : 'Agotado'}
                            </p>
                          </div>
                          <span className="font-bold text-slate-900">
                            ${Number(prod.price).toLocaleString('es-CO')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Botón Directo WhatsApp */}
                <a
                  href={`https://wa.me/${biz.phone_whatsapp}?text=${whatsappMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Pedir por WhatsApp
                </a>
              </article>
            );
          })}
        </div>
      </section>

      {/* Widget Flotante del Chatbot IA */}
      <AiChatWidget />
    </main>
  );
}
