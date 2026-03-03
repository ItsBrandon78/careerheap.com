# Roadmap Planner QA Report

## A) Current State Diagnosis

### Confirmed 2026 Canada test suite (source of truth for this QA pass)

1. Orthodontist
2. Anesthesiologist
3. Psychiatrist
4. Surgeon
5. Cardiologist
6. Physician (Family or General Practice)
7. Chief Marketing Officer
8. Software Engineering Manager
9. Vice President
10. Director of Information Technology
11. Enterprise Architect
12. Corporate Controller
13. Software Architect
14. Pharmacist
15. Data Scientist
16. Product Manager
17. Cybersecurity Analyst
18. Sales Director
19. Construction Manager
20. Mechanical Engineer

### Current planner pipeline (production path)

1. UI collects wizard inputs in [CareerSwitchPlannerClient.tsx](c:/dev/careerheap-app/app/tools/career-switch-planner/CareerSwitchPlannerClient.tsx).
2. API normalizes and validates request payload in [route.ts](c:/dev/careerheap-app/app/api/tools/career-switch-planner/route.ts).
3. Role titles are resolved in [resolveOccupation.ts](c:/dev/careerheap-app/lib/occupations/resolveOccupation.ts).
4. Core planner analysis is built in [careerMapPlanner.ts](c:/dev/careerheap-app/lib/server/careerMapPlanner.ts).
5. Transition Mode output is generated in [generatePlan.ts](c:/dev/careerheap-app/lib/transition/generatePlan.ts) via template selection in [selectTemplate.ts](c:/dev/careerheap-app/lib/transition/selectTemplate.ts).
6. Structured enhancement / script caching is added in [transitionPlanEnhancer.ts](c:/dev/careerheap-app/lib/server/transitionPlanEnhancer.ts).
7. UI renders hero, insight cards, roadmap tabs, toolkit, advanced insights, and PDF print mode in [CareerSwitchPlannerClient.tsx](c:/dev/careerheap-app/app/tools/career-switch-planner/CareerSwitchPlannerClient.tsx).

### Where it currently fails

- The roadmap schema does not include explicit `cost` fields, so users cannot judge affordability.
- The roadmap schema does not include explicit `prereqs` fields, so gates are implied rather than listed cleanly.
- Highly regulated careers still risk looking too similar across personas unless the generator is forced to react more strongly to missing education and credential gates.
- There is no budget input in the planner payload today, so the product cannot produce a real cost-fit path for constrained users.
- The UI still has to infer "what you already have / need / nice to have" from multiple payload sections instead of one idiot-proof roadmap structure.
- Rich and non-traditional personas can collapse into very similar roadmap output when the role is heavily regulated, which reduces trust.
- In this local shell, the full DB-backed planner path is blocked by missing Supabase admin env vars, so QA currently falls back to deterministic fixtures for generator testing.

### Do Not Touch (high risk)

- [route.ts](c:/dev/careerheap-app/app/api/tools/career-switch-planner/route.ts): rate limiting, usage metering, persistence, cache writes.
- `app/api/*`, `middleware.*`, `lib/supabase/*`, `stripe/*`, auth flows, billing flows.
- Report persistence and cache schema in `career_map_reports` unless the change is additive and backward compatible.
- Blog, Sanity, and locked-tool routing.

## B) Test Harness: Scenario-Based QA

### Harness added

- Script: [roadmap-planner-qa.ts](c:/dev/careerheap-app/scripts/roadmap-planner-qa.ts)
- NPM command: `npm run qa:roadmap-planner`

### Matrix

- 20 target jobs x 3 personas = 60 deterministic scenarios.
- Personas:
  - `minimal`: no resume, only current role + goal job.
  - `rich`: richer aligned background with skills + experience.
  - `nontraditional`: unrelated background, lower education, wants timeline clarity and low upfront cost.

### Execution note

