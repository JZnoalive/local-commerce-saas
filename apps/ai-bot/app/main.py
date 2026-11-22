import os
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client
from google import genai
from anthropic import Anthropic
from openai import OpenAI

load_dotenv()

app = FastAPI(title="Local Commerce Multi-AI Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Conexión a Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 2. Clientes de IA (Gemini, Claude, Grok xAI)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
XAI_API_KEY = os.getenv("XAI_API_KEY")

gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
claude_client = Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None
grok_client = (
    OpenAI(api_key=XAI_API_KEY, base_url="https://api.x.ai/v1")
    if XAI_API_KEY
    else None
)


class ChatRequest(BaseModel):
    message: str
    preferred_engine: Optional[str] = "auto"


class BusinessAnalysisRequest(BaseModel):
    business_name: str
    invested_cost: float
    retail_value: float
    restock_cost: float
    low_stock_items: list[str]


def build_live_commerce_context() -> str:
    colombia_now = datetime.now(ZoneInfo("America/Bogota"))
    day_of_week = (colombia_now.weekday() + 1) % 7
    current_time = colombia_now.strftime("%H:%M:%S")

    businesses_res = (
        supabase.table("businesses")
        .select("*, business_hours(*), products(*)")
        .execute()
    )
    businesses = businesses_res.data or []

    context_lines = [
        f"Fecha y hora actual en Pueblo Nuevo, Córdoba: {colombia_now.strftime('%Y-%m-%d %H:%M')} (Colombia)."
    ]

    for biz in businesses:
        hours = biz.get("business_hours") or []
        today = next((h for h in hours if h["day_of_week"] == day_of_week), None)

        if biz.get("is_manually_paused"):
            status = "PAUSADO TEMPORALMENTE"
        elif not today or today.get("is_closed"):
            status = "CERRADO HOY"
        elif today["open_time"] <= current_time <= today["close_time"]:
            status = f"ABIERTO AHORA (cierra a las {today['close_time'][:5]})"
        else:
            status = f"CERRADO AHORA (abre a las {today['open_time'][:5]})"

        products_txt = ", ".join(
            [
                f"{p['name']} (${p['price']:,.0f} COP, stock: {p['stock_quantity']})"
                for p in (biz.get("products") or [])
            ]
        )
        context_lines.append(
            f"- Comercio: {biz['name']} ({biz['category']}) | Estado: {status} | "
            f"Domicilio: ${biz['delivery_fee']:,.0f} COP | Pago: {biz.get('payment_info', 'Nequi/Efectivo')} | "
            f"Productos: {products_txt}"
        )

    return "\n".join(context_lines)


def query_gemini(system_prompt: str, user_message: str) -> str:
    if not gemini_client:
        raise RuntimeError("Gemini no configurado")
    
    # Buscar dinámicamente un modelo Flash disponible en tu API Key
    candidates = ["gemini-2.5-flash"]
    try:
        for m in gemini_client.models.list():
            name = getattr(m, "name", "").replace("models/", "")
            if "flash" in name and "embedding" not in name and name not in candidates:
                candidates.append(name)
    except Exception:
        pass

    last_err = "Sin respuesta"
    for model_name in candidates[:4]:
        try:
            response = gemini_client.models.generate_content(
                model=model_name,
                contents=f"{system_prompt}\n\n{user_message}",
            )
            if response and response.text:
                return response.text
        except Exception as e:
            last_err = e
    raise RuntimeError(f"Gemini error: {last_err}")


def query_claude(system_prompt: str, user_message: str) -> str:
    if not claude_client:
        raise RuntimeError("Claude no configurado")
    msg = claude_client.messages.create(
        model="claude-3-5-haiku-latest",
        max_tokens=500,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return msg.content[0].text


def query_grok(system_prompt: str, user_message: str) -> str:
    if not grok_client:
        raise RuntimeError("Grok (xAI) no configurado")
    completion = grok_client.chat.completions.create(
        model="grok-3-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        max_tokens=500,
    )
    return completion.choices[0].message.content


@app.get("/")
def health_check():
    return {
        "status": "online",
        "engines": {
            "gemini": bool(gemini_client),
            "claude": bool(claude_client),
            "grok_xai": bool(grok_client),
        },
    }


@app.post("/chat")
def chat_with_committee(req: ChatRequest):
    live_context = build_live_commerce_context()
    system_prompt = (
        "Eres el Asistente Local oficial de Comercio Local en Pueblo Nuevo, Córdoba. "
        "Responde de forma amable, clara y concisa usando únicamente los datos reales de abajo. "
        "Si un negocio está CERRADO, acláralo antes de recomendar sus productos.\n\n"
        f"{live_context}"
    )

    pipeline = [
        ("Gemini 2.5 Flash", query_gemini),
        ("Claude Haiku", query_claude),
        ("Grok 3 Mini (xAI)", query_grok),
    ]

    if req.preferred_engine == "claude":
        pipeline = [("Claude Haiku", query_claude), ("Gemini 2.5 Flash", query_gemini), ("Grok 3 Mini (xAI)", query_grok)]
    elif req.preferred_engine == "grok":
        pipeline = [("Grok 3 Mini (xAI)", query_grok), ("Gemini 2.5 Flash", query_gemini), ("Claude Haiku", query_claude)]

    errors = []
    for engine_name, runner in pipeline:
        try:
            reply = runner(system_prompt, req.message)
            if reply:
                return {"reply": reply, "engine": engine_name}
        except Exception as e:
            errors.append(f"{engine_name}: {str(e)}")

    return {
        "reply": "Ningún motor IA pudo responder en este momento. Revisa las claves en el archivo .env.",
        "engine": "none",
        "errors": errors,
    }


@app.post("/analyze-business")
def analyze_business_finances(req: BusinessAnalysisRequest):
    prompt = (
        f"Analiza brevemente las métricas del negocio '{req.business_name}' en Pueblo Nuevo, Córdoba:\n"
        f"- Capital invertido en inventario: ${req.invested_cost:,.0f} COP\n"
        f"- Valor estimado de venta: ${req.retail_value:,.0f} COP\n"
        f"- Costo urgente de reposición (restock): ${req.restock_cost:,.0f} COP\n"
        f"- Productos bajos de stock: {', '.join(req.low_stock_items) if req.low_stock_items else 'Ninguno'}\n\n"
        "Dame 3 recomendaciones prácticas y directas (en viñetas cortas) para mejorar su flujo de caja y reposición."
    )

    # Prioriza Claude o Grok para análisis de negocio, con respaldo en Gemini
    for engine_name, runner in [
        ("Claude Haiku", query_claude),
        ("Grok 3 Mini (xAI)", query_grok),
        ("Gemini 2.5 Flash", query_gemini),
    ]:
        try:
            advice = runner("Eres un asesor financiero práctico para pequeños comercios en Colombia.", prompt)
            if advice:
                return {"advice": advice, "engine": engine_name}
        except Exception as e:
            last_error = str(e)
            continue

    return {"advice": f"Detalle técnico: {last_error}", "engine": "none"}
