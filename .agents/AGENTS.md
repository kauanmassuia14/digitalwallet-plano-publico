# Workspace Coding Rules — DigitalWallet

## Frontend Development Rules

1. **Strict File Size Limits**:
   - No frontend code file (React/TypeScript, HTML, CSS, or Flutter/Dart) may exceed **400 lines**.
   - If a component grows near or beyond this limit, it must be split into sub-components or separate helper files.

2. **Componentization**:
   - Everything must be modular and reusable.
   - Avoid monolithic files. Break layouts down into components like buttons, modals, badges, cards, forms, tables, etc.

3. **Styling and Architecture**:
   - Avoid giant inline CSS blocks or embedded styles. Use clean design tokens, variables, or utility classes.
   - For web apps: componentize layouts and use TailwindCSS with clean structuring.
   - For Flutter apps: use modular folder-by-feature structure and clean widget separation.
