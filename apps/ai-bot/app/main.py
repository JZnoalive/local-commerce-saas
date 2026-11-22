import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from app.services.commerce_service import get_live_catalog_context

app = FastAPI(
    title="Local Commerce AI Bot API",
    description="Microservicio de atención automatizada conectado a inventario y horarios en vivo.",
    version="1.0.0",
)

# Permitir peticiones desde el Frontend Next.js (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar cliente oficial de Google GenAI
gemini_api_key = os.getenv("GEMINI_API_KEY")
ai_client = genai.Client(api_key=gemini_api_key) if gemini_api_key else None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500, description="Mensaje del cliente")


class ChatResponse(BaseModel):
    reply: str
    context_used: str


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-bot", "gemini_configured": ai_client is not None}


@app.post("/chat", response_model=ChatResponse)
def chat_with_assistant(payload: ChatRequest):
    if not ai_client:
        raise HTTPException(
            status_code=500,
            detail="Falta configurar GEMINI_API_KEY en el archivo apps/ai-bot/.env",
        )

    # 1. Obtener inventario y horarios reales desde Supabase
    live_context = get_live_catalog_context()

    # 2. Definir las reglas estrictas del asistente
    system_instruction = (
        "Eres el asistente virtual oficial de domicilios y comercio local de Pueblo Nuevo, Córdoba. "
        "Tu trabajo es ayudar a los clientes a consultar qué negocios están abiertos, qué productos "
        "tienen en stock, sus precios en pesos colombianos (COP) y costos de domicilio.\n"
        "REGLAS ESTRICTAS:\n"
        "1. Responde ÚNICAMENTE basándote en los datos reales proporcionados en el CONTEXTO EN VIVO.\n"
        "2. Si un producto no aparece o tiene 0 unidades, indica amablemente que no está disponible.\n"
        "3. Si el negocio está CERRADO en este momento, avísale al cliente e indícale a qué hora abre.\n"
        "4. Sé cordial, claro, breve y usa formato limpio ideal para leer desde el celular."
    )

    prompt = f"CONTEXTO EN VIVO DE LA BASE DE DATOS:\n{live_context}\n\nPREGUNTA DEL CLIENTE:\n{payload.message}"

    try:
        response = ai_client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,  # Temperatura baja para evitar inventar datos
            ),
        )
        return ChatResponse(reply=response.text, context_used=live_context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al consultar el modelo IA: {str(e)}")
