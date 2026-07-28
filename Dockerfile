FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY main.py .
COPY db_adapter.py .
COPY schema.sql .
COPY generate_data.py .

# We'll run generate_data.py if DB doesn't exist, then start the server
# The port is standard 8000
CMD ["sh", "-c", "python3 generate_data.py --db test.db && uvicorn main:app --host 0.0.0.0 --port 8000"]
