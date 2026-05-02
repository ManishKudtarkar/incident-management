# 🚨 Mission-Critical Incident Management System (IMS)

> A production-grade platform that watches your systems, groups failure signals into incidents, and enforces a full investigation + Root Cause Analysis before anything can be closed.
>
> Built with **FastAPI · React · PostgreSQL · MongoDB · Redis · MinIO · Docker**

---
## 📊 Assignment Requirement Mapping

| Requirement | Implementation |
|------------|--------------|
| Async Processing | FastAPI async + asyncio.Queue + worker |
| Debouncing | Redis TTL-based grouping |
| RCA Validation | Enforced before closing incident |
| MTTR Calculation | Computed from start_time and RCA end_time |
| State Pattern | Incident lifecycle classes |
| Strategy Pattern | Alerting (P0, P2) |
| Backpressure | Queue buffering + rate limiting |
| Observability | /health + metrics logging |

## 💡 Why This System Matters

In real-world distributed systems, a single failure can generate thousands of error signals.

Without an IMS:
- Engineers get flooded with duplicate alerts
- No structured resolution workflow exists
- Root causes are not documented

This system ensures:
- Signal noise is reduced via debouncing
- Incidents are tracked systematically
- Every issue is resolved with documented RCA
- System reliability improves over time

## 📖 Table of Contents

