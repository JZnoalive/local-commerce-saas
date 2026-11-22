# Local Commerce & AI Delivery SaaS

Plataforma multi-tenant de gestión de inventario en tiempo real, catálogo de pedidos locales y asistente conversacional automatizado para comercios municipales.

## Arquitectura del Sistema
- **Frontend (`apps/web`):** Next.js (App Router), TypeScript, Tailwind CSS. Catálogo móvil para clientes y panel administrativo de control de stock y estado operativo.
- **AI Microservice (`apps/ai-bot`):** Python, FastAPI, Google GenAI SDK. Motor conectado al inventario en vivo para consulta de precios, horarios y toma de pedidos vía WhatsApp/Web.
- **Database & Auth (`supabase/`):** PostgreSQL con esquema relacional multi-tenant y control de inventario.
