// =============== RAGFlow API 配置 ===============
// 这里存储了与 RAGFlow 服务器通信所需的关键信息
const RAGFLOW_CONFIG = {
    API_KEY: 'ragflow-RkOWJjM2ZhZDFhZTExZWZhYmRmMDI0Mm',  // API访问密钥
    BASE_URL: 'http://172.19.12.146:8888',                 // RAGFlow服务器地址
    DATASET_NAME: '网页问答临时知识库'                      // 要操作的知识库名称
};

// =============== 全局状态管理 ===============
// 使用一个对象来集中管理应用的状态数据
const state = {
    files: [],       // 存储文件列表数据，每个文件包含id、name、size等信息
    datasetId: null  // 存储当前操作的知识库ID
};

// =============== DOM元素引用 ===============
// 缓存常用的DOM元素引用，避免重复查询，提高性能
const elements = {
    fileList: document.getElementById('fileList'),   // 文件列表容器元素
    uploadBtn: document.getElementById('uploadBtn')  // 上传按钮元素
};

// =============== 知识库操作函数 ===============
// 获取知识库ID：通过知识库名称查询对应的ID
async function getDatasetId() {
    try {
        // 发送GET请求获取所有知识库列表
        const response = await fetch(`${RAGFLOW_CONFIG.BASE_URL}/api/v1/datasets`, {
            headers: {
                'Authorization': `Bearer ${RAGFLOW_CONFIG.API_KEY}`  // 添加认证头
            }
        });
        const data = await response.json();
        
        // 如果请求成功
        if (data.code === 0) {
            // 在返回的知识库列表中查找指定名称的知识库
            const dataset = data.data.find(d => d.name === RAGFLOW_CONFIG.DATASET_NAME);
            if (dataset) {
                state.datasetId = dataset.id;  // 保存找到的知识库ID
                return dataset.id;
            }
        }
        throw new Error('找不到指定的知识库');
    } catch (error) {
        console.error('获取知识库ID失败:', error);
        throw error;
    }
}

// =============== 文件列表操作函数 ===============
// 获取知识库中的文件列表
async function fetchFileList() {
    try {
        // 如果还没有知识库ID，先获取ID
        if (!state.datasetId) {
            await getDatasetId();
        }
        
        // 发送GET请求获取文件列表
        const response = await fetch(`${RAGFLOW_CONFIG.BASE_URL}/api/v1/datasets/${state.datasetId}/documents`, {
            headers: {
                'Authorization': `Bearer ${RAGFLOW_CONFIG.API_KEY}`
            }
        });
        const data = await response.json();
        
        // 如果请求成功，更新文件列表并重新渲染
        if (data.code === 0) {
            state.files = data.data.docs;
            renderFileList();
        } else {
            throw new Error(data.message || '获取文件列表失败');
        }
    } catch (error) {
        console.error('获取文件列表失败:', error);
        alert('获取文件列表失败');
    }
}

// =============== 界面渲染函数 ===============
// 将文件列表数据渲染到页面上
function renderFileList() {
    // 检查文件列表容器是否存在
    if (!elements.fileList) return;
    
    // 根据文件列表是否为空，显示不同的内容
    elements.fileList.innerHTML = state.files.length === 0 
        ? '<div class="empty-message">暂无文件</div>'  // 空列表显示提示信息
        : state.files.map(file => `
            <div class="file-item" data-id="${file.id}">
                <span class="file-name">${file.name}</span>
                <div class="file-info">
                    <span class="file-size">${formatFileSize(file.size)}</span>
                    <span class="file-date">${new Date(file.create_time).toLocaleDateString()}</span>
                    <button class="delete-btn" data-id="${file.id}">-</button>
                </div>
            </div>
        `).join('');  // 使用map生成HTML字符串并合并
}

