# lsjm-scam-platform

Let Scams Just Miss (LSJM) is an explainable AI platform that evaluates scam risks in messages and URLs.  
It generates risk scores, identifies suspicious signals, and provides clear explanations and safer action suggestions to help users avoid potential scams.

Detect scams. Understand the risk. Stay safe online.

---

## Problem

Online scams are increasing rapidly, especially with the rise of AI-generated content, phishing messages, and fake websites.  
Many users struggle to recognize suspicious content while browsing, clicking links, or reading messages.

Current solutions often:
- only block known scam websites
- lack explanations for why something is dangerous
- fail to detect newly generated scam content

Users need a system that can **analyze content in real time and explain potential scam risks clearly**.

---

## Solution

LSJM provides an explainable scam risk detection platform.

The system analyzes messages and URLs, identifies suspicious patterns, and generates a **risk score** with explanations.

Key features:



Instead of simply flagging content, LSJM explains **why something may be risky**, helping users make safer decisions.

---

## How It Works

1. A user submits a message or URL.
2. The system extracts relevant text content.
3. The backend analyzes the content using detection rules and AI-assisted evaluation.
4. Suspicious signals are identified.
5. A risk score and explanation are generated.
6. The user receives a clear warning and recommended actions.

---

## System Architecture

The platform consists of several components:

**Frontend / Client**
- Web interface and browser extension
- Collects messages, URLs, or webpage content from users

**Backend Service**
- Node.js + Express API
- Handles analysis requests from the frontend and extension

**Detection Engine**
- Rule-based scam pattern detection
- AI-assisted content evaluation

**Result Builder**
- Generates a unified risk report
- Provides explanations and advice

### Data Flow

User Input  
→ Content Extraction  
→ Backend Analysis  
→ Signal Detection  
→ Risk Score Generation  
→ Result Explanation

---

## Example Analysis Result

Example API response:

```json
{
  "riskScore": 82,
  "riskLevel": "high",
  "signals": [
    "urgent request"
  ],
  "reasons": [
    "The message asks the user to act urgently."
  ],
  "advice": [
    "Do not click suspicious links."
  ]
}
```

---

## Tech Stack

**Backend**
- Node.js + TypeScript + Express
- pnpm (workspace)

---

## Project Structure

```
lsjm-scam-platform/
├── backend/                 # Node + Express API (serves frontend)
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── frontend/                # Web UI (HTML, CSS, JS)
│   ├── index.html
│   ├── css/
│   └── js/
├── package.json
├── pnpm-workspace.yaml
└── .env.example
```

---

## Setup

**Prerequisites:** Node.js >= 18, pnpm

```bash
# Install dependencies
pnpm install

# Backend
pnpm backend:dev      # Development server
pnpm backend:build    # Build (compile + copy rules)
pnpm backend:start    # Run production build
```

Copy `.env.example` to `.env` and adjust if needed. Default port: 3000.

Open http://localhost:3000 for the web interface.

---

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/analyze-text` | Text analysis (skeleton) |
| POST | `/analyze-url` | URL analysis (skeleton) |

---

## Path Conventions

- **Imports:** `@/types/analysisTypes`, `@/analysis/textAnalyzer`, etc. (via `baseUrl` and `paths` in tsconfig)
- **File system:** `resolvePath()` in `utils/paths.ts` for loading rules; rules are copied to `dist/rules/` during build

---

## Team

Let Shade Just Move:

- Xingzhi Li (Icey)
- Ting Shen (Lena)
- Guangyu Ma (Marcus)
- Xiaohan Jiang (Lindsey)