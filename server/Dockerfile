FROM python:3.9-slim

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DEFAULT_TIMEOUT=100

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 创建非root用户并设置权限
RUN useradd -m -u 1000 appuser && \
    mkdir -p /home/appuser/.local/lib/python3.9/site-packages && \
    mkdir -p /home/appuser/.cache/pip && \
    chown -R appuser:appuser /app /home/appuser/.local /home/appuser/.cache

# 切换到非root用户
USER appuser

# 复制应用代码
COPY --chown=appuser:appuser . .

EXPOSE 8000

# 启动命令改为先安装依赖再启动服务
CMD pip install --no-cache-dir -r requirements.txt && \
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload 