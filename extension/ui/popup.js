document.addEventListener('DOMContentLoaded', function() {
  // 获取按钮元素
  const btnSummarize = document.getElementById('btnSummarize');
  const btnTranslate = document.getElementById('btnTranslate');
  const btnOpenSidePanel = document.getElementById('btnOpenSidePanel');
  const output = document.getElementById('output');

  // 更新输出内容的函数
  function updateOutput(text, isError = false) {
    output.textContent = text;
    output.style.color = isError ? '#dc3545' : '#666';
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

  // 摘要按钮点击事件
  if (btnSummarize) {
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
          if (response && response.summary) {
            updateOutput(response.summary);
          } else {
            updateOutput('生成摘要时出错，请重试', true);
          }
        });
      } catch (error) {
        updateOutput('操作失败：' + error.message, true);
      }
    });
  }

  // 翻译按钮点击事件
  if (btnTranslate) {
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
          if (response && response.translation) {
            updateOutput(response.translation);
          } else {
            updateOutput('翻译时出错，请重试', true);
          }
        });
      } catch (error) {
        updateOutput('操作失败：' + error.message, true);
      }
    });
  }

  // 打开侧边栏按钮点击事件
  if (btnOpenSidePanel) {
    btnOpenSidePanel.addEventListener('click', function() {
      // 使用 chrome.sidePanel.setOptions() 设置侧边栏
      chrome.sidePanel.setOptions({
        enabled: true,
        path: 'ui/sidepanel.html'
      }).then(() => {
        // 关闭弹出窗口
        window.close();
      }).catch(error => {
        console.error('打开侧边栏失败:', error);
      });
    });
  }
}); 