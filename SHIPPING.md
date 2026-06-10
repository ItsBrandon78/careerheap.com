# Shipping checklist — CareerHeap

Status snapshot (updated as work lands). This is the mechanical path from
"works locally" to "confidently taking real payments."

## 0. Readiness probe
After every deploy, hit:

- `GET /api/health` → `{ ok: true }` (200) means the hard blockers
  (Supabase, Stripe checkout, Stripe webhook) are configured.
- `GET /api/health?detail=<DEV_ADMIN_TOKEN>` → lists the exact missing env
  vars per subsystem (safe: names only, never values).

`ok:false` (503) means one of the blockers is unset — fix before going live.

---

## 1. Stripe price IDs ← the one you flagged

You changed the prices (Pro $7/mo, Lifetime $49). Code reads price IDs from env,
so you do **not** touch code — you update env vars to the new live Price IDs.

1. Stripe Dashboard → **Products** → for each product, add/confirm a **Price**:
   - Pro: recurring monthly, **$7.00 CAD** → copy its `price_…` id.
   - Lifetime: one-time, **$49.00 CAD** → copy its `price_…` id.
   - (Optional) Pro yearly → copy its `price_…` id.
2. Set these env vars (host: Vercel → Project → Settings → Environment Variables,
   **Production**), then redeploy:

   | Plan                | Env var                  | Value          |
   |---------------------|--------------------------|----------------|
   | Pro monthly ($7)    | `STRIPE_PRICE_PRO_MONTHLY`| new `price_…`  |
   | Lifetime ($49)      | `STRIPE_PRICE_LIFETIME`   | new `price_…`  |
   | Pro yearly (opt.)   | `STRIPE_PRICE_PRO_YEARLY` | new `price_…`  |

   (Legacy fallbacks `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` /
   `STRIPE_PRICE_PRO_ANNUAL` still work but the names above are canonical.)
3. Confirm `STRIPE_SECRET_KEY` is the **live** key and `STRIPE_WEBHOOK_SECRET`
   matches the **live** webhook endpoint (Dashboard → Developers → Webhooks →
   your `/api/webhooks/stripe` or `/api/stripe/webhook` endpoint → signing secret).

**Verify the loop (live or a test-mode dry run):** start checkout → complete
payment → user's plan flips to Pro/Lifetime → tool usage becomes unlimited →
customer portal cancel → plan reverts. The webhook is what flips the plan, so a
missing/incorrect `STRIPE_WEBHOOK_SECRET` is the #1 cause of "paid but still locked."

---

## 2. Required env vars (production)

Hard blockers (app/payments break without them):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (or `…PUBLISHABLE_KEY`)
- `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_LIFETIME`
- `NEXT_PUBLIC_APP_URL` (used for Stripe success/cancel redirects)

Strongly recommended (degrade gracefully but the product is worse without them):
- `OPENAI_API_KEY` — without it every AI tool silently falls back to template
  output. **This is what makes the product worth paying for — set it.**
- `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` — live labour-market evidence for the
  planner; without it the planner uses baseline (O*NET) data only.
- `SANITY_PROJECT_ID`, `SANITY_DATASET` (+ `NEXT_PUBLIC_*`) — blog content.

See `.env.local.example` for the full annotated list.

---

## 3. Supabase (production project)
- Required tables + RLS policies are present (auth, usage, planner reports,
  requirements cache, trade_requirements, wages, occupations).
- Auth → email confirmations configured (or disabled if you don't want them);
  the signup→confirm→login loop must complete.

---

## 4. Pre-launch verification
- [ ] `/api/health` → `ok: true`
- [ ] Sign up → confirm → log in → session persists across reload.
- [ ] Run a planner generation end-to-end (a trade like Electrician + a
      non-trade like Bookkeeper); output reads honest and correct.
- [ ] Run each tool once (resume analyzer, cover letter, interview prep,
      resume builder) → real output, no errors.
- [ ] Hit the free limit (3 uses) → paywall shows → upgrade → unlimited.
- [ ] Stripe portal → cancel → access reverts on next period.
- [ ] Mobile pass on `/`, `/pricing`, planner dashboard.

---

## What's already done (code)
- Career Switch Planner: apprentice-first trades pathways, honest salary
  (no invented figures), relevance-gated suggestions, clean requirement/skill
  copy, current-role capture. Verified 6/6 personas.
- 4 AI tools wired with grounded prompts + graceful template fallback when
  OpenAI is unavailable; loading / error / paywall / auth states handled.
- EN/FR i18n, usage gating (free 3 / paid unlimited), legal pages,
  env-driven Stripe pricing, `/api/health` readiness probe.

## Known follow-ups (non-blocking polish)
- Evidence-citation quotes can still include the occasional cross-border
  (US) posting; wages are province-sourced CAD and unaffected.
- 404/500 custom pages, OG images, broader mobile QA.
