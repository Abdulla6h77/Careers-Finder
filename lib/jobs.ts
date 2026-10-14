import { createHash } from 'node:crypto';
import { extractedSchema, type Extracted, type JobListing, type SearchInput } from './types';
export const sources=[{name:'Greenhouse',domains:['boards.greenhouse.io','job-boards.greenhouse.io']},{name:'Lever',domains:['jobs.lever.co']},{name:'Ashby',domains:['jobs.ashbyhq.com']}];
export function safeUrl(raw:string):string|null {try { const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.port||!sources.some(s=>s.domains.includes(u.hostname.toLowerCase())))return null;u.hash='';for(const k of [...u.searchParams.keys()])if(/^(utm_|ref$|source$|gh_src$)/i.test(k))u.searchParams.delete(k);u.searchParams.sort();u.pathname=u.pathname.replace(/\/$/,'');return u.toString();}catch{return null;}}
export function jobUrl(raw:string):string|null {const url=safeUrl(raw);if(!url)return null;const u=new URL(url);const segments=u.pathname.split('/').filter(Boolean);if(u.hostname==='jobs.lever.co'){u.pathname=u.pathname.replace(/\/apply$/,'');u.searchParams.delete('lever-source');}return (u.hostname.includes('greenhouse')? /\/jobs\/\d+/.test(u.pathname):segments.length>=2 && /^[a-z0-9-]{15,}$/i.test(segments[1]))?u.toString():null;}
const tokens=(s:string):string[]=>s.toLowerCase().match(/[a-z0-9]+/g)||[];
const norm=(s:string)=>tokens(s).join(' ');
const affirmativeVisa=/(?:we|company|employer) (?:can |will |do )?sponsor visas|sponsor(?:ship|ing)? (?:is )?(?:available|provided|offered)|(?:provide|offer|support|eligible for).*?(?:visa|sponsorship)|visa sponsorship available/i;
const negativeVisa=/(?:not|no|cannot|unable|without|don't|do not|does not|won't|will not).{0,60}(?:sponsor|visa)|(?:visa|sponsorship).{0,30}(?:not available|not provided|not offered)/i;
export function normalize(raw:unknown,source:string,verifiedUrl:string,text:string):JobListing|null {
 const p=extractedSchema.safeParse(raw);if(!p.success||!p.data.isOpen)return null;const j=p.data;const url=jobUrl(j.applicationUrl);if(!url||url!==jobUrl(verifiedUrl))return null;
 if(/(?:position|job|role) (?:is |has been )?(?:closed|filled)|no longer (?:accepting|available)/i.test(text))return null;
 // Evidence must be present verbatim on the page, and explicitly concern sponsorship.
 if(j.visa!=='unknown'&&(!j.visaEvidence||!norm(text).includes(norm(j.visaEvidence))||!/(visa|sponsor|immigration)/i.test(j.visaEvidence))) {j.visa='unknown';j.visaEvidence='';}
 if(j.visa==='supported'&&(!affirmativeVisa.test(j.visaEvidence)||negativeVisa.test(j.visaEvidence))){j.visa='unknown';j.visaEvidence='';}
 return {...j,applicationUrl:url,id:createHash('sha256').update(url).digest('hex').slice(0,16),source,provenance:[url],retrievedAt:new Date().toISOString(),score:0,explanation:[]};
}
export function rank(j:JobListing,q:SearchInput):JobListing|null {
 const title=tokens(j.title),role=tokens(q.role).filter(t=>!['and','the'].includes(t));const overlap=role.filter(t=>title.includes(t)).length/Math.max(role.length,1);if(overlap<0.5||role.some(t=>!tokens(j.title+' '+j.description).includes(t)))return null;
 const location=norm(j.location).includes(norm(q.location));if(!location||(/remote/i.test(q.location)&&/not remote|no remote|on.?site only/i.test(j.location)))return null;
 const intern=/intern|internship/i.test(j.jobType+' '+j.title);if((q.kind==='internship')!==intern)return null;
 if(q.visa==='required'&&j.visa!=='supported')return null;
 let score=Math.round(overlap*45)+25;const explanation=[`${Math.round(overlap*100)}% role term match in title`,`Location matches ${q.location}`];
 const keywords=tokens(q.keywords);if(keywords.length){const matched=keywords.filter(t=>tokens(j.title+' '+j.description).includes(t));score+=Math.round(matched.length/keywords.length*15);explanation.push(`Keywords: ${matched.length}/${keywords.length} matched`);}else score+=15;
 if(q.seniority==='any'){score+=10;}else if(j.seniority===q.seniority){score+=10;explanation.push(`${q.seniority} seniority verified`);}else if(j.seniority!=='unknown'){return null;}else explanation.push('Seniority not specified; ranked lower');
 if(j.visa==='supported')score+=5;explanation.push(j.visa==='unknown'?'Visa sponsorship unverified':`Visa: ${j.visa}`);return {...j,score,explanation};
}
export function deduplicate(jobs:JobListing[]){const result:JobListing[]=[];for(const job of jobs){const existing=result.find(j=>j.applicationUrl===job.applicationUrl||norm(j.company+' '+j.title+' '+j.location)===norm(job.company+' '+job.title+' '+job.location));if(existing){existing.provenance=[...new Set([...existing.provenance,...job.provenance])];existing.source=[...new Set([...existing.source.split(', '),job.source])].join(', ');}else result.push(job);}return {jobs:result,duplicatesRemoved:jobs.length-result.length};}
export function extractPage(text:string,url:string,title:string):Extracted|null {
 // Parse visible ATS headings only. Ambiguous identity or location requires Agent.
 const lines=text.split('\n').map(l=>l.trim()).filter(Boolean);const heading=lines.find(l=>/^#\s+/.test(l))?.replace(/^#+\s+/,'')||title.split(/\s[|–]\s/)[0];
 const host=new URL(url).hostname;
 const pageHeading=lines.find(l=>/^#{1,2}\s+/.test(l))?.replace(/^#+\s+/,'').replace(/\*\*/g,'')||heading;
 const leverCompany=host==='jobs.lever.co'?title.match(/^(.+?) - /)?.[1]:undefined;
 const aboutCompany=host==='jobs.ashbyhq.com'?lines.find(l=>/^#{1,2}\s+(?:\*\*)?About (?!the |you|this |us\b|role\b)/i.test(l))?.replace(/^#+\s+(?:\*\*)?About /i,'').replace(/\*\*/g,''):undefined;
 const company=leverCompany||aboutCompany||title.match(/\bat\s+(.+?)(?:\s[|–]|$)/i)?.[1]||lines.find(l=>/^Company:\s*/i.test(l))?.replace(/^Company:\s*/i,'');
 const field=(name:string)=>{const i=lines.findIndex(l=>l.toLowerCase()===`## ${name.toLowerCase()}`);return i>=0&&!/^#/.test(lines[i+1]||'')?lines[i+1]:undefined;};
 const headingIndex=lines.findIndex(l=>l.replace(/^#+\s+/,'').replace(/\*\*/g,'')===pageHeading);
 const leverLocation=host==='jobs.lever.co'&&headingIndex>=0?lines[headingIndex+1]:undefined;
 const location=lines.find(l=>/^Location:\s*/i.test(l))?.replace(/^Location:\s*/i,'')||field('Location')||leverLocation;
 if(!pageHeading||!company||!location||/^#/.test(location)||!/(apply|application)/i.test(text))return null;
 const levels=[/junior|entry.level|new grad/i.test(pageHeading)?'junior':null,/mid.level|\bmid\b/i.test(pageHeading)?'mid':null,/senior|\bstaff\b|principal/i.test(pageHeading)?'senior':null].filter(Boolean);
 const leverMetadata=host==='jobs.lever.co'&&headingIndex>=0?lines.slice(headingIndex+1,lines.findIndex((l,i)=>i>headingIndex&&/apply for this job/i.test(l))):[];
 const leverKind=leverMetadata.find(l=>/^(full.time|part.time|contract|temporary|employee)/i.test(l))?.replace(/\s*\/$/,'');
 const roleKind=/intern/i.test(pageHeading)?'Internship':field('Employment Type')||leverKind||'Job';
 const locationType=field('Location Type')||(leverMetadata.includes('Remote')?'Remote':undefined);
 const visaEvidence=lines.find(l=>l.length<=600&&/visa|sponsor/i.test(l)&&(affirmativeVisa.test(l)||negativeVisa.test(l)))||'';
 const visa=visaEvidence?(negativeVisa.test(visaEvidence)?'not-supported':'supported'):'unknown';
 return {title:pageHeading,company,location:locationType==='Remote'?`${location} · Remote`:location,jobType:roleKind,seniority:levels.length===1?levels[0] as Extracted['seniority']:'unknown',visa,visaEvidence,description:lines.filter(l=>!/^#/.test(l)&&l.length>80&&!/voluntary|disabilit|veteran|confidential/i.test(l)).slice(0,3).join(' ').slice(0,700),applicationUrl:url,isOpen:true};
}

