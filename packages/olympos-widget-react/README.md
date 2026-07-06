# @olympos/widget-react

Server-rendered **Olympos Sync** job gallery for **React / Next.js**. Renders
your published check-ins as real, crawlable HTML plus JSON-LD structured data —
directly inside your page (no iframe), so Google indexes the jobs on **your own
domain**.

## Install

```bash
npm install @olympos/widget-react
```

## Usage (Next.js App Router)

```tsx
import { OlymposJobs } from "@olympos/widget-react";

export default function OurJobsPage() {
  return (
    <main>
      <h1>Our recent work</h1>
      {/* Rendered on the server — great for SEO */}
      <OlymposJobs businessId="YOUR_BUSINESS_ID" />
    </main>
  );
}
```

## Props

| Prop         | Type     | Default            | Description                              |
| ------------ | -------- | ------------------ | ---------------------------------------- |
| `businessId` | string   | —                  | Your business id from the dashboard.     |
| `baseUrl`    | string   | hosted instance    | Olympos deployment origin.               |
| `limit`      | number   | all                | Max jobs to render.                      |
| `revalidate` | number   | `300`              | Next.js ISR cache window (seconds).      |
| `className`  | string   | —                  | Extra class on the wrapper.              |

## Why not an iframe?

Content inside an iframe is credited by Google to the iframe's source domain —
not your site. This component injects the jobs as part of your page's own HTML,
so the images, addresses, and descriptions count toward **your** SEO.
