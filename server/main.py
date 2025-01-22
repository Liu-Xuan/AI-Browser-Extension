from fastapi import FastAPI, Request
from pydantic import BaseModel

app = FastAPI()

class TextRequest(BaseModel):
    text: str

@app.get("/")
def read_root():
    return {"status": "ok", "message": "AI Browser Extension API is running"}

@app.post("/api/summarize")
async def summarize(request: TextRequest):
    # TODO: 实现文本摘要逻辑
    return {
        "summary": f"这是'{request.text[:30]}...'的摘要"
    }

@app.post("/api/translate")
async def translate(request: TextRequest):
    # TODO: 实现翻译逻辑
    return {
        "translation": f"这是'{request.text[:30]}...'的翻译"
    } 