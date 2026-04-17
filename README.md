# Aruba Local Monitoring Dashboard

Lightweight local dashboard for Aruba Central monitoring data.

## Required Credentials

Put these in `.env`:

- `ARUBA_BASE_URL`
- `ARUBA_CLIENT_ID`
- `ARUBA_CLIENT_SECRET`

Optional:

- `POLLING_INTERVAL=15000`
- `NEXT_PUBLIC_POLLING_INTERVAL=15000`

## Install and Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build and Start (Production)

```bash
npm run build
npm run start
```

## Docker

```bash
docker compose up --build
```

Optional Redis profile:

```bash
docker compose --profile optional up --build
```

## API Endpoints

- `/api/summary`
- `/api/aps`
- `/api/switches`
- `/api/clients`
- `/api/gateways`
- `/api/alerts`
- `/api/health`

If Aruba credentials are missing, endpoints return demo-safe mock values so the UI still loads.
