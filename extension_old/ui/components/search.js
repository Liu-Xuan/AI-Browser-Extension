import { apiClient } from '../../core/api.js';
import { state } from '../../core/state.js';

export class Search {
    constructor(elements) {
        this.elements = elements;
        this.bindEvents();
    }

    // 绑定事件
    bindEvents() {
        if (this.elements.searchInput && this.elements.btnSearch) {
            this.elements.btnSearch.addEventListener('click', () => this.performSearch());
            this.elements.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }
    }

    // 执行检索
    async performSearch() {
        const query = this.elements.searchInput.value.trim();
        if (!query || state.isSearching) return;
        if (!state.selectedDataset) {
            alert('请先选择知识库');
            return;
        }

        state.isSearching = true;
        state.lastSearchQuery = query;
        this.elements.btnSearch.disabled = true;
        this.elements.searchInput.disabled = true;

        try {
            const result = await apiClient.retrieve(query, [state.selectedDataset]);
            this.displaySearchResults(result);
        } catch (error) {
            console.error('检索失败:', error);
            alert('检索失败: ' + error.message);
        } finally {
            state.isSearching = false;
            this.elements.btnSearch.disabled = false;
            this.elements.searchInput.disabled = false;
        }
    }

    // 显示检索结果
    displaySearchResults(results) {
        if (!this.elements.searchResults) return;

        this.elements.searchResults.innerHTML = '';
        this.elements.searchResults.classList.add('active');

        if (!results || !results.length) {
            this.elements.searchResults.innerHTML = '<div class="result-item">没有找到相关内容</div>';
            return;
        }

        results.forEach(result => {
            const resultElement = document.createElement('div');
            resultElement.className = 'result-item';
            
            // 计算相似度百分比
            const similarity = (result.similarity * 100).toFixed(1);
            
            resultElement.innerHTML = `
                <div class="result-title">${result.document_title || '未知文档'}</div>
                <div class="result-content">${result.content}</div>
                <div class="result-meta">
                    <span>来源页码: ${result.page_number || 'N/A'}</span>
                    <span class="result-score">相似度: ${similarity}%</span>
                </div>
            `;
            
            this.elements.searchResults.appendChild(resultElement);
        });
    }

    // 清除检索结果
    clearSearchResults() {
        if (!this.elements.searchResults || !this.elements.searchInput) return;

        this.elements.searchResults.innerHTML = '';
        this.elements.searchResults.classList.remove('active');
        this.elements.searchInput.value = '';
        state.lastSearchQuery = '';
    }
} 