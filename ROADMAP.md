# AI-Based Identity Anomaly Detection System — Implementation Roadmap

**Team:** Hemanth Kumar KS, Urvashi Tanwar, Veenashree S T, Vishwanath Sanapur
**Guide:** Dr. Anitha A C
**Duration:** 8 Weeks

---

## Architecture Overview

```
Auth Logs → Preprocessing → Feature Engineering → Ensemble ML → Risk Score → Classification → Dashboard
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python FastAPI |
| Database | DuckDB |
| ML | scikit-learn (Isolation Forest, One-Class SVM, LOF, Elliptic Envelope) |
| Frontend | React + Vite + Tailwind CSS + Recharts |
| Deployment | Docker + docker-compose |

### Data Contract (DO NOT CHANGE AFTER WEEK 1)

```
INPUT COLS:   user_id, timestamp, ip, country, device, browser, os, is_success
FEATURES (8): hour, is_weekend, is_night, device_change, country_change,
              failed_before_success, rapid_login_rate, login_frequency_today
THRESHOLDS:   High ≥ 70, Medium ≥ 40, Low < 40
WEIGHTS:      IF 0.35, LOF 0.25, SVM 0.20, EE 0.20
ATTACK TYPES: ImpossibleTravel, TOR, PasswordSpray, ServiceAbuse, BruteForce, OffHours
```

---

## Week 1 — Project Scaffold + Data Generator

### Goal
Working project skeleton with a synthetic auth log generator.

### Tasks

1. **Create directory structure**
   - `backend/app/` — FastAPI application
   - `frontend/src/` — React application
   - `backend/requirements.txt`, `frontend/package.json`
   - `.gitignore` covering venv, node_modules, dist, .env

2. **Set up FastAPI backend**
   - `main.py` — FastAPI app factory with CORS middleware
   - `config.py` — Pydantic Settings (app name, db path, model weights, thresholds)
   - `run.py` — uvicorn entry point with hot reload

3. **Set up DuckDB**
   - `database.py` — Database class with table creation
   - Events table: user_id, timestamp, ip, country, city, device, browser, os, is_success, is_attack, attack_type, source
   - User profiles table: user_id, known_devices[], known_countries[], avg_login_hour, avg_logins_per_day, mfa_used
   - Alerts table: event_id, risk_score, severity, attack_type, status, response_action

4. **Define attack scenarios and personas**
   - `scenarios.py` — 6 attack scenarios with MITRE mappings, risk ranges, behavioral signatures
   - 8 personas: Alice Chen (Engineering), Bob Smith (DevOps), Charlie Davis (Management), Diana Martinez (Engineering), Eve Contractor (External), Backup Service (Infra), James Smith (Engineering), Admin Service (IT)

5. **Build synthetic log generator**
   - `generator.py` — AuthLogGenerator class with seed-based randomness
   - Normal events: within business hours, known devices, known countries
   - Attack events: country changes, device changes, night access, rapid logins
   - Configurable anomaly ratio (default 6%)

6. **Scaffold React frontend**
   - Vite + React + Tailwind CSS project
   - BrowserRouter with pages: Dashboard, Alerts, Investigation, Users, Analytics, MITRE, Reports
   - Sidebar component with navigation, TopNavbar
   - Empty page shells with proper layout

7. **Create initial API endpoints**
   - `GET /api/health` — health check + event count
   - `POST /api/generate` — generate and insert events
   - `GET /api/events` — paginated event listing

### Deliverables
- `python run.py` starts a server
- `POST /api/generate` produces 1000 events in DuckDB
- `GET /api/events` returns JSON
- Frontend shows layout shell with sidebar navigation

---

## Week 2 — Data Preprocessing Pipeline

### Goal
Raw events → clean, normalized, structured data.

### Tasks

1. **Build Preprocessor class**
   - Parse mixed-format timestamps with python-dateutil
   - Normalize IPs to consistent dotted-decimal format
   - Encode categorical columns: country, device, browser, os (label encoding)
   - Handle missing values: default to "Unknown"
   - Flag and filter invalid rows (missing user_id, unparseable timestamp)
   - Output: cleaned DataFrame with no nulls

2. **Add preprocessing endpoint**
   - `GET /api/events/preprocessed` — returns cleaned event data
   - `POST /api/generate` now runs generate → preprocess → insert

3. **Write unit tests**
   - Test timestamp parsing with 5 different formats
   - Test missing value handling
   - Test 1000 events through pipeline → verify 0 nulls in output

4. **Build frontend base components**
   - `DataTable` — sortable, paginated table component
   - `SeverityBadge` — color-coded badge (critical=red, high=orange, medium=yellow, low=green)
   - `KpiCard` — metric display with label and value
   - `LoadingSkeleton` — animated loading placeholder
   - `GlassCard` — reusable card container with glass morphism style

5. **Set up mock data**
   - `mockData.js` — fallback data for frontend development when backend is offline
   - Mock KPIs, anomaly trends, risk distribution, alerts, recent logins

### Deliverables
- Preprocessor handles all edge cases
- Events table has no null values
- Frontend has all reusable components built and visible

---

## Week 3 — Feature Engineering + User Profiles

### Goal
Each event gets 8 behavioral features. Each user gets a behavioral baseline.

### Tasks

1. **Build FeatureExtractor class**
   - Input: cleaned event DataFrame, user state tracker
   - Output: DataFrame with 8 feature columns

   Feature extraction logic:
   - `hour` — extract hour from timestamp
   - `is_weekend` — true if Saturday or Sunday
   - `is_night` — true if hour < 6 or hour > 22
   - `device_change` — compare device against user's known devices list
   - `country_change` — compare country against user's known countries list
   - `failed_before_success` — for success events, check if same user had ≥2 failures in last 10 minutes
   - `rapid_login_rate` — count events from same user in last 5 minutes
   - `login_frequency_today` — count events from same user on same calendar day

2. **Build UserProfiler class**
   - For each user, compute:
     - `known_devices` — set of devices seen
     - `known_countries` — set of countries seen
     - `avg_login_hour` — circular mean of all login hours
     - `avg_logins_per_day` — total events / unique days
     - `mfa_compliance_rate` — fraction of events with MFA enabled
   - Store profiles in `user_profiles` table
   - Update profiles incrementally as new events arrive

3. **Add feature-related endpoints**
   - `GET /api/users` — all users with profile summaries
   - `GET /api/users/:id` — single user profile + recent events
   - `GET /api/features/importance` — feature distribution comparison (normal vs attack)

4. **Store features in events table**
   - Add 8 feature columns to events table
   - Update data flow: generate → preprocess → extract features → insert
   - Index features for fast querying

### Deliverables
- Every event in DB has all 8 feature values
- Every user has a baseline profile
- You can answer: "which users just logged in from a country they've never used?"

---

## Week 4 — Train 4 ML Models

### Goal
All 4 models trained, saved, and individually evaluated.

### Tasks

1. **Implement 4 model classes**
   - `IsolationForestModel` — sklearn.ensemble.IsolationForest (contamination=0.05, n_estimators=100)
   - `OneClassSVMModel` — sklearn.svm.OneClassSVM (nu=0.05, kernel='rbf', gamma='auto')
   - `LOFModel` — sklearn.neighbors.LocalOutlierFactor (contamination=0.05, novelty=True)
   - `EllipticEnvelopeModel` — sklearn.covariance.EllipticEnvelope (contamination=0.05, support_fraction=0.7)
   - Common interface: `.fit(X)`, `.predict(X)`, `.decision_function(X)`, `.save(path)`, `.load(path)`

2. **Training pipeline**
   - Extract 50K events with features from DuckDB
   - Split: 80% train, 20% test
   - Train all 4 models on the same training set
   - Save each as `.joblib` in `models/` directory
   - Train ensemble weights: use the weights specified in the data contract

3. **Individual model evaluation**
   - For each model, compute against test set:
     - AUC-ROC score
     - Precision at top 1%, 5%, 10% thresholds
     - False positive rate
     - Detection rate per attack type (which model catches which attack best)
   - Build model comparison table

4. **Hyperparameter tuning**
   - Test contamination values: [0.01, 0.03, 0.05, 0.1]
   - Test n_estimators for IF: [50, 100, 200]
   - Pick best parameters based on AUC-ROC

5. **Add model status endpoint**
   - `GET /api/models/status` — returns each model's training status and metrics

### Deliverables
- 4 trained `.joblib` files in `models/` directory
- Model comparison table showing AUC, precision, recall per model
- You know Isolation Forest performs best (typically 0.92-0.95 AUC)

---

## Week 5 — Ensemble Scoring + API + Dashboard

### Goal
Full pipeline runs end-to-end. Dashboard shows real data.

### Tasks

1. **Build EnsembleScorer class**
   - Load all 4 trained models
   - For each event, get anomaly score from each model
   - Min-max normalize each model's output to 0-1 range
   - Apply weights: IF 0.35, LOF 0.25, SVM 0.20, EE 0.20
   - Compute weighted sum, scale to 0-100 risk score
   - Threshold: ≥70 High, ≥40 Medium, <40 Low
   - If risk ≥ 30, mark `is_anomaly = True`

2. **Build anomaly type classifier**
   - Map feature patterns to attack types:
     - country_change + rapid_login → Impossible Travel
     - is_tor (inferred from IP range + device_change) → TOR Exit Node
     - failed_before_success + high rapid_login_rate → Password Spraying
     - is_night + service account → Service Account Abuse
     - failed_before_success + many attempts → Brute Force
     - is_night + high risk → Off-Hours Access
   - Fallback: "Suspicious Activity" if no pattern matches

3. **Build main API endpoints**
   - `GET /api/dashboard` — returns:
     - KPIs: total events, anomaly count, high-risk users, users monitored
     - anomalyTrend: events per day of week (normal vs anomaly)
     - riskDistribution: count per severity level
     - userActivity: events per hour of day (normal vs anomaly)
     - topReasons: top 7 anomaly reasons by count
     - recentLogins: last 20 events with status
     - alerts: top 15 alerts by risk score
   - `GET /api/alerts` — paginated alerts with severity, type, user, timestamp
   - `GET /api/alerts?severity=high` — filtered by severity
   - `GET /api/map` — location markers + impossible travel paths

4. **Build Dashboard page**
   - 4 KPI cards with animated counters (Total Events, Anomalies, High-Risk Users, Users Monitored)
   - Anomaly trend area chart (by day of week)
   - Risk distribution pie chart (Critical/High/Medium/Low)
   - User activity stacked bar chart (by hour, normal vs anomalous)
   - Top anomaly reasons horizontal bar chart
   - World map with location markers (risk-color coded)
   - Impossible travel arcs between countries
   - Alert feed sidebar (last 15 alerts with severity badges)
   - Recent logins table (sortable by risk score)

5. **Wire frontend to real API**
   - `useDashboardData` hook — polls `/api/dashboard` every 30 seconds
   - `useAlertData` hook — fetches `/api/alerts`
   - Handle loading, error, empty states gracefully
   - Fall back to mock data if backend is offline

6. **Update data generation flow**
   - `POST /api/generate` now: generate → preprocess → extract features → ensemble score → classify → insert
   - Running generate populates all columns in one step

### Deliverables
- Full working end-to-end system
- Open browser → see real KPIs, charts, map, alerts
- **First guide-demo ready**

---

## Week 6 — Investigation + Explainability

### Goal
Every alert is clickable. Each shows exactly why it was flagged.

### Tasks

1. **Build Explainer class**
   - Input: single flagged event + trained ensemble
   - For each of the 8 features, compute contribution:
     1. Set the feature to its population mean value
     2. Re-run the ensemble
     3. Measure risk score drop from original
     4. Bigger drop = more important feature
   - Normalize contributions to sum to 100
   - Output: `[{feature: "country_change", contribution: 38, color: "#ef4444"}, ...]`

2. **Build AI explanation text generator**
   - Template-based: "The ensemble model assigned a {severity} risk classification. Top contributing factors: {feature1} contributed {value1} points, {feature2} contributed {value2} points, {feature3} contributed {value3} points."
   - Include confidence note: "Confidence: high (ensemble agreement within ±12%)"

3. **Build investigation API endpoints**
   - `GET /api/alerts/:id` — alert detail with risk score, severity, user, IP, country, device, OS, feature contributions, AI explanation
   - `GET /api/investigation/:id` — full investigation view:
     - Alert summary card
     - Feature contribution bars (horizontal, sorted by contribution)
     - Event timeline (synthetic: last 5 events for same user)
     - User baseline profile (from Week 3)
     - AI explanation text
     - MITRE technique card with description
     - Action buttons: Acknowledge, Contain, Escalate

4. **Build InvestigationDrawer component**
   - Slide-over panel (right side, 600px wide)
   - Sections with collapsible headers
   - Feature contribution horizontal bar chart
   - Timeline stepper with severity-colored dots
   - AI explanation card with icon
   - User baseline table (avg login hour, known countries, devices)
   - Action buttons with confirmation dialogs

5. **Build AlertsPage**
   - Full-page table of all alerts
   - Columns: severity badge, user, attack type, risk score, timestamp, status
   - Sortable by any column
   - Filterable by severity, attack type, status
   - Click row → opens investigation drawer

6. **Build acknowledge/respond endpoints**
   - `POST /api/alerts/:id/ack` — mark as acknowledged, store timestamp
   - `POST /api/alerts/:id/respond` — take action (block/flag/monitor)

### Deliverables
- Click any alert → investigation drawer opens with full explanation
- Per-feature contribution bars visible
- AI explanation text explains why in plain English
- Action buttons work and persist to DB

---

## Week 7 — MITRE Mapping + Auto-Response + Evaluation

### Goal
Every alert is mapped to MITRE ATT&CK. Auto-response works. System is evaluated.

### Tasks

1. **Build MITREMapper**
   - Map each attack type to MITRE ATT&CK:
     - Impossible Travel → T1078 (Valid Accounts)
     - TOR Exit Node → T1090.003 (Proxy: Multi-hop Proxy)
     - Password Spraying → T1110.003 (Password Spraying)
     - Service Account Abuse → T1484 (Domain Policy Modification)
     - Brute Force → T1110 (Brute Force)
     - Off-Hours Access → T1078 (Valid Accounts)
   - Store mitre_id and mitre_name in alerts table
   - Include MITRE technique description and mitigation tips
   - Add MITRE info to investigation response

2. **Build auto-response logic**
   - risk ≥ 85 → High severity:
     - Action: "block" — simulate blocking access
     - Notify admin (log to alerts table)
   - risk ≥ 40 → Medium severity:
     - Action: "flag" — mark for analyst review
   - risk < 40 → Low severity:
     - Action: "monitor" — log and track for escalation
   - Auto-trigger on event generation

3. **Build evaluation pipeline**
   - Generate 10,000 events with ground truth labels (6% anomaly ratio)
   - Run full pipeline: generate → preprocess → features → ensemble → classify
   - Compute:
     - Accuracy: (TP + TN) / (TP + TN + FP + FN)
     - Precision: TP / (TP + FP)
     - Recall: TP / (TP + FN)
     - F1 Score: 2 * (Precision * Recall) / (Precision + Recall)
     - AUC-ROC: area under the receiver operating characteristic curve
   - Build confusion matrix
   - Generate ROC curve plot

4. **Per-attack-type evaluation**
   - Compute precision and recall for each attack type individually
   - Identify which attack types the system detects best/worst
   - Model comparison: which individual model performs best for each attack type

5. **Build MitrePage**
   - Grid of MITRE techniques
   - Each card shows: technique ID, name, alert count, severity distribution
   - Click a technique → filter alerts for that technique

6. **Build ReportsPage**
   - Display evaluation metrics
   - Model comparison table
   - ROC curve chart
   - Confusion matrix heatmap
   - Option to regenerate report

### Deliverables
- Precision, recall, F1, AUC numbers for your report
- ROC curve and confusion matrix saved as images
- Every alert has a MITRE technique ID
- Auto-response categorizes alerts on generation

---

## Week 8 — Dockerization + Demo + Submission

### Goal
System is polished, documented, and ready for submission.

### Tasks

1. **Docker setup**
   - `Dockerfile` — Python 3.12 slim image, install dependencies, copy backend + built frontend
   - `docker-compose.yml` — single service, port 8000, volume mount for data
   - `.dockerignore` — exclude venv, node_modules, .git

2. **Documentation**
   - `README.md`:
     - Project title and abstract
     - Team members and guide name
     - Setup instructions (docker-compose up)
     - Architecture diagram (ASCII or excalidraw)
     - Screenshots of all 7 pages
     - API documentation
     - Evaluation results summary
   - `CONTRACT.md` — data contract (features, thresholds, weights)
   - `ARCHITECTURE.md` — system architecture with data flow diagram

3. **Project report chapters**
   - Chapter 5: Implementation
     - Data generation and preprocessing
     - Feature engineering methodology
     - ML model training and ensemble approach
     - API and dashboard implementation
     - Include screenshots of each pipeline stage
   - Chapter 6: Results and Evaluation
     - Model comparison table
     - Ensemble performance metrics
     - Per-attack-type detection rates
     - ROC curve and confusion matrix
     - Dashboard screenshots with real data
   - Chapter 7: Conclusion and Future Work
     - Summary of achievements against objectives
     - Limitations encountered
     - Potential improvements (online learning, more data sources, real-time streaming)

4. **Demo video**
   - 5-7 minutes showing:
     - System startup
     - Event generation
     - Dashboard loading with real KPIs
     - Alerts appearing in the feed
     - Clicking an alert → investigation drawer with explanations
     - MITRE page and evaluation metrics
     - Summary of findings

5. **Final polish**
   - Handle all edge cases:
     - Empty database (return empty arrays, not errors)
     - No models trained (return 0 risk scores)
     - Invalid alert ID (return 404)
     - Backend timeout (frontend shows "offline" banner + mock data)
   - Add loading spinners everywhere
   - Add toast notifications for alert actions
   - Test full workflow end-to-end
   - Walk through demo with your guide
   - Fix feedback from guide

### Deliverables
- One `docker-compose up` runs everything
- README with setup + screenshots
- 5-min demo video
- Complete project report
- **Final submission ready**

---

## Timeline Summary

| Week | Focus | Key Deliverable |
|------|-------|-----------------|
| 1 | Scaffold + Generator | Working skeleton, synthetic data, `POST /api/generate` |
| 2 | Preprocessing | Clean data pipeline, unit tests, base UI components |
| 3 | Feature Engineering | 8 features per event, user profiles, `GET /api/users` |
| 4 | ML Training | 4 trained models, evaluation table, `.joblib` files |
| 5 | Ensemble + API + Dashboard | Full end-to-end pipeline, real dashboard, **first demo** |
| 6 | Investigation + Explainability | Click alerts → see why flagged, per-feature contributions |
| 7 | MITRE + Response + Evaluation | Precision/Recall/F1, ROC curve, MITRE mapping |
| 8 | Docker + Report + Submission | `docker-compose up`, README, report, demo video |

---

## DO's and DON'Ts

### DO
- Write the data contract on Day 1 and never change it
- Run `POST /api/generate` often — you need data to test every step
- Test each pipeline stage before moving to the next
- Commit working code at the end of every week
- Take screenshots of every page for your report as you build

### DON'T
- Don't skip testing — a 5-minute test saves 2 hours of debugging later
- Don't change the feature contract after Week 3 — models depend on exact column order
- Don't build the frontend before the API exists — you'll waste time guessing JSON shapes
- Don't leave the report for Week 8 — write chapter outlines as you go
- Don't over-engineer — this is an academic project, not production software
