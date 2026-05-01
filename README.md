# 🚨 Mission-Critical Incident Management System (IMS)
[Engineering_Assignment__Incident_Management_System.pdf](https://github.com/user-attachments/files/27279102/Engineering_Assignment__Incident_Management_System.pdf)

> A production-grade platform that watches your systems, groups failure signals into incidents, and enforces a full investigation + Root Cause Analysis before anything can be closed.
>
> Built with **FastAPI · React · PostgreSQL · MongoDB · Redis · Docker**

---

## 📖 Table of Contents

1. [What is this?](#-what-is-this)
2. [How it works — the big picture](#-how-it-works--the-big-picture)
3. [Signal flow — step by step](#-signal-flow--step-by-step)
4. [Incident lifecycle](#-incident-lifecycle)
5. [URL Scanner feature](#-url-scanner-feature)
6. [Tech stack explained](#-tech-stack-explained)
7. [Project structure](#-project-structure)
8. [Design patterns used](#-design-patterns-used)
9. [Database responsibilities](#-database-responsibilities)
10. [API reference](#-api-reference)
11. [Running the project](#-running-the-project)
12. [Generating test data](#-generating-test-data)
13. [Closing an incident](#closing-an-incident)
14. [Environment variables](#-environment-variables)
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

This is how real companies like PagerDuty, OpsGenie, and Datadog work internally.

---

## 🗺️ How it works — the big picture

```mermaid
graph TB
    subgraph "External World"
        SYS[Your Systems<br/>APIs · DBs · Queues]
        SCAN[URL Scanner<br/>Manual health check]
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
        PG[(PostgreSQL<br/>Incidents · RCAs)]
        MG[(MongoDB<br/>Raw Signals)]
        RD[(Redis<br/>Cache · Debounce TTL)]
    end

    subgraph "Frontend"
        UI[React Dashboard<br/>http://localhost]
        SCAN_UI[URL Scanner Page]
    end

    SYS -->|POST /signal| API
    SCAN -->|POST /scan| API
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
```

> **Key insight:** The frontend never writes data directly to the database. Everything goes through the API → Queue → Worker pipeline. This is what makes the system handle high load without crashing.

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
    W->>MG: insert_signal(signal)

    alt Same component within 10 seconds
        W->>RD: reuse existing incident_id
    else New component or >10s gap
        W->>PG: INSERT INTO incidents
        W->>RD: cache_active_incident()
    end
```

### What is debouncing? 🧠

Think of it like a smoke alarm. If smoke triggers the alarm 500 times in 10 seconds, you don't want 500 separate fire reports — you want **one** incident that says "there's a fire in the kitchen."

```mermaid
graph LR
    S1[Signal 1<br/>db_primary · 09:00:00]
    S2[Signal 2<br/>db_primary · 09:00:03]
    S3[Signal 3<br/>db_primary · 09:00:07]
    S4[Signal 4<br/>db_primary · 09:00:15]

    INC1[Incident INC000001<br/>created at 09:00:00]
    INC2[Incident INC000002<br/>created at 09:00:15]

    S1 -->|creates| INC1
    S2 -->|within 10s → appended to| INC1
    S3 -->|within 10s → appended to| INC1
    S4 -->|>10s gap → creates| INC2
```

---

## 🔄 Incident lifecycle

Every incident moves through exactly 4 states in order. You cannot skip states.

```mermaid
stateDiagram-v2
    [*] --> OPEN : Signal received
    OPEN --> INVESTIGATING : Team starts investigation
    INVESTIGATING --> RESOLVED : RCA submitted
    RESOLVED --> CLOSED : Incident formally closed
    CLOSED --> [*]

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
        • Root cause category
        • Root cause
        • Fix applied
        • Prevention steps
    end note

    note right of CLOSED
        MTTR calculated:
        end_time - start_time
    end note
```

### What is MTTR?

**Mean Time To Repair** — how long it took from when the incident started to when it was resolved. Calculated automatically when you submit the RCA.

```
MTTR = RCA end_time − Incident start_time
```

If your database went down at 2:00 PM and you fixed it at 2:45 PM, your MTTR is **45 minutes**.

---

## 🔍 URL Scanner feature

You can scan any URL directly from the frontend. The backend fetches it and runs 7 automated checks:

```mermaid
flowchart TD
    INPUT[You enter a URL] --> FETCH[Backend fetches the URL]
    FETCH --> C1{Reachable?}
    C1 -->|No| SIG1[🔴 P0 Signal: Connection failed]
    C1 -->|Yes| C2{HTTP Status?}
    C2 -->|5xx| SIG2[🔴 P0 Signal: Server error]
    C2 -->|4xx| SIG3[🟡 P2 Signal: Client error]
    C2 -->|2xx/3xx| C3{Response time?}
    C3 -->|> 5s| SIG4[🔴 P0 Signal: Critical slowness]
    C3 -->|> 2s| SIG5[🟡 P2 Signal: Slow response]
    C3 -->|< 2s| C4{SSL valid?}
    C4 -->|Invalid| SIG6[🔴 P0 Signal: SSL error]
    C4 -->|No HTTPS| SIG7[🟡 P2 Signal: No encryption]
    C4 -->|Valid| C5{Security headers?}
    C5 -->|Missing| SIG8[🟡 P2 Signal: Missing headers]
    C5 -->|Present| OK[✅ No issues]

    SIG1 & SIG2 & SIG3 & SIG4 & SIG5 & SIG6 & SIG7 & SIG8 --> PIPELINE[Signals enter the pipeline]
    PIPELINE --> INCIDENT[Incidents created on Dashboard]
```

---

## 🧱 Tech stack explained

| Technology | What it does in this project | Why this one? |
|---|---|---|
| **FastAPI** | Handles all HTTP requests. Async by default. | Fastest Python web framework. Auto-generates API docs at `/docs`. |
| **PostgreSQL** | Stores incidents and RCAs permanently | Relational DB — perfect for structured data with relationships (incident → RCA) |
| **MongoDB** | Stores raw signals | Document DB — signals have no fixed schema, high write volume |
| **Redis** | Caches active incidents, stores debounce TTL keys, rate limiting counters | In-memory = microsecond reads. Perfect for temporary fast-access data |
| **asyncio.Queue** | Buffers signals between the API and the worker | Prevents the API from blocking while the worker processes signals |
| **Gunicorn + Uvicorn** | Runs 4 worker processes in production | Gunicorn manages processes; Uvicorn handles async requests inside each |
| **React + Vite** | Frontend dashboard | Fast build tool, component-based UI |
| **TailwindCSS** | Styling | Utility-first CSS — no separate stylesheet files needed |
| **nginx** | Serves the built React app and proxies `/api` to the backend | Production-grade static file server + reverse proxy |
| **Docker Compose** | Runs all 6 services together with one command | Reproducible environment — works the same on every machine |
| **MinIO** | S3-compatible object storage | Future use: store RCA attachments, incident reports |

---

## 📁 Project structure

```
incident-management/
│
├── backend/                        ← Python FastAPI application
│   ├── app/
│   │   ├── main.py                 ← App entry point, registers all routes
│   │   │
│   │   ├── api/routes/             ← HTTP endpoints (what the frontend calls)
│   │   │   ├── signal.py           ← POST /signal  — receive a failure signal
│   │   │   ├── incident.py         ← GET /incident — list/view incidents
│   │   │   ├── rca.py              ← POST /rca     — submit root cause analysis
│   │   │   ├── scan.py             ← POST /scan    — scan a URL for issues
│   │   │   └── health.py           ← GET /health   — system health + metrics
│   │   │
│   │   ├── services/               ← Business logic (the "brain")
│   │   │   ├── ingestion_service.py  ← Rate limit check → push to queue
│   │   │   ├── debounce_service.py   ← Should we create a new incident?
│   │   │   ├── incident_service.py   ← Create incident in PostgreSQL
│   │   │   ├── rca_service.py        ← Validate RCA + calculate MTTR
│   │   │   ├── alert_service.py      ← Dispatch P0/P2 alert strategy
│   │   │   └── scan_service.py       ← Fetch URL + run 7 health checks
│   │   │
│   │   ├── workers/
│   │   │   └── consumer.py         ← Background worker: reads queue, creates incidents
│   │   │
│   │   ├── models/                 ← Database table definitions (SQLAlchemy ORM)
│   │   │   ├── incident.py         ← incidents table
│   │   │   ├── rca.py              ← rcas table
│   │   │   └── signal.py           ← Signal schema (MongoDB, not SQL)
│   │   │
│   │   ├── schemas/                ← Request/response shapes (Pydantic validation)
│   │   │   ├── incident_schema.py
│   │   │   ├── rca_schema.py
│   │   │   └── signal_schema.py
│   │   │
│   │   ├── db/                     ← Database connection setup
│   │   │   ├── postgres.py         ← SQLAlchemy async engine
│   │   │   ├── mongo.py            ← Motor async MongoDB client
│   │   │   └── redis.py            ← redis.asyncio client
│   │   │
│   │   ├── core/                   ← App-wide config and utilities
│   │   │   ├── config.py           ← Reads environment variables
│   │   │   ├── queue.py            ← The shared asyncio.Queue instance
│   │   │   ├── rate_limiter.py     ← In-memory or Redis rate limiter
│   │   │   └── metrics.py          ← Tracks signals/sec, queue size
│   │   │
│   │   ├── patterns/               ← Design patterns
│   │   │   ├── state/              ← State Pattern: incident lifecycle
│   │   │   │   ├── base_state.py
│   │   │   │   ├── open_state.py
│   │   │   │   ├── investigating_state.py
│   │   │   │   ├── resolved_state.py
│   │   │   │   └── closed_state.py
│   │   │   └── strategy/           ← Strategy Pattern: alerting
│   │   │       ├── alert_strategy.py  ← Abstract base
│   │   │       ├── p0_alert.py        ← Critical alert (PagerDuty-style)
│   │   │       └── p2_alert.py        ← Warning alert (Slack-style)
│   │   │
│   │   └── utils/
│   │       ├── logger.py           ← Structured logging setup
│   │       ├── constants.py        ← Status/severity string constants
│   │       └── time_utils.py       ← MTTR calculation helper
│   │
│   ├── entrypoint.sh               ← Creates DB tables, then starts gunicorn
│   ├── Dockerfile                  ← Multi-stage build (builder + slim runtime)
│   └── requirements.txt            ← Pinned Python dependencies
│
├── frontend/                       ← React application
│   ├── src/
│   │   ├── App.jsx                 ← Router + Navbar
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       ← Incident list with filters + stat cards
│   │   │   ├── IncidentDetail.jsx  ← Single incident view + RCA form + close action
│   │   │   └── ScanPage.jsx        ← URL scanner with results
│   │   ├── components/
│   │   │   ├── Badge.jsx           ← SeverityBadge + StatusBadge
│   │   │   ├── IncidentCard.jsx    ← Card shown on dashboard
│   │   │   ├── RCAForm.jsx         ← Root cause analysis form
│   │   │   └── SignalList.jsx      ← Table of raw signals
│   │   ├── hooks/
│   │   │   └── useIncidents.js     ← Custom hook: fetch + reload incidents
│   │   └── api/
│   │       └── api.js              ← All fetch() calls to the backend
│   │
│   ├── nginx.conf                  ← Serves SPA + proxies /api → backend
│   ├── Dockerfile                  ← Multi-stage: Node builder → nginx runtime
│   └── package.json
│
├── infra/
│   └── docker-compose.yml          ← Runs all 6 services with health checks
│
├── scripts/
│   ├── simulate_signals.py         ← Fires 1000 signals/sec for load testing
│   ├── rdbms_mcp_failure.json      ← Sample RDBMS outage followed by MCP failure
│   └── seed_data.json              ← Sample signal data
│
└── docs/
    ├── architecture.md
    ├── backpressure.md
    └── design_decisions.md
```

---

## 🎨 Design patterns used

### 1. State Pattern — Incident Lifecycle

**Problem:** An incident can only move through states in a specific order. You can't close an incident that hasn't been resolved. You can't resolve one that hasn't been investigated.

**Solution:** Each state is its own class. The state object knows what comes next and what came before. The incident just calls `state.next()`.

```mermaid
classDiagram
    class IncidentState {
        <<abstract>>
        +incident
        +next() IncidentState
        +prev() IncidentState
        +name() str
    }

    class OpenState {
        +next() InvestigatingState
        +prev() self
    }

    class InvestigatingState {
        +next() ResolvedState
        +prev() OpenState
    }

    class ResolvedState {
        +next() ClosedState
        +prev() InvestigatingState
    }

    class ClosedState {
        +next() self
        +prev() ResolvedState
    }

    IncidentState <|-- OpenState
    IncidentState <|-- InvestigatingState
    IncidentState <|-- ResolvedState
    IncidentState <|-- ClosedState
```

**In plain English:** Think of it like a traffic light. Red can only go to Green. Green can only go to Yellow. You can't skip from Red to Yellow.

---

### 2. Strategy Pattern — Alerting

**Problem:** P0 (critical) incidents need to page someone immediately. P2 (warning) incidents just need a Slack message. The alerting logic should be swappable without changing the rest of the code.

**Solution:** Define an abstract `AlertStrategy` interface. Swap in `P0AlertStrategy` or `P2AlertStrategy` at runtime based on severity.

```mermaid
classDiagram
    class AlertStrategy {
        <<abstract>>
        +alert(incident) void
    }

    class P0AlertStrategy {
        +alert(incident) void
        note: Pages on-call via PagerDuty
    }

    class P2AlertStrategy {
        +alert(incident) void
        note: Sends Slack notification
    }

    class AlertService {
        +alert_incident(incident) void
    }

    AlertStrategy <|-- P0AlertStrategy
    AlertStrategy <|-- P2AlertStrategy
    AlertService --> AlertStrategy : uses
```

**In plain English:** Think of it like a payment system. Whether you pay by credit card or PayPal, the checkout process is the same — only the payment method (strategy) changes.

---

## 🗄️ Database responsibilities

Each database is used for what it's best at:

```mermaid
graph TD
    subgraph PostgreSQL["🐘 PostgreSQL — Structured, relational data"]
        T1[incidents table<br/>id · component_id · severity · status · start_time · end_time]
        T2[rcas table<br/>id · incident_id · root_cause_category · root_cause · fix_applied · prevention_steps · end_time]
        T1 -->|one-to-one| T2
    end

    subgraph MongoDB["🍃 MongoDB — High-volume document storage"]
        C1[signals collection<br/>component_id · timestamp · error_message · incident_id]
        C2[scan_history collection<br/>url · scanned_at · status_code · response_time_ms]
    end

    subgraph Redis["⚡ Redis — Fast ephemeral data"]
        K1[incident:INC000001<br/>JSON cache of active incident]
        K2[debounce:db_primary<br/>TTL key — expires in 10s]
        K3[signal_rate<br/>Counter — resets every second]
    end
```

| Question | Answer |
|---|---|
| Why PostgreSQL for incidents? | Incidents have relationships (incident → RCA). SQL is perfect for this. |
| Why MongoDB for signals? | Signals arrive at 1000+/sec with no fixed schema. MongoDB handles this better. |
| Why Redis for debouncing? | Redis TTL keys expire automatically after 10s — perfect for the debounce window. |
| Why Redis for caching? | Reading from Redis takes ~0.1ms. Reading from PostgreSQL takes ~5ms. |

---

## 📡 API reference

| Method | Endpoint | What it does | Example |
|---|---|---|---|
| `POST` | `/signal/` | Ingest a failure signal | `{"component_id": "db_primary", "timestamp": 1234567890, "error_message": "Connection timeout"}` |
| `GET` | `/incident/` | List all incidents | Returns array of incidents sorted by time |
| `GET` | `/incident/{id}` | Get incident + its signals | Returns incident details + raw signals from MongoDB |
| `PATCH` | `/incident/{id}/status` | Transition incident state | `?new_status=INVESTIGATING` |
| `GET` | `/rca/categories` | List valid RCA categories | Used by the RCA form dropdown |
| `POST` | `/rca/{incident_id}` | Submit RCA, marks RESOLVED | `{"root_cause_category": "Network / DNS Issue", "root_cause": "...", "fix_applied": "...", "prevention_steps": "...", "end_time": "2026-05-01T14:32:00Z"}` |
| `POST` | `/rca/close/{incident_id}` | Close incident (requires complete RCA) | Validates RCA exists before closing |
| `POST` | `/scan/` | Scan a URL for issues | `{"url": "https://example.com"}` |
| `GET` | `/scan/history` | Last 50 scan results | Returns array of past scans |
| `GET` | `/health/` | System health + metrics | Returns `{"status": "ok", "metrics": {...}}` |

Full interactive docs: **http://localhost:8000/docs**

---

## 🐳 Running the project

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- That's it. No Python, Node, or database installation needed.

### Step 1 — Clone the repo

```bash
git clone <repo-url>
cd incident-management
```

### Step 2 — Start everything

```bash
docker compose -f infra/docker-compose.yml up --build
```

This single command:
1. Builds the Python backend image
2. Builds the React frontend image (with nginx)
3. Starts PostgreSQL, MongoDB, Redis, MinIO
4. Waits for all databases to be healthy before starting the backend
5. Creates database tables automatically and applies lightweight compatibility fixes for existing local data

First run takes ~3-5 minutes (downloading images + installing packages). Subsequent runs use cached layers and start in ~30 seconds.

### Step 3 — Open the app

| Service | URL | What you'll see |
|---|---|---|
| **Frontend** | http://localhost | React dashboard |
| **Backend API** | http://localhost:8000 | `{"message": "Incident Management System API"}` |
| **API Docs** | http://localhost:8000/docs | Interactive Swagger UI |
| **MinIO Console** | http://localhost:9001 | Object storage UI (user: `minio`, pass: `minio123`) |

> ⚠️ Do NOT open `localhost:27017` (MongoDB), `localhost:5432` (PostgreSQL), or `localhost:6379` (Redis) in your browser — these are database ports, not web apps.

### Step 4 — Stop everything

```bash
# Stop but keep data
docker compose -f infra/docker-compose.yml down

# Stop AND delete all data (fresh start)
docker compose -f infra/docker-compose.yml down -v
```

### Running in background (detached mode)

```bash
# Start in background — terminal stays free
docker compose -f infra/docker-compose.yml up -d

# Check if everything is running
docker ps

# View logs
docker compose -f infra/docker-compose.yml logs -f backend
```

---

## 📊 Generating test data

### Option 1 — URL Scanner (easiest)

1. Open http://localhost
2. Click **🔍 URL Scanner** in the navbar
3. Try these URLs to generate different types of incidents:

| URL | What happens |
|---|---|
| `https://httpstat.us/500` | Creates a P0 incident (server error) |
| `https://httpstat.us/503` | Creates a P0 incident (service unavailable) |
| `https://httpstat.us/404` | Creates a P2 incident (not found) |
| `https://httpstat.us/200` | No incident (healthy) |
| `http://example.com` | P2 incident (no HTTPS) |

### Option 2 — Signal simulator script

Fires 1000 signals/second for 10 seconds (10,000 total signals):

```bash
# Make sure Docker is running first, then:
python scripts/simulate_signals.py
```

After it runs, refresh the dashboard — you'll see multiple incidents created from different components.

### Option 3 — Manual API call

```bash
# Send a single signal using curl
curl -X POST http://localhost:8000/signal/ \
  -H "Content-Type: application/json" \
  -d '{"component_id": "payment_service", "timestamp": 1234567890.0, "error_message": "Database connection pool exhausted"}'
```

Or use the Swagger UI at http://localhost:8000/docs to send requests interactively.

### Sample stack failure JSON

For the assignment sample-data requirement, use:

```text
scripts/rdbms_mcp_failure.json
```

It mocks a chained incident: PostgreSQL/RDBMS outage, API degradation, then MCP server/tool-context failures.

---

## Closing an incident

1. Open an `OPEN` incident from the dashboard.
2. Click **Start Investigating**.
3. Fill in the RCA form, including the root cause category, and submit it.
4. The incident moves to `RESOLVED`.
5. Click **Close Incident** to call `/rca/close/{incident_id}` and move it to `CLOSED`.

The backend refuses to close an incident unless a complete RCA exists.

---

## ⚙️ Environment variables

All configuration lives in `backend/.env`. The defaults work out of the box with Docker Compose.

| Variable | Default | What it does |
|---|---|---|
| `POSTGRES_URI` | `postgresql+asyncpg://postgres:postgres@postgres:5432/ims` | PostgreSQL connection string |
| `MONGO_URI` | `mongodb://mongo:27017` | MongoDB connection string |
| `MONGO_DB` | `ims` | MongoDB database name |
| `REDIS_URI` | `redis://redis:6379/0` | Redis connection string |
| `RATE_LIMIT` | `1000` | Max signals per second |
| `QUEUE_TYPE` | `memory` | Queue backend (`memory` = asyncio.Queue) |
| `ALLOWED_ORIGINS` | `*` | CORS allowed origins (set to your domain in production) |

---

## 🚀 Future improvements

- [ ] **WebSocket live updates** — dashboard refreshes automatically without polling
- [ ] **Authentication & RBAC** — login system, different roles (viewer, responder, admin)
- [ ] **Incident escalation** — auto-escalate P2 → P0 if unacknowledged for X minutes
- [ ] **Notification integrations** — real PagerDuty, Slack, email webhooks
- [ ] **Advanced analytics** — MTTR trends, most-failing components, incident heatmaps
- [ ] **Kafka integration** — replace asyncio.Queue with Kafka for true distributed processing
- [ ] **API versioning** — `/v1/`, `/v2/` for backward compatibility
- [ ] **Database migrations** — Alembic for schema version control

---

## 👨‍💻 Author

**Manish Kudtarkar**
B.Tech CSE (Big Data Analytics)

---

## 📄 License

MIT — free to use, modify, and distribute.
