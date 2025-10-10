# Student Nest - App (Server / Backend)

This folder contains the backend application for Student Nest used in the Infotsav 2025 hackathon.

## Overview
The App provides REST APIs, authentication, and database persistence used by the Website frontend. It includes:
- JWT-based authentication (students & owners)
- Location management APIs for map-based filtering
- MongoDB integration with geospatial support
- Payment and booking endpoints

This README explains how to run the backend locally, configure environment variables, run tests, and prepare the app for deployment.

---

## Prerequisites
- Node.js 18+ or compatible (use nvm to manage versions)
- pnpm / npm / yarn (the project uses npm by default)
- MongoDB (either local or Atlas)
- Google Cloud project with Maps APIs enabled (Maps JS, Geocoding, Places) — see docs for API key

---

## Quick Start (Development)

1. Install dependencies

```bash
cd /Users/ronakkumarsingh/Desktop/Optimzing/student-nest-Infotsav/App
npm install
```

2. Create environment variables

Copy the example env (the deploy script created `.env.example`) to `.env.local` and fill values:

```bash
cp .env.example .env.local
# Edit .env.local and provide your values
```

Important env values:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET`, `JWT_REFRESH_SECRET` - JWT secrets
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Google Maps API key (for frontend maps)
- `SENDGRID_API_KEY` (if email features required)

3. Start the server

```bash
npm run dev
```

Open your terminal to see the server listening log (default `http://localhost:3000`).

---

## Testing
- Unit and integration tests (if present) can be run with:

```bash
npm test
# or
npm run test:unit
```

- There are also integration scripts in `/scripts` (in the Website project) such as `test-map-integration.js` and `test-map-system-comprehensive.js` which require a running server and a valid JWT token.

---

## API Documentation
API routes are located under `src/app/api/` (or `src/routes` depending on structure). See `docs/` at project root for API details, examples and testing instructions.

Key routes for map system:
- `GET /api/student/locations` - fetch saved locations
- `POST /api/student/locations` - save new location
- `PATCH /api/student/locations` - update current location
- `DELETE /api/student/locations/:id` - remove location

Authentication: use `Authorization: Bearer <token>` header for protected endpoints.

---

## Deployment Notes
- Ensure `.env` values in production are set via your platform (Vercel, Heroku, or your VPS).
- Do NOT commit secrets into Git.
- Create appropriate indexes in MongoDB for geospatial queries (2dsphere on coordinates field).

---

## Troubleshooting
- Map loads as black or errors with `InvalidKeyMapError`: verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, enable billing and required APIs in Google Cloud Console. See `/docs/FIX_GOOGLE_MAPS_API_KEY.md`.
- 401 Unauthorized: check the JWT token, login flow and user role.

---

## Hackathon / Git Workflow
Follow the repository-level workflow created in the deployment script. Typical commands:

```bash
# create feature branch
git checkout -b feat/your-feature

# stage and commit
git add .
git commit -m "feat: Short description\n\nLonger description..."

git push origin feat/your-feature
```

Use the PR template (`PR_TEMPLATE.md`) created by the deploy script when submitting your PR.

---

If you need help configuring or running the App, open an issue or ask a teammate. Good luck! 🎯
