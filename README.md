# Social Spark

Vite + React + Tailwind v4 with ESLint + Prettier.

## Start
```bash
npm install
npm run dev
```

## Lint and Format
```bash
npm run lint
npm run format
```

## Notes
- Tailwind v4 is loaded via `@import "tailwindcss";` in `src/index.css`.
- PostCSS is configured in `postcss.config.cjs` using `@tailwindcss/postcss`.
- No `tailwind.config.js` is required unless you customize the theme.
