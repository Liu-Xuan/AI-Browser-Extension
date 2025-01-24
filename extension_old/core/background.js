// 扩展安装或更新时的处理
chrome.runtime.onInstalled.addListener(() => {
    console.log('扩展已安装/更新');
});

// 处理扩展图标点击事件
chrome.action.onClicked.addListener((tab) => {
    // 打开侧边栏
    if (chrome.sidePanel) {
        chrome.sidePanel.open({ windowId: tab.windowId });
    }
});

// 注入content-script
async function injectContentScript(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['core/content-script.js']
        });
        console.log('Content script injected successfully');
    } catch (error) {
        console.error('Failed to inject content script:', error);
    }
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 处理页面内容获取请求
    if (request.action === 'getPageContent') {
        // 确保content script已注入
        injectContentScript(sender.tab.id).then(() => {
            chrome.tabs.sendMessage(sender.tab.id, request).then(response => {
                sendResponse(response);
            }).catch(error => {
                console.error('Error:', error);
                sendResponse({ error: error.message });
            });
        });
        return true;
    }
}); 