import { z } from 'zod';
export const searchSchema = z.object({role:z.string().trim().min(2).max(100),location:z.string().trim().min(2).max(100),keywords:z.string().trim().max(200).default(''),seniority:z.enum(['any','junior','mid','senior']).default('any'),visa:z.enum(['any','required']).default('any'),kind:z.enum(['job','internship']).default('job')}).strict();
export type SearchInput=z.infer<typeof searchSchema>;
export const extractedSchema=z.object({title:z.string().min(2).max(200),company:z.string().min(1).max(150),location:z.string().max(200),jobType:z.string().max(100),seniority:z.enum(['junior','mid','senior','unknown']),visa:z.enum(['supported','not-supported','unknown']),visaEvidence:z.string().max(600),description:z.string().max(1500),applicationUrl:z.string(),isOpen:z.boolean()});
export type Extracted=z.infer<typeof extractedSchema>;
export type JobListing=Extracted & {id:string;source:string;provenance:string[];retrievedAt:string;score:number;explanation:string[]};
export type Diagnostic={source:string;stage:'search'|'fetch'|'agent';status:'success'|'failed'|'empty'|'skipped';message:string;durationMs:number;endpoint:string};
export type SearchResponse={jobs:JobListing[];diagnostics:Diagnostic[];retrievedAt:string;duplicatesRemoved:number;message?:string};
