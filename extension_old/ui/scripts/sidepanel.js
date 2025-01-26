import { openWebUI } from '../../core/openwebui-api.js';
import { logger } from '../../core/logger.js';

// 配置
const CONFIG = {
    IFRAME_TIMEOUT: 60000,
    RAGFLOW_ENABLED: true,
    API_KEY: 'ragflow-RkOWJkMGYyZDFhZTExZWZhYmRmMDI0Mm',
    RAG_URL: "http://172.19.12.146:8888/chat",
    LOCAL_URL: "http://localhost:3000"
};

// 状态管理
const state = {
    files: [],
    isInitialized: false,
    isLoading: false,
    activeTab: 'assistant',  // 默认选中RAG助手
    ragSessionId: null  // 添加会话ID状态
};

// DOM 元素缓存
const elements = {
    // 选项卡元素
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    
    // RAG助手元素
    ragTab: document.getElementById('assistant'),
    ragBtn: document.querySelector('[data-tab="assistant"]'),
    ragIframe: document.getElementById('chatIframe'),
    ragLoadingIndicator: document.getElementById('ragLoadingIndicator'),
    uploadFileBtn: document.getElementById('uploadFileBtn'),
    addPageBtn: document.getElementById('addPageBtn'),
    newChatBtn: document.getElementById('newChatBtn'),
    tempKbFiles: document.getElementById('tempKbFiles'),
    
    // 本地助手元素
    localTab: document.getElementById('assistant-local'),
    localBtn: document.querySelector('[data-tab="assistant-local"]'),
    localIframe: document.getElementById('localChatIframe'),
    localLoadingIndicator: document.getElementById('localLoadingIndicator')
};

// 获取完整的RAG URL
function getFullRagUrl() {
    const params = new URLSearchParams({
        shared_id: 'e4021ad6d94911ef9e010242ac120005',
        from: 'agent',
        auth: CONFIG.API_KEY
    });
    return `${CONFIG.RAG_URL}?${params.toString()}`;
}

// 初始化
async function initialize() {
    if (state.isInitialized || state.isLoading) {
        logger.warn('初始化已在进行中或已完成');
        return;
    }
    
    state.isLoading = true;
    
    try {
        logger.info('开始初始化侧边栏...');
        
        // 1. 预处理 iframe
        prepareIframes();
        
        // 2. 加载API密钥
        const result = await chrome.storage.local.get(['openWebUIApiKey']);
        if (result.openWebUIApiKey) {
            CONFIG.API_KEY = result.openWebUIApiKey;
            openWebUI.setApiKey(CONFIG.API_KEY);
            logger.info('API密钥加载成功');
        }

        // 3. 初始化事件监听
        initTabSwitching();
        initFileUpload();
        logger.info('事件监听初始化完成');

        // 4. 设置默认选项卡
        await setActiveTab(state.activeTab, true);
        logger.info('默认选项卡设置完成');

        state.isInitialized = true;
        logger.info('侧边栏初始化完成');
    } catch (error) {
        logger.error('初始化失败:', error);
        showToast('初始化失败，请刷新页面重试', 'error');
    } finally {
        state.isLoading = false;
    }
}

// 预处理 iframe
function prepareIframes() {
    const { ragIframe, localIframe } = elements;
    
    // 处理 RAG iframe
    if (ragIframe) {
        // 移除现有的事件监听器
        const newRagIframe = ragIframe.cloneNode(true);
        ragIframe.parentNode.replaceChild(newRagIframe, ragIframe);
        elements.ragIframe = newRagIframe;
        
        // 设置初始状态
        newRagIframe.style.display = 'none';
        newRagIframe.removeAttribute('src');
    }
    
    // 处理本地 iframe
    if (localIframe) {
        // 移除现有的事件监听器
        const newLocalIframe = localIframe.cloneNode(true);
        localIframe.parentNode.replaceChild(newLocalIframe, localIframe);
        elements.localIframe = newLocalIframe;
        
        // 设置初始状态
        newLocalIframe.style.display = 'none';
        newLocalIframe.removeAttribute('src');
    }
}

