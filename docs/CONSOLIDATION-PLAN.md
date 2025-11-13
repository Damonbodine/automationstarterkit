# Documentation Consolidation Plan

Goal: Single-source, comprehensive, and navigable docs. Preserve existing content, remove redundancy, and standardize structure.

## Target Structure (Canonical)
- `docs/INDEX.md` — Entry point and navigation
- `docs/overview.md` — Product + technical overview (merge of 00-overview, QUICK_START)
- `docs/architecture.md` — System architecture with images + Mermaid sources
- `docs/data-model.md` — Database schema (merge of 00-database-schema)
- `docs/api.md` — API reference (merge of 00-api-specs)
- `docs/agents-queues.md` — Agents, queues, workers, scheduler (from AGENTS-AND-QUEUES)
- `docs/operations.md` — Setup, environment, deployment, monitoring, runbooks (merge infra docs)
- `docs/development.md` — Local dev, scripts, patterns, tests, contribution guidelines
- `docs/security.md` — Security, secrets, hardening, compliance notes
- `docs/prd.md` — Product requirements (merge PRD + PRD/*)
- `docs/appendix.md` — Decisions, risks, pricing and other references

## Source → Destination Mapping
- 00-overview.md → overview.md
- QUICK_START.md → overview.md (section: Quick Start)
- 00-architecture.md → architecture.md (retain Mermaid sources, embed generated images)
- diagrams/*.mmd → referenced from architecture.md; images in diagrams/*.svg, *.png
- 00-database-schema.md → data-model.md
- 00-api-specs.md → api.md
- AGENTS-AND-QUEUES.md → agents-queues.md (already aligned)
- INFRASTRUCTURE-SETUP-GUIDE.md + INFRASTRUCTURE-READINESS.md → operations.md
- SETUP_INSTRUCTIONS.md + DOCUMENTATION.md + STARTER_PACK_OVERVIEW.md + STARTER_PACK_ONBOARDING.md → development.md (dedupe and keep essential guidance)
- PROJECT-DASHBOARD.md → prd.md (UI/UX sections)
- PRD.md + PRD/* → prd.md (single long-form document with subsections)
- appendix-security.md → security.md
- appendix-decisions.md + appendix-risks.md + appendix-pricing.md → appendix.md

## Execution Steps
1) Create canonical files (scaffold) and insert top-level headings.
2) Migrate content section-by-section from sources to targets, deduping.
3) Add redirects/notes in old files: “Moved to <new path>” (temporary).
4) Update internal links across docs and README.
5) Remove duplicates after sign-off.

## Open Questions
- Keep PRD as a single document or split by phases under a unified ToC?
- Retain any legacy infra content (FastAPI OCR) or archive it?
- Preferred link style: relative paths vs. repo anchors for Vercel/website renderers.

## Status
- Index created: docs/INDEX.md (Done)
- Diagrams generated: docs/diagrams/*.svg, *.png (Done)
- Canonical docs scaffolded: overview, architecture, operations, development, api, data-model, security (Done)
- PRD phases indexed at `docs/prd/README.md` (Done)
- Legacy docs marked with pointers (Done)
- Next actions: full content migration of remaining detailed sections and pruning legacy after sign-off (In Progress)
