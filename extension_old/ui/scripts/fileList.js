// 文件列表管理类
class FileListManager {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            onDelete: null,
            onLock: null,
            ...options
        };
        this.files = [];
    }

    // 渲染文件列表
    render() {
        if (!this.container) return;
        
        this.container.innerHTML = '';
        
        if (this.files.length === 0) {
            this.renderEmptyState();
            return;
        }

        this.files.forEach(file => {
            const fileItem = this.createFileItem(file);
            this.container.appendChild(fileItem);
        });
    }

    // 渲染空状态
    renderEmptyState() {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <p>暂无文件</p>
            <small>请上传文件或添加页面内容</small>
        `;
        this.container.appendChild(emptyState);
    }

    // 创建文件项
    createFileItem(file) {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.dataset.id = file.id;
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'file-name';
        nameSpan.title = file.name;
        nameSpan.textContent = file.name;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'file-actions';
        
        // 锁定按钮
        const lockBtn = document.createElement('button');
        lockBtn.className = `lock-btn ${file.locked ? 'locked' : ''}`;
        lockBtn.innerHTML = `<span class="icon">${file.locked ? '🔒' : '🔓'}</span>`;
        lockBtn.onclick = () => this.toggleLock(file.id);
        
        // 删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<span class="icon">🗑️</span>';
        deleteBtn.onclick = () => this.deleteFile(file.id);
        
        actionsDiv.appendChild(lockBtn);
        actionsDiv.appendChild(deleteBtn);
        
        item.appendChild(nameSpan);
        item.appendChild(actionsDiv);
        
        return item;
    }

    // 更新文件列表
    updateFiles(files) {
        this.files = files;
        this.render();
    }

    // 添加文件
    addFile(file) {
        this.files.push(file);
        this.render();
    }

    // 删除文件
    deleteFile(fileId) {
        if (this.options.onDelete) {
            this.options.onDelete(fileId);
        }
        this.files = this.files.filter(f => f.id !== fileId);
        this.render();
    }

    // 切换文件锁定状态
    toggleLock(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (file) {
            file.locked = !file.locked;
            if (this.options.onLock) {
                this.options.onLock(fileId, file.locked);
            }
            this.render();
        }
    }

    // 清除所有文件
    clear() {
        this.files = [];
        this.render();
    }
} 