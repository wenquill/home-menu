# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## AI recipe generation (optional)

The backend now supports generating a step-by-step recipe using AI from dish title, ingredients and optional description.

Set these environment variables before starting the server:

- OPENAI_API_KEY - required API key
- OPENAI_MODEL - optional model id (default: gpt-4o-mini)
- OPENAI_API_URL - optional endpoint override (default: https://api.openai.com/v1/chat/completions)

Quick setup:

1. Copy .env.example to .env
2. Set OPENAI_API_KEY in .env
3. Restart backend server (or npm run dev:full)
