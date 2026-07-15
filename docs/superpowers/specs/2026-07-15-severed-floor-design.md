# coltonbearden.com — "The Severed Floor" Design Spec

> **Status:** Approved by user 2026-07-15 (brainstorming session, all four sections locked).
> **Supersedes:** blueprint §4 (Phase 2 · Presence) — the content-first Astro presence site. The blueprint remains reference context; this spec is the design of record for the site itself.
> **Next step:** implementation plan via superpowers:writing-plans, scoped to Season 1.

---

## 1. Concept

coltonbearden.com is not a portfolio; it is a **parody world** — an obvious spoof of the *Severance* opening titles. The site is a retro-corporate "severed floor" where **AI innies, running live on Colton's real six-machine fleet, do the work**. Visitors descend into the floor, wander it, and interrogate it. Everything a conventional personal site would say in prose is communicated through visuals and mechanics instead.

**Audience:** mixed (prospective clients/employers, dev community, future product funnel). LinkedIn carries the vanilla resume; this site carries the proof of capability — the proof being that the AI experience is *really happening*, not described.

**Tone principle (the Goldilocks rule):** go as deep into the severed-workplace genre as possible while remaining a *spinoff that tells Colton's story*, never a clone. Concretely:

- The in-world corporation is a **fictionalized refraction of FirstCast** with its own founder mythology, naming, typography, and iconography — not Lumon with serial numbers filed off.
- We borrow genre *conventions* (severed work, corporate religion, wellness rituals, ominous cheerfulness) — never protected *expression* (no Lumon logos, no lifted title sequences, no copied character names or scripts).
- Every joke should still land for a visitor who has never seen the show; familiarity only deepens it.

## 2. World Structure

The site is a vertical descent. Every in-world room does double duty as a real, crawlable route.

### Level 0 · The Surface — "the public record"

Prerendered, zero-JS Astro pages styled as retro corporate documents ("paper twins"): `/about` (Personnel File), `/work` (Completed Works), `/blog` (The Chronicle, with RSS), `/uses` (Issued Equipment), `/contact` (Reach Compliance). This is where SEO is earned — no crawler ever needs WebGL. Each page carries a persistent **"DESCEND ↓"** invitation into the world.

### The Elevator — `/`

The landing page *is* the descent: a scroll-driven 3D camera fall from the Surface through the severance threshold onto the floor. Theatre.js choreographs the sequence.

### Level −1 · The Severed Floor — the 3D world

| Room | Route | Mechanic |
|---|---|---|
| **Macrodata Refinement** | `/work` | CRT terminals with drifting number grids. Refine a cluster that "feels scary" → a real project case-study is revealed. The MDR innie answers questions about any project — live. |
| **Wellness Center** | `/about` | The wellness director recites facts about your outie ("Your outie administers a six-machine fleet."). The about page, as ritual. |
| **Chronicle Print Room** | `/blog` | In-world broadsheet; build-in-public posts printed as company news. Real MD/MDX content collection underneath. |
| **Perpetuity Wing** | `/uses` + homelab | Museum of the six fleet machines as revered exhibits, with live telemetry plaques ("DGX SPARK — presently dreaming at 43 tok/s"). |
| **Reception** | `/contact` | The receptionist innie takes your message → delivered to `inbox@`. Socials as visitor badges. |
| **Break Room** | errors & limits | 404s, rate limits, and abusive prompts route here: read the apology until sincere. Failure states as content. |

### Level −2 · The Testing Floor — sealed

Future seasons: living-floor observation deck, deeper lore, easter eggs. The elevator doesn't stop here yet; locked doors are visible in Season 1.

### The Innies

Each innie is a real agent bound to a real machine, badge on desk:

| Badge | Machine | Role |
|---|---|---|
| `M.DGX` | DGX Spark | Refiner (MDR) — primary model, vLLM |
| `W.NUC` | NUC 15 Pro+ | Wellness director |
| `R.370` | Minisforum X1 Pro-370 | Receptionist |
| `C.255` | Minisforum X1-255 | Chronicle editor |

When a machine is offline, its innie is "in the break room" and an edge fallback covers the shift (§4).

### World rules (invariants)

1. **Parody, never copy** — original names, type, assets; evoke, don't lift.
2. **Every room has a paper twin** — the world never costs SEO or accessibility.
3. **Innies are real agents on real fleet hardware** — the joke is that it's true.
4. **No-WebGL / reduced-motion / weak-device visitors get the Surface as a complete site** — CRT-styled, full content, not an apology page.

## 3. Experience & Technical Architecture

Three planes:

### Plane 1 · The World — visitor's browser

