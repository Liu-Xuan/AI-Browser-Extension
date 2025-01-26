import os
import json
import requests
from typing import List, Optional

# RAGFlow API 配置
RAGFLOW_API_URL = 'http://172.19.12.146:8888'
RAGFLOW_API_KEY = 'ragflow-RkOWJjM2ZhZDFhZTExZWZhYmRmMDI0Mm'

class TempKnowledgeService:
    def __init__(self):
        self.api_key = RAGFLOW_API_KEY
        self.base_url = RAGFLOW_API_URL
        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        # 获取已存在的临时知识库ID
        self.temp_dataset_id = self.get_temp_dataset_id()
        
    def get_temp_dataset_id(self) -> Optional[str]:
        """获取已存在的临时知识库ID"""
        print("Getting temporary dataset ID...")
        url = f"{self.base_url}/api/v1/datasets"
        
        try:
            response = requests.get(url, headers=self.headers)
            print(f"Get datasets response: {response.status_code}")
            print(f"Response content: {response.text}")
            
            if response.status_code == 200:
                result = response.json()
                if result["code"] == 0:
                    datasets = result["data"]["datasets"]
                    # 查找名为"网页问答临时知识库"的数据集
                    for dataset in datasets:
                        if dataset["name"] == "网页问答临时知识库":
                            dataset_id = dataset["id"]
                            print(f"Found existing dataset with ID: {dataset_id}")
                            return dataset_id
                    print("Dataset '网页问答临时知识库' not found")
                else:
                    print(f"Failed to get datasets: {result.get('message', 'Unknown error')}")
            else:
                print(f"HTTP error: {response.status_code}")
        except Exception as e:
            print(f"Error getting datasets: {str(e)}")
            
        return None

    def upload_file(self, file_path: str) -> Optional[str]:
        """上传本地文件到临时知识库"""
        if not self.temp_dataset_id:
            if not self.get_temp_dataset_id():
                return None
                
        url = f"{self.base_url}/api/v1/datasets/{self.temp_dataset_id}/documents"
        print(f"Uploading file to {url}")
        
        try:
            with open(file_path, 'rb') as f:
                files = {'file': f}
                response = requests.post(url, headers=self.headers, files=files)
                print(f"Upload response: {response.status_code}")
                print(f"Response content: {response.text}")
                
                if response.status_code == 200:
                    result = response.json()
                    if result["code"] == 0:
                        doc_id = result["data"][0]["id"]
                        print(f"Uploaded document with ID: {doc_id}")
                        return doc_id
                    else:
                        print(f"Upload failed: {result.get('message', 'Unknown error')}")
        except Exception as e:
            print(f"Upload file error: {str(e)}")
            
        return None

    def add_webpage_content(self, title: str, content: str, url: str) -> Optional[str]:
        """添加网页内容到临时知识库"""
        if not self.temp_dataset_id:
            if not self.get_temp_dataset_id():
                return None
                
        # 将网页内容保存为临时文件
        temp_file = f"temp_{title}.txt"
        try:
            with open(temp_file, "w", encoding="utf-8") as f:
                f.write(f"Title: {title}\n")
                f.write(f"URL: {url}\n")
                f.write("\nContent:\n")
                f.write(content)
                
            # 上传临时文件
            doc_id = self.upload_file(temp_file)
            
            # 删除临时文件
            os.remove(temp_file)
            
            return doc_id
            
        except Exception as e:
            print(f"Add webpage content error: {str(e)}")
            if os.path.exists(temp_file):
                os.remove(temp_file)
                
        return None

    def list_documents(self) -> List[dict]:
        """获取临时知识库中的所有文档"""
        if not self.temp_dataset_id:
            if not self.get_temp_dataset_id():
                return []
                
        url = f"{self.base_url}/api/v1/datasets/{self.temp_dataset_id}/documents"
        print(f"Fetching documents from {url}")
        
        try:
            response = requests.get(url, headers=self.headers)
            print(f"List documents response: {response.status_code}")
            print(f"Response content: {response.text}")
            
            if response.status_code == 200:
                result = response.json()
                if result["code"] == 0:
                    docs = result["data"]["docs"]
                    print(f"Found {len(docs)} documents")
                    return docs
                else:
                    print(f"List documents failed: {result.get('message', 'Unknown error')}")
        except Exception as e:
            print(f"List documents error: {str(e)}")
            
        return []

    def delete_document(self, doc_id: str) -> bool:
        """删除指定的文档"""
        if not self.temp_dataset_id:
            return False
            
        url = f"{self.base_url}/api/v1/datasets/{self.temp_dataset_id}/documents"
        data = {
            "ids": [doc_id]
        }
        print(f"Deleting document {doc_id}")
        
        try:
            response = requests.delete(url, headers=self.headers, json=data)
            print(f"Delete response: {response.status_code}")
            print(f"Response content: {response.text}")
            
            if response.status_code == 200:
                result = response.json()
                success = result["code"] == 0
                if success:
                    print(f"Successfully deleted document {doc_id}")
                else:
                    print(f"Failed to delete document: {result.get('message', 'Unknown error')}")
                return success
        except Exception as e:
            print(f"Delete document error: {str(e)}")
            
        return False

    def clear_unlocked_documents(self, locked_ids: List[str]) -> bool:
        """清除所有未锁定的文档"""
        if not self.temp_dataset_id:
            return False
            
        # 获取所有文档
        docs = self.list_documents()
        print(f"Found {len(docs)} total documents, {len(locked_ids)} locked")
        
        # 找出未锁定的文档ID
        unlocked_ids = [doc["id"] for doc in docs if doc["id"] not in locked_ids]
        print(f"Will delete {len(unlocked_ids)} unlocked documents")
        
        if not unlocked_ids:
            return True
            
        # 删除未锁定的文档
        url = f"{self.base_url}/api/v1/datasets/{self.temp_dataset_id}/documents"
        data = {
            "ids": unlocked_ids
        }
        
        try:
            response = requests.delete(url, headers=self.headers, json=data)
            print(f"Clear unlocked response: {response.status_code}")
            print(f"Response content: {response.text}")
            
            if response.status_code == 200:
                result = response.json()
                success = result["code"] == 0
                if success:
                    print("Successfully cleared unlocked documents")
                else:
                    print(f"Failed to clear documents: {result.get('message', 'Unknown error')}")
                return success
        except Exception as e:
            print(f"Clear unlocked documents error: {str(e)}")
            
        return False 