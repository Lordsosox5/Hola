# طلباتي SD

طلباتي SD is an Arabic-first food and grocery delivery mobile app prototype.

## Run & Operate

- Use the `artifacts/tawsel: expo` workflow to start the Replit preview.
- `PORT=23658 pnpm --filter @workspace/tawsel run dev` — start the Expo/Metro development server manually.
- `pnpm --filter @workspace/tawsel run typecheck` — typecheck the mobile app.
- `pnpm run typecheck` — typecheck all workspace packages.
- `pnpm --filter @workspace/tawsel run build` — create a static Expo build.
- `pnpm --filter @workspace/tawsel run serve` — serve a previously created static build.

The Expo workflow uses Replit-provided runtime domains and `PORT=23658`; the checkout payment confirmation flow uses the shared API server and PostgreSQL database.

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- Mobile: Expo 54, React Native 0.81, Expo Router
- State and persistence: TanStack React Query and AsyncStorage
- Styling and localization: React Native styles, Arabic IBM Plex Sans fonts, RTL layout
- Supporting packages: Express API server, OpenAPI/Zod client packages, and Drizzle database package

## Where things live

- `artifacts/tawsel/app/` — Expo Router screens and the main app flow
- `artifacts/tawsel/components/` — shared mobile components and error boundary
- `artifacts/tawsel/constants/colors.ts` — mobile color tokens
- `artifacts/tawsel/assets/` — bundled food imagery and Arabic fonts
- `artifacts/tawsel/server/` — static-build server used by the production Expo artifact
- `artifacts/api-server/` — Express API service for health checks and payment submissions
- `artifacts/tawsel-admin/` — web dashboard for reviewing and confirming pending payments
- `lib/api-spec/openapi.yaml` — API contract source
- `lib/db/src/schema/` — database schema source

## Architecture decisions

- طلباتي SD remains an Expo/React Native app rather than being converted to a web-only React app.
- The app is rooted at the `/` preview path so the imported mobile artifact is the default preview.
- The development workflow supplies the port explicitly because imported workflow definitions do not inject artifact-managed environment variables.
- Arabic is the default product language and RTL is enabled at the app level; the app includes an English toggle for the supported bilingual flow.

## Product

The prototype includes onboarding, authentication screens, restaurant and grocery discovery, categories, product details, cart and checkout flows, order tracking, orders, favorites, account settings, saved addresses, payments, notifications, and support screens.

## User preferences

No project-specific preferences have been provided.

## Gotchas

- Run the Expo workflow from the workspace root so pnpm can resolve workspace packages.
- Keep the `PORT=23658` assignment when starting طلباتي SD manually.
- The Expo, API, and admin workflows share the API server; keep only the managed `artifacts/tawsel: expo` workflow for the mobile preview, and avoid starting the legacy `Tawsel Expo` workflow at the same time.
- Customer payment submissions are stored in PostgreSQL as pending records. The admin dashboard confirms them through the API, and the mobile app polls the submission status while the customer waits.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
