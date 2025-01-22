import re
from typing import List

class TextProcessor:
    def __init__(self):
        self.max_chunk_size = 1000  # 文本块最大字符数

    def clean_text(self, text: str) -> str:
        """
        清理文本，去除多余空白字符和特殊字符
        
        Args:
            text: 输入文本
            
        Returns:
            str: 清理后的文本
        """
        # 去除HTML标签
        text = re.sub(r'<[^>]+>', '', text)
        
        # 替换多个空白字符为单个空格
        text = re.sub(r'\s+', ' ', text)
        
        # 去除特殊字符
        text = re.sub(r'[^\w\s.,!?;:，。！？；：]', '', text)
        
        return text.strip()

    def split_text(self, text: str) -> List[str]:
        """
        将长文本分割成较小的块
        
        Args:
            text: 输入文本
            
        Returns:
            List[str]: 文本块列表
        """
        # 按句子分割
        sentences = re.split(r'([.!?。！？])', text)
        chunks = []
        current_chunk = ""

        for i in range(0, len(sentences), 2):
            sentence = sentences[i]
            # 如果有标点符号，添加回去
            if i + 1 < len(sentences):
                sentence += sentences[i + 1]

            if len(current_chunk) + len(sentence) <= self.max_chunk_size:
                current_chunk += sentence
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence

        if current_chunk:
            chunks.append(current_chunk.strip())

        return chunks

    def extract_keywords(self, text: str, max_keywords: int = 5) -> List[str]:
        """
        从文本中提取关键词
        
        Args:
            text: 输入文本
            max_keywords: 最大关键词数量
            
        Returns:
            List[str]: 关键词列表
        """
        # 这里可以使用更复杂的算法，如TF-IDF或TextRank
        # 当前使用简单的词频统计
        words = re.findall(r'\w+', text.lower())
        word_freq = {}
        
        # 停用词列表
        stop_words = {'的', '了', '和', '是', '在', '我', '有', '就', '不', '也', '这', '到', '那', '你', '说', '要', '以', '很', '会', '好'}
        
        for word in words:
            if word not in stop_words and len(word) > 1:
                word_freq[word] = word_freq.get(word, 0) + 1

        # 按频率排序并返回前N个关键词
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, _ in sorted_words[:max_keywords]] 