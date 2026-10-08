# Repository Guidelines

## Project Structure & Module Organization

This repository is a Next.js App Router starter using React, TypeScript, and Tailwind CSS.

- `app/page.tsx`: home page; add routes under `app/` using Next.js file conventions.
- `app/layout.tsx`: root layout, metadata, and Geist font setup.
- `app/globals.css`: Tailwind import, theme variables, and global styles.
- `public/`: static assets, referenced with paths such as `/next.svg`.
- Root configuration includes `next.config.ts`, `tsconfig.json`, and `eslint.config.mjs`.

No dedicated test or shared component directories exist yet.

## Build, Test, and Development Commands

Use pnpm; `package.json` pins the package manager version.

- `pnpm install`: install dependencies.
- `pnpm dev`: start development at `http://localhost:3000`.
- `pnpm build`: create the production build and check TypeScript.
- `pnpm start`: serve the production build after building.
- `pnpm lint`: run ESLint with Next.js Core Web Vitals and TypeScript rules.

## Coding Style & Naming Conventions

Follow existing two-space indentation, double quotes, and semicolons in TypeScript. Keep strict typing enabled. Use PascalCase for React components and camelCase for functions and variables. Preserve framework filenames such as `page.tsx` and `layout.tsx`; the `@/*` alias points to the repository root. Prefer Tailwind utilities for component styling and global CSS for shared theme rules. ESLint is configured; no separate formatter is configured.

## Testing Guidelines

There is no test framework, test script, or coverage threshold configured. Run lint and build before submitting changes. For UI changes, manually verify affected routes, responsive layouts, and light/dark appearance. If adding automated tests, document the runner, command, and naming convention in the same change.

## Commit & Pull Request Guidelines

Git history contains only `first`, so no established commit convention exists. Use concise, imperative messages describing the change. Keep pull requests focused; include purpose, validation results, relevant issue links, and screenshots for visible UI changes.

## Security & Agent Tools

Keep secrets in ignored `.env*` files. Do not commit generated builds or dependencies.

Use `rtk` for supported noisy commands. Before exploration, check for `graphify-out/graph.json`; query it when present and verify against source. Ask before initializing a missing index; run `graphify update .` after code changes. Compress large eligible context with Headroom and retain retrieval hashes. Configure 9Router only on explicit request; never proxy Codex through Headroom.
