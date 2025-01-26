// 状态管理：用于存储应用的数据状态
const state = {
    files: []  // 存储文件列表数据
};

// DOM元素：缓存常用的DOM元素引用，避免重复查询
const elements = {
    fileList: document.getElementById('fileList'),  // 文件列表容器
    uploadBtn: document.getElementById('uploadBtn')  // 上传按钮
};

// 渲染文件列表：将文件数据渲染到页面上
function renderFileList() {
    // 检查文件列表容器是否存在
    if (!elements.fileList) return;
    
    // 使用数组map方法生成HTML字符串
    elements.fileList.innerHTML = state.files.map(file => `
        <div class="file-item" data-id="${file.id}">
            <span class="file-name">${file.name}</span>
            <button class="delete-btn" onclick="deleteFile('${file.id}')">
                <span class="icon">🗑️</span>
            </button>
        </div>
    `).join('');  // 将数组转换为字符串
}

// 添加文件：将新文件添加到状态中并更新显示
function addFile(file) {
    state.files.push(file);  // 将文件添加到状态数组
    renderFileList();  // 重新渲染文件列表
}

// 删除文件：从状态中移除文件并更新显示
window.deleteFile = async function(fileId) {
    try {
        // TODO: 这里可以添加调用RAGFlow API删除文件的逻辑
        
        // 从状态中过滤掉要删除的文件
        state.files = state.files.filter(f => f.id !== fileId);
        // 重新渲染文件列表
        renderFileList();
    } catch (error) {
        // 错误处理
        console.error('删除文件失败:', error);
        alert('删除文件失败');
    }
};

// 处理文件上传：监听上传按钮的点击事件
elements.uploadBtn.addEventListener('click', () => {
    // 创建文件输入元素
    const input = document.createElement('input');
    input.type = 'file';  // 设置为文件输入
    input.multiple = true;  // 允许多文件选择
    input.accept = '.pdf,.txt,.docx';  // 限制文件类型
    
    // 监听文件选择完成事件
    input.onchange = async (event) => {
        const files = event.target.files;
        if (files.length === 0) return;  // 如果没有选择文件，直接返回

        // 遍历选择的文件
        for (const file of files) {
            try {
                // TODO: 这里可以添加调用RAGFlow API上传文件的逻辑
                // 暂时使用模拟数据
                addFile({
                    id: Date.now().toString(),  // 使用时间戳作为临时ID
                    name: file.name  // 使用文件名
                });
            } catch (error) {
                // 错误处理
                console.error('上传文件失败:', error);
                alert('上传文件失败');
            }
        }
    };

    // 触发文件选择对话框
    input.click();
}); 