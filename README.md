# EvoNuevo — Plataforma de Comercio Local y Domicilios

Plataforma web de comercio local y domicilios para **Pueblo Nuevo, Córdoba**, enfocada en conectar vecinos con tiendas, droguerías, cafés y negocios de comida rápida con disponibilidad real, personalización de productos, reseñas y coordinación por WhatsApp.

## Características principales

* **Acceso por rol y modo invitado:** Registro e inicio de sesión para **Cliente** o **Dueño de Local**, además de opción de **Modo Invitado** para explorar sin registro previo.
* **Vitrina general y vista por tienda (`/tienda/[slug]`):** Búsqueda, filtros por categoría y páginas dedicadas por comercio con menú completo, fotos de productos, adiciones/personalización, valoraciones y carrito flotante.
* **Métodos de pago locales:** Soporte para Nequi (con campos separados para Nequi y Bancolombia cuando se seleccionan ambos), transferencias, efectivo contra entrega, copia rápida de cuenta y código QR opcional.
* **Panel de gestión (`/admin`) y soporte IA:** Administración de inventario, perfil visual (avatar por defecto o logo/foto), redes sociales, métricas y apoyo de asistente IA.
* **Verificación automática (CI):** *Smoke tests* unitarios en `apps/web/scripts/smoke-check.mjs` ejecutados en GitHub Actions.

## Uso rápido en local

```bash
cd apps/web
npm install
node scripts/smoke-check.mjs
npm run dev
### 2. Crear `docs/ARCHITECTURE.md` y subir a GitHub

```bash
cd ~/Proyectos/local-commerce-saas
mkdir -p docs

cat << 'EOF' > docs/ARCHITECTURE.md
# Arquitectura — EvoNuevo

## Rutas principales

* `/` — Acceso / registro (`AuthGate`) y vitrina de comercios (`StorefrontClient`).
* `/tienda/[slug]` — Vista dedicada de cada tienda con su catálogo, adiciones, reseñas y carrito.
* `/admin` — Panel de gestión de productos, stock, perfil/redes y pedidos.

## Tablas en Supabase

* `profiles` — Datos del usuario y rol (`customer` o `merchant`).
* `businesses` — Información del comercio, domicilio, pagos, QR, logo y redes sociales.
* `business_hours` — Horario semanal por día.
* `products` — Productos, precios, stock, foto y opciones de personalización/adiciones.
* `orders` — Pedidos creados y totales.
* `reviews` — Calificaciones y comentarios generales o por producto.
