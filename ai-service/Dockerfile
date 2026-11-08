FROM python:3.11-slim

# Cài đặt các thư viện hệ thống C/C++ bắt buộc cho MediaPipe và OpenCV (sửa lỗi thiếu libGLESv2.so.2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libgles2 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Huấn luyện và chuẩn bị model trước khi khởi chạy
RUN python train.py

ENV PYTHONIOENCODING=utf-8
EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
