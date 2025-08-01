# Multi-stage build optimized for Google Cloud Run
FROM node:18-alpine AS frontend-build

# Build frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Python backend stage
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Python requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install gunicorn for production WSGI server
RUN pip install gunicorn

# Copy backend source code
COPY src/ ./src/
COPY *.py ./

# Copy built frontend from previous stage
COPY --from=frontend-build /app/dist ./dist

# Create necessary directories
RUN mkdir -p saved_graphs plots

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Set environment variables
ENV FLASK_APP=src.backend
ENV FLASK_ENV=production
ENV PYTHONPATH=/app
ENV PORT=8080

# Expose port (Cloud Run uses PORT env variable)
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Use gunicorn for production
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 src.backend:app