// =============== 工具函数 ===============
// 格式化文件大小：将字节数转换为人类可读的格式
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// =============== 文件上传相关函数 ===============
// 上传文件到知识库
async function uploadFileToRagFlow(file) {
    try {
        // 如果还没有知识库ID，先获取ID
        if (!state.datasetId) {
            await getDatasetId();
        }

        // 创建FormData对象，用于发送文件
        const formData = new FormData();
        formData.append('file', file);

        // 发送POST请求上传文件
        const response = await fetch(`${RAGFLOW_CONFIG.BASE_URL}/api/v1/datasets/${state.datasetId}/documents`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RAGFLOW_CONFIG.API_KEY}`
            },
            body: formData
        });

        const data = await response.json();
        if (data.code === 0) {
            // 上传成功后刷新文件列表
            await fetchFileList();
            return data.data[0];
        } else {
            throw new Error(data.message || '上传文件失败');
        }
    } catch (error) {
        console.error('上传文件失败:', error);
        throw error;
    }
}

// =============== 事件监听器 ===============
// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', () => {
    fetchFileList();  // 获取并显示文件列表
});

// 处理文件上传：监听上传按钮的点击事件
elements.uploadBtn.addEventListener('click', () => {
    // 创建文件输入元素
    const input = document.createElement('input');
    input.type = 'file';                    // 设置为文件输入
    input.multiple = true;                  // 允许多文件选择
    input.accept = '.pdf,.txt,.docx';       // 限制文件类型
    
    // 监听文件选择完成事件
    input.onchange = async (event) => {
        const files = event.target.files;
        if (files.length === 0) return;  // 如果没有选择文件，直接返回

        // 显示上传中状态
        elements.uploadBtn.disabled = true;
        elements.uploadBtn.innerHTML = '<span class="icon">📤</span>上传中...';

        try {
            // 遍历选择的文件并上传
            for (const file of files) {
                await uploadFileToRagFlow(file);
            }
            alert('文件上传成功！');
        } catch (error) {
            console.error('上传文件失败:', error);
            alert('上传文件失败: ' + error.message);
        } finally {
            // 恢复上传按钮状态
            elements.uploadBtn.disabled = false;
            elements.uploadBtn.innerHTML = '<span class="icon">📁</span>上传文件';
        }
    };

    // 触发文件选择对话框
    input.click();
});

// 添加文件：将新文件添加到状态中并更新显示
function addFile(file) {
    state.files.push(file);  // 将文件添加到状态数组
    renderFileList();  // 重新渲染文件列表
}

// 删除文件：从状态中移除文件并更新显示
async function deleteFile(fileId) {
    try {
        // 检查是否有知识库ID
        if (!state.datasetId) {
            await getDatasetId();
        }

        // 发送DELETE请求删除文件
        const response = await fetch(`${RAGFLOW_CONFIG.BASE_URL}/api/v1/datasets/${state.datasetId}/documents`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${RAGFLOW_CONFIG.API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ids: [fileId]  // 将文件ID包装在数组中
            })
        });

        // 检查响应状态码
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        console.log('删除响应:', data);  // 添加调试日志
        
        // 检查API响应状态
        if (data.code === 0) {  // RAGFlow API成功状态码为0
            // 从状态中过滤掉已删除的文件
            state.files = state.files.filter(f => f.id !== fileId);
            // 重新渲染文件列表
            renderFileList();
            // 显示成功提示
            alert('文件删除成功');
        } else {
            throw new Error(data.message || '删除文件失败');
        }
    } catch (error) {
        // 错误处理
        console.error('删除文件失败:', error);
        // 如果是网络错误，尝试重新获取文件列表
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            await fetchFileList();  // 刷新文件列表
        }
        alert('删除文件失败: ' + error.message);
    }
}

// 添加事件委托，处理删除按钮点击
elements.fileList.addEventListener('click', async (event) => {
    // 检查是否点击了删除按钮
    if (event.target.matches('.delete-btn')) {
        const fileId = event.target.dataset.id;
        if (fileId) {
            // 添加删除确认
            if (confirm('确定要删除这个文件吗？')) {
                await deleteFile(fileId);
            }
        }
    }
}); 