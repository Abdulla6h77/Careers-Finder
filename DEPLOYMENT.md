# Deployment guide

No GitHub push or Vercel deployment has been performed. Commands below are for execution only after approval.

## Local release checks

```powershell
cd D:\tinyfish
npm ci
npm run audit:secrets
npm test
npm run lint
npm run typecheck
npm run build
```

The workspace currently has no Git repository. There are no local tracked/staged files or commits; external repositories cannot be assessed from this folder. The audit compares the local credential without printing it, scans publishable files, checks ignore rules using a temporary repository, and scans tracked/staged content and reachable history once Git exists. A history-secret finding exits 2: stop publication and arrange credential rotation with the owner. Ignore rules are not retroactive and `git add -f` can bypass them. The hook is defense in depth, not a substitute for review.

## Vercel compatibility and required settings

Use the Next.js framework preset, Node 22 or 24, `npm ci`, and `npm run build`. Enable Fluid Compute and confirm `/api/jobs` receives the exported `maxDuration=150`. Current Fluid Compute limits allow 300 seconds on Hobby. Older or disabled-Fluid configurations may not support this route. Search (20s), Fetch (35s) and Agent (75s) can total about 130s; the browser times out at 145s. Async JavaScript inside POST still holds the HTTP request open. [Vercel duration documentation](https://vercel.com/docs/functions/configuring-functions/duration).

Vercel caps request/response payloads at 4.5MB. The application streams at most 4KiB of input, caps upstream JSON at 2MiB and API output at 256KiB. It returns normalized listings and bounded diagnostics rather than raw pages. Over-budget upstream content becomes a visible source failure. [Vercel function limits](https://vercel.com/docs/functions/limitations).

Set `TINYFISH_API_KEY` in Vercel's sensitive environment settings for the chosen Preview/Production environments. Never use a `NEXT_PUBLIC_` key, put it in a URL/CLI argument, or upload `.env`/traces. `.vercelignore` excludes local secrets and evidence from CLI uploads.

Before enabling searches, configure a hosting/firewall rate limit for POST `/api/jobs` (start with 4/minute per client IP), plus platform spend controls, or restrict demo access to trusted reviewers. Firewall feature availability is account-dependent; if unavailable, keep the deployment restricted. The application's 4 searches/minute and 2 concurrent searches are per process and do not enforce a distributed account-wide cap. Same-origin checks stop cross-site browser requests but are not bot protection. Configure `JOBHUNT_ALLOW_PUBLIC_SEARCH=true` only after this step; Vercel searches otherwise fail closed with HTTP 503. This switch is operator acknowledgment, not a rate limiter or authentication mechanism.

Errors are generic at the route boundary, no-store, and never include stack traces, raw upstream responses or credentials. Source diagnostics expose controlled failure messages. Private Agent run IDs remain in local evidence, not browser responses.

## Async Agent review

The MVP intentionally retains its tested synchronous Agent call. TinyFish documents POST `https://agent.tinyfish.ai/v1/automation/run-async` returning a run ID, GET `https://agent.tinyfish.ai/v1/runs/{id}` for status/result, and POST `https://agent.tinyfish.ai/v1/runs/{id}/cancel` for eligible runs. These are reviewed alternatives, not implemented or live-tested paths in this release. Synchronous `/run` cannot be cancelled; browser or local timeout can leave remote work running. [TinyFish reference](https://docs.tinyfish.ai/agent-api/reference).

If the chosen host cannot support 150s, do not merely replace `/run` with `/run-async` and poll in the same long request. A real migration needs short start/status requests, signed scoped tokens or durable ownership state, polling limits and cancellation; never expose an arbitrary account-wide run lookup. Do not rely on Vercel process memory for durable jobs. This migration is outside the unchanged demo flow.

## Publish commands — approval required

First create an empty GitHub repository under the user's account; insert its real URL below. Do not commit `.env`, `test-results`, private traces or preview screenshots.

```powershell
git init -b main
git config core.hooksPath .githooks
git add .gitignore .gitattributes .vercelignore .env.example .githooks app lib scripts tests package.json package-lock.json tsconfig.json next-env.d.ts eslint.config.mjs postcss.config.mjs README.md VERIFICATION.md DEPLOYMENT.md SUBMISSION.md
git update-index --chmod=+x .githooks/pre-commit
npm run audit:secrets
git diff --cached --stat
git diff --cached --name-only
git commit -m "Build JobHunt AI TinyFish careers finder"
git remote add origin <YOUR_GITHUB_REPOSITORY_URL>
git push -u origin main
```

Inspect the exact staged diff before the commit. Git author identity and the repository URL must be configured by the owner. The hook/audit also runs against staged content and history. A secret finding blocks publication.

```powershell
npx vercel login
npx vercel link
npx vercel env add TINYFISH_API_KEY preview
npx vercel env add TINYFISH_API_KEY production
# Complete duration, protection/rate-limit and spend settings in the dashboard.
npx vercel env add JOBHUNT_ALLOW_PUBLIC_SEARCH preview
npx vercel env add JOBHUNT_ALLOW_PUBLIC_SEARCH production
# Enter true only after protections are configured.
npx vercel deploy
# Test the returned Preview URL and actual live links before promoting:
npx vercel deploy --prod
```

The secret is entered through the CLI prompt, never a command argument. Vercel linking and all deploy commands create external state; none were executed. GitHub integration can deploy automatically on push, so approve the intended sequence before connecting it.

## Hosted acceptance and bounty handoff

On Preview, test a London Product Engineer query, remote Data Analyst internship, no-match, visa-only filtering, duplicate provenance and visible source failures. Confirm the hosting limit produces 429 without TinyFish calls beyond the rule. Check no secret appears in browser assets or network responses. Capture a short demo with real apply links and source diagnostics. Re-run positive searches near recording time because listings change. Add the approved repository URL, deployed URL and demo URL to SUBMISSION.md, then submit only with approval. No claim of deployed validation is made yet.