- In this environment, `generateCareerMapPlannerAnalysis()` cannot hit the real Supabase-backed data path because `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SECRET_KEY` are not available.
- The harness therefore:
  - tries the real planner path first
  - falls back to a deterministic QA fixture when env is missing
  - still runs the real `generateTransitionPlan()` logic and validates with `TransitionModeSchema`

### First 6 tests run (completed)

Executed:
- Orthodontist x `minimal`
- Orthodontist x `rich`
- Orthodontist x `nontraditional`
- Anesthesiologist x `minimal`
- Anesthesiologist x `rich`
- Anesthesiologist x `nontraditional`

### Findings from first 6 tests

#### Shared findings (applies to all 6)

- **Critical**: No explicit roadmap cost estimates.
  - Root cause: `TransitionModeSchema.plan90` has no cost fields.
  - Proposed fix: add additive `costRange` metadata per step plus a section-level budget summary.
  - Acceptance: every step renders a cost range or `varies by province/employer`.

- **High**: No explicit prerequisites field.
  - Root cause: current plan steps only expose `tasks`, `weeklyTargets`, and `timePerWeekHours`.
  - Proposed fix: add additive `prereqs` arrays and map existing hard gates / must-haves into them.
  - Acceptance: every step shows named prerequisites when relevant.

- **High**: Rich and non-traditional personas produced materially identical outputs to the minimal persona in the first regulated-healthcare sample.
  - Root cause: regulated-profession template is overweighting generic role gating and underweighting persona-specific evidence.
  - Proposed fix: make education level, aligned experience, and current evidence materially change difficulty, timeline floor, and first 3 steps.
  - Acceptance: the same target role yields different timelines / first steps when persona evidence differs.

- **Medium**: The first phase is directionally better than old compatibility copy, but it still lacks "proof of progress" phrasing in a checklist form.
  - Root cause: current plan90 structure is not a step object; it is a phase object with arrays.
  - Proposed fix: layer a new normalized roadmap object over existing output instead of replacing `plan90`.
  - Acceptance: UI can render `step title`, `why`, `time`, `cost`, `prereqs`, and `this week proof`.

### First 6 sample outputs (trimmed)

#### Orthodontist / minimal

- Difficulty: `9.8 (Very Hard)`
- Timeline: `13-22 months`
- Primary route: `Primary route: education plus licensure sequence`
- First phase tasks:
  - Confirm the required degree, licensing body, exam path, and supervised-practice sequence.
  - Compare programs or routes by cost, admissions timeline, and time to licensure.
  - Speak with 3 people already in the field so you understand the real training path.

#### Orthodontist / rich

- Difficulty: `9.8 (Very Hard)`
- Timeline: `13-22 months`
- Primary route: `Primary route: education plus licensure sequence`
- Issue: same top-line output as minimal persona despite more aligned background.

#### Orthodontist / nontraditional

- Difficulty: `9.8 (Very Hard)`
- Timeline: `13-22 months`
- Issue: same top-line output as minimal persona, even though missing-education pressure should be even more explicit.

#### Anesthesiologist / minimal

- Difficulty: `9.8 (Very Hard)`
- Timeline: `13-22 months`
- Primary route: `Primary route: education plus licensure sequence`

#### Anesthesiologist / rich

- Difficulty: `9.8 (Very Hard)`
- Timeline: `13-22 months`
- Issue: same top-line output as minimal persona.

#### Anesthesiologist / nontraditional

- Difficulty: `9.8 (Very Hard)`
- Timeline: `13-22 months`
- Issue: same top-line output as minimal persona.

## C) Product Spec: Transition Mode Output (new standard)

The new standard should be additive and UI-safe:

1. Goal Summary
   - Plain-language destination and path summary.
2. Reality Check
   - Regulated / education gates.
   - Time-to-eligible range.
   - Province/employer caveat when uncertain.
3. Step-by-step Roadmap
   - `title`
   - `whyItMatters`
   - `timeRange`
   - `costRange`
   - `prereqs`
   - `proofChecklist`