1. [What is this?](#-what-is-this)
2. [How it works — the big picture](#-how-it-works--the-big-picture)
3. [Signal flow — step by step](#-signal-flow--step-by-step)
4. [Incident lifecycle](#-incident-lifecycle)
5. [URL Scanner & Website Crawler](#-url-scanner--website-crawler)
6. [Tech stack explained](#-tech-stack-explained)
7. [Project structure](#-project-structure)
8. [Design patterns used](#-design-patterns-used)
9. [Database responsibilities](#-database-responsibilities)
10. [API reference](#-api-reference)
11. [Running the project](#-running-the-project)
12. [Generating test data](#-generating-test-data)
13. [Environment variables](#-environment-variables)
14. [Backpressure handling](#-backpressure-handling)
15. [Future improvements](#-future-improvements)

---

## 🤔 What is this?

Imagine you run a website with 10 services — a database, an API, a cache, a queue, etc. When something breaks, **hundreds of error signals** fire at once. Without a system like this, your team gets flooded with duplicate alerts and has no structured way to track what happened or why.

**IMS solves this by:**

1. Accepting thousands of failure signals per second
2. **Grouping** signals from the same component into a single incident (debouncing)
3. Tracking the incident through a structured lifecycle: Open → Investigating → Resolved → Closed
4. **Blocking closure** until a full Root Cause Analysis is written
5. Automatically calculating how long the incident took to fix (MTTR)
6. **Scanning any URL** for health issues and creating incidents automatically

This is how real companies like PagerDuty, OpsGenie, and Datadog work internally.

---

## 🗺️ How it works — the big picture

```mermaid
graph TB
    subgraph "External World"
        SYS[Your Systems<br/>APIs · DBs · Queues]
        SCAN[URL Scanner<br/>Manual health check]
        CRAWL[Website Crawler<br/>Full site audit]
    end

    subgraph "Ingestion Layer"
        API[FastAPI<br/>POST /signal]
        RL[Rate Limiter<br/>1000 req/sec]
        Q[Async Queue<br/>asyncio.Queue]
    end

    subgraph "Processing Layer"
        W[DebounceWorker<br/>Background task]
        DB_CHECK{Same component<br/>within 10s?}
    end

    subgraph "Storage Layer"
        PG[(PostgreSQL<br/>Incidents · RCAs · Attachments)]
        MG[(MongoDB<br/>Raw Signals · Scan History)]
        RD[(Redis<br/>Cache · Debounce TTL · Rate Limit)]
        MN[(MinIO<br/>File Attachments)]
    end

    subgraph "Frontend"
        UI[React Dashboard<br/>http://localhost]
        SCAN_UI[URL Scanner Page]
        CRAWL_UI[Website Crawler]
    end

    SYS -->|POST /signal| API
    SCAN -->|POST /scan| API
    CRAWL -->|POST /scan/crawl| API
    API --> RL
    RL -->|allowed| Q
    RL -->|429 Too Many| SYS
    Q --> W
    W --> DB_CHECK
    DB_CHECK -->|Yes — append| RD
    DB_CHECK -->|No — new incident| PG
    W --> MG
    W --> RD
    UI -->|GET /incident| PG
    UI -->|GET /incident/:id| MG
    SCAN_UI -->|POST /scan| API
    CRAWL_UI -->|POST /scan/crawl| API
```

---

## 🔄 Signal flow — step by step

```mermaid
sequenceDiagram
    participant SYS as Your System
    participant API as FastAPI
    participant RL as Rate Limiter
    participant Q as Queue
    participant W as Worker
    participant PG as PostgreSQL
    participant MG as MongoDB
    participant RD as Redis

    SYS->>API: POST /signal {component_id, error_message}
    API->>RL: Check rate limit
    alt Rate limit OK
        RL-->>API: allowed
        API->>Q: queue.put(signal)
        API-->>SYS: 202 Accepted
    else Too many requests
        RL-->>API: blocked
        API-->>SYS: 429 Too Many Requests
    end

    Note over Q,W: Background worker runs continuously

    W->>Q: queue.get()
    W->>MG: insert_signal(signal)  [with retry]

    alt Same component within 10 seconds
        W->>RD: reuse existing incident_id
    else New component or >10s gap
        W->>PG: INSERT INTO incidents  [with retry]
        W->>RD: cache_active_incident()
    end
```

### What is debouncing? 🧠

If the same component fires 500 signals in 10 seconds, you get **one** incident — not 500.

```mermaid
graph LR
    S1[Signal 1<br/>db_primary · 09:00:00]
    S2[Signal 2<br/>db_primary · 09:00:03]
    S3[Signal 3<br/>db_primary · 09:00:07]
    S4[Signal 4<br/>db_primary · 09:00:15]

    INC1[Incident INC-A3F7B2C1<br/>created at 09:00:00]
    INC2[Incident INC-D9E2F1A4<br/>created at 09:00:15]

    S1 -->|creates| INC1
    S2 -->|within 10s → appended to| INC1
    S3 -->|within 10s → appended to| INC1
    S4 -->|>10s gap → creates| INC2
```

---

## 🔄 Incident lifecycle

```mermaid
stateDiagram-v2
    [*] --> OPEN : Signal received
    OPEN --> INVESTIGATING : Team starts investigation
    INVESTIGATING --> RESOLVED : RCA submitted
    RESOLVED --> CLOSED : Incident formally closed

    note right of OPEN
        Severity assigned:
        P0 = Critical (db components)
        P2 = Warning (other components)
    end note

    note right of INVESTIGATING
        Team is actively
        working on the issue
    end note

    note right of RESOLVED
        RCA must include:
        • Category (dropdown)
        • Root cause
        • Fix applied
        • Prevention steps
        • End time (datetime picker)
    end note

    note right of CLOSED
        MTTR calculated:
        end_time - start_time
        Cannot close without RCA
    end note
```

### RCA Form fields (all required)

| Field | Type | Description |
|---|---|---|
| Incident Start Time | datetime picker | Pre-filled from incident data |
| Resolution Time | datetime picker | When was it fixed? |
| Root Cause Category | dropdown (10 options) | Infrastructure, DB, Cache, Network, etc. |
| Root Cause | textarea | Technical description of what broke |
| Fix Applied | textarea | What was done to resolve it |
| Prevention Steps | textarea | How to prevent recurrence |

**MTTR is calculated live** as you fill in the datetime pickers.

---

## 🔍 URL Scanner & Website Crawler

### Single URL scan — `POST /scan/`

Fetches one URL and runs 7 checks:

```mermaid
flowchart TD
    INPUT[You enter a URL] --> FETCH[Backend fetches the URL]
    FETCH --> C1{Reachable?}
    C1 -->|No| SIG1[🔴 P0: Connection failed]
    C1 -->|Yes| C2{HTTP Status?}
    C2 -->|5xx| SIG2[🔴 P0: Server error]
    C2 -->|4xx| SIG3[🟡 P2: Client error]
    C2 -->|2xx| C3{Response time?}
    C3 -->|> 5s| SIG4[🔴 P0: Critical slowness]
    C3 -->|> 2s| SIG5[🟡 P2: Slow response]
    C3 -->|< 2s| C4{SSL valid?}
    C4 -->|Invalid| SIG6[🔴 P0: SSL error]
    C4 -->|No HTTPS| SIG7[🟡 P2: No encryption]
    C4 -->|Valid| C5{Security headers?}
    C5 -->|Missing| SIG8[🟡 P2: Missing headers]
    C5 -->|Present| OK[✅ No issues]
    SIG1 & SIG2 & SIG3 & SIG4 & SIG5 & SIG6 & SIG7 & SIG8 --> PIPELINE[Signals → Incident Pipeline]
```

### Full website crawl — `POST /scan/crawl`

1. Fetches the root URL and parses all `<a href>` links
2. Discovers all internal pages via BFS (up to 50 pages)
3. Scans each page concurrently (5 at a time)
4. Pushes all findings as signals into the incident pipeline
5. Returns a full report with per-page breakdown

---

## 🧱 Tech stack explained

| Technology | What it does | Why this one? |
|---|---|---|
| **FastAPI** | All HTTP endpoints, async by default | Fastest Python web framework, auto-generates `/docs` |
| **PostgreSQL** | Incidents, RCAs, Attachments | Relational, transactional — perfect for structured data with FK relationships |
| **MongoDB** | Raw signals, scan history | Document DB — high write volume, flexible schema |
| **Redis** | Active incident cache, debounce TTL keys, rate limiting | In-memory = microsecond reads, TTL keys expire automatically |
| **MinIO** | File attachments (S3-compatible) | Self-hosted object storage, same API as AWS S3 |
| **asyncio.Queue** | Buffers signals between API and worker | Prevents API from blocking on slow DB writes |
| **Gunicorn + Uvicorn** | 4 worker processes in production | Gunicorn manages processes; Uvicorn handles async requests |
| **React + Vite** | Frontend dashboard | Fast build tool, component-based UI |
| **TailwindCSS** | Styling | Utility-first CSS, no separate stylesheet files |
| **nginx** | Serves built React app, proxies `/api` to backend | Production-grade static server + reverse proxy |
| **Docker Compose** | Runs all 6 services with one command | Reproducible environment on any machine |

---

## 📁 Project structure

```
incident-management/
│
├── backend/
│   ├── app/
│   │   ├── main.py                    ← App entry point, registers all routes
│   │   ├── api/routes/
│   │   │   ├── signal.py              ← POST /signal
│   │   │   ├── incident.py            ← GET/PATCH /incident
│   │   │   ├── rca.py                 ← POST /rca, GET /rca/categories
│   │   │   ├── scan.py                ← POST /scan, POST /scan/crawl
│   │   │   ├── attachment.py          ← POST /incidents/:id/attachments
│   │   │   └── health.py              ← GET /health
│   │   ├── services/
│   │   │   ├── ingestion_service.py   ← Rate limit → queue
│   │   │   ├── debounce_service.py    ← Should we create a new incident?
│   │   │   ├── incident_service.py    ← Create incident in PostgreSQL
│   │   │   ├── rca_service.py         ← Validate RCA + calculate MTTR
│   │   │   ├── alert_service.py       ← Dispatch P0/P2 alert strategy
│   │   │   ├── scan_service.py        ← Fetch URL + run 7 health checks
│   │   │   └── crawl_service.py       ← BFS link discovery + concurrent scanning
│   │   ├── workers/
│   │   │   └── consumer.py            ← DebounceWorker with retry logic
│   │   ├── models/
│   │   │   ├── incident.py            ← incidents table + Base (canonical)
│   │   │   ├── rca.py                 ← rcas table
│   │   │   └── attachment.py          ← attachments table
│   │   ├── schemas/
│   │   │   ├── incident_schema.py
│   │   │   ├── rca_schema.py          ← Includes ROOT_CAUSE_CATEGORIES list
│   │   │   ├── signal_schema.py
│   │   │   └── attachment_schema.py
│   │   ├── db/
│   │   │   ├── postgres.py            ← Async engine + SessionLocal
│   │   │   ├── mongo.py               ← Motor async client
│   │   │   └── redis.py               ← redis.asyncio client
│   │   ├── core/
│   │   │   ├── config.py              ← All env vars with defaults
│   │   │   ├── queue.py               ← Shared asyncio.Queue instance
│   │   │   ├── rate_limiter.py        ← In-memory or Redis rate limiter
│   │   │   └── metrics.py             ← signals/sec, queue size
│   │   ├── patterns/
│   │   │   ├── state/                 ← State Pattern: incident lifecycle
│   │   │   └── strategy/              ← Strategy Pattern: P0/P2 alerting
│   │   └── utils/
│   │       ├── logger.py
│   │       ├── constants.py
│   │       └── time_utils.py          ← MTTR calculation
│   ├── entrypoint.sh                  ← Waits for DB, creates tables, starts gunicorn
│   ├── Dockerfile                     ← Multi-stage build
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    ← Router + Navbar
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx          ← Incident list, stat cards, filters
│   │   │   ├── IncidentDetail.jsx     ← Lifecycle bar, signals, RCA form
│   │   │   └── ScanPage.jsx           ← Single URL scan + full website crawl
│   │   ├── components/
│   │   │   ├── Badge.jsx              ← SeverityBadge + StatusBadge
│   │   │   ├── IncidentCard.jsx       ← Card on dashboard
│   │   │   ├── RCAForm.jsx            ← Datetime pickers + category dropdown
│   │   │   ├── SignalList.jsx         ← Table of raw signals with expand
│   │   │   ├── QuickScan.jsx          ← Inline URL scan on incident detail
│   │   │   └── AttachmentList.jsx     ← File attachment display
│   │   ├── hooks/
│   │   │   └── useIncidents.js        ← Fetch + auto-refresh every 5s
│   │   └── api/
│   │       └── api.js                 ← All fetch() calls to backend
│   ├── nginx.conf                     ← SPA routing + /api proxy
│   └── Dockerfile                     ← Node builder → nginx runtime
│
├── infra/
│   └── docker-compose.yml             ← 6 services with health checks + volumes
│
├── scripts/
│   ├── simulate_signals.py            ← 1000 signals/sec simulator
│   └── seed_data.json                 ← Sample signal data
│
└── docs/
    ├── architecture.md                ← System architecture details
    ├── backpressure.md                ← Backpressure strategy
    ├── design_decisions.md            ← Why each decision was made
    └── prompts-and-spec.md            ← All prompts used (required by assignment)
```

---

## 🎨 Design patterns used

### 1. State Pattern — Incident Lifecycle

```mermaid
classDiagram
    class IncidentState {
        <<abstract>>
        +incident
        +next() IncidentState
        +prev() IncidentState
        +name() str
    }
    class OpenState { +next() InvestigatingState }
    class InvestigatingState { +next() ResolvedState }
    class ResolvedState { +next() ClosedState }
    class ClosedState { +next() self }

    IncidentState <|-- OpenState
    IncidentState <|-- InvestigatingState
    IncidentState <|-- ResolvedState
    IncidentState <|-- ClosedState
```

**Plain English:** Like a traffic light — Red can only go to Green, Green to Yellow. You can't skip states.

### 2. Strategy Pattern — Alerting

```mermaid
classDiagram
    class AlertStrategy { <<abstract>> +alert(incident) void }
    class P0AlertStrategy { +alert(incident) void }
    class P2AlertStrategy { +alert(incident) void }
    class AlertService { +alert_incident(incident) void }

    AlertStrategy <|-- P0AlertStrategy
    AlertStrategy <|-- P2AlertStrategy
    AlertService --> AlertStrategy : uses
```

**Plain English:** Like payment methods — credit card or PayPal, the checkout is the same. Only the strategy changes.

---

## 🗄️ Database responsibilities

```mermaid
graph TD
    subgraph PostgreSQL["🐘 PostgreSQL — Structured, transactional"]
        T1[incidents<br/>id · component_id · severity · status · start_time · end_time]
        T2[rcas<br/>id · incident_id · category · root_cause · fix_applied · prevention_steps · end_time]
        T3[attachments<br/>id · incident_id · rca_id · file_name · file_path · file_type]
        T1 -->|one-to-one| T2
        T1 -->|one-to-many| T3
    end

    subgraph MongoDB["🍃 MongoDB — High-volume documents"]
        C1[signals<br/>component_id · timestamp · error_message · source_url · severity_hint]
        C2[scan_history<br/>url · scanned_at · status_code · response_time_ms · signals_generated]
        C3[crawl_history<br/>root_url · domain · pages_scanned · total_signals · duration_ms]
    end

    subgraph Redis["⚡ Redis — Fast ephemeral data"]
        K1[incident:INC-XXXX → JSON cache]
        K2[debounce:db_primary → TTL 10s]
        K3[signal_rate → counter resets/sec]
    end

    subgraph MinIO["📦 MinIO — Object storage"]
        B1[ims bucket<br/>incident_id/file_id/filename]
    end
```

---

## 📡 API reference

| Method | Endpoint | What it does |
|---|---|---|
| `POST` | `/signal/` | Ingest a failure signal (rate limited, 202 response) |
| `GET` | `/incident/` | List all incidents sorted by time |
| `GET` | `/incident/{id}` | Get incident + raw signals from MongoDB |
| `PATCH` | `/incident/{id}/status` | Transition incident state |
| `GET` | `/rca/categories` | Get valid root cause category options |
| `POST` | `/rca/{incident_id}` | Submit RCA, marks incident RESOLVED |
| `POST` | `/rca/close/{incident_id}` | Close incident (validates RCA completeness) |
| `POST` | `/incidents/{id}/attachments` | Upload file to MinIO |
| `POST` | `/scan/` | Scan a single URL (7 health checks) |
| `POST` | `/scan/crawl` | Crawl entire website (BFS + concurrent scan) |
| `GET` | `/scan/history` | Last 50 single URL scan results |
| `GET` | `/scan/crawl/history` | Last 20 website crawl results |
| `GET` | `/health/` | System health + live metrics |

Full interactive docs: **http://localhost:8000/docs**

---

## 🐳 Running the project

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- That's it. No Python, Node, or database installation needed.

### Start everything

```bash
git clone https://github.com/ManishKudtarkar/incident-management.git
cd incident-management
docker compose -f infra/docker-compose.yml up --build
```

First run takes ~3-5 minutes. Subsequent runs use cached layers and start in ~30 seconds.

### Access the services

| Service | URL | Notes |
|---|---|---|
| **Frontend** | http://localhost | React dashboard |
| **Backend API** | http://localhost:8000 | FastAPI |
| **API Docs** | http://localhost:8000/docs | Interactive Swagger UI |
| **MinIO Console** | http://localhost:9001 | user: `minio`, pass: `minio123` |

> ⚠️ Do NOT open `localhost:27017`, `localhost:5432`, or `localhost:6379` in your browser — those are database ports, not web apps.

### Stop everything

```bash
# Stop but keep data
docker compose -f infra/docker-compose.yml down

# Stop AND delete all data (fresh start)
docker compose -f infra/docker-compose.yml down -v
```

### Run in background

```bash
docker compose -f infra/docker-compose.yml up -d
docker ps                                                    # check status
docker compose -f infra/docker-compose.yml logs -f backend  # view logs
```

---

## 📊 Generating test data

### Option 1 — Signal simulator (recommended)

```bash
# 1000 signals in 1 second (default)
python scripts/simulate_signals.py

# Custom rate and duration
python scripts/simulate_signals.py --rate 500 --duration 3

# Full burst: 10,000 signals
python scripts/simulate_signals.py --burst
```

Generates realistic incidents like `db_primary`, `payment_service`, `auth_service` with real error messages. ~30% P0 (critical), ~70% P2 (warning).

### Option 2 — URL Scanner

1. Open http://localhost → click **🔍 Scanner**
2. Try `https://httpstat.us/500` → creates a P0 incident
3. Try `https://httpstat.us/503` → creates a P0 incident
4. Try `https://example.com` → creates a P2 (missing security headers)

### Option 3 — Website Crawler

1. Open http://localhost → **🔍 Scanner** → **🕷️ Full Website Crawl** tab
2. Enter any website URL
3. Set max pages (10–50)
4. Click **Crawl Website** — discovers all pages, scans each one, creates incidents

### Option 4 — Direct API call

```bash
curl -X POST http://localhost:8000/signal/ \
  -H "Content-Type: application/json" \
  -d '{"component_id": "payment_service", "timestamp": 1234567890.0, "error_message": "Database connection pool exhausted"}'
```

---

## ⚙️ Environment variables

All in `backend/.env` (not committed — see `.gitignore`). Defaults work with Docker Compose.

| Variable | Default | What it does |
|---|---|---|
| `POSTGRES_URI` | `postgresql+asyncpg://postgres:postgres@postgres:5432/ims` | PostgreSQL connection |
| `MONGO_URI` | `mongodb://mongo:27017` | MongoDB connection |
| `MONGO_DB` | `ims` | MongoDB database name |
| `REDIS_URI` | `redis://redis:6379/0` | Redis connection |
| `RATE_LIMIT` | `1000` | Max signals per second |
| `MINIO_ENDPOINT` | `minio:9000` | MinIO endpoint |
| `MINIO_ACCESS_KEY` | `minio` | MinIO access key |
| `MINIO_SECRET_KEY` | `minio123` | MinIO secret key |
| `MINIO_BUCKET` | `ims` | MinIO bucket name |
| `ALLOWED_ORIGINS` | `*` | CORS origins (set to your domain in production) |

---

## ⚡ Backpressure handling

See `docs/backpressure.md` for full details.

```
Signal burst (10,000/sec)
        │
        ▼
  Rate Limiter ──── 429 Too Many Requests (excess traffic rejected)
        │
        ▼
  asyncio.Queue ──── Buffers signals in memory
        │
        ▼
  DebounceWorker ──── Processes asynchronously
        │
   ┌────┴────┐
   ▼         ▼
MongoDB   PostgreSQL  ←── Retry with exponential backoff (3 attempts)
```

Key points:
- API returns **202 Accepted** immediately — never blocks on DB writes
- Queue absorbs bursts — if DB is slow, signals wait in memory
- Worker retries failed writes up to 3 times with exponential backoff
- Rate limiter returns 429 if traffic exceeds 1000 req/sec

---

## 🚀 Future improvements

- [ ] WebSocket live updates — dashboard refreshes without polling
- [ ] Authentication & RBAC — login, roles (viewer, responder, admin)
- [ ] Incident escalation — auto-escalate P2 → P0 if unacknowledged
- [ ] Real notification integrations — PagerDuty, Slack, email webhooks
- [ ] Alembic migrations — versioned schema changes
- [ ] Kafka integration — replace asyncio.Queue for distributed processing
- [ ] Advanced analytics — MTTR trends, most-failing components, heatmaps
- [ ] API versioning — `/v1/`, `/v2/` for backward compatibility

---

## 👨‍💻 Author

**Manish Kudtarkar**  
B.Tech CSE (Big Data Analytics)  
GitHub: [ManishKudtarkar/incident-management](https://github.com/ManishKudtarkar/incident-management)

---

## 📄 License

MIT — free to use, modify, and distribute.
