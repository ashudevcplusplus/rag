FROM python:3.11-slim

WORKDIR /app

# Install system dependencies in a single layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements first for better layer caching
COPY requirements.txt .

# Install Python dependencies with pip cache
# Using --no-cache-dir to reduce image size, but keeping pip's download cache
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code last (changes most frequently)
COPY . .

EXPOSE 5001

CMD ["python", "app.py"]

