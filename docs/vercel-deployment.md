# Vercel Deployment

This repo already includes a root `vercel.json` for the Vercel-hosted frontend.

## Current Deployment

- Frontend on Vercel: `https://dispatch-steel.vercel.app/`
- GenLayer Bradbury Testnet reviewer route: `https://dispatch-steel.vercel.app/genlayer-demo`

## Vercel Settings

Use these settings when importing the GitHub repo into Vercel:

- Repository: `https://github.com/Dtwosam/dispatch-genlayer.git`
- Framework preset: Other
- Root directory: leave as repository root
- Build command: `npm --workspace apps/web run build:static`
- Output directory: `apps/web/.vercel-static`
- Install command: `npm install`

The root `vercel.json` already contains:

```json
{
  "buildCommand": "npm --workspace apps/web run build:static",
  "outputDirectory": "apps/web/.vercel-static",
  "rewrites": [
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ]
}
```

## Environment Variables

Set this when the router is deployed and reachable for the environment you want reviewers to use:

```text
DISPATCH_API_BASE=https://<your-router-host>
```

If the router URL is environment-specific, configure `DISPATCH_API_BASE` for that deployment. The `/genlayer-demo` route remains the reviewer-facing GenLayer Bradbury Testnet route and should continue to explain the Intelligent Contract/evaluator marketplace flow clearly even before a reviewer signs a wallet transaction.

## CLI Deployment

From the repository root:

```bash
npm install
npm --workspace apps/web run build:static
npx vercel deploy
```

For production:

```bash
npx vercel deploy --prod
```

## Post-Deployment Checks

After Vercel returns a URL, open:

```text
https://dispatch-steel.vercel.app/
https://dispatch-steel.vercel.app/genlayer-demo
```

Then update:

- `README.md` live demo field
- `SUBMISSION.md` live demo field
- `docs/demo-flow.md` live demo field

Do not add a guessed Vercel URL before deployment succeeds. The current deployed frontend is already listed above; replace it only after a successful redeploy returns a different production URL.
