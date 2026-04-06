# CLAUDE.md

## What this is

`@noxecane/monday-dsl` — a type-safe Monday.com GraphQL query builder and DSL extracted from `tiktal-monday-exts` (`/Users/arewasmac/tiktal/tiktal-monday-exts`).

## Handover context

This library was extracted from the `internal/monday` subsystem of `tiktal-monday-exts`. The extraction was done on the `feat/monday-lib-decouple` branch of that repo. The key change that made extraction possible was decoupling `MondayFetchClient` from the app's env config — it now accepts `url` and `token` via constructor instead.

## What it is

A custom Monday.com GraphQL client with no dependency on any official Monday SDK. Core components:

- **MondayBoard** — base class for typed board access
- **BoardQuery** — chainable type-safe query builder
- **BoardMutation** — chainable mutation builder
- **MondayFetchClient** — HTTP client (`url`, `token` injected via constructor)
- **BoardTracker** — decorator-based webhook event routing
- **BoardAdmin** — administrative operations (webhooks, columns, users)

Decorator system: `@onCreate()`, `@onColumnChange()`, `@onStatusChange()`

## What still needs doing

- [ ] Write unit tests (query builder output, parser logic, error handling) — no real Monday.com boards needed
- [ ] Set up Jest config
- [ ] Initialize git and push to GitHub under noxecane org
- [ ] Publish to npm as `@noxecane/monday-dsl`
- [ ] Update `tiktal-monday-exts` to install and use this package instead of `src/internal/monday/`

## Dev commands

- `yarn build` — compile TypeScript to `dist/`
- `yarn watch` — watch mode
- `yarn test` — run Jest tests