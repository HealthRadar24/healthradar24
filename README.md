# HealthRadar24

**Real-time global intelligence dashboard** — AI-powered news aggregation, geopolitical monitoring, and infrastructure tracking in a unified situational awareness interface.

HealthRadar24 is an independent project based on [World Monitor](https://github.com/koala73/worldmonitor). It is not affiliated with or endorsed by the upstream project. Source code for the deployed service is published in this repository under AGPL-3.0-only.

[![GitHub stars](https://img.shields.io/github/stars/HealthRadar24/healthradar24?style=social)](https://github.com/HealthRadar24/healthradar24/stargazers)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Last commit](https://img.shields.io/github/last-commit/HealthRadar24/healthradar24)](https://github.com/HealthRadar24/healthradar24/commits/main)
[![Latest release](https://img.shields.io/github/v/release/HealthRadar24/healthradar24?style=flat)](https://github.com/HealthRadar24/healthradar24/releases/latest)

<p align="center">
  <a href="https://healthradar24.com"><img src="https://img.shields.io/badge/Web_App-healthradar24.com-blue?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Web App"></a>&nbsp;
  <a href="https://tech.healthradar24.com"><img src="https://img.shields.io/badge/Tech_Variant-tech.healthradar24.com-0891b2?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Tech Variant"></a>&nbsp;
  <a href="https://finance.healthradar24.com"><img src="https://img.shields.io/badge/Finance_Variant-finance.healthradar24.com-059669?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Finance Variant"></a>&nbsp;
  <a href="https://commodity.healthradar24.com"><img src="https://img.shields.io/badge/Commodity_Variant-commodity.healthradar24.com-b45309?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Commodity Variant"></a>&nbsp;
  <a href="https://happy.healthradar24.com"><img src="https://img.shields.io/badge/Happy_Variant-happy.healthradar24.com-f59e0b?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Happy Variant"></a>&nbsp;
  <a href="https://energy.healthradar24.com"><img src="https://img.shields.io/badge/Energy_Variant-energy.healthradar24.com-eab308?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Energy Variant"></a>
</p>

<p align="center">
  <a href="https://healthradar24.com/api/download?platform=windows-exe"><img src="https://img.shields.io/badge/Download-Windows_(.exe)-0078D4?style=for-the-badge&logo=windows&logoColor=white" alt="Download Windows"></a>&nbsp;
  <a href="https://healthradar24.com/api/download?platform=macos-arm64"><img src="https://img.shields.io/badge/Download-macOS_Apple_Silicon-000000?style=for-the-badge&logo=apple&logoColor=white" alt="Download macOS ARM"></a>&nbsp;
  <a href="https://healthradar24.com/api/download?platform=macos-x64"><img src="https://img.shields.io/badge/Download-macOS_Intel-555555?style=for-the-badge&logo=apple&logoColor=white" alt="Download macOS Intel"></a>&nbsp;
  <a href="https://healthradar24.com/api/download?platform=linux-appimage"><img src="https://img.shields.io/badge/Download-Linux_(.AppImage)-FCC624?style=for-the-badge&logo=linux&logoColor=black" alt="Download Linux"></a>
</p>

<p align="center">
  <a href="https://www.healthradar24.com/docs/documentation"><strong>Documentation</strong></a> &nbsp;·&nbsp;
  <a href="https://github.com/HealthRadar24/healthradar24/releases/latest"><strong>Releases</strong></a> &nbsp;·&nbsp;
  <a href="https://www.healthradar24.com/docs/contributing"><strong>Contributing</strong></a>
</p>

![HealthRadar24 Dashboard](docs/images/worldmonitor-7-mar-2026.jpg)

---

## What It Does

- **500+ curated news feeds** across 15 categories, AI-synthesized into briefs
- **Dual map engine** — 3D globe (globe.gl) and WebGL flat map (deck.gl) with 56 map layer types
- **Cross-stream correlation** — military, economic, disaster, and escalation signal convergence
- **Country Instability Index (CII)** — server-authoritative CII v8 stress scoring for 31 Tier-1 countries
- **Finance radar** — 29 stock exchanges, commodities, crypto, and 7-signal market composite
- **Local AI** — run everything with Ollama, no API keys required
- **6 site variants** from a single codebase (world, tech, finance, commodity, happy, energy)
- **Native desktop app** (Tauri 2) for macOS, Windows, and Linux
- **24 languages** with native-language feeds and RTL support

For the full feature list, architecture, data sources, and algorithms, see the **[documentation](https://www.healthradar24.com/docs/documentation)**.

---

## Support Status

All site variants and desktop binaries are built from a single codebase and ship from the same release process. The table below clarifies maintenance status so you know which surfaces are safe to depend on.

| Surface | Status | Notes |
|---------|--------|-------|
| `healthradar24.com`, `tech.`, `finance.`, `commodity.`, `happy.`, `energy.` | Stable | Public deployments built from this repo, actively maintained |
| Desktop binaries (Windows / macOS Apple Silicon / macOS Intel / Linux AppImage) | Stable | One Tauri binary that switches variants in-app; current CI release targets are `full` and `tech` |

Issues filed against any of the above are triaged from the same backlog — see the [issues board](https://github.com/HealthRadar24/healthradar24/issues) for currently-open work.

---

## Quick Start

```bash
git clone https://github.com/HealthRadar24/healthradar24.git
cd healthradar24
npm install
npm run dev
```

Open [localhost:5173](http://localhost:5173). The app runs with no environment variables.

Feature-specific data sources may require credentials — for example, the flight-price command (`fly LON DXB`) needs `TRAVELPAYOUTS_API_TOKEN` to return live quotes; without it the command shows a "credentials required" message rather than synthetic data. See `.env.example` for the full list.

For variant-specific development:

```bash
npm run dev:tech       # tech.healthradar24.com
npm run dev:finance    # finance.healthradar24.com
npm run dev:commodity  # commodity.healthradar24.com
npm run dev:happy      # happy.healthradar24.com
```

See the **[self-hosting guide](https://www.healthradar24.com/docs/getting-started)** for deployment options (Vercel, Docker, static).

---

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | Vanilla TypeScript, Vite, globe.gl + Three.js, deck.gl + MapLibre GL |
| **Desktop** | Tauri 2 (Rust) with Node.js sidecar |
| **AI/ML** | Ollama / Groq / OpenRouter, Transformers.js (browser-side) |
| **API Contracts** | Protocol Buffers (276 protos, 34 services), sebuf HTTP annotations |
| **Deployment** | Vercel Edge Functions (60+), Railway relay, Tauri, PWA |
| **Caching** | Redis (Upstash), 3-tier cache, CDN, service worker |

Full stack details in the **[architecture docs](https://www.healthradar24.com/docs/architecture)**.

---

## Flight Data

Flight data provided gracefully by [Wingbits](https://wingbits.com?utm_source=worldmonitor&utm_medium=referral&utm_campaign=worldmonitor), the most advanced ADS-B flight data solution.

---

## Data Sources

HealthRadar24 aggregates 65+ external providers and APIs across geopolitics, finance, energy, climate, aviation, cyber, military, infrastructure, and news intelligence — surfaced through 500+ curated feeds and tracked by a freshness monitor covering 35 source groups. See the full [data sources catalog](https://www.healthradar24.com/docs/data-sources) for providers, feed tiers, and collection methods.

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

```bash
npm run typecheck        # Type checking
npm run build:full       # Production build
```

---

## License

**AGPL-3.0-only** for the source code. Commercial use is permitted under the AGPL when you comply with its copyleft and source-availability terms.

| Use Case | Allowed? |
|----------|----------|
| Personal / research / educational | Yes, under AGPL-3.0-only |
| Self-hosted instance | Yes, under AGPL-3.0-only |
| Fork and modify | Yes, share source under AGPL-3.0-only when required |
| Commercial use / SaaS | Yes, under AGPL-3.0-only when you comply with AGPL obligations |
| Private-source proprietary use or official branding rights | Separate commercial or trademark permission needed |

See [LICENSE](LICENSE) for the full code license and [docs/license.mdx](docs/license.mdx) for a plain-language summary. Commercial licensing is available as an alternative option for teams that need non-AGPL terms.

Copyright (C) 2024-2026 Elie Habib. All rights reserved.

---

## Author

**Elie Habib** — [GitHub](https://github.com/koala73)

## Contributors

<a href="https://github.com/HealthRadar24/healthradar24/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=HealthRadar24/healthradar24" />
</a>

## Security Acknowledgments

We thank the following researchers for responsibly disclosing security issues:

- **Cody Richard** — Disclosed three security findings covering IPC command exposure, renderer-to-sidecar trust boundary analysis, and fetch patch credential injection architecture (2026)

See our [Security Policy](./SECURITY.md) for responsible disclosure guidelines.

---

<p align="center">
  <a href="https://healthradar24.com">healthradar24.com</a> &nbsp;·&nbsp;
  <a href="https://www.healthradar24.com/docs/documentation">docs.healthradar24.com</a> &nbsp;·&nbsp;
  <a href="https://finance.healthradar24.com">finance.healthradar24.com</a> &nbsp;·&nbsp;
  <a href="https://commodity.healthradar24.com">commodity.healthradar24.com</a>
</p>

## Star History

<a href="https://api.star-history.com/svg?repos=HealthRadar24/healthradar24&type=Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=HealthRadar24/healthradar24&type=Date&type=Date&theme=dark" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=HealthRadar24/healthradar24&type=Date&type=Date" />
 </picture>
</a>