// 选项卡切换初始化
function initTabSwitching() {
    elements.tabButtons.forEach(button => {
        button.addEventListener('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            const tabId = button.dataset.tab;
            if (!tabId || tabId === state.activeTab) return;
            
            await setActiveTab(tabId);
        });
    });
}

// 设置活动选项卡
async function setActiveTab(tabId, isInitialLoad = false) {
    if (state.isLoading && !isInitialLoad) {
        logger.warn('正在加载中，忽略选项卡切换请求');
        return;
    }
    
    logger.info(`切换到选项卡: ${tabId}, isInitialLoad: ${isInitialLoad}`);
    
    // 如果已经是当前选项卡且不是初始加载，则不做任何操作
    if (tabId === state.activeTab && !isInitialLoad) {
        logger.info('已经是当前选项卡，无需切换');
        return;
    }
    
    try {
        state.isLoading = true;
        
        // 更新状态
        const previousTab = state.activeTab;
        state.activeTab = tabId;
        
        // 更新UI
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        
        const selectedPane = document.getElementById(tabId);
        const selectedBtn = document.querySelector(`[data-tab="${tabId}"]`);
        
        if (selectedPane && selectedBtn) {
            selectedPane.classList.add('active');
            selectedBtn.classList.add('active');
            
            // 加载对应的iframe
            try {
                if (tabId === 'assistant-local') {
                    await loadLocalIframe();
                } else if (tabId === 'assistant' && CONFIG.RAGFLOW_ENABLED) {
                    await loadRagIframe();
                }
            } catch (error) {
                // 如果加载失败，回退到之前的选项卡
                logger.error('iframe加载失败，回退到之前的选项卡:', error);
                state.activeTab = previousTab;
                document.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.toggle('active', pane.id === previousTab);
                });
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.tab === previousTab);
                });
                throw error;
            }
        }
    } finally {
        state.isLoading = false;
    }
}

// 加载RAG iframe
async function loadRagIframe() {
    const { ragIframe, ragLoadingIndicator } = elements;
    if (!ragIframe || !ragLoadingIndicator) {
        logger.error('RAG iframe元素未找到');
        return;
    }
    
    try {
        logger.info('开始加载RAG iframe...');
        ragLoadingIndicator.style.display = 'flex';
        ragIframe.style.display = 'none';
        
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('RAG iframe加载超时'));
            }, CONFIG.IFRAME_TIMEOUT);
            
            const handleLoad = () => {
                clearTimeout(timeout);
                ragLoadingIndicator.style.display = 'none';
                ragIframe.style.display = 'block';
                ragIframe.removeEventListener('load', handleLoad);
                resolve();
            };
            
            const handleError = () => {
                clearTimeout(timeout);
                ragIframe.removeEventListener('error', handleError);
                reject(new Error('RAG iframe加载失败'));
            };
            
            ragIframe.addEventListener('load', handleLoad, { once: true });
            ragIframe.addEventListener('error', handleError, { once: true });
            
            // 使用 requestAnimationFrame 确保在下一帧设置 src
            requestAnimationFrame(() => {
                ragIframe.src = getFullRagUrl();
            });
        });
        
        logger.info('RAG iframe加载完成');
    } catch (error) {
        logger.error('RAG iframe加载错误:', error);
        ragLoadingIndicator.style.display = 'flex';
        ragLoadingIndicator.innerHTML = `
            <div style="text-align: center; color: var(--text-secondary);">
                <p>RAG服务加载失败</p>
                <p>${error.message}</p>
                <button onclick="retryLoadRagIframe()" 
                        style="margin-top: 10px; padding: 5px 10px;">
                    重试
                </button>
            </div>
        `;
        ragIframe.style.display = 'none';
        throw error;
    }
}

