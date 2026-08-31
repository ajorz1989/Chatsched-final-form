# Database tests

New as of the compliance feature build — this repo had no database-level
test harness before this. Nothing else here runs these automatically;
`npm test` only covers pure TypeScript (vitest, see `src/lib/*.test.ts`).

## Running `compliance_test.sql`

Requires a local Supabase instance with every `schema_phase*.sql` file
applied through `schema_phase40_proof_screenshots.sql`, plus the `pgtap`
extension enabled:

```sql
create extension if not exists pgtap;
```

Then either:

```bash
supabase test db
```

or directly with `pg_prove`:

```bash
pg_prove --ext .sql -d <your-local-db-url> supabase/tests/compliance_test.sql
```

This has not been run against a real Postgres instance as part of this
change — it was written to the shape pgTAP expects and reviewed by hand,
not executed. Treat the first real run as the actual test of whether it's
correct, not this note.

## What's covered / not covered

`compliance_test.sql` covers the compliance schema in isolation:
auto-creation of `campaign_compliance`, RLS visibility, the "server is the
only writer of status" rule, `set_campaign_compliance_context`,
`acknowledge_campaign_disclosure`, `campaign_proof` insert/review
permissions, the `campaign-proof-screenshots` storage bucket's RLS
(creator-only upload, participant-only read), and the core status
transitions inside `recompute_campaign_compliance` (including a
`not_accepted` category forcing `not_eligible` regardless of everything
else).

Not yet covered, and worth their own file once this one is confirmed
working: the full end-to-end scenario through payout eligibility (crosses
into the payments/payout schema), the AI screening edge function (needs a
mocked Anthropic response, not a pgTAP concern), and the notification
triggers (`trg_notify_disclosure_required` / `trg_notify_proof_submitted`).

## Running `enforce_channel_request_transition_test.sql` and `rls_channels_publishers_channel_requests_test.sql`

Same commands as above (`supabase test db` or `pg_prove`), against an
instance with every `schema_phase*.sql` through `schema_phase78` applied —
these two exercise `channels` (`schema_phase74`), `publisher_subscriptions`
(`schema_phase55`), and `content_approvals` (`schema_phase53`), all later
than `compliance_test.sql` needs. Written for Task 1 of
`NEXT_STAGE_DEVELOPMENT_BRIEF.md`, specifically because
`enforce_channel_request_transition()` has a real regression history
(`schema_phase71` silently deleted its counter-offer and content-approval
branches; caught by a human/AI reading the trigger directly during an
unrelated merge, not by any test — see `CLAUDE_1.0.md` item 6 and
`schema_phase73`'s own header for the full story). Same honesty note as
`compliance_test.sql`: written to the pattern pgTAP expects, reviewed by
hand against the actual policy/trigger definitions, but **not run against
a real Postgres instance** — this sandbox has no Docker, `psql`, or
Supabase CLI available to run one. The acceptance test for whether these
are actually correct is the first real `supabase test db` run, not this
note.

- **`enforce_channel_request_transition_test.sql`** — every branch of the
  trigger's state machine: the subscription gate on accepting, the
  deliberately-ungated decline/counter paths, the full counter-offer
  cycle (creator counters → business accepts or declines the counter),
  the content-approval gate on going live (no `content_approvals` row,
  an unapproved one, and an approved one), baseline business/admin
  transitions, and cross-user rejection (a non-participant can't touch a
  request they aren't party to). 20 assertions.
- **`rls_channels_publishers_channel_requests_test.sql`** — the RLS
  policies themselves on `channels` (public read, admin-only write),
  `publishers` (approved rows public, `pending_review` rows owner/admin
  only, insert must be self-directed and can't self-approve), and
  `channel_requests` (select limited to business/creator/admin, insert
  must be self-directed and must start at `pending`). Deliberately does
  not re-test `channel_requests_update_participant`'s permissive `USING`
  clause in depth — that policy is intentionally broad by design (the
  trigger is the real gate, per that policy's own comment in
  `schema_phase17_channel_marketplace.sql`), and the one thing worth
  confirming from the RLS side (a non-participant can't touch a request)
  is already exercised in the trigger test file above, which needs that
  same fixture anyway. 16 assertions.
