# Contributing

Thanks for your interest in improving Extra GitHub Tools.

## Getting started

You'll need [Bun](https://bun.sh) and a GitHub OAuth App. The README's
"Running it yourself" section walks through the OAuth App and `.env`.

```sh
bun install
bun run dev        # http://localhost:3000
```

## Before opening a pull request

Run the same checks CI runs:

```sh
bun run check      # biome lint + format, via ultracite
bun run typecheck  # tsc
bun run test       # vitest
bun run build      # vite build
```

The pre-commit hook runs the formatter and typecheck for you.

## Coding standards

Style is enforced by Biome through Ultracite. Formatting is not a matter of
opinion here; let the tooling handle it.

Commit messages are one line in the form `type(scope): message`, for example
`fix(transfer): stop double submit on review step`. Types: `security`,
`revert`, `fix`, `feat`, `refactor`, `perf`, `docs`, `test`, `chore`.

## Reporting issues

Use the issue templates for bugs and feature requests. For security issues, see
[`SECURITY.md`](./SECURITY.md).