// 加载本地 iframe
async function loadLocalIframe() {
    const { localIframe, localLoadingIndicator } = elements;
    if (!localIframe || !localLoadingIndicator) {
        logger.error('本地iframe元素未找到');
        return;
    }
    
    try {
        logger.info('检查OpenWebUI服务状态...');
        const response = await fetch('http://localhost:3000/api/v1/health');
        if (!response.ok) throw new Error('OpenWebUI服务未响应');
        
        logger.info('开始加载本地iframe...');
        localLoadingIndicator.style.display = 'flex';
        localIframe.style.display = 'none';
        
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('本地iframe加载超时'));
            }, CONFIG.IFRAME_TIMEOUT);
            
            const handleLoad = () => {
                clearTimeout(timeout);
                localLoadingIndicator.style.display = 'none';
                localIframe.style.display = 'block';
                localIframe.removeEventListener('load', handleLoad);
                resolve();
            };
            
            const handleError = () => {
                clearTimeout(timeout);
                localIframe.removeEventListener('error', handleError);
                reject(new Error('本地iframe加载失败'));
            };
            
            localIframe.addEventListener('load', handleLoad, { once: true });
            localIframe.addEventListener('error', handleError, { once: true });
            
            // 使用 requestAnimationFrame 确保在下一帧设置 src
            requestAnimationFrame(() => {
                localIframe.src = CONFIG.LOCAL_URL;
            });
        });
        
        logger.info('本地iframe加载完成');
    } catch (error) {
        logger.error('本地iframe加载错误:', error);
        localLoadingIndicator.style.display = 'flex';
        localLoadingIndicator.innerHTML = `
            <div style="text-align: center; color: var(--text-secondary);">
                <p>OpenWebUI服务未启动</p>
                <p>请确保服务已启动并且可以访问</p>
                <button onclick="retryLoadLocalIframe()" 
                        style="margin-top: 10px; padding: 5px 10px;">
                    重试
                </button>
            </div>
        `;
        localIframe.style.display = 'none';
        throw error;
    }
}

// 文件上传初始化
function initFileUpload() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '.txt,.pdf,.doc,.docx';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    fileInput.addEventListener('change', async (e) => {
        if (!e.target.files?.length) return;
        
        const files = Array.from(e.target.files);
        for (const file of files) {
            await handleFileUpload(file);
        }
        fileInput.value = '';
    });

    elements.uploadFileBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
    });
}

// 处理文件上传
async function handleFileUpload(file) {
    const btn = document.activeElement;
    const originalText = btn?.innerHTML;
    
    try {
        logger.info(`开始上传文件: ${file.name}`);
        if (btn) {
            btn.innerHTML = '<span class="icon">⏳</span>正在上传...';
            btn.disabled = true;
        }

        const result = await openWebUI.uploadFile(file);
        
        if (result.document_id) {
            addFileToList({
                id: result.document_id,
                name: file.name,
                type: file.type
            });
            
            logger.info(`文件上传成功: ${file.name}`);
            showToast('文件上传成功');
        }
    } catch (error) {
        logger.error('文件上传错误:', error);
        showToast(error.message || '文件上传失败', 'error');
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

// 添加文件到列表
function addFileToList(file) {
    state.files.push(file);
    renderFileList();
    logger.info(`文件添加到列表: ${file.name}`);
}

// 渲染文件列表
function renderFileList() {
    const fileList = elements.tempKbFiles;
    if (!fileList) return;
    
    fileList.innerHTML = state.files.map(file => `
        <div class="file-item" data-id="${file.id}">
            <span class="file-name">${file.name}</span>
            <button class="delete-btn" onclick="deleteFile('${file.id}')">
                <span class="icon">🗑️</span>
            </button>
        </div>
    `).join('');
}

// 删除文件
window.deleteFile = async function(fileId) {
    try {
        logger.info(`开始删除文件: ${fileId}`);
        await openWebUI.deleteFile(fileId);
        state.files = state.files.filter(f => f.id !== fileId);
        renderFileList();
        logger.info('文件删除成功');
        showToast('文件删除成功');
    } catch (error) {
        logger.error('文件删除错误:', error);
        showToast('文件删除失败', 'error');
    }
};

// 重试加载本地iframe
window.retryLoadLocalIframe = () => loadLocalIframe();

// 重试加载RAG iframe
window.retryLoadRagIframe = () => {
    return loadRagIframe();
};

// 显示提示信息
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// 初始化文件列表管理器
const fileListManager = new FileListManager('tempKbFiles', {
    onDelete: async (fileId) => {
        try {
            await chrome.runtime.sendMessage({
                type: 'deleteFile',
                fileId: fileId
            });
        } catch (error) {
            console.error('删除文件失败:', error);
            // 可以添加错误提示UI
        }
    },
    onLock: (fileId, locked) => {
        // 发送消息到background更新文件锁定状态
        chrome.runtime.sendMessage({
            type: 'updateFileLock',
            fileId: fileId,
            locked: locked
        });
    }
});

// 初始化本地文件列表管理器
const localFileListManager = new FileListManager('localTempKbFiles', {
    onDelete: async (fileId) => {
        try {
            await chrome.runtime.sendMessage({
                type: 'deleteLocalFile',
                fileId: fileId
            });
        } catch (error) {
            console.error('删除本地文件失败:', error);
        }
    },
    onLock: (fileId, locked) => {
        chrome.runtime.sendMessage({
            type: 'updateLocalFileLock',
            fileId: fileId,
            locked: locked
        });
    }
});

// 监听文件列表更新事件
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'filesUpdated') {
        fileListManager.updateFiles(message.files);
    } else if (message.type === 'localFilesUpdated') {
        localFileListManager.updateFiles(message.files);
    }
});

