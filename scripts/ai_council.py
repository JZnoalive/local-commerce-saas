import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from openai import OpenAI

load_dotenv(Path(__file__).resolve().parent.parent / "apps/ai-bot/.env")

if len(sys.argv) < 2:
    print("Uso: python3 scripts/ai_council.py <ruta_del_archivo>")
    sys.exit(1)

target_path = Path(sys.argv[1])
if not target_path.exists():
    print(f"No existe el archivo: {target_path}")
    sys.exit(1)

code = target_path.read_text(encoding="utf-8")[:6000]
agents_guide = Path("AGENTS.md").read_text(encoding="utf-8") if Path("AGENTS.md").exists() else ""

prompt = (
    f"Reglas: {agents_guide[:600]}\n\n"
    f"Revisa '{target_path}' (extracto) y dame en español conciso:\n"
    "1. Posibles bugs o casos borde.\n"
    "2. Mejoras concretas de UI/UX o rendimiento.\n"
    "3. Una mejora rápida.\n\n"
    f"```tsx\n{code}\n```"
)

BLOCKED_KEYWORDS = ("image", "audio", "tts", "live", "embedding", "veo", "imagen")


def is_text_flash_model(name: str) -> bool:
    n = name.lower()
    if "flash" not in n:
        return False
    return not any(bad in n for bad in BLOCKED_KEYWORDS)


def try_gemini(api_key: str, text_prompt: str) -> tuple[str, str] | None:
    try:
        client = genai.Client(api_key=api_key)
        candidates = ["gemini-3.8-flash", "gemini-2.5-flash"]
        try:
            for m in client.models.list():
                name = getattr(m, "name", "").replace("models/", "")
                if is_text_flash_model(name) and name not in candidates:
                    candidates.append(name)
        except Exception:
            pass

        for model_name in candidates:
            try:
                res = client.models.generate_content(model=model_name, contents=text_prompt)
                if res and res.text:
                    return model_name, res.text
            except Exception:
                continue
    except Exception:
        pass
    return None


def try_groq(api_key: str, text_prompt: str) -> tuple[str, str] | None:
    try:
        client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
        models_to_try = []
        try:
            available = [m.id for m in client.models.list().data if getattr(m, "id", None)]
            for preferred in ("llama-3.3-70b-versatile", "llama-3.1-8b-instant", "qwen/qwen3-32b", "gemma2-9b-it"):
                if preferred in available:
                    models_to_try.append(preferred)
            for mid in available:
                if mid not in models_to_try and ("llama" in mid or "qwen" in mid or "gemma" in mid):
                    models_to_try.append(mid)
        except Exception:
            models_to_try = ["llama-3.1-8b-instant"]

        for model_name in models_to_try[:4]:
            try:
                comp = client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": text_prompt}],
                    max_tokens=800,
                )
                content = comp.choices[0].message.content
                if content:
                    return f"groq/{model_name}", content
            except Exception:
                continue
    except Exception as e:
        print(f"[Groq error]: {e}")
    return None


def try_openrouter_free(api_key: str, text_prompt: str) -> tuple[str, str] | None:
    free_models = [
        "meta-llama/llama-3.3-70b-instruct:free",
        "qwen/qwen-2.5-coder-32b-instruct:free",
        "mistralai/mistral-small-3.1-24b-instruct:free",
    ]
    client = OpenAI(api_key=api_key, base_url="https://openrouter.ai/api/v1")
    for model_name in free_models:
        try:
            comp = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": text_prompt}],
                max_tokens=800,
            )
            content = comp.choices[0].message.content
            if content:
                return f"openrouter/{model_name}", content
        except Exception:
            continue
    return None


results = []

gemini_key = os.getenv("GEMINI_API_KEY")
if gemini_key:
    g_res = try_gemini(gemini_key, prompt)
    if g_res:
        results.append(g_res)
    else:
        print("[Gemini] Sin cuota disponible en este momento; probando respaldo gratuito...")

groq_key = os.getenv("GROQ_API_KEY")
if groq_key:
    q_res = try_groq(groq_key, prompt)
    if q_res:
        results.append(q_res)

or_key = os.getenv("OPENROUTER_API_KEY")
if or_key and not results:
    o_res = try_openrouter_free(or_key, prompt)
    if o_res:
        results.append(o_res)

if not results:
    print("No hubo respuesta de ningún proveedor configurado ahora. Revisa tus keys en apps/ai-bot/.env.")
    sys.exit(1)

for model_label, text in results:
    print(f"\n=== REVISIÓN: {model_label.upper()} ===\n")
    print(text)
