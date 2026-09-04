# Season 1a — Surface & Platform Implementation Plan

> **Status (2026-09-03):** shipped 2026-07-15 as recorded in `CLAUDE.md`; the checkboxes below were never reconciled and remain unticked except where later evidence was added. Drift since writing: the repo pins `pnpm@11.13.0` (not 10.x), the Lighthouse gate runs `@lhci/cli` directly rather than the treosh action, Web Analytics uses Cloudflare Automatic setup (no beacon in `BaseLayout.astro`), and the GitHub repo moved to `coltonbearden/coltonbearden.com` on 2026-08-22.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the complete Surface (all six "paper twin" routes with real content, RSS, first Chronicle post) deployed as Cloudflare Workers static assets on coltonbearden.com — ending the by-design 522 — plus Web Analytics, MTA-STS, and Lighthouse CI.

**Architecture:** Static Astro 5 site in `site/` (no SSR, no client JS except the analytics beacon), styled as retro-corporate FirstCast Industries documents per spec §2 Level 0. Served as an assets-only Worker; CI via Workers Builds; quality gate via GitHub Actions Lighthouse CI. Sibling plans S1b (AI spine: Tunnel + vLLM + Agents SDK innies) and S1c (the 3D Descent) follow this one — nothing here may depend on them.

**Tech Stack:** Astro 5 (content layer, `@astrojs/sitemap`, `@astrojs/rss`), TypeScript, Vitest, Wrangler v4 (assets-only Worker), Cloudflare Workers Builds, treosh/lighthouse-ci-action.

**Spec:** `docs/superpowers/specs/2026-07-15-severed-floor-design.md` (sections 2, 6, 7; world rules 1, 2, 4; D12).

## Global Constraints

- Package manager: **pnpm** (corepack; pnpm 10.x). Node 24. Never npm/yarn.
- Commits: Conventional Commits, subject ≤ 50 chars, from repo root.
- **Zero client JS on Surface pages** (spec world rule 2/4). Sole exception: the Cloudflare Web Analytics beacon (Task 10). Verified by grep in Tasks 7 and 10.
- **Parody, never copy** (spec D14): in-world corp is **FirstCast Industries**; never use "Lumon", "Kier", "macrodata refinement" or other protected Severance strings in shipped copy. In-world room names on the Surface use our own terms only.
- **DNS guardrail** (CLAUDE.md): never delete/overwrite a DNS record without showing exact before/after and getting explicit user go-ahead. Tasks 9 and 11 have confirmation checkpoints.
- Zone facts: zone `coltonbearden.com`, zone_id `bc9faf24541428e9ed5f3687d9ede3ef`. Apex A `192.0.2.1` (record `415158cc70fc5b1ef3b20ae42d530dbe`) and `www` CNAME (record `6ed5bfb8cc3e988c226fb75e886eb055`) are parking placeholders that Task 9 replaces.
- Cloudflare MCP token can edit DNS records but NOT zone settings (401/403) — zone-setting steps are `[MANUAL — Dashboard]`.
- Lighthouse ≥ 95 (Performance / Best Practices / SEO) on every Surface route (spec §6 acceptance).
- All shell commands run from repo root `C:\Users\ColtonBearden\Projects\coltonbearden.com` unless a step says otherwise; `pnpm --dir site <cmd>` runs inside the app.

---

### Task 1: Scaffold the Astro project

**Files:**
- Create: `site/package.json`, `site/astro.config.mjs`, `site/tsconfig.json`, `site/src/pages/index.astro` (scaffold output, rewritten in Task 4)
- Modify: `.gitignore` (repo root)

**Interfaces:**
- Produces: `site/` Astro 5 project; pnpm scripts `dev`, `build`, `preview`, `check`, `test` used by every later task; `site` config value `https://coltonbearden.com` consumed by sitemap/RSS/canonicals.

- [ ] **Step 1: Scaffold**

```bash
pnpm create astro@latest site -- --template minimal --no-install --no-git --yes
```

(If the CLI flags have drifted, check `pnpm create astro@latest -- --help`; the required outcome is a minimal template in `site/` with no git init.)

- [ ] **Step 2: Install deps**

```bash
pnpm --dir site install
pnpm --dir site add @astrojs/sitemap @astrojs/rss
pnpm --dir site add -D wrangler vitest @astrojs/check typescript
```

- [ ] **Step 3: Configure**

Replace `site/astro.config.mjs`:

```js
// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://coltonbearden.com',
  integrations: [sitemap()],
});
```

