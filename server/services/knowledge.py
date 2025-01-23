from typing import List, Dict, Any, Optional
import aiohttp
from datetime import datetime
from fastapi import HTTPException, UploadFile
import os
from config import settings

class KnowledgeService:
    def __init__(self):
        self.base_url = settings.RAGFLOW_API_URL
        self.api_key = settings.RAGFLOW_API_KEY
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    async def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, files: Optional[Dict] = None) -> Dict:
        """发送请求到 RAGFlow API"""
        url = f"{self.base_url}{endpoint}"
        async with aiohttp.ClientSession() as session:
            try:
                if method == "GET":
                    async with session.get(url, headers=self.headers) as response:
                        result = await response.json()
                elif method in ["POST", "PUT", "DELETE"]:
                    if files:
                        # 处理文件上传
                        form_data = aiohttp.FormData()
                        for key, file in files.items():
                            form_data.add_field(key, file)
                        headers = {"Authorization": self.headers["Authorization"]}
                        async with session.post(url, headers=headers, data=form_data) as response:
                            result = await response.json()
                    else:
                        async with getattr(session, method.lower())(url, headers=self.headers, json=data) as response:
                            result = await response.json()
                
                if result.get("code") != 0:
                    raise HTTPException(status_code=400, detail=result.get("message", "RAGFlow API 错误"))
                return result.get("data", {})
            except aiohttp.ClientError as e:
                raise HTTPException(status_code=500, detail=f"RAGFlow API 请求失败: {str(e)}")

    async def get_datasets(self) -> List[Dict[str, Any]]:
        """获取所有知识库列表"""
        result = await self._make_request("GET", "/api/v1/datasets")
        return result

    async def create_dataset(self, name: str, description: Optional[str] = None) -> Dict[str, Any]:
        """创建新的知识库"""
        data = {
            "name": name,
            "description": description,
            "embedding_model": "BAAI/bge-large-zh-v1.5",
            "chunk_method": "naive",
            "parser_config": {
                "chunk_token_num": 128,
                "delimiter": "\\n!?;。；！？",
                "html4excel": False,
                "layout_recognize": True,
                "raptor": {"use_raptor": False}
            }
        }
        return await self._make_request("POST", "/api/v1/datasets", data=data)

    async def delete_dataset(self, dataset_id: str) -> None:
        """删除知识库"""
        await self._make_request("DELETE", "/api/v1/datasets", data={"ids": [dataset_id]})

    async def update_dataset(self, dataset_id: str, name: str, description: Optional[str] = None) -> None:
        """更新知识库"""
        data = {
            "name": name,
            "description": description
        }
        await self._make_request("PUT", f"/api/v1/datasets/{dataset_id}", data=data)

    async def get_documents(self, dataset_id: str) -> List[Dict[str, Any]]:
        """获取知识库中的所有文档"""
        result = await self._make_request("GET", f"/api/v1/datasets/{dataset_id}/documents")
        return result.get("docs", [])

    async def add_document(self, dataset_id: str, file: UploadFile) -> Dict[str, Any]:
        """上传文档到知识库"""
        content = await file.read()
        files = {"file": (file.filename, content, file.content_type)}
        return await self._make_request("POST", f"/api/v1/datasets/{dataset_id}/documents", files=files)

    async def delete_documents(self, dataset_id: str, document_ids: List[str]) -> None:
        """从知识库中删除文档"""
        await self._make_request("DELETE", f"/api/v1/datasets/{dataset_id}/documents", data={"ids": document_ids})

    async def update_document(self, dataset_id: str, document_id: str, chunk_method: str, parser_config: Dict) -> None:
        """更新文档配置"""
        data = {
            "chunk_method": chunk_method,
            "parser_config": parser_config
        }
        await self._make_request("PUT", f"/api/v1/datasets/{dataset_id}/documents/{document_id}", data=data)

    async def parse_documents(self, dataset_id: str, document_ids: List[str]) -> None:
        """解析文档"""
        data = {"document_ids": document_ids}
        await self._make_request("POST", f"/api/v1/datasets/{dataset_id}/chunks", data=data)

    async def stop_parsing(self, dataset_id: str, document_ids: List[str]) -> None:
        """停止解析文档"""
        data = {"document_ids": document_ids}
        await self._make_request("DELETE", f"/api/v1/datasets/{dataset_id}/chunks", data=data)

    async def retrieve(self, question: str, dataset_ids: List[str], similarity_threshold: float = 0.2, top_k: int = 5) -> Dict[str, Any]:
        """检索知识库内容"""
        data = {
            "question": question,
            "dataset_ids": dataset_ids,
            "similarity_threshold": similarity_threshold,
            "top_k": top_k
        }
        return await self._make_request("POST", "/api/v1/retrieval", data=data) 