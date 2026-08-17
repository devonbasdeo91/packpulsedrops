# Base44 Project

Use this repository to run and edit the app locally, then publish changes back through Base44.

Any change pushed to the repo will also be reflected in the Base44 Builder.

## Prerequisites

1. Clone the repository using the project's Git URL.
2. Navigate to the project directory.
3. Install dependencies: `npm install`.
4. Install the Base44 CLI: `npm install -g base44@latest`.

See the [Base44 CLI docs](https://docs.base44.com/developers/references/cli/get-started/overview) if you want to run Base44 commands directly.

## Run Locally

Run the full local development environment from the project root:

```bash
base44 dev
```

`base44 dev` starts the local Base44 development backend and, when this app is configured for it, also starts the frontend dev server for you. Use the frontend URL printed by the command.

For example, when the Base44 project config includes a `serveCommand`, `base44 dev` can launch the frontend too:

```json5
{
  "site": {
    "serveCommand": "npm run dev"
  }
}
```

In a Base44 project this lives in `base44/config.jsonc`.

## Run Only The Frontend

If you only want to work on the frontend against the hosted Base44 backend, run:

```bash
npm run dev
```

Open the local URL printed by Vite.

## Use The Hosted Backend

For frontend-only development, create or update `.env.local` in the project root:

```bash
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=https://your-app.base44.app
```

`VITE_BASE44_APP_ID` identifies the Base44 app.

`VITE_BASE44_APP_BASE_URL` tells the Base44 Vite plugin where to send local `/api` requests. Point it at your deployed Base44 app URL when you want the local frontend to use the hosted backend.

When you use `base44 dev`, the command injects the local Base44 values for you, so `.env.local` is mainly needed for frontend-only workflows.

## Publish Your Changes

After pushing your changes to git, open the Base44 dashboard and publish the app:

```bash
base44 dashboard open
```

## CI/CD – GitHub Actions

### Build and Test

The `.github/workflows/build.yml` workflow runs on every push/PR to `main` or `develop`. It:
- Installs Node.js dependencies via `npm ci`
- Builds the application with `npm run build`
- Uploads build artifacts

### App Store Connect Upload

The `.github/workflows/app-store-distribution.yml` workflow uploads your IPA to TestFlight via Fastlane. It runs on pushes to `main` and can also be started manually with **workflow_dispatch**.

**Required GitHub Secrets** (Settings → Secrets and variables → Actions):

| Secret | Description |
|---|---|
| `APP_STORE_CONNECT_API_KEY_KEY_ID` | App Store Connect API Key ID |
| `APP_STORE_CONNECT_API_KEY_ISSUER_ID` | App Store Connect API Issuer ID |
| `APP_STORE_CONNECT_API_KEY_KEY` | Raw `.p8` private key text including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` |

### Project Type and iOS Build Limitation

This repository is a standard web app built with React + Vite + JavaScript/TypeScript and Base44 integration. It is not a React Native, Cordova, Capacitor, or Flutter project.

There is currently no native iOS project (`.xcodeproj` or `.xcworkspace`) in this repository, so the GitHub workflow can upload an existing IPA but cannot build one.

### Chromebook-Friendly IPA Process (AppMyWeb + GitHub Actions)

1. Push your latest web code to `main`.
2. In AppMyWeb, create or update your iOS app build from this web project.
3. Configure Apple signing in AppMyWeb (bundle ID, team, certificate, provisioning profile, App Store distribution mode).
4. Build in AppMyWeb and download the generated `.ipa`.
5. Make the IPA available to this repository's workflow at `build/app.ipa` (or pass another path via `workflow_dispatch` input `ipa_path`).
6. Run `.github/workflows/app-store-distribution.yml` manually from GitHub Actions.
7. Confirm logs show:
   - `Validate App Store Connect secrets` passed
   - `Validate IPA exists` passed
   - Fastlane upload completed successfully

## Docs & Support

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Base44 CLI command reference: [https://docs.base44.com/developers/references/cli/commands/introduction](https://docs.base44.com/developers/references/cli/commands/introduction)

Support: [https://app.base44.com/support](https://app.base44.com/support)
