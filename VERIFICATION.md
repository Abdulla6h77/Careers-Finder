# Executed verification — October 14, 2026

- 
pm test`: 17 tests passed. Covers the requested cases, URL safety, malformed output, real ATS layouts, explicit remote geography, role relevance, and negative visa/remote wording. Fixtures are never shown by the application.
- 
pm run lint`: passed.
- 
pm run typecheck`: passed.
- 
pm run build`: passed, Next.js 16.4.0 production build, `/` static and `/api/jobs` dynamic.
- Production server 
pm start`: started successfully on port 3000.
- HTTP: verified sponsorship filter returned Apollo Research alone with its verbatim conditional sponsorship evidence; invalid input returned 400. Earlier missing-key behavior returned 503 correctly.
- Browser: the live London Product Engineer search displayed two opportunities, match scores, unknown and verified visa states, real apply links, source diagnostics and one merged duplicate. Apollo Research and Sezzle apply pages were opened and verified to have application controls. Nothing was submitted. Earlier mobile testing at 390px showed no horizontal overflow; desktop results were inspected during this pass.
- 
pm audit --omit=dev --json`: 0 production vulnerabilities. Full audit reports 5 high development-only advisories in the ESLint config's transitive glob/braces chain. npm's offered remediation downgrades the Next ESLint config to a different major and was not applied.
- 
pm run test:live`: all five cases executed and the suite exited 0 after extraction fixes. The remote internship case was rerun after the final matching fixes and exited 0. The key is configured in `.env`, supported by Next.js. No authentication headers or keys appear in evidence.

## Live results

| Input | Matches | Observed behavior |
| --- | --- | --- |
| Software Engineer / Karachi / junior | 0 | Out-of-location results excluded; one Ashby Fetch failure. No verified local match found. |
| Data Analyst / remote / internship | 2 | Portcast Data Analyst Intern and Sezzle Product Data Intern. Geographic restrictions preserved: selected Asian cities and Colombia respectively. |
| Product Engineer / London / mid | 2 | Electric Twin and Apollo Research; Electric Twin merged across Lever and Ashby. Multiple advertised seniority levels remain unknown rather than invented as a single mid-level. |
| Zzxqv Underwater Basket Weaver / Karachi | 0 | Search completed; unrelated results excluded before Fetch or Agent. |
| Software Engineer / London / any | 3 | Lever/Ashby results, one successful dynamic Agent extraction and one Agent timeout. |

Successful live requests prove three distinct capabilities: GET `https://api.search.tinyfish.ai` discovered postings across the supported platforms; POST `https://api.fetch.tinyfish.ai` read pages with ttl=0; POST `https://agent.tinyfish.ai/v1/automation/run` inspected ambiguous pages. Completed Agent extractions are recorded in private local evidence for the remote internship and London software-engineer cases. A straightforward Product Engineer search now needs only Search and Fetch. Source counts are not endpoint counts; scoring still depends on bounty review.

Ignored evidence files: `test-results/live-1.json` through `live-5.json`, `trace-*.json`, and `http-visa-required.json`. Traces store sanitized request/response bodies without authentication headers. Listings, endpoint contributions, run IDs, provenance and retrieval timestamps can be inspected there. Do not commit `.env` or evidence files.

The first live pass returned zero matches and exposed real bugs. Fixes preserve headings and application controls via Fetch include_selectors=[body], canonicalize Lever /apply links to detailed postings, parse visible Lever/Ashby layouts directly, retain explicit remote metadata and employment type, and tighten role relevance. Visa form questions and negative wording cannot become affirmative sponsorship claims. Exclusion reasons are now visible.

This is working but not perfect. Agent and upstream Fetch requests can time out; unsupported redirects are excluded. The latest remote-internship run had two successful Greenhouse Agent extractions and two Ashby Agent timeouts, while retaining two valid matches. No supported-source Karachi junior match was found. Unknown seniority is a lower-ranked eligible result, not a verification claim. Remote does not imply worldwide eligibility. Employer availability can change after retrieval. Record the demo using a verified positive query and explain these limitations.

Local preview URL: http://localhost:3000. Deployment, push, publication and bounty submission still require approval and were not performed.


## Submission readiness audit

This preparation pass executed 17 tests, lint, typecheck and the production build successfully. The secret audit found no configured credential in publishable files or 12 browser assets. No Git repository exists at this workspace root, so there is no local tracked/staged/history state; repositories outside it were not audited. Ignore and Vercel-upload exclusions are checked by the audit script. Account-specific run IDs were removed from public documentation and browser diagnostics; private evidence remains local and ignored. The largest recorded upstream JSON was 109,988 bytes. No new live TinyFish request was needed for these safety-only changes.

New safeguards: 4KiB bounded streaming input, 2MiB upstream JSON cap, 256KiB API response cap, generic unexpected errors, no-store responses, same-origin browser checks, and fail-closed Vercel search enablement. Per-process throttling is not distributed protection. DEPLOYMENT.md documents the required hosting safeguards, Fluid Compute duration, synchronous and reviewed async Agent behavior, approval-gated publish commands and outstanding hosted validation. SUBMISSION.md contains the draft description. No credentials were rotated and nothing was published.

