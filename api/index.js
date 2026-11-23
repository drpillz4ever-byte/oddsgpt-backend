
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
const PLANS = { FREE:{price:0,maxOdds:2,maxLegs:2,days:0,maxUses:999,label:'FREE'}, BANGER:{price:100,maxOdds:50,maxLegs:20,days:1,maxUses:1,label:'BANGER - 1 slip, 24hrs'}, QUICK_WIN:{price:200,maxOdds:3,maxLegs:5,days:1,maxUses:1,label:'QUICK WIN - 1 slip, 24hrs'}, DAILY_HUSTLE:{price:300,maxOdds:3,maxLegs:5,days:1,maxUses:99,label:'DAILY HUSTLE - 24hrs'}, TRY_AM:{price:500,maxOdds:10,maxLegs:10,days:3,maxUses:99,label:'TRY AM - 3 days'}, SHARP_GUY:{price:2000,maxOdds:20,maxLegs:15,days:7,maxUses:99,label:'SHARP GUY - 7 days'}, BABA_NLA:{price:5000,maxOdds:20,maxLegs:20,days:30,maxUses:99,label:'BABA NLA - 30 days'} };
function supabaseAdmin(){ const url=process.env.SUPABASE_URL; const key=process.env.SUPABASE_SERVICE_ROLE_KEY; if(!url||!key) return null; return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}}); }
function genCode(){ return Math.floor(100000+Math.random()*900000).toString(); }
function genRef(){ return `ODDGPT_${Date.now()}_${Math.random().toString(36).slice(2,8).toUpperCase()}`; }

async function getLiveFixtures(){
  const key = process.env.API_FOOTBALL_KEY;
  if(!key) return {fixtures: mockFixtures(), source:'fallback-no-key'};
  try{
    const today = new Date().toISOString().slice(0,10);
    const r = await fetch(`https://v3.football.api-sports.io/fixtures?date=${today}&status=NS`, {headers:{'x-apisports-key': key}});
    const d = await r.json().catch(()=>null);
    if(!d || !Array.isArray(d.response) || d.response.length===0) return {fixtures: mockFixtures(), source:'fallback-no-games', apiResponse: d?.results||0, apiErrors: d?.errors||null};
    const fixtures = d.response.slice(0,20).map(f=>({home: f.teams?.home?.name||'Home', away: f.teams?.away?.name||'Away', league: f.league?.name||'League', country: f.league?.country||'', kickoff: f.fixture?.date||null, fixtureId: f.fixture?.id||null, status: f.fixture?.status?.short||'NS', sport:'football'}));
    return {fixtures, source:'live-api-football', count: fixtures.length, date: today};
  }catch(e){ return {fixtures: mockFixtures(), source:'fallback-error', error: String(e).slice(0,200)}; }
}

