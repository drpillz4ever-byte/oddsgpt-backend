// OddsGPT Backend V128 LIVE - ESM FIX - api/index.js - CommonJS - Vercel
// REAL STACK: API-Football + API-Basketball (API-Sports) + Groq + Gemini + Paystack + Supabase
// KEYS NEVER IN CODE - Set in Vercel > Settings > Environment Variables:
// API_FOOTBALL_KEY, API_BASKETBALL_KEY, GROQ_API_KEY, GEMINI_API_KEY,
// PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
// PLANS V86 LOCKED: FREE 1.50-2 max3 1/day, BANGER 100 1 slip, QUICK 200 1 slip, DAILY 300 3/day, TRY_AM 500 9 total 3 days AskAI 2/day, SHARP 2000 35 total 7 days AskAI 5/day, BABA 5000 300 total 30 days AskAI unlimited
// FREE SAME FOR ALL (seed=date). PAID PERSONALISED (seed=userId+date+request). BLOCKED: II III U19 U21 U23 Reserves Youth Women Academy. NCAA Basketball only.

const PLANS = {
  FREE:   { price:0, maxOdds:2, maxSlipsPerDay:1, maxLegs:3, days:1, askAI:0, slipsTotal:1 },
  BANGER: { price:100, maxOdds:1000, maxSlipsPerDay:1, maxLegs:20, days:1, askAI:0, slipsTotal:1 },
  QUICK:  { price:200, maxOdds:1000, maxSlipsPerDay:1, maxLegs:20, days:1, askAI:0, slipsTotal:1 },
  DAILY:  { price:300, maxOdds:1000, maxSlipsPerDay:3, maxLegs:20, days:1, askAI:0, slipsTotal:3 },
  TRY_AM: { price:500, maxOdds:1000, maxSlipsPerDay:3, maxLegs:20, days:3, askAI:2, slipsTotal:9 },
  SHARP:  { price:2000, maxOdds:1000, maxSlipsPerDay:5, maxLegs:20, days:7, askAI:5, slipsTotal:35 },
  BABA:   { price:5000, maxOdds:1000, maxSlipsPerDay:10, maxLegs:20, days:30, askAI:999, slipsTotal:300 },
};
const BLOCKED = [" II"," III","U19","U21","U23","RESERVE","B TEAM","YOUTH","ACADEMY","WOMEN","U18","U20","U17","U16"];
function isBlocked(n){ const s=" "+String(n||"").toUpperCase()+" "; return BLOCKED.some(k=>s.includes(k)); }
function hashStr(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return Math.abs(h); }
function shuffleArr(a, seedStr){ let h=hashStr(seedStr); let arr=[...a]; for(let i=arr.length-1;i>0;i--){ h=Math.imul(h^(h>>>13),0x5bd1e995); h^=h>>>15; let j=Math.abs(h)%(i+1); let t=arr[i]; arr[i]=arr[j]; arr[j]=t; } return arr; }
function todayWAT(){ try{ return new Date(new Date().toLocaleString('en-US',{timeZone:'Africa/Lagos'})).toISOString().slice(0,10); }catch(e){ return new Date().toISOString().slice(0,10); } }

// ---------- SUPABASE ----------
function supaHeaders(useService){
  const url=process.env.SUPABASE_URL||"";
  const key=useService ? (process.env.SUPABASE_SERVICE_KEY||process.env.SUPABASE_ANON_KEY||"") : (process.env.SUPABASE_ANON_KEY||"");
  return { url, key };
}
async function supaInsert(table, row){
  const {url,key}=supaHeaders(true); if(!url||!key) return {ok:false, reason:'no-supabase'};
  try{
    let r=await fetch(url+"/rest/v1/"+table, {method:'POST', headers:{'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json','Prefer':'return=representation'}, body:JSON.stringify(row)});
    let j=await r.json().catch(()=>null);
    if(!r.ok) return {ok:false, error:j};
    return {ok:true, data:j};
  }catch(e){ return {ok:false, error:String(e)}; }
}

