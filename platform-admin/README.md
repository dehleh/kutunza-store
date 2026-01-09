# Kutunza Platform Admin Dashboard

Administrative console for onboarding companies, monitoring tenants, and issuing platform-level actions against the Kutunza Sync Server.

## ✨ Highlights

- React 19 + Vite 6 for fast development
- Token-aware networking with automatic refresh + logout fallbacks
- Tailwind-based UI with Lucide icons
- Environment-driven API base URL for staging/production isolation

## 📋 Prerequisites

- Node.js 18+
- npm 10+
- Access to a running Sync Server (the value used for `VITE_API_URL`)

## ⚙️ Environment Setup

1. Copy the example file and edit the API origin:

```bash
cp .env.example .env
```

`.env`:

```env
VITE_API_URL="https://your-sync-server.example.com"
```

> Use the absolute origin (protocol + host) of the sync-server deployment. The Platform Admin UI automatically sends credentials so the server can manage refresh cookies.

## 🛠️ Local Development

```bash
npm install
npm run dev
```

The dev server starts on http://localhost:5173 and proxies API calls directly to `VITE_API_URL`.

## 🧱 Production Build

```bash
npm run build
npm run preview   # optional smoke test of the dist bundle
```

Deploy the contents of `dist/` to your hosting provider (Railway static service, S3 + CloudFront, etc.).

## 🔐 Session Refresh Flow

- On login the UI stores the short-lived access token in `localStorage`; the server sets a HttpOnly refresh cookie.
- All API calls go through a shared helper which retries once on HTTP 401 by calling `/api/platform/refresh` (credentials included).
- If refresh fails, the helper clears local storage and surfaces a “Session expired” error so the user can log in again.
- Clicking **Logout** calls `/api/platform/logout`, revoking the refresh token server-side before clearing local storage.

Ensure the sync server’s `ALLOWED_ORIGINS` list contains the deployed Platform Admin origin so cookies are accepted.

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview the built assets locally |
| `npm run lint` | Run ESLint (if configured) |

## 🧪 Troubleshooting

- **401 Unauthorized**: The sync server likely restarted or the refresh cookie expired. The UI should redirect to login automatically; if not, clear storage/cookies and reload.
- **CORS errors**: Double-check `ALLOWED_ORIGINS` on the sync server and ensure the Platform Admin URL is listed exactly.
- **Missing env**: Build fails with `VITE_API_URL` undefined if `.env` is not configured. Copy `.env.example` before building.

## 🤝 Contributions

PRs are welcome. Please run `npm run build` before submitting to ensure the refreshed auth flow remains intact.
