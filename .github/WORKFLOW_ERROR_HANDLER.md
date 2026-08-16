# Workflow Error Handler

## What it does

- `build.yml` now prepares the archived app in a temporary workspace, restores the committed npm metadata, validates the Node.js version, and uploads the real Vite build output from `dist/`.
- `workflow-validation.yml` lint-checks every workflow with `actionlint`, verifies required Node.js files exist, installs dependencies, and confirms the build output directory is created on Node.js 18 and 20.
- `workflow-monitor.yml` watches failed `Build and Test` and `Workflow Validation` runs, stores a failure report artifact, summarizes the failure in the workflow run, optionally posts a webhook notification, and opens a GitHub issue for recognized recurring errors.

## Common issues handled automatically

1. **Missing repository lockfile**
   - Root `package.json` and `package-lock.json` are committed so npm cache restore can succeed.
2. **Archived app layout**
   - Build and validation workflows automatically extract `pack-pulse-drops (7).zip` into a clean temporary workspace before running npm commands.
3. **Missing build artifact path**
   - Workflows now verify the Vite `dist/` directory exists before uploading artifacts.
4. **Missing `test` script**
   - The build workflow skips tests when `package.json` does not define a `test` script, instead of failing with `npm ERR! Missing script: test`.

## Optional notifications

Set the repository secret `WORKFLOW_FAILURE_WEBHOOK_URL` to receive a JSON POST notification whenever the monitor detects a failed run. If the secret is not configured, the workflow still creates the failure summary and any matching GitHub issue.

## Common issue signatures that create GitHub issues

- Missing or unreadable `package-lock.json`
- Missing archived application files or required npm metadata
- Missing build output directory
- Missing required npm scripts