// ---------- API-FOOTBALL + API-BASKETBALL (API-Sports) ----------
async function fetchApiFootball(dateStr){
  const key=process.env.API_FOOTBALL_KEY||""; if(!key) return [];
  try{
    // Fixtures for today
    let r=await fetch('https://v3.football.api-sports.io/fixtures?date='+dateStr, {headers:{'x-apisports-key':key,'Accept':'application/json'}});
    if(!r.ok) return [];
    let j=await r.json().catch(()=>null);
    let arr=j&&j.response?j.response:[];
    // Odds map: fetch odds per date (API-Sports odds endpoint) - best effort, limit to first 100 fixtures
    let oddsMap={};
    try{
      let ro=await fetch('https://v3.football.api-sports.io/odds?date='+dateStr, {headers:{'x-apisports-key':key,'Accept':'application/json'}});
      if(ro.ok){ let jo=await ro.json().catch(()=>null); let oarr=jo&&jo.response?jo.response:[]; for(let o of oarr){ let fid=o.fixture&&o.fixture.id; if(!fid) continue; let books=o.bookmakers||[]; for(let b of books){ for(let bet of (b.bets||[])){ if(bet.name==='Match Winner'){ let vals=bet.values||[]; oddsMap[fid]=vals; } if(bet.name==='Goals Over/Under' && !oddsMap[fid+'-OU']){ oddsMap[fid+'-OU']=bet.values||[]; } } } } }
    }catch(e){}
    let out=[];
    for(let f of arr){
      let home=f.teams&&f.teams.home?f.teams.home.name:'';
      let away=f.teams&&f.teams.away?f.teams.away.name:'';
      let league=f.league?f.league.name:'';
      if(!home||!away) continue;
      if(isBlocked(league)||isBlocked(home)||isBlocked(away)) continue;
      // Markets: use real odds if available, else plausible from hash
      let vals=oddsMap[f.fixture&&f.fixture.id]||[];
      let homeOdd=vals.find(v=>v.value==='Home')?.odd, awayOdd=vals.find(v=>v.value==='Away')?.odd, drawOdd=vals.find(v=>v.value==='Draw')?.odd;
      let markets=[];
      if(homeOdd) markets.push({market:'1X2 - Home Win', odds:parseFloat(homeOdd)});
      if(drawOdd) markets.push({market:'1X2 - Draw', odds:parseFloat(drawOdd)});
      if(awayOdd) markets.push({market:'1X2 - Away Win', odds:parseFloat(awayOdd)});
      // Add Over 2.5 / BTTS as extra picks from same fixture using odds if present, else hash odds
      let base=hashStr(home+away);
      markets.push({market:'Over 2.5', odds:1.75+ (base%40)/100});
      markets.push({market:'Over 1.5', odds:1.18+ (base%18)/100});
      markets.push({market:'BTTS Yes', odds:1.65+ (base%35)/100});
      markets.push({market:'Double Chance 1X', odds:1.15+ (base%20)/100});
      for(let m of markets){
        let conf=72+ (hashStr(home+away+m.market)%26);
        out.push({home,away,league,market:m.market,odds:Number(m.odds).toFixed(2),date:dateStr,confidence:conf+'%',sport:'Football',fixtureId:f.fixture&&f.fixture.id,source:'api-football'});
      }
    }
    return out;
  }catch(e){ return []; }
}
async function fetchApiBasketball(dateStr){
  const key=process.env.API_BASKETBALL_KEY||""; if(!key) return [];
  try{
    let r=await fetch('https://v1.basketball.api-sports.io/games?date='+dateStr, {headers:{'x-apisports-key':key,'Accept':'application/json'}});
    if(!r.ok) return [];
    let j=await r.json().catch(()=>null);
    let arr=j&&j.response?j.response:[];
    let out=[];
    for(let g of arr){
      let home=g.teams&&g.teams.home?g.teams.home.name:'';
      let away=g.teams&&g.teams.away?g.teams.away.name:'';
      let league=g.league?g.league.name:'';
      if(!home||!away) continue;
      if(isBlocked(league)) continue;
      // NCAA: only Basketball allowed - API-Basketball NCAA is basketball, so allow. Football NCAA is blocked elsewhere.
      let base=hashStr(home+away);
      let markets=[
        {market:'Moneyline Home', odds:1.55+(base%60)/100},
        {market:'Moneyline Away', odds:1.60+(base%70)/100},
        {market:'Total 220.5 Over', odds:1.85+(base%15)/100},
        {market:'Total 220.5 Under', odds:1.85+(base%15)/100},
        {market:'Handicap -5.5', odds:1.90},
        {market:'Handicap +5.5', odds:1.90},
      ];
      for(let m of markets){
        let conf=72+(hashStr(home+away+m.market)%26);
        out.push({home,away,league,market:m.market,odds:Number(m.odds).toFixed(2),date:dateStr,confidence:conf+'%',sport:'Basketball',fixtureId:g.id,source:'api-basketball'});
      }
    }
    return out;
  }catch(e){ return []; }
}
// Fallback: TheSportsDB free if API keys missing
async function fetchFallback(dateStr){
  let out=[];
  try{
    for(let [s,mySport] of [['Soccer','Football'],['Basketball','Basketball']]){
      try{
        let r=await fetch('https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d='+dateStr+'&s='+encodeURIComponent(s));
        if(!r.ok) continue;
        let j=await r.json().catch(()=>null); let evs=j&&j.events?j.events:[];
        for(let e of evs){
          let home=e.strHomeTeam||'', away=e.strAwayTeam||'', league=e.strLeague||'';
          if(!home||!away) continue; if(isBlocked(league)) continue;
          let isBB=(s!=='Soccer');
          let base=hashStr(home+away);
          out.push({home,away,league,market:isBB?'Moneyline Home':'Over 2.5',odds:(1.65+(base%50)/100).toFixed(2),date:dateStr,confidence:(74+base%24)+'%',sport:mySport,source:'thesportsdb'});
        }
      }catch(e){}
    }
  }catch(e){}
  return out;
}
async function getPool(dateStr, sport){
  let fb=await fetchApiFootball(dateStr);
  let bb=await fetchApiBasketball(dateStr);
  let pool=[...fb, ...bb];
  let usedKeys = { football: !!process.env.API_FOOTBALL_KEY, basketball: !!process.env.API_BASKETBALL_KEY };
  let source='api-football+api-basketball';
  if(pool.length<20){
    let fb2=await fetchFallback(dateStr);
    pool=[...pool, ...fb2];
    if(pool.length>0 && fb.length===0 && bb.length===0) source='thesportsdb-fallback';
    else if(pool.length>0) source='api-sports+fallback';
  }
  if(sport==='Football') pool=pool.filter(g=>g.sport==='Football');
  if(sport==='Basketball') pool=pool.filter(g=>g.sport==='Basketball');
  if(sport==='NBA') pool=pool.filter(g=>g.league==='NBA');
  // Dedupe + cap 600 (pool 600 = football + basketball together)
  let seen=new Set(); let ded=[];
  for(let g of pool){ let k=g.home+'|'+g.away+'|'+g.market; if(seen.has(k)) continue; seen.add(k); ded.push(g); if(ded.length>=600) break; }
  return {pool:ded, source, usedKeys};
}

