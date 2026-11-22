import argparse
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from openai import OpenAI

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / "apps/ai-bot/.env")

BLOCKED_KEYWORDS = ("image", "audio", "tts", "live", "embedding", "veo", "imagen")


def is_text_flash_model(name: str) -> bool:
    n = name.lower()
    if "flash" not in n:
        return False
    return not any(bad in n for bad in BLOCKED_KEYWORDS)


def try_gemini(api_key: str, text_prompt: str) -> tuple[str, str] | None:
    try:
        client = genai.Client(api_key=api_key)
        candidates = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"]
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
                    return f"gemini/{model_name}", res.text
            except Exception:
                continue
    except Exception:
        pass
    return None


def try_openai_compatible(
    label: str,
    api_key: str,
    base_url: str,
    preferred_models: list[str],
    fallback_keywords: tuple[str, ...],
    text_prompt: str,
) -> tuple[str, str] | None:
    try:
        client = OpenAI(api_key=api_key, base_url=base_url)
        models_to_try = list(preferred_models)
        try:
            available = [m.id for m in client.models.list().data if getattr(m, "id", None)]
            models_to_try = [m for m in preferred_models if m in available]
            for mid in available:
                if mid not in models_to_try and (
                    not fallback_keywords or any(k in mid.lower() for k in fallback_keywords)
                ):
                    models_to_try.append(mid)
            if not models_to_try:
                models_to_try = preferred_models
        except Exception:
            pass

        for model_name in models_to_try[:4]:
            try:
                comp = client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": text_prompt}],
                    max_tokens=800,
                )
                content = comp.choices[0].message.content
                if content:
                    return f"{label}/{model_name}", content
            except Exception:
                continue
    except Exception as e:
        print(f"[{label} error]: {e}")
    return None


def try_claude(api_key: str, text_prompt: str) -> tuple[str, str] | None:
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=api_key)
        for model_name in ("claude-sonnet-4-5", "claude-haiku-4-5"):
            try:
                msg = client.messages.create(
                    model=model_name,
                    max_tokens=800,
                    messages=[{"role": "user", "content": text_prompt}],
                )
                parts = [b.text for b in msg.content if getattr(b, "type", "") == "text"]
                if parts:
                    return f"claude/{model_name}", "\n".join(parts)
            except Exception:
                continue
    except ImportError:
        print("[Claude]: instala 'anthropic' si quieres usar ANTHROPIC_API_KEY.")
    except Exception as e:
        print(f"[Claude error]: {e}")
    return None


def get_git_changed_files(staged_only: bool = False) -> list[Path]:
    cmd = ["git", "diff", "--name-only", "--cached"] if staged_only else ["git", "diff", "--name-only", "HEAD"]
    try:
        out = subprocess.check_output(cmd, cwd=ROOT, text=True)
        files = []
        for line in out.splitlines():
            p = ROOT / line.strip()
            if p.exists() and p.is_file() and p.suffix in {".ts", ".tsx", ".js", ".jsx", ".py", ".sql"}:
                files.append(p)
        return files
    except Exception:
        return []


