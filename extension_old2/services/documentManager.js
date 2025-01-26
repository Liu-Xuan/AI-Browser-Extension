// 文档管理服务类
class DocumentManager {
  constructor() {
    // RAGFlow API 配置
    this.apiUrl = 'http://172.19.12.146:8888';
    this.apiKey = 'ragflow-RkOWJjM2ZhZDFhZTExZWZhYmRmMDI0Mm';
    this.tempDatasetId = null;
    this.initialized = false;
  }

  // 检查连接状态
  async checkConnection() {
    try {
      const datasets = await this.getDatasets();
      console.log('获取到的知识库列表:', datasets);
      
      const tempDataset = datasets.find(ds => ds.name === '网页问答临时知识库');
      console.log('找到的临时知识库:', tempDataset);
      
      return {
        connected: true,
        datasetsCount: datasets.length,
        tempDataset: tempDataset ? {
          id: tempDataset.id,
          name: tempDataset.name
        } : null
      };
    } catch (error) {
      console.error('连接检查失败:', error);
      return {
        connected: false,
        error: error.message
      };
    }
  }

  // 初始化 - 获取临时知识库ID
  async initialize() {
    if (this.initialized) {
      console.log('已经初始化过，使用缓存的知识库ID:', this.tempDatasetId);
      return;
    }
    
    try {
      console.log('开始初始化...');
      const datasets = await this.getDatasets();
      console.log('获取到知识库列表:', datasets);
      
      const tempDataset = datasets.find(ds => ds.name === '网页问答临时知识库');
      console.log('查找到的临时知识库:', tempDataset);
      
      if (!tempDataset) {
        throw new Error('找不到临时知识库');
      }
      
      this.tempDatasetId = tempDataset.id;
      this.initialized = true;
      console.log('初始化成功，知识库ID:', this.tempDatasetId);
    } catch (error) {
      console.error('初始化失败:', error);
      throw error;
    }
  }

  // 获取所有知识库列表
  async getDatasets() {
    try {
      console.log('开始获取知识库列表...');
      console.log('API URL:', this.apiUrl);
      console.log('API Key:', this.apiKey);

      const response = await fetch(
        `${this.apiUrl}/api/v1/datasets`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json'
          }
        }
      );
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      if (!response.ok) {
        throw new Error(`获取知识库列表失败: ${response.status} ${response.statusText}\n${responseText}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('JSON解析失败:', e);
        throw new Error(`响应格式错误: ${responseText}`);
      }

      console.log('解析后的响应数据:', data);
      
      if (data.code !== 0) {
        throw new Error(data.message || '获取知识库列表失败');
      }
      
      return data.data;
    } catch (error) {
      console.error('获取知识库列表错误:', error);
      throw error;
    }
  }

  // 获取文档列表
  async getDocuments() {
    await this.initialize();
    
    try {
      const response = await fetch(
        `${this.apiUrl}/api/v1/datasets/${this.tempDatasetId}/documents`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('获取文档列表失败');
      }

      const data = await response.json();
      return data.data.docs;
    } catch (error) {
      console.error('获取文档列表错误:', error);
      throw error;
    }
  }

  // 上传文档
  async uploadDocument(file) {
    await this.initialize();
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log('准备上传文件到知识库:', {
        datasetId: this.tempDatasetId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      
      const response = await fetch(
        `${this.apiUrl}/api/v1/datasets/${this.tempDatasetId}/documents`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: formData
        }
      );

      console.log('上传响应状态:', response.status);
      console.log('上传响应头:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('上传原始响应:', responseText);

      if (!response.ok) {
        throw new Error(`上传文档失败: ${response.status} ${response.statusText}\n${responseText}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('JSON解析失败:', e);
        throw new Error(`响应格式错误: ${responseText}`);
      }

      console.log('解析后的上传响应:', data);
      
      if (data.code !== 0) {
        throw new Error(data.message || '上传文档失败');
      }
      
      return data.data[0];
    } catch (error) {
      console.error('上传文档错误:', error);
      throw error;
    }
  }

  // 删除文档
  async deleteDocument(documentId) {
    await this.initialize();
    
    try {
      const response = await fetch(
        `${this.apiUrl}/api/v1/datasets/${this.tempDatasetId}/documents`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ids: [documentId]
          })
        }
      );

      if (!response.ok) {
        throw new Error('删除文档失败');
      }

      return true;
    } catch (error) {
      console.error('删除文档错误:', error);
      throw error;
    }
  }

  // 上传网页内容
  async uploadWebContent(title, content, url) {
    try {
      // 创建临时文本文件
      const blob = new Blob([
        `Title: ${title}\nURL: ${url}\n\nContent:\n${content}`
      ], { type: 'text/plain' });
      
      const file = new File([blob], `${title.slice(0, 50)}.txt`, { type: 'text/plain' });
      return await this.uploadDocument(file);
    } catch (error) {
      console.error('上传网页内容错误:', error);
      throw error;
    }
  }

  // 清除未锁定的文档
  async clearUnlockedDocuments(lockedDocIds) {
    await this.initialize();
    
    try {
      const documents = await this.getDocuments();
      const unlocked = documents.filter(doc => !lockedDocIds.includes(doc.id));
      
      if (unlocked.length > 0) {
        await this.deleteDocument(unlocked.map(doc => doc.id));
      }
      
      return true;
    } catch (error) {
      console.error('清除未锁定文档错误:', error);
      throw error;
    }
  }
}

export default DocumentManager; 