- **Stack:** Astro shell; the world is a full-page **React Three Fiber** island on `/`; **Theatre.js** sequences the descent and camera choreography; GSAP for DOM-level motion.
- **Scene loading:** rooms are lazy scene chunks fetched as the camera approaches; never one monolithic bundle. Wire budget ≤ ~2 MB per room (meshopt + Draco geometry, KTX2 textures via gltf-transform).
- **Terminal UI layer:** in-room CRT screens are DOM overlays projected over the 3D scene — dialogue, MDR grids, and forms are real DOM (crisp, selectable, accessible), never text baked into textures.
- **Device tiering:** WebGL2 + adequate GPU → full world. Weak device, `prefers-reduced-motion`, or no JS → the Surface. Tier detection at first paint; user-overridable both directions ("Take the stairs" / "Descend anyway").
- **Paper twins:** canonical URLs live on the twins; the world deep-links (`/#/floor/mdr` style world-state routes resolve to the same content as `/work`). `rel=canonical` keeps SEO consolidated.

### Plane 2 · The Company — Cloudflare edge

- **Delivery:** Astro build served as **Workers static assets** (deliberate divergence from blueprint D3's "Pages" — see D12). Git push → Workers Builds CI → deploy; PR preview URLs.
- **Innie brains:** **Cloudflare Agents SDK** — one Durable Object per innie holding persona state, conversation memory, room state, and a work queue. WebSockets to visitors. Scheduled tasks keep innies "working" between visits.
- **Compliance department (edge middleware):** per-IP/session rate limits, prompt-injection screening, token budget alarms, abuse routing to the Break Room (429/403 as in-world scenes). Turnstile only if bot pressure demands it.
- **Inference router:** health-checked routing, homelab-first:
  - **Primary:** fleet endpoints via **Cloudflare Tunnel** with Zero Trust service-token auth. One ingress rule per service; Tailscale remains the admin plane (blueprint Phase 4 guardrails hold).
  - **Fallback:** **Workers AI** when the fleet is unreachable — played in-world: "your refiner is in the break room; a floater is covering the shift."
  - **Marquee moments** (e.g., wellness session finale) may call the Claude API where frontier quality is worth it.

### Plane 3 · The Basement — the fleet

- **DGX Spark:** vLLM serving the primary innie model (OpenAI-compatible); off-hours it runs local genAI jobs (ComfyUI, image→3D).
- **NUC + minis:** Ollama for the smaller innies; Docker on nuc-285h hosts `cloudflared` and shared services.
- **Telemetry:** each machine pushes a heartbeat (~30 s: up, load, tok/s) to the edge; Perpetuity Wing plaques and innie desk lamps reflect real machine state.

## 4. AI System Design

- **The severance barrier is the safety model.** Innies know only *work*: RAG over the site's own content collections (projects, posts, uses, public professional facts). Personal information is severed — extraction attempts get the canonical response ("that information is severed"), repeat offenders route to the Break Room. Theme and security posture are the same object.
- **Personas as employee handbooks:** versioned persona docs per innie in the repo — voice: corporate-sincere, faintly unsettling, fundamentally kind. Each ships with eval prompts (persona adherence, knowledge boundaries, refusal behavior).
- **The innies actually work:** scheduled DO tasks produce visible artifacts — Chronicle innie drafts commit summaries, the refiner "processes" overnight, desk lamps mirror telemetry. The floor moves at 3 a.m. with nobody watching.
- **Cost controls:** edge token budgets with alarms; small local models by default; frontier calls reserved for marquee interactions.

## 5. Production Pipeline & Tool Wishlist

Philosophy: **local-first on the fleet** (thematically correct — the innies generate their own world in the basement); SaaS only where quality or speed clearly wins. Estimated SaaS run-rate at full Season 1 kit: ~$30–60/mo.

| Tool | Unlocks | Priority |
|---|---|---|
| Blender + **Blender MCP** | Claude assembles rooms, sets materials, bakes lighting, exports compressed glTF programmatically; closed loop with Playwright screenshot verification | **Season 1, day one** |
| ComfyUI + Flux (DGX / 5070 Ti) | Local texture/concept/matte generation, API-driveable | **Season 1** |
| TRELLIS or Hunyuan3D (local, OSS) | Image→3D prop generation on own GPUs (office inventory) | **Season 1** |
| Midjourney | Style frames per room before 3D work; style-refs for world coherence | **Season 1** |
| ElevenLabs | Wellness director's voice; PA announcements; SFX | **Season 1 (one voice)** |
| Suno | Retro-corporate muzak; title theme | Season 1–2 |
| Meshy / Tripo / Rodin (credits) | SaaS image→3D backup when local quality falls short | As needed |
| Higgsfield | Cinematic AI video — season trailers, build-in-public social, in-world "training films" | Season 2 |
| Google GenAI (Veo 3 / Imagen) | Video/image alternates; optional second-model screenshot critique in CI | Season 2 |
| Recraft | Fictional corp brand system: logo, badges, letterhead vectors | Season 1–2 |

## 6. Seasons Roadmap

Build in public; releases are numbered **Seasons** (on-theme; the roadmap is content). The Chronicle documents the build — first post is the kickoff.

### Season 1 — "Orientation" (v1, target: weeks)

- The Surface complete: all six paper twins with real content, RSS, first Chronicle post.
- The Descent, minimal but real: elevator → one corridor → **two rooms**: MDR (refine-to-reveal + live M.DGX innie) and Reception. Remaining rooms as visible locked doors.
- Full AI spine: Tunnel + Zero Trust to DGX vLLM; Workers AI failover (proven by killing the tunnel); compliance layer; severance barrier tested against a basic injection suite.
- Platform: Workers static assets + CI + PR previews; apex-canonical (`www` → apex 301); Web Analytics; **MTA-STS to `enforce`** (closes Phase 1 deferral).

**Season 1 acceptance criteria**

- [ ] Push to `main` deploys; PRs get preview URLs.
- [ ] Lighthouse ≥ 95 (Performance / Best Practices / SEO) on all Surface routes.
- [ ] World budget: 60 fps on the reference device (2021-class integrated-GPU laptop at 1080p — same profile used by the frame-time CI gate); ≤ 2 MB wire per room; complete no-WebGL experience.
- [ ] Live innie conversation works fleet-up **and** during a deliberate fleet outage (failover drill).
- [ ] Severance barrier holds against the injection test suite.
- [ ] First Chronicle post published; Web Analytics receiving; apex canonical enforced.
- [ ] MTA-STS policy served over HTTPS, mode `enforce`.

### Season 2 — "The Floor Expands"

Wellness Center, Chronicle Print Room, Perpetuity Wing (live plaques), remaining innies, ElevenLabs voice, Higgsfield season trailer.

### Season 3 — "The Testing Floor"

Living-floor observation deck (Approach B's spectacle, absorbed), deeper lore, easter eggs. Goats.

## 7. Testing Strategy

- **Surface:** Lighthouse CI on every PR; HTML validation; link checks.
- **World:** Playwright screenshot regression per scene (device-tier matrix); frame-time budget checks on a reference low-end profile.
- **Innies:** eval-prompt suites per persona (adherence, knowledge boundary, refusal); injection test suite for the severance barrier.
- **Infra:** router failover drill scripted (tunnel down → floater responds ≤ 2 s degradation); telemetry staleness alerts.

## 8. Decision Log Additions

| ID | Decision | Rationale | Rejected |
|---|---|---|---|
| D11 | Experiential pivot: the site is a parody world, not a content-first presence site | User's core goal: communicate via visuals/mechanics, not prose; "one of a kind" is the brief; LinkedIn covers vanilla | Blueprint §4 presence site (kept as the Surface, absorbed) |
| D12 | Deploy as **Workers static assets**, not Pages | CF's current recommended path (migration guide published; DOs "simpler and recommended" on Workers — verified in docs 2026-07-15); Agents SDK lives on Workers | Pages (blueprint D3's delivery half; Astro half retained) |
| D13 | Pull Phase 4 (Tunnel + Zero Trust) forward into Season 1 | Its own trigger fired: the site needs a public inference API; guardrails unchanged (per-service ingress, Tailscale = admin plane) | Waiting for Phase 3 to trigger it |
| D14 | Parody-not-copy with original FirstCast-refracted mythology | Legal safety + creative identity; spinoff-not-clone is the user's stated Goldilocks | Direct Lumon homage (clone risk); generic corporate theme (loses the bit) |
| D15 | 3D world (Approach C) with A-as-fallback | User chose the highest ceiling; AI toolchain (§5) makes solo 3D production feasible; the Corporate-OS aesthetic survives as the Surface/CRT layer and no-WebGL tier | A (Corporate OS only), B (isometric-first) |

## 9. Out of Scope

- Phase 3 (Commercial) — unchanged; still gated on the plugin platform nearing sellable (blueprint D9: likely a FirstCast-branded surface).
- DMARC ramp and remaining Phase 1 tails — tracked in the Phase 1 plan, not this spec.
- Voice *input* from visitors (mic permissions) — revisit Season 2+.
- Multiplayer presence (seeing other visitors on the floor) — Testing Floor material.

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| 3D scope balloons; v1 slips from weeks to months | Season 1 is two rooms + locked doors; AI asset pipeline; the Surface ships value even if the world slips |
| Fleet dependency embarrasses the marquee feature | Fallback is a first-class, on-theme feature built and drilled in Season 1 |
| Parody drifts into clone territory | D14 invariant + original mythology reviewed at each season boundary |
| WebGL perf tanks on mid hardware | Device tiering, per-room budgets, frame-time CI gate |
| Public LLM endpoint abuse | Compliance layer: rate limits, injection screening, token budget alarms, Break Room routing |
