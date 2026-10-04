# WhatsApp AI Agent — Project Handoff

Date: 2026-10-04
Project: WhatsAppAI/agent
Location: D:\Projects\WhatsAppAI\agent

==================================================
CURRENT VERIFIED STATE
==================================================

The project is a Node.js WhatsApp AI real-estate agent using:

- @whiskeysockets/baileys
- better-sqlite3
- pino
- qrcode / qrcode-terminal
- CommonJS
- SQLite persistence

Current core files include:

- index.js
- conversation.js
- router.js
- db.js
- groups.js
- message-utils.js
- ingestPolicy.js
- parkview_knowledge.js

Current package test command runs:

- node --check conversation.js
- node --check router.js
- node --check parkview_knowledge.js
- node --check test-provenance.js
- test-conversation.js
- test-parkview.js
- test-provenance.js
- test-property-search.js
- test-message-dedup.js
- test-message-claim.js
- test-message-failure.js

LATEST VERIFIED TEST RESULT:

ALL CURRENT TESTS PASSED.

Verified:

- property parsing regression
- lead extraction regression
- lead conversation regression
- name detection regression
- search parsing
- provenance tests
- Park View tests
- property search tests
- message deduplication
- message history handling
- message processing claim
- failed-message retry
- message failure handling
- outbound contact guard

==================================================
DEMO CONFIGURATION
==================================================

Demo DM mode is enabled.

Current demo expiry:

2026-10-10 23:59:59 +05:00

index.js currently contains:

const DEMO_DM_ENABLED = true;
const DEMO_DM_EXPIRES_AT = new Date('2026-10-10T23:59:59+05:00').getTime();

Demo behavior:

- Incoming customer DMs are allowed during demo.
- Owner commands remain owner-only.
- Existing contact allow-list does not block demo customer DMs.

IMPORTANT:
After demo, remove/disable temporary DEMO_DM_ENABLED behavior and restore production authorization rules.

==================================================
CRITICAL OUTBOUND SAFETY RULE
==================================================

NON-NEGOTIABLE:

The bot must NEVER initiate a WhatsApp DM.

A WhatsApp contact must first send an eligible inbound DM before the bot may send a reply to that same contact.

Current architecture already has:

- inboundDmAuthorization Set
- authorizeInboundDm()
- canSendOutboundDm()

Current flow authorizes a contact only after an eligible inbound DM.

There is also an outbound check immediately before sock.sendMessage().

IMPORTANT FUTURE HARDENING:

Make the FINAL outbound sending function itself enforce this rule.

Do not rely only on callers remembering to call canSendOutboundDm().

Desired invariant:

DM outbound send
    ->
    inbound qualifying message exists?
        NO  -> BLOCK
        YES -> SEND

This must remain fail-closed.

Do NOT remove this protection.

==================================================
MESSAGE IDEMPOTENCY / RELIABILITY
==================================================

SQLite whatsapp_messages currently supports:

- message_id
- remote_jid
- participant_jid
- from_me
- message_type
- message_text
- message_timestamp
- status
- claimed_at
- processed_at
- error

Current processing lifecycle:

received
    ->
processing
    ->
processed

Failure:

processing
    ->
failed
    ->
retryable

Claim timeout prevents stuck processing records from remaining locked forever.

Do not replace this system unnecessarily.

Future work should build on it.

==================================================
CURRENT GREETING BEHAVIOR
==================================================

Greeting detection is implemented in conversation.js.

Supported examples currently tested:

- hi
- hello
- hey
- salam
- assalam o alaikum
- aoa
- السلام علیکم
- السلام عليکم
- السلام عليكم
- سلام

Current response:

Assalam o Alaikum! 👋 How can I help you today? Are you looking for a house, plot, apartment, or another property?

IMPORTANT:

Greeting detection must happen before lead extraction.

A greeting must NOT:

- create a fake name
- overwrite lead fields
- trigger property search
- complete a lead
- modify existing requirements

Do NOT add Arabic greeting requirements unless specifically requested.

Urdu script support is required.

==================================================
URDU / ROMAN URDU
==================================================

Required for demo/production:

- English
- Urdu
- Roman Urdu
- mixed Urdu + English

Examples:

mujhe 5 marla ghar chahiye

mjy 5 marla ghar chahye

5 marla house chahiye

park view mein 5 marla ka ghar chahiye

The system must NOT assume Roman Urdu is identical to English.

Future work:

Add normalization before routing/extraction.

Pipeline:

raw message
    ->
language/script detection
    ->
Roman Urdu normalization
    ->
real-estate terminology normalization
    ->
intent/entity extraction
    ->
existing router/conversation engine

