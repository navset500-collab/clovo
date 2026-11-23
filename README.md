# Clovo

### You have an idea. Will people want it?

[Try Clovo](https://clovo-studio.vercel.app) · [Source code](https://github.com/navset500-collab/clovo)

I kept running into the same question when building projects: would anyone actually want this? A working prototype answers whether something can be built. It doesn't tell you whether the problem matters, whether someone would switch from their current solution, or what you should change first.

Clovo turns that uncertainty into a process you can inspect.

## Bring what you have

Start with a written idea of at least 50 words and a specific audience. Mira asks focused follow-up questions when the core idea is unclear. Add an MVP brief, a PDF, screenshots, or a short demo video. Describe who you want to help and what you need to learn. You don't need a finished product or an account.

## Watch the team work

| Agent | Job                                                               |
| ----- | ----------------------------------------------------------------- |
| Mira  | Understands the problem and supplied material                     |
| Sora  | Investigates demand evidence and identifies what is still unknown |
| Juno  | Runs five separate, explicitly simulated user perspectives        |
| Rook  | Challenges assumptions and connects concerns to original sources  |
| Leo   | Produces prioritized changes with concrete acceptance checks      |
| Vera  | Designs a neutral study for real people                           |

The live workspace streams actual server events: agent starts, completed handoffs, and the five perspective results when their shared request returns. It doesn't invent private reasoning or fake progress. All agents use the same Gemini base model with different roles; they are not six independently trained models.

## Ask: “Where did that feedback come from?”

Each concern can point to the original brief or an uploaded file. Text quotes are matched against the supplied source in code. Unknown source IDs and mismatched quotes are rejected. File observations are labeled as AI interpretations. A concern without supporting evidence is labeled as a hypothesis. Build recommendations link to the concerns they address.

This checks provenance, not whether every user claim is true. A quote from a project description is not proof of market demand.

## A score you can inspect

The **readiness-to-test score** is a rubric assessment of the brief, not a success probability or a demand forecast. Rook assesses 16 explicit criteria across problem clarity, audience focus, proposed value and testability. Each accepted criterion needs an exact supporting quote from the original text and earns 6.25 points. Code verifies quote matches, rejects duplicate dimensions/checks and computes the total. Missing or unsupported checks earn zero: there is no score floor. AI still judges whether a quoted detail meets a criterion; a quote match proves provenance, not truth. Each area shows its gaps, evidence and one next step. AI judgments can be wrong; inspect and challenge them.

## Then ask real people

Create a feedback link after reviewing exactly what it will share. Invite people yourself. They can read the idea, open your prototype link, and submit feedback without logging in. Their responses stay separate from the simulated panel.

Studies and responses use private Vercel Blob storage. Random invitation links and separate owner keys control access. Links close after seven days; stored records have a seven-day deletion TTL. Owners can delete their studies sooner from the app's privacy controls.

## What works today

- A guided two-step intake with a 50-word minimum and clarifying questions
- Written ideas, PDFs, images, and short video input
- A separate interactive walkthrough that never fills your saved workspace
- Topic-specific web research with quote-matched sources
- A transparent readiness-to-test rubric
- Six-agent orchestration with a live activity feed
- Five distinct fictional perspectives generated together after profile planning
- Evidence-linked concerns and build priorities
- No-login human feedback studies
- English and Spanish UI and AI output
- Local review persistence, build checklist, and Markdown export
- Original SVG logo and diagrams; no generated decorative artwork

## Honest limits

AI personas are simulations, not interviewed customers. They cannot establish demand. You recruit real participants yourself, and anonymous responses are not identity-verified. Stated interest is not future use.

Public research uses [Tavily](https://docs.tavily.com/documentation/keyless), including its free, rate-limited keyless mode. An optional server-side `TAVILY_API_KEY` can use your own quota. Two topic queries look for the audience problem and competing products. Claims are retained only when supporting quotes match returned excerpts. Product pages describe offerings; they do not prove adoption. If search is unavailable, Clovo explicitly says so.

Videos are reviewed as six sampled frames, without audio. The prototype link is for human testers; agents do not click through the live app. PDFs are sent in full, up to 2 MB. Videos can be up to 60 MB / three minutes; combined prepared input is limited to 3.7 MB.

## Usage and cost protection

Each anonymous browser receives **10 completed reviews per rolling 24 hours**. Each slot returns exactly 24 hours after that report completed. Failed, cancelled and clarification-only runs do not reduce that personal completed count. A signed HttpOnly/SameSite cookie separates people on the same Wi-Fi without adding login. This is a per-browser allowance, not verified identity: clearing cookies or changing browsers can create another identity.

A separate **20-start monthly app limit across every visitor** conserves free service quotas, including all past usage. Daily and per-network start ceilings are also 20; the monthly cap is the ultimate bound. This is an app-imposed resource limit, not an invoice or a provider pricing allowance. Failed attempts still use shared resources. A shared service pause is separate from the visitor’s ten reviews. Two global reviews and one per network can run concurrently. A provider-unavailable/quota failure triggers a two-minute service cooldown to reduce repeated failing calls; blocked requests make no AI calls.

Private Blob counters use conditional ETag writes, fail closed when storage is unavailable, and retain the existing monthly spending history. Personal records retain individual completion timestamps, so allowance does not accidentally reset at UTC midnight or month rollover. Legacy counts remain until 24 hours after their recorded start; migration never erases usage. A successful personal completion is persisted before emitting the report; duplicate settlement does not double count. Visitor leases prevent simultaneous requests spending the last slot twice and expire after interruptions.

A review can make at most **12 model attempts across an original review and its recovery chain (7 planned calls on a fresh run)**, each preceded by a provider token count capped at **24,000 input tokens**; output is capped at **4,500 tokens per attempt**. Only a 503 provider-unavailable response can receive one automatic retry, after a short backoff, per accepted request. The retry consumes the same hard attempt budget; quota errors, timeouts and malformed outputs are not retried. There are no paid Google grounding calls. The approved model is `gemini-3.5-flash-lite`; changing it requires a code review of the limits. Two Tavily queries at most run per review, with free access unless you explicitly configure a key. Cancellation and a 150-second deadline abort remaining work. A request already received by a provider may still consume free quota after cancellation.

Set `ANALYSIS_ENABLED=false` and redeploy to pause all new reviews. Set `ANALYSIS_ACCESS_CODE` for optional invite-only access. Neither setting bypasses the shared caps. Limits live in `lib/usage-policy.ts`; lowering them applies immediately on deployment. Development and production use separate counters. Do not delete or reset the production ledger to “fix” a quota message.

Study creation, submissions and reads have persistent global and per-network limits, with a 50-submission cap per study. Request bodies are capped while streaming; media types, file signatures, URLs and structured model output are validated. Credentials stay server-side. Study owner keys are random, stored as hashes on the server, and compared in constant time. React escapes displayed user/model text; restrictive browser headers block framing, objects and external connections. Inline scripts remain allowed for Next.js hydration, so this is not a strict nonce-based CSP.

These controls bound this app's model usage, **not the entire provider or hosting bill**. Other apps sharing the key, compromised credentials, platform requests and storage traffic are outside that model allowance. Configure provider-side quotas as additional protection. This deployment uses Vercel Hobby; paid Spend Management is not available on that plan. The owner requires free services only: do not enable billing, upgrades, paid trials, or paid fallbacks, and do not evade free-tier quotas. No claim of perfect security or independent security certification is made.

## Export, languages and replay

Download report saves a Markdown text file locally. It includes the written brief, score, source links, agent findings, recommendations, interview plan and real responses loaded in the current session. It excludes files and secret keys. Review the brief before sharing the export.

The English/Español menu translates the interface and sets the language of the next generated report and study questions. It does not translate existing reports or participant answers. Switching the interface, exporting, and replaying saved events make **zero model calls**.

When the agents finish, the live workspace stays open until you choose **Open your review**. The Agent activity tab offers a clearly labeled, paced replay with pause and single-step controls. It uses recorded starts and results, not invented reasoning or hidden thinking.

## Run locally

```bash
npm install
npm run dev
```

Server environment variables:

```text
GEMINI_API_KEY=your-key
BLOB_READ_WRITE_TOKEN=your-private-store-token
```

The approved model is `gemini-3.5-flash-lite`. Optional: `ANALYSIS_ACCESS_CODE`, `ANALYSIS_ENABLED=false`, and `TAVILY_API_KEY`. The Blob token is required for usage protection as well as studies.

```bash
npm test
npm run build
```

The tests cover input limits, safe URLs, consent, private owner keys, source-reference filtering, quote matching, hypothesis labeling, and recommendation links. Build and TypeScript checks also run successfully.

## Stack and credit

Next.js, React, TypeScript, Gemini, Tavily, Zod, and Vercel Blob. Built with AI coding assistance.

[Sombra](https://sombra-pied.vercel.app/command) inspired the visible agent handoff layout. Clovo's implementation, logo, and diagrams are original. Zodiak and General Sans are from [Fontshare](https://www.fontshare.com/).

Privacy and data handling are explained in the app at `/privacy`. API keys, environment files, uploaded project materials, and private feedback are not included in this repository.

### Clear allowances and first-use guidance

The intake form retries a transient availability failure once, then shows a translated connection error instead of implying exhausted reviews. It never retries a rate-limit response or starts AI to check availability. Leaving the form cancels the check. The status endpoint returns HTTP 503 for storage-check failures and logs only a random reference and error category. Review submission still uses authoritative, atomic server checks and fails closed if storage cannot be checked.

The intake form shows completed reviews remaining out of ten, the next slot’s return in local time, and any separate service pause. It reads the personal counter before starting. Only the shared budget snapshot is cached for 15 seconds; personal counters are read uncached and atomic reservations remain authoritative. Machine-readable error codes are translated at render time, so switching English/Español also translates an already-visible quota error.

The homepage follows describe → review → invite. The report's next-step guide links to research, improvements and real feedback. Creating a feedback link creates an unlisted, no-index page at `/test/<random-id>` on Clovo; it does not send invitations or publish to another service. Anyone with the link can read the shared invitation. Owners copy the link, invite people themselves, and check responses in the same browser. Files and AI reports are excluded from the invitation.

The live workspace's six-segment progress display advances only on completed agent events. Animated connections indicate active downstream work. The latest completed finding remains readable while other agents work, and the original event log remains available. Reduced-motion preferences disable the new animated treatments.

### Deeper reviews, with explicit uncertainty

Clovo uses a structured review protocol, not university credentials or a claim of expert certification. Mira identifies the job, current workaround, first moment of value, and pivotal assumption. Sora checks source excerpts for demand signals and named alternatives, distinguishes cited facts from switching/differentiation hypotheses, and reports retrieved versus cited sources. A source match does not establish truth, independence or market demand; two web queries are a bounded search, not a comprehensive market study.

Juno plans five fictional perspectives across core value, existing habits, access, trust and low need. Ages, practical resources and circumstances vary within the declared audience; age or demographics do not determine behavior. Each perspective supplies a specific reason not to adopt and a change to test. If a call fails, the report keeps the available responses with explicit coverage and no invented replacement. Any retry is bounded by the single shared 503 retry slot. Old three-person reports remain readable.

Rook ranks failure modes and includes evidence that could weaken each criticism. The /100 readiness score uses 16 quote-supported checks in four areas and includes a concrete next step per area. Leo connects improvements and alternative directions to validated concern IDs, with first actions and tradeoffs. Vera specifies a hypothesis, observable test and negative evidence that should trigger reconsideration. These are proposals, not measured outcomes.

The live research desk switches between workspaces as real updates arrive. It shows submitted search terms, retrieved source links, citation-check counts, panel profiles and completed outputs. Text reveal and slide animations present existing information; they do not simulate hidden reasoning or pretend to browse a prototype. Recorded replay makes no API calls, and reduced-motion preferences are respected.

The panel retains five distinct viewpoints but evaluates them together after planning, reducing a full run from 11 to 7 model calls. These are correlated AI simulations, not independent respondents. The maximum remains 12 attempts and 288,000 input / 54,000 output tokens across a recovery chain. A failed review may return a signed checkpoint of completed stages; it is bound to the exact brief, language, files and anonymous browser, expires within 30 minutes and before monthly rollover, and can be consumed once using the atomic usage ledger. Each accepted continuation also consumes a shared start; personal usage increments only when a complete report is delivered. Completed stages are restored without fresh model calls. No paid fallback is configured.

Provider overload handling follows [Google’s API error guidance](https://ai.google.dev/gemini-api/docs/generate-content/api-errors). Only the single bounded retry is automatic; the app never loops until a request succeeds. Safe diagnostics retain the category and status code, not provider response bodies or secrets.

### Diagnosing interrupted reviews

The UI distinguishes AI service failures, timeouts, interrupted connections, invalid panel output, personal quota exhaustion and shared spending pauses. Server errors include a short support reference and the failing agent when known. Logs retain only the safe failure category, stage, HTTP status and random review reference; project text, response bodies and API keys are excluded. A generic failure remains explicitly unknown instead of being presented as quota exhaustion.

## Reading the report

The report has five steps: start with the score and first action, check research evidence, explore simulated objections, follow the action checklist, then invite real people. Labeled colors separate evidence, risks, unknowns, simulation and actions. Concise cards show the decision first, with supporting details available on expansion. Color is never the only status indicator. Older saved reports retain their original score and are labeled as using the earlier rubric.

Live activity reflects server events without an artificial delay. A **3-minute guided replay** lets people read recorded handoffs afterward, with pause, next-event and quick-play controls. Replay never invokes AI or consumes review allowance. The interface distinguishes replay timing from actual analysis duration and respects reduced motion.

The critique’s nested output format uses a compact Gemini-facing schema to avoid the provider’s constrained-decoding complexity limit. Required fields and enums are retained; the original server-side Zod schema still enforces all cardinality, type and length limits before scoring. This follows Google’s guidance to simplify complex schemas in [structured outputs](https://ai.google.dev/gemini-api/docs/structured-output).
