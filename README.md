# Aruba Central Network Observability Dashboard

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-Production-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 1. PROJECT OVERVIEW

The **Aruba Central Network Observability Dashboard** is a production-grade, real-time telemetry monitoring solution designed for enterprise network environments. 

It solves the problem of decentralized network visibility by aggregating complex data from Aruba Central into a single, high-readability pane of glass. Designed for both operational engineers and executive stakeholders, it provides an autonomous, self-healing architecture that guarantees uninterrupted monitoring.

**Key Features:**
- **Real-Time Monitoring**: Instantly reflects the state of network and connected clients.
- **Enterprise API Integration**: Securely interfaces natively with Aruba Central APAC South cluster.
- **Traffic Analytics**: Deep packet inspection and layer-7 visibility into bandwidth allocation.
- **Device Monitoring**: Comprehensive health tracking for Access Points, Switches, and Gateways.
- **AppRF Analytics**: Granular visibility into Application and Web Reputation usage.

---

## 2. SYSTEM ARCHITECTURE

The project utilizes a decoupled microservices architecture designed for extreme resilience and minimal latency.

```text
 ┌─────────────────┐       (Ingests Telemetry)       ┌─────────────────┐
 │                 │ ──────────────────────────────▶ │                 │
 │  Aruba Central  │                                 │   Node Worker   │
 │   API Cluster   │ ◀────────────────────────────── │   (Ingestion)   │
 │                 │       (Manages OAuth2.0)        └─────────────────┘
 └─────────────────┘                                          │
                                                              │
                    ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
                    │                                         │                                         │
                    ▼                                         ▼                                         ▼
           ┌─────────────────┐                       ┌─────────────────┐                       ┌─────────────────┐
           │                 │                       │                 │                       │                 │
           │      Redis      │                       │   Next.js API   │                       │    InfluxDB     │
           │  (Fast Cache)   │ ◀───────────────────▶ │   (Backend)     │ ◀───────────────────▶ │  (Time-Series)  │
           │                 │                       │                 │                       │                 │
           └─────────────────┘                       └─────────────────┘                       └─────────────────┘
                                                              │
                                                              │
                                                              ▼
                                                     ┌─────────────────┐
                                                     │                 │
                                                     │    Frontend     │
                                                     │ (Next.js + CSS) │
                                                     │                 │
                                                     └─────────────────┘
```

**Architecture Components:**
- **Worker (Ingestion Layer)**: A headless Node.js autonomous service that handles token lifecycle, throttles API requests, and standardizes incoming metrics.
- **Redis (Real-time Cache)**: Acts as the absolute source of truth for the dashboard's current state, enabling ultra-fast UI rendering without hammering the external APIs.
- **InfluxDB (Historical Storage)**: Tracks long-term trends, event alerts, and traffic patterns over time.
- **Next.js (Web & API)**: Serves the compiled Frontend and acts as a bridge between the secure database layer and the client.

---

## 3. DATA FLOW

1. **Ingestion**: The Node.js Worker executes a unified synchronous digest (`Scheduler.ts`) to fetch raw data across 19 different Aruba Central endpoints.
2. **Normalization & Mapping**: The Worker processes specific data models (e.g., extracting AppRF `result.app_id` and normalizing strings to numeric values).
3. **Storage**: 
   - Transmits the parsed output state to **Redis** for instantaneous UI access.
   - Pushes append-only statistics (like Wi-Fi events and traffic sizes) to **InfluxDB**.
4. **API Serve**: The Frontend polls the Next.js local backend (`/api/data`), which reads directly from Redis.
5. **Consumption**: The Frontend renders cleanly formatted tables, charts, and KPI blocks gracefully falling back or fading during updates.

---

## 4. TOKEN MANAGEMENT

Tokens in the Aruba ecosystem are single-use per lifecycle. The application includes an **Enterprise Token Manager** (`TokenManager.ts`) to manage authentication natively without human intervention.

- **Access Token**: Valid for strictly `2 hours` (7200 seconds).
- **Refresh Token**: Valid for `15 days`.
- **Refresh Strategy**: The Worker proactively initiates a token rotation process when TTL drops below `10 minutes`.

**Token Flow Lifecycle:**
1. **Store**: Stores current Access and Refresh tokens in Redis with strict expiration policies.
2. **Pre-Check**: Evaluates TTL before initiating any API polling cycle.
3. **Auto-Rotate**: Calls `/oauth2/token` to swap the Refresh token for a new set, overwriting Redis state.
4. **Self-Healing Fallback**: If a mid-cycle `401 Unauthorized` occurs, an Axios interceptor suspends pending requests, clears the stale token, forces a rotation, and re-executes the failed queue invisibly.

---

## 5. ARUBA CENTRAL API LIST

All programmatic calls originate from `arubaClient.ts` targeting the APAC South regional cluster.

**Base URL**: `https://apigw-apacsouth.central.arubanetworks.com`

