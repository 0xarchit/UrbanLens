FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY Backend/requirements.txt /app/Backend/requirements.txt
RUN pip install --no-cache-dir -r /app/Backend/requirements.txt

COPY Backend/ /app/Backend/
COPY static/ /app/static/

RUN mkdir -p /app/static/temp

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 7860

CMD ["python", "-m", "uvicorn", "Backend.api:app", "--host", "0.0.0.0", "--port", "7860", "--forwarded-allow-ips", "*"]
