import { apiClient } from '../core/api.js';

document.addEventListener('DOMContentLoaded', function() {
    // 获取所有DOM元素
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const btnSummarize = document.getElementById('btnSummarize');
    const btnTranslate = document.getElementById('btnTranslate');
    const btnAsk = document.getElementById('btnAsk');
    const btnAddToKB = document.getElementById('btnAddToKB');
    const btnDeleteFromKB = document.getElementById('btnDeleteFromKB');
    const output = document.getElementById('output');
    const qaInput = document.getElementById('qaInput');
    const qaMessages = document.getElementById('qaMessages');
    const kbTree = document.getElementById('kbTree');
    const kbDocs = document.getElementById('kbDocs');
    const btnCreateDataset = document.getElementById('btnCreateDataset');
    const btnDeleteDataset = document.getElementById('btnDeleteDataset');
    const btnRefresh = document.getElementById('btnRefresh');
    const agentSelector = document.getElementById('agentSelector');
    const btnToggleContext = document.getElementById('btnToggleContext');

    let currentDatasetId = '';
    let refreshInterval;
    let chatHistory = [];
    let currentAgentId = null;
    let currentSessionId = null;
    let selectedDataset = null;
    let selectedDocuments = new Set();
    let usePageContext = false;
    let currentPageContent = null;

    // 初始化标签页切换
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // 移除其他标签页的激活状态
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // 激活当前标签页
            tab.classList.add('active');
            const tabId = tab.dataset.tab;
            document.getElementById(tabId).classList.add('active');

            // 如果切换到知识库标签，刷新知识库列表
            if (tabId === 'knowledge') {
                loadDatasets();
                // 启动自动刷新
                startAutoRefresh();
            } else {
                // 停止自动刷新
                stopAutoRefresh();
            }
        });
    });

    // 启动自动刷新
    function startAutoRefresh() {
        // 清除可能存在的旧定时器
        stopAutoRefresh();
        // 每30秒刷新一次
        refreshInterval = setInterval(() => {
            if (currentDatasetId) {
                loadDocuments(currentDatasetId);
            } else {
                loadDatasets();
            }
        }, 30000);
    }

    // 停止自动刷新
    function stopAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }

    // 更新输出区域的函数
    function updateOutput(text, isError = false) {
        output.textContent = text;
        output.style.color = isError ? '#dc3545' : '#666';
    }

    // 获取当前标签页选中的文本
    async function getSelectedText() {
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            const [{result}] = await chrome.scripting.executeScript({
                target: {tabId: tab.id},
                function: () => window.getSelection().toString().trim()
            });
            return result;
        } catch (error) {
            console.error('获取选中文本失败:', error);
            return '';
        }
    }

    // 获取当前页面内容
    async function getCurrentPageContent() {
        try {
            // 通过 chrome.tabs API 获取当前页面内容
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return null;
            
            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    // 获取页面主要内容
                    const content = document.body.innerText;
                    // 获取页面标题
                    const title = document.title;
                    // 获取页面 URL
                    const url = window.location.href;
                    return { title, url, content };
                }
            });
            
            return result[0].result;
        } catch (error) {
            console.error('获取页面内容失败:', error);
            return null;
        }
    }

    // 添加消息到对话区域
    function addMessage(content, isUser = false, modelType = null, thinking = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
        if (usePageContext) {
            messageDiv.classList.add('context-active');
        }

        // 添加消息头部
        const headerDiv = document.createElement('div');
        headerDiv.className = 'message-header';
        headerDiv.innerHTML = `
            <span class="message-role">${isUser ? '用户' : '助手'}</span>
            <span class="message-time">${new Date().toLocaleTimeString()}</span>
        `;
        messageDiv.appendChild(headerDiv);

        // 添加消息内容
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        messageDiv.appendChild(contentDiv);

        // 如果有思维链，添加思维链内容
        if (thinking) {
            const thinkingDiv = document.createElement('div');
            thinkingDiv.className = 'message-thinking';
            thinkingDiv.textContent = thinking;
            messageDiv.appendChild(thinkingDiv);
        }

        // 添加元数据（仅对助手消息）
        if (!isUser && modelType) {
            const metaDiv = document.createElement('div');
            metaDiv.className = 'message-meta';
            metaDiv.innerHTML = `
                <span class="message-model">模型：${modelType}</span>
                ${usePageContext ? '<span class="context-info">使用页面上下文</span>' : ''}
            `;
            messageDiv.appendChild(metaDiv);
        }

        qaMessages.appendChild(messageDiv);
        qaMessages.scrollTop = qaMessages.scrollHeight;
    }

    // 摘要功能
    if (btnSummarize) {
        btnSummarize.addEventListener('click', async () => {
            try {
                const text = await getSelectedText();
                if (!text) {
                    updateOutput('请先选择要摘要的文本', true);
                    return;
                }

                updateOutput('正在生成摘要...');
                const response = await apiClient.summarize(text);
                updateOutput(response.summary);
            } catch (error) {
                updateOutput('生成摘要失败: ' + error.message, true);
            }
        });
    }

    // 翻译功能
    if (btnTranslate) {
        btnTranslate.addEventListener('click', async () => {
            try {
                const text = await getSelectedText();
                if (!text) {
                    updateOutput('请先选择要翻译的文本', true);
                    return;
                }

                updateOutput('正在翻译...');
                const response = await apiClient.translate(text);
                updateOutput(response.translation);
            } catch (error) {
                updateOutput('翻译失败: ' + error.message, true);
            }
        });
    }

    // 聊天功能
    if (btnAsk) {
        btnAsk.addEventListener('click', async () => {
            const question = qaInput.value.trim();
            if (!question) return;

            try {
                // 添加用户问题
                addMessage(question, true);
                qaInput.value = '';

                // 准备上下文
                let context = null;
                if (usePageContext && currentPageContent) {
                    context = {
                        title: currentPageContent.title,
                        url: currentPageContent.url,
                        content: currentPageContent.content
                    };
                }

                // 发送到后端
                const response = await apiClient.chat(
                    [{ role: 'user', content: question }],
                    context,
                    agentSelector.value
                );
                
                // 添加助手回答，包括思维链（如果有）
                addMessage(
                    response.message.content,
                    false,
                    agentSelector.options[agentSelector.selectedIndex].text,
                    response.thinking || null
                );
            } catch (error) {
                addMessage('发送失败: ' + error.message, false);
            }
        });

        // 回车发送
        qaInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                btnAsk.click();
            }
        });
    }

    // 初始化知识库管理
    function loadDatasets() {
        refreshDatasets();
    }

    // 刷新知识库列表
    async function refreshDatasets() {
        try {
            const response = await apiClient.getDatasets();
            renderDatasets(response.data);
        } catch (error) {
            console.error('获取知识库列表失败:', error);
        }
    }

    // 渲染知识库列表
    function renderDatasets(datasets) {
        if (!kbTree) return;
        
        kbTree.innerHTML = datasets.map(dataset => `
            <div class="tree-item" data-id="${dataset.id}">
                <div class="dataset-info">
                    <div class="dataset-name">${dataset.name}</div>
                    <div class="dataset-meta">${dataset.document_count} 个文档</div>
                </div>
            </div>
        `).join('');

        // 绑定点击事件
        kbTree.querySelectorAll('.tree-item').forEach(item => {
            item.addEventListener('click', () => selectDataset(item.dataset.id));
        });
    }

    // 选择知识库
    async function selectDataset(datasetId) {
        try {
            selectedDataset = datasetId;
            const response = await apiClient.getDocuments(datasetId);
            renderDocuments(response.data);

            // 更新选中状态
            kbTree.querySelectorAll('.tree-item').forEach(item => {
                item.classList.toggle('selected', item.dataset.id === datasetId);
            });
        } catch (error) {
            console.error('获取文档列表失败:', error);
        }
    }

    // 渲染文档列表
    function renderDocuments(documents) {
        if (!kbDocs) return;
        
        kbDocs.innerHTML = documents.map(doc => `
            <div class="doc-item" data-id="${doc.id}">
                <div class="doc-info">
                    <div class="doc-name">${doc.title}</div>
                    <div class="doc-meta">${doc.created_at}</div>
                </div>
                <div class="doc-status ${doc.status === 'pending' ? 'pending' : ''}">${
                    doc.status === 'pending' ? '处理中' : '已完成'
                }</div>
            </div>
        `).join('');

        // 绑定点击事件
        kbDocs.querySelectorAll('.doc-item').forEach(item => {
            item.addEventListener('click', () => {
                item.classList.toggle('selected');
                const docId = item.dataset.id;
                if (item.classList.contains('selected')) {
                    selectedDocuments.add(docId);
                } else {
                    selectedDocuments.delete(docId);
                }
            });
        });
    }

    // 创建知识库
    btnCreateDataset.addEventListener('click', async () => {
        const name = prompt('请输入知识库名称:');
        if (!name) return;

        try {
            await apiClient.createDataset({ name });
            loadDatasets();
        } catch (error) {
            console.error('创建知识库失败:', error);
        }
    });

    // 删除知识库
    btnDeleteDataset.addEventListener('click', async () => {
        if (!selectedDataset) {
            alert('请先选择要删除的知识库');
            return;
        }

        if (!confirm('确定要删除选中的知识库吗？')) return;

        try {
            await apiClient.deleteDataset([selectedDataset]);
            selectedDataset = null;
            loadDatasets();
        } catch (error) {
            console.error('删除知识库失败:', error);
        }
    });

    // 添加当前页面到知识库
    btnAddToKB.addEventListener('click', async () => {
        if (!selectedDataset) {
            alert('请先选择要添加到的知识库');
            return;
        }

        try {
            const content = await getCurrentPageContent();
            if (!content) {
                alert('无法获取页面内容');
                return;
            }

            await apiClient.uploadDocument(selectedDataset, content);
            selectDataset(selectedDataset);
        } catch (error) {
            console.error('添加文档失败:', error);
        }
    });

    // 删除选中文档
    btnDeleteFromKB.addEventListener('click', async () => {
        if (!selectedDataset || selectedDocuments.size === 0) {
            alert('请先选择要删除的文档');
            return;
        }

        if (!confirm(`确定要删除选中的 ${selectedDocuments.size} 个文档吗？`)) return;

        try {
            await apiClient.deleteDocuments(selectedDataset, Array.from(selectedDocuments));
            selectedDocuments.clear();
            selectDataset(selectedDataset);
        } catch (error) {
            console.error('删除文档失败:', error);
        }
    });

    // 刷新按钮
    btnRefresh.addEventListener('click', refreshDatasets);

    // 初始化工具箱
    const toolContent = document.getElementById('toolContent');

    // 加载工具
    async function loadTool(toolName) {
        try {
            const toolContainer = document.getElementById('toolContainer');
            toolContainer.innerHTML = '';

            switch (toolName) {
                case 'pdf':
                    const { PDFTool } = await import('./tools/pdf/ui.js');
                    new PDFTool(toolContainer);
                    break;
                // ... 其他工具的处理 ...
            }
        } catch (error) {
            console.error('加载 PDF 工具失败:', error);
        }
    }

    // 工具选择
    document.querySelectorAll('.tool-item').forEach(item => {
        item.addEventListener('click', () => {
            const toolName = item.dataset.tool;
            loadTool(toolName);
        });
    });

    // 初始化
    loadDatasets();
    loadAgents();  // 初始化 Agent 列表

    // 加载 Agent 列表
    function loadAgents() {
        console.log('开始加载 Agent 列表...');
        
        // 直接设置固定的选项
        agentSelector.innerHTML = `
            <option value="ollama">本地 Qwen2.5 (Ollama)</option>
            <option value="gpt4">OpenAI GPT-4</option>
            <option value="deepseek-v3">DeepSeek V3</option>
            <option value="deepseek-r1">DeepSeek R1</option>
            <option value="macstudio-qwen">MacStudio Qwen2.5</option>
        `;
        
        console.log('Agent 列表加载完成');
    }

    // 监听 Agent 选择框点击事件
    agentSelector.addEventListener('click', function() {
        if (this.options.length <= 1) { // 只有默认选项时才刷新
            loadAgents();
        }
    });

    // 监听 Agent 选择变化
    agentSelector.addEventListener('change', function() {
        console.log('Agent 选择变更为:', this.value);
        currentAgentId = this.value;
        
        // 清空聊天记录
        chatHistory = [];
        qaMessages.innerHTML = '';
        
        // 添加欢迎消息
        addMessage('已切换到 ' + this.options[this.selectedIndex].text + '，有什么我可以帮你的吗？', false);
    });

    // 修改发送消息的函数
    async function sendMessage(message) {
        addMessage(message, 'user');
        chatHistory.push({ role: 'user', content: message });

        try {
            const response = await new Promise((resolve, reject) => {
                apiClient.chat([{ role: 'user', content: message }], currentContext, agentSelector.value).then(res => {
                    if (res.success) {
                        resolve(res.message.content);
                    } else {
                        reject(new Error(res.error || '未知错误'));
                    }
                }).catch(reject);
            });

            if (response) {
                addMessage(response, false);
            } else {
                throw new Error('未知错误');
            }
        } catch (error) {
            console.error('发送消息失败:', error);
            addMessage('发送消息失败：' + error.message, false);
        }
    }

    // 工具箱相关逻辑
    const toolsContainer = document.querySelector('.tools-grid');

    // 工具项点击事件
    toolsContainer.addEventListener('click', async (e) => {
        const toolItem = e.target.closest('.tool-item');
        if (!toolItem) return;

        // 移除其他工具项的选中状态
        document.querySelectorAll('.tool-item').forEach(item => {
            item.classList.remove('active');
        });
        toolItem.classList.add('active');

        const toolType = toolItem.dataset.tool;
        if (toolType === 'pdf') {
            import('./tools/pdf/ui.js').then(module => {
                const PdfToolUI = module.PdfToolUI;
                const pdfTool = new PdfToolUI();
                toolContent.innerHTML = pdfTool.initialize();
                pdfTool.bindEvents();
            }).catch(error => {
                console.error('加载 PDF 工具失败:', error);
                toolContent.innerHTML = '<div class="error">加载 PDF 工具失败</div>';
            });
        }
    });

    // 初始化上下文按钮状态
    if (btnToggleContext) {
        btnToggleContext.innerHTML = `
            <i class="fas fa-file-import"></i>
            使用当前页面作为上下文
        `;
        btnToggleContext.classList.remove('active');

        // 切换上下文按钮
        btnToggleContext.addEventListener('click', async () => {
            usePageContext = !usePageContext;
            btnToggleContext.classList.toggle('active', usePageContext);
            
            if (usePageContext && !currentPageContent) {
                currentPageContent = await getCurrentPageContent();
                if (currentPageContent) {
                    addMessage(
                        `已设置对话背景：\n标题：${currentPageContent.title}\n地址：${currentPageContent.url}`,
                        false,
                        '系统'
                    );
                    btnToggleContext.innerHTML = `
                        <i class="fas fa-check"></i>
                        使用当前页面作为上下文
                    `;
                } else {
                    usePageContext = false;
                    btnToggleContext.classList.remove('active');
                    addMessage('无法获取页面内容，已关闭上下文模式。', false, '系统');
                    btnToggleContext.innerHTML = `
                        <i class="fas fa-file-import"></i>
                        使用当前页面作为上下文
                    `;
                }
            } else if (!usePageContext) {
                btnToggleContext.innerHTML = `
                    <i class="fas fa-file-import"></i>
                    使用当前页面作为上下文
                `;
                currentPageContent = null;
            }
        });
    }
}); 