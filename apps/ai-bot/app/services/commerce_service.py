import os
from datetime import datetime
from zoneinfo import ZoneInfo
from dotenv import load_dotenv
from supabase import create_client, Client

# Cargar variables de entorno desde .env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Cliente singleton de Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Zona horaria oficial de Colombia
COLOMBIA_TZ = ZoneInfo("America/Bogota")


def is_business_open_now(business: dict, hours: list[dict]) -> tuple[bool, str]:
    """
    Calcula si el comercio está abierto en este instante en Colombia.
    Retorna una tupla: (esta_abierto: bool, motivo: str)
    """
    if business.get("is_manually_paused"):
        return False, "Cerrado temporalmente por el administrador."

    now = datetime.now(COLOMBIA_TZ)
    # En Python weekday(): Lunes=0 ... Domingo=6.
    # En nuestra BD PostgreSQL: Domingo=0, Lunes=1 ... Sábado=6.
    pg_day_of_week = (now.weekday() + 1) % 7
    current_time = now.time()

    today_schedule = next(
        (h for h in hours if h["day_of_week"] == pg_day_of_week), None
    )

    if not today_schedule or today_schedule.get("is_closed"):
        return False, "Hoy no hay atención según el horario habitual."

    open_time = datetime.strptime(today_schedule["open_time"], "%H:%M:%S").time()
    close_time = datetime.strptime(today_schedule["close_time"], "%H:%M:%S").time()

    if open_time <= current_time <= close_time:
        return True, f"Abierto hoy hasta las {close_time.strftime('%I:%M %p')}."
    
    return False, f"Cerrado en este momento. Horario de hoy: {open_time.strftime('%I:%M %p')} a {close_time.strftime('%I:%M %p')}."


def get_live_catalog_context() -> str:
    """
    Consulta todos los negocios, sus horarios e inventario disponible en Supabase
    y construye un resumen estructurado para el modelo de IA.
    """
    businesses_res = supabase.table("businesses").select("*").execute()
    businesses = businesses_res.data or []

    if not businesses:
        return "No hay comercios registrados actualmente en la plataforma."

    context_lines = [
        f"Hora actual en Colombia: {datetime.now(COLOMBIA_TZ).strftime('%Y-%m-%d %I:%M %p')}\n"
    ]

    for b in businesses:
        b_id = b["id"]
        hours_res = supabase.table("business_hours").select("*").eq("business_id", b_id).execute()
        products_res = (
            supabase.table("products")
            .select("*")
            .eq("business_id", b_id)
            .eq("is_available", True)
            .execute()
        )

        is_open, status_msg = is_business_open_now(b, hours_res.data or [])
        estado_texto = "ABIERTO" if is_open else "CERRADO"

        context_lines.append(f"=== NEGOCIO: {b['name']} ({b['category']}) ===")
        context_lines.append(f"- Estado actual: {estado_texto} ({status_msg})")
        context_lines.append(f"- Dirección: {b.get('address', 'No especificada')}")
        context_lines.append(f"- Costo de domicilio: ${float(b.get('delivery_fee', 0)):,.0f} COP")
        context_lines.append(f"- WhatsApp directo: {b['phone_whatsapp']}")
        context_lines.append("- Inventario disponible:")

        products = products_res.data or []
        if not products:
            context_lines.append("  * Sin productos disponibles por ahora.")
        else:
            for p in products:
                stock = p["stock_quantity"]
                disp = f"{stock} unidades disponibles" if stock > 0 else "AGOTADO"
                context_lines.append(
                    f"  * {p['name']}: ${float(p['price']):,.0f} COP ({disp}) - {p.get('description', '')}"
                )
        context_lines.append("")

    return "\n".join(context_lines)
