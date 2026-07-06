# @olympos/widget-astro

Server-rendered **Olympos Sync** job gallery for **Astro**. Renders your
published check-ins as real, crawlable HTML plus JSON-LD structured data —
directly in your page's source (no iframe), so Google indexes the jobs on
**your own domain**.

## Install

```bash
npm install @olympos/widget-astro
```

## Usage

```astro
---
import OlymposJobs from "@olympos/widget-astro/OlymposJobs.astro";
---

<html>
  <body>
    <h1>Our recent work</h1>
    <OlymposJobs businessId="YOUR_BUSINESS_ID" />
  </body>
</html>
```

> Prefer SSR? Set `output: "server"` (or `"hybrid"`) in `astro.config.mjs` so
> the jobs stay fresh on every request. In the default static mode they are
> fetched at build time — re-deploy to refresh.

Alternatively, copy `OlymposJobs.astro` straight into your project's
`src/components/` folder — no dependency required.

## Props

| Prop         | Type   | Default         | Description                          |
| ------------ | ------ | --------------- | ------------------------------------ |
| `businessId` | string | —               | Your business id from the dashboard. |
| `baseUrl`    | string | hosted instance | Olympos deployment origin.           |
| `limit`      | number | all             | Max jobs to render.                  |

## Why not an iframe?

Content inside an iframe is credited by Google to the iframe's source domain —
not your site. This component injects the jobs as part of your page's own HTML,
so the images, addresses, and descriptions count toward **your** SEO.
