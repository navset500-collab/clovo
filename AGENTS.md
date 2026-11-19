<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Owner's free-only requirement

- Use only verified free service plans and free API access. The owner has no budget for paid usage. Do not enable billing, paid trials, upgrades, overages, paid model fallbacks, or paid tools.
- Respect provider quotas and keep usage protections. Never rotate keys/accounts or otherwise evade free-tier limits. When free access is exhausted, stop and clearly explain the temporary unavailability.
- A model's free-tier listing does not prove that a particular API key is unbilled. Verify the project's billing tier before adding or changing providers. Do not export production secrets to check billing.
- Verified on 2026-11-18: Vercel team acendly is on Hobby with no invoices; the owner's Google AI Studio projects show Free tier and its billing page shows No billing account; production has no Tavily key and uses documented free keyless access. These are dated observations, not a guarantee of future account settings.
