// 简单的事件发射器实现
class EventEmitter {
  private listeners: { [key: string]: ((...args: any[]) => void)[] } = {};

  on(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: string, ...args: any[]) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(...args));
  }
}

// 创建事件发射器
const eventEmitter = new EventEmitter();

// 处理响应数据
const handleResponse = async (response: Response) => {
  try {
    const contentType = response.headers.get('content-type');
    
    // 如果是流式响应，需要特殊处理
    if (contentType?.includes('text/event-stream')) {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      return {
        type: 'stream',
        async *[Symbol.asyncIterator]() {
          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data:')) {
                try {
                  const jsonStr = line.slice(5).trim();
                  const data = JSON.parse(jsonStr);
                  yield data;
                } catch (e) {
                  console.error('SSE数据解析失败:', e);
                  yield { text: line.slice(5).trim() };
                }
              }
            }
          }
        }
      };
    }
    
    // 处理JSON响应
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    
    // 处理文本响应
    const text = await response.text();
    
    // 检查是否是SSE格式的数据
    if (text.startsWith('data:')) {
      const jsonStr = text.replace(/^data:\s*/, '');
      try {
        return JSON.parse(jsonStr);
      } catch (e) {
        console.error('SSE数据解析失败:', e);
        return { text: jsonStr };
      }
    }
    
    // 尝试解析普通JSON
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('JSON解析失败:', e);
      console.log('原始响应文本:', text);
      return { text };
    }
  } catch (error) {
    console.error('处理响应数据时出错:', error);
    throw error;
  }
};

// 使用处理函数
export const useLogicHook = () => {
  const processData = async (response: Response) => {
    try {
      const data = await handleResponse(response);
      console.log('处理后的数据:', data);
      
      // 如果是流式数据，设置监听器
      if (data?.type === 'stream') {
        for await (const chunk of data) {
          eventEmitter.emit('data', chunk);
        }
        eventEmitter.emit('done');
        return;
      }
      
      return data;
    } catch (error) {
      console.error('处理数据时出错:', error);
      throw error;
    }
  };

  return {
    processData,
    on: (event: string, callback: (...args: any[]) => void) => {
      eventEmitter.on(event, callback);
    },
    off: (event: string, callback: (...args: any[]) => void) => {
      eventEmitter.off(event, callback);
    }
  };
}; 