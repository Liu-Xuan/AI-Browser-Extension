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
    const btnUseContext = document.getElementById('btnUseContext');
    const agentSelector = document.getElementById('agentSelector');

    let currentDatasetId = '';
    let refreshInterval;
    let chatHistory = [];
    let currentContext = null;
    let currentAgentId = null;
    let currentSessionId = null;

    // 选项卡切换
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            
            // 更新选项卡状态
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
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

    // 更新输出内容的函数
    function updateOutput(text, isError = false) {
        output.textContent = text;
        output.className = isError ? 'error' : 'status';
    }

    // 获取当前标签页选中的文本
    async function getSelectedText() {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        const [{result}] = await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            function: () => window.getSelection().toString().trim()
        });
        return result;
    }

    // 获取当前页面内容
    async function getPageContent() {
        try {
            const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
            if (!tab) {
                throw new Error('无法获取当前标签页');
            }

            // 检查是否是PDF文件
            const url = tab.url || '';
            const isPDF = url.toLowerCase().includes('.pdf') || tab.title.toLowerCase().endsWith('.pdf');
            const isTDMS = url.toLowerCase().includes('tdms.airchina.com');

            if (isPDF) {
                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error('无法访问PDF文件');
                    }
                    const blob = await response.blob();
                    return {
                        title: tab.title || 'Untitled PDF',
                        url: url,
                        content: blob,
                        type: 'pdf'
                    };
                } catch (error) {
                    console.error('获取PDF文件失败:', error);
                    throw new Error('无法获取PDF文件内容');
                }
            }

            // 尝试获取页面内容
            try {
                const [{result}] = await chrome.scripting.executeScript({
                    target: {tabId: tab.id},
                    function: () => {
                        // 获取主要内容
                        let content;
                        
                        // 针对 Boeing 网站的特殊处理
                        if (window.location.href.includes('myboeingfleet.boeing.com')) {
                            // 尝试获取主要内容区域
                            const mainContent = document.querySelector('.main-content') || 
                                             document.querySelector('#main-content') ||
                                             document.querySelector('main');
                            
                            // 提取 SB 信息
                            const sbInfo = {
                                title: document.querySelector('h1')?.textContent || document.title,
                                subject: document.querySelector('.subject')?.textContent || '',
                                background: document.querySelector('.background')?.textContent || '',
                                economicInfo: document.querySelector('.economic')?.textContent || '',
                                warrantyInfo: document.querySelector('.warranty')?.textContent || ''
                            };

                            // 构建格式化的内容
                            const sections = [];
                            if (sbInfo.title) sections.push(`标题: ${sbInfo.title.trim()}`);
                            if (sbInfo.subject) sections.push(`主题: ${sbInfo.subject.trim()}`);
                            if (sbInfo.background) sections.push(`背景: ${sbInfo.background.trim()}`);
                            if (sbInfo.economicInfo) sections.push(`经济效益: ${sbInfo.economicInfo.trim()}`);
                            if (sbInfo.warrantyInfo) sections.push(`保修信息: ${sbInfo.warrantyInfo.trim()}`);

                            // 如果没有找到特定部分，使用主要内容
                            if (sections.length === 0 && mainContent) {
                                const cleanContent = mainContent.cloneNode(true);
                                cleanContent.querySelectorAll('script, style, link, meta, noscript, header, footer, nav').forEach(el => el.remove());
                                sections.push(cleanContent.innerText.trim());
                            }

                            return {
                                title: document.title,
                                url: window.location.href,
                                content: sections.join('\n\n'),
                                type: 'text'
                            };
                        }
                        
                        // 对于TDMS页面的特殊处理
                        if (window.location.href.includes('tdms.airchina.com')) {
                            const mainContent = document.querySelector('#ext-gen') || 
                                             document.querySelector('.x-panel-body');
                            if (mainContent) {
                                const cleanContent = mainContent.cloneNode(true);
                                cleanContent.querySelectorAll('script, style, link, meta, noscript').forEach(el => el.remove());
                                return {
                                    title: document.title,
                                    url: window.location.href,
                                    content: cleanContent.innerText.replace(/[\n\r]+/g, '\n').trim(),
                                    type: 'text'
                                };
                            }
                        }

                        // 默认内容提取逻辑
                        if (document.querySelector('article')) {
                            content = document.querySelector('article');
                        } else if (document.querySelector('main')) {
                            content = document.querySelector('main');
                        } else if (document.querySelector('.main-content')) {
                            content = document.querySelector('.main-content');
                        } else {
                            content = document.body;
                        }

                        // 移除无关元素
                        const cleanContent = content.cloneNode(true);
                        cleanContent.querySelectorAll('script, style, link, meta, noscript, header, footer, nav, .header, .footer, .nav, .menu, .sidebar, .advertisement').forEach(el => el.remove());

                        // 清理内容
                        let textContent = cleanContent.innerText
                            .replace(/[\n\r]+/g, '\n')  // 合并多个换行
                            .replace(/\s+/g, ' ')       // 合并多个空格
                            .replace(/\n\s+/g, '\n')    // 清理行首空格
                            .trim();                    // 清理首尾空格

                        // 如果内容太长，尝试提取主要部分
                        if (textContent.length > 10000) {
                            const paragraphs = textContent.split('\n');
                            // 保留有意义的段落
                            const mainParagraphs = paragraphs.filter(p => 
                                p.length > 50 && 
                                !p.includes('Copyright') && 
                                !p.includes('版权所有') &&
                                !p.includes('All Rights Reserved') &&
                                !p.includes('Terms of Use') &&
                                !p.includes('Privacy')
                            );
                            textContent = mainParagraphs.join('\n\n');
                        }

                        return {
                            title: document.title,
                            url: window.location.href,
                            content: textContent,
                            type: 'text'
                        };
                    }
                });
                return result;
            } catch (error) {
                console.error('获取页面内容失败:', error);
                // 如果无法执行脚本，返回基本信息
                return {
                    title: tab.title || 'Untitled Page',
                    url: url,
                    content: `无法获取页面内容。\n页面标题：${tab.title}\n页面地址：${url}`,
                    type: 'text'
                };
            }
        } catch (error) {
            console.error('获取内容失败:', error);
            throw new Error('无法获取页面内容：' + error.message);
        }
    }

    // 使用当前页面作为背景
    btnUseContext.addEventListener('click', async function() {
        try {
            const pageContent = await getPageContent();
            console.log('获取到页面内容:', pageContent);
            
            if (pageContent.type === 'text') {
                currentContext = pageContent.content;
                console.log('设置对话背景:', currentContext.substring(0, 100) + '...');
                
                // 清空之前的聊天历史
                chatHistory = [];
                
                // 清空消息显示区域
                qaMessages.innerHTML = '';
                
                // 添加系统消息
                addMessage('已加载当前页面作为对话背景。您可以开始提问了！', 'system');
                
                // 构建初始化消息
                const initialQuestion = `请对以下内容进行总结：\n\n${currentContext}`;
                
                // 根据当前选择的对话类型发送初始化消息
                if (currentAgentId) {
                    console.log('使用 Agent 进行初始化对话');
                    // 构建请求体
                    const requestBody = {
                        action: 'chat',
                        agentId: currentAgentId,
                        sessionId: currentSessionId, // 使用当前会话ID
                        messages: [{
                            role: 'user',
                            content: initialQuestion
                        }],
                        context: currentContext
                    };
                    
                    console.log('发送初始化消息:', requestBody);
                    
                    chrome.runtime.sendMessage(requestBody, function(response) {
                        console.log('收到初始化响应:', response);
                        if (response && response.success) {
                            addMessage(response.message);
                            if (response.sessionId) {
                                currentSessionId = response.sessionId;
                            }
                        } else {
                            const errorMessage = response ? response.error : '未知错误';
                            addMessage('初始化失败：' + errorMessage, 'system');
                        }
                    });
                } else {
                    console.log('使用 Qwen 进行初始化对话');
                    // 发送初始化消息
                    const initMessage = {
                        action: 'chat',
                        messages: [{
                            role: 'system',
                            content: `请基于以下内容回答用户的问题：\n\n${currentContext}`
                        }, {
                            role: 'user',
                            content: initialQuestion
                        }],
                        context: currentContext
                    };
                    
                    console.log('发送初始化消息:', initMessage);
                    
                    chrome.runtime.sendMessage(initMessage, function(response) {
                        console.log('收到初始化响应:', response);
                        if (response && response.success) {
                            addMessage(response.message);
                        } else {
                            const errorMessage = response ? response.error : '未知错误';
                            addMessage('初始化失败：' + errorMessage, 'system');
                        }
                    });
                }
            } else {
                alert('当前页面类型不支持作为对话背景');
            }
        } catch (error) {
            console.error('获取页面内容失败:', error);
            alert('获取页面内容失败: ' + error.message);
        }
    });

    // 添加消息到QA区域
    function addMessage(message, role = 'assistant') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        // 根据角色设置样式
        if (role === 'user') {
            messageDiv.style.marginLeft = 'auto';
            messageDiv.style.background = '#e3f2fd';
        } else if (role === 'system') {
            messageDiv.style.background = '#f5f5f5';
            messageDiv.style.color = '#666';
            messageDiv.style.fontSize = '0.9em';
        } else {
            messageDiv.style.background = '#f5f5f5';
        }
        
        messageDiv.style.padding = '10px';
        messageDiv.style.margin = '5px 0';
        messageDiv.style.borderRadius = '4px';
        messageDiv.style.maxWidth = '80%';
        
        messageDiv.textContent = message;
        qaMessages.appendChild(messageDiv);
        qaMessages.scrollTop = qaMessages.scrollHeight;

        // 保存到聊天历史
        if (role !== 'system') {
            chatHistory.push({
                role: role,
                content: message
            });
        }
    }

    // 摘要按钮点击事件
    btnSummarize.addEventListener('click', async function() {
        try {
            const selectedText = await getSelectedText();
            if (!selectedText) {
                updateOutput('请先选择要摘要的文本', true);
                return;
            }

            updateOutput('正在生成摘要...');
            chrome.runtime.sendMessage({
                action: 'summarize',
                text: selectedText
            }, function(response) {
                if (response.success && response.summary) {
                    updateOutput(response.summary);
                } else {
                    updateOutput(response.error || '生成摘要时出错，请重试', true);
                }
            });
        } catch (error) {
            updateOutput('操作失败：' + error.message, true);
        }
    });

    // 翻译按钮点击事件
    btnTranslate.addEventListener('click', async function() {
        try {
            const selectedText = await getSelectedText();
            if (!selectedText) {
                updateOutput('请先选择要翻译的文本', true);
                return;
            }

            updateOutput('正在翻译...');
            chrome.runtime.sendMessage({
                action: 'translate',
                text: selectedText
            }, function(response) {
                if (response.success && response.translation) {
                    updateOutput(response.translation);
                } else {
                    updateOutput(response.error || '翻译时出错，请重试', true);
                }
            });
        } catch (error) {
            updateOutput('操作失败：' + error.message, true);
        }
    });

    // 问答输入处理
    btnAsk.addEventListener('click', async function() {
        const question = qaInput.value.trim();
        if (!question) return;

        // 添加用户问题
        addMessage(question, 'user');
        qaInput.value = '';

        // 添加等待消息
        const waitingMessage = document.createElement('div');
        waitingMessage.className = 'message system';
        waitingMessage.textContent = '正在思考...';
        waitingMessage.style.background = '#f5f5f5';
        waitingMessage.style.color = '#666';
        waitingMessage.style.padding = '10px';
        waitingMessage.style.margin = '5px 0';
        waitingMessage.style.borderRadius = '4px';
        qaMessages.appendChild(waitingMessage);

        try {
            console.log('发送聊天请求:', {
                messages: chatHistory,
                context: currentContext
            });

            const sendMessagePromise = new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'chat',
                    messages: chatHistory,
                    context: currentContext,
                    agentId: currentAgentId,
                    sessionId: currentSessionId
                }, function(response) {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    resolve(response);
                });
            });

            const response = await sendMessagePromise;
            console.log('收到聊天响应:', response);

            // 移除等待消息
            if (waitingMessage.parentNode) {
                qaMessages.removeChild(waitingMessage);
            }

            if (response && response.success) {
                addMessage(response.message);
            } else {
                const errorMessage = response ? response.error : '未知错误';
                addMessage('抱歉，出现错误：' + errorMessage, 'system');
            }
        } catch (error) {
            console.error('聊天请求失败:', error);
            // 移除等待消息
            if (waitingMessage.parentNode) {
                qaMessages.removeChild(waitingMessage);
            }
            addMessage('发生错误：' + error.message, 'system');
        }
    });

    // 回车发送问题
    qaInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            btnAsk.click();
        }
    });

    // 加载知识库列表
    function loadDatasets() {
        chrome.runtime.sendMessage({
            action: 'getDatasets'
        }, function(response) {
            if (response.success) {
                kbTree.innerHTML = '';
                response.data.forEach(dataset => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'tree-item';
                    itemDiv.dataset.id = dataset.id;
                    
                    itemDiv.innerHTML = `
                        <div class="dataset-info">
                            <div class="dataset-name">${dataset.name}</div>
                            <div class="dataset-meta">${dataset.document_count}个文档</div>
                        </div>
                    `;

                    // 点击知识库时加载其文档
                    itemDiv.addEventListener('click', function() {
                        const prevSelected = kbTree.querySelector('.selected');
                        if (prevSelected) {
                            prevSelected.classList.remove('selected');
                        }
                        this.classList.add('selected');
                        currentDatasetId = this.dataset.id;
                        loadDocuments(currentDatasetId);
                    });

                    kbTree.appendChild(itemDiv);

                    // 如果是之前选中的知识库，自动选中并加载文档
                    if (dataset.id === currentDatasetId) {
                        itemDiv.classList.add('selected');
                        loadDocuments(currentDatasetId);
                    }
                });

                if (kbTree.children.length === 0) {
                    kbTree.innerHTML = '<div class="tree-item">暂无知识库</div>';
                }
            } else {
                alert('加载知识库列表失败：' + (response.error || '未知错误'));
            }
        });
    }

    // 加载文档列表
    function loadDocuments(datasetId) {
        if (!datasetId) {
            kbDocs.innerHTML = '<div class="doc-item">请先选择知识库</div>';
            return;
        }

        chrome.runtime.sendMessage({
            action: 'getDocuments',
            datasetId: datasetId
        }, function(response) {
            if (response.success) {
                renderDocumentList(response.data.docs);
            } else {
                alert('加载文档列表失败：' + (response.error || '未知错误'));
            }
        });
    }

    // 渲染文档列表
    function renderDocumentList(documents) {
        kbDocs.innerHTML = '';
        if (!documents || documents.length === 0) {
            kbDocs.innerHTML = '<div class="doc-item">暂无文档</div>';
            return;
        }

        documents.forEach(doc => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'doc-item';
            itemDiv.dataset.id = doc.id;

            // 获取文档状态
            let statusClass = '';
            let statusText = '';
            
            // 如果没有run字段或run字段为null，说明文档已经处理完成
            if (!doc.run) {
                statusClass = '';
                statusText = '已完成';
            } else if (doc.run === 0 || doc.run === '0') {
                statusClass = 'pending';
                statusText = '待处理';
            } else if (doc.run === 1 || doc.run === '1') {
                statusClass = 'pending';
                statusText = '处理中';
            }

            itemDiv.innerHTML = `
                <div class="doc-info">
                    <div class="doc-name">${doc.name}</div>
                    ${statusText ? `<span class="doc-status ${statusClass}">${statusText}</span>` : ''}
                </div>
                <div class="doc-meta">
                    <span>大小: ${formatFileSize(doc.size)}</span>
                    <span>创建时间: ${formatDate(doc.create_date)}</span>
                </div>
            `;

            itemDiv.addEventListener('click', function() {
                this.classList.toggle('selected');
            });
            kbDocs.appendChild(itemDiv);
        });
    }

    // 创建知识库
    btnCreateDataset.addEventListener('click', function() {
        const name = prompt('请输入知识库名称：');
        if (!name) return;

        chrome.runtime.sendMessage({
            action: 'createDataset',
            data: {
                name: name,
                language: 'Chinese',
                embedding_model: 'BAAI/bge-large-zh-v1.5'
            }
        }, function(response) {
            if (response.success) {
                loadDatasets();
                alert('创建成功！');
            } else {
                alert('创建失败：' + (response.error || '未知错误'));
            }
        });
    });

    // 删除知识库
    btnDeleteDataset.addEventListener('click', function() {
        const selectedDataset = kbTree.querySelector('.tree-item.selected');
        if (!selectedDataset) {
            alert('请先选择要删除的知识库');
            return;
        }

        const datasetId = selectedDataset.dataset.id;
        if (confirm('确定要删除该知识库吗？此操作不可恢复！')) {
            chrome.runtime.sendMessage({
                action: 'deleteDataset',
                datasetIds: [datasetId]
            }, function(response) {
                if (response.success) {
                    currentDatasetId = '';
                    loadDatasets();
                    kbDocs.innerHTML = '';
                    alert('删除成功！');
                } else {
                    alert('删除失败：' + (response.error || '未知错误'));
                }
            });
        }
    });

    // 添加当前页面到知识库
    btnAddToKB.addEventListener('click', async function() {
        const selectedDataset = kbTree.querySelector('.tree-item.selected');
        if (!selectedDataset) {
            alert('请先选择知识库');
            return;
        }

        const datasetId = selectedDataset.dataset.id;
        try {
            console.log('开始获取页面内容...');
            const pageContent = await getPageContent();
            console.log('页面内容获取成功:', pageContent);
            
            if (pageContent.type === 'pdf') {
                console.log('处理PDF文件...');
                // 如果是PDF文件，转换为 ArrayBuffer
                const reader = new FileReader();
                reader.onload = function(e) {
                    const arrayBuffer = e.target.result;
                    const fileName = `${pageContent.title.replace(/[^\w\u4e00-\u9fa5]/g, '_')}.pdf`;
                    console.log('PDF文件名:', fileName);
                    
                    // 发送消息到background
                    chrome.runtime.sendMessage({
                        action: 'uploadDocument',
                        datasetId: datasetId,
                        content: {
                            name: fileName,
                            type: 'application/pdf',
                            data: Array.from(new Uint8Array(arrayBuffer))
                        }
                    }, function(response) {
                        console.log('上传响应:', response);
                        if (response && response.success) {
                            loadDocuments(datasetId);
                            alert('添加成功！');
                        } else {
                            alert('添加失败：' + (response?.error || '未知错误'));
                        }
                    });
                };
                reader.onerror = function(error) {
                    console.error('读取PDF文件失败:', error);
                    alert('读取PDF文件失败');
                };
                reader.readAsArrayBuffer(pageContent.content);
            } else {
                console.log('处理文本内容...');
                // 如果是普通文本，格式化内容
                let formattedContent;
                if (typeof pageContent.content === 'object') {
                    // 如果内容是对象，尝试提取有用的信息
                    formattedContent = Object.entries(pageContent.content)
                        .filter(([key, value]) => value && typeof value === 'string')
                        .map(([key, value]) => `${key}: ${value}`)
                        .join('\n');
                } else if (pageContent.content && typeof pageContent.content === 'string') {
                    formattedContent = pageContent.content;
                } else {
                    formattedContent = JSON.stringify(pageContent.content, null, 2);
                }

                // 如果内容是从 Boeing 网站获取的，保持原有格式
                if (pageContent.url.includes('myboeingfleet.boeing.com')) {
                    formattedContent = pageContent.content;
                }

                const textContent = `标题：${pageContent.title}\n` +
                                  `网址：${pageContent.url}\n` +
                                  `时间：${new Date().toLocaleString('zh-CN')}\n\n` +
                                  `${formattedContent}`;

                console.log('格式化后的内容:', textContent);
                const fileName = `${pageContent.title.replace(/[^\w\u4e00-\u9fa5]/g, '_')}.txt`;
                console.log('文本文件名:', fileName);
                
                // 直接发送文本内容
                chrome.runtime.sendMessage({
                    action: 'uploadDocument',
                    datasetId: datasetId,
                    content: {
                        name: fileName,
                        type: 'text/plain',
                        data: textContent  // 直接发送文本内容
                    }
                }, function(response) {
                    console.log('上传响应:', response);
                    if (response && response.success) {
                        loadDocuments(datasetId);
                        alert('添加成功！');
                    } else {
                        alert('添加失败：' + (response?.error || '未知错误'));
                    }
                });
            }
        } catch (error) {
            console.error('上传过程出错:', error);
            alert('操作失败：' + error.message);
        }
    });

    // 删除选中的文档
    btnDeleteFromKB.addEventListener('click', function() {
        const selectedDataset = kbTree.querySelector('.tree-item.selected');
        if (!selectedDataset) {
            alert('请先选择知识库');
            return;
        }

        const datasetId = selectedDataset.dataset.id;
        const selectedDocs = kbDocs.querySelectorAll('.doc-item.selected');
        if (selectedDocs.length === 0) {
            alert('请先选择要删除的文档');
            return;
        }

        if (confirm('确定要删除选中的文档吗？此操作不可恢复！')) {
            const documentIds = Array.from(selectedDocs).map(item => item.dataset.id);
            chrome.runtime.sendMessage({
                action: 'deleteDocuments',
                datasetId: datasetId,
                documentIds: documentIds
            }, function(response) {
                if (response.success) {
                    loadDocuments(datasetId);
                    alert('删除成功！');
                } else {
                    alert('删除失败：' + (response.error || '未知错误'));
                }
            });
        }
    });

    // 手动刷新按钮点击事件
    btnRefresh.addEventListener('click', function() {
        // 添加旋转动画
        const icon = this.querySelector('i');
        icon.style.transition = 'transform 0.5s';
        icon.style.transform = 'rotate(360deg)';
        
        // 根据当前状态刷新数据
        if (currentDatasetId) {
            loadDocuments(currentDatasetId);
        } else {
            loadDatasets();
        }

        // 动画结束后重置
        setTimeout(() => {
            icon.style.transition = 'none';
            icon.style.transform = 'rotate(0deg)';
        }, 500);
    });

    // 工具函数：格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 工具函数：格式化日期
    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // 加载 Agent 列表
    function loadAgents() {
        console.log('开始加载 Agent 列表...');
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: 'getAgents' }, function(response) {
                console.log('收到 Agent 列表响应:', response);
                
                if (chrome.runtime.lastError) {
                    console.error('加载 Agent 列表时发生错误:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                    return;
                }
                
                if (!response) {
                    console.error('未收到响应数据');
                    reject(new Error('未收到响应数据'));
                    return;
                }
                
                if (response.success && Array.isArray(response.agents)) {
                    const agents = response.agents;
                    console.log('获取到的 Agent 列表:', agents);
                    
                    // 清空现有选项
                    agentSelector.innerHTML = '<option value="">直接对话 (Qwen)</option>';
                    
                    // 添加 agent 选项
                    agents.forEach(agent => {
                        const option = document.createElement('option');
                        option.value = agent.id;
                        option.textContent = agent.name;  // 直接使用 name（已经是 title）
                        if (agent.description) {
                            option.title = agent.description;
                        }
                        agentSelector.appendChild(option);
                    });
                    console.log('Agent 列表加载完成');
                    resolve(agents);
                } else {
                    const errorMsg = response.error || '未知错误';
                    console.error('加载 Agent 列表失败:', errorMsg);
                    reject(new Error(errorMsg));
                }
            });
        }).catch(error => {
            console.error('Agent 列表加载失败:', error);
            // 显示错误信息给用户
            const errorOption = document.createElement('option');
            errorOption.value = '';
            errorOption.textContent = '加载失败，请重试';
            errorOption.disabled = true;
            agentSelector.innerHTML = '';
            agentSelector.appendChild(errorOption);
        });
    }

    // 监听 Agent 选择框点击事件，实现点击时刷新列表
    agentSelector.addEventListener('click', function() {
        if (this.options.length <= 1) { // 只有默认选项或者加载失败的选项时才刷新
            loadAgents();
        }
    });

    // 监听 Agent 选择变化
    agentSelector.addEventListener('change', function() {
        console.log('Agent 选择变更为:', this.value);
        currentAgentId = this.value;
        currentSessionId = null;  // 清除之前的会话 ID
        
        // 清空聊天记录
        chatHistory = [];
        qaMessages.innerHTML = '';
        
        // 如果选择了新的 agent，发送初始化消息
        if (currentAgentId) {
            console.log('初始化新选择的 Agent:', currentAgentId);
            const initMessage = {
                role: 'system',
                content: '你好，我是一个智能助手。请问有什么我可以帮你的吗？'
            };
            chatHistory.push(initMessage);
            addMessage(initMessage.content);
        }
    });

    // 修改发送消息的函数
    async function sendMessage(message) {
        addMessage(message, 'user');
        chatHistory.push({ role: 'user', content: message });

        try {
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'chat',
                    messages: chatHistory,
                    context: currentContext,
                    agentId: currentAgentId,
                    sessionId: currentSessionId
                }, function(response) {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });

            if (response.success) {
                const assistantMessage = response.message;
                // 保存新的会话 ID
                if (response.sessionId) {
                    currentSessionId = response.sessionId;
                }
                chatHistory.push({ role: 'assistant', content: assistantMessage });
                addMessage(assistantMessage);
            } else {
                console.error('Chat error:', response.error);
                addMessage('发生错误：' + response.error, 'system');
            }
        } catch (error) {
            console.error('发送消息失败:', error);
            addMessage('发送消息失败：' + error.message, 'system');
        }
    }

    // 初始化
    function initialize() {
        loadDatasets();
        startAutoRefresh();
        // 不在初始化时加载 Agent 列表，改为在点击选择框时加载
        agentSelector.innerHTML = '<option value="">直接对话 (Qwen)</option>';
    }

    // 初始化加载
    initialize();

    // 工具箱相关逻辑
    const toolsContainer = document.querySelector('.tools-grid');
    const toolContent = document.getElementById('toolContent');

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
}); 