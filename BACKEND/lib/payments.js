
// Payments store — In-memory fallback + Supabase schema in schema.sql
// In Vercel serverless, use Supabase for persistence. This file is helpers + in-memory for local test.
export const store = globalThis.__oddsgpt_payments || (globalThis.__oddsgpt_payments = new Map());
export function makeRef(userId){return "OGPT_"+(userId||"USER").toString().replace(/[^A-Za-z0-9]/g,"").slice(0,12).toUpperCase()+"_"+Date.now()+"_"+Math.random().toString(36).slice(2,7).toUpperCase()}
export const PLAN_PRICES={FREE:0,BANGER:10000,QUICK:20000,DAILY:30000,TRYAM:50000,SHARP:200000,BABA:500000};
export const PLAN_DAYS={FREE:0,BANGER:0,QUICK:0,DAILY:1,TRYAM:3,SHARP:7,BABA:30};
export function planExpiry(plan,from=new Date()){const d=PLAN_DAYS[plan]||0; if(!d) return new Date(from.getTime()+24*3600*1000); return new Date(from.getTime()+d*24*3600*1000)}
