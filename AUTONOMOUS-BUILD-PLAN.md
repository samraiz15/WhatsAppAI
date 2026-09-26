# WhatsAppAI — Overnight Autonomous Build Plan

## Mission

Work only in this isolated worktree:

/d/GUEST1/WhatsAppAI-autonomous-01

Baseline:

stable-green-467fa18 (467fa18)

Improve production reliability without changing intended business behavior.

## Absolute safety rules

1. Work ONLY in the current autonomous worktree.
2. Never modify /d/Projects/WhatsAppAI/agent.
3. Never modify RealtorAI or any other project.
4. Never push to a remote repository.
5. Never modify credentials, API keys, .env files, WhatsApp pairing credentials, or secrets.
6. Never send real WhatsApp messages.
7. Never contact real users during testing.
8. Do not delete or weaken existing tests.
9. Do not introduce unrelated refactors.
10. Inspect the actual implementation before every change.
11. Every behavioral change requires tests.
12. Run targeted tests after every implementation.
13. Run the full test suite before completing every task.
14. Run git diff --check.
15. Inspect git diff before every commit.
16. Commit each completed task separately.
17. Never merge automatically.
18. Never push automatically.
19. If a task is unsafe, ambiguous, destructive, or genuinely blocked, STOP and document the reason.

## Required workflow for every task

1. Inspect relevant source files.
2. Inspect relevant existing tests.
3. Determine whether the task is actually applicable.
4. Write a short implementation plan.
5. Implement the smallest safe change.
6. Add or strengthen regression tests.
7. Run targeted tests.
8. Run the complete test suite.
9. Run git diff --check.
10. Review the complete diff.
11. Verify no secrets or unrelated files changed.
12. Commit the completed task.
13. Verify the worktree is clean.
14. Record the task, commit hash, tests, and result in the progress log.
15. Continue to the next applicable task.

---

# TASK 01 — Establish regression baseline

Inspect package.json and the complete test configuration.

Identify the actual test command(s).

Run the complete existing test suite.

Record:
- test command
- baseline result
- existing failures

Do not fix unrelated failures.

Acceptance:
- test command documented
- baseline recorded
- no application behavior changed

---

# TASK 02 — Message-ingestion idempotency

Inspect:
- index.js
- db.js
- ingestPolicy.js
- message-utils.js
- relevant tests

Trace:

received -> identified -> persisted/claimed -> processed -> completed/failed

Look for duplicate delivery, reconnect/replay, concurrent processing, and crash/restart scenarios.

Implement the smallest safe improvement preventing duplicate application side effects.

Tests:
- duplicate event
- same message twice
- concurrent claim
- already completed message
- failed message retry

Acceptance:
- duplicate processing prevented or safely idempotent
- legitimate retries still work
- existing behavior preserved

---

# TASK 03 — Processing claim concurrency

Audit database message claiming and processing state transitions.

Determine whether two workers can simultaneously claim the same message.

If a race exists, make the claim atomic.

Tests:
- competing claims
- successful claim
- rejected second claim
- retry behavior

Acceptance:
- only one processor can claim a message
- losing processor performs no application side effects
- retry semantics remain intact

---

# TASK 04 — Failure and retry state machine

Audit:

claimed
processing
completed
failed
retry

Look for states that can become permanently stuck after:
- exception
- process crash
- database error
- API error
- timeout

Implement missing recovery behavior only where supported by the existing architecture.

Tests:
- success
- ordinary failure
- retry
- repeated failure
- recovery/restart where practical

Acceptance:
- failures observable
- retryable failures remain retryable
- permanent failures do not loop forever
- successful work cannot execute twice

---

# TASK 05 — WhatsApp inbound policy regression coverage

Inspect:
- index.js
- ingestPolicy.js
- groups.js

Test:
- owner messages
- allowed contacts
- blocked contacts
- group messages
- @lid versus phone JIDs
- fromMe messages
- monitored groups

Preserve existing safety behavior.

Acceptance:
- every policy branch has regression coverage
- phone normalization tested
- contact allowlisting cannot become open
- group policy cannot bypass direct-message restrictions

---

# TASK 06 — Database transaction consistency

Audit db.js and callers performing multiple related writes.

Look for partial updates where one operation succeeds and a later operation fails.

Use existing database transaction facilities where appropriate.

Tests:
- partial failure
- rollback
- successful multi-write operation
- persistence consistency

Acceptance:
- related state changes atomic where required
- failed operations do not appear completed
- existing data format remains compatible

---

# TASK 07 — CRM lead lifecycle reliability

Inspect lead creation, updates, qualification, and follow-up persistence.

Trace:

conversation -> identification -> qualification -> persistence -> follow-up

Look for:
- duplicate leads
- accidental overwrites
- lost fields
- inconsistent updates

Tests:
- first lead
- repeated messages
- lead updates
- missing optional fields
- numeric budgets
- existing lead plus new property-search intent

