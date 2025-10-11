# Member Portal - Phase 8.1

## Overview
Separate React application for member self-service.

## Setup

```bash
cd ~/Desktop/Projects/Data\ in\ Logistics/repo/ASR/member-portal
bash setup.sh
```

## Features (Planned)

### Basic (No Auth Required)
- View public member directory
- View own profile (read-only for now)
- Download tokens

### With Auth (Phase 4.1)
- Member login
- Edit profile
- Request membership changes
- Support tickets

## Architecture

```
member-portal/
├── public/
├── src/
│   ├── components/
│   │   ├── MemberLogin.tsx
│   │   ├── MemberProfile.tsx
│   │   ├── TokenDownload.tsx
│   │   └── SupportTicket.tsx
│   ├── services/
│   │   └── api.ts (shared with admin)
│   ├── App.tsx
│   └── index.tsx
├── package.json
└── README.md
```

## Port Configuration
- Admin Portal: `http://localhost:3000`
- Member Portal: `http://localhost:3001`

## Status
🔄 In Development - Starting Phase 8.1
