# PackPulseDrops

Trading Digital Cards application built with React.

## Project Structure

- `src/` - Source code
- `public/` - Static files
- `components/` - React components
- `build/` - Production build output

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
```

This creates a production build in the `build` folder.

### Testing

```bash
npm test
```

## Continuous Integration

This project uses **GitHub Actions** for automated builds and App Store distribution.

### App Store distribution workflow

The repository now includes `.github/workflows/app-store-distribution.yml`, which can run manually or on pushes to `main` to:

- Check out the code
- Set up Node.js 18 and Ruby
- Install Fastlane
- Run `fastlane build`
- Run `fastlane deliver`

Configure these GitHub Actions secrets before running it:

- `FASTLANE_APPLE_APPLICATION_IDENTIFIER`
- `FASTLANE_TEAM_ID`

For authentication, configure all of the following for API key authentication:

- `APP_STORE_CONNECT_API_KEY`
- `APP_STORE_CONNECT_API_KEY_ID`
- `APP_STORE_CONNECT_ISSUER_ID`

`APP_STORE_CONNECT_API_KEY` can be stored as either raw `.p8` content (including escaped `\n`) or base64-encoded `.p8` content.

Or configure both of the following for Apple ID authentication:

- `FASTLANE_USER`
- `FASTLANE_PASSWORD`

You will also need code-signing certificates and provisioning profiles available to Fastlane, either through additional secrets or a Fastlane-managed solution such as `match`.

The archived web app source also now includes a Capacitor iOS wrapper (`capacitor.config.ts` and `ios/`) so GitHub Actions can sync and build an iOS project before Fastlane uploads the resulting IPA.

## License

MIT
