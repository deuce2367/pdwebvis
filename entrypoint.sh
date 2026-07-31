#!/bin/sh
set -e

GENERATE_DATA=${GENERATE_DATA:-false}
HOURS=${DATA_HOURS:-168}

if [ "$GENERATE_DATA" = "true" ]; then
    echo "GENERATE_DATA is true. Starting data generation..."
    if [ -z "$DATABASE_URL" ]; then
        python3 generate_data.py --db test.db --hours "$HOURS"
    else
        python3 generate_data.py --db-url "$DATABASE_URL" --hours "$HOURS"
    fi
else
    echo "GENERATE_DATA is false (or not set). Skipping data generation."
fi

echo "Starting Uvicorn server..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
