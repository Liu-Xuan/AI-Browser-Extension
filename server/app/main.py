"""
FastAPI 应用主入口

提供 RESTful API 服务，包括：
- 文本翻译
- 摘要生成
- 智能问答
- 知识库管理
- 健康检查
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from services.translator import TranslatorService
from services.summarizer import SummarizerService
from services.qa import QAService
from services.chat import ChatService
from services.knowledge import KnowledgeService
from utils.llm_wrapper import LLMWrapper

app = FastAPI(
    title="AI Assistant API",
    description="提供文本翻译、摘要生成和智能问答服务",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该限制来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 服务实例
translator = TranslatorService(model_type="deepseek-r1")
summarizer = SummarizerService(model_type="deepseek-r1")
qa_service = QAService(model_type="deepseek-r1")
chat_service = ChatService(default_model="deepseek-r1")
knowledge_service = KnowledgeService()
llm = LLMWrapper(model_type="deepseek-r1")

# 数据模型
class TranslateRequest(BaseModel):
    text: str
    target_lang: str
    source_lang: Optional[str] = None

class SummarizeRequest(BaseModel):
    text: str
    max_length: Optional[int] = None

class QARequest(BaseModel):
    context: str
    question: str
    history: Optional[List[dict]] = []

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    model_type: Optional[str] = "ollama"
    context: Optional[Dict[str, str]] = None

class DatasetRequest(BaseModel):
    name: str
    description: Optional[str] = None

class DocumentRequest(BaseModel):
    title: str
    content: str
    url: Optional[str] = None

class TextResponse(BaseModel):
    text: str

class ChatResponse(BaseModel):
    message: Dict[str, str]
    success: bool
    error: Optional[str] = None

class DatasetResponse(BaseModel):
    data: List[Dict[str, Any]]

class HealthResponse(BaseModel):
    status: str
    llm_available: bool
    version: str

@app.get("/api/v1/health", response_model=HealthResponse)
async def health_check():
    """
    健康检查端点
    
    检查服务状态和 LLM 可用性
    """
    llm_available = await llm.is_available()
    return HealthResponse(
        status="healthy",
        llm_available=llm_available,
        version="1.0.0"
    )

@app.post("/api/v1/translate", response_model=TextResponse)
async def translate(request: TranslateRequest):
    """翻译服务"""
    try:
        translated_text = await translator.translate(
            text=request.text,
            target_lang=request.target_lang,
            source_lang=request.source_lang
        )
        return TextResponse(text=translated_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/summarize", response_model=TextResponse)
async def summarize(request: SummarizeRequest):
    """摘要生成服务"""
    try:
        summary = await summarizer.summarize(
            text=request.text,
            max_length=request.max_length
        )
        return TextResponse(text=summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/qa", response_model=TextResponse)
async def qa(request: QARequest):
    """问答服务"""
    try:
        answer = await qa_service.get_answer(
            context=request.context,
            question=request.question,
            history=request.history
        )
        return TextResponse(text=answer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """聊天服务"""
    try:
        response = await chat_service.chat(
            messages=request.messages,
            model_type=request.model_type,
            context=request.context
        )
        return ChatResponse(
            message=response,
            success=True
        )
    except Exception as e:
        return ChatResponse(
            message={"role": "assistant", "content": str(e)},
            success=False,
            error=str(e)
        )

@app.get("/api/v1/datasets")
async def get_datasets():
    """获取知识库列表"""
    try:
        datasets = await knowledge_service.get_datasets()
        return {"code": 0, "data": datasets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/datasets")
async def create_dataset(request: DatasetRequest):
    """创建知识库"""
    try:
        dataset = await knowledge_service.create_dataset(
            name=request.name,
            description=request.description
        )
        return {"code": 0, "data": dataset}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/v1/datasets")
async def delete_dataset(ids: List[str]):
    """删除知识库"""
    try:
        await knowledge_service.delete_dataset(ids[0])  # 目前只处理单个删除
        return {"code": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/v1/datasets/{dataset_id}")
async def update_dataset(dataset_id: str, request: DatasetRequest):
    """更新知识库"""
    try:
        await knowledge_service.update_dataset(
            dataset_id=dataset_id,
            name=request.name,
            description=request.description
        )
        return {"code": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/datasets/{dataset_id}/documents")
async def get_documents(dataset_id: str):
    """获取文档列表"""
    try:
        documents = await knowledge_service.get_documents(dataset_id)
        return {"code": 0, "data": {"docs": documents}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/datasets/{dataset_id}/documents")
async def upload_document(dataset_id: str, file: UploadFile = File(...)):
    """上传文档"""
    try:
        result = await knowledge_service.add_document(dataset_id, file)
        return {"code": 0, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/v1/datasets/{dataset_id}/documents")
async def delete_documents(dataset_id: str, ids: List[str]):
    """删除文档"""
    try:
        await knowledge_service.delete_documents(dataset_id, ids)
        return {"code": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/v1/datasets/{dataset_id}/documents/{document_id}")
async def update_document(
    dataset_id: str,
    document_id: str,
    chunk_method: str,
    parser_config: Dict[str, Any]
):
    """更新文档配置"""
    try:
        await knowledge_service.update_document(
            dataset_id=dataset_id,
            document_id=document_id,
            chunk_method=chunk_method,
            parser_config=parser_config
        )
        return {"code": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/datasets/{dataset_id}/chunks")
async def parse_documents(dataset_id: str, document_ids: List[str]):
    """解析文档"""
    try:
        await knowledge_service.parse_documents(dataset_id, document_ids)
        return {"code": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/v1/datasets/{dataset_id}/chunks")
async def stop_parsing(dataset_id: str, document_ids: List[str]):
    """停止解析"""
    try:
        await knowledge_service.stop_parsing(dataset_id, document_ids)
        return {"code": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/retrieval")
async def retrieve(
    question: str,
    dataset_ids: List[str],
    similarity_threshold: float = 0.2,
    top_k: int = 5
):
    """检索知识库内容"""
    try:
        result = await knowledge_service.retrieve(
            question=question,
            dataset_ids=dataset_ids,
            similarity_threshold=similarity_threshold,
            top_k=top_k
        )
        return {"code": 0, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 