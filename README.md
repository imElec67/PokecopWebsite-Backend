# Pokecop Blog API

Express + MongoDB backend for the Pokecop blog. Stores articles, authenticates
authors, accepts image uploads, and triggers a Cloudflare rebuild when published
content changes.

## Local setup

```bash
cd server
cp .env.example .env   # fill in the values
npm install
npm run seed -- author@pokecop.fr "Author Name" "a-strong-password"
npm run dev            # http://localhost:4000
```

Requires a MongoDB instance. For local dev either run Mongo locally or point
`MONGODB_URI` at a free MongoDB Atlas M0 cluster.

## Environment variables

See `.env.example`. Required in production: `JWT_SECRET`, `MONGODB_URI`,
`CORS_ORIGINS`, `CLOUDFLARE_DEPLOY_HOOK_URL`, and the three `CLOUDINARY_*` keys.

## External services to provision

1. **MongoDB Atlas** — create a free M0 cluster, a DB user, allow network access,
   copy the connection string into `MONGODB_URI`.
2. **Cloudinary** — create a free account; copy cloud name + API key/secret.
3. **Cloudflare Deploy Hook** — in the Cloudflare Pages/Workers project for the
   site, create a deploy hook and copy its URL into `CLOUDFLARE_DEPLOY_HOOK_URL`.
   This is what makes "Publish" rebuild the static site.

## Deploy (Render example)

- New Web Service from the repo, root directory `server/`.
- Build command: `npm install`. Start command: `npm start`.
- Add all env vars from `.env.example`.
- Add the deployed URL's origin to the site's API base config (frontend plan).

## Tests

```bash
npm test
```

Tests use `mongodb-memory-server` (no external DB needed) and mock Cloudinary.

## API

| Method | Path | Auth |
|---|---|---|
| POST | `/api/auth/login` | no |
| GET | `/api/articles` | no |
| GET | `/api/articles/:slug` | no |
| GET | `/api/admin/articles` | yes |
| GET | `/api/admin/articles/:id` | yes |
| POST | `/api/admin/articles` | yes |
| PUT | `/api/admin/articles/:id` | yes |
| DELETE | `/api/admin/articles/:id` | yes |
| POST | `/api/upload` | yes |
