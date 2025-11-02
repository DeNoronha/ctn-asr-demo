# CTN Association Register - Member Portal

Member-facing portal for CTN Association Register members to manage their organization details and view their membership information.

## Configuration

This portal uses a **shared Vite configuration** located in `../shared/vite-config-base/`. This centralized approach:
- Eliminates configuration duplication across portals
- Ensures consistency in build settings and plugins
- Simplifies maintenance

For more details, see [shared/vite-config-base/README.md](../shared/vite-config-base/README.md).

## Available Scripts

### `npm start`

Runs the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm run build`

Builds the app for production to the `build` folder. It correctly bundles React in production mode and optimizes the build for the best performance.

### `npm run typecheck`

Runs TypeScript type checking without emitting output files.

### `npm test:e2e`

Runs end-to-end tests using Playwright.

## Environment Variables

Required environment variables:
- `VITE_AZURE_CLIENT_ID` - Azure AD Client ID
- `VITE_AZURE_TENANT_ID` - Azure AD Tenant ID
- `VITE_REDIRECT_URI` - Redirect URI for authentication
- `VITE_API_CLIENT_ID` - API Client ID
- `VITE_API_BASE_URL` - API Base URL

See `.env.example` for a template.

## Deployment

The portal is deployed to Azure Static Web Apps:
- **Production**: https://calm-pebble-043b2db03.1.azurestaticapps.net

Deployment is automated via Azure DevOps pipelines.