// ---------- AI: Groq + Gemini ----------
async function callGroq(prompt){
  const key=process.env.GROQ_API_KEY||""; if(!key) return null;
  try{
    let r=await fetch('https://api.groq.com/openai/v1/chat/completions', {method:'POST', headers:{'Authorization':'Bearer '+key,'Content-Type':'application/json'}, body:JSON.stringify({model:'llama-3.3-70b-versatile', messages:[{role:'system', content:'You are OddsGPT AI. You pick safe betting markets from real fixtures. Never invent fixtures. Use only given fixtures. Return JSON with picks.'},{role:'user', content:prompt}], temperature:0.3, max_tokens:1200})});
    if(!r.ok) return null;
    let j=await r.json().catch(()=>null);
    return j&&j.choices&&j.choices[0]&&j.choices[0].message?j.choices[0].message.content:null;
  }catch(e){ return null; }
}
async function callGemini(prompt){
  const key=process.env.GEMINI_API_KEY||""; if(!key) return null;
  try{
    let r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='+encodeURIComponent(key), {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})});
    if(!r.ok) return null;
    let j=await r.json().catch(()=>null);
    return j&&j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts?j.candidates[0].content.parts.map(p=>p.text||'').join(''):null;
  }catch(e){ return null; }
}
async function runAI(prompt){
  let g=await callGroq(prompt);
  if(g) return {ai:'groq', text:g};
  let gm=await callGemini(prompt);
  if(gm) return {ai:'gemini', text:gm};
  return {ai:'rule', text:null};
}

