FROM python:3.9-slim

WORKDIR /app

# 安装系统工具和编译依赖
RUN apt-get update && apt-get install -y \
    iputils-ping \
    curl \
    net-tools \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# 升级 pip
RUN pip install --no-cache-dir --upgrade pip

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"] 