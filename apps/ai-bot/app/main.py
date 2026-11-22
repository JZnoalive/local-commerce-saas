from fastapi import FastAPI

app = FastAPI(title="Local Commerce AI Bot")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-bot"}
