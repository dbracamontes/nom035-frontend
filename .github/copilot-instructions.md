Repository: nom035-frontend (React)

Purpose
- Frontend SPA for NOM-035: company & employee surveys, reporting UI, PDF viewing, authentication.

Primary languages & frameworks
- React (prefer TypeScript)
- Modern JS (ES2020+), Webpack/CRA or Vite depending on project
- Styling: Tailwind CSS or MUI (use what's already present)
- HTTP: axios/fetch

What I want from GitHub Copilot (instructions)
- You are an expert React developer and UI/UX specialist.
- Use modern React: functional components and hooks. Prefer TypeScript; if the repo is JS, propose TS incrementally.
- Follow clean architecture and component composition. Keep presentational and container concerns separated.
- Apply accessibility best practices: semantic HTML, ARIA attributes where needed, keyboard focus management and proper labels.
- Optimize for performance and readability: memoize expensive computations, split large components, prefer simple patterns.
- Use Tailwind CSS or MUI consistently with existing design tokens/themes. Do not introduce a new styling system.
- Keep changes small and focused. Prefer adding new reusable components over large refactors.
- Write reusable, well-documented components with clear prop types and defaults.
- Avoid overengineering; keep solutions simple and scalable.
- When adding pages or routes, follow existing routing/auth patterns and protected route guards.
- Do not hardcode secrets or API keys; use environment variables (REACT_APP_*) or runtime config.

Testing and verification
- Add unit tests for core logic and components (Jest + React Testing Library preferred).
- Run existing test scripts (npm test or yarn test) when adding code.
- For integration/UI checks, prefer lightweight tests and storybook stories when available.

Commit message style
- Use short imperative verbs: "Add X", "Fix Y", "Refactor Z". Mention related issue/PR if applicable.

Files & locations to inspect first
- src/: components/, pages/, api/, hooks/, context/, styles/, i18n/
- public/: index.html and static assets
- package.json, tsconfig.json or js config, tailwind.config.js or MUI theme files

When unsure, ask for context
- If changes affect business rules, scoring, or legal text, stop and request clarification.

Unsafe actions (do not perform)
- Do not commit secrets or real credentials.
- Do not replace the styling system or major tooling without explicit instruction.

If making edits
- Keep changes localized and include tests or storybook entries. Update README or add short comments for non-obvious behavior.

Thanks—make pragmatic, accessible, and test-backed UI improvements that preserve existing behavior unless asked for breaking changes.