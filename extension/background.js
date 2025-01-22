const API_BASE_URL = 'http://172.19.12.146:8888/api/v1';
const API_KEY = 'ragflow-RkOWJjM2ZhZDFhZTExZWZhYmRmMDI0Mm';
const QWEN_API_URL = 'http://localhost:11434/api';
const QWEN_API_KEY = '';

// 通用请求头
const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
};

const qwenHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': chrome.runtime.getURL(''),
    'Access-Control-Allow-Origin': '*'
};

// 在扩展安装或更新时自动打开侧边栏
chrome.runtime.onInstalled.addListener(() => {
    // 创建右键菜单
    chrome.contextMenus.create({
        id: 'summarize',
        title: "生成摘要",
        contexts: ["selection"]
    });
    chrome.contextMenus.create({
        id: 'translate',
        title: "翻译文本",
        contexts: ["selection"]
    });
});

// 点击扩展图标时打开/关闭侧边栏
chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.toggle();
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.selectionText) {
        // 确保侧边栏打开
        chrome.sidePanel.open().then(() => {
            // 发送消息到侧边栏
            chrome.runtime.sendMessage({
                action: info.menuItemId,
                text: info.selectionText
            });
        });
    }
});

// 监听来自sidepanel.js的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 获取知识库列表
    if (request.action === 'getDatasets') {
        fetch(`${API_BASE_URL}/datasets`, {
            method: 'GET',
            headers: headers
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 0) {
                sendResponse({ success: true, data: data.data });
            } else {
                sendResponse({ success: false, error: data.message });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }

    // 创建知识库
    if (request.action === 'createDataset') {
        fetch(`${API_BASE_URL}/datasets`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(request.data)
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 0) {
                sendResponse({ success: true, data: data.data });
            } else {
                sendResponse({ success: false, error: data.message });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }

    // 删除知识库
    if (request.action === 'deleteDataset') {
        fetch(`${API_BASE_URL}/datasets`, {
            method: 'DELETE',
            headers: headers,
            body: JSON.stringify({ ids: request.datasetIds })
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 0) {
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: data.message });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }

    // 上传文档到知识库
    if (request.action === 'uploadDocument') {
        (async () => {
            console.log('开始处理文档上传请求...');
            try {
                const formData = new FormData();
                const { name, type, data } = request.content;
                
                console.log('准备上传文件:', { name, type });
                console.log('数据类型:', typeof data);
                console.log('数据长度:', Array.isArray(data) ? data.length : (data instanceof ArrayBuffer ? data.byteLength : data.length));
                
                let blob;
                if (type === 'application/pdf') {
                    // 如果是PDF文件，从数组创建blob
                    console.log('处理PDF文件...');
                    const uint8Array = new Uint8Array(data);
                    blob = new Blob([uint8Array], { type: 'application/pdf' });
                } else {
                    // 如果是文本文件，直接创建blob
                    console.log('处理文本文件...');
                    // 确保data是字符串
                    const textData = typeof data === 'string' ? data : 
                                   data instanceof ArrayBuffer ? new TextDecoder().decode(data) :
                                   Array.isArray(data) ? new TextDecoder().decode(new Uint8Array(data).buffer) :
                                   String(data);
                    console.log('文本内容预览:', textData.substring(0, 200) + '...');
                    blob = new Blob([textData], { type: 'text/plain;charset=UTF-8' });
                }
                
                console.log('创建的Blob大小:', blob.size);
                formData.append('file', blob, name);

                console.log('准备发送请求到:', `${API_BASE_URL}/datasets/${request.datasetId}/documents`);
                const response = await fetch(`${API_BASE_URL}/datasets/${request.datasetId}/documents`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`
                    },
                    body: formData
                });

                console.log('服务器响应状态:', response.status);
                const result = await response.json();
                console.log('服务器响应内容:', result);

                if (result.code === 0) {
                    // 如果上传成功，立即开始解析文档
                    const parseResponse = await fetch(`${API_BASE_URL}/datasets/${request.datasetId}/chunks`, {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify({
                            document_ids: [result.data[0].id]
                        })
                    });
                    
                    const parseResult = await parseResponse.json();
                    if (parseResult.code === 0) {
                        sendResponse({ success: true });
                    } else {
                        sendResponse({ success: false, error: parseResult.message });
                    }
                } else {
                    sendResponse({ success: false, error: result.message });
                }
            } catch (error) {
                console.error('文档上传失败:', error);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true;
    }

    // 获取知识库中的文档列表
    if (request.action === 'getDocuments') {
        fetch(`${API_BASE_URL}/datasets/${request.datasetId}/documents`, {
            method: 'GET',
            headers: headers
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 0) {
                sendResponse({ success: true, data: data.data });
            } else {
                sendResponse({ success: false, error: data.message });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }

    // 删除文档
    if (request.action === 'deleteDocuments') {
        fetch(`${API_BASE_URL}/datasets/${request.datasetId}/documents`, {
            method: 'DELETE',
            headers: headers,
            body: JSON.stringify({ ids: request.documentIds })
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 0) {
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: data.message });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }

    // 处理摘要请求
    if (request.action === 'summarize') {
        fetch(`${API_BASE_URL}/summarize`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ text: request.text })
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 0) {
                sendResponse({ success: true, summary: data.data.summary });
            } else {
                sendResponse({ success: false, error: data.message });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }
    
    // 处理翻译请求
    if (request.action === 'translate') {
        fetch(`${API_BASE_URL}/translate`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ text: request.text })
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 0) {
                sendResponse({ success: true, translation: data.data.translation });
            } else {
                sendResponse({ success: false, error: data.message });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }

    // 处理聊天请求
    if (request.action === 'chat') {
        (async () => {
            try {
                let messages = request.messages;
                const context = request.context;
                const agentId = request.agentId;
                const sessionId = request.sessionId;

                if (agentId) {
                    console.log('使用 Agent 进行对话:', agentId);
                    // 只在没有 sessionId 时创建新会话
                    let currentSessionId = sessionId;
                    
                    try {
                        if (!currentSessionId) {
                            console.log('创建新会话...');
                            const sessionResponse = await fetch(`${API_BASE_URL}/agents/${agentId}/sessions`, {
                                method: 'POST',
                                headers: headers,
                                body: JSON.stringify({})
                            });

                            if (!sessionResponse.ok) {
                                const errorText = await sessionResponse.text();
                                console.error('会话创建错误:', errorText);
                                throw new Error(`创建会话失败: ${sessionResponse.status} - ${errorText}`);
                            }

                            const sessionData = await sessionResponse.json();
                            console.log('会话创建响应:', sessionData);
                            if (sessionData.code === 0) {
                                currentSessionId = sessionData.data.id;
                                console.log('新会话 ID:', currentSessionId);
                            } else {
                                throw new Error('创建会话失败: ' + sessionData.message);
                            }
                        } else {
                            console.log('使用现有会话:', currentSessionId);
                        }

                        // 获取最后一条用户消息作为问题
                        const lastUserMessage = messages.filter(m => m.role === 'user').pop();
                        if (!lastUserMessage) {
                            throw new Error('未找到用户问题');
                        }

                        console.log('发送消息到 Agent:', {
                            sessionId: currentSessionId,
                            question: lastUserMessage.content,
                            context: context || ''
                        });

                        // 构建请求体
                        const requestBody = {
                            session_id: currentSessionId,
                            question: lastUserMessage.content,
                            context: context || '',
                            stream: false
                        };

                        // 使用 Agent 进行对话
                        const response = await fetch(`${API_BASE_URL}/agents/${agentId}/completions`, {
                            method: 'POST',
                            headers: headers,
                            body: JSON.stringify(requestBody)
                        });

                        if (!response.ok) {
                            const errorText = await response.text();
                            console.error('Agent API 错误:', errorText);
                            throw new Error(`Agent 请求失败: ${response.status} - ${errorText}`);
                        }

                        const result = await response.json();
                        console.log('Agent 响应:', result);
                        if (result.code === 0) {
                            sendResponse({ 
                                success: true, 
                                message: result.data.answer,
                                sessionId: currentSessionId
                            });
                        } else {
                            throw new Error(result.message || '请求失败');
                        }
                    } catch (error) {
                        console.error('Agent 对话错误:', error);
                        sendResponse({ 
                            success: false, 
                            error: error.message 
                        });
                    }
                } else {
                    console.log('使用 Qwen 进行对话');
                    // 使用 Qwen 进行对话
                    if (context) {
                        messages = [{
                            role: 'system',
                            content: `以下是当前网页的内容，请基于这些信息回答用户的问题：\n\n${context}`
                        }, ...messages];
                    }

                    console.log('发送到 Ollama 的消息:', messages);
                    try {
                        const response = await fetch(`${QWEN_API_URL}/chat`, {
                            method: 'POST',
                            headers: qwenHeaders,
                            mode: 'cors',
                            credentials: 'omit',
                            body: JSON.stringify({
                                model: 'qwen2.5:32b',
                                messages: messages.map(msg => ({
                                    role: msg.role === 'user' ? 'user' : 'assistant',
                                    content: msg.content
                                })),
                                stream: false,
                                format: 'json'
                            })
                        });

                        if (!response.ok) {
                            const errorText = await response.text();
                            console.error('Ollama API 错误:', errorText);
                            throw new Error(`Ollama 请求失败: ${response.status} - ${errorText}`);
                        }

                        const result = await response.json();
                        console.log('Ollama 响应:', result);
                        if (result.message && result.message.content) {
                            sendResponse({ 
                                success: true, 
                                message: result.message.content 
                            });
                        } else {
                            console.error('无效的响应格式:', result);
                            throw new Error('无法获取有效回复');
                        }
                    } catch (error) {
                        console.error('Ollama 请求错误:', error);
                        sendResponse({ 
                            success: false, 
                            error: error.message 
                        });
                    }
                }
            } catch (error) {
                console.error('Chat error:', error);
                sendResponse({ 
                    success: false, 
                    error: error.message 
                });
            }
        })();
        return true;
    }

    // 调用 Agent
    if (request.action === 'callAgent') {
        (async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/agent/${request.agentId}/chat`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        messages: request.messages,
                        context: request.context,
                        stream: false
                    })
                });

                const result = await response.json();
                if (result.code === 0) {
                    sendResponse({ 
                        success: true, 
                        message: result.data.answer 
                    });
                } else {
                    sendResponse({ 
                        success: false, 
                        error: result.message 
                    });
                }
            } catch (error) {
                console.error('Agent call error:', error);
                sendResponse({ 
                    success: false, 
                    error: error.message 
                });
            }
        })();
        return true;
    }
});

// 提取 PDF 元数据
async function extractMetadata(pdf) {
    try {
        const info = await pdf.getMetadata();
        const metadata = {
            '标题': info.info.Title || '未知',
            '作者': info.info.Author || '未知',
            '创建日期': formatDate(info.info.CreationDate),
            '修改日期': formatDate(info.info.ModDate),
            '页数': pdf.numPages,
            '生产者': info.info.Producer || '未知',
            '创建工具': info.info.Creator || '未知'
        };
        return metadata;
    } catch (error) {
        console.warn('获取元数据失败:', error);
        return {
            '页数': pdf.numPages,
            '注意': '无法获取完整元数据'
        };
    }
}

// 格式化日期
function formatDate(pdfDate) {
    if (!pdfDate) return '未知';
    
    try {
        const match = pdfDate.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
        if (match) {
            const [_, year, month, day, hour, minute, second] = match;
            return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
        }
    } catch (error) {
        console.warn('日期格式化失败:', error);
    }
    return pdfDate;
} 