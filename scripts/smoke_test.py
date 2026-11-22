import sys
import urllib.request
from playwright.sync_api import sync_playwright

WEB_URL = "http://localhost:3000"
ADMIN_URL = "http://localhost:3000/admin"
API_URL = "http://localhost:8000/"


def check_api() -> bool:
    try:
        with urllib.request.urlopen(API_URL, timeout=5) as resp:
            body = resp.read().decode("utf-8", errors="ignore")
            ok = resp.status == 200 and "online" in body
            print(f"[API] GET {API_URL} -> status={resp.status} | ok={ok}")
            return ok
    except Exception as e:
        print(f"[API] Error conectando a {API_URL}: {e}")
        return False


def check_web() -> bool:
    console_errors = []
    page_errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda err: page_errors.append(str(err)))

        print(f"[WEB] Abriendo {WEB_URL} ...")
        page.goto(WEB_URL, wait_until="domcontentloaded", timeout=20000)
        page.wait_for_load_state("networkidle", timeout=15000)

        page.evaluate(
            """() => {
                window.localStorage.setItem(
                    'pueblonuevo_carts_v1',
                    JSON.stringify({ 'test-biz': { 'test-prod': 2 } })
                );
            }"""
        )
        page.reload(wait_until="domcontentloaded", timeout=20000)
        page.wait_for_load_state("networkidle", timeout=15000)

        persisted = page.evaluate("() => window.localStorage.getItem('pueblonuevo_carts_v1')")
        print(f"[STORAGE] Persistencia tras reload: {persisted}")

        # Limpiar dato sintético para no contaminar el estado local
        page.evaluate("() => window.localStorage.removeItem('pueblonuevo_carts_v1')")

        print(f"[ADMIN] Abriendo {ADMIN_URL} ...")
        page.goto(ADMIN_URL, wait_until="domcontentloaded", timeout=20000)
        page.wait_for_load_state("networkidle", timeout=15000)
        title_text = page.locator("body").inner_text()[:120].replace("\n", " ")
        print(f"[ADMIN] Contenido visible inicial: {title_text!r}")

        browser.close()

    if console_errors:
        print("[ERRORES CONSOLA]:", console_errors)
    if page_errors:
        print("[ERRORES PÁGINA]:", page_errors)

    storage_ok = bool(persisted and persisted != "{}" and "test-prod" in persisted)
    return bool(storage_ok and not page_errors)


if __name__ == "__main__":
    api_ok = check_api()
    web_ok = check_web()
    if api_ok and web_ok:
        print("\n✅ SMOKE TEST APROBADO")
        sys.exit(0)
    else:
        print("\n❌ SMOKE TEST CON FALLOS")
        sys.exit(1)
