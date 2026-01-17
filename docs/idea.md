# Autonomous City Issue Resolution Agent: Master Vision & Architecture

## 1. Core Manifesto
**"Governance at the Speed of Software."**

This project is **NOT a chatbot**. It is an **autonomous, event-driven operating system for cities**. 
Traditional 311 systems differ from this platform in one fundamental way: **Autonomy**.
In the current world, a human receives a complaint, reads it, validates it, categorizes it, and assigns it.
In this system, **AI Agents** do all of that instantly, 24/7, without bias or fatigue.

### The Mission
To build a **city-scale, self-healing infrastructure network** where citizens act as real-time sensors, and the diverse fleet of AI agents acts as the nervous system—detecting, processing, and resolving issues faster than human bureaucracy ever could.

---

## 2. The Problem Context
Urban governance is plagued by:
- **Data Black Holes:** Citizens report issues but never hear back.
- **Manual Bottlenecks:** Every report sits in a queue waiting for a human eye.
- **Redundancy:** 50 people report the same pothole on a highway; 50 separate tickets are created.
- **Loss of Context:** "High Priority" is subjective. A pothole in a quiet alley is treated the same as one on a main arterial road.

**Result:** A reactive, slow, and opaque system that frustrates citizens and overwhelms administrators.

---

## 3. High-Level Architecture (The Solution)

### The Concept: "The Issue Packet"
Every interaction starts with an **Issue Packet**. This is an immutable, atomic unit of data containing:
- **Evidence:** Images (Primary), Video, Audio.
- **Context:** GPS, Compass Heading, Device Metadata, Timestamp.
- **Intent:** Optional user description (NLP enhanced).

This packet does not go to a database immediately. It enters the **Agent Pipeline**.

### The Autonomous Pipeline
Citizen Submission ➔ **Event Bus** ➔ **Agent Chain Reaction**

#### Stage 1: The Senses (Input & Validation)
1.  **👁️ Vision Agent (Active)**
    - **Role:** The "Eyes".
    - **Logic:** Uses YOLOv8 (Fine-Tuned) to scan the image.
    - **Actions:** 
        - Detects objects (Potholes, Garbage, Debris).
        - **Reject:** "This is a photo of a cat, not a road." (Spam Filter)
        - **Classify:** "Illegal Parking (Confidence 98%)".
    - **Output:** Annotated Image + Classification Metadata.

2.  **📍 Geo-Temporal Deduplication Agent (Active)**
    - **Role:** The "Memory".
    - **Logic:** "Have I seen this before?"
    - **Actions:** 
        - Queries geospatial index for issues within `X` meters in the last `Y` hours.
        - **Match:** Marks new issue as `DUPLICATE` of `Issue #123`.
        - **Merge:** "Issue #123 has 1 report. This is the 5th report. Increase urgency."
    - **Output:** Unique vs. Duplicate Flag + Cluster ID.