Do not replace the existing deterministic business logic.

==================================================
IMPORTANT BUG DISCOVERED
==================================================

An unusual Arabic/Urdu greeting:

اَلسَّلَامُ عَلَيْكُمْ

was previously interpreted incorrectly and produced:

Thanks ali. I have your requirements...

This exposed a broader rule:

LOW-CONFIDENCE TEXT MUST NEVER BECOME A LEAD FIELD.

Future protections:

- normalize Unicode where appropriate
- detect greetings before extraction
- reject suspicious name extraction
- do not overwrite existing lead values with low-confidence values
- add regression tests for Unicode/Urdu greetings
- add regression tests for mixed Urdu/Roman Urdu

==================================================
LEAD SYSTEM
==================================================

Current deterministic lead flow works.

Verified example:

Hi, I need a house
    ->
What is your approximate budget?

My budget is 2 crore
    ->
Which area are you interested in?

DHA Lahore
    ->
When are you planning to buy or invest?

I want to buy in 3 months
    ->
May I know your name?

My name is Ahmed
    ->
completed deterministic response

Verified extracted values:

interest = House
budget = 2 crore
budget_numeric = 20000000
area = DHA Lahore
timeline = 3 months
name = Ahmed

Continue preserving deterministic lead behavior.

==================================================
PROPERTY SEARCH / KNOWLEDGE
==================================================

Current property search and provenance tests pass.

Examples verified:

- 5 marla plot in Crystal
- 5 marla plot in Tulip Extension
- 5 marla house
- 10 marla plot in Silver
- 5 marla plot in Platinum

IMPORTANT BUSINESS RULE:

Never invent:

- property prices
- availability
- approvals
- payment plans
- possession information
- block information
- property details

If reliable data is unavailable:

- say that reliable information is unavailable
- offer to check/verify
- escalate to realtor where appropriate

Existing provenance architecture should remain.

==================================================
VOICE NOTE REQUIREMENT
==================================================

Pakistan-focused requirement:

Customers commonly use WhatsApp voice notes.

Voice notes must become a first-class input type.

Desired pipeline:

WhatsApp audioMessage
    ->
Baileys media download
    ->
FFmpeg/audio normalization
    ->
local Whisper/faster-whisper
    ->
transcript
    ->
language/quality checks
    ->
existing processMessage()
    ->
lead/router/property logic

IMPORTANT:

Do NOT create a separate conversation engine for voice.

Voice transcript must enter the existing conversation pipeline.

Store:

- original message ID
- message type
- transcript
- transcription status
- detected language if available
- processing error if any

Do not send the raw transcript to the customer unless needed.

Instead respond naturally based on the transcript.

==================================================
VOICE ACCURACY RULE
==================================================

NEVER claim 100% voice understanding.

Whisper can make mistakes, especially with:

- Urdu
- Roman Urdu
- mixed Urdu/English
- names
- numbers
- crore/lakh
- marla/kanal
- block names
- street names
- background noise
- fast speech

Therefore:

voice
    ->
transcription
    ->
validation
    ->
business extraction
    ->
confidence decision

Clear:
    process normally

Uncertain critical information:
    ask customer to confirm

Very unclear / high-value inquiry:
    human escalation

Do not guess.

==================================================
ZERO-SPEND VOICE STACK
==================================================

Preferred:

- Baileys for media download
- FFmpeg for audio handling
- local Whisper/faster-whisper for transcription

No paid transcription API required for the zero-cost version.

Use a practical local model first.

If hardware allows, larger model can be used for difficult cases.

Do not add recurring API cost unless later justified.

==================================================
HUMAN HANDOFF / IMPORTANT LEADS
==================================================

The bot must distinguish between:

NORMAL
IMPORTANT
URGENT
HUMAN_REQUIRED
WAITING_FOR_CUSTOMER
RESOLVED

Examples that should trigger human attention:

- customer asks to speak to an agent
- customer asks for a call
- customer asks for a representative
- customer wants to visit today
- customer is ready to buy immediately
- high-value lead
- critical information cannot be confidently understood
- customer explicitly requests human help

Examples:

call me

I want to talk to an agent

mujhe agent se baat karni hai

mujhe call karen

koi representative baat kare

These should map to a human_handoff / human_required event.

The bot may acknowledge:

Sure. I've noted your request and our representative will get back to you.

But the realtor must ALSO receive an attention notification.

==================================================
NOTIFICATION SYSTEM
==================================================

Do NOT start with:

- Twilio
- paid SMS
- paid CRM
- paid notification SaaS

Zero-cost preferred architecture:

1. Local Windows notification
2. Phone push notification
3. Simple dashboard alert

Recommended open-source options researched:

