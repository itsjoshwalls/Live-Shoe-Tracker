Live Shoe Tracker
=================

Quick start to run locally:

1) Install dependencies

```powershell
npm install
```

2) Provide Firebase client config for the frontend. In Vercel/Netlify this is set as an env var; locally you can set it in your shell before running dev.

PowerShell example (replace path and adjust as needed):

```powershell
# Read the Firebase web app config JSON into the env var used by the frontend build
$env:VITE_FIREBASE_CONFIG_JSON = Get-Content 'C:\path\to\firebase-client-config.json' -Raw
# Optional: set the collection name to read
$env:VITE_FIRESTORE_COLLECTION = 'sneakers'
```

3) Start dev server

```powershell
# Optional: run preflight checks
pwsh -NoProfile -ExecutionPolicy Bypass -File ..\scripts\preflight.ps1 -App shoe-tracker

npm run dev
```

Notes
- The frontend expects `VITE_FIREBASE_CONFIG_JSON` to be a JSON string (the web app config object from Firebase). For deployment, set this environment variable in your hosting provider.
- The orchestration worker is in `scripts/orchestration_worker.py` and requires a Firebase Admin service account JSON in the `FIREBASE_SERVICE_ACCOUNT` env var.
- See `README-WORKER.md` for CI / GitHub Actions and worker details.

Quick note on `start` vs `dev`

- `npm run dev` starts the Vite development server with HMR (use while developing).
- `npm start` is configured to run `vite preview`, which serves the built app in a production-like preview mode. Run `npm run build` first if you want to preview the production build:

```powershell
npm run build
npm start
```
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
