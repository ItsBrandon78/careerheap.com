# Career Switch Planner Hardening TODO

Purpose
- Turn the current V3 planner into a trustworthy, action-first product without degrading the existing UI shell.
- Fix remaining issues in a staged way so work is trackable and does not rely on chat history.

Non-Negotiable Rule
- Do not invent facts.
- If a value is not source-backed, it must be:
  - omitted
  - explicitly labeled `Estimate` or `Derived`
  - or replaced with a real source lookup + cached enrichment result

Allowed value types
- `verified`: backed by a structured table or official/validated external source URL
- `derived`: computed from real planner inputs/data
- `estimate`: bounded fallback with explicit labeling

Not allowed
- hard-coded salary ranges presented as real
- fake provider names, dates, ratings, fees, or reimbursements
- synthetic CRM outcomes presented as observed user activity
- generic trade advice presented as role-specific truth

## Current Product Gaps

1. Stage ambiguity
- The planner still collapses `Apprentice Electrician`, `Electrician`, and later-stage trade intent into one displayed path too often.
- Users can be unclear whether they are looking at:
  - entry route
  - apprenticeship route
  - full trade qualification path

2. Too much diagnosis, not enough action
- The planner is still stronger at explaining gaps than telling the user what to do next.
- Section 4 is better, but Section 5 still does not feel like the operational core for trades.

3. Trades logic is only partially trade-native
- Ontario trade/apprenticeship paths should emphasize:
  - entry role
  - sponsor-ready employer
  - apprenticeship registration
  - work + school loop
  - qualification exam
  - wage progression
- Some sections still read like a general planner with trade data attached.

4. Source coverage is still uneven
- Wages are improved but still depend on fallback coverage for some roles.
- Section 6 training/certification data is better, but long-tail roles still need enrichment.
- Some market/reality cards still compress too much nuance into one metric.

5. Page still carries some overlapping sections
- The roadmap, fastest path, progress dashboard, and reality check all partly describe execution.
- This is not a redesign problem first. It is a meaning and priority problem.

## Staged Work Plan

### Phase 1: Trust and Stage Clarity
- [x] Preserve user-facing target label separately from canonical trade match.
  - Example:
    - Display: `Apprentice Electrician`
    - Mapped pathway: `Electrician (309A)`
- [x] Add stage inference for trade targets:
  - `entry`
  - `apprentice`
  - `experienced`
  - `licensed`
- [x] Use stage-aware copy in:
  - command center
  - Section 4 roadmap
  - Section 5 fastest path
  - Section 9 reality check
- [x] Split `time to first entry` from `time to full qualification` where both are relevant.
- [x] Make demand scope explicit:
  - apprentice-entry roles
  - helper/support roles
  - full trade-family postings

Acceptance criteria
- A user typing `Apprentice Electrician` does not feel like the planner silently changed the goal.
- Entry-stage trade users see entry-stage advice first.
- Long-run trade data is clearly separated from immediate-entry expectations.

### Phase 2: Make Section 5 Trade-Native
- [x] Rebuild Section 5 logic for trade-apprenticeship targets around this fixed structure:
  - Entry Route
  - Sponsorship
  - Registration
  - Work + School Loop
  - Qualification
- [x] Remove remaining generic phrases from trade output:
  - `measurable evidence`
  - `interview-ready artifact`
  - `close requirement`
- [x] Add explicit entry doors for trades:
  - helper
  - labourer
  - maintenance helper
  - pre-apprentice where valid
- [x] Use `trade_requirements`, `careerPathwayProfile`, Ontario quick facts, and cached enrichment before any generic fallback.
- [x] Show sponsor dependence explicitly when applicable.

Acceptance criteria
- Section 5 reads like a trade pathway, not a credential checklist.
- Entry-role bridges are obvious.
- Registration is shown in the correct place relative to sponsorship.

### Phase 3: Turn Gaps into Bridge Actions
- [x] Rewrite vague requirement language into bridge-path actions.
  - Bad: `Demonstrate 2 years of role-relevant experience`
  - Good: `Bridge through entry roles such as Industrial Maintenance Helper or Electrical Labourer`
- [x] Normalize noisy requirement strings before rendering.
- [x] Replace generic “largest gap” style language with one of:
  - bridge role
  - starter cert
  - employer screen
  - prerequisite
- [x] Keep the underlying evidence in tooltip or secondary detail where needed.

Acceptance criteria
- A user can tell how to close the gap, not just that the gap exists.

### Phase 4: Section 6 Training and Starter Certifications
- [x] Keep starter certification cards as clickable completion items.
- [x] Rank training cards in this order:
  - starter certifications
  - official trade/apprenticeship pathway cards
  - provider/program cards
- [ ] Distinguish card types clearly in data:
  - `starter_cert`
  - `pathway_requirement`
  - `provider_program`