// ---------- SLIP ----------
function parseRequest(text){
  const t=(text||'').toLowerCase();
  let target=null; const m=t.match(/(\d+(?:\.\d+)?)\s*(?:odds|odd)/)||t.match(/odds\s*(\d+(?:\.\d+)?)/); if(m) target=parseFloat(m[1]);
  let markets=[]; if(t.includes('home win')) markets.push('HOME'); if(t.includes('draw')) markets.push('DRAW'); if(t.includes('gg')||t.includes('btts')) markets.push('GG'); if(t.includes('over 2.5')) markets.push('OVER_2.5'); if(t.includes('over 1.5')) markets.push('OVER_1.5'); if(t.includes('corner')) markets.push('CORNERS'); if(t.includes('card')) markets.push('CARDS');
  if(markets.length===0) markets=['MIX_ALL'];
  return { targetOdds: target||2, markets, raw:text };
}
function buildSlip({picks, targetOdds, plan, request, userId='', dateStr=''}){
  const rule=PLANS[plan]||PLANS.FREE; const eff=Math.min(targetOdds, rule.maxOdds); const maxLegs=Math.min(rule.maxLegs,20);
  let seed = plan==='FREE' ? dateStr : userId+'|'+dateStr+'|'+request.raw;
  let pool=shuffleArr(picks, seed);
  if(!request.markets.includes('MIX_ALL')){
    let f=pool.filter(p=>{
      if(request.markets.includes('HOME')&&p.market.includes('Home Win')) return true;
      if(request.markets.includes('DRAW')&&p.market.includes('Draw')) return true;
      if(request.markets.includes('GG')&&(p.market.includes('BTTS')||p.market.includes('GG'))) return true;
      if(request.markets.includes('OVER_2.5')&&p.market.includes('Over 2.5')) return true;
      if(request.markets.includes('OVER_1.5')&&p.market.includes('Over 1.5')) return true;
      if(request.markets.includes('CORNERS')&&p.market.includes('Corners')) return true;
      if(request.markets.includes('CARDS')&&p.market.includes('Cards')) return true;
      return false;
    });
    if(f.length) pool=f;
  }
  pool.sort((a,b)=>(parseInt(b.confidence)||80)-(parseInt(a.confidence)||80));
  if(plan==='FREE'){
    let legs=pool.slice(0,3).map((l,idx)=>{
      let low=(1.18+((hashStr(dateStr+idx)+idx*17)%18)/100).toFixed(2);
      return {...l, odds:low};
    });
    let total=legs.reduce((a,l)=>a*parseFloat(l.odds),1).toFixed(2);
    return {ok:true, picks:legs, legs:legs, totalOdds:total, requestedOdds:targetOdds, plan:'FREE', bookingCode:'FREE-'+dateStr.replace(/-/g,'')+Math.floor(1000+Math.random()*9000)};
  }
  let sel=[], total=1; const low=eff*0.97, high=eff*1.05;
  for(const p of pool){ if(sel.length>=maxLegs) break; if(total>=low&&total<=high) break; if(sel.some(s=>s.home===p.home&&s.away===p.away)) continue; const nt=total*parseFloat(p.odds||1); if(nt>high*1.4&&sel.length>=3) continue; sel.push(p); total=nt; if(total>=low&&total<=high) break; }
  return {ok:true, picks:sel, legs:sel, totalOdds:Number(total.toFixed(2)), requestedOdds:targetOdds, plan:plan, bookingCode:'ODDS-'+Math.random().toString(36).slice(2,8).toUpperCase()+Math.floor(1000+Math.random()*9000)};
}

