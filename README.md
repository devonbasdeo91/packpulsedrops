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
- Runs tests
- Uploads build artifacts

### App Store Connect Upload

The `.github/workflows/appstore-upload.yml` workflow builds the app and uploads it to App Store Connect using Fastlane. It triggers on pushes to `main` or manually via **workflow_dispatch**.

**Required GitHub Secrets** (Settings → Secrets and variables → Actions):

| Secret | Description |
|---|---|
| `APP_IDENTIFIER` | Your app's bundle ID, e.g. `com.yourcompany.packpulsedrops` |
| `FASTLANE_USER` | Your Apple ID email address |
| `ASC_KEY_ID` | App Store Connect API Key ID (from App Store Connect → Users → Keys) |
| `ASC_ISSUER_ID` | App Store Connect API Issuer ID |
| `ASC_PRIVATE_KEY` | App Store Connect API private key (.p8 file content, **base64-encoded**) |
| `ITC_TEAM_ID` | App Store Connect team ID (if you belong to multiple teams) |
| `TEAM_ID` | Apple Developer team ID |
| `IPA_PATH` | Path to the `.ipa` file to upload (e.g. `build/PackPulseDrops.ipa`) |

To base64-encode your `.p8` key file:
```bash
base64 -i AuthKey_XXXXXXXXXX.p8 | pbcopy
```
Then paste the result as the `ASC_PRIVATE_KEY` secret value.

## Docs & Support

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Base44 CLI command reference: [https://docs.base44.com/developers/references/cli/commands/introduction](https://docs.base44.com/developers/references/cli/commands/introduction)

Support: [https://app.base44.com/support](https://app.base44.com/support)
