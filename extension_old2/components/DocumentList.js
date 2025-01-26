import React, { useState, useEffect } from 'react';
import './DocumentList.css';
import DocumentManager from '../services/documentManager';

const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [lockedDocs, setLockedDocs] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const docManager = new DocumentManager();

  // 获取文档列表
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://172.19.12.146:8888/api/v1/datasets', {
        headers: {
          'Authorization': 'Bearer RkOWJjM2ZhZDFhZTExZWZhYmRmMDI0Mm'
        }
      });
      
      if (!response.ok) {
        throw new Error('获取文档列表失败');
      }
      
      const data = await response.json();
      setDocuments(data.data || []);
    } catch (error) {
      console.error('获取文档列表失败:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // 初始化时加载文档列表
  useEffect(() => {
    // 监听文档列表更新事件
    const handleDocumentsUpdate = (event) => {
      setDocuments(event.detail || []);
    };

    // 监听连接状态更新事件
    const handleConnectionUpdate = (event) => {
      const status = event.detail || {};
      setConnectionStatus(status);
    };

    window.addEventListener('updateDocuments', handleDocumentsUpdate);
    window.addEventListener('connectionStatusChange', handleConnectionUpdate);

    // 初始化时检查连接状态
    chrome.runtime.sendMessage({ type: 'checkConnection' });

    return () => {
      window.removeEventListener('updateDocuments', handleDocumentsUpdate);
      window.removeEventListener('connectionStatusChange', handleConnectionUpdate);
    };
  }, []);

  // 检查连接状态
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('开始检查连接状态...');
      const status = await docManager.checkConnection();
      console.log('获取到连接状态:', status);
      setConnectionStatus(status);
      
      if (status.connected && status.tempDataset) {
        console.log('找到临时知识库，开始加载文档...');
        await loadDocuments();
      } else {
        console.log('未找到临时知识库');
        setError(`未找到临时知识库。\n已有知识库数量: ${status.datasetsCount || 0}`);
      }
    } catch (error) {
      console.error('检查连接失败:', error);
      setError(`连接服务器失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 加载文档列表
  const loadDocuments = async () => {
    try {
      console.log('开始加载文档列表...');
      const docs = await docManager.getDocuments();
      console.log('获取到文档列表:', docs);
      setDocuments(docs || []);
    } catch (error) {
      console.error('加载文档列表失败:', error);
      setError(`加载文档列表失败: ${error.message}`);
    }
  };

  // 处理文件上传
  const handleFileUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.txt,.docx';
    input.multiple = true;

    input.onchange = async (event) => {
      const files = event.target.files;
      if (files.length === 0) return;

      setLoading(true);
      setError(null);

      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          
          // 调用后台脚本上传文件
          await chrome.runtime.sendMessage({
            type: 'uploadFile',
            data: formData
          });
        } catch (error) {
          setError(`上传失败: ${error.message}`);
          console.error('文件上传失败:', error);
        }
      }

      setLoading(false);
    };

    input.click();
  };

  // 处理添加当前页面
  const handleAddCurrentPage = async () => {
    setLoading(true);
    setError(null);

    try {
      // 获取当前标签页信息
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 发送消息给content script获取页面内容
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'getPageContent' });
      
      if (response && response.content) {
        // 发送页面内容到后台进行处理
        await chrome.runtime.sendMessage({
          type: 'addPageContent',
          data: {
            title: tab.title,
            url: tab.url,
            content: response.content
          }
        });
      }
    } catch (error) {
      setError('添加页面失败，请刷新页面重试');
      console.error('添加页面失败:', error);
    }

    setLoading(false);
  };

  // 处理文档删除
  const handleDeleteDocument = async (documentId) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'deleteFiles',
        data: { fileIds: [documentId] }
      });
    } catch (error) {
      setError('删除文件失败，请重试');
      console.error('删除文件失败:', error);
    }
  };

  // 处理文档锁定/解锁
  const handleToggleLock = (docId) => {
    setLockedDocs(prevLocked => {
      const newLocked = new Set(prevLocked);
      if (newLocked.has(docId)) {
        newLocked.delete(docId);
      } else {
        newLocked.add(docId);
      }
      return newLocked;
    });
  };

  // 处理清除未锁定文档
  const handleClearUnlocked = async () => {
    try {
      setError(null);
      await docManager.clearUnlockedDocuments(Array.from(lockedDocs));
      await loadDocuments();
    } catch (error) {
      console.error('清除未锁定文档失败:', error);
      setError('清除未锁定文档失败，请稍后重试');
    }
  };

  // 处理重新连接
  const handleReconnect = () => {
    chrome.runtime.sendMessage({ type: 'reconnect' });
  };

  if (loading) {
    return (
      <div className="document-list loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">连接中...</div>
      </div>
    );
  }

  if (!connectionStatus || !connectionStatus.connected) {
    return (
      <div className="document-list error">
        <div className="connection-error">
          <h3>连接失败</h3>
          <p>{error || '无法连接到服务器'}</p>
          <div className="error-details">
            <pre>{JSON.stringify(connectionStatus, null, 2)}</pre>
          </div>
          <button onClick={checkConnection}>重试</button>
        </div>
      </div>
    );
  }

  return (
    <div className="document-list">
      <div className="connection-status">
        {connectionStatus && connectionStatus.tempDataset ? (
          <>
            <div className="connection-info">
              <div className="connection-details">
                <span className="connection-name">
                  已连接到知识库: {connectionStatus.tempDataset.name}
                </span>
                <span className="dataset-id">
                  ID: {connectionStatus.tempDataset.id}
                </span>
              </div>
              <button 
                className="reconnect-button"
                onClick={checkConnection}
                disabled={loading || uploading}
              >
                {loading ? '连接中...' : '重新连接'}
              </button>
            </div>
            <div className="connection-stats">
              <span>知识库总数: {connectionStatus.datasetsCount || 0}</span>
              <span>文档数量: {documents.length}</span>
            </div>
          </>
        ) : (
          <div className="connection-warning">
            <span>未连接到知识库</span>
            <button 
              className="reconnect-button"
              onClick={checkConnection}
              disabled={loading}
            >
              {loading ? '连接中...' : '重新连接'}
            </button>
          </div>
        )}
      </div>
      
      {error && (
        <div className="error-message">
          <div className="error-content">
            <div className="error-text">{error}</div>
            {error.includes('上传文档失败') && (
              <div className="error-details">
                <small>请检查文件格式和大小是否符合要求</small>
              </div>
            )}
          </div>
          <button onClick={() => setError(null)}>关闭</button>
        </div>
      )}
      
      <div className="document-actions">
        <button 
          onClick={handleFileUpload} 
          className={`button ${(loading || !connectionStatus || !connectionStatus.tempDataset) ? 'disabled' : ''}`}
          disabled={loading || !connectionStatus || !connectionStatus.tempDataset}
        >
          {loading ? '上传中...' : '上传文件'}
        </button>
        <button 
          onClick={handleAddCurrentPage} 
          className={`button ${(loading || !connectionStatus || !connectionStatus.tempDataset) ? 'disabled' : ''}`}
          disabled={loading || !connectionStatus || !connectionStatus.tempDataset}
        >
          {loading ? '添加中...' : '添加当前页面'}
        </button>
        <button 
          onClick={handleClearUnlocked}
          disabled={loading || !connectionStatus || !connectionStatus.tempDataset}
        >
          开启新对话
        </button>
      </div>

      <div className="documents">
        {documents.length === 0 ? (
          <div className="empty-message">
            暂无文档，请上传文件或添加网页内容
          </div>
        ) : (
          documents.map(doc => (
            <div key={doc.id} className="document-item">
              <span className="doc-name" title={doc.name}>
                {doc.name}
              </span>
              <div className="doc-actions">
                <button
                  onClick={() => handleToggleLock(doc.id)}
                  className={lockedDocs.has(doc.id) ? 'locked' : ''}
                  disabled={loading}
                >
                  {lockedDocs.has(doc.id) ? '已锁定' : '未锁定'}
                </button>
                <button 
                  onClick={() => handleDeleteDocument(doc.id)}
                  disabled={loading}
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DocumentList; 