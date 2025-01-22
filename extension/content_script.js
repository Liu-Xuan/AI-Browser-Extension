// 监听选中文本事件
document.addEventListener('mouseup', () => {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText) {
    // 可以在这里添加选中文本后的交互逻辑
    console.log('Selected text:', selectedText);
  }
});

// 创建一个浮动提示框（可选功能）
function createFloatingTip() {
  const tip = document.createElement('div');
  tip.style.cssText = `
    position: fixed;
    padding: 10px;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 2px 2px 10px rgba(0,0,0,0.2);
    display: none;
    z-index: 10000;
  `;
  document.body.appendChild(tip);
  return tip;
}

// 初始化浮动提示框
const floatingTip = createFloatingTip(); 