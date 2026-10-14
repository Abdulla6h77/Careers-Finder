# JobHunt AI — TinyFish Careers Finder

**Repository:** pending approved publication  
**Working demo:** pending approved deployment  
**Demo video:** pending recording

JobHunt AI finds live career opportunities using configurable role, location, keywords, seniority, visa sponsorship and job/internship preferences. It searches Greenhouse, Lever and Ashby, reads individual postings, extracts dynamic details where needed, and returns structured listings with direct apply links, timestamps, match scores and explanations. Canonical URLs and normalized company/title/location merge duplicates while preserving source provenance. Unknown visa or remote eligibility is never presented as verified.

Three distinct TinyFish capabilities contribute real work:

- **Search — GET `https://api.search.tinyfish.ai`:** discovers relevant posting URLs on supported domains for the user's query. London product-role discovery found Electric Twin and Apollo Research.
- **Fetch — POST `https://api.fetch.tinyfish.ai`:** reads discovered pages live with ttl=0 and scoped body content; validates destinations and supplies title/location/employment/application evidence. Electric Twin's Lever and Ashby copies were merged into one result with both sources retained.
- **Agent — POST `https://agent.tinyfish.ai/v1/automation/run`:** inspects ambiguous/dynamic postings with a structured-output schema when page parsing is insufficient. The remote-internship test used browser extraction for Sezzle's Product Data Intern, preserving its Colombia/Remote location and unverified visa status. Straightforward complete pages skip Agent rather than adding redundant calls.

Executed live cases on October 14, 2026 returned two remote internships, two London product opportunities and three London software-engineer opportunities; the no-match case returned zero. Karachi junior had no verified supported-source match. Automated checks cover normalization, ranking, duplicates, partial failure, unknown visa, URL safety, request limits and safe errors. See VERIFICATION.md for precise evidence and current test counts. Account-specific traces are retained privately and excluded from publication.

The implementation was created in this workspace, with no pre-existing application. This bounty requires individual original work; the entrant must confirm authorship and compliance with any AI-assistance/disclosure rules before submitting. No third-party job data is fabricated. Secrets stay server-side.

Limitations: discovery is capped at two postings per platform, sources can fail/redirect, Agent can time out, and remote geography does not imply worldwide eligibility. Unknown seniority receives a ranking penalty. Opening a listing does not guarantee an employer will accept an application. Endpoint scoring is for the organizers to assess from actual Search/Fetch/Agent contributions, not from feature or source counts.
