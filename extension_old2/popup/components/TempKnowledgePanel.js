import React, { useState, useEffect } from 'react';
import { Box, Button, List, ListItem, IconButton, Typography, Paper, Snackbar, Alert } from '@mui/material';
import { Lock, LockOpen, Delete, Upload, Add, Refresh } from '@mui/icons-material';

const TempKnowledgePanel = () => {
    const [documents, setDocuments] = useState([]);
    const [lockedDocs, setLockedDocs] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 获取文档列表
    const fetchDocuments = async () => {
        try {
            setLoading(true);
            console.log('[TempKnowledgePanel] 开始获取文档列表...');
            
            // 发送消息给background script获取文档列表
            const response = await new Promise((resolve) => {
                console.log('[TempKnowledgePanel] 发送GET_DOCUMENTS消息...');
                chrome.runtime.sendMessage({
                    type: 'GET_DOCUMENTS'
                }, (response) => {
                    console.log('[TempKnowledgePanel] 收到GET_DOCUMENTS响应:', response);
                    resolve(response);
                });
            });
            
            if (response.success) {
                console.log('[TempKnowledgePanel] 文档列表:', response.documents);
                setDocuments(response.documents.map(doc => ({
                    id: doc.id,
                    name: doc.name,
                    createTime: doc.create_time,
                    updateTime: doc.update_time
                })));
                setError(null);
            } else {
                throw new Error(response.error || '获取文档列表失败');
            }
        } catch (error) {
            console.error('[TempKnowledgePanel] 获取文档列表失败:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    // 上传本地文件
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        setLoading(true);
        setError(null);
        
        try {
            console.log('[TempKnowledgePanel] 开始上传文件:', file.name);
            
            // 发送消息给background script处理文件上传
            const response = await new Promise((resolve) => {
                console.log('[TempKnowledgePanel] 发送UPLOAD_FILE消息...');
                chrome.runtime.sendMessage({
                    type: 'UPLOAD_FILE',
                    file: file
                }, (response) => {
                    console.log('[TempKnowledgePanel] 收到UPLOAD_FILE响应:', response);
                    resolve(response);
                });
            });
            
            if (response.success) {
                console.log('[TempKnowledgePanel] 文件上传成功:', response.fileId);
                // 刷新文档列表
                await fetchDocuments();
                setError(null);
            } else {
                throw new Error(response.error || '上传失败');
            }
        } catch (error) {
            console.error('[TempKnowledgePanel] 文件上传失败:', error);
            setError(`文件上传失败: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // 添加当前网页内容
    const handleAddWebpage = async () => {
        try {
            setLoading(true);
            console.log('获取当前页面信息...');
            
            // 通过 chrome.tabs API 获取当前页面信息
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            console.log('当前标签页:', tab);
            
            if (!tab || !tab.url) {
                throw new Error('无法获取当前页面信息');
            }
            
            // 检查是否是受限制的页面
            if (tab.url.startsWith('chrome://') || 
                tab.url.startsWith('chrome-extension://') || 
                tab.url.startsWith('about:') ||
                tab.url.startsWith('file://')) {
                throw new Error('无法访问浏览器内部页面');
            }
            
            try {
                // 注入content script
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content/content.js']
                });
                
                // 向content script发送消息获取页面内容
                const response = await new Promise((resolve, reject) => {
                    chrome.tabs.sendMessage(tab.id, {type: 'GET_PAGE_CONTENT'}, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    });
                });
                
                console.log('页面内容响应:', response);
                
                if (!response) {
                    throw new Error('无法获取页面内容');
                }
                
                if (response.error) {
                    throw new Error(response.error);
                }
                
                const { title, content } = response;
                
                if (!content || content.trim().length === 0) {
                    throw new Error('页面内容为空');
                }
                
                // 发送消息给background script处理页面内容
                const uploadResponse = await chrome.runtime.sendMessage({
                    type: 'ADD_WEBPAGE',
                    data: {
                        title: title || '未命名页面',
                        content,
                        url: tab.url
                    }
                });
                
                console.log('上传响应:', uploadResponse);
                
                if (uploadResponse.success) {
                    await fetchDocuments();
                    setError(null);
                } else {
                    throw new Error(uploadResponse.error || '添加网页内容失败');
                }
            } catch (error) {
                console.error('处理页面内容失败:', error);
                throw error;
            }
        } catch (error) {
            console.error('添加网页内容失败:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // 切换文档锁定状态
    const toggleLock = (docId) => {
        setLockedDocs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(docId)) {
                newSet.delete(docId);
            } else {
                newSet.add(docId);
            }
            return newSet;
        });
    };

    // 删除文档
    const handleDelete = async (docId) => {
        try {
            setLoading(true);
            console.log('Deleting document:', docId);
            
            const response = await chrome.runtime.sendMessage({
                type: 'DELETE_DOCUMENT',
                docId
            });
            
            console.log('Delete response:', response);
            
            if (response.success) {
                await fetchDocuments();
                setError(null);
            } else {
                throw new Error(response.error || '删除文档失败');
            }
        } catch (error) {
            console.error('删除文档失败:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // 开启新对话（清除未锁定文档）
    const handleNewChat = async () => {
        try {
            setLoading(true);
            console.log('Clearing unlocked documents...');
            
            const response = await chrome.runtime.sendMessage({
                type: 'CLEAR_UNLOCKED',
                lockedIds: Array.from(lockedDocs)
            });
            
            console.log('Clear unlocked response:', response);
            
            if (response.success) {
                await fetchDocuments();
                setError(null);
            } else {
                throw new Error(response.error || '清除未锁定文档失败');
            }
        } catch (error) {
            console.error('清除未锁定文档失败:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ width: '100%', p: 2 }}>
            <Typography variant="h6" gutterBottom>
                临时知识库
            </Typography>
            
            {/* 功能按钮组 */}
            <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                <Button
                    variant="contained"
                    startIcon={<Upload />}
                    component="label"
                    disabled={loading}
                >
                    上传文件
                    <input
                        type="file"
                        hidden
                        accept=".pdf,.txt,.doc,.docx"
                        onChange={handleFileUpload}
                    />
                </Button>
                
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleAddWebpage}
                    disabled={loading}
                >
                    添加当前页面
                </Button>
                
                <Button
                    variant="contained"
                    startIcon={<Refresh />}
                    onClick={handleNewChat}
                    disabled={loading}
                >
                    开启新对话
                </Button>
            </Box>
            
            {/* 文档列表 */}
            <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
                {loading ? (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography>加载中...</Typography>
                    </Box>
                ) : documents.length === 0 ? (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography>暂无文档</Typography>
                    </Box>
                ) : (
                    <List>
                        {documents.map((doc) => (
                            <ListItem
                                key={doc.id}
                                secondaryAction={
                                    <Box>
                                        <IconButton
                                            edge="end"
                                            onClick={() => toggleLock(doc.id)}
                                            disabled={loading}
                                        >
                                            {lockedDocs.has(doc.id) ? <Lock /> : <LockOpen />}
                                        </IconButton>
                                        <IconButton
                                            edge="end"
                                            onClick={() => handleDelete(doc.id)}
                                            disabled={loading}
                                        >
                                            <Delete />
                                        </IconButton>
                                    </Box>
                                }
                            >
                                <Typography noWrap title={doc.name}>
                                    {doc.name}
                                </Typography>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Paper>
            
            {/* 错误提示 */}
            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError(null)}
            >
                <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default TempKnowledgePanel; 