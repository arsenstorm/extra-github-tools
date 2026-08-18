# Extra GitHub Tools

GitHub tools that are not part of the main GitHub interface.

## Features

Here are some of the features of the tools in this repository.

### Bulk Repository Transfer

Transfer many repositories at once to a new owner. You can also rename them with a prefix or suffix, and change visibility or archive state after the transfer.

### More maybe coming soon?

If you have any ideas for tools that you’d like to see, reach out to me and I’ll see what I can do!

## Running it yourself

You need [Bun](https://bun.sh) and a GitHub OAuth App.

1. Create an OAuth App at <https://github.com/settings/developers>. Set the callback URL to `<AUTH_URL>/api/auth/callback/github` (so `http://localhost:3000/api/auth/callback/github` for local dev).
2. Copy `.env.example` to `.env` and fill it in:
   - `AUTH_URL` – the public URL of the app.
   - `AUTH_SECRET` – a long random string (`openssl rand -base64 32`). It encrypts the session cookie.
   - `AUTH_TRUSTED_ORIGINS` – optional, comma-separated extra origins allowed to call the auth API.
   - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` – from the OAuth App.
3. `bun install`, then `bun run dev`.

The app asks for the `read:user`, `read:org` and `repo` scopes. `repo` is what lets it transfer repositories on your behalf.

### Deploying to Cloudflare Workers

All four variables are Worker secrets, so nothing environment-specific lives in `wrangler.jsonc`:

```sh
wrangler secret put AUTH_URL
wrangler secret put AUTH_SECRET
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
bun run deploy
```

CI also deploys every push to `main` once `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set as repository secrets.

### How sessions work

There is no database. The session and your GitHub token live in an encrypted cookie for up to seven days. Signing out clears the cookie but cannot revoke it, so keep `AUTH_SECRET` private and rotate it if you think it leaked.

## Development

```sh
bun run typecheck   # tsc
bun run check       # biome via ultracite
bun run test        # vitest
```

The pre-commit hook runs the formatter and the typecheck.

## License

This repository is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

<sub>Copyright © 2026 [Arsen Shkrumelyak](https://arsenstorm.com).</sub>
