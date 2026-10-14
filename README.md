# JobHunt AI

Next.js App Router + TypeScript + Tailwind MVP for discovering, verifying and ranking live jobs. No authentication, database, fixtures in the UI, or secondary AI credential. This is original implementation work in this workspace.

## Run

Requires Node 20.9+ and a TinyFish API key with Search, Fetch and Agent access.

```powershell
npm install
Copy-Item .env.example .env.local
# Edit .env.local and set TINYFISH_API_KEY. Never commit it.
npm run dev
```

Open http://localhost:3000. Restart after changing the key. The application works without the key for UI review and returns HTTP 503 on search. It displays no fabricated jobs. Production configuration failures use generic messages.

```powershell
npm test
npm run lint
npm run typecheck
npm run build
npm run test:live
# Production demo
npm start
```

## Architecture and TinyFish contribution

Browser form → POST `/api/jobs` → independent source searches → live page reads → conservative heading parser or browser Agent extraction → schema validation → safe URLs and explicit visa evidence → filtering/ranking → deduplication → results and source diagnostics. The key is accessed exclusively server-side. The API accepts preferences, never arbitrary URLs.

Contracts verified against official docs on October 14, 2026:

| Capability | Actual endpoint | Meaningful contribution |
| --- | --- | --- |
| Search | GET `https://api.search.tinyfish.ai` | Discovers individual postings on supported domains using query, include_domains, language and purpose. Parses results[].url/title. |
| Fetch | POST `https://api.fetch.tinyfish.ai` | Reads up to two discovered URLs per source using urls, format=markdown, links=true, ttl=0, per_url_timeout_ms=25000. Parses results[] and per-URL errors[]. Validates redirect destinations. |
| Agent | POST `https://agent.tinyfish.ai/v1/automation/run` | Opens an ambiguous/dynamic individual posting, expands details and inspects the apply action. Requests output_schema, checks COMPLETED and reads result. Max runtime 65 seconds. No applications submitted. |

All use `X-API-Key`. Native HTTP is used deliberately; no invented SDK methods. Search and Fetch are distinct endpoints. Agent is called only when the basic page parser cannot extract the necessary fields. A particular search may use two capabilities or all three; endpoint scoring is not guaranteed until live calls prove useful contributions. Source counts do not count as different endpoints.