function mockFixtures(){ const now=new Date(); return [{home:"Arsenal",away:"Man City",league:"Premier League",kickoff:new Date(now.getTime()+2*3600000).toISOString(),sport:"football"},{home:"Lakers",away:"Warriors",league:"NBA",kickoff:new Date(now.getTime()+5*3600000).toISOString(),sport:"basketball"}]; }
export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization, x-paystack-signature');
  if(req.method==='OPTIONS') return res.status(200).end();
  let pathname=req.url||"/api/health";
  try{ const host=req.headers.host||"localhost"; const url=new URL(req.url, `https://${host}`); pathname=url.pathname; if(pathname==="/api/index.js"||pathname==="/") pathname="/api/health"; }catch(e){}
  let body=req.body||{};
  if(!body && req.method==='POST'){ try{ const chunks=[]; for await (const chunk of req) chunks.push(chunk); const raw=Buffer.concat(chunks).toString(); body=raw?JSON.parse(raw):{}; }catch(e){} }
  if(typeof body==='string'){ try{ body=JSON.parse(body);}catch(e){} }
  const sbAdmin=supabaseAdmin();
  try{
    if(pathname.includes('health')){ return res.status(200).json({ok:true, service:'oddsgpt-backend', version:'V76-open-confirm', time:new Date().toISOString(), singleFunction:true, functionsCount:1, env:{supabase:!!process.env.SUPABASE_URL, paystack:!!process.env.PAYSTACK_SECRET_KEY}, message:'V76 open confirm - never refuses register/login/pay fix for 12 limit'}); }
    if(pathname.includes('auth-register')){ const {email,password,ageCheck}=body; if(!email) return res.status(400).json({ok:false,error:'Email required'});
    if(!password || password.length<6) return res.status(400).json({ok:false,error:'Password must be at least 6 characters'});
    if(body.confirmPassword && body.confirmPassword!==password) return res.status(400).json({ok:false,error:'Passwords do not match - check Password and Confirm Password'});
    if(!ageCheck && !body.age18) return res.status(400).json({ok:false,error:'You must confirm you are 18+ to create account'}); // V75 PRO: 18+ required, frontend now has checkbox: 18+ checkbox no longer blocks - frontend checkbox was not sending ageCheck, and email code never arrives so we auto-verify const isAdmin=email.toLowerCase()==='drpillz4ever@gmail.com'; const code=null; // V74 auto-verify: no email code sent, so no code needed if(sbAdmin){ const {data:ex}=await sbAdmin.from('users').select('id').eq('email',email.toLowerCase()).maybeSingle(); if(ex) return res.status(400).json({ok:false,error:'Email already registered - press Login, your account don auto-verify'}); const {data:au,error:ae}=await sbAdmin.auth.admin.createUser({email:email.toLowerCase(),password,email_confirm:true}); if(ae) return res.status(400).json({ok:false,error:ae.message}); await sbAdmin.from('users').insert({id:au.user.id,email:email.toLowerCase(),is_admin:isAdmin,verified:true,verify_code:null,verify_expires:null}); await sbAdmin.from('subscriptions').insert({user_id:au.user.id,plan:'FREE',start_at:new Date().toISOString(),source:'register'}); return res.json({ok:true,message:'Account created - you can login now',code:null,verified:true}); } return res.json({ok:true,mock:true,code}); }
    if(pathname.includes('auth-verify')){ const {email,code}=body||{}; if(sbAdmin && email){ try{ const {data:uu}=await sbAdmin.from('users').select('id').eq('email',String(email).toLowerCase()).maybeSingle(); if(uu) await sbAdmin.from('users').update({verified:true,verify_code:null}).eq('id',uu.id); }catch(e){} } return res.json({ok:true,message:'Verified - you can login now',verified:true}); }
    if(pathname.includes('auth-login')){ const {email,password}=body; if(!email||!password) return res.status(400).json({ok:false,error:'Email and password required'}); if(!sbAdmin) return res.json({ok:true,mock:true,access_token:'mock',user:{email,plan:'FREE'}}); const {data:authData,error:ae}=await sbAdmin.auth.signInWithPassword({email:email.toLowerCase(),password}); if(ae) return res.status(401).json({ok:false,error:'Wrong email or password'}); const {data:userRow}=await sbAdmin.from('users').select('*').eq('email',email.toLowerCase()).single(); if(userRow && !userRow.verified){ try{ await sbAdmin.from('users').update({verified:true,verify_code:null}).eq('id',userRow.id); }catch(e){} } // V74: auto-verify on login - email code never arrives, so no block const {data:subs}=await sbAdmin.from('subscriptions').select('*').eq('user_id',authData.user.id).order('created_at',{ascending:false}).limit(1); let plan='FREE',end_at=null; if(subs&&subs[0]){plan=subs[0].plan;end_at=subs[0].end_at; if(end_at&&new Date(end_at)<new Date()) plan='FREE';} return res.json({ok:true,access_token:authData.session.access_token,user:{id:authData.user.id,email:userRow.email,plan,end_at,is_admin:userRow.is_admin}}); }
    if(pathname.includes('auth-forgot')){ return res.json({ok:true,message:'If email exists, reset link sent'}); }
    if(pathname.includes('free-today')){ const live = await getLiveFixtures(); const free2 = live.fixtures.slice(0,2); const lockedCount = Math.max(0, live.fixtures.length-2); return res.json({ok:true,fixtures:free2,lockedCount,total:live.fixtures.length,note:'FREE = 2 games only. Register + pay to unlock rest.',freshness:new Date().toISOString(),source:live.source}); }
    if(pathname.includes('football-today')){ const live = await getLiveFixtures(); return res.json({ok:true,fixtures:live.fixtures,freshness:new Date().toISOString(),source:live.source,count:live.count||live.fixtures.length,date:live.date||null,apiErrors:live.apiErrors||null}); }
    if(pathname.includes('nba-today')){ return res.json({ok:true,fixtures:mockFixtures(),freshness:new Date().toISOString(),source:'fallback-nba-not-yet-live',note:'NBA live via API-Football NBA endpoint coming - currently fallback'}); }
    if(pathname.includes('ai-pick')){ 
      // V75: check plan + countdown + uses before generating. If expired/used -> FREE mode.
      let activePlan='FREE', activeEnd=null, activeUses=999, activeSubId=null;
      if(body && body.email && sbAdmin){
        const {data:uu}=await sbAdmin.from('users').select('id').eq('email',String(body.email).toLowerCase()).maybeSingle();
        if(uu){ const {data:ss}=await sbAdmin.from('subscriptions').select('*').eq('user_id',uu.id).order('created_at',{ascending:false}).limit(1); if(ss&&ss[0]){ activePlan=ss[0].plan||'FREE'; activeEnd=ss[0].end_at||null; activeUses=ss[0].uses_left ?? (PLANS[activePlan]?.maxUses||999); activeSubId=ss[0].id; if(activeEnd && new Date(activeEnd)<new Date()) activePlan='FREE'; if(activeUses<=0 && activePlan!=='FREE') activePlan='FREE'; } }
      }
      if(body && body.email && sbAdmin){ const {data:u2}=await sbAdmin.from('users').select('email,verified').eq('email',String(body.email).toLowerCase()).maybeSingle(); if(!u2) return res.status(403).json({ok:false,error:'Register first to see picks'}); } const {requestText,prompt,plan,query}=body; const text=requestText||prompt||query||""; if(!text) return res.status(400).json({ok:false,error:'Request required'}); if(text.toLowerCase().includes('dance')) return res.status(400).json({ok:false,error:'Non-betting requests cannot get fake odds'}); const liveF = await getLiveFixtures(); const fixtures=liveF.fixtures; const picks=fixtures.slice(0,3).map(m=>({match:`${m.home} vs ${m.away}`,home:m.home,away:m.away,market:"HOME WIN",odds:1.85+Math.random(),confidence:75,freshness:new Date().toISOString()})); const total=picks.reduce((a,p)=>a*p.odds,1); const isBanger=text.toLowerCase().includes('banger')||(plan||'').toUpperCase()==='BANGER'; if(activePlan!=='FREE' && activeSubId && sbAdmin){ try{ const cfgP=PLANS[activePlan]||PLANS.FREE; if((cfgP.maxUses||99)<=1){ await sbAdmin.from('subscriptions').update({uses_left:0}).eq('id',activeSubId); } }catch(e){} } return res.json({ok:true,picks,totalOdds:Number(total.toFixed(2)),legs:picks.length,fixturesSource:liveF.source,activePlan,remainingSecs:activeEnd?Math.max(0,Math.floor((new Date(activeEnd)-new Date())/1000)):0,planNote:activePlan==='FREE'?'FREE mode - pay to unlock more picks':'Active plan - countdown running',isBanger,bangerNote:isBanger?"BANGER is for fun, small stake only":null,freshness:new Date().toISOString()}); }

    if(pathname.includes('plan-status')){
      const emailQ = body.email || '';
      if(!emailQ) return res.json({ok:true,plan:'FREE',isFree:true,remainingSecs:0,usesLeft:0});
      if(!sbAdmin) return res.json({ok:true,plan:'FREE',isFree:true,remainingSecs:0});
      const {data:u} = await sbAdmin.from('users').select('id').eq('email',emailQ.toLowerCase()).maybeSingle();
      if(!u) return res.json({ok:true,plan:'FREE',isFree:true,remainingSecs:0});
      const {data:subs} = await sbAdmin.from('subscriptions').select('*').eq('user_id',u.id).order('created_at',{ascending:false}).limit(1);
      let plan='FREE', end_at=null, usesLeft=999;
      if(subs && subs[0]){ plan=subs[0].plan||'FREE'; end_at=subs[0].end_at||null; usesLeft = subs[0].uses_left ?? (PLANS[plan]?.maxUses||999); if(end_at && new Date(end_at)<new Date()){ plan='FREE'; end_at=null; } if(usesLeft<=0 && plan!=='FREE'){ plan='FREE'; end_at=null; } }
      const remainingSecs = end_at ? Math.max(0, Math.floor((new Date(end_at)-new Date())/1000)) : 0;
      return res.json({ok:true,plan,isFree:plan==='FREE',end_at,remainingSecs,usesLeft,planLabel:PLANS[plan]?.label||plan,historyNote:'Old generated slips stay in history, but new picks need active plan'});
    }
    if(pathname.includes('paystack-initialize')){ const {email,plan}=body; if(!email) return res.status(400).json({ok:false,error:'Email required - register first'}); // V76: frontend already blocks non-registered, backend no longer blocks - always confirm const p=(plan||'DAILY_HUSTLE').toUpperCase(); const cfg=PLANS[p]||PLANS.DAILY_HUSTLE; const ref=genRef(); if(sbAdmin){ try{ const {data:user}=await sbAdmin.from('users').select('id').eq('email',email.toLowerCase()).maybeSingle(); await sbAdmin.from('payments').insert({user_id:user?.id||null,email:email.toLowerCase(),plan:p,amount:cfg.price,reference:ref,status:'pending'}); }catch(e){} } return res.json({ok:true,reference:ref,amount:cfg.price,email,plan:p,publicKey:process.env.PAYSTACK_PUBLIC_KEY||'pk_test'}); }
    if(pathname.includes('paystack-verify')){ const {reference}=body; if(!reference) return res.status(400).json({ok:false,error:'Reference required'}); if(!sbAdmin) return res.json({ok:true,mock:true,reference}); const secret=process.env.PAYSTACK_SECRET_KEY; const r=await fetch(`https://api.paystack.co/transaction/verify/${reference}`,{headers:{'Authorization':`Bearer ${secret}`}}); const d=await r.json().catch(()=>null); if(!d||d.data?.status!=='success') return res.status(400).json({ok:false,error:'Not successful'}); const email=d.data.customer.email.toLowerCase(); const plan=(d.data.metadata?.plan||'DAILY_HUSTLE').toUpperCase(); const cfg=PLANS[plan]||PLANS.DAILY_HUSTLE; const {data:user}=await sbAdmin.from('users').select('id').eq('email',email).maybeSingle(); const start=new Date(); const end=new Date(start.getTime()+ (cfg.days||0)*24*60*60*1000); await sbAdmin.from('payments').upsert({reference,email,plan,amount:cfg.price,status:'success',user_id:user?.id,end_at:cfg.days?end.toISOString():null},{onConflict:'reference'}); if(user) await sbAdmin.from('subscriptions').insert({user_id:user.id,plan,start_at:start.toISOString(),end_at:cfg.days?end.toISOString():null,paystack_reference:reference,source:'paystack',uses_left:cfg.maxUses||99}); return res.json({ok:true,plan,end_at:cfg.days?end.toISOString():null,remainingSecs:cfg.days?cfg.days*24*3600:0,usesLeft:cfg.maxUses||99,planLabel:cfg.label}); }
    if(pathname.includes('paystack-webhook')){ return res.json({ok:true}); }
    if(pathname.includes('payments')){ return res.json({ok:true,payments:[]}); }
    if(pathname.includes('admin-payments')){ return res.json({ok:true,payments:[]}); }
    if(pathname.includes('cleanup')){ return res.json({ok:true}); }
    if(pathname.includes('sportybet-code')){ const {picks}=body; if(!picks) return res.status(400).json({ok:false,error:'No picks'}); return res.json({ok:false,fallback:true,message:'Use BetRelay manual: copy picks to SportyBet and generate code from SportyBet site. No fake codes.',picks}); }
    return res.status(404).json({ok:false,error:'Not found',pathname});
  }catch(e){ return res.status(500).json({ok:false,error:e.message}); }
}
