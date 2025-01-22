from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime

class KnowledgeService:
    def __init__(self):
        self.datasets = {}  # 简单起见，使用内存存储
        self.documents = {}

    async def get_datasets(self) -> List[Dict[str, Any]]:
        """获取所有知识库列表"""
        return [
            {
                "id": dataset_id,
                "name": dataset["name"],
                "description": dataset.get("description", ""),
                "document_count": len(dataset.get("documents", [])),
                "created_at": dataset["created_at"]
            }
            for dataset_id, dataset in self.datasets.items()
        ]

    async def create_dataset(self, name: str, description: Optional[str] = None) -> Dict[str, Any]:
        """创建新的知识库"""
        dataset_id = str(uuid.uuid4())
        dataset = {
            "id": dataset_id,
            "name": name,
            "description": description,
            "documents": [],
            "created_at": datetime.now().isoformat()
        }
        self.datasets[dataset_id] = dataset
        return dataset

    async def delete_dataset(self, dataset_id: str) -> None:
        """删除知识库"""
        if dataset_id not in self.datasets:
            raise Exception("知识库不存在")
        
        # 删除知识库中的所有文档
        for doc_id in self.datasets[dataset_id]["documents"]:
            if doc_id in self.documents:
                del self.documents[doc_id]
        
        # 删除知识库
        del self.datasets[dataset_id]

    async def get_documents(self, dataset_id: str) -> List[Dict[str, Any]]:
        """获取知识库中的所有文档"""
        if dataset_id not in self.datasets:
            return []
        return [
            self.documents[doc_id]
            for doc_id in self.datasets[dataset_id]["documents"]
            if doc_id in self.documents
        ]

    async def add_document(self, dataset_id: str, title: str, content: str, url: Optional[str] = None) -> Dict[str, Any]:
        """添加文档到知识库"""
        if dataset_id not in self.datasets:
            raise Exception("知识库不存在")
        
        doc_id = str(uuid.uuid4())
        document = {
            "id": doc_id,
            "title": title,
            "url": url,
            "content": content,
            "created_at": datetime.now().isoformat()
        }
        
        self.documents[doc_id] = document
        self.datasets[dataset_id]["documents"].append(doc_id)
        return document

    async def delete_documents(self, dataset_id: str, document_ids: List[str]) -> None:
        """从知识库中删除文档"""
        if dataset_id not in self.datasets:
            raise Exception("知识库不存在")
        
        for doc_id in document_ids:
            if doc_id in self.documents and doc_id in self.datasets[dataset_id]["documents"]:
                # 从数据结构中删除
                self.datasets[dataset_id]["documents"].remove(doc_id)
                del self.documents[doc_id] 