#### Authentication
- **`POST /oauth2/token`**
  - **URL**: `https://apigw-apacsouth.central.arubanetworks.com/oauth2/token`
  - **Purpose**: Refreshes OAuth 2.0 lifecycle preventing manual user re-auth.

#### Infrastructure & Devices
- **`GET /monitoring/v1/gateways`**
  - **URL**: `https://apigw-apacsouth.central.arubanetworks.com/monitoring/v1/gateways`
  - **Purpose**: Fetch gateway status and client load.
- **`GET /monitoring/v1/switches`**
  - **URL**: `https://apigw-apacsouth.central.arubanetworks.com/monitoring/v1/switches`
  - **Purpose**: Fetch switch availability and resource consumption.
- **`GET /monitoring/v2/aps`**
  - **URL**: `https://apigw-apacsouth.central.arubanetworks.com/monitoring/v2/aps`
  - **Purpose**: Fetch Access Points lists and current health.
- **`GET /monitoring/v1/switches/{serial}/ports`**
  - **URL**: `https://apigw-apacsouth.central.arubanetworks.com/monitoring/v1/switches/{serial}/ports`
  - **Purpose**: Interrogate exact interface/port assignments on a switch-by-switch level.
- **`GET /monitoring/v3/aps/{serial}/rf_summary`**
  - **URL**: `https://apigw-apacsouth.central.arubanetworks.com/monitoring/v3/aps/{serial}/rf_summary`
  - **Purpose**: Assess localized radio frequency (RF) health (2.4GHz / 5GHz) of a specific Access Point.

#### Client & Traffic Analytics
- **`GET /monitoring/v1/clients/wireless`** & **`/monitoring/v1/clients/wired`**
  - **URL**: `https://apigw-apacsouth.central.arubanetworks.com/monitoring/v1/clients/wireless`
  - **Purpose**: Fetch comprehensive endpoint datasets mapped to tables.
- **`GET /monitoring/v1/clients/count`** & **`/monitoring/v1/clients/bandwidth_usage`**
  - **URL**: `https://apigw-apacsouth.central.arubanetworks.com/monitoring/v1/clients/count`
  - **Purpose**: Total aggregate counts and overall site throughput.
- **`GET /monitoring/v1/clients/bandwidth_usage/topn`**
  - **URL**: `https://apigw-apacsouth.central.arubanetworks.com/monitoring/v1/clients/bandwidth_usage/topn`
  - **Purpose**: Identify endpoints consuming the heaviest network throughput.
- **`GET /monitoring/v2/aps/bandwidth_usage/topn`**
  - **URL**: `https://apigw-apacsouth.central.arubanetworks.com/monitoring/v2/aps/bandwidth_usage/topn`
  - **Purpose**: Identify Access Points transmitting the highest data volumes.
- **`GET /monitoring/v1/switches/bandwidth_usage/topn`**
  - **URL**: `https://apigw-apacsouth.central.arubanetworks.com/monitoring/v1/switches/bandwidth_usage/topn`
  - **Purpose**: Identify the most utilized network backbone switches.

#### Organizational & Topology
- **`GET /central/v2/sites`** & **`/central/v1/labels`**
  - **URL**: `https://apigw-apacsouth.central.arubanetworks.com/central/v2/sites`
  - **Purpose**: Location-based identification metadata.
- **`GET /monitoring/v2/networks`**
  - **URL**: `https://apigw-apacsouth.central.arubanetworks.com/monitoring/v2/networks`
  - **Purpose**: Fetch live SSIDs and connected user distributions per SSID.
- **`GET /monitoring/v2/bssids`**
  - **URL**: `https://apigw-apacsouth.central.arubanetworks.com/monitoring/v2/bssids`
  - **Purpose**: Deep integration identifying Basic Service Set Identifiers for AP broadcasting logic.

#### Diagnostics & AppRF (DPI)
- **`GET /monitoring/v2/events`**
  - **URL**: `https://apigw-apacsouth.central.arubanetworks.com/monitoring/v2/events`
  - **Purpose**: Fetch system alerts, AP disconnects, and firmware events.
- **`GET /apprf/datapoints/v2/topn_stats`**
  - **URL**: `https://apigw-apacsouth.central.arubanetworks.com/apprf/datapoints/v2/topn_stats`
  - **Purpose**: (Uses `start_time`/`end_time` logic nested at `result.app_id`) Deep Packet Inspection identifying specific SaaS services (Office 365, WebEx) eating uplink bandwidth.

---

## 6. DASHBOARD FEATURES

The UI adopts a "Slate" professional Datadog/Grafana inspired aesthetic, favoring high readability over visual noise.