In `site/package.json`, set the scripts block to:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run"
  }
}
```

- [ ] **Step 4: Root .gitignore additions**

Append to repo-root `.gitignore`:

```
# Site build artifacts
site/dist/
site/node_modules/
site/.astro/
site/.wrangler/
```

- [ ] **Step 5: Verify build**

```bash
pnpm --dir site build
```

Expected: `Complete!` with `dist/index.html` emitted; exit code 0.

- [ ] **Step 6: Commit**

```bash
git add site .gitignore
git commit -m "feat: scaffold Astro site in site/"
```

---

### Task 2: Design tokens, BaseLayout, MemoLayout

**Files:**
- Create: `site/src/styles/global.css`, `site/src/layouts/BaseLayout.astro`, `site/src/layouts/MemoLayout.astro`

**Interfaces:**
- Produces: `BaseLayout` props `{ title: string; description: string }`; `MemoLayout` props `{ title: string; description: string; docNumber: string; kicker: string }` with default slot for document body. Every page task (4–7) consumes these exact props.
- CSS classes later tasks rely on: `.doc-date`, `.doc-table`, `.stamp`, `.directory`.

- [ ] **Step 1: Global styles**

Create `site/src/styles/global.css`:

```css
:root {
  --paper: #f4f1ea;
  --paper-edge: #ddd6c8;
  --ink: #23241f;
  --ink-soft: #5a5b52;
  --green: #1f6f4f;
  --green-crt: #2f9e6e;
  --stamp: #a33c2e;
  --serif: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  --mono: "Cascadia Mono", Consolas, "IBM Plex Mono", monospace;
}
* { box-sizing: border-box; }
html { background: var(--paper); color: var(--ink); font-family: var(--serif); line-height: 1.6; }
body { margin: 0 auto; max-width: 44rem; padding: 1.5rem 1.25rem 4rem; }
a { color: var(--green); }
a:hover { color: var(--ink); }
h1, h2, h3 { font-family: var(--mono); letter-spacing: 0.04em; line-height: 1.2; }
h1 { font-size: 1.6rem; text-transform: uppercase; }
h2 { font-size: 1.1rem; text-transform: uppercase; color: var(--ink-soft); }
code, pre { font-family: var(--mono); font-size: 0.92em; }
.masthead { display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: space-between; align-items: baseline; border-bottom: 3px double var(--ink); padding-bottom: 0.6rem; margin-bottom: 2rem; }
.wordmark { font-family: var(--mono); font-weight: 700; letter-spacing: 0.14em; text-decoration: none; color: var(--ink); }
.masthead nav { display: flex; gap: 0.9rem; font-family: var(--mono); font-size: 0.82rem; text-transform: uppercase; }
.masthead nav a { text-decoration: none; }
.memo { border: 1px solid var(--paper-edge); background: #fbf9f5; padding: 1.75rem 1.6rem; box-shadow: 2px 2px 0 var(--paper-edge); }
.memo-kicker { font-family: var(--mono); font-size: 0.72rem; letter-spacing: 0.22em; color: var(--ink-soft); text-transform: uppercase; margin: 0 0 0.25rem; }
.memo-doc { font-family: var(--mono); font-size: 0.72rem; color: var(--ink-soft); float: right; }
.doc-date { font-family: var(--mono); font-size: 0.8rem; color: var(--ink-soft); }
.doc-table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
.doc-table th, .doc-table td { border: 1px solid var(--paper-edge); padding: 0.45rem 0.6rem; text-align: left; vertical-align: top; }
.doc-table th { font-family: var(--mono); font-size: 0.75rem; text-transform: uppercase; background: #efece3; }
.stamp { display: inline-block; border: 2px solid var(--stamp); color: var(--stamp); font-family: var(--mono); font-size: 0.7rem; letter-spacing: 0.18em; padding: 0.15rem 0.5rem; text-transform: uppercase; transform: rotate(-2deg); }
.directory { list-style: none; padding: 0; }
.directory li { border-bottom: 1px dotted var(--paper-edge); padding: 0.55rem 0; }
.directory .dir-route { font-family: var(--mono); font-size: 0.78rem; color: var(--ink-soft); }
.colophon { margin-top: 3rem; border-top: 3px double var(--ink); padding-top: 0.8rem; font-size: 0.85rem; color: var(--ink-soft); }
.descend { font-family: var(--mono); text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.8rem; }
```

- [ ] **Step 2: BaseLayout**

Create `site/src/layouts/BaseLayout.astro`:

```astro
---
import '../styles/global.css';

interface Props { title: string; description: string }
const { title, description } = Astro.props;
const canonical = new URL(Astro.url.pathname, Astro.site);
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="sitemap" href="/sitemap-index.xml" />
    <link rel="alternate" type="application/rss+xml" title="The FirstCast Chronicle" href="/rss.xml" />
  </head>
  <body>
    <header class="masthead">
      <a class="wordmark" href="/">FIRSTCAST INDUSTRIES</a>
      <nav aria-label="Departments">
        <a href="/about/">Personnel</a>
        <a href="/work/">Works</a>
        <a href="/blog/">Chronicle</a>
        <a href="/uses/">Equipment</a>
        <a href="/contact/">Contact</a>
      </nav>
    </header>
    <slot />
    <footer class="colophon">
      <p>© {new Date().getFullYear()} Colton Bearden · <a href="/contact/">Reach Compliance</a> · <a href="/rss.xml">Chronicle RSS</a></p>
      <p class="descend"><a href="/">Descend ↓</a> — elevator under orientation</p>
    </footer>
  </body>
</html>
```

- [ ] **Step 3: MemoLayout**

Create `site/src/layouts/MemoLayout.astro`:

```astro
---
import BaseLayout from './BaseLayout.astro';

interface Props { title: string; description: string; docNumber: string; kicker: string }
const { title, description, docNumber, kicker } = Astro.props;
---
<BaseLayout title={title} description={description}>
  <article class="memo">
    <span class="memo-doc">{docNumber}</span>
    <p class="memo-kicker">{kicker} · Internal Circulation</p>
    <h1>{title}</h1>
    <slot />
  </article>
</BaseLayout>
```

- [ ] **Step 4: Verify**

Temporarily wrap the scaffold `site/src/pages/index.astro` content:

```astro
---
import MemoLayout from '../layouts/MemoLayout.astro';
---
<MemoLayout title="Layout Check" description="check" docNumber="FC-TMP-000" kicker="Facilities">
  <p>Chrome renders.</p>
</MemoLayout>
```

```bash
pnpm --dir site build && grep -c "FIRSTCAST INDUSTRIES" site/dist/index.html
```

Expected: `1` (or more), exit 0.

- [ ] **Step 5: Commit**

```bash
git add site/src
git commit -m "feat: add FirstCast document layouts and styles"
```

---

### Task 3: Chronicle collection, utils (TDD), first post

**Files:**
- Create: `site/src/content.config.ts`, `site/src/utils/chronicle.ts`, `site/tests/chronicle.test.ts`, `site/src/content/chronicle/001-orientation.md`

**Interfaces:**
- Produces: collection `chronicle` with schema `{ title: string; description: string; pubDate: Date; edition: number }` (entry `id` = filename sans extension, e.g. `001-orientation`); `byEditionDesc<T extends { data: { edition: number } }>(entries: T[]): T[]`; `docNumber(edition: number): string` returning e.g. `FC-CHRON-001`. Tasks 7 (blog pages, RSS) consume all three.

- [ ] **Step 1: Write the failing tests**

Create `site/tests/chronicle.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { byEditionDesc, docNumber } from '../src/utils/chronicle';

describe('byEditionDesc', () => {
  it('sorts newest edition first without mutating input', () => {
    const input = [{ data: { edition: 1 } }, { data: { edition: 3 } }, { data: { edition: 2 } }];
    const out = byEditionDesc(input);
    expect(out.map((e) => e.data.edition)).toEqual([3, 2, 1]);
    expect(input.map((e) => e.data.edition)).toEqual([1, 3, 2]);
  });
});

describe('docNumber', () => {
  it('zero-pads to three digits', () => {
    expect(docNumber(1)).toBe('FC-CHRON-001');
    expect(docNumber(42)).toBe('FC-CHRON-042');
    expect(docNumber(120)).toBe('FC-CHRON-120');
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
pnpm --dir site test
```

Expected: FAIL — cannot resolve `../src/utils/chronicle`.

- [ ] **Step 3: Implement**

Create `site/src/utils/chronicle.ts`:

```ts
export interface EditionLike { data: { edition: number } }

export function byEditionDesc<T extends EditionLike>(entries: T[]): T[] {
  return [...entries].sort((a, b) => b.data.edition - a.data.edition);
}

export function docNumber(edition: number): string {
  return `FC-CHRON-${String(edition).padStart(3, '0')}`;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
pnpm --dir site test
```

Expected: `2 passed`.

- [ ] **Step 5: Collection config**

Create `site/src/content.config.ts`:

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const chronicle = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/chronicle' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    edition: z.number().int().positive(),
  }),
});

export const collections = { chronicle };
```

- [ ] **Step 6: First post**

Create `site/src/content/chronicle/001-orientation.md`:

```markdown
---
title: "Edition 001: Orientation"
description: "FirstCast Industries announces the severed floor: a 3D world under this website, staffed by AI employees running on real basement hardware. Built in public, starting now."
pubDate: 2026-07-15
edition: 1
---

Welcome to the surface offices of coltonbearden.com.

This website is under construction, and the construction is the point.
What you are reading is the first edition of the Chronicle — the company
newspaper of FirstCast Industries, a corporation that does not exist,
documenting the construction of a floor that soon will.

**What is being built.** Beneath this page, a severed floor: a 3D world
you will descend into by scrolling. Its employees are AI agents — we
call them innies — running live on six real machines in my basement,
including an NVIDIA DGX Spark. When a machine goes down, its innie is
"in the break room." This is not a metaphor for a product. The machines
are real, the agents are real, and when you talk to one, the answer is
computed under my stairs.

**Why.** Anyone can write "I build AI systems" on a landing page. The
claim is cheap. The severed floor is the receipt: infrastructure,
agents, 3D, and deliverability, all operating in one place you can walk
around in. The vanilla resume lives on LinkedIn. This place is for
showing, not telling.

**What exists today.** The Surface — the document you are holding, plus
the personnel file, the completed works, the issued equipment, and
reach compliance. Every future room has a paper twin up here: fast,
crawlable, readable on anything.

**What comes next.** Edition by edition: a tunnel from the edge to the
basement, the first innie reporting for duty, and the elevator itself.
The floor opens with two rooms. The rest stay locked, and labeled.

Please enjoy each edition equally.
```

- [ ] **Step 7: Verify build sees the collection**

```bash
pnpm --dir site build
```

Expected: exit 0, no schema errors.

- [ ] **Step 8: Commit**

```bash
git add site/src site/tests
git commit -m "feat: add Chronicle collection and first post"
```

---

### Task 4: Lobby (/), Personnel File (/about), Reach Compliance (/contact)

**Files:**
- Create: `site/src/pages/about.astro`, `site/src/pages/contact.astro`
- Modify: `site/src/pages/index.astro` (replace Task 2 temp content)

**Interfaces:**
- Consumes: `BaseLayout`/`MemoLayout` (Task 2 props, verbatim).
- Produces: final Surface copy for `/`, `/about/`, `/contact/`.

- [ ] **Step 1: Lobby**

Replace `site/src/pages/index.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout
  title="Colton Bearden — FirstCast Industries"
  description="The personal-professional domain of Colton Bearden: IT administrator, homelab operator, and builder of the severed floor — an AI-staffed 3D world under construction beneath this page."
>
  <section class="memo">
    <p class="memo-kicker">Lobby · Visitor Orientation</p>
    <h1>Welcome to the Surface</h1>
    <p>
      You have reached the surface offices of <strong>Colton Bearden</strong> —
      Global Administrator, fleet operator, and sole outie of FirstCast
      Industries. Beneath this page, a severed floor is under construction:
      a three-dimensional workplace staffed by AI employees running on real
      hardware in a real basement. You will be able to descend soon.
    </p>
    <p><span class="stamp">Elevator under orientation</span></p>
    <h2>Building Directory</h2>
    <ul class="directory">
      <li><a href="/about/">Personnel File</a> <span class="dir-route">/about — who the outie is</span></li>
      <li><a href="/work/">Completed Works</a> <span class="dir-route">/work — what has been built</span></li>
      <li><a href="/blog/">The Chronicle</a> <span class="dir-route">/blog — construction, documented</span></li>
      <li><a href="/uses/">Issued Equipment</a> <span class="dir-route">/uses — the machines and tools</span></li>
      <li><a href="/contact/">Reach Compliance</a> <span class="dir-route">/contact — state your purpose</span></li>
    </ul>
  </section>
</BaseLayout>
```

- [ ] **Step 2: Personnel File**

Create `site/src/pages/about.astro`:

```astro
---
import MemoLayout from '../layouts/MemoLayout.astro';
---
<MemoLayout
  title="Personnel File: The Outie"
  description="About Colton Bearden — IT administrator and builder: Microsoft 365 and Azure administration, a six-machine homelab fleet, and AI systems that run where he can see them."
  docNumber="FC-PF-001"
  kicker="Personnel"
>
  <p class="doc-date">Subject: BEARDEN, COLTON · Status: UNSEVERED · Clearance: ALL FLOORS</p>
  <p>
    The following facts about the outie have been verified by the wellness
    department and may be recited to any employee in need of encouragement.
  </p>
  <ul>
    <li>The outie is a Global Administrator, and administrates globally — Microsoft 365, Azure, and identity for FirstCast Solutions.</li>
    <li>The outie operates a fleet of six machines joined by a private mesh, and can name each from memory, with affection.</li>
    <li>The outie keeps his global site-packages lean, and his virtual environments in one directory, where he can see them.</li>
    <li>The outie writes commits in the conventional format, with subjects of fifty characters or fewer.</li>
    <li>The outie believes AI should be run where it can be observed: on his own hardware, in his own basement, doing legible work.</li>
    <li>The outie is building this severed floor himself, in public, and documents each step in the company newspaper.</li>
  </ul>
  <p>
    Outside the file: I'm a Windows-and-Linux administrator and builder who
    likes infrastructure that proves itself. This site is the proof in
    progress — the write-ups live in <a href="/blog/">the Chronicle</a>, and
    the machines doing the proving are listed under
    <a href="/uses/">Issued Equipment</a>. The conventional resume is on
    LinkedIn; this place exists to show rather than tell.
  </p>
</MemoLayout>
```

- [ ] **Step 3: Reach Compliance**

Create `site/src/pages/contact.astro`:

```astro
---
import MemoLayout from '../layouts/MemoLayout.astro';
---
<MemoLayout
  title="Reach Compliance"
  description="Contact Colton Bearden: inbox@coltonbearden.com, or FirstCastSolutions423 on GitHub."
  docNumber="FC-RC-001"
  kicker="Compliance"
>
  <p>
    Visitors wishing to reach the outie may do so through the approved
    channels below. All messages are read by a human. Eventually a
    receptionist innie will take these at the front desk; until then,
    correspondence travels the old way.
  </p>
  <table class="doc-table">
    <tr><th>Channel</th><th>Address</th><th>Purpose</th></tr>
    <tr><td>Electronic mail</td><td><a href="mailto:inbox@coltonbearden.com">inbox@coltonbearden.com</a></td><td>Anything. SPF, DKIM, and DMARC are in order; your reply will arrive.</td></tr>
    <tr><td>GitHub</td><td><a href="https://github.com/FirstCastSolutions423">FirstCastSolutions423</a></td><td>Code, issues, and this site's own repository.</td></tr>
  </table>
  <p>Please state your purpose plainly. The compliance department appreciates it.</p>
</MemoLayout>
```

- [ ] **Step 4: Verify**

```bash
pnpm --dir site build && grep -l "Personnel File" site/dist/about/index.html && grep -l "inbox@coltonbearden.com" site/dist/contact/index.html
```

Expected: both file paths print; exit 0.

- [ ] **Step 5: Commit**

```bash
git add site/src/pages
git commit -m "feat: add lobby, about, and contact pages"
```

---

### Task 5: Completed Works (/work) + projects data

**Files:**
- Create: `site/src/data/projects.ts`, `site/src/pages/work.astro`

**Interfaces:**
- Produces: `Project` interface `{ slug: string; title: string; docNumber: string; status: 'active' | 'in-development' | 'classified'; summary: string; details: string[]; link?: { href: string; label: string } }` and `export const projects: Project[]`. S1c's MDR room will consume this same module as its case-study source — keep it the single source of truth for project facts.

- [ ] **Step 1: Data module**

Create `site/src/data/projects.ts`:

```ts
export interface Project {
  slug: string;
  title: string;
  docNumber: string;
  status: 'active' | 'in-development' | 'classified';
  summary: string;
  details: string[];
  link?: { href: string; label: string };
}

export const projects: Project[] = [
  {
    slug: 'severed-floor',
    title: 'The Severed Floor',
    docNumber: 'FC-CW-001',
    status: 'in-development',
    summary:
      'This website: a Severance-parody 3D world served from the edge, staffed by AI agents running on basement hardware, built in public.',
    details: [
      'Astro Surface deployed as Cloudflare Workers static assets.',
      'AI innies: Cloudflare Agents SDK (Durable Objects) fronting vLLM on an NVIDIA DGX Spark via Cloudflare Tunnel, with Workers AI covering outages.',
      'World: React Three Fiber + Theatre.js, arriving one room at a time.',
    ],
    link: { href: 'https://github.com/FirstCastSolutions423/coltonbearden.com', label: 'Repository' },
  },
  {
    slug: 'fleet',
    title: 'The Fleet',
    docNumber: 'FC-CW-002',
    status: 'active',
    summary:
      'A six-machine homelab spanning Windows and Ubuntu, joined by a Tailscale mesh, sized for AI inference, containers, and administration.',
    details: [
      'NVIDIA DGX Spark for model serving and local generative pipelines.',
      'AMD 9950X workstation, ThinkPad T14, ASUS NUC 15 Pro+, and two Minisforum nodes with assigned roles.',
      'MagicDNS everywhere; the mesh is the management plane, and stays private.',
    ],
  },
  {
    slug: 'plugin-platform',
    title: 'Claude Code Plugin Platform',
    docNumber: 'FC-CW-003',
    status: 'classified',
    summary:
      'A commercial platform for Claude Code plugins, in development. Details are severed until launch.',
    details: [
      'Front door and billing design are decided; the work is documented in decision logs, not press releases.',
      'When it nears sellable, the Chronicle will say so.',
    ],
  },
];
```

- [ ] **Step 2: Page**

Create `site/src/pages/work.astro`:

```astro
---
import MemoLayout from '../layouts/MemoLayout.astro';
import { projects } from '../data/projects';

const statusLabel = {
  active: 'ACTIVE',
  'in-development': 'IN DEVELOPMENT',
  classified: 'DETAILS SEVERED',
} as const;
---
<MemoLayout
  title="Completed Works"
  description="Selected builds by Colton Bearden: the Severed Floor itself, a six-machine homelab fleet, and a Claude Code plugin platform in development."
  docNumber="FC-CW-000"
  kicker="Works"
>
  <p>
    The department of completed works acknowledges that some works are not
    yet completed. They are listed anyway, because the honest ledger is the
    point of the whole floor.
  </p>
  {projects.map((p) => (
    <section>
      <h2>{p.title} <span class="stamp">{statusLabel[p.status]}</span></h2>
      <p class="doc-date">{p.docNumber}</p>
      <p>{p.summary}</p>
      <ul>
        {p.details.map((d) => <li>{d}</li>)}
      </ul>
      {p.link && <p><a href={p.link.href}>{p.link.label} →</a></p>}
    </section>
  ))}
</MemoLayout>
```

- [ ] **Step 3: Verify**

```bash
pnpm --dir site build && grep -c "FC-CW-00" site/dist/work/index.html
```

Expected: `4` (heading doc number + three project doc numbers).

- [ ] **Step 4: Commit**

```bash
git add site/src/data site/src/pages/work.astro
git commit -m "feat: add completed works page and project data"
```

---

### Task 6: Issued Equipment (/uses)

**Files:**
- Create: `site/src/pages/uses.astro`

**Interfaces:**
- Consumes: `MemoLayout` (Task 2). Static content only.

- [ ] **Step 1: Page**

Create `site/src/pages/uses.astro`:

```astro
---
import MemoLayout from '../layouts/MemoLayout.astro';

const fleet = [
  { name: 'Primary Workstation', id: 'ws-9950x', os: 'Windows 11 Pro', role: 'Development powerhouse — AMD 9950X, RTX 5070 Ti, 96 GB DDR5' },
  { name: 'NVIDIA DGX Spark', id: 'dgx-spark', os: 'Ubuntu', role: 'AI/ML workloads; will serve the primary innie via vLLM' },
  { name: 'ThinkPad T14 Gen 6', id: 'lenovo-t14', os: 'Windows 11 Pro', role: 'Mobile workstation' },
  { name: 'ASUS NUC 15 Pro+', id: 'nuc-285h', os: 'Ubuntu', role: 'Docker host; will run the tunnel to the edge' },
  { name: 'Minisforum X1 Pro-370', id: 'mini-370', os: 'Ubuntu', role: 'Compact workstation; future receptionist innie' },
  { name: 'Minisforum X1-255', id: 'mini-255', os: 'Ubuntu', role: 'Compact workstation; future chronicle innie' },
];

const toolchain = [
  { area: 'Shell & terminal', items: 'PowerShell 7, Windows Terminal, Oh My Posh' },
  { area: 'Editors', items: 'VS Code (curated 33-extension keep-list), Sublime Text as git editor' },
  { area: 'Runtimes', items: 'Node 24 + pnpm via corepack, Python 3.13 managed by uv, .NET, Rust' },
  { area: 'Git', items: 'Git + delta side-by-side pager, GitHub CLI, Conventional Commits, HTTPS over SSH' },
  { area: 'CLI daily carry', items: 'ripgrep, fd, fzf, bat, eza, jq, zoxide, hyperfine, tokei, pandoc, ImageMagick' },
  { area: 'AI', items: 'Claude Code (native install, latest channel) driving most of what the Chronicle documents' },
];
---
<MemoLayout
  title="Issued Equipment"
  description="The hardware fleet and daily toolchain behind coltonbearden.com: six machines on a Tailscale mesh, PowerShell 7, uv, pnpm, and a modern CLI kit."
  docNumber="FC-IE-001"
  kicker="Facilities"
>
  <p>
    Equipment is issued once, justified always. Every machine below is real,
    named, and reachable by hostname on a private mesh. Several will soon
    hold employment on the severed floor.
  </p>
  <h2>The Fleet</h2>
  <table class="doc-table">
    <tr><th>Machine</th><th>Hostname</th><th>OS</th><th>Assignment</th></tr>
    {fleet.map((m) => (
      <tr><td>{m.name}</td><td><code>{m.id}</code></td><td>{m.os}</td><td>{m.role}</td></tr>
    ))}
  </table>
  <h2>The Toolchain</h2>
  <table class="doc-table">
    <tr><th>Area</th><th>Issued items</th></tr>
    {toolchain.map((t) => (
      <tr><td>{t.area}</td><td>{t.items}</td></tr>
    ))}
  </table>
  <p>
    Policy highlights: global site-packages stay lean (tools via
    <code>uv tool install</code>); system packages come from winget; every
    installation must be justified. The compliance department has never
    lost this argument.
  </p>
</MemoLayout>
```

- [ ] **Step 2: Verify**

```bash
pnpm --dir site build && grep -c "dgx-spark" site/dist/uses/index.html
```

Expected: `1`.

- [ ] **Step 3: Commit**

```bash
git add site/src/pages/uses.astro
git commit -m "feat: add issued equipment page"
```

---

### Task 7: Chronicle pages, RSS, 404 — and the zero-JS gate

**Files:**
- Create: `site/src/pages/blog/index.astro`, `site/src/pages/blog/[slug].astro`, `site/src/pages/rss.xml.js`, `site/src/pages/404.astro`

**Interfaces:**
- Consumes: collection `chronicle`, `byEditionDesc`, `docNumber` (Task 3, exact names); `MemoLayout`/`BaseLayout` (Task 2).
- Produces: routes `/blog/`, `/blog/<id>/`, `/rss.xml`, `/404.html`. Task 8's `not_found_handling: "404-page"` depends on `404.html` existing in dist.

- [ ] **Step 1: Blog index**

Create `site/src/pages/blog/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import MemoLayout from '../../layouts/MemoLayout.astro';
import { byEditionDesc, docNumber } from '../../utils/chronicle';

const posts = byEditionDesc(await getCollection('chronicle'));
---
<MemoLayout
  title="The FirstCast Chronicle"
  description="The company newspaper of a company that does not exist: the build-in-public log of the severed floor, edition by edition."
  docNumber="FC-CHRON-IDX"
  kicker="Chronicle"
>
  <p>
    All the news that is fit to circulate internally. The Chronicle documents
    the construction of the severed floor as it happens. New editions are
    announced by <a href="/rss.xml">RSS</a>.
  </p>
  <ul class="directory">
    {posts.map((p) => (
      <li>
        <a href={`/blog/${p.id}/`}>{p.data.title}</a>
        <span class="dir-route">{docNumber(p.data.edition)} · {p.data.pubDate.toISOString().slice(0, 10)}</span>
        <p>{p.data.description}</p>
      </li>
    ))}
  </ul>
</MemoLayout>
```

- [ ] **Step 2: Post page**

Create `site/src/pages/blog/[slug].astro`:

```astro
---
import { getCollection, render } from 'astro:content';
import MemoLayout from '../../layouts/MemoLayout.astro';
import { docNumber } from '../../utils/chronicle';

export async function getStaticPaths() {
  const posts = await getCollection('chronicle');
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

const { post } = Astro.props;
const { Content } = await render(post);
---
<MemoLayout
  title={post.data.title}
  description={post.data.description}
  docNumber={docNumber(post.data.edition)}
  kicker="Chronicle"
>
  <p class="doc-date">Circulated {post.data.pubDate.toISOString().slice(0, 10)}</p>
  <Content />
</MemoLayout>
```

- [ ] **Step 3: RSS**

Create `site/src/pages/rss.xml.js`:

```js
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { byEditionDesc } from '../utils/chronicle';

export async function GET(context) {
  const posts = byEditionDesc(await getCollection('chronicle'));
  return rss({
    title: 'The FirstCast Chronicle',
    description: 'Build-in-public log of the severed floor at coltonbearden.com.',
    site: context.site,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.pubDate,
      link: `/blog/${p.id}/`,
    })),
  });
}
```

- [ ] **Step 4: Break Room 404**

Create `site/src/pages/404.astro`:

```astro
---
import MemoLayout from '../layouts/MemoLayout.astro';
---
<MemoLayout
  title="Break Room"
  description="404 — the document you requested does not exist."
  docNumber="FC-BR-404"
  kicker="Compliance"
>
  <p><span class="stamp">Document not found</span></p>
  <p>
    The document you requested does not exist, was never filed, or you were
    not meant to read it. Whichever applies, we regret the inconvenience and
    ask that you review the statement below before returning to work.
  </p>
  <blockquote>
    <p>I will navigate only to documents that exist. I am grateful for the
    documents that exist. The directory in the <a href="/">lobby</a> lists
    every document that exists.</p>
  </blockquote>
</MemoLayout>
```

- [ ] **Step 5: Full verification — routes, RSS, sitemap, zero-JS**

```bash
pnpm --dir site check && pnpm --dir site test && pnpm --dir site build
ls site/dist/blog/001-orientation/index.html site/dist/rss.xml site/dist/sitemap-index.xml site/dist/404.html
grep -rl "<script" site/dist --include="*.html" || echo "ZERO-JS OK"
```

Expected: all four paths listed; final line prints `ZERO-JS OK` (no HTML file contains a script tag).

- [ ] **Step 6: Commit**

```bash
git add site/src/pages
git commit -m "feat: add chronicle pages, rss, and 404"
```

---

### Task 8: Platform files + first deploy to workers.dev

**Files:**
- Create: `site/public/robots.txt`, `site/public/_headers`, `site/public/favicon.svg`, `site/wrangler.jsonc`
- Modify: `site/package.json` (add deploy script)

**Interfaces:**
- Produces: assets-only Worker `coltonbearden-com`; `pnpm --dir site run deploy` used in Task 11; `_headers` file Task 9 verifies in production.

- [ ] **Step 1: Static platform files**

Create `site/public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://coltonbearden.com/sitemap-index.xml
```

Create `site/public/_headers`:

```
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Create `site/public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="4" fill="#23241f"/><text x="16" y="21" font-family="monospace" font-size="13" fill="#2f9e6e" text-anchor="middle">FC</text></svg>
```

- [ ] **Step 2: Wrangler config**

Create `site/wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "coltonbearden-com",
  "compatibility_date": "2026-07-15",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "404-page"
  }
}
```

Add to `site/package.json` scripts:

```json
"deploy": "astro build && wrangler deploy"
```

- [ ] **Step 3: Local check**

```bash
pnpm --dir site build
pnpm --dir site exec wrangler dev
```

Expected: local server on 8787; `curl -s http://localhost:8787/ | grep -c "FIRSTCAST"` → ≥1; `curl -sI http://localhost:8787/nope | head -1` → `HTTP/1.1 404 Not Found`. Ctrl-C to stop.

- [ ] **Step 4: Authenticate + first deploy** `[MANUAL — browser OAuth]`

```bash
pnpm --dir site exec wrangler login
pnpm --dir site run deploy
```

Expected: `Deployed coltonbearden-com` with a `https://coltonbearden-com.<subdomain>.workers.dev` URL. Open it; the lobby renders.

- [ ] **Step 5: Commit**

```bash
git add site/public site/wrangler.jsonc site/package.json
git commit -m "feat: add worker config and platform files"
```

---

### Task 9: Workers Builds CI, custom domains, redirect — DNS checkpoint

**Files:** none (dashboard + DNS operations; this task is configuration with verification).

**Interfaces:**
- Consumes: deployed Worker `coltonbearden-com` (Task 8).
- Produces: live `https://coltonbearden.com` (ends the 522), `www` → apex 301, push-to-main deploys, PR preview URLs. Task 12's Lighthouse acceptance runs against this production site.

- [ ] **Step 1: Connect Workers Builds** `[MANUAL — Dashboard]`

Dashboard → Workers & Pages → `coltonbearden-com` → Settings → Builds → Connect repository → `coltonbearden/coltonbearden.com` (originally `FirstCastSolutions423/coltonbearden.com`; reconnected after the 2026-08-22 repo transfer), branch `main`. Root directory: `site`. Build command: `pnpm install --frozen-lockfile && pnpm build`. Deploy command: `pnpm exec wrangler deploy`. Enable non-production branch builds (preview URLs).

- [ ] **Step 2: DNS checkpoint — STOP, get explicit user confirmation**

Attaching custom domains replaces two parking placeholders. Present exactly this before/after to the user and get a go-ahead:

| Record | Before | After |
|---|---|---|
| `coltonbearden.com` A `192.0.2.1` proxied (id `415158cc70fc5b1ef3b20ae42d530dbe`) | parking placeholder | replaced by Workers custom-domain record |
| `www.coltonbearden.com` CNAME → `coltonbearden.com` proxied (id `6ed5bfb8cc3e988c226fb75e886eb055`) | parking placeholder | replaced by Workers custom-domain record |

Do not proceed without the go-ahead. All other DNS records (MX, SPF, DKIM, DMARC, CAA, TLS-RPT, autoconfig) are untouched by this task.

- [ ] **Step 3: Attach custom domains** `[MANUAL — Dashboard]`

Worker → Settings → Domains & Routes → Add → Custom domain → `coltonbearden.com`; repeat for `www.coltonbearden.com`. Accept the prompt to replace the existing records.

- [ ] **Step 4: www → apex 301** `[MANUAL — Dashboard]`

Dashboard → zone `coltonbearden.com` → Rules → Redirect Rules → Create: name `www-to-apex`; When: Hostname equals `www.coltonbearden.com`; Then: Dynamic redirect, expression `concat("https://coltonbearden.com", http.request.uri.path)`, status 301, preserve query string on.

- [ ] **Step 5: Verify live**

```bash
curl -sI https://coltonbearden.com/ | head -1
curl -sI https://coltonbearden.com/ | grep -i strict-transport-security
curl -sI https://coltonbearden.com/ | grep -i x-content-type-options
curl -sI "https://www.coltonbearden.com/work/?q=1" | grep -iE "HTTP|location"
```

Expected: `HTTP/2 200`; `strict-transport-security: max-age=31536000; includeSubDomains` (no `preload`); `x-content-type-options: nosniff` (proves `_headers` works on Workers assets — if absent, port headers into a minimal Worker script instead and re-verify); `301` with `location: https://coltonbearden.com/work/?q=1`.

- [ ] **Step 6: Verify CI**

```bash
git commit --allow-empty -m "chore: trigger workers builds"
git push
```

Expected: dashboard shows a build; production serves it. Open a trivial PR afterward to confirm a preview URL appears on the build, then close it.

---

### Task 10: Web Analytics beacon

**Files:**
- Modify: `site/src/layouts/BaseLayout.astro`

**Interfaces:**
- Consumes: BaseLayout `<head>` (Task 2). Produces: beacon on every page — the sole allowed script (global constraint).

- [ ] **Step 1: Get token** `[MANUAL — Dashboard]`

Dashboard → Analytics & Logs → Web Analytics → Add site → `coltonbearden.com` → copy the token from the snippet (the `"token"` value).

- [ ] **Step 2: Add beacon**

In `site/src/layouts/BaseLayout.astro`, add as the last line inside `<head>` (paste the real token in place of `TOKEN_FROM_DASHBOARD`):

```html
<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "TOKEN_FROM_DASHBOARD"}'></script>
```

- [ ] **Step 3: Verify the JS budget still holds**

```bash
pnpm --dir site build
grep -ro "static.cloudflareinsights.com" site/dist --include="*.html" | sort -u | wc -l
grep -rho "<script[^>]*src=\"[^\"]*\"" site/dist --include="*.html" | sort -u
```

Expected: first count ≥ 1; second command lists exactly one distinct script src (the beacon). Any other script is a regression.

- [ ] **Step 4: Commit, push, confirm data**

```bash
git add site/src/layouts/BaseLayout.astro
git commit -m "feat: add web analytics beacon"
git push
```

After deploy, browse the live site, then confirm the Web Analytics dashboard shows the pageview (may take a few minutes).

---

### Task 11: MTA-STS — testing now, enforce after a clean window

**Files:**
- Create: `site/public/.well-known/mta-sts.txt`

**Interfaces:**
- Consumes: Worker + custom-domain flow (Tasks 8–9). Produces: `https://mta-sts.coltonbearden.com/.well-known/mta-sts.txt` and `_mta-sts` TXT — closing the Phase 1 deferral (spec §6).

- [ ] **Step 1: Policy file (testing mode)**

Create `site/public/.well-known/mta-sts.txt` (exact content, LF line endings):

```
version: STSv1
mode: testing
mx: aspmx1.migadu.com
mx: aspmx2.migadu.com
max_age: 86400
```

- [ ] **Step 2: Deploy + attach subdomain** `[MANUAL — Dashboard]`

```bash
git add site/public/.well-known/mta-sts.txt
git commit -m "feat: add mta-sts policy in testing mode"
git push
```

Then Worker → Settings → Domains & Routes → Add custom domain → `mta-sts.coltonbearden.com`. (No existing record at that name — nothing is replaced; the guardrail checkpoint isn't triggered.)

- [ ] **Step 3: Publish the TXT record** — via Cloudflare MCP or scoped-token API, after showing the user this new record (create-only, replaces nothing):

`_mta-sts.coltonbearden.com TXT "v=STSv1; id=20260715T000000Z"`

- [ ] **Step 4: Verify**

```bash
curl -s https://mta-sts.coltonbearden.com/.well-known/mta-sts.txt
curl -s "https://cloudflare-dns.com/dns-query?name=_mta-sts.coltonbearden.com&type=TXT" -H "accept: application/dns-json"
```

Expected: policy body verbatim (mode `testing`); TXT answer contains `v=STSv1; id=20260715T000000Z`. (Local nslookup limitations documented in CLAUDE.md — use DoH as shown.)

- [ ] **Step 5: Enforce flip** — GATED: wait ≥ 14 days, then check `tlsrpt@` reports show no delivery failures. With user confirmation, edit the policy to `mode: enforce` and `max_age: 1209600`, commit (`feat: enforce mta-sts`), push, and update the TXT id to `v=STSv1; id=<new UTC timestamp>Z`. Re-run Step 4 expecting `enforce`.

---

### Task 12: Lighthouse CI + acceptance run

**Files:**
- Create: `.github/workflows/quality.yml`, `site/lighthouserc.json`

**Interfaces:**
- Consumes: the full built site (Tasks 1–10). Produces: PR-blocking quality gate; the S1a acceptance evidence.

- [ ] **Step 1: Lighthouse config**

Create `site/lighthouserc.json`:

```json
{
  "ci": {
    "collect": { "staticDistDir": "./dist" },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.95 }],
        "categories:seo": ["error", { "minScore": 0.95 }]
      }
    }
  }
}
```

- [ ] **Step 2: Workflow**

Create `.github/workflows/quality.yml`:

```yaml
name: quality
on:
  pull_request:
  push:
    branches: [main]
jobs:
  build-and-audit:
    runs-on: ubuntu-latest
    defaults:
      run: { working-directory: site }
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm, cache-dependency-path: site/pnpm-lock.yaml }
      - run: pnpm install --frozen-lockfile
      - run: pnpm check
      - run: pnpm test
      - run: pnpm build
      - uses: treosh/lighthouse-ci-action@v12
        with:
          configPath: site/lighthouserc.json
          uploadArtifacts: true
```

- [ ] **Step 3: Commit, push, verify the gate**

```bash
git add .github/workflows/quality.yml site/lighthouserc.json
git commit -m "ci: add lighthouse quality gate"
git push
```

Expected: the `quality` workflow passes on GitHub with all three category assertions ≥ 0.95 for every dist HTML page. If a page misses, fix it (image sizes, meta, contrast) before closing this task — this is the spec's Lighthouse acceptance criterion.

---

### Task 13: Docs refresh + acceptance sweep

**Files:**
- Modify: `CLAUDE.md`, `README.md`

**Interfaces:** none downstream; this closes S1a.

- [ ] **Step 1: Update CLAUDE.md** — replace the "no application code yet" paragraph with a Commands section:

```markdown
## Commands (site/ — Astro Surface)

- `pnpm --dir site dev` — dev server
- `pnpm --dir site build` — production build to site/dist
- `pnpm --dir site check` — astro type/content check
- `pnpm --dir site test` — vitest unit tests
- `pnpm --dir site run deploy` — manual deploy (CI deploys on push to main)

Design of record: `docs/superpowers/specs/2026-07-15-severed-floor-design.md`.
Surface pages are zero-JS except the analytics beacon — keep it that way (world rule 4).
```

Also update the "Phases and current state" section: Phase 2 superseded by the Severed Floor spec; S1a shipped; the by-design-522 note is obsolete (site is live); MTA-STS status per Task 11.

- [ ] **Step 2: Update README.md** status table: Phase 2 row → "Superseded by the Severed Floor (spec 2026-07-15); Surface live". Add the production URL.

- [ ] **Step 3: Acceptance sweep** — verify each item, checking off only with evidence:

- [ ] Push to `main` deploys; PRs get preview URLs (Task 9 Step 6).
- [ ] Lighthouse ≥ 95 Performance/Best-Practices/SEO on all Surface routes (Task 12 workflow green).
- [ ] Apex + `www` serve HTTPS with valid cert; `www` → apex 301; no 522 anywhere.
- [ ] First Chronicle post live at `/blog/001-orientation/`; RSS valid (`curl -s https://coltonbearden.com/rss.xml | head -5` shows XML).
- [ ] Web Analytics receiving pageviews.
- [ ] MTA-STS policy served over HTTPS (testing now; enforce flip gated per Task 11 Step 5).
- [ ] Zero-JS rule holds (Task 10 Step 3 output).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: record surface launch and site commands"
git push
```

---

## Deferred to sibling plans

- **S1b — AI Spine:** cloudflared on nuc-285h, Zero Trust service tokens, vLLM on dgx-spark, Agents SDK worker (M.DGX + R.370 Durable Objects), inference router + Workers AI failover, compliance middleware, severance-barrier injection suite, telemetry heartbeat.
- **S1c — The Descent:** R3F + Theatre.js elevator/corridor/MDR/Reception, asset pipeline (Blender MCP, ComfyUI, image→3D), device tiering, frame-time CI, WebSocket hookup to S1b.

## Self-review notes (completed at planning time)

- Spec coverage: S1a covers spec §6 Season 1 bullets 1 and 4 fully; bullets 2–3 are S1c/S1b by design (recorded above).
- The spec's "60 fps / 2 MB / no-WebGL" criteria belong to S1c; the no-WebGL tier's content requirement is already satisfied here (the Surface IS the tier).
- Type consistency: `byEditionDesc`/`docNumber` names match across Tasks 3 and 7; `MemoLayout` props match across Tasks 2 and 4–7; `Project.status` union matches `statusLabel` keys in Task 5.
