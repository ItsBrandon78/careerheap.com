# Career Data Ingestion

This repo now includes a bulk ingestion CLI for the Career Map Planner data model (`migrations/005_career_map_planner_core.sql`).

Script:
- `scripts/ingest-career-data.mjs`

Config seeds:
- `seeds/career-data/source-config.json`
- `seeds/career-data/sto-shared-links.json`

## What It Ingests

1. `onet` (US)
- Occupations from O*NET text database
- Occupation skill graph from O*NET `Skills.txt` + `Knowledge.txt`
- Requirement summary from O*NET education distribution + top tasks

2. `oasis` (Canada)
- Occupations from OaSIS profile mapping to NOC 2021 unit groups
- Occupation skill graph from OaSIS skills matrix
- Requirements/notes from OaSIS lead statements, main duties, and employment requirements

3. `jobbank` (Canada)
- Wages by NOC and region from latest Job Bank wages open-data file
- `occupation_wages` rows with low/median/high and source metadata

4. `sto` (Ontario trades)
- Trade listing + detail scraping from Skilled Trades Ontario
- `trade_requirements` rows with exam flag, hours (if available), level notes, official links

5. `noc`
- Registers NOC package metadata in `dataset_sources`

## Tables Updated

- `dataset_sources`
- `occupations`
- `skills`
- `occupation_skills`
- `occupation_requirements`
- `occupation_wages`
- `trade_requirements`

## Usage

Dry-run (default; parse + stage only):

```bash
npm run ingest:career-data -- --all --dry-run
```

Write to Supabase:

```bash
npm run ingest:career-data -- --all --write
```

Only one source:

```bash
npm run ingest:career-data -- --source=sto --write
```

Limit volume for quick validation:

```bash
npm run ingest:career-data -- --sources=onet,oasis,jobbank --limit=50 --dry-run
```

## Required Environment Variables (write mode)

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (legacy fallback: `SUPABASE_SERVICE_ROLE_KEY`)

The script auto-loads `.env` and `.env.local` if present.

## Notes

- Source URLs and package IDs are config-driven via `seeds/career-data/source-config.json`.
- Download cache is stored in `.cache/career-data` (gitignored).
- `occupation_requirements` is refreshed by source on each write run to avoid duplicate historical rows for the same source snapshot.

## Troubleshooting

`[ingest] failed ... Missing table(s): ...`

- Cause: Career Map Planner schema migrations have not been applied on the target Supabase project.
- Fix: Run migrations in order through `migrations/005_career_map_planner_core.sql` (see `docs/SUPABASE_SETUP.md`), then rerun ingestion.

`23514 ... violates check constraint "occupation_wages_order"`

- Cause: a small number of upstream Job Bank wage rows can contain out-of-order values (`low > median` or `median > high`).
- Current behavior: ingestion skips those rows and logs warnings with NOC + region + raw values.
- Fix: pull latest code and rerun ingestion.
