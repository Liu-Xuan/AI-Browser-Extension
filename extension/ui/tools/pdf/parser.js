export class PdfParser {
    constructor() {
        this.observer = null;
    }

    isPdfPage() {
        return document.querySelector('embed[type="application/pdf"]') !== null ||
               document.querySelector('pdf-viewer') !== null;
    }

    async getPdfContent() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 20; // 最多尝试20次
            
            const checkContent = () => {
                attempts++;
                // 尝试不同的选择器来获取文本内容
                const textElements = document.querySelectorAll('.textLayer > span, .textLayer > div');
                
                if (textElements.length > 0) {
                    let content = '';
                    textElements.forEach(element => {
                        content += element.textContent + ' ';
                    });

                    resolve({
                        content: content.trim(),
                        pageCount: document.querySelector('#numPages, .page-count')?.textContent?.replace(/[^\d]/g, ''),
                        title: document.title
                    });
                } else if (attempts >= maxAttempts) {
                    reject(new Error('PDF 内容加载超时'));
                } else {
                    setTimeout(checkContent, 500);
                }
            };

            checkContent();
        });
    }

    startObserving() {
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    const textLayer = document.querySelector('.textLayer');
                    if (textLayer) {
                        chrome.runtime.sendMessage({ action: 'pdfLoaded' });
                        this.observer.disconnect();
                        break;
                    }
                }
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    stopObserving() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
} 