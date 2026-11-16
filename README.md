# Clovo

### See how your idea lands.

[Try Clovo](https://clovo-bvh-2026.vercel.app) · Built for Bay Valley Hacks · Solo track · Theme: **Elevate the Ordinary**

I kept running into the same question when building projects: would anyone actually want this? A working prototype answers whether something can be built. It doesn't tell you whether the problem matters, whether someone would switch from their current solution, or what you should change first.

Clovo turns that uncertainty into a process you can inspect.

## Bring what you have

Start with a written idea. Add an MVP brief, a PDF, screenshots, or a short demo video. Describe who you want to help and what you need to learn. You don't need a finished product or an account.

## Watch the team work

| Agent | Job |
| --- | --- |
| Mira | Understands the problem and supplied material |
| Sora | Investigates demand evidence and identifies what is still unknown |
| Juno | Runs three separate, explicitly simulated user perspectives |
| Rook | Challenges assumptions and connects concerns to original sources |
| Leo | Produces prioritized changes with concrete acceptance checks |
| Vera | Designs a neutral study for real people |

The live workspace streams actual server events: agent starts, completed handoffs, and the three tester calls as they return. It doesn't invent private reasoning or fake progress. All agents use the same Gemini base model with different roles; they are not six independently trained models.

## Ask: “Where did that feedback come from?”

Each concern can point to the original brief or an uploaded file. Text quotes are matched against the supplied source in code. Unknown source IDs and mismatched quotes are rejected. File observations are labeled as AI interpretations. A concern without supporting evidence is labeled as a hypothesis. Build recommendations link to the concerns they address.

This checks provenance, not whether every user claim is true. A quote from a project description is not proof of market demand.

## Then ask real people

Create a feedback link after reviewing exactly what it will share. Invite people yourself. They can read the idea, open your prototype link, and submit feedback without logging in. Their responses stay separate from the simulated panel.

Studies and responses use private Vercel Blob storage. Random invitation links and separate owner keys control access. Links close after seven days; stored records have a seven-day deletion TTL. Owners can delete their studies sooner from the app's privacy controls.

## What works today

- Written ideas, PDFs, images, and short video input
- Six-agent orchestration with a live activity feed
- Three independently called AI personas
- Evidence-linked concerns and build priorities
- No-login human feedback studies
- English and Spanish UI and AI output
- Local review persistence, build checklist, and Markdown export
- Original SVG logo and diagrams; no generated decorative artwork

## Honest limits

AI personas are simulations, not interviewed customers. They cannot establish demand. You recruit real participants yourself, and anonymous responses are not identity-verified. Stated interest is not future use.

Google Search grounding currently hits the configured account's quota. Clovo explicitly shows that live search is unavailable and demand is unverified, rather than fabricating competitors or citations.

Videos are reviewed as six sampled frames, without audio. The prototype link is for human testers; agents do not click through the live app. PDFs are sent in full, up to 2 MB. Videos can be up to 60 MB / three minutes; combined prepared input is limited to 3.7 MB.

This is a hackathon prototype. In-memory rate limits are best-effort. Production use would need stronger abuse prevention, research validation, and more complete media processing.

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

Optional: `GEMINI_MODEL`, default `gemini-3.5-flash-lite`.

```bash
npm test
npm run build
```

The tests cover input limits, safe URLs, consent, private owner keys, source-reference filtering, quote matching, hypothesis labeling, and recommendation links. Build and TypeScript checks also run successfully.

## Stack and credit

Next.js, React, TypeScript, Gemini, Zod, and Vercel Blob. Built with AI coding assistance.

[Sombra](https://sombra-pied.vercel.app/command) inspired the visible agent handoff layout. Clovo's implementation, logo, and diagrams are original. Zodiak and General Sans are from [Fontshare](https://www.fontshare.com/).

Privacy and data handling are explained in the app at `/privacy`. API keys, environment files, uploaded project materials, and private feedback are not included in this repository.
