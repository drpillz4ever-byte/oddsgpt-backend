// OddsGPT Backend AUTH PROXY - api/index.js
// Frontend calls THIS backend, backend calls Supabase - bypasses ISP blocking supabase.co
// Set in Vercel Env Vars: SUPABASE_URL, SUPABASE_SERVICE_KEY (service_role, secret - never put in frontend)
const SUPABASE_URL = process.env.SUPABASE_URL || "https://hsbqkvrvdjpexgsqgsh.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
  if(req.method==='OPTIONS') return res.status(200).end();
  const {pathname} = new URL(req.url, 'http://localhost');
  if(pathname==='/api/health') return res.status(200).json({ok:true, version:'V86-AUTH-PROXY'});
  if(pathname==='/api/auth/signup' && req.method==='POST'){
    try{
      const {email,password} = req.body||{};
      if(!email||!password) return res.status(400).json({error:'email + password required'});
      // Use Supabase Admin API via backend (service key)
      const r = await fetch(SUPABASE_URL+'/auth/v1/admin/users', {method:'POST', headers:{'apikey':SERVICE_KEY,'Authorization':'Bearer '+SERVICE_KEY,'Content-Type':'application/json'}, body: JSON.stringify({email,password,email_confirm:true,user_metadata:{}} )});
      const j = await r.json();
      if(!r.ok) return res.status(r.status).json({error:j.msg||j.message||'signup failed', detail:j});
      return res.status(200).json({ok:true, user:j});
    }catch(e){ return res.status(500).json({error:'Failed to fetch Supabase from backend: '+e.message}); }
  }
  if(pathname==='/api/auth/login' && req.method==='POST'){
    try{
      const {email,password} = req.body||{};
      // Use password grant via backend (uses anon publishable key - safe to expose via backend env)
      const ANON = process.env.SUPABASE_ANON_KEY || "sb_publishable_f7FMboSQ_y-7JxvmuIqwVQ_Y9sBBLLp";
      const r = await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=password', {method:'POST', headers:{'apikey':ANON,'Content-Type':'application/json'}, body: JSON.stringify({email,password})});
      const j = await r.json();
      if(!r.ok) return res.status(r.status).json({error:j.error_description||j.msg||'login failed'});
      return res.status(200).json({ok:true, session:j});
    }catch(e){ return res.status(500).json({error:e.message}); }
  }
  if(pathname==='/api/auth/reset' && req.method==='POST'){
    try{
      const {email} = req.body||{};
      const ANON = process.env.SUPABASE_ANON_KEY || "sb_publishable_f7FMboSQ_y-7JxvmuIqwVQ_Y9sBBLLp";
      const r = await fetch(SUPABASE_URL+'/auth/v1/recover', {method:'POST', headers:{'apikey':ANON,'Content-Type':'application/json'}, body: JSON.stringify({email})});
      if(!r.ok){ const j=await r.json(); return res.status(r.status).json({error:j.msg||'reset failed'}); }
      return res.status(200).json({ok:true});
    }catch(e){ return res.status(500).json({error:e.message}); }
  }
  return res.status(404).json({error:'not found '+pathname});
}