- **KPI Metrics**: Top-level overview combining overall site health, device uptime, current online capability, and historical connection baselines.
- **Traffic Analytics**: Consolidated view of Total `Rx` (Download) and `Tx` (Upload) throughput volumes.
- **Top Applications (AppRF)**: Advanced Layer 7 deep packet analysis charting exact software categories (e.g. YouTube, Zoom) and their bandwidth percentile.
- **Top Clients / Top APs**: Identifying high-density usage vectors on granular levels to isolate rogue devices or saturated areas.
- **SSID Distribution**: Real-time segmentation profiling how many users belong to corporate vs guest architectures.
- **Network Infrastructure Arrays**: Scrollable datasets evaluating the MAC, IP, and associated uptime for Switches, APs, and endpoints. Includes a self-contained error handler signaling "Authentication Failure" directly via UI blocks.

---

## 7. INSTALLATION GUIDE

Ensure that you have access to a verified Aruba Central administrative credential to generate original OAuth tokens.

### A. PREREQUISITES
- **Docker** & **Docker Compose** installed (v2.x+ recommended).
- **Aruba Central Credentials**: `CLIENT_ID`, `CLIENT_SECRET`, and a freshly generated `ACCESS_TOKEN` / `REFRESH_TOKEN` pair.

### B. INSTRUCTIONS

1. **Clone Project:**
```bash
git clone <your-repository>
cd Central-Dashboard
```

2. **Configure Environment:**
Copy the example file to initiate your environment:
```bash
cp .env.example .env
```
Populate `.env` with your fresh Aruba Central token information and point `ARUBA_BASE_URL` to your cluster (e.g. `apigw-apacsouth.central.arubanetworks.com`).

3. **Deploy Container Stack:**
Build and deploy the ecosystem autonomously using Docker Compose.
```bash
docker compose up -d --build
```

4. **Verify Health:**
Inspect the worker logs to verify token handshake and API communication.
```bash
docker compose logs worker -f
```
Ensure you see exactly `Consolidated Dashboard Summary cached successfully.`

5. **Access Application:**
Navigate in your browser to:
[http://localhost:3000](http://localhost:3000)

> **Important**: Never reboot Redis without gracefully shutting down the stack, otherwise the accumulated 15-day refresh chain will be broken, necessitating a new `.env` key swap.

---

## 8. TROUBLESHOOTING & KNOWN API ISSUES

During the integration with Aruba Central, several API anomalies were identified and patched within this architecture. Use this guide if data stops appearing natively.

#### 1. AppRF "Top Applications" Remains Empty
**Symptom**: The Top Applications card is rendering, but no bars populate.
**Cause**: The newer `v2/topn_stats` AppRF endpoint behaves inconsistently without specific time window query parameters. Furthermore, different licensing tiers return data in nested sub-objects (e.g., `result.app_id` vs `result.web_rep`).
**Resolution**:
- The worker dynamically injects a 2-hour rolling window (`start_time` / `end_time`) into the API call natively.
- Evaluates a fallback chain: It checks `app_id` (Specific Apps) → `app_cat` (Categories) → `web_rep` (Web Reputation). If your instance lacks granular App-level tracking, it will automatically chart Web Reputation instead.

#### 2. Endless Authentication Loop (401 Error)
**Symptom**: Logs show repetitive `401 Unauthorized` self-healing attempts spanning multiple seconds.
**Cause**: The 15-day refresh chain was broken because Redis was flushed (e.g. `docker compose down -v`), rendering the last successfully rotated Refresh Token gone. The system tried to fallback to the original `.env` key, but because it is older than 15 days, it gets entirely rejected.
**Resolution**:
1. Log into Aruba Central Portal.
2. Generate a brand new Access and Refresh Token pair.
3. Update `.env`.
4. Restart the worker: `docker compose restart worker`.

#### 3. Data Missing from Specific Cards (Promise Misalignment)
**Symptom**: Clients are showing, but Switches are completely blank or returning `0`, despite token being valid.
**Cause**: The synchronous ingestion loop `Promise.allSettled` aggregates 13+ endpoints parallelly. If Aruba deprecates or modifies the schema of one of those endpoints (e.g., throwing a `500 Internal Server Error`), it does not crash the worker but registers as `null`.
**Resolution**: Inspect payload schemas. Using `docker compose logs worker | grep FAILED`, identify which chunk errored and adapt the `ArubaClient.ts` mapper to handle the newer field outputs.

#### 4. Managing Redis States & Token Verification
If you suspect the automated token lifecycle is malfunctioning, you can interact directly with the Redis container to verify the exact string stored in the cache.

**To verify the current active token:**
```bash
docker exec central-dashboard-redis-1 redis-cli get aruba_access_token
```

**To purposefully trigger a proactive token refresh (flush current token):**
This forces the worker to immediately grab the `refresh_token` and perform an OAuth rotation.
```bash
docker exec central-dashboard-redis-1 redis-cli del aruba_access_token
```

**To force the worker to fetch new telemetry instantly (skip the 30-min window):**
```bash
docker exec central-dashboard-redis-1 redis-cli set aruba_force_refresh "true"
```
The Worker detects this boolean flag within 5 minutes, triggers a 19-endpoint data pull, pushes it to the UI, and automatically resets the flag to `"false"`.



https://expert-bassoon-rw96rw7v4xwfw574-3000.app.github.dev/