#### Stage 2: The Brain (Decision Making)
3.  **🚨 Priority Agent (Active)**
    - **Role:** The "Judge".
    - **Logic:** Context-aware severity assessment.
    - **Inputs:** Vision Confidence + Category + Location (e.g., Near School/Hospital) + Repeat Count.
    - **Actions:** 
        - Assigns `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.
        - Sets SLA Deadline (e.g., "Critical Pothole on Main St = 4 Hours").
    - **Output:** Priority Level + SLA Timer.

4.  **🔀 Routing Agent (Active)**
    - **Role:** The "Dispatcher".
    - **Logic:** Resource optimization.
    - **Actions:** 
        - Identifies Jurisdiction (Ward 5).
        - Identifies Department (Roads vs. Sanitation).
        - Checks Worker Availability (Load Balancing).
    - **Output:** Assignment (Member ID) + Department ID.

#### Stage 3: The Enforcers (Execution & Follow-up)
5.  **⏳ SLA Watchdog Agent (Future/Planned)**
    - **Role:** The "Timekeeper".
    - **Logic:** Runs asynchronously to monitor active timers.
    - **Actions:** 
        - Warnings: "2 hours remaining on Critical Issue #555".
        - **Trigger Escalation:** If SLA breached.

6.  **📈 Escalation Agent (Future/Planned)**
    - **Role:** The "Boss".
    - **Logic:** Authority Hierarchy.
    - **Actions:** 
        - If `SLA_BREACHED`: Reassign to Supervisor.
        - Send "Red Alert" to Admin Dashboard.
        - Publicly flag as "Overdue" (Transparency Pressure).

7.  **🔔 Notification Agent (Active)**
    - **Role:** The "Messenger".
    - **Logic:** Omnichannel delivery.
    - **Actions:** 
        - Telegram/Push Comp to Worker ("New Job").
        - Email/App Update to Citizen ("Your issue is being fixed").

8.  **🚁 Verification Agent (Future/Vision)**
    - **Role:** The "Auditor".
    - **Logic:** Trust but verify.
    - **Actions:** 
        - **Drone Dispatch:** Request drone flyover for validation.
        - **Worker Proof:** Analyze "After" photo uploaded by worker using Vision Agent (Comparison).
        - **Citizen Confirmation:** Ask reporter "Is this fixed?"

---

## 4. Technology Stack & Modular Design

The system is designed as a **Modular Monolith** (evolving into Microservices).

### Backend Structure (`/Backend`)
- **`api/`**: Stateless REST endpoints. Input/Output only.
- **`agents/`**: Pure logic. Each agent is a self-contained module.
    - `vision/`: Model interaction, inference logic.
    - `geo/`: Spatial queries, clustering interpretation.
    - `routing/`: Departments, rosters, load handling.
- **`core/`**: Shared infrastructure.
    - `event_bus.py`: The nervous system.
    - `flow_tracker.py`: State management for the visual UI.
- **`services/`**: Integration layers (Supabase, Geocoding, Notification providers).

### Data Layer
- **PostgreSQL + PostGIS**: The source of truth.
    - `Issues`: The central entity.
    - `Events`: Immutable log of every agent decision (Audit Trail).
    - `ClusteredLocations`: Heatmap data.
- **Supabase Storage**: 
    - Bucket: `city-issues`
    - Structure: `/{issue_id}/{original|annotated|proof}.jpg`

---

## 5. Future Roadmap & "Blue Sky" Vision

### Phase 2: Predictive Governance
- **Predictive Maintenance Agent:** Analyze patterns. "Potholes appear on Main St every March." Schedule preventive repairs.
- **IoT Sensor Fusion:** Integrate with Smart City sensors (overflowing bins transmit data directly to the pipeline, bypassing citizen reporting).

### Phase 3: Total Transparency via Blockchain
- **The Public Ledger:** Every valid issue and its resolution time is hashed and stored on a side-chain.
- **Result:** Proof of Governance. City officials cannot delete or hide ignored complaints.

### Phase 4: Gamification & Civic Reputation
- **Citizen Score:** Users who report accurate, verified issues earn "Civic Points".
- **Leaderboards:** "Top Reporter in Ward 9".
- **Incentives:** Points redeemable for tax credits or transit passes (Visionary).

---

## 6. Current Completed Status

As of today, the **MVP (Minimum Viable Platform)** is operational.

### ✅ What is Built (The Foundation)
1.  **Full Agent Pipeline (Async):**
    - **VisionAgent:** Active (YOLOv8n-trained). Detects & Annotates.
    - **GeoDeduplicateAgent:** Active. Links nearby issues.
    - **PriorityAgent:** Active. Assigns priority based on class/confidence.
    - **RoutingAgent:** Active. Assigns to departments/members.
    - **NotificationAgent:** Active (Mocked/Log-based).
2.  **Infrastructure:**
    - FastAPI Backend with Async SQLAlchemy.
    - Supabase Auth & Storage Integration.
    - Robust Event Bus & Flow Tracking.
3.  **Command Center UI (`flow.html`):**
    - Real-time visualization of the AI brain.
    - Side-by-Side Evidence (Original vs. AI).
    - Live Agent Decision Logs.
    - Complete User/Administrator Demo Flow.

### 🚧 What is Next to Build
1.  **SLA Watchdog:** Background cron to check overdue issues.
2.  **Escalation Logic:** The hierarchy handling.
3.  **Verification Loop:** Closing the loop with "After" evidence analysis.

---
### 7. Client Ecosystem Plan

#### 📱 Citizen Mobile App (The Reporter) ✅ IMPLEMENTED
*Goal: Enforce authenticity of data at the source.*

*   **Tech Stack:** React Native + Expo (TypeScript) - Located in `/User` directory.
*   **Authentication:** **Supabase Google OAuth Sign-In ONLY**. Eliminates anonymous spam. Links reports to a verified identity.
*   **Anti-Fraud Enforcement (The "Spot-Check" Protocol):**
    *   **Live Camera Enforced:** ✅ The app **restricts gallery access**. Users MUST capture the photo live in-app using `expo-camera`. This ensures the issue exists *now* and prevents repurposing old internet photos.
    *   **GPS Mandatory:** ✅ Users **cannot access capture screen** unless GPS/Location services are enabled on device. A dedicated screen prompts users to enable GPS before proceeding.
    *   **GPS Precision Lock:** ✅ Submission is blocked until GPS accuracy is `< 10 meters`. Real-time accuracy indicator shows current GPS status. Uses `expo-location` with BestForNavigation accuracy.
*   **Core Features:**
    *   **"Shoot & Leave":** ✅ Zero-friction reporting via camera capture screen with visual frame guides.
    *   **Live Tracking:** ✅ Real-time AI agent progress visualization showing each agent's decision (VisionAgent → GeoDeduplicateAgent → PriorityAgent → RoutingAgent → NotificationAgent).
    *   **My Reports:** ✅ Paginated list of user's reported issues with status filtering.
    *   **Issue Details:** ✅ Detailed view with original/annotated image toggle, priority badges, status timeline.
    *   **Gamification:** ✅ Profile screen with civic badges and contribution stats (placeholder data).
*   **UI/UX:**
    *   Premium dark theme with glassmorphism effects.
    *   Gradient buttons and cards.
    *   Animated GPS pulse indicator.
    *   Bottom tab navigation (Home, Reports, Profile).

**📁 Mobile App Structure (`/User`):**
```
src/
├── components/
│   ├── ui/ (Button, Card)
│   └── issues/ (IssueCard)
├── config/ (supabase.ts)
├── context/ (AuthContext.tsx)
├── navigation/ (AppNavigator.tsx)
├── screens/
│   ├── auth/ (LoginScreen)
│   ├── capture/ (CaptureScreen, ProcessingScreen)
│   ├── home/ (HomeScreen)
│   ├── issues/ (MyIssuesScreen, IssueDetailScreen)
│   └── profile/ (ProfileScreen)
├── services/ (issueService, locationService)
├── theme/ (colors, spacing, typography)
└── types/ (TypeScript interfaces)
```

**🚀 To Run Mobile App:**
```bash
cd User
npm install
npx expo start
```

#### 💻 Role-Based Web Portal (The Command Center)
*Goal: Granular control for the workforce.*

*   **Tech Stack:** React/Next.js (Admin Dashboard).
*   **Authentication:** Supabase Auth + RBAC (Role-Based Access Control).
*   **Roles & Permissions:**
    1.  **👑 Super Admin:** System configuration, onboarding new cities/zones.
    2.  **🏛️ City Administrator:**
        *   **God Mode:** Heatmap view of all city issues.
        *   **SLA Monitor:** Dashboard of breached deadlines.
        *   **Performance:** Analytics on Department/Worker efficiency.
    3.  **👷 Department Head:**
        *   View only issues assigned to their department (e.g., Sanitation).
        *   Reassign tickets manually if the AI makes a mistake.
        *   Manage worker shifts.
    4.  **🛠️ Field Worker (Mobile Web View):**
        *   **"My Tasks":** Simple list of assigned jobs sorted by proximity.
        *   **"Navigate":** One-click Google Maps deep link to the issue.
        *   **"Close Ticket":** **Mandatory 'Proof of Fix'**. Worker must upload an "After" photo to mark an issue resolved.

---
### 8. Current Completed Status (Updated)

#### ✅ Backend (Fully Operational)
- **Full Agent Pipeline:** Vision, Geo, Priority, Routing, Notification.
- **Server-Driven Progress:** Real-time timeline via SSE, covering initial "Locating" steps to final Notification.
- **Visual Confirmation Flow:** Handles "0 Issue Detected" cases by halting pipeline and requesting user manual review.
- **Non-blocking Architecture:** Heavy agent workloads run in background tasks for instant UI responsiveness.
- **Infrastructure:** FastAPI, Async SQLAlchemy, Supabase Auth & Storage.
- **Security:** OWASP-compliant headers, rate limiting (120/min), JWT verification with bcrypt password hashing.
- **Admin API:** Login, department CRUD, worker CRUD with password management.
- **Worker API:** Task list, start task, complete task with proof image upload.

#### ✅ Citizen Mobile App (Production Ready)
- **Tech:** React Native + Expo + TypeScript.
- **Security:** Mandatory GPS (<10m) & Live Camera (No Gallery), Supabase JWT Auth.
- **UX:** Server-driven "Processing" screen with granular, real-time agent feedback and animations.
- **Caching:** Local issue caching with 5-min expiry, force refresh button.
- **User-Specific:** Issues filtered by `user_id` in production mode.
- **Design:** Premium dark theme, glassmorphism, animated pulse indicators.

#### ✅ Admin & Worker Web Portal (Newly Built & Redesigned)
- **Tech:** Next.js 16.1.1 + TypeScript + Tailwind CSS.
- **Design:** Professional Government Theme (Light Mode, Clean UI, High Accessibility).
- **Authentication:** Email/password login with bcrypt hashing, JWT tokens.
- **Admin Features:**
    - Dashboard with stats (departments, workers, issues, pending)
    - Department management (SLA configuration)
    - Worker account creation with password & role assignment
    - Issue heatmap view (Visual density map)
- **Worker Features:**
    - Task list with priority badges and SLA deadlines
    - Google Maps navigation links
    - Task completion with mandatory proof image upload
- **Security:** Role-based routing (admin/worker), secure token storage.

#### 🚧 Next Steps
1. **Push Notifications:** Implement real push notifications for status updates
2. **Admin Issue Management:** Full CRUD for issues with reassignment
3. **Verification Loop:** AI comparison of "Before" and "After" photos

---
**Summary:** We have built the *Brain* (AI Pipeline), the *Eyes* (Vision Agent), the *Citizen Mobile App* (React Native), AND the *Admin/Worker Portal* (Next.js). The system is now a complete end-to-end solution for urban issue management.