// 初始化时获取文件列表
async function initializeFileLists() {
    try {
        // 获取RAG文件列表
        const response = await chrome.runtime.sendMessage({
            type: 'getFiles'
        });
        if (response.files) {
            fileListManager.updateFiles(response.files);
        }

        // 获取本地文件列表
        const localResponse = await chrome.runtime.sendMessage({
            type: 'getLocalFiles'
        });
        if (localResponse.files) {
            localFileListManager.updateFiles(localResponse.files);
        }
    } catch (error) {
        console.error('初始化文件列表失败:', error);
    }
}

// 处理文件上传
document.getElementById('uploadFileBtn').addEventListener('click', async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.txt,.docx';
    
    input.onchange = async (event) => {
        const files = event.target.files;
        if (files.length === 0) return;

        for (const file of files) {
            try {
                await chrome.runtime.sendMessage({
                    type: 'uploadFile',
                    file: file
                });
            } catch (error) {
                console.error('上传文件失败:', error);
            }
        }
    };

    input.click();
});

// 处理本地文件上传
document.getElementById('localUploadFileBtn').addEventListener('click', async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.txt,.docx';
    
    input.onchange = async (event) => {
        const files = event.target.files;
        if (files.length === 0) return;

        for (const file of files) {
            try {
                await chrome.runtime.sendMessage({
                    type: 'uploadLocalFile',
                    file: file
                });
            } catch (error) {
                console.error('上传本地文件失败:', error);
            }
        }
    };

    input.click();
});

// 处理添加当前页面内容
document.getElementById('addPageBtn').addEventListener('click', async () => {
    try {
        await chrome.runtime.sendMessage({
            type: 'addCurrentPage'
        });
    } catch (error) {
        console.error('添加页面内容失败:', error);
    }
});

// 处理添加当前页面到本地
document.getElementById('localAddPageBtn').addEventListener('click', async () => {
    try {
        await chrome.runtime.sendMessage({
            type: 'addCurrentPageLocal'
        });
    } catch (error) {
        console.error('添加页面内容到本地失败:', error);
    }
});

// 处理开启新对话
document.getElementById('newChatBtn').addEventListener('click', async () => {
    try {
        await chrome.runtime.sendMessage({
            type: 'startNewChat'
        });
    } catch (error) {
        console.error('开启新对话失败:', error);
    }
});

// 处理开启新本地对话
document.getElementById('localNewChatBtn').addEventListener('click', async () => {
    try {
        await chrome.runtime.sendMessage({
            type: 'startNewLocalChat'
        });
    } catch (error) {
        console.error('开启新本地对话失败:', error);
    }
});

// 初始化选项卡切换
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // 移除所有活动状态
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        // 添加当前选中项的活动状态
        button.classList.add('active');
        const tabId = button.dataset.tab;
        document.getElementById(tabId).classList.add('active');
    });
});

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initializeFileLists();
}); 