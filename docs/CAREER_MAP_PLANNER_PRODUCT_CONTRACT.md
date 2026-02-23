# Career Map Planner Product Contract (v1)

Last updated: February 23, 2026  
Owners: Product + Engineering

## 1) Purpose

Define a hard contract for what "premium" means in Career Map Planner so implementation stays deterministic, source-backed, and auditable.

This document is the single source of truth for:
- output sections
- non-negotiables
- data dependencies
- scoring model
- explainability/provenance requirements
- quality gates and rollout phases

## 2) Premium Output Contract

Every generated report MUST contain these sections in this order.

### 2.1 Resume Reframe
- Shape: 2 to 6 before/after bullet pairs.
- Each pair includes:
  - `before`: original user bullet or extracted resume bullet
  - `after`: rewritten bullet using only verified facts
  - `source_tags[]`: at least 1 source reference
- Constraints:
  - no generic filler (forbidden examples in section 3)
  - no invented metrics or claims

### 2.2 Compatibility Snapshot
- Shape:
  - `score` integer 0..100
  - `band` enum: `strong | moderate | weak`
  - `top_reasons[]` length 3 to 5
  - `score_breakdown` by weighted factor
  - `source_tags[]`
- Constraints:
  - score must be reproducible from stored normalized inputs + stored occupation dataset rows

### 2.3 Suggested Careers
- Shape:
  - top 3 to 6 occupations
  - each row: `occupation_id`, `title`, `match_score`, `why_fit`, `wage_summary?`, `source_tags[]`
- Constraints:
  - must map to normalized occupation IDs from internal dataset

### 2.4 Skill Gaps
- Shape:
  - 3 to 7 gaps
  - each row: `skill_id`, `skill_name`, `importance_weight`, `current_status`, `closure_actions[]`, `source_tags[]`
- Constraints:
  - gaps are based on weighted occupation skills and user skill evidence

### 2.5 Roadmap
- Shape:
  - timeline-aware plan (section 8)
  - grouped by phase
  - each item includes: `estimated_hours`, `difficulty`, `proof_of_work`, `source_tags[]`
- Constraints:
  - changing timeline changes plan structure, not just wording

### 2.6 Links/Resources
- Shape:
  - official + curated links
  - each row includes: `title`, `url`, `type`, `region`, `source_tags[]`
- Constraints:
  - official/legal requirements should prioritize government/regulator/trade-body sources

## 3) Non-Negotiables

1. No generic filler language.
2. No made-up salary ranges, certification requirements, or legal requirements.
3. Every claim must cite either:
   - user input (form/resume extraction), or
   - dataset entry (with source metadata).
4. Unknown data must be labeled `unknown` and surfaced to the user.
5. Any output must answer: "Where did this come from?"

### Forbidden filler examples
- "reframed to highlight..."
- "optimized for ATS" without supporting evidence
- "industry-standard salary is ..." without cited dataset row

## 4) Explainability UI Pattern

Summary-first with progressive disclosure.

### Required behavior
- Each major section shows:
  - concise summary (default visible)
  - `Why?` expander (hidden by default)
- `Why?` expander must include:
  - input evidence used (resume/form fields)
  - dataset rows used (dataset name + date/version)
  - scoring logic used for that section

### Required copy pattern
- Header: human summary first.
- Expander label: `Why this?` or `How calculated?`
- Footer line in each section: `Sources used: n`

## 5) Data Sources (Backbone)

v1 supported regions: Canada + United States.

## 5.1 Occupation + skills graph
- US: O*NET database import (download-based).
- Canada: NOC mapping + job profiles, starting with NOC 72200 (Electricians, excluding industrial and power system).

Required tables:
- `occupations (id, title, region, codes, description)`
- `occupation_skills (occupation_id, skill_id, weight)`
- `skills (id, name, aliases)`
- `occupation_requirements (education, certs/licenses, notes)`

## 5.2 Wages + outlook
- Canada: Job Bank wage reports by NOC + region.
- Optional credibility layer: StatsCan income tables for trades/journeyperson pathways.

Required table:
- `occupation_wages (region, low/median/high, source, last_updated)`

## 5.3 Ontario trades requirements module

For Ontario trade code `309A` (Electrician - Construction and Maintenance):
- Skilled Trades Ontario trade profile link
- apprenticeship/provisional CoQ logic
- Certificate of Qualification links
- Training standards/curriculum level links

Required table:
- `trade_requirements (trade_code, province, hours, levels, exam_required, official_links[])`

Acceptance:
- Trades output can render an `Official requirements` panel with official sources.

## 6) User Intake Contract (MVP)