- [x] Show only source-backed fields:
  - provider
  - cost
  - length
  - modality
- [x] Continue enriching trade families with verified starter-cert bundles.
- [x] Add more family coverage where needed:
  - electrical
  - industrial
  - construction
  - utility
  - motive power
  - service

Acceptance criteria
- Section 6 always answers `what should I get first?`
- No fake provider metadata appears.
- Long-tail role data comes from enrichment cache or official source lookup, not hard-coded filler.

### Phase 4.5: Resources
- [x] Add a dedicated resources section before methodology/FAQ for official pathway, training, and job-search links.

Acceptance criteria
- Official pathway and training links are easy to open without crowding Section 6.

### Phase 5: Section 7 Market Data Coverage
- [x] Broaden wage seeding beyond built-in profiles using:
  - `career_role_versions`
  - structured `occupation_wages`
  - official province/Job Bank ingestion
- [x] Keep province-first wage selection:
  - province row
  - national fallback
  - cached web-enriched fallback
- [x] Improve market-card phrasing so each card reads like a metric, not a paragraph.
- [x] Revisit `Typical Hiring Requirements` summarization:
  - concise theme in-card
  - full detail accessible on desktop and touch
- [ ] Add or refine TTL/cache invalidation for wage enrichment if source freshness becomes a concern.

Acceptance criteria
- Section 7 does not rely on generic wage placeholders for common roles.
- Each card says one concrete thing.
- Source pills remain accurate and non-redundant.

### Phase 6: Section 8 Outreach and Return-Use Flow
- [x] Keep CRM as a manual tracker only.
- [x] Continue persisting:
  - sent
  - replies
  - positive replies
  - next follow-up
- [x] Make suggested outreach target clearly derive from the current phase.
- [x] Ensure outreach progress does not imply real observed outcomes.
- [ ] Consider whether the CRM should collapse by default for first-time users if it still feels premature.

Acceptance criteria
- Returning users get value.
- First-time users are not confused into thinking the app already knows their outreach results.

### Phase 7: Progress and Learning Feedback Loop
- [x] Ensure training-card completions continue to feed transition priors.
- [x] Track which starter certs are completed first for trade-family learning.
- [x] Use only aggregated transition priors in generation.
- [x] Never replay one user's exact plan into another user's plan.
- [x] Keep PII out of shared-learning tables.

Acceptance criteria
- Learned priors improve ranking/ordering without leaking personal data.
- The planner gets better over time without becoming inconsistent.

### Phase 8: Page Priority and Information Weight
- [ ] Audit overlap between:
  - roadmap
  - fastest path
  - progress dashboard
  - reality check
- [ ] Tighten or collapse sections that repeat roadmap meaning.
- [ ] Decide whether Section 4 should move higher later.
- [ ] Do not reorder the page until the content/action logic is corrected first.

Acceptance criteria
- The roadmap is clearly the center of gravity.
- Lower sections support execution instead of repeating it.

## Data Source Policy

### Primary structured sources
- `occupation_wages`
- `trade_requirements`
- `careerPathwayProfile`
- `career_role_versions`
- `career_map_reports`
- `planner_role_enrichment_cache`
- `planner_source_enrichment_cache`

### Official external sources
- Job Bank / ESDC wages
- Skilled Trades Ontario
- Ontario apprenticeship / province pages
- official provider/program pages
- official safety/certification sources

### AI/web enrichment usage
- Allowed only as retrieval/extraction when structured coverage is weak
- Must store:
  - source URL
  - source name
  - retrievedAt
  - confidence
  - source path
- Must be cached before being treated as reusable planner input

### Disallowed source behavior
- No direct “GPT says the wage is X” rendering
- No Reddit/forum-derived displayed estimates
- No unsourced provider/program details

## Priority Order

### High
- [x] Phase 1 stage clarity
- [x] Phase 2 trade-native Section 5
- [x] Phase 3 bridge-action rewrite
- [x] Phase 4 starter-cert and pathway ranking
- [ ] Phase 5 wage/market coverage for common roles

### Medium
- [ ] Phase 6 outreach positioning and polish
- [ ] Phase 7 learning-loop refinement
- [ ] Phase 8 section-overlap cleanup

### Low
- [ ] Trades Explorer product split
- [ ] Wage progression graph by apprentice year
- [ ] Dedicated trade-family comparison experience

## Definition of Done
- The planner does not fabricate data.
- Trade-entry users understand what stage they are in.
- Section 5 reads like a real trade path.
- Section 6 surfaces the right starter certs and pathway requirements.
- Section 7 is source-backed for common roles and honestly labeled for the rest.
- The roadmap tells users exactly what to do next.
- Learning improves future plans through aggregated priors, not copied plans.


