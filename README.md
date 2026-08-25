This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploying to GitHub Pages

The app is entirely client-side — all tournament state lives in `localStorage` — so
it is built as a static export and served straight from Pages.

**One-time setup:** in the repository, go to **Settings → Pages** and set
**Source** to **GitHub Actions**. Nothing is published until this is switched over.

After that, every push to `main` builds and deploys via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). You can also
re-deploy the current `main` from the **Actions** tab with **Run workflow**.

The site lands at `https://<user>.github.io/mario-kart-tournament/`.

### Notes

- `next.config.ts` sets `output: 'export'` and a `basePath` of
  `/mario-kart-tournament`, because Pages serves the project from that sub-path.
  `npm run dev` is unaffected and still runs at the root.
- Deploying to a custom domain or a user/org root site instead? Build with an
  empty base path: `BASE_PATH= npm run build`.
- Renamed the repository? Update the default in `next.config.ts` to match.

To check a production build locally:

```bash
npm run build          # writes out/
npx serve out          # note: served at the root, so the basePath won't match
BASE_PATH= npm run build && npx serve out   # or build without it to browse locally
```
