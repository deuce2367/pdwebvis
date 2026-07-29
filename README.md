# PDWeb Dashboard

PDWeb is a full-stack data visualization dashboard designed for exploring and analyzing `PRED_info` database records. It provides a suite of interactive tools to filter and summarize high-volume time-series data.

## Features

- **Interactive Timeline (Gantt Chart)**: Visualize active receiver (MSIC) runs over time. The chart dynamically scales its bin sizes to match your zoom level.
- **Summary Histograms**: Instantly view the distribution of events across specific hours, dates, and receiver IDs.
- **Raw Data Table**: A sortable, paginated explorer for deep-diving into the raw `PRED_info` records (up to 10,000 rows at a time).
- **Database Inspector**: A dedicated view providing connection metadata, record counts, file sizes, and syntax-highlighted SQL schema definitions for the underlying database.

## Architecture

- **Frontend**: React (Vite) utilizing `ag-grid` for data tables, `lucide-react` for icons, and native CSS for a modern, responsive design.
- **Backend**: Python FastAPI serving REST endpoints and dynamically generating SVG plots using `matplotlib`.
- **Database**: SQLite (abstracted via `DatabaseAdapter` to easily support future integrations with Postgres or MySQL).

---

## Getting Started (Docker)

The easiest way to run the application is via Docker. The container bundles the built React frontend and the Python backend into a single image.

### 1. Build the Image
From the root of the repository, build the Docker container:
```bash
docker build -t pdweb-app .
```

### 2. Run the Container
Spin up the container, mapping port `8000` to your host machine:
```bash
docker run -p 8000:8000 pdweb-app
```

The dashboard will be immediately accessible at [http://localhost:8000](http://localhost:8000).

*(Note: On initial startup, if a database file is not found, the container will automatically run the data generator script to populate a fresh database before starting the web server).*

---

## Configurable Parameters

If you are running or testing the application locally outside of Docker, or if you wish to customize the initial data generation, you can tweak the following configurable parameters.

### Data Generation (`generate_data.py`)
The data generator script simulates cycles of active and inactive receiver runs.

- `--hours` (default: `48`): The total number of hours of historical data to generate, looking backwards from the current time.
- `--interval` (default: `5`): The time interval in seconds between individual data points during an active run.
- `--db` (default: `test.db`): The file path where the SQLite database will be created.

**Example:** Generate 24 hours of data with 10-second intervals:
```bash
python3 generate_data.py --hours 24 --interval 10 --db custom.db
```

### Server Configuration
The FastAPI application binds to port `8000` by default. You can change this when launching `uvicorn`:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Dockerized PostgreSQL Deployment

pdwebvis natively supports PostgreSQL (with PostGIS) alongside SQLite. You can run the entire stack (both the database and the backend app) using Docker networks for a clean, isolated deployment.

### 1. Create a Docker Network

```bash
docker network create pdweb-net
```

### 2. Start the PostgreSQL Container

A lightweight `Dockerfile.postgis` is included to automatically initialize the PostgreSQL schema. Build and run it:

```bash
docker build -t pdweb-db -f Dockerfile.postgis .
docker run -d --name pdweb-postgres --network pdweb-net \
    -e POSTGRES_USER=pdweb \
    -e POSTGRES_PASSWORD=pdweb \
    -e POSTGRES_DB=pdweb \
    pdweb-db
```

### 3. Start the pdweb Application Container

Build the pdweb image and run it on the same network. By passing the `DATABASE_URL` environment variable pointing to the Postgres container, the app will automatically seed data and connect to it instead of using local SQLite.

```bash
docker build -t pdweb-app .
docker run -d --name pdweb-app --network pdweb-net \
    -e DATABASE_URL=postgresql://pdweb:pdweb@pdweb-postgres:5432/pdweb \
    -p 8000:8000 \
    pdweb-app
```

Navigate to `http://localhost:8000` to view your dashboard powered by PostgreSQL!
