// OpenWebUI API 配置
const API_CONFIG = {
    BASE_URL: 'http://localhost:3000/api',
    API_KEY: '' // 从设置中获取
};

// 上传文件到OpenWebUI
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/v1/files/`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.API_KEY}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`上传失败: ${errorText}`);
        }

        const result = await response.json();
        return {
            document_id: result.id,
            filename: file.name
        };
    } catch (error) {
        console.error('Upload file error:', error);
        throw error;
    }
}

// 加载网页内容
async function loadWebPage(url, content) {
    try {
        // 首先上传网页内容作为文件
        const blob = new Blob([content], { type: 'text/html' });
        const file = new File([blob], `page_${Date.now()}.html`, { type: 'text/html' });
        
        const uploadResult = await uploadFile(file);
        return uploadResult;
    } catch (error) {
        console.error('Load webpage error:', error);
        throw error;
    }
}

// 获取共享对话URL
function getSharedChatUrl(fileIds = []) {
    // 如果没有文件，返回基础URL
    if (!fileIds || !fileIds.length) {
        return 'http://localhost:3000';
    }

    try {
        // 构建文件参数，过滤掉无效的ID
        const validFileIds = fileIds.filter(id => id && typeof id === 'string');
        if (!validFileIds.length) {
            return 'http://localhost:3000';
        }

        // 构建完整的URL
        const baseUrl = 'http://localhost:3000';
        const params = new URLSearchParams();
        
        // 添加文件参数，每个文件ID作为单独的参数
        validFileIds.forEach(id => {
            params.append('file', id);
        });
        
        return `${baseUrl}?${params.toString()}`;
    } catch (error) {
        console.error('Error generating chat URL:', error);
        return 'http://localhost:3000';
    }
}

// 设置API密钥
function setApiKey(key) {
    API_CONFIG.API_KEY = key;
}

export const openWebUI = {
    uploadFile,
    loadWebPage,
    getSharedChatUrl,
    setApiKey
}; 