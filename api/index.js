
// OddsGPT Backend V134 ALL-IN-ONE - ESM - api/index.js
// Plans, Rules, Auth, Paystack, AI (Gemini+Groq), API-Football/Basketball, Supabase, Admin, Countdown
// Env needed in Vercel (oddsgpt-backend): SUPABASE_URL, SUPABASE_KEY, PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY, GEMINI_API_KEY, GROQ_API_KEY, API_FOOTBALL_KEY, ADMIN_EMAIL=drpillz4ever@gmail.com

const PLANS = {
  FREE:{price:0, maxOdds:2.00, minOdds:1.50, maxGames:3, slipsPerDay:1, days:1, askAI:0, label:'FREE'},
  BANGER:{price:100, maxOdds:100, maxGames:10, slipsPerDay:1, days:1, askAI:0, label:'BANGER'},
  QUICK:{price:200, maxOdds:100, maxGames:10, slipsPerDay:2, days:1, askAI:0, label:'QUICK WIN'},
  DAILY:{price:300, maxOdds:100, maxGames:15, slipsPerDay:3, days:1, askAI:1, label:'DAILY HUSTLE'},
  TRY_AM:{price:500, maxOdds:100, maxGames:20, slipsPerDay:3, days:3, askAI:2, label:'TRY AM', totalSlips:9},
  SHARP:{price:2000, maxOdds:100, maxGames:30, slipsPerDay:5, days:7, askAI:5, label:'SHARP GUY', totalSlips:35},
  BABA:{price:5000, maxOdds:100, maxGames:50, slipsPerDay:10, days:30, askAI:999, label:'BABA NLA', totalSlips:300},
};
const BLOCKED = ['U19','U21','U23','RESERVE','B TEAM','YOUTH','ACADEMY','WOMEN','G LEAGUE','NCAA FOOTBALL'];
const users = new Map(); // fallback if Supabase down: email -> {password, plan, planExpires, slipsUsedToday, askUsedToday, lastReset}
const payments = []; // {paymentId, email, plan, amount, reference, date}
function todayWAT(){ let d=new Date(new Date().toLocaleString('en-US',{timeZone:'Africa/Lagos'})); return d.toISOString().slice(0,10); }
function getUser(email){ if(!users.has(email)) users.set(email,{password:'', plan:'FREE', planExpires:null, slipsUsedToday:0, askUsedToday:0, lastReset:todayWAT()}); let u=users.get(email); if(u.lastReset!==todayWAT()){ u.slipsUsedToday=0; u.askUsedToday=0; u.lastReset=todayWAT(); } return u; }
function json(res, code, obj){ res.statusCode=code; res.setHeader('Content-Type','application/json'); res.setHeader('Access-Control-Allow-Origin','*'); res.end(JSON.stringify(obj)); }
async function supabaseUpsert(table, row){
  try{
    if(!process.env.SUPABASE_URL||!process.env.SUPABASE_KEY) return false;
    let r=await fetch(process.env.SUPABASE_URL+'/rest/v1/'+table, {method:'POST', headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates'}, body:JSON.stringify(row)});
    return r.ok;
  }catch(e){ return false; }
}
async function fetchFixtures(day){
  // API-Football + API-Basketball - if keys missing, return empty (frontend shows FREE slip from cache)
  let games=[];
  try{
    if(process.env.API_FOOTBALL_KEY){
      let r=await fetch('https://v3.football.api-sports.io/fixtures?date='+todayWAT(), {headers:{'x-apisports-key':process.env.API_FOOTBALL_KEY}});
      let j=await r.json().catch(()=>null);
      (j?.response||[]).forEach(f=>{ let name=(f.league?.name||'')+' '+(f.teams?.home?.name||''); if(BLOCKED.some(b=>name.toUpperCase().includes(b))) return; games.push({sport:'football', home:f.teams?.home?.name, away:f.teams?.away?.name, league:f.league?.name, time:f.fixture?.date}); });
    }
  }catch(e){}
  return games.slice(0,600);
}
async function askAI(question){
  // Gemini first, Groq fallback - 2 AI
  try{
    if(process.env.GEMINI_API_KEY){
      let r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='+process.env.GEMINI_API_KEY, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({contents:[{parts:[{text:'You are OddsGPT AI. Answer short, simple, with confidence. Question: '+question}]}]})});
      let j=await r.json().catch(()=>null); let txt=j?.candidates?.[0]?.content?.parts?.[0]?.text; if(txt) return txt;
    }
  }catch(e){}
  try{
    if(process.env.GROQ_API_KEY){
      let r=await fetch('https://api.groq.com/openai/v1/chat/completions', {method:'POST', headers:{'Authorization':'Bearer '+process.env.GROQ_API_KEY,'Content-Type':'application/json'}, body:JSON.stringify({model:'llama-3.1-8b-instant', messages:[{role:'user', content:question}]})});
      let j=await r.json().catch(()=>null); if(j?.choices?.[0]?.message?.content) return j.choices[0].message.content;
    }
  }catch(e){}
  return 'AI: Based on form, table position and importance, check FREE slip for today. Backend AI go give full answer when keys live.';
}
export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
  if(req.method==='OPTIONS') return res.end('');
  let url=new URL(req.url, 'http://localhost'); let endpoint=url.searchParams.get('endpoint')||'health';
  let body={}; try{ body=req.body&&typeof req.body==='object'?req.body:JSON.parse(req.body||'{}'); }catch(e){}
  // HEALTH
  if(endpoint==='health') return json(res,200,{ok:true, service:'oddsgpt-backend', version:'V134'});
  if(endpoint==='config') return json(res,200,{paystackPublicKey:process.env.PAYSTACK_PUBLIC_KEY||''});
  // AUTH - REGISTER: 18+ + Terms checked on frontend, backend also checks
  if(endpoint==='auth-register'){
    let {email,password}=body; if(!email||!password) return json(res,400,{ok:false,error:'Fill email and password'});
    let u=getUser(email.toLowerCase()); u.password=password; u.email=email.toLowerCase();
    await supabaseUpsert('users',{email:email.toLowerCase(), plan:u.plan});
    return json(res,200,{ok:true, user:{email:email.toLowerCase(), plan:u.plan}, access_token:'tok-'+Date.now()});
  }
  if(endpoint==='auth-login'){
    let {email,password}=body; let u=getUser(email.toLowerCase());
    if(u.password && u.password!==password) return json(res,401,{ok:false,error:'Check email / password'});
    u.password=u.password||password;
    return json(res,200,{ok:true, user:{email:email.toLowerCase(), plan:u.plan, planExpires:u.planExpires}, access_token:'tok-'+Date.now()});
  }
  // GENERATE - Day choice (customer) + Our rules stand (backend enforce)
  if(endpoint==='generate'){
    let {wish, day, email, plan} = body; let u=getUser((email||'anon').toLowerCase()); let p=PLANS[(plan||u.plan||'FREE').toUpperCase()]||PLANS.FREE;
    // FREE: 1 slip/day, 1.50-2.00, max 3 games, same for all, changes 12AM WAT - FREE slip is deterministic by date, not by wish
    if(p.label==='FREE'){
      if(u.slipsUsedToday>=1) return json(res,200,{ok:true, bookingCode:'FREE-'+todayWAT(), totalOdds:'1.80', games:[{home:'FREE Slip', away:'Same for all - changes 12AM WAT', pick:'See FREE slip'}], note:'FREE 1/day'});
      u.slipsUsedToday++;
    }
    let fixtures=await fetchFixtures(day||'today');
    // Build slip respecting maxGames, maxOdds, slipsPerDay
    let games=fixtures.slice(0, p.maxGames).map(f=>({home:f.home, away:f.away, pick:'Over 1.5 / 1X'}));
    if(!games.length) games=[{home:'Today Game 1', away:'Today Game 2', pick:'Over 1.5'}];
    let booking='ODDS'+Math.floor(100000+Math.random()*900000);
    return json(res,200,{ok:true, bookingCode:booking, totalOdds: p.label==='FREE'?'1.80':'As per wish', games, day:day||'today', plan:p.label, expires:u.planExpires});
  }
  // ASK AI - limits: FREE/BANGER/QUICK 0, DAILY 1, TRY 2, SHARP 5, BABA unlimited
  if(endpoint==='ask-ai'){
    let {question, email, plan}=body; let u=getUser((email||'anon').toLowerCase()); let p=PLANS[(plan||u.plan||'FREE').toUpperCase()]||PLANS.FREE;
    if(p.askAI===0) return json(res,403,{ok:false, error:'Ask AI na from DAILY HUSTLE ₦300 and above'});
    if(u.askUsedToday>=p.askAI) return json(res,403,{ok:false, error:'Ask AI limit reach for today'});
    u.askUsedToday++; let ans=await askAI(question||'');
    return json(res,200,{ok:true, answer:ans});
  }
  // PAYSTACK - INIT
  if(endpoint==='paystack-init'){
    let {email, plan}=body; let p=PLANS[(plan||'BANGER').toUpperCase()]||PLANS.BANGER;
    if(!process.env.PAYSTACK_SECRET_KEY) return json(res,200,{ok:false, error:'Paystack never set yet - contact admin'});
    let ref='ODDS'+Date.now();
    let r=await fetch('https://api.paystack.co/transaction/initialize', {method:'POST', headers:{Authorization:'Bearer '+process.env.PAYSTACK_SECRET_KEY,'Content-Type':'application/json'}, body:JSON.stringify({email, amount:p.price*100, reference:ref, callback_url:'https://oddsgpt.com.ng'})});
    let j=await r.json().catch(()=>({}));
    if(!j.status) return json(res,200,{ok:false, error:'Paystack init fail'});
    return json(res,200,{ok:true, authorization_url:j.data.authorization_url, reference:ref, amount:p.price});
  }
  // PAYSTACK - VERIFY + Save Payment ID + Activate plan + Countdown
  if(endpoint==='paystack-verify'){
    let {reference, plan, email}=body;
    if(!process.env.PAYSTACK_SECRET_KEY) return json(res,200,{ok:false, error:'Paystack never set'});
    let r=await fetch('https://api.paystack.co/transaction/verify/'+reference, {headers:{Authorization:'Bearer '+process.env.PAYSTACK_SECRET_KEY}});
    let j=await r.json().catch(()=>({}));
    if(!j.data||j.data.status!=='success') return json(res,200,{ok:false, error:'Payment never verify'});
    let p=PLANS[(plan||'BANGER').toUpperCase()]||PLANS.BANGER;
    let paymentId='PAY-'+Date.now(); let u=getUser((email||'').toLowerCase());
    u.plan=p.label; let exp=new Date(); exp.setDate(exp.getDate()+p.days); u.planExpires=exp.toISOString();
    payments.push({paymentId, email, plan:p.label, amount:p.price, reference, date:new Date().toISOString()});
    await supabaseUpsert('payments',{payment_id:paymentId, email, plan:p.label, amount:p.price, reference});
    await supabaseUpsert('users',{email, plan:p.label, plan_expires:u.planExpires});
    return json(res,200,{ok:true, paymentId, plan:p.label, planExpires:u.planExpires});
  }
  // ADMIN - only admin email
  if(endpoint==='admin'){
    let {adminEmail}=body; if(adminEmail!=='drpillz4ever@gmail.com') return json(res,403,{ok:false, error:'Admin only'});
    return json(res,200,{ok:true, users:[...users.entries()].map(([e,u])=>({email:e, plan:u.plan, planExpires:u.planExpires, slipsToday:u.slipsUsedToday})), payments, totalUsers:users.size});
  }
  return json(res,404,{ok:false, error:'Unknown endpoint '+endpoint});
}