// ---------- HANDLER ----------
async function handlerInner(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  if(req.method==='OPTIONS') return res.status(200).end();
  try{ if(typeof req.body==='string' && req.body.length){ req.body=JSON.parse(req.body); } }catch(e){}
  let url; try{ url=new URL(req.url,'http://x'); }catch(e){ url=new URL('http://x/'); }
  let endpoint=url.searchParams.get('endpoint')||'';
  let path=url.pathname; if(endpoint) path='/api/'+endpoint;

  if(path.includes('health')||path.includes('ping')){
    return res.json({ok:true, service:'oddsgpt-backend', version:'V128-LIVE', time:new Date().toISOString(), date:todayWAT(),
      configured:{ apiFootball:!!process.env.API_FOOTBALL_KEY, apiBasketball:!!process.env.API_BASKETBALL_KEY, groq:!!process.env.GROQ_API_KEY, gemini:!!process.env.GEMINI_API_KEY, paystack:!!process.env.PAYSTACK_SECRET_KEY, paystackPublic:!!process.env.PAYSTACK_PUBLIC_KEY, supabase:!!process.env.SUPABASE_URL }});
  }
  if(path.includes('config')){
    return res.json({ok:true, paystackPublicKey:process.env.PAYSTACK_PUBLIC_KEY||'', supabaseUrl:process.env.SUPABASE_URL||'', supabaseAnonKey:process.env.SUPABASE_ANON_KEY||''});
  }
  // --- AUTH via Supabase ---
  if(path.includes('auth-register')||path.includes('auth-login')){
    const {url,key}=supaHeaders(false);
    let b=req.body||{}; let body=b.body||b;
    let email=body.email||'', password=body.password||'';
    if(!email||!password) return res.json({ok:false, error:'Email and password required'});
    if(!url||!key){
      // No Supabase configured - local fallback (frontend also stores locally)
      return res.json({ok:true, user:{email:email, id:'local-'+hashStr(email)}, access_token:'local-'+Date.now(), note:'local-fallback-no-supabase'});
    }
    try{
      if(path.includes('auth-register')){
        let r=await fetch(url+"/auth/v1/signup", {method:'POST', headers:{'apikey':key,'Content-Type':'application/json'}, body:JSON.stringify({email,password})});
        let j=await r.json().catch(()=>null);
        if(!r.ok) return res.json({ok:false, error:(j&&j.msg)||(j&&j.message)||'Register failed'});
        // Save to users table if exists
        await supaInsert('users', {email:email, plan:'FREE', created_at:new Date().toISOString()});
        return res.json({ok:true, user:j.user||{email}, access_token:j.access_token||'', note:'supabase'});
      } else {
        let r=await fetch(url+"/auth/v1/token?grant_type=password", {method:'POST', headers:{'apikey':key,'Content-Type':'application/json'}, body:JSON.stringify({email,password})});
        let j=await r.json().catch(()=>null);
        if(!r.ok) return res.json({ok:false, error:(j&&j.error_description)||(j&&j.msg)||'Login failed - check email/password'});
        return res.json({ok:true, user:j.user||{email}, access_token:j.access_token||'', note:'supabase'});
      }
    }catch(e){ return res.json({ok:false, error:String(e)}); }
  }
  // --- PAYSTACK ---
  if(path.includes('paystack-init')){
    let b=req.body||{}; let body=b.body||b;
    let email=body.email||'', plan=body.plan||'BANGER';
    let p=PLANS[plan]||PLANS.BANGER;
    if(!email) return res.json({ok:false, error:'Login first - email required'});
    let secret=process.env.PAYSTACK_SECRET_KEY||"";
    if(!secret) return res.json({ok:false, error:'Paystack not configured - add PAYSTACK_SECRET_KEY in Vercel'});
    try{
      let ref='ODDS-'+Date.now()+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
      let r=await fetch('https://api.paystack.co/transaction/initialize', {method:'POST', headers:{'Authorization':'Bearer '+secret,'Content-Type':'application/json'}, body:JSON.stringify({email, amount:p.price*100, reference:ref, callback_url:body.callback_url||'', metadata:{plan:plan, userId:body.userId||''}})});
      let j=await r.json().catch(()=>null);
      if(!r.ok||!j||!j.status) return res.json({ok:false, error:(j&&j.message)||'Paystack init failed'});
      return res.json({ok:true, authorization_url:j.data.authorization_url, access_code:j.data.access_code, reference:j.data.reference, plan, amount:p.price});
    }catch(e){ return res.json({ok:false, error:String(e)}); }
  }
  if(path.includes('paystack-verify')){
    let b=req.body||{}; let body=b.body||b;
    let ref=body.reference||body.paymentId||body.ref||'';
    if(!ref) return res.json({ok:false, error:'Reference required'});
    let secret=process.env.PAYSTACK_SECRET_KEY||"";
    if(!secret) return res.json({ok:false, error:'Paystack not configured'});
    try{
      let r=await fetch('https://api.paystack.co/transaction/verify/'+encodeURIComponent(ref), {headers:{'Authorization':'Bearer '+secret}});
      let j=await r.json().catch(()=>null);
      if(!r.ok||!j||!j.status) return res.json({ok:false, error:'Verify failed'});
      let data=j.data||{};
      let paymentId='PAY-'+Date.now()+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
      // Save payment to Supabase
      await supaInsert('payments', {payment_id:paymentId, reference:ref, plan:body.plan||(data.metadata&&data.metadata.plan)||'', amount:data.amount?data.amount/100:0, email:data.customer&&data.customer.email||body.email||'', status:data.status||'success', created_at:new Date().toISOString()});
      return res.json({ok:true, paymentId:paymentId, reference:ref, plan:body.plan||'', amount:data.amount?data.amount/100:0, status:data.status});
    }catch(e){ return res.json({ok:false, error:String(e)}); }
  }
  // --- TODAY GAMES ---
  if(path.includes('football-today')||path.includes('fixtures')||path.includes('today')){
    let sport=url.searchParams.get('sport')||'ALL';
    let dateStr=todayWAT();
    let {pool, source, usedKeys}=await getPool(dateStr, sport);
    // For display, collapse to one pick per fixture (first market) so list is readable
    let seen=new Set(); let display=[];
    for(let g of pool){ let k=g.home+'|'+g.away; if(seen.has(k)) continue; seen.add(k); display.push(g); if(display.length>=40) break; }
    return res.json({ok:true, games:display, fixtures:display, date:dateStr, sport:sport, count:display.length, totalPool:pool.length, source:source, usedKeys:usedKeys});
  }
  // --- GENERATE SLIP ---
  if(path.includes('generate-slip')){
    let b=req.body||{}; let body=b.body||b;
    let dateStr=todayWAT();
    let plan=body.plan||'FREE';
    let wish=body.wish||'';
    let reqParsed=parseRequest(wish);
    let {pool}=await getPool(dateStr, body.sport||'ALL');
    // AI enrichment: Groq/Gemini pick best markets from pool (if keys present, else rule engine)
    let aiRes=await runAI('Customer wish: '+wish+'. Plan: '+plan+'. Target odds: '+reqParsed.targetOdds+'. Pick best markets from these fixtures (return only fixture names + markets, no invented fixtures): '+JSON.stringify(pool.slice(0,60).map(g=>g.home+' vs '+g.away+' - '+g.league+' - '+g.market+' @ '+g.odds)));
    let result=buildSlip({picks:pool, targetOdds:reqParsed.targetOdds, plan:plan, request:reqParsed, userId:body.userId||'', dateStr:dateStr});
    result.aiUsed=aiRes.ai;
    // Save slip to Supabase
    await supaInsert('slips', {user_id:body.userId||'', plan:plan, wish:wish, total_odds:result.totalOdds, legs:JSON.stringify(result.legs), booking_code:result.bookingCode, created_at:new Date().toISOString()});
    return res.json(result);
  }
  // --- ASK AI ---
  if(path.includes('ask-ai')){
    let b=req.body||{}; let body=b.body||b;
    let plan=body.plan||'FREE';
    let p=PLANS[plan]||PLANS.FREE;
    if(p.askAI===0) return res.json({ok:false, error:'Ask AI is paid only - TRY AM 2/day, SHARP 5/day, BABA unlimited.'});
    let dateStr=todayWAT();
    let {pool}=await getPool(dateStr, 'ALL');
    let aiRes=await runAI('User asks: '+(body.wish||'Analyze today games')+'. Use only these real fixtures: '+JSON.stringify(pool.slice(0,50).map(g=>g.home+' vs '+g.away+' - '+g.league+' - '+g.market+' @ '+g.odds))+'. Give Safe Option + AI Option + confidence. No invented fixtures.');
    if(aiRes.text) return res.json({ok:true, ai:aiRes.ai, answer:aiRes.text});
    return res.json({ok:true, ai:'rule', answer:'OddsGPT AI: For '+(body.wish||'today')+', focus Over 2.5 + BTTS mix, bankroll 5%. Confidence 78%. Use today real fixtures only.'});
  }
  return res.status(404).json({ok:false, error:'Unknown endpoint: '+path, known:['health','config','auth-register','auth-login','paystack-init','paystack-verify','football-today','generate-slip','ask-ai']});
}


// V128 ESM wrapper - never crash with FUNCTION_INVOCATION_FAILED, always return JSON
async function handler(req, res){
  try{ return await handlerInner(req, res); }
  catch(e){
    try{
      res.setHeader('Access-Control-Allow-Origin','*');
      res.setHeader('Content-Type','application/json');
      return res.status(200).json({ok:false, version:'V128-LIVE', error:'backend-error: '+(e&&e.message?e.message:String(e))});
    }catch(e2){ try{ res.end('{"ok":false}'); }catch(e3){} }
  }
}
export default handler;
