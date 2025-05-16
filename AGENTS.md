# Agent Instructions

This repository contains a TypeScript Discord bot.

## Project layout
- `src/` contains the bot source.
  - `handlers/` for command handlers
  - `middleware/` for request middleware
  - `lib/` for helper classes
  - `models/` for Mongoose models
- Code is written in TypeScript and compiled using `tsc` via `npm start`.

## Coding conventions
- Use **tabs** for indentation.
- Use **single quotes** for strings.
- Terminate statements with semicolons.
- Keep JSDoc style comments when documenting methods.
- Place new source files inside `src/`.

## Programmatic checks
Run `npm test` after making changes. The project currently has no tests so this will simply exit.

## Security
Secrets are stored in `secrets.json` (ignored by git). Do not commit credentials.