def run_council_on_file(target_path: Path, agents_guide: str) -> str:
    code = target_path.read_text(encoding="utf-8", errors="ignore")[:6000]
    prompt = (
        f"Reglas: {agents_guide[:600]}\n\n"
        f"Revisa '{target_path.relative_to(ROOT)}' (extracto) y dame en español conciso:\n"
        "1. Posibles bugs o casos borde.\n"
        "2. Mejoras concretas de UI/UX o rendimiento.\n"
        "3. Una mejora rápida.\n\n"
        f"```\n{code}\n```"
    )

    results: list[tuple[str, str]] = []

    if os.getenv("GEMINI_API_KEY"):
        g_res = try_gemini(os.getenv("GEMINI_API_KEY", ""), prompt)
        if g_res:
            results.append(g_res)

    if os.getenv("GROQ_API_KEY"):
        q_res = try_openai_compatible(
            "groq",
            os.getenv("GROQ_API_KEY", ""),
            "https://api.groq.com/openai/v1",
            ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "qwen/qwen3-32b"],
            ("llama", "qwen", "gemma"),
            prompt,
        )
        if q_res:
            results.append(q_res)

    if os.getenv("MISTRAL_API_KEY"):
        m_res = try_openai_compatible(
            "mistral",
            os.getenv("MISTRAL_API_KEY", ""),
            "https://api.mistral.ai/v1",
            ["codestral-latest", "mistral-small-latest", "open-mistral-nemo"],
            ("mistral", "codestral", "nemo"),
            prompt,
        )
        if m_res:
            results.append(m_res)

    if os.getenv("CEREBRAS_API_KEY"):
        c_res = try_openai_compatible(
            "cerebras",
            os.getenv("CEREBRAS_API_KEY", ""),
            "https://api.cerebras.ai/v1",
            ["llama-3.3-70b", "qwen-3-32b"],
            ("llama", "qwen"),
            prompt,
        )
        if c_res:
            results.append(c_res)

    if os.getenv("OPENROUTER_API_KEY"):
        o_res = try_openai_compatible(
            "openrouter",
            os.getenv("OPENROUTER_API_KEY", ""),
            "https://openrouter.ai/api/v1",
            [
                "meta-llama/llama-3.3-70b-instruct:free",
                "qwen/qwen-2.5-coder-32b-instruct:free",
                "mistralai/mistral-small-3.1-24b-instruct:free",
            ],
            (":free",),
            prompt,
        )
        if o_res:
            results.append(o_res)

    if os.getenv("ANTHROPIC_API_KEY"):
        cl_res = try_claude(os.getenv("ANTHROPIC_API_KEY", ""), prompt)
        if cl_res:
            results.append(cl_res)

    if not results:
        return f"## {target_path.relative_to(ROOT)}\n\nSin respuesta de ningún proveedor configurado ahora.\n"

    sections = [f"# Revisión del Comité: `{target_path.relative_to(ROOT)}`\n"]
    for model_label, text in results:
        header = f"\n=== REVISIÓN: {model_label.upper()} ===\n"
        print(header)
        print(text)
        sections.append(f"\n## {model_label.upper()}\n\n{text}\n")

    return "\n".join(sections)


def main() -> None:
    parser = argparse.ArgumentParser(description="Comité Multi-IA para revisión automática de código")
    parser.add_argument("files", nargs="*", help="Rutas de archivos a revisar")
    parser.add_argument("--changed", action="store_true", help="Revisa archivos modificados respecto a HEAD")
    parser.add_argument("--staged", action="store_true", help="Revisa archivos en staging (git add)")
    args = parser.parse_args()

    targets: list[Path] = []
    if args.staged:
        targets = get_git_changed_files(staged_only=True)
    elif args.changed:
        targets = get_git_changed_files(staged_only=False)
    elif args.files:
        for f in args.files:
            p = (ROOT / f) if not Path(f).is_absolute() else Path(f)
            if p.exists() and p.is_file():
                targets.append(p)
            else:
                print(f"No existe el archivo: {f}")

    if not targets:
        print("No hay archivos para revisar. Pasa rutas o usa --changed / --staged.")
        sys.exit(1)

    agents_guide = (ROOT / "AGENTS.md").read_text(encoding="utf-8") if (ROOT / "AGENTS.md").exists() else ""
    reports_dir = ROOT / "reports/council"
    reports_dir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    combined_md = [f"# Reporte del Comité ({stamp})\n"]

    for t in targets[:3]:
        md_report = run_council_on_file(t, agents_guide)
        combined_md.append(md_report)
        safe_name = t.relative_to(ROOT).as_posix().replace("/", "_")
        (reports_dir / f"{safe_name}-{stamp}.md").write_text(md_report, encoding="utf-8")

    final_text = "\n---\n".join(combined_md)
    (reports_dir / "latest.md").write_text(final_text, encoding="utf-8")
    print(f"\n📁 Reporte guardado en: reports/council/latest.md")


if __name__ == "__main__":
    main()
