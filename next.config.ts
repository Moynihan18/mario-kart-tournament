import type { NextConfig } from "next";

// GitHub Pages serves this project from https://<user>.github.io/mario-kart-tournament/,
// so the production build has to know it lives under that sub-path. Set BASE_PATH
// explicitly to override it — BASE_PATH='' for a custom domain or a user/org root
// site, or '/<name>' if the repository is ever renamed.
const basePath =
  process.env.BASE_PATH ??
  (process.env.NODE_ENV === "production" ? "/mario-kart-tournament" : "");

const nextConfig: NextConfig = {
  // Pages is a static host: emit plain HTML/CSS/JS to out/ instead of running a
  // Node server. The app keeps all its state in localStorage, so there is nothing
  // that needs a backend.
  output: "export",
  basePath,
  // Directory-style URLs (/foo/index.html) are what Pages resolves cleanly.
  trailingSlash: true,
  // The image optimizer needs a server; there is none on Pages.
  images: { unoptimized: true },
};

export default nextConfig;
