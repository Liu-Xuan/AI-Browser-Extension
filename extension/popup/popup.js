// 存储文件列表的数据结构
let fileList = [];

// 显示提示消息
function showMessage(message, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isError ? 'error' : 'success'}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    // 3秒后自动消失
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 初始化按钮事件监听
    document.getElementById('uploadFile').addEventListener('click', handleFileUpload);
    document.getElementById('addCurrentPage').addEventListener('click', handleAddCurrentPage);
    document.getElementById('newChat').addEventListener('click', handleNewChat);

    // 从storage加载文件列表
    loadFileList();

    try {
        // 获取并设置正确的对话URL
        const response = await chrome.runtime.sendMessage({ type: 'getChatUrl' });
        if (response && response.url) {
            document.getElementById('ragflowChat').src = response.url;
        }
    } catch (error) {
        showMessage('加载对话界面失败，请刷新重试', true);
    }
});

// 处理文件上传
function handleFileUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.txt,.docx';
    input.multiple = true;

    input.onchange = async (event) => {
        const files = event.target.files;
        if (files.length === 0) return;

        for (const file of files) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                
                showMessage(`正在上传: ${file.name}...`);
                
                // 调用后台脚本上传文件
                const response = await chrome.runtime.sendMessage({
                    type: 'uploadFile',
                    data: formData
                });

                if (response.success) {
                    addFileToList({
                        id: response.fileId,
                        name: file.name,
                        locked: false
                    });
                    showMessage(`${file.name} 上传成功`);
                } else {
                    showMessage(`${file.name} 上传失败: ${response.error}`, true);
                }
            } catch (error) {
                showMessage(`${file.name} 上传失败: ${error.message}`, true);
                console.error('文件上传失败:', error);
            }
        }
    };

    input.click();
}

// 处理添加当前页面
async function handleAddCurrentPage() {
    try {
        showMessage('正在提取页面内容...');
        
        // 获取当前标签页信息
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // 注入content script
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/content.js']
        });
        
        // 发送消息给content script获取页面内容
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'getPageContent' });
        
        if (response && response.content) {
            showMessage('正在保存页面内容...');
            
            // 发送页面内容到后台进行处理
            const result = await chrome.runtime.sendMessage({
                type: 'addPageContent',
                data: {
                    title: tab.title,
                    url: tab.url,
                    content: response.content
                }
            });

            if (result.success) {
                addFileToList({
                    id: result.fileId,
                    name: tab.title,
                    locked: false
                });
                showMessage('页面内容已保存');
            } else {
                showMessage(`保存失败: ${result.error}`, true);
            }
        }
    } catch (error) {
        showMessage('添加页面失败，请刷新页面重试', true);
        console.error('添加页面失败:', error);
    }
}

// 处理开启新对话
async function handleNewChat() {
    try {
        // 获取未锁定的文件ID列表
        const unlockedFiles = fileList.filter(file => !file.locked).map(file => file.id);
        
        if (unlockedFiles.length === 0) {
            showMessage('没有需要清理的文件');
            return;
        }

        showMessage('正在清理未锁定的文件...');
        
        // 发送消息到后台删除未锁定的文件
        const response = await chrome.runtime.sendMessage({
            type: 'deleteFiles',
            data: { fileIds: unlockedFiles }
        });

        if (response.success) {
            // 从列表中移除已删除的文件
            fileList = fileList.filter(file => file.locked);
            updateFileListUI();
            
            // 刷新iframe
            const chatFrame = document.getElementById('ragflowChat');
            chatFrame.src = chatFrame.src;
            
            showMessage('已清理未锁定的文件，开始新对话');
        } else {
            showMessage('清理文件失败，请重试', true);
        }
    } catch (error) {
        showMessage('清理文件失败，请重试', true);
        console.error('清理文件失败:', error);
    }
}

// 添加文件到列表
function addFileToList(file) {
    fileList.push(file);
    updateFileListUI();
    saveFileList();
}

// 更新文件列表UI
function updateFileListUI() {
    const container = document.getElementById('fileListContainer');
    container.innerHTML = '';

    if (fileList.length === 0) {
        container.innerHTML = '<div class="empty-list">暂无文件</div>';
        return;
    }

    fileList.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span class="file-name" title="${file.name}">${file.name}</span>
            <div class="file-actions">
                <button class="btn-lock ${file.locked ? '' : 'unlocked'}" 
                        onclick="toggleLock('${file.id}')">
                    ${file.locked ? '已锁定' : '未锁定'}
                </button>
                <button class="btn-delete" onclick="deleteFile('${file.id}')">删除</button>
            </div>
        `;
        container.appendChild(fileItem);
    });
}

// 切换文件锁定状态
async function toggleLock(fileId) {
    const file = fileList.find(f => f.id === fileId);
    if (file) {
        file.locked = !file.locked;
        updateFileListUI();
        saveFileList();
        showMessage(`${file.name} ${file.locked ? '已锁定' : '已解锁'}`);
    }
}

// 删除文件
async function deleteFile(fileId) {
    try {
        const file = fileList.find(f => f.id === fileId);
        if (!file) return;

        showMessage(`正在删除: ${file.name}...`);
        
        const response = await chrome.runtime.sendMessage({
            type: 'deleteFiles',
            data: { fileIds: [fileId] }
        });

        if (response.success) {
            fileList = fileList.filter(f => f.id !== fileId);
            updateFileListUI();
            saveFileList();
            showMessage(`${file.name} 已删除`);
        } else {
            showMessage(`删除失败: ${response.error}`, true);
        }
    } catch (error) {
        showMessage('删除文件失败，请重试', true);
        console.error('删除文件失败:', error);
    }
}

// 保存文件列表到storage
function saveFileList() {
    chrome.storage.local.set({ fileList });
}

// 从storage加载文件列表
function loadFileList() {
    chrome.storage.local.get(['fileList'], (result) => {
        if (result.fileList) {
            fileList = result.fileList;
            updateFileListUI();
        }
    });
}

// 将toggleLock和deleteFile函数添加到window对象，使其可以通过onclick调用
window.toggleLock = toggleLock;
window.deleteFile = deleteFile; 