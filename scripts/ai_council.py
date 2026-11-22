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


def run_gemini(api_key: str, text_prompt: str) -> tuple[str, str]:
    client = genai.Client(api_key=api_key)
    candidates = ["gemini-3.8-flash", "gemini-2.5-flash"]
    try:
        for m in client.models.list():
            name = getattr(m, "name", "").replace("models/", "")
            if is_text_flash_model(name) and name not in candidates:
                candidates.append(name)
    except Exception:
        pass

    last_err = None
    for model_name in candidates:
        try:
            res = client.models.generate_content(model=model_name, contents=text_prompt)
            if res and res.text:
                return model_name, res.text
        except Exception as e:
            last_err = e
            continue
    raise RuntimeError(f"Sin cuota disponible en modelos Gemini ahora: {last_err}")


gemini_key = os.getenv("GEMINI_API_KEY")
if gemini_key:
    try:
        used_model, reply = run_gemini(gemini_key, prompt)
        print(f"\n=== REVISIÓN: {used_model.upper()} ===\n")
        print(reply)
    except Exception as e:
        print(f"\n[Gemini]: {e}")
else:
    print("Aviso: GEMINI_API_KEY no encontrada en apps/ai-bot/.env")

groq_key = os.getenv("GROQ_API_KEY")
if groq_key:
    groq = OpenAI(api_key=groq_key, base_url="https://api.groq.com/openai/v1")
    comp = groq.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=700,
    )
    print("\n=== SEGUNDA OPINIÓN: GROQ (LLAMA 3.3) ===\n")
    print(comp.choices[0].message.content)