Replace shallow dropdowns with normalized structured fields:
- work style: `remote | hybrid | onsite | relocation`
- location autocomplete (city/region/country + lat/lng)
- timeline: `immediate | 1_3_months | 3_6_months | 6_12_months | 1_plus_year`
- education + credentials
- income target range
- optional: risk tolerance, physical_vs_desk preference

UX pattern:
- chips + custom input (`Use custom ...`)

Autocomplete providers:
- places provider (Mapbox or Google)
- skills from internal `skills`
- job titles from `occupations` + aliases

Acceptance:
- natural typing is allowed, stored value must be normalized ID + raw display value.

## 7) Resume Parsing Contract

Inputs:
- PDF + DOCX

Extract and normalize:
- job titles, companies, dates
- achievement bullets
- skills
- education
- certifications
- title -> occupation candidates
- skill text -> skill IDs

Confidence:
- each extracted field includes confidence score
- low-confidence fields require user confirmation UI

Acceptance:
- UI shows `Detected sections` and enables fast correction.

## 8) Deterministic Scoring Contract

Weights (must sum to 100):
- Skill overlap: 40
- Experience adjacency: 25
- Education fit: 10
- Certification/licensing gap: 15
- Timeline feasibility: 10

Adjacency approach:
- v1: cosine similarity on skill vectors + title similarity
- v2+: graph-based transition priors

Output:
- integer score `/100`
- factor breakdown
- strength label: `strong | moderate | weak`

Acceptance:
- same normalized input + same dataset version => same score.

## 9) LLM Contract (Explainer, Not Brain)

The LLM receives a strict facts bundle only:
- top matched occupations
- matched skills
- missing high-weight skills
- requirements + wages + official links
- timeline constraints

LLM can produce only:
- readable explanation text
- roadmap prose
- resume bullet rewrites

Hard rules:
- if required data is missing: ask user or mark `unknown`
- never invent wage/cert/legal facts
- every generated section includes source tags:
  - `from_resume`
  - `from_form`
  - `from_dataset` (with source name/date)

Acceptance:
- no template filler
- each section can cite underlying data objects.

## 10) Roadmap Engine Contract

Timeline templates:
- Immediate (0-30 days): search strategy + minimum viable credentials
- 1-3 months: targeted upskilling + portfolio artifact
- 3-6 months: deeper skill closure + networking cadence
- 6-12+ months: credential track + apprenticeship/degree path

Trades path behavior (Ontario `309A`):
- show entry path vs full certification path
- show official links + checklist

Each roadmap item includes:
- estimated hours
- difficulty
- proof-of-work artifact

Acceptance:
- timeline changes alter structure, effort, and artifact expectations.

## 11) Report UI Contract

Required report modules:
- Compatibility Snapshot card
- skills match visualization (bars acceptable)
- skill gaps with `How to close` expanders
- roadmap columns with checkable items
- export actions

Required `Why this?` toggles:
- why this career
- how score calculated
- where salary came from

Export targets:
- PDF report
- Markdown / Notion-friendly markdown
- calendar export (later)

Acceptance:
- 30-second skim works
- 5-minute deep dive explains provenance.

## 12) Trust, Safety, Privacy

Data transparency footer:
- `Your inputs used: ...`
- `Datasets used: O*NET, Job Bank, Skilled Trades Ontario, ...`

Privacy controls:
- delete report
- delete resume extraction data
- optional mode: do not store raw resume file (store structured extraction only)

Logging:
- store facts bundle used for generation

Acceptance:
- when challenged, system can show exact provenance trail.

## 13) QA Gate (Ship Criteria)

Golden personas:
1. trades switcher (chef -> electrician)
2. retail -> office operations
3. student -> first role
4. tech pivot
5. new immigrant with relocation constraints

Scenario tests:
- empty inputs
- messy resumes
- missing education
- conflicting location/timeline

Validation checks:
- no hallucinated wages/certs
- output references at least 3 user facts
- score changes when relevant inputs change
- repeated run with same inputs is stable

## 14) Rollout Plan

### Phase 1 (ship fast but legitimate)
- Canada + US occupation coverage bootstrap
- real wages
- deterministic scoring
- LLM explanations constrained by facts bundle
- report-style UI

### Phase 2 (premium jump)
- resume parsing + normalization hardening
- stronger adjacency transitions
- official resources by province/state

### Phase 3 (defensible moat)
- probability-of-success model
- outcome tracking (applications/interviews)
- personalized iteration loop

## 15) Definition of Done for v1 Contract Adoption

1. All new planner outputs conform to section contract in this doc.
2. Source tags are present and visible in UI explainers.
3. Deterministic score is reproducible from stored inputs + dataset version.
4. No uncited wage/cert/legal claims in QA runs.
