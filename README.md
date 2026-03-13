# Intelligent DevOps — AI Security Scanner

AI-powered security scanner using Semgrep (code) and Checkov (IaC), with Gemini 2.5 Flash analysis and a React dashboard.

## DEMO



https://github.com/user-attachments/assets/36eb2153-aa4c-4007-b56d-fae5be21f92d


## Stack

- **Backend** — FastAPI, Semgrep, Checkov, Gemini 2.5 Flash, Mem0
- **Frontend** — React 18, TypeScript, Vite, Tailwind CSS, Supabase Auth

## Prerequisites

- Python 3.12+
- Node.js 18+
- [Gemini API key](https://aistudio.google.com/app/apikey)
- [Mem0 API key](https://app.mem0.ai)
- [Supabase project](https://supabase.com)

## Setup

**1. Clone and install backend**
```bash
pip install -r requirements.txt
pip install semgrep checkov
```

**2. Configure environment**

Create `.env` in the project root:
```
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash
MEM0_API_KEY=your_mem0_key
```

Create `frontend/.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**3. Install frontend**
```bash
cd frontend
npm install
```

## Running

**Terminal 1 — Backend**
```bash
python -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```

Open http://localhost:5173, log in with your Supabase account.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Check Gemini + Mem0 connectivity |
| POST | `/scan` | Scan a local file path |
| POST | `/scan-github` | Clone and scan a GitHub repo (Semgrep) |
| POST | `/scan-iac` | Clone and scan a GitHub repo (Checkov) |
| GET | `/scan-history` | Retrieve past findings from Mem0 |
| GET | `/scan-status/{id}` | Check status of a running scan |

## Common Issues

**Port in use**
```bash
netstat -ano | findstr :8000
taskkill /F /PID <pid>
```

**Semgrep / Checkov not found**
```bash
pip install semgrep checkov
```

**Frontend can't reach backend** — ensure backend is running on port 8000 and CORS is not blocked.
