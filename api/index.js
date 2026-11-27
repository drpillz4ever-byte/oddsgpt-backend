// OddsGPT Backend V169 - REAL games + REAL prediction - Deploy as api/index.js in oddsgpt-backend repo
// Env in Vercel: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY, API_FOOTBALL_KEY, API_BASKETBALL_KEY, ADMIN_EMAILS
const PLANS = {
  FREE:{price:0,days:365,max:3,perDay:1},
  BANGER:{price:100,days:1,max:10,perDay:1},
  QUICK:{price:200,days:1,max:10,perDay:2},
  DAILY:{price:300,days:1,max:15,perDay:3},
  TRY_AM:{price:500,days:3,max:20,perDay:3,total:9},
  SHARP:{price:2000,days:7,max:30,perDay:5,total:35},
  BABA:{price:5000,days:30,max:50,perDay:10,total:300},
};
function cors(res){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');}
function watToday(){try{const p=new Intl.DateTimeFormat('en-NG',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Africa/Lagos'}).formatToParts(new Date());return p.find(x=>x.type==='year').value+'-'+p.find(x=>x.type==='month').value+'-'+p.find(x=>x.type==='day').value;}catch(e){const n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');}}
async function getUser(req){const auth=req.headers.authorization||'';const token=auth.replace('Bearer ','');if(!token)return null;try{const r=await fetch(process.env.SUPABASE_URL+'/auth/v1/user',{headers:{apikey:process.env.SUPABASE_ANON_KEY,Authorization:'Bearer '+token}});if(!r.ok)return null;return await r.json();}catch(e){return null;}}
// REAL fixtures from API-Football - NO fake games, NO invented stats
// --- V169: DAILY CACHED FREE SLIP - same for everyone, changes only 12AM WAT ---
async function supaGet(path){
  if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try{const r=await fetch(process.env.SUPABASE_URL+'/rest/v1/'+path,{headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY}}); if(!r.ok) return null; return await r.json();}catch(e){return null;}
}
async function supaPost(path, body){
  if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try{const r=await fetch(process.env.SUPABASE_URL+'/rest/v1/'+path,{method:'POST',headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(body)}); if(!r.ok) return null; return await r.json();}catch(e){return null;}
}
function hashStr(s){let h=0; for(let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i); h|=0;} return Math.abs(h);}
// V169: NEVER-EMPTY. Bulk odds (1 call) + generation lock + real AI cross-check + last-slip fallback
let __genLock = null;
let __memCache = {date:'', games:null, combined:'-', at:0};
async function aiCrossCheck(cands, today){
  // Real AI cross-check: Gemini first, then Groq, then OpenAI. 8s timeout. If all fail -> rule engine only, never block.
  const prompt = 'You are a cautious sports analyst. From these real fixtures with real bookmaker odds, pick the 3 SAFEST picks whose combined odds is between 1.50 and 2.00. Prefer Double Chance, Over 0.5/1.5, and strong favourites. Return ONLY JSON: {"picks":[index numbers]}. Candidates: ' + JSON.stringify(cands.slice(0,24).map((c,i)=>({i,home:c.home,away:c.away,league:c.league,market:c.market,pick:c.pick,odd:c.odd})));
  const tryFetch = async (url, headers, body) => {
    const ctrl = new AbortController(); const tm = setTimeout(()=>ctrl.abort(), 8000);
    try{ const r = await fetch(url, {method:'POST', headers, body: JSON.stringify(body), signal: ctrl.signal}); return await r.json(); }catch(e){ return null; } finally{ clearTimeout(tm); }
  };
  try{
    if(process.env.GEMINI_API_KEY){
      const d = await tryFetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='+process.env.GEMINI_API_KEY, {'Content-Type':'application/json'}, {contents:[{parts:[{text:prompt}]}]});
      const txt = d?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const m = txt.match(/\{[\s\S]*\}/); if(m){ const j = JSON.parse(m[0]); if(Array.isArray(j.picks) && j.picks.length) return j.picks; }
    }
    if(process.env.GROQ_API_KEY){
      const d = await tryFetch('https://api.groq.com/openai/v1/chat/completions', {Authorization:'Bearer '+process.env.GROQ_API_KEY,'Content-Type':'application/json'}, {model:'llama-3.1-8b-instant', messages:[{role:'user', content:prompt}], temperature:0.2});
      const txt = d?.choices?.[0]?.message?.content || ''; const m = txt.match(/\{[\s\S]*\}/); if(m){ const j = JSON.parse(m[0]); if(Array.isArray(j.picks) && j.picks.length) return j.picks; }
    }
    if(process.env.OPENAI_API_KEY){
      const d = await tryFetch('https://api.openai.com/v1/chat/completions', {Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'}, {model:'gpt-4o-mini', messages:[{role:'user', content:prompt}], temperature:0.2});
      const txt = d?.choices?.[0]?.message?.content || ''; const m = txt.match(/\{[\s\S]*\}/); if(m){ const j = JSON.parse(m[0]); if(Array.isArray(j.picks) && j.picks.length) return j.picks; }
    }
  }catch(e){}
  return null;
}
async function fetchRealFreeGames(force){
  const key=process.env.API_FOOTBALL_KEY;
  const bkey=process.env.API_BASKETBALL_KEY||key;
  const today=watToday();
  // 0) MEMORY cache: instant, no API call (skip if force = generate-now)
  if(!force && __memCache.date===today && __memCache.games && __memCache.games.length) return {ok:true,date:today,serverDate:today,serverNow:new Date().toISOString(),serverTimeMs:Date.now(),games:__memCache.games,combined:__memCache.combined,plan:'FREE',cached:true,source:'memory'};
  // 1) SUPABASE cache: same slip for everyone (skip if force)
  const cached=!force ? await supaGet('daily_slips?date=eq.'+today+'&select=*&limit=1') : null;
  if(cached && cached.length && cached[0].games){
    try{const g=typeof cached[0].games==='string'?JSON.parse(cached[0].games):cached[0].games; if(g && g.length){ __memCache={date:today,games:g,combined:cached[0].combined||'-',at:Date.now()}; return {ok:true,date:today,serverDate:today,serverNow:new Date().toISOString(),serverTimeMs:Date.now(),games:g,combined:cached[0].combined||'-',plan:'FREE',cached:true,source:'supabase'};}}catch(e){}
  }
  // 2) LOCK: if another visitor already generating, wait for it instead of burning API quota (this was killing the quota)
  if(__genLock) { try{ const r = await __genLock; if(r && r.games && r.games.length) return r; }catch(e){} }
  __genLock = (async()=>{
  const BLOCKED=[' II',' III','U19','U21','U23','RESERVE','YOUTH','WOMEN','ACADEMY','G LEAGUE'];
  function blocked(name){const n=(' '+(name||'').toUpperCase());return BLOCKED.some(x=>n.includes(x));}
  function cleanLeague(league, fallback){ if(!league) return fallback; const name=league.name||''; const country=league.country||''; if(!name) return fallback; if(!country||country==='undefined'||country==='null') return name; return name+' • '+country; }
  function cleanMarket(market, pick){ if(market==='Over/Under'||/Over\/Under/i.test(market)) return pick; if(market==='Goals Over/Under') return pick+' Goals'; return market; }
  let candidates=[]; let allFixtures=[]; let apiErrors=[];
  // FOOTBALL fixtures - timezone Africa/Lagos so WAT day matches site day
  let fxList=[];
  for(const date of [today]){ try{ const r=await fetch('https://v3.football.api-sports.io/fixtures?date='+date+'&timezone=Africa%2FLagos',{headers:{'x-apisports-key':key}}); const fx=await r.json(); if(fx.errors && Object.keys(fx.errors).length) apiErrors.push('football-fixtures:'+JSON.stringify(fx.errors)); fxList = fx.response||[]; }catch(e){ apiErrors.push('football-fixtures:'+e.message); } }
  const flist = fxList.filter(f=>f.teams&&f.teams.home&&!blocked(f.league?.name)).slice(0,40);
  for(const f of flist){ allFixtures.push({sport:'Football',home:f.teams.home.name,away:f.teams.away.name,league:cleanLeague(f.league,'Football'),kickoff:new Date(f.fixture.date).toLocaleString('en-NG',{timeZone:'Africa/Lagos',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}),fixtureId:'F'+f.fixture.id,raw:f}); }
  // BULK ODDS: 1 call for the whole day, not 8 calls (old code burned 100/day quota by 10am)
  try{
    const r=await fetch('https://v3.football.api-sports.io/odds?date='+today+'&timezone=Africa%2FLagos',{headers:{'x-apisports-key':key}});
    const oData=await r.json(); if(oData.errors && Object.keys(oData.errors).length) apiErrors.push('football-odds:'+JSON.stringify(oData.errors));
    const byFixture={}; for(const o of (oData.response||[])){ byFixture[o.fixture?.id]=o; }
    for(const item of allFixtures.slice(0,30)){
      const o = byFixture[item.raw.fixture.id]; if(!o) continue; const bms=o.bookmakers||[]; if(!bms.length) continue; const bm=bms[0]; const bets=bm.bets||[];
      const base={sport:'Football',home:item.home,away:item.away,league:item.league,kickoff:item.kickoff,fixtureId:item.fixtureId};
      const add=(pick,odd,market,reason)=>{ const oo=parseFloat(odd); if(isNaN(oo)||oo<1.05||oo>2.50) return; candidates.push({...base,market:cleanMarket(market,pick),pick,odd:oo,reason:reason+' ('+bm.name+').'}); };
      const dc=bets.find(x=>x.name==='Double Chance'); if(dc) for(const v of dc.values) add(v.value,v.odd,'Double Chance','Real fixture + real bookmaker odd. Double Chance');
      const ou=bets.find(x=>x.name==='Goals Over/Under'); if(ou) for(const v of ou.values){ if(['Over 0.5','Over 1.5','Over 2.5','Under 2.5','Under 3.5'].includes(v.value)) add(v.value,v.odd,'Goals Over/Under','Real fixture + real bookmaker odd.'); }
      const btts=bets.find(x=>/Both Teams|BTTS/i.test(x.name)); if(btts) for(const v of btts.values) add(v.value,v.odd,'Both Teams To Score','Real fixture + real bookmaker odd. BTTS');
      const mw=bets.find(x=>x.name==='Match Winner'); if(mw) for(const v of mw.values) add(v.value,v.odd,'1X2','Real fixture + real bookmaker odd. 1X2');
    }
  }catch(e){ apiErrors.push('football-bulk-odds:'+e.message); }
  // BASKETBALL: only if football still short, bulk games + per-game odds (max 4)
  if(bkey && candidates.length<20){
    try{
      const r=await fetch('https://v1.basketball.api-sports.io/games?date='+today+'&timezone=Africa%2FLagos',{headers:{'x-apisports-key':bkey}});
      const g=await r.json(); if(g.errors && Object.keys(g.errors).length) apiErrors.push('basketball-games:'+JSON.stringify(g.errors));
      const list=(g.response||[]).filter(gm=>gm.teams&&gm.teams.home&&!blocked(gm.league?.name)).slice(0,4);
      for(const gm of list){ try{ const oRes=await fetch('https://v1.basketball.api-sports.io/odds?game='+gm.id,{headers:{'x-apisports-key':bkey}}); const oData=await oRes.json(); const bms=oData.response?.[0]?.bookmakers||[]; if(!bms.length) continue; const bm=bms[0]; const kickoff=new Date(gm.date).toLocaleString('en-NG',{timeZone:'Africa/Lagos',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}); const base={sport:'Basketball',home:gm.teams.home.name,away:gm.teams.away.name,league:cleanLeague(gm.league,'Basketball'),kickoff,fixtureId:'B'+gm.id}; for(const bet of (bm.bets||[])){ for(const v of (bet.values||[])){ const oo=parseFloat(v.odd); if(!isNaN(oo)&&oo>=1.05&&oo<=2.50) candidates.push({...base,market:cleanMarket(bet.name,v.value),pick:v.value,odd:oo,reason:'Real fixture + real bookmaker odd ('+bm.name+'). Basketball.'}); } } }catch(e){ continue; } }
    }catch(e){ apiErrors.push('basketball:'+e.message); }
  }
  const byKey={}; for(const c of candidates){const k=c.fixtureId+'|'+c.market+'|'+c.pick; if(!byKey[k]||c.odd<byKey[k].odd) byKey[k]=c;}
  let pool=Object.values(byKey).sort((a,b)=>(a.fixtureId+a.market+a.pick).localeCompare(b.fixtureId+b.market+b.pick));
  const seed=hashStr(today); pool=pool.map(c=>({...c,_s:hashStr(today+c.fixtureId+c.market+c.pick)})).sort((a,b)=>a._s-b._s).slice(0,24);
  function findCombo(n){ const idx=[]; function rec(start,depth){ if(depth===n){ const prod=idx.reduce((a,c)=>a*c.odd,1); if(prod>=1.50&&prod<=2.00) return [...idx]; return null; } for(let i=start;i<pool.length;i++){ idx.push(pool[i]); const r=rec(i+1,depth+1); if(r) return r; idx.pop(); } return null; } return rec(0,0); }
  let best=null;
  // REAL AI CROSS-CHECK: let AI rank, then verify combined 1.50-2.00 with rule engine. AI never invents - only picks indexes from real pool.
  try{ const aiPicks = await aiCrossCheck(pool, today); if(aiPicks && aiPicks.length>=2){ const aiCombo = aiPicks.filter(i=>pool[i]).map(i=>pool[i]).slice(0,3); const prod = aiCombo.reduce((a,c)=>a*c.odd,1); if(aiCombo.length>=2 && prod>=1.50 && prod<=2.00) best = aiCombo; } }catch(e){}
  if(!best) best=findCombo(3)||findCombo(2)||findCombo(1);
  let games, combined;
  if(best){ games=best.map(g=>({home:g.home,away:g.away,league:g.league,kickoff:g.kickoff,market:g.market,pick:g.pick,odd:g.odd.toFixed(2),reason:g.reason,sport:g.sport})); combined=best.reduce((a,c)=>a*c.odd,1).toFixed(2); }
  else {
    const seen={}; const fb=[];
    for(const c of pool){ if(fb.length>=3) break; if(seen[c.fixtureId]) continue; seen[c.fixtureId]=1; fb.push({home:c.home,away:c.away,league:c.league,kickoff:c.kickoff,market:c.market,pick:c.pick,odd:c.odd.toFixed(2),reason:c.reason,sport:c.sport}); }
    if(!fb.length && allFixtures.length){ for(const f of allFixtures.slice(0,3)) fb.push({home:f.home,away:f.away,league:f.league,kickoff:f.kickoff,market:'1X2',pick:'Check live odds',odd:'—',reason:'Real fixture from live provider. Check live odds before staking.',sport:f.sport}); }
    if(!fb.length){
      // LAST RESORT: yesterday's saved slip so box NEVER empty on launch day. Better to show yesterday's real slip than empty box.
      try{ const last = await supaGet('daily_slips?order=date.desc&limit=1&select=*'); if(last && last.length && last[0].games){ const gg=typeof last[0].games==='string'?JSON.parse(last[0].games):last[0].games; if(gg && gg.length) return {ok:true,date:today,serverDate:today,serverNow:new Date().toISOString(),serverTimeMs:Date.now(),games:gg,combined:last[0].combined||'-',plan:'FREE',cached:true,source:'last-day-fallback',debug:{fixtureCount:allFixtures.length,candidateCount:candidates.length,apiErrors}}; } }catch(e){}
      return {ok:true,date:today,serverDate:today,serverNow:new Date().toISOString(),serverTimeMs:Date.now(),games:[],combined:'-',message:'NO_FIXTURES',debug:{fixtureCount:allFixtures.length,candidateCount:candidates.length,apiErrors}};
    }
    games=fb; combined='-';
  }
  try{ await supaPost('daily_slips', {date:today,games:JSON.stringify(games),combined:combined}); }catch(e){}
  __memCache={date:today,games,combined,at:Date.now()};
  return {ok:true,date:today,serverDate:today,serverNow:new Date().toISOString(),serverTimeMs:Date.now(),games,combined,plan:'FREE',cached:false,debug:{fixtureCount:allFixtures.length,candidateCount:candidates.length,apiErrors}};
  })();
  try{ const out = await __genLock; return out; } finally{ __genLock = null; }
}
module.exports = async (req,res)=>{
  cors(res);
  if(req.method==='OPTIONS')return res.status(200).end();
  const endpoint=(req.query.endpoint||req.body?.endpoint||'').toString();
  try{
    if(endpoint==='status'){return res.json({ok:true,footballKey:!!process.env.API_FOOTBALL_KEY,basketballKey:!!process.env.API_BASKETBALL_KEY,aiKey:!!(process.env.GEMINI_API_KEY||process.env.GROQ_API_KEY),paystackKey:!!process.env.PAYSTACK_SECRET_KEY});}
    if(endpoint==='pool-status'){const t2=watToday();const c=await supaGet('daily_slips?date=eq.'+t2+'&select=*&limit=1');return res.json({ok:true,date:t2,hasSlip:!!(c&&c.length&&c[0].games),games:(c&&c[0].games)?(typeof c[0].games==='string'?JSON.parse(c[0].games).length:c[0].games.length):0,combined:c&&c[0].combined});}
    if(endpoint==='generate-now'){res.setHeader('Cache-Control','no-store');__memCache={date:'',games:null,combined:'-',at:0};const r=await fetchRealFreeGames(true);return res.json({ok:true,generated:true,date:r.date,games:r.games||[],combined:r.combined,debug:r.debug});}
    if(endpoint==='warmup'||endpoint==='cron-daily'){res.setHeader('Cache-Control','no-store');const r=await fetchRealFreeGames();return res.json({ok:true,warmup:true,date:r.date,games:(r.games||[]).length,combined:r.combined});}
    if(endpoint==='diag'){return res.json({ok:true,serverDate:watToday(),footballKey:!!process.env.API_FOOTBALL_KEY,basketballKey:!!process.env.API_BASKETBALL_KEY,geminiKey:!!process.env.GEMINI_API_KEY,groqKey:!!process.env.GROQ_API_KEY,openaiKey:!!process.env.OPENAI_API_KEY,supabaseUrl:!!process.env.SUPABASE_URL,serviceRole:!!process.env.SUPABASE_SERVICE_ROLE_KEY,paystackKey:!!process.env.PAYSTACK_SECRET_KEY});}
    if(endpoint==='free-slip'){res.setHeader('Cache-Control','no-store');const r=await fetchRealFreeGames();return res.json(r);}
    if(endpoint==='me'){const user=await getUser(req);if(!user)return res.status(401).json({ok:false,error:'Not logged in'});return res.json({ok:true,profile:{email:user.email,plan:'FREE'},user:{email:user.email},usage:[],subscription:null});}
    if(endpoint==='paystack-init'){
      const user=await getUser(req);if(!user)return res.status(401).json({ok:false,error:'Login first'});
      let body=req.body||{}; if(typeof body==='string'){try{body=JSON.parse(body)}catch(e){body={}}}
      const plan=(body.plan||'').toString().toUpperCase();const cfg=PLANS[plan]; if(!cfg||plan==='FREE')return res.status(400).json({ok:false,error:'Invalid plan'});
      if(!process.env.PAYSTACK_SECRET_KEY)return res.status(500).json({ok:false,error:'Paystack secret not configured in Vercel'});
      const reference='ODD-'+Date.now()+'-'+Math.floor(Math.random()*100000);
      const init=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{Authorization:'Bearer '+process.env.PAYSTACK_SECRET_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:user.email,amount:cfg.price*100,reference,callback_url:'https://oddsgpt.com.ng/',metadata:{plan,user_id:user.id}})});
      const data=await init.json(); if(!data.status) return res.status(400).json({ok:false,error:data.message||'Paystack init failed'});
      return res.json({ok:true,publicKey:process.env.PAYSTACK_PUBLIC_KEY,amount:cfg.price,reference,authorization_url:data.data.authorization_url,days:cfg.days});
    }
    if(endpoint==='paystack-verify'){
      let body=req.body||{}; if(typeof body==='string'){try{body=JSON.parse(body)}catch(e){body={}}}
      const ref=body.reference; if(!ref)return res.status(400).json({ok:false,error:'No reference'});
      const v=await fetch('https://api.paystack.co/transaction/verify/'+encodeURIComponent(ref),{headers:{Authorization:'Bearer '+process.env.PAYSTACK_SECRET_KEY}});
      const data=await v.json(); if(!data.status||data.data.status!=='success') return res.status(400).json({ok:false,error:'Payment not verified'});
      const plan=(data.data.metadata?.plan||'').toUpperCase();const cfg=PLANS[plan]||{days:1};const expiresAt=new Date(Date.now()+cfg.days*24*3600*1000).toISOString();
      return res.json({ok:true,plan,expiresAt,amount:data.data.amount/100,reference:ref,paymentId:ref});
    }
    return res.json({ok:true,message:'OddsGPT V169 backend running'});
  }catch(e){return res.status(500).json({ok:false,error:e.message||'Server error'});}
};
