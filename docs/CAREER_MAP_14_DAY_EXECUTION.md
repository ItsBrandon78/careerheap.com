# Career Map Planner 14-Day Execution Plan

Scope is fixed to US + Canada and deterministic planner output only.

## Day 1-2
- Apply migrations `001`..`006` in Supabase.
- Run ingestion in write mode: `npm run ingest:career-data -- --all --write`.
- Seed FX rates: `npm run seed:fx-rates`.
- Verify core table counts (`dataset_sources`, `occupations`, `occupation_wages`, `trade_requirements`).

## Day 3-5
- Stabilize deterministic scoring + match engine (DB-backed only).
- Enforce weighted scoring:
  - Skill overlap (40)
  - Experience similarity (25)
  - Education alignment (10)
  - Certification gap (15)
  - Timeline feasibility (10)
- Validate score reproducibility on repeated runs.

## Day 6-7
- Resume parsing hardening:
  - PDF/DOCX extraction
  - structured title/skill/cert extraction
  - skill/title normalization to DB IDs
  - confidence fields + editable chips in UI

## Day 8-10
- Planner report UI completion:
  - Compatibility snapshot
  - Top career paths with salary (USD + native CAD)
  - Skill gaps
  - Timeline-aware roadmap
  - Data transparency panel

## Day 11-12
- Stripe gating completion:
  - Free: one full analysis, limited roadmap, no resume rewrite
  - Pro: unlimited analyses, resume parsing, full roadmap

## Day 13
- QA sweep:
  - no hallucinated wages/licensing
  - CAD conversion validation via `fx_rates`
  - score sensitivity tests (input changes produce score changes)

## Day 14
- Production deploy + checklist:
  - ingestion completed
  - Stripe live keys configured
  - FX current
  - source links valid
  - no console/server errors