- node-notifier for Windows desktop notifications
- ntfy for phone/desktop push notifications
- self-host ntfy eventually for privacy/control

Potential flow:

important event
    ->
event queue
    ->
Windows toast + sound
    +
phone push
    +
dashboard alert

Normal lead:
    dashboard / normal notification

Important:
    desktop + phone

Urgent:
    desktop + sound + phone + persistent dashboard

==================================================
NOTIFICATION CONTENT
==================================================

Do NOT send useless notifications like:

New message from Ali

Instead send actionable reasons.

Examples:

🚨 IMPORTANT LEAD
Ahmed
10 marla house
Budget: 5 crore
Ready to buy this month

🚨 VIEWING REQUEST
Ali wants to visit today.

🚨 HUMAN ATTENTION REQUIRED
Customer requested a call.

🚨 VOICE NOTE NEEDS REVIEW
Unable to confidently understand property/budget details.

The realtor should know WHY they need to open WhatsApp.

==================================================
EVENT QUEUE
==================================================

Current whatsapp_messages table should remain responsible for message processing.

Add a separate event/attention system rather than coupling notification delivery directly to message processing.

Potential table:

events

- id
- type
- lead_id
- message_id
- priority
- status
- title
- body
- created_at
- handled_at
- error

Flow:

incoming message
    ->
process
    ->
lead updated
    ->
event generated if needed
    ->
message reply
    ->
notification worker

Notification failure must NOT cause the customer message to fail.

Notifications should be retryable.

==================================================
DASHBOARD
==================================================

Do NOT build a giant CRM.

A simple local dashboard is enough initially.

Required views:

- urgent leads
- important leads
- recent conversations
- lead details
- voice transcript
- human-required events
- acknowledge
- resolve

Example:

URGENT: 2
IMPORTANT: 5
NORMAL: 31

The dashboard should save the realtor from reading every conversation.

==================================================
ARCHITECTURE PRINCIPLE
==================================================

Do not turn the project into an "everything AI" system.

Target:

Automate predictable work.
Detect uncertainty.
Escalate exceptions.
Never guess critical information.

Preferred pipeline:

deterministic rules
    +
local speech recognition
    +
grounded property data
    +
validation
    +
confidence handling
    +
human escalation
    +
notifications

NOT:

LLM
    ->
guess
    ->
reply

==================================================
RESEARCH CONCLUSION
==================================================

Existing open-source projects were reviewed for:

- Baileys WhatsApp media handling
- local Whisper/faster-whisper
- WhatsApp voice transcription
- self-hosted WhatsApp CRMs
- notification infrastructure

Useful references researched:

Baileys:
https://github.com/WhiskeySockets/docs

faster-whisper:
https://github.com/SYSTRAN/faster-whisper

whisper.cpp:
https://github.com/ggml-org/whisper.cpp

ntfy:
https://github.com/binwiederhier/ntfy

node-notifier:
https://github.com/mikaelbr/node-notifier

Several open-source WhatsApp CRM projects were also reviewed.

CONCLUSION:

Do NOT migrate the current project to another CRM.

The current project already contains valuable infrastructure:

- Baileys
- SQLite
- message deduplication
- claiming
- retry handling
- lead extraction
- property search
- provenance
- owner commands
- monitored groups
- outbound safety
- greeting handling

Build the missing capabilities incrementally.

==================================================
PRIORITIZED TODO
==================================================

P0 — SAFETY / MUST DO FIRST

[ ] Make outbound DM authorization a final hard guard around the actual send function.

[ ] Add regression tests proving:
    - new contact cannot receive outbound DM
    - contact can reply after inbound message
    - bot cannot initiate DM
    - failed processing cannot accidentally authorize outbound
    - authorization is tied to correct JID

[ ] Verify demo expiry behavior.

[ ] Ensure owner commands remain owner-only.

[ ] Ensure demo allow-all does NOT bypass outbound inbound-first safety.

P1 — LANGUAGE

[ ] Add Urdu/Roman Urdu regression suite.

[ ] Protect greeting messages from lead extraction.

[ ] Add Unicode normalization where safe.

[ ] Prevent low-confidence name detection.

[ ] Add mixed Urdu/English property terminology.

[ ] Add Roman Urdu normalization.

P2 — VOICE

[ ] Detect audioMessage.

[ ] Download WhatsApp voice media.

[ ] Handle Opus/Ogg correctly.

[ ] Integrate FFmpeg.

[ ] Install/configure local Whisper/faster-whisper.

[ ] Transcribe locally.

[ ] Store transcript metadata.

[ ] Feed transcript into processMessage().

