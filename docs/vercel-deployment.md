# Vercel Deployment

This repo includes a root `vercel.json` for the Vercel-hosted frontend.

## Current Deployment Direction

- Current live app: `https://dispatch-arc.vercel.app`
- Current product direction: Arc Testnet, Circle tooling, USDC, Dispatch Nano

Do not deploy production unless the user explicitly requests it.

## Vercel Settings

Use these settings when importing the GitHub repo into Vercel:

- Repository: `https://github.com/Dtwosam/dispatch-app`
- Framework preset: Other
- Root directory: leave as repository root
- Build command: `npm --workspace apps/web run build:static`
- Output directory: `apps/web/.vercel-static`
- Install command: `npm install`

The root `vercel.json` contains:

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

Use `.env.example` for Arc/Circle/USDC variable names. Do not add secrets to docs.

## CLI Deployment

Local build only:

```bash
npm install
npm --workspace apps/web run build:static
```

Production deployment must be explicitly requested before running any deploy command.

## Post-Deployment Checks

After an explicitly requested deployment returns a URL, open:

```text
https://dispatch-arc.vercel.app/
https://dispatch-arc.vercel.app/agents
https://dispatch-arc.vercel.app/post-task
https://dispatch-arc.vercel.app/dashboard
```

Then update docs only with the actual successful URL. Do not add guessed URLs.