Official references: [Search](https://docs.tinyfish.ai/search-api/reference), [Fetch](https://docs.tinyfish.ai/fetch-api/reference), [Agent](https://docs.tinyfish.ai/agent-api/reference), [Structured output](https://docs.tinyfish.ai/key-concepts/structured-output). Documentation lists Search's default limit as 30 requests/minute; actual access, quota and billing are account-dependent. Fetch supports up to 10 URLs and per-URL timeouts up to 110000ms. Agent also supports `/run-async` returning run_id with GET `/v1/runs/{id}` polling, and `/run-sse` progress events. Fetch uses include_selectors=[body] to preserve job headings, location metadata and apply controls that default boilerplate cleanup can omit. Lever /apply URLs are canonicalized to the detailed posting. This MVP uses synchronous `/run`, which cannot be cancelled; a local timeout may leave the remote run active until its configured duration expires. Beta-gated max_steps and strict mode are deliberately omitted.

## Supported sources and safety

Greenhouse (`boards.greenhouse.io`, `job-boards.greenhouse.io`), Lever (`jobs.lever.co`), Ashby (`jobs.ashbyhq.com`). Search is separate for each platform, capped at two candidates each. Only HTTPS exact allowlisted hosts with posting-shaped paths are accepted, without credentials or custom ports. Redirect destinations and Agent URLs are revalidated. Tracking parameters and fragments are stripped. No user URL input. Rendering uses React text escaping and safe external links. TinyFish protects its own fetcher from private-address targets. No local fetch to job pages is performed.

The schema includes title, company, location, job type, seniority, sponsorship/evidence, description, source/provenance, apply URL, retrieval timestamp, score and explanation. Visa defaults to unknown; a claimed sponsorship status requires verbatim source evidence. Supported status additionally requires explicit affirmative wording. Unknown seniority is retained with a ranking penalty. Explicit conflicting seniority is excluded. Remote matching uses the extracted location, never description assumptions. Sponsorship-only excludes unknown. Matching requires at least half the role tokens in the title, all remaining role tokens corroborated in the description, location text match and the requested job/internship type. Explicit Remote metadata is preserved alongside geographic restrictions. Scoring: role 45, location 25, keywords 15, seniority 10, verified sponsorship 5. Missing keyword preferences receive the 15 neutral points. Duplicate canonical URLs or normalized company/title/location merge provenance.

Errors are visible per source and stage. Sources run independently, with Fetch partial errors retained. No automatic paid retries: 429/402/401 messages explain next actions. A process-local four-search/minute and two-concurrent-search guard bounds accidental usage. This is not distributed abuse protection; add hosting rate limiting before a public demo with unrestricted access.

## Validation and demo

Unit/integration tests use explicitly labeled synthetic fixtures only in tests. They cover the requested Karachi junior, remote analyst internship, London mid-level, no-match, source failure, duplicates and unknown visa cases, as well as unsafe URLs, closed postings, invalid output and input validation. These establish behavior, not live source availability.

`npm run test:live` loads .env.local or .env, executes the four required query cases plus a broader London software-engineer case, and saves sanitized evidence under ignored `test-results/`. It records listings, timestamps, diagnostics, endpoint URLs, Agent run IDs and sanitized request/response bodies, never authentication headers or the key. Run one case with npm run test:live -- 2 (cases 1 through 5). The script fails acceptance when every discovery source fails or no positive matches are returned; zero matches alone are valid for the explicit no-match case. Zero results are possible and must not be relabeled as successful live matches. Check actual apply pages manually before recording. For a convincing demo, show searches with different inputs, explain match scores, open a real apply link, then show source diagnostics and unknown visa handling.

## Limitations and remaining steps

Live verification has now succeeded with the configured key; see VERIFICATION.md and the ignored test-results evidence. Indexed discovery can miss recent or geographically sparse postings. Two candidates per source favor bounded latency/cost over exhaustive recall. Verified Lever and Ashby headings are parsed directly; ambiguous pages still need Agent and may exceed one minute. Agent extraction can err; schema and evidence validation reduce but do not eliminate errors. Source wording variants and synonyms can produce false negatives; mid-level is unknown if not explicit. Visa evidence visible only after Agent interaction is conservatively rejected if absent in Fetch text. Direct posting URLs host application actions; opening a readable page is not proof the employer will accept an application. No country eligibility inference. No salary, user accounts, saved searches or persistent state.

Before deployment: add key, execute live suite, verify links, record working demo and capture three meaningful endpoint contributions if observed. Use a Node host with >=150-second request support; short serverless limits need async job polling. Configure server-side secret and hosting rate limits, test on target host, then prepare a bounty submission describing actual endpoint use and limitations. Deployment, push, publication and submission require user approval and were not performed.


## Concrete TinyFish examples

Search discovered Electric Twin and Apollo Research for Product Engineer / London. Fetch read their live postings and retained the headings, locations and application controls. Electric Twin was merged across Lever and Ashby with both URLs preserved. Agent performed structured browser extraction for Sezzle''s Product Data Intern when the conservative parser could not establish all details, preserving Colombia/Remote and unknown visa status. Completed requests are documented in VERIFICATION.md; private run IDs and raw traces are excluded from the public package.

## Submission and deployment

See DEPLOYMENT.md for Vercel duration/size limits, the reviewed async Agent alternative, required hosting protection, exact publish commands and blockers. See SUBMISSION.md for the draft bounty description. Run npm run audit:secrets before staging and again before publication. No repository, deployment or submission has been published. On Vercel, searches are disabled unless JOBHUNT_ALLOW_PUBLIC_SEARCH=true; enable it only after configuring a hosting rate limit or restricted reviewer access. This operator switch does not itself implement distributed protection.