4. Skills + Certs + Education
   - `youAlreadyHave`
   - `youNeed`
   - `niceToHave`
5. Experience Builders
   - entry roles, volunteering, portfolio, supervised practice, apprenticeship, shadowing.
6. Job Search Plan
   - resume tweaks, keywords, networking, outreach script, employer questions.
7. Risks & Alternatives
   - "If you cannot do X, do Y."
8. Next 7 Days
   - 3-5 micro-actions with visible outcomes.

### Safe implementation approach

- Keep existing `transitionMode` output intact.
- Add a new derived `roadmapGuide` object beside it.
- Let the UI prefer `roadmapGuide` when present, otherwise fall back to current cards/tabs.

## D) Data Integrity & Safety Rules

- For regulated professions, always state that requirements vary by province and employer.
- For healthcare / dentistry / pharmacy, explicitly mention credential recognition if internationally trained.
- Salaries must remain average ranges, not guarantees.
- If user location is missing, default wording to `Canada-wide` and prompt for province later.
- If cost cannot be known, label it `varies by province/employer` instead of guessing.

## E) Implementation Plan (small commits, safest first)

### Commit 1: Add roadmap QA harness only

- Files:
  - [roadmap-planner-qa.ts](c:/dev/careerheap-app/scripts/roadmap-planner-qa.ts)
  - [package.json](c:/dev/careerheap-app/package.json)
- Why safe:
  - No runtime path changes.
  - Adds QA tooling only.
- Verification:
  - `npm run qa:roadmap-planner`
  - `npm run build`
- Manual smoke:
  - No UI checks needed; tooling-only.

### Commit 2: Add additive roadmap metadata object

- Files (targeted):
  - [types.ts](c:/dev/careerheap-app/lib/transition/types.ts)
  - [generatePlan.ts](c:/dev/careerheap-app/lib/transition/generatePlan.ts)
- Why safe:
  - Additive schema extension only.
  - Existing UI can continue using `plan90` until the new object is rendered.
- Verification:
  - `npm run build`
  - `npm run qa:transition-mode`
  - `npm run qa:roadmap-planner -- --limit=6`
- Manual smoke:
  - Generate one plan in the planner and confirm no regression in current report.

### Commit 3: Improve regulated-profession persona sensitivity

- Files (targeted):
  - [generatePlan.ts](c:/dev/careerheap-app/lib/transition/generatePlan.ts)
  - regulated profession template file under [templates](c:/dev/careerheap-app/lib/transition/templates)
- Why safe:
  - Logic-only adjustment in one template family.
  - No auth/billing/routing impact.
- Verification:
  - `npm run build`
  - `npm run qa:roadmap-planner -- --limit=6`
- Manual smoke:
  - Compare Orthodontist and Anesthesiologist across minimal vs rich personas.

### Commit 4: UI render upgrade for roadmapGuide

- Files (targeted):
  - [CareerSwitchPlannerClient.tsx](c:/dev/careerheap-app/app/tools/career-switch-planner/CareerSwitchPlannerClient.tsx)
- Why safe:
  - Prefer new object when available; fallback to current roadmap tabs otherwise.
- Verification:
  - `npm run build`
  - `npm run lint`
- Manual smoke:
  - Planner wizard
  - Transition report
  - PDF export

## F) Final Deliverables Status

### Delivered in this pass

- QA report: this file.
- 60-scenario deterministic matrix.
- First 6 executed and documented.
- Smallest safe fix set proposed.

### Not implemented yet (next pass)

- Core roadmap schema / output repair.
- Before/after examples for 5 jobs after fixes are applied.
- Remaining 54 executed scenarios documented with findings.

### Remaining medium/high risk improvements (not implemented)

- Add a budget input or explicit cost preference field.
- Add province selector to tighten regulated-profession accuracy.
- Add an output quality gate that blocks render when `costRange`, `prereqs`, or `proofChecklist` are missing on the new roadmap object.
- Run the full 60 against the real DB-backed planner path once Supabase admin env is available in this shell.
