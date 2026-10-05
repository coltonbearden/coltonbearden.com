# coltonbearden.com

The website and the operating record of [coltonbearden.com](https://coltonbearden.com) — Colton Bearden's personal website and a lifelong, multi-purpose domain.

**Production:** https://coltonbearden.com

## Status by lane

The repo works in three lanes (D27, 2026-09-30).

| Lane | Scope | State |
|---|---|---|
| Public presence | Personal site: about, work, notes (`/blog/`, RSS), uses, contact | ✅ Live — plain personal-site copy on the interim paper/memo look, with social links (GitHub, LinkedIn, Instagram) and a catalog of public repositories on `/work/` (D32) |
| Domain operations | Email (Migadu; DMARC, MTA-STS, TLS-RPT), DNS, CAA, redirect rules, the Workers deploy, `security.txt`, future subdomains | ✅ Foundation complete (2026-07-14). MTA-STS `enforce`; DMARC `p=quarantine` (one step left); enforced CSP; deploy gate with two required checks; DNS snapshot + drift tool |
| Design | How the presence lane looks | Candidate A (the Severed Floor spec) on file; further candidates will be compared on branches via preview URLs |

## Docs

- [Domain lane: registry, registrar, email, DNS snapshot](docs/domain/README.md)
- [Blueprint and decision log (§10)](docs/specs/coltonbearden-com-blueprint.md)
- [Phase 1 (domain foundation) execution record](docs/superpowers/plans/2026-07-14-coltonbearden-com-phase1-foundation.md)
- [Design candidate A: the Severed Floor spec](docs/superpowers/specs/2026-07-15-severed-floor-design.md)
- [Season 1a plan (candidate A's Surface build)](docs/superpowers/plans/2026-07-15-season1a-surface-platform.md)