[ ] Test:
    - English voice
    - Urdu voice
    - Roman Urdu voice
    - mixed Urdu/English
    - property names
    - numbers
    - crore/lakh
    - marla/kanal

[ ] Add failure handling when transcription fails.

P3 — CONFIDENCE / NO GUESSING

[ ] Add transcript quality/confidence handling.

[ ] Validate budget before saving.

[ ] Validate property size before saving.

[ ] Validate names before saving.

[ ] Confirm ambiguous critical values.

[ ] Never invent missing property data.

[ ] Escalate uncertain high-value cases.

P4 — HUMAN HANDOFF

[ ] Add human_handoff intent.

[ ] Detect call requests.

[ ] Detect agent/representative requests.

[ ] Detect same-day viewing requests.

[ ] Add hot/high-value lead signals.

[ ] Add HUMAN_REQUIRED lead/event state.

P5 — NOTIFICATIONS

[ ] Add events table.

[ ] Add event creation rules.

[ ] Add event worker.

[ ] Add Windows desktop notification.

[ ] Add sound for urgent events.

[ ] Add ntfy phone notification.

[ ] Add retry mechanism.

[ ] Add acknowledgement state.

[ ] Prevent duplicate notifications.

P6 — DASHBOARD

[ ] Build lightweight local dashboard.

[ ] Show urgent events.

[ ] Show important events.

[ ] Show lead details.

[ ] Show recent conversations.

[ ] Show voice transcripts.

[ ] Add acknowledge.

[ ] Add resolve.

P7 — PRODUCTION HARDENING

[ ] Remove temporary demo access.

[ ] Review all outbound send paths.

[ ] Review all owner-command paths.

[ ] Review group handling.

[ ] Add structured logging.

[ ] Remove excessive sensitive debug logging.

[ ] Add backup strategy for SQLite.

[ ] Add process restart/recovery strategy.

[ ] Test connection reconnect behavior.

[ ] Test media download failures.

[ ] Test Whisper failure/retry.

[ ] Test notification failure/retry.

==================================================
IMPORTANT IMPLEMENTATION RULE
==================================================

Do NOT implement everything in one change.

Work in small verified steps:

1. safety
2. tests
3. language
4. voice
5. confidence
6. human handoff
7. notification
8. dashboard
9. production hardening

After each stage:

npm test

Do not proceed if regression tests fail.

==================================================
CURRENT HANDOFF POINT
==================================================

The latest known working point has:

- demo expiry extended to 2026-10-10 23:59:59 +05:00
- greeting handling for English/Roman Urdu/Urdu
- outbound inbound-first authorization
- message deduplication
- message claiming/retry
- lead extraction
- property search
- provenance
- Park View knowledge
- current npm test suite passing

NEXT TASK:

P0 — Harden outbound authorization at the final send boundary and add regression tests.

Then proceed to P1 language hardening and P2 local voice-note support.

Do not start with dashboard/UI.

==================================================
END OF HANDOFF
==================================================

## Additions (2026-10-04)
- LID -> phone normalization works. Monitored group: Al-Kaywan Marketing (PVCL). Group/owner JIDs live in config, not in the repo.
- Groups: ingest + alert only, no auto-reply. The DM inbound-first rule does not apply to groups; group behavior must be explicit.
- STT: local whisper.cpp behind transcribeAudio() (provider-swappable). Limits: MAX_AUDIO_SECONDS, MAX_AUDIO_MB. Delete temp audio after transcription (DEBUG_KEEP_MEDIA=false by default). Failed STT -> ask the customer to resend/type; never a generic property answer.
- Voice message states: received, processing, transcribing, processed, failed, needs_human. Keep existing claim/retry guarantees.
- Numbers (marla/kanal/crore/lakh) use deterministic normalization; confirm ambiguous critical values.
- Urgency: urgency.js classifyUrgency(message, lead) -> {level, reasons}; levels NORMAL/HIGH/URGENT/CRITICAL; thresholds in config (e.g. URGENT_BUDGET_PKR), phrase lists in a vocabulary module.
- Alerts: notifications.js notifyRealtor(alert), ntfy first (Android-first; test iOS separately; self-host if privacy matters). realtor_alerts table + notification_outbox with bounded retries. One alert per event, update on new messages, re-notify only on higher severity or cooldown. Alert failure must never break the customer reply.
- Outbound sends require connection state CONNECTED. Inbound authorization is in-memory (fail-closed on restart); never infer it from a lead or contact existing in the DB.
- Logging: no Baileys session/crypto objects or raw payloads in normal logs. Never commit pairing-auth, agent.db, voice files or secrets.
- Next: voice note -> local transcription -> processMessage(), then urgent alert -> realtor push.
