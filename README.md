# 🌿 Venustree-V3 / Command

A high-performance, distributed proxy management and session interception dashboard built with **Next.js 16 (Turbopack)**, **Supabase SSR**, and **Tailwind CSS**.

![System Status](https://img.shields.io/badge/System-Operational-emerald?style=flat-square&labelColor=050505)
![Build](https://img.shields.io/badge/Build-Passing-blue?style=flat-square&labelColor=050505)
![Platform](https://img.shields.io/badge/Node-AitM_Core-blueviolet?style=flat-square&labelColor=050505)

## ⚡ Overview

Venustree is a centralized control plane designed for managing distributed data collection nodes. It provides real-time visibility into captured session data, health monitoring for remote targets, and a secure multi-tenant architecture for administrative teams.

### Core Features

- **Multi-Tenant Isolation:** Secure profile-based routing ensuring admins only access their assigned target data via unique `Tenant_ID`.
- **Real-time Data Stream:** Live synchronization with remote loot endpoints using Supabase Realtime and specialized Server Actions.
- **Session Recovery Engine:** Automatic TTL (Time-To-Live) calculation for captured cookies, featuring **Critical/Expiring** alerts to prevent session loss.
- **Super Admin Command Center:** Global oversight of all active nodes, pending access requests, and master data feed.
- **Pulse Monitoring:** Real-time "heartbeat" tracking for all authorized admins to monitor node activity.

## 🛠 Technical Stack

- **Framework:** Next.js 16 (App Router + Turbopack)
- **Security:** Supabase Auth (SSR Implementation)
- **Database:** PostgreSQL via Supabase
- **Animations:** Framer Motion (PopLayout transitions)
- **Icons:** Lucide React
- **Styling:** Tailwind CSS (Cyber-grid / Mono aesthetic)

## 🚀 Quick Start

### 1. Environment Configuration

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

2. Database Setup
   Execute the required schema in your Supabase SQL editor:

Ensure the profiles table exists with tenant_id, approved, and last_active columns.

Enable Row Level Security (RLS) policies for tenant isolation.

3. Installation
   npm install
   npm run dev

4. Production Build

npm run build

🔐 Security Architecture
Venustree utilizes a tiered authorization model:

Level 0 (Unauthenticated): Access restricted to /login and /register.

Level 1 (Pending): Authenticated but locked out of data streams until manual authorization.

Level 2 (Admin): Full access to tenant-specific data and session recovery tools.

Level 3 (Root): Global access to the Command / Center and administrative management.

📡 Session Health Logic
The system automatically categorizes captured data based on the Timestamp of interception:

FRESH: < 12 hours old.

STALE: 12-20 hours old.

CRITICAL: 20-24 hours old (Triggers Recovery_Required alert).

EXPIRED: > 24 hours (Visual de-prioritization).
