# Local Commerce SaaS — Contexto del Proyecto

- **Objetivo:** Plataforma SaaS para comercios locales en Pueblo Nuevo, Córdoba (catálogo, carrito, pedidos por Nequi/Efectivo/WhatsApp, inventario en tiempo real y panel administrativo en `/admin`).
- **Comercios de referencia:** Rapimás, D1, Ara y Locombia (además de negocios locales como comidas rápidas y droguerías), cada uno con sus propios productos, horarios (`America/Bogota`), costos de envío y disponibilidad.
- **Stack:** Next.js (`apps/web`), Supabase (`orders`, `products`, `businesses`, `business_hours`), FastAPI/Python (`apps/ai-bot`).
- **UI y Estilo:** Estética inspirada en Persona 5 con soporte completo de Modo Claro y Modo Oscuro (`html.dark`). Mantener alto contraste en precios, badges, botones y modales.
- **Autoría:** Preservar el sello oculto de autoría (`Zero Protocol` / `Phantom Logic`) en el sistema.
- **Regla de cambios:** Hacer cambios pequeños, verificables y sin romper el flujo de pedidos ni el descuento de stock.