Acceptance:
- repeated messages do not unnecessarily duplicate leads
- existing lead information preserved
- new information updates correct record

---

# TASK 08 — Follow-up scheduling/retry safety

Inspect CRM follow-up behavior.

Determine whether restart or repeated scheduler execution can duplicate follow-ups.

Implement idempotency where required.

Tests:
- scheduled follow-up
- already processed follow-up
- scheduler rerun
- failed follow-up
- retry

Acceptance:
- one logical follow-up produces at most one successful outbound action
- failed work can retry safely
- scheduler restarts do not duplicate work

Never send real WhatsApp messages during tests.

---

# TASK 09 — Property-search regression hardening

Inspect existing property-search parsing and ranking.

Preserve existing behavior involving:
- explicit listing type
- implicit listing type
- numeric budgets
- under-budget ranking
- owner-phone association

Find remaining malformed or ambiguous input cases.

Add regression tests before changing behavior.

Acceptance:
- existing valid searches remain unchanged
- malformed input fails safely
- budget interpretation cannot silently create unrelated searches
- identical input produces deterministic ranking

---

# TASK 10 — Provenance and knowledge-source integrity

Inspect property/knowledge responses and provenance handling.

Ensure answers cannot claim information came from a source that was not actually consulted.

Test:
- known source
- missing source
- unavailable knowledge
- property-search result
- mixed-source information

Acceptance:
- provenance preserved through routing and response generation
- unavailable information is not represented as verified
- source metadata remains attached to associated information

---

# TASK 11 — Router/conversation failure containment

Inspect:
- router.js
- conversation.js
- related intent/error handling

Find cases where malformed or unexpected model/router output can crash processing or produce invalid actions.

Implement defensive validation at the correct boundary.

Tests:
- unknown intent
- malformed structured output
- missing fields
- null/undefined values
- downstream exception

Acceptance:
- malformed output cannot crash the WhatsApp processor
- message is safely failed/handled
- unsafe outbound action cannot occur

---

# TASK 12 — External operation timeout/error handling

Audit external service calls.

Identify operations that can hang indefinitely or return unexpected errors.

Where supported by the existing architecture add:
- timeout handling
- bounded retry
- clear failure classification

Do not introduce aggressive retry loops.

Tests:
- timeout
- external failure
- retry
- bounded retry

Acceptance:
- external failures cannot permanently hang processing
- retries are bounded
- errors are visible in state/logs

---

# TASK 13 — Graceful shutdown and in-flight work

Inspect application startup/shutdown and WhatsApp/database lifecycle.

Determine what happens when termination occurs while processing a message.

Implement only safe shutdown improvements.

Tests should cover lifecycle behavior where practical.

Acceptance:
- resources close cleanly
- in-flight work is not falsely marked successful
- restart does not duplicate processing

---

# TASK 14 — Observability and structured failure information

Audit logging around:
- message ingestion
- claim
- processing
- failure
- retry
- outbound action
- CRM updates

Improve logs where production diagnosis is difficult.

Never log:
- API keys
- credentials
- pairing data
- unnecessary personal data

Tests should verify important state transitions where logging is contractual.

Acceptance:
- failures can be correlated to processing state
- failure reason is distinguishable
- no secrets are logged
- logs remain reasonably concise

---

# TASK 15 — Final regression and production-readiness pass

After all applicable tasks:

1. Run the complete test suite.
2. Run available lint/static/type checks.
3. Run git diff --check.
4. Inspect every autonomous commit.
5. Search for accidental secrets.
6. Confirm no files outside this worktree changed.
7. Confirm no tests were weakened or deleted.
8. Confirm worktree is clean.

If a failure was introduced by autonomous changes, fix it.

If a failure is unrelated and pre-existing, document it and STOP.

Acceptance:
- applicable tests pass
- no known introduced regression remains
- every autonomous commit has a clear purpose
- worktree clean
- progress log complete

---

# Final report

Report:
- completed tasks
- skipped tasks and reasons
- commit hash for each completed task
- tests run and results
- pre-existing failures
- remaining risks
- final git status

Never push.
Never merge.

---

# Autonomous Progress Log

## TASK 01 — Establish regression baseline

Status: COMPLETED

Baseline:
- Branch: autonomous-build-01
- Commit: 467fa18
- Tag: stable-green-467fa18

Test command:
- npm test
- node test-agent.js
- node test-db.js
- node test_ingestPolicy.js

Complete test result:
- npm test: PASS
- node test-agent.js: PASS
- node test-db.js: PASS
- node test_ingestPolicy.js: PASS

Additional baseline checks:
- JavaScript syntax checks: PASS
- node test_ingestPolicy.js: PASS — 18 passed, 0 failed
- node test-property-search.js: PASS

Application changes:
- None

Tests weakened/deleted:
- None

Worktree:
- Clean

Relevant existing coverage note:
- ingest-policy tests report that duplicate message ID and history-batch DB behavior are not covered

Commit:
- 467fa18 (Baseline)
