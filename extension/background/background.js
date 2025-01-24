// RAGflow API配置
const API_BASE_URL = 'http://172.19.12.146:8888';
const API_KEY = 'ragflow-RkOWJjM2ZhZDFhZTExZWZhYmRmMDI0Mm';
const SHARED_ID = 'e4021ad6d94911ef9e010242ac120005';
const AUTH_KEY = 'RkOWJkMGYyZDFhZTExZWZhYmRmMDI0Mm';

let sidePanelOpen = false;
let sidebarWindowId = null;

// 检查是否支持sidePanel API
const supportsSidePanel = chrome.sidePanel !== undefined;

// 监听扩展图标点击事件
chrome.action.onClicked.addListener(async (tab) => {
    if (supportsSidePanel) {
        // 使用sidePanel API
        try {
            if (!sidePanelOpen) {
                await chrome.sidePanel.open({ windowId: tab.windowId });
                sidePanelOpen = true;
            } else {
                await chrome.sidePanel.close({ windowId: tab.windowId });
                sidePanelOpen = false;
            }
        } catch (error) {
            console.error('SidePanel操作失败:', error);
            // 如果sidePanel操作失败，回退到弹出窗口模式
            handlePopupWindow();
        }
    } else {
        // 使用弹出窗口模式
        handlePopupWindow();
    }
});

// 处理弹出窗口模式
async function handlePopupWindow() {
    if (sidebarWindowId !== null) {
        try {
            await chrome.windows.remove(sidebarWindowId);
            sidebarWindowId = null;
        } catch (error) {
            console.error('关闭窗口失败:', error);
            sidebarWindowId = null;
        }
    } else {
        try {
            const currentWindow = await chrome.windows.getCurrent();
            const width = 450;
            const height = currentWindow.height;
            
            const window = await chrome.windows.create({
                url: chrome.runtime.getURL('popup/index.html'),
                type: 'popup',
                width: width,
                height: height,
                left: currentWindow.left + currentWindow.width,
                top: currentWindow.top,
                focused: true
            });
            
            sidebarWindowId = window.id;
            
            // 监听窗口关闭事件
            chrome.windows.onRemoved.addListener((windowId) => {
                if (windowId === sidebarWindowId) {
                    sidebarWindowId = null;
                }
            });
        } catch (error) {
            console.error('创建窗口失败:', error);
        }
    }
}

// 如果支持sidePanel，添加事件监听
if (supportsSidePanel) {
    try {
        chrome.sidePanel.onOpened.addListener(() => {
            sidePanelOpen = true;
        });

        chrome.sidePanel.onClosed.addListener(() => {
            sidePanelOpen = false;
        });
    } catch (error) {
        console.error('注册sidePanel事件监听失败:', error);
    }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.type) {
        case 'uploadFile':
            handleFileUpload(request.data).then(sendResponse);
            break;
        case 'addPageContent':
            handlePageContent(request.data).then(sendResponse);
            break;
        case 'deleteFiles':
            handleDeleteFiles(request.data).then(sendResponse);
            break;
        case 'getChatUrl':
            // 返回正确的对话URL
            sendResponse({
                url: `${API_BASE_URL}/chat/share?shared_id=${SHARED_ID}&from=agent&auth=${AUTH_KEY}`
            });
            break;
    }
    return true; // 保持消息通道开放以进行异步响应
});

// 处理文件上传
async function handleFileUpload(formData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/datasets/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            },
            body: formData
        });

        const data = await response.json();
        
        if (data.code === 0) {
            return {
                success: true,
                fileId: data.data.id
            };
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('文件上传失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 处理页面内容
async function handlePageContent(pageData) {
    try {
        // 创建包含页面内容的文本文件
        const blob = new Blob([
            `Title: ${pageData.title}\n`,
            `URL: ${pageData.url}\n\n`,
            pageData.content
        ], { type: 'text/plain' });

        // 创建FormData对象
        const formData = new FormData();
        formData.append('file', blob, `${pageData.title}.txt`);

        // 上传到RAGflow API
        const response = await fetch(`${API_BASE_URL}/api/v1/datasets/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            },
            body: formData
        });

        const data = await response.json();
        
        if (data.code === 0) {
            return {
                success: true,
                fileId: data.data.id
            };
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('页面内容上传失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 处理文件删除
async function handleDeleteFiles({ fileIds }) {
    try {
        const deletePromises = fileIds.map(fileId =>
            fetch(`${API_BASE_URL}/api/v1/datasets/${fileId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            })
        );

        await Promise.all(deletePromises);

        return {
            success: true
        };
    } catch (error) {
        console.error('文件删除失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
} 