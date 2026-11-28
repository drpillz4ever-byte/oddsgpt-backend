// OddsGPT Backend V171 - REAL games + REAL prediction - Deploy as api/index.js in oddsgpt-backend repo
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
function watToday(){try{const now=new Date();const p=new Intl.DateTimeFormat('en-NG',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hour12:false,timeZone:'Africa/Lagos'}).formatToParts(now);const y=p.find(x=>x.type==='year').value,mo=p.find(x=>x.type==='month').value,da=p.find(x=>x.type==='day').value,h=parseInt(p.find(x=>x.type==='hour').value,10);let d=new Date(y+'-'+mo+'-'+da+'T12:00:00');if(h<10)d.setDate(d.getDate()-1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}catch(e){const n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');}}
function nextSlipChangeMs(){try{const now=new Date();const p=new Intl.DateTimeFormat('en-NG',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hour12:false,timeZone:'Africa/Lagos'}).formatToParts(now);const y=p.find(x=>x.type==='year').value,mo=p.find(x=>x.type==='month').value,da=p.find(x=>x.type==='day').value,h=parseInt(p.find(x=>x.type==='hour').value,10);let target=new Date(y+'-'+mo+'-'+da+'T10:00:00+01:00');if(h>=10)target.setDate(target.getDate()+1);return target.getTime();}catch(e){return Date.now()+3600000;}}

async function supaPost(path, body){
  if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try{const r=await fetch(process.env.SUPABASE_URL+'/rest/v1/'+path,{method:'POST',headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(body)}); if(!r.ok) return null; return await r.json();}catch(e){return null;}
}
async function supaPatch(path, body){ if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY) return null; try{ const r=await fetch(process.env.SUPABASE_URL+'/rest/v1/'+path,{method:'PATCH',headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(body)}); if(!r.ok) return null; return await r.json(); }catch(e){ return null; } }
function hashStr(s){let h=0; for(let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i); h|=0;} return Math.abs(h);}
// V171: NEVER-EMPTY. Bulk odds (1 call) + generation lock + real AI cross-check + last-slip fallback
let __genLock = null;
let __quotaExhaustedUntil = 0;
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

async function supaGet(path){
  if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try{ const r=await fetch(process.env.SUPABASE_URL+'/rest/v1/'+path,{method:'GET',headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'}}); if(!r.ok) return null; const j=await r.json(); return Array.isArray(j)?j:j; }catch(e){ return null; }
}
async function getUser(req){
  try{
    const auth = (req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
    const token = auth.replace('Bearer ','').trim();
    if(!token) return null;
    if(!process.env.SUPABASE_URL||!process.env.SUPABASE_ANON_KEY) return null;
    const r=await fetch(process.env.SUPABASE_URL+'/auth/v1/user',{method:'GET',headers:{apikey:process.env.SUPABASE_ANON_KEY,Authorization:'Bearer '+token}});
    if(!r.ok) return null;
    const j=await r.json();
    if(!j || !j.email) return null;
    return {email:j.email.toLowerCase(), id:j.id, user_id:j.id};
  }catch(e){ return null; }
}

// ---- V181-REQUIRED-CORRECTIONS-FINAL POOL-ONCE + ASK AI ----
// Pool = fixtures+odds for one date, fetched once, cached in memory + Supabase daily_slips pool row.
// getPoolForDates(dates[]) returns combined candidates for those dates, all future kickoff, distinct fixtures enforced at pick time.
// Max 7 days: dates must be within today..today+7, else rejected.
let __poolCache = {}; // {date: {at, candidates, fixtures}}
async function fetchPoolForDate(date){
  if(__poolCache[date] && Date.now()-__poolCache[date].at < 6*3600*1000) return __poolCache[date];
  // Try Supabase pool row first: pools table may not exist yet -> fallback to API, never crash
  try{ const rows = await supaGet('pools?date=eq.'+date+'&select=*&limit=1'); if(rows && rows.length && rows[0].candidates){ try{ const c=typeof rows[0].candidates==='string'?JSON.parse(rows[0].candidates):rows[0].candidates; if(c && c.length){ __poolCache[date]={at:Date.now(),candidates:c,fixtures:[]}; return __poolCache[date]; } }catch(e){} } }catch(e){}
  const key=process.env.API_FOOTBALL_KEY; const bkey=process.env.API_BASKETBALL_KEY||key;
  let candidates=[]; let allFixtures=[];
  const BLOCKED=[' II',' III','U19','U21','U23','RESERVE','YOUTH','WOMEN','ACADEMY','G LEAGUE'];
  function blocked(n){const s=(' '+(n||'').toUpperCase()); return BLOCKED.some(x=>s.includes(x));}
  function cleanLeague(l,fb){ if(!l) return fb; const nm=l.name||''; const co=l.country||''; if(!nm) return fb; if(!co||co==='undefined') return nm; return nm+' • '+co; }
  function cleanM(m,p){ if(m==='Over/Under'||/Over\/Under/i.test(m)) return p; let mm=(m||'').replace(/Goals/g,'Points'); return mm; }
  const _now=Date.now();
  try{
    const r=await fetch('https://v3.football.api-sports.io/fixtures?date='+date+'&timezone=Africa%2FLagos',{headers:{'x-apisports-key':key}});
    const fx=await r.json(); const flist=(fx.response||[]).filter(f=>f.teams&&f.teams.home&&!blocked(f.league?.name)&&new Date(f.fixture.date).getTime()>_now-30*60000).slice(0,60);
    for(const f of flist) allFixtures.push({sport:'Football',home:f.teams.home.name,away:f.teams.away.name,league:cleanLeague(f.league,'Football'),kickoff:new Date(f.fixture.date).toLocaleString('en-NG',{timeZone:'Africa/Lagos',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}),fixtureId:'F'+f.fixture.id,rawDate:f.fixture.date,raw:f});
  }catch(e){}
  try{
    const r=await fetch('https://v3.football.api-sports.io/odds?date='+date+'&timezone=Africa%2FLagos',{headers:{'x-apisports-key':key}});
    const oData=await r.json(); const byF={}; for(const o of (oData.response||[])) byF[o.fixture?.id]=o;
    for(const item of allFixtures.slice(0,40)){ const o=byF[item.raw.fixture.id]; if(!o) continue; const bms=o.bookmakers||[]; if(!bms.length) continue; const bm=bms[0]; const bets=bm.bets||[]; const base={sport:'Football',home:item.home,away:item.away,league:item.league,kickoff:item.kickoff,fixtureId:item.fixtureId,date:date,rawDate:item.rawDate};
      const add=(pick,odd,market,reason)=>{ const oo=parseFloat(odd); if(isNaN(oo)||oo<1.05||oo>3.00) return; candidates.push({...base,market:cleanM(market,pick),pick,odd:oo,reason:reason+' ('+bm.name+').'}); };
      const dc=bets.find(x=>x.name==='Double Chance'); if(dc) for(const v of dc.values) add(v.value,v.odd,'Double Chance','Real fixture + real odd. Double Chance');
      const ou=bets.find(x=>x.name==='Goals Over/Under'); if(ou) for(const v of ou.values){ if(['Over 0.5','Over 1.5','Over 2.5','Under 2.5','Under 3.5'].includes(v.value)) add(v.value,v.odd,'Goals Over/Under','Real fixture + real odd.'); }
      const mw=bets.find(x=>x.name==='Match Winner'); if(mw) for(const v of mw.values) add(v.value,v.odd,'1X2','Real fixture + real odd. 1X2');
    }
  }catch(e){}
  // Basketball only if football short - max 4 games, future only
  if(candidates.length<30 && bkey){
    try{
      const r=await fetch('https://v1.basketball.api-sports.io/games?date='+date+'&timezone=Africa%2FLagos',{headers:{'x-apisports-key':bkey}});
      const g=await r.json(); const list=(g.response||[]).filter(gm=>gm.teams&&gm.teams.home&&!blocked(gm.league?.name)&&new Date(gm.date).getTime()>_now-30*60000).slice(0,4);
      for(const gm of list){ try{ const oRes=await fetch('https://v1.basketball.api-sports.io/odds?game='+gm.id,{headers:{'x-apisports-key':bkey}}); const oData=await oRes.json(); const bms=oData.response?.[0]?.bookmakers||[]; if(!bms.length) continue; const bm=bms[0]; const kickoff=new Date(gm.date).toLocaleString('en-NG',{timeZone:'Africa/Lagos',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}); const base={sport:'Basketball',home:gm.teams.home.name,away:gm.teams.away.name,league:cleanLeague(gm.league,'Basketball'),kickoff,fixtureId:'B'+gm.id,date:date,rawDate:gm.date}; for(const bet of (bm.bets||[])){ for(const v of (bet.values||[])){ const oo=parseFloat(v.odd); if(!isNaN(oo)&&oo>=1.05&&oo<=3.00) candidates.push({...base,market:cleanM(bet.name,v.value),pick:v.value,odd:oo,reason:'Real fixture + real odd ('+bm.name+'). Basketball.'}); } } }catch(e){ continue; } }
    }catch(e){}
  }
  const out={at:Date.now(),candidates,fixtures:allFixtures};
  __poolCache[date]=out;
  try{ await supaPost('pools',{date:date,candidates:JSON.stringify(candidates)}); }catch(e){ /* pools table may not exist yet - memory cache still works */ }
  return out;
}
function parseAskAI(text){
  const t=(text||'').toLowerCase();
  let targetOdds=5; const m=t.match(/(\d+(\.\d+)?)\s*(odds|odd)/); if(m) targetOdds=parseFloat(m[1]);
  if(targetOdds>1000) targetOdds=1000; if(targetOdds<1.2) targetOdds=1.2;
  let days=['today']; if(/next\s*5\s*days|5\s*days/.test(t)) days=['today','tomorrow','+2','+3','+4'];
  else if(/next\s*7|7\s*days|week/.test(t)) days=['today','tomorrow','+2','+3','+4','+5','+6'];
  else if(/today\s*\+\s*tomorrow|today and tomorrow|today \+ tomorrow/.test(t)) days=['today','tomorrow'];
  else if(/tomorrow/.test(t) && !/today/.test(t)) days=['tomorrow'];
  else if(/weekend/.test(t)) days=['today','tomorrow','+2'];
  let market=null; if(/over 1\.5/.test(t)) market='Over 1.5'; else if(/over 0\.5/.test(t)) market='Over 0.5'; else if(/double chance/.test(t)) market='Double Chance';
  let excludeGerman=/no german|without german|no germany/.test(t);
  return {targetOdds,days,market,excludeGerman};
}
function watDatePlus(offset){ const d=new Date(); try{ const p=new Intl.DateTimeFormat('en-NG',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Africa/Lagos'}).formatToParts(d); let dt=new Date(p.find(x=>x.type==='year').value+'-'+p.find(x=>x.type==='month').value+'-'+p.find(x=>x.type==='day').value+'T12:00:00'); dt.setDate(dt.getDate()+offset); return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0'); }catch(e){ const n=new Date(); n.setDate(n.getDate()+offset); return n.toISOString().slice(0,10); } }
async function handleAskAI(body){
  const text=(body?.text||body?.prompt||'').toString().slice(0,500);
  if(!text) return {ok:false,message:'Type wetin you want. Example: Book me 10 odds from today and tomorrow games.'};
  const parsed=parseAskAI(text);
  // 7-day guard: if user asks beyond 7 days
  if(/3\s*weeks|2\s*weeks|month|next month/.test(text.toLowerCase())) return {ok:false,message:'We fit book from today to the next 7 days only. Odds for games after 7 days never come out yet. Try 7 days max, you go get correct odds.',code:'OUT_OF_RANGE'};
  const dates = parsed.days.map(d=> d==='today'?watDatePlus(0): d==='tomorrow'?watDatePlus(1): watDatePlus(parseInt(d.replace('+',''),10)));
  let pool=[];
  for(const dt of dates){ const p=await fetchPoolForDate(dt); pool=pool.concat(p.candidates||[]); }
  if(parsed.excludeGerman) pool=pool.filter(c=>!/germany|bundesliga|german/i.test(c.league||''));
  if(parsed.market) { const f=pool.filter(c=>c.pick===parsed.market||c.market.includes(parsed.market)); if(f.length>=3) pool=f; }
  if(!pool.length) return {ok:false,message:'No games with odds for those days yet. Try today or tomorrow.'};
  // Dedupe by fixture+market+pick, keep cheapest, shuffle deterministically by date
  const byKey={}; for(const c of pool){ const k=c.fixtureId+'|'+c.market+'|'+c.pick; if(!byKey[k]||c.odd<byKey[k].odd) byKey[k]=c; }
  let cands=Object.values(byKey);
  // Distinct fixture search: try to hit target within 5% tolerance, prefer fewer games for low odds, more for high odds
  const target=parsed.targetOdds;
  // Greedy + backtrack: sort by odd descending for high targets, ascending for low
  cands.sort((a,b)=> Math.abs(Math.log(a.odd)-Math.log(1.35)) - Math.abs(Math.log(b.odd)-Math.log(1.35)));
  function findCombo(n, tolerance){
    const idx=[]; const used=new Set();
    function rec(start,depth){
      if(depth===n){ const prod=idx.reduce((a,c)=>a*c.odd,1); if(prod>=target*(1-tolerance)&&prod<=target*(1+tolerance)) return [...idx]; return null; }
      for(let i=start;i<cands.length;i++){ if(used.has(cands[i].fixtureId)) continue; used.add(cands[i].fixtureId); idx.push(cands[i]); const r=rec(i+1,depth+1); if(r) return r; idx.pop(); used.delete(cands[i].fixtureId); if(idx.length===0 && i>80) break; }
      return null;
    }
    return rec(0,0);
  }
  let best=null; let nTry = target<=2 ? 3 : target<=10 ? 6 : target<=100 ? 12 : 22;
  for(const tol of [0.02,0.05,0.10,0.20]){ for(let n=Math.max(2,nTry-4); n<=Math.min(30,nTry+4); n++){ best=findCombo(n,tol); if(best) break; } if(best) break; }
  if(!best){
    // Fallback: greedy distinct fixtures until we overshoot, then trim
    const seen=new Set(); const picked=[]; let prod=1;
    for(const c of cands){ if(seen.has(c.fixtureId)) continue; if(prod>=target) break; seen.add(c.fixtureId); picked.push(c); prod*=c.odd; if(picked.length>=30) break; }
    best=picked;
  }
  const games=best.map(g=>({home:g.home,away:g.away,league:g.league,kickoff:g.kickoff,date:g.date,market:g.market,pick:g.pick,odd:typeof g.odd==='number'?g.odd.toFixed(2):g.odd,reason:g.reason,sport:g.sport}));
  const combined=best.reduce((a,c)=>a*c.odd,1);
  const isLottery = target>=100;
  return {ok:true,parsed, games, combined:combined.toFixed(2), target:target, isLottery, label: isLottery?'BANGER / LOTTERY TICKET — High Risk. This na lottery, no be sure win. Play with money wey you fit lose.':'Smart Analysis — Picked from stored pool, no new API call.', note: isLottery?'You need '+games.length+' games to reach '+target+' odds. 1 cut = all cut.':''};
}


function isAdminUser(user){ if(!user||!user.email) return false; const list=(process.env.ADMIN_EMAILS||'drpillz4ever@gmail.com').split(',').map(s=>s.trim().toLowerCase()); return list.includes(user.email.toLowerCase()); }
function genPayId(){ const d=new Date(); const ymd=d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0'); return 'PAY-'+ymd+'-'+Math.random().toString(36).slice(2,8).toUpperCase(); }
async function grantSubscription(email, userId, plan, reference, payId, amount){
  const cfg=PLANS[plan]||{days:1,total:1,perDay:1};
  const expiresAt=new Date(Date.now()+cfg.days*24*3600*1000).toISOString();
  const now=new Date().toISOString();
  // Save payment with own PAY- ID for support/refunds
  try{ await supaPost('payments',{payment_id:payId||genPayId(),reference:reference||'',email:email,plan:plan,amount:amount||cfg.price,status:'success',created_at:now}); }catch(e){}
  // Upsert subscription: one active per email+plan
  try{
    const existing = await supaGet('subscriptions?email=eq.'+encodeURIComponent(email)+'&plan=eq.'+plan+'&select=*&limit=1');
    if(existing && existing.length){
      await supaPatch('subscriptions?id=eq.'+existing[0].id,{expires_at:expiresAt,slips_left:cfg.total||1,slips_total:cfg.total||1,status:'active',updated_at:now,payment_id:payId||''});
    } else {
      await supaPost('subscriptions',{email:email,user_id:userId||'',plan:plan,expires_at:expiresAt,slips_left:cfg.total||1,slips_total:cfg.total||1,status:'active',payment_id:payId||'',created_at:now});
    }
  }catch(e){}
  return {plan,expiresAt,slips_left:cfg.total||1};
}
async function getActiveSubscription(email){
  try{ const rows=await supaGet('subscriptions?email=eq.'+encodeURIComponent(email)+'&status=eq.active&select=*&order=created_at.desc&limit=5'); if(!rows||!rows.length) return null; const now=Date.now(); for(const r of rows){ if(new Date(r.expires_at).getTime()>now && (r.slips_left==null||r.slips_left>0)) return r; } return null; }catch(e){ return null; }
}


// V181: ONE free game, 1.50-2.00 enforced, same for all, 10AM WAT only
function v181ValidateFreeGame(games){
  if(!Array.isArray(games)) return null;
  const one = games.slice(0,1);
  if(!one.length) return null;
  const g = one[0];
  const odd = parseFloat(g.odd || g.odds || g.combined || 0);
  if(!(odd >= 1.50 && odd <= 2.00)) return null;
  g.combined = String(odd.toFixed(2));
  g.odd = g.combined;
  return {games:one, combined:g.combined};
}
async function v181SaveFreeSlip(date, validated, source){
  try{
    const g = validated.games[0];
    const row = {date, games: validated.games, combined: validated.combined, slip: validated.games, bookmaker: g.bookmaker||g.book||'Marathon Bet', selected_at: new Date().toISOString(), source: source||'cron-10am'};
    const ex = await supaGet('daily_slips?date=eq.'+date+'&select=*&limit=1');
    if(ex && ex.length){ await supaPatch('daily_slips?date=eq.'+date, row); return row; }
    await supaPost('daily_slips', row); return row;
  }catch(e){ return null; }
}

async function fetchRealFreeGames(force){
  const key=process.env.API_FOOTBALL_KEY;
  const bkey=process.env.API_BASKETBALL_KEY||key;
  const today=watToday();
  // 0) MEMORY cache: instant, no API call (skip if force = generate-now)
  if(!force && __memCache.date===today && __memCache.games && __memCache.games.length) return {ok:true,date:today,serverDate:today,serverNow:new Date().toISOString(),serverTimeMs:Date.now(),nextChangeMs:nextSlipChangeMs(),games:__memCache.games,combined:__memCache.combined,plan:'FREE',cached:true,source:'memory'};
  // 1) SUPABASE cache: same slip for everyone (skip if force)
  const cached=!force ? await supaGet('daily_slips?date=eq.'+today+'&select=*&limit=1') : null;
  if(cached && cached.length && cached[0].games){
    try{const g=typeof cached[0].games==='string'?JSON.parse(cached[0].games):cached[0].games; if(g && g.length){ __memCache={date:today,games:g,combined:cached[0].combined||'-',at:Date.now()}; return {ok:true,date:today,serverDate:today,serverNow:new Date().toISOString(),serverTimeMs:Date.now(),nextChangeMs:nextSlipChangeMs(),games:g,combined:cached[0].combined||'-',plan:'FREE',cached:true,source:'supabase'};}}catch(e){}
  }
  // V171: if quota already hit in last 6h, do NOT call API again - go straight to last saved slip
  if(Date.now() < __quotaExhaustedUntil){ try{ const last = await supaGet('daily_slips?order=date.desc&limit=1&select=*'); if(last && last.length && last[0].games){ const gg=typeof last[0].games==='string'?JSON.parse(last[0].games):last[0].games; if(gg && gg.length) return {ok:true,date:today,serverDate:today,serverNow:new Date().toISOString(),serverTimeMs:Date.now(),nextChangeMs:nextSlipChangeMs(),games:gg,combined:last[0].combined||'-',plan:'FREE',cached:true,source:'last-day-fallback',quotaExhausted:true}; } }catch(e){} }
  // 2) LOCK: if another visitor already generating, wait for it instead of burning API quota (this was killing the quota)
  if(__genLock) { try{ const r = await __genLock; if(r && r.games && r.games.length) return r; }catch(e){} }
  __genLock = (async()=>{
  const BLOCKED=[' II',' III','U19','U21','U23','RESERVE','YOUTH','WOMEN','ACADEMY','G LEAGUE'];
  function blocked(name){const n=(' '+(name||'').toUpperCase());return BLOCKED.some(x=>n.includes(x));}
  function cleanLeague(league, fallback){ if(!league) return fallback; const name=league.name||''; const country=league.country||''; if(!name) return fallback; if(!country||country==='undefined'||country==='null') return name; return name+' • '+country; }
  function cleanMarket(market, pick){ if(market==='Over/Under'||/Over\/Under/i.test(market)) return pick; if(market==='Goals Over/Under') return pick+' Goals'; let m=(market||'').replace(/Goals/g,'Points').replace(/Goal/g,'Point'); let p=(pick||'').replace(/Goals/g,'Points'); if(/Total Points/i.test(m)||/Total Goals/i.test(market)) return m+' — '+p; return m; }
  let candidates=[]; let allFixtures=[]; let apiErrors=[];
  // FOOTBALL fixtures - timezone Africa/Lagos so WAT day matches site day
  let fxList=[];
  for(const date of [today]){ try{ const r=await fetch('https://v3.football.api-sports.io/fixtures?date='+date+'&timezone=Africa%2FLagos',{headers:{'x-apisports-key':key}}); const fx=await r.json(); if(fx.errors && Object.keys(fx.errors).length) apiErrors.push('football-fixtures:'+JSON.stringify(fx.errors)); fxList = fx.response||[]; }catch(e){ apiErrors.push('football-fixtures:'+e.message); } }
  const _now=Date.now(); const flist = fxList.filter(f=>f.teams&&f.teams.home&&!blocked(f.league?.name)&&new Date(f.fixture.date).getTime()>_now-30*60000).slice(0,40);
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
      const list=(g.response||[]).filter(gm=>gm.teams&&gm.teams.home&&!blocked(gm.league?.name)&&new Date(gm.date).getTime()>Date.now()-30*60000).slice(0,4);
      for(const gm of list){ try{ const oRes=await fetch('https://v1.basketball.api-sports.io/odds?game='+gm.id,{headers:{'x-apisports-key':bkey}}); const oData=await oRes.json(); const bms=oData.response?.[0]?.bookmakers||[]; if(!bms.length) continue; const bm=bms[0]; const kickoff=new Date(gm.date).toLocaleString('en-NG',{timeZone:'Africa/Lagos',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}); const base={sport:'Basketball',home:gm.teams.home.name,away:gm.teams.away.name,league:cleanLeague(gm.league,'Basketball'),kickoff,fixtureId:'B'+gm.id}; for(const bet of (bm.bets||[])){ for(const v of (bet.values||[])){ const oo=parseFloat(v.odd); if(!isNaN(oo)&&oo>=1.05&&oo<=2.50) candidates.push({...base,market:cleanMarket(bet.name,v.value),pick:v.value,odd:oo,reason:'Real fixture + real bookmaker odd ('+bm.name+'). Basketball.'}); } } }catch(e){ continue; } }
    }catch(e){ apiErrors.push('basketball:'+e.message); }
  }
  const byKey={}; for(const c of candidates){const k=c.fixtureId+'|'+c.market+'|'+c.pick; if(!byKey[k]||c.odd<byKey[k].odd) byKey[k]=c;}
  let pool=Object.values(byKey).sort((a,b)=>(a.fixtureId+a.market+a.pick).localeCompare(b.fixtureId+b.market+b.pick));
  const seed=hashStr(today); pool=pool.map(c=>({...c,_s:hashStr(today+c.fixtureId+c.market+c.pick)})).sort((a,b)=>a._s-b._s).slice(0,24);
  function findCombo(n){ const idx=[]; function rec(start,depth){ if(depth===n){ const prod=idx.reduce((a,c)=>a*c.odd,1); if(prod>=1.50&&prod<=2.00) return [...idx]; return null; } for(let i=start;i<pool.length;i++){ if(idx.some(x=>x.fixtureId===pool[i].fixtureId)) continue; idx.push(pool[i]); const r=rec(i+1,depth+1); if(r) return r; idx.pop(); } return null; } return rec(0,0); }
  let best=null;
  // REAL AI CROSS-CHECK: let AI rank, then verify combined 1.50-2.00 with rule engine. AI never invents - only picks indexes from real pool.
  try{ const aiPicks = await aiCrossCheck(pool, today); if(aiPicks && aiPicks.length>=2){ const _seen={}; const aiCombo = aiPicks.filter(i=>pool[i]).map(i=>pool[i]).filter(c=>{if(_seen[c.fixtureId])return false; _seen[c.fixtureId]=1; return true;}).slice(0,3); const prod = aiCombo.reduce((a,c)=>a*c.odd,1); if(aiCombo.length>=2 && prod>=1.50 && prod<=2.00) best = aiCombo; } }catch(e){}
  if(!best) best=findCombo(3)||findCombo(2)||findCombo(1);
  let games, combined;
  if(best){ games=best.map(g=>({home:g.home,away:g.away,league:g.league,kickoff:g.kickoff,market:g.market,pick:g.pick,odd:g.odd.toFixed(2),reason:g.reason,sport:g.sport})); combined=best.reduce((a,c)=>a*c.odd,1).toFixed(2); }
  else {
    const seen={}; const fb=[];
    for(const c of pool){ if(fb.length>=3) break; if(seen[c.fixtureId]) continue; seen[c.fixtureId]=1; fb.push({home:c.home,away:c.away,league:c.league,kickoff:c.kickoff,market:c.market,pick:c.pick,odd:c.odd.toFixed(2),reason:c.reason,sport:c.sport}); }
    if(!fb.length && allFixtures.length){ for(const f of allFixtures.slice(0,3)) fb.push({home:f.home,away:f.away,league:f.league,kickoff:f.kickoff,market:'1X2',pick:'Check live odds',odd:'—',reason:'Real fixture from live provider. Check live odds before staking.',sport:f.sport}); }
    if(!fb.length){
      // V171 QUOTA GUARD: if API says limit/quota/403, do NOT keep calling. Serve last real slip so site never empty.
      const quotaHit = apiErrors.join(' ').toLowerCase().match(/403|rate|limit|quota|exceed|forbidden/);
      if(quotaHit) __quotaExhaustedUntil = Date.now() + 6*3600*1000;
      // LAST RESORT: yesterday's saved slip so box NEVER empty on launch day. Better to show yesterday's real slip than empty box.
      try{ const last = await supaGet('daily_slips?order=date.desc&limit=1&select=*'); if(last && last.length && last[0].games){ const gg=typeof last[0].games==='string'?JSON.parse(last[0].games):last[0].games; if(gg && gg.length) return {ok:true,date:today,serverDate:today,serverNow:new Date().toISOString(),serverTimeMs:Date.now(),nextChangeMs:nextSlipChangeMs(),games:gg,combined:last[0].combined||'-',plan:'FREE',cached:true,source:'last-day-fallback',quotaExhausted:!!quotaHit,debug:{fixtureCount:allFixtures.length,candidateCount:candidates.length,apiErrors}}; } }catch(e){}
      return {ok:true,date:today,serverDate:today,serverNow:new Date().toISOString(),serverTimeMs:Date.now(),nextChangeMs:nextSlipChangeMs(),games:[],combined:'-',message:'NO_FIXTURES',debug:{fixtureCount:allFixtures.length,candidateCount:candidates.length,apiErrors}};
    }
    games=fb; combined='-';
  }
  try{ await supaPost('daily_slips', {date:today,games:JSON.stringify(games),combined:combined}); }catch(e){}
  __memCache={date:today,games,combined,at:Date.now()};
  return {ok:true,date:today,serverDate:today,serverNow:new Date().toISOString(),serverTimeMs:Date.now(),nextChangeMs:nextSlipChangeMs(),games,combined,plan:'FREE',cached:false,debug:{fixtureCount:allFixtures.length,candidateCount:candidates.length,apiErrors}};
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
    if(endpoint==='ask-ai'){ const _u=await getUser(req); if(!_u) return res.status(401).json({ok:false,message:'Login first to use Ask AI.'}); const _sub=await getActiveSubscription(_u.email); if(!_sub) return res.status(403).json({ok:false,message:'Ask AI na for paid users. Subscribe to use am. FREE slip dey on top.'}); const body=req.body||{}; try{ const parsed=typeof body==='string'?JSON.parse(body):body; const r=await handleAskAI(parsed); if(r.ok && _sub && _sub.slips_left!=null){ try{ await supaPatch('subscriptions?id=eq.'+_sub.id,{slips_left:Math.max(0,_sub.slips_left-1)}); }catch(e){} } return res.json(r); }catch(e){ return res.json({ok:false,message:'Ask AI unavailable. Try again.'}); } }
    if(endpoint==='generate-now'){ const _au=await getUser(req); if(!_au||!isAdminUser(_au)) return res.status(403).json({ok:false,error:'Admin only. FREE game is selected by cron at 10:00 AM WAT.'}); res.setHeader('Cache-Control','no-store'); __memCache={date:'',games:null,combined:'-',at:0}; const r=await fetchRealFreeGames(true); const _vv = r && r.games ? v181ValidateFreeGame(r.games) : null; if(!_vv) return res.json({ok:false,error:'No qualifying 1.50-2.00 game found. Not published.'}); await v181SaveFreeSlip(r.date,_vv,'admin-generate'); return res.json({ok:true,generated:true,date:r.date,games:_vv.games,combined:_vv.combined}); }
    if(endpoint==='cron-daily'||endpoint==='warmup'){
      res.setHeader('Cache-Control','no-store');
      const _today2 = watToday();
      const _ex2 = await supaGet('daily_slips?date=eq.'+_today2+'&select=*&limit=1');
      if(_ex2 && _ex2.length && _ex2[0].games){ try{ const _gg = typeof _ex2[0].games==='string'?JSON.parse(_ex2[0].games):_ex2[0].games; const _arr = Array.isArray(_gg)?_gg:(_gg&&_gg.games?_gg.games:[]); if(_arr.length){ return res.json({ok:true,cron:true,date:_today2,already_exists:true,combined:_ex2[0].combined||'',count:1}); } }catch(e){} }
      const r=await fetchRealFreeGames(true);
      const _vv2 = r && r.games ? v181ValidateFreeGame(r.games) : null;
      if(!_vv2) return res.json({ok:false,cron:true,date:_today2,error:'No qualifying 1.50-2.00 game found. Not published.'});
      await v181SaveFreeSlip(_today2,_vv2,'cron-10am');
      return res.json({ok:true,cron:true,date:_today2,already_exists:false,combined:_vv2.combined,count:1,selected_at:new Date().toISOString()});
    }
    if(endpoint==='diag'){return res.json({ok:true,serverDate:watToday(),footballKey:!!process.env.API_FOOTBALL_KEY,basketballKey:!!process.env.API_BASKETBALL_KEY,geminiKey:!!process.env.GEMINI_API_KEY,groqKey:!!process.env.GROQ_API_KEY,openaiKey:!!process.env.OPENAI_API_KEY,supabaseUrl:!!process.env.SUPABASE_URL,serviceRole:!!process.env.SUPABASE_SERVICE_ROLE_KEY,paystackKey:!!process.env.PAYSTACK_SECRET_KEY});}
    if(endpoint==='free-slip'){
      res.setHeader('Cache-Control','no-store');
      const _uFree = await getUser(req);
      if(!_uFree) return res.status(401).json({ok:false,error:'Login required to view FREE game.'});
      const _today = watToday();
      const _cached = await supaGet('daily_slips?date=eq.'+_today+'&select=*&limit=1');
      if(!_cached || !_cached.length) return res.json({ok:false,error:'No FREE game yet for today. Check back after 10:00 AM WAT.',date:_today});
      let _g; try{ _g = typeof _cached[0].games==='string'?JSON.parse(_cached[0].games):_cached[0].games; if(_g && _g.games) _g=_g.games; }catch(e){ _g=null; }
      if(!_g || !_g.length) return res.json({ok:false,error:'No FREE game yet for today.',date:_today});
      const _v = v181ValidateFreeGame(_g);
      if(!_v) return res.json({ok:false,error:'FREE game does not meet 1.50-2.00. Admin to fix.',date:_today});
      return res.json({ok:true,date:_today,serverDate:_today,games:_v.games,combined:_v.combined,plan:'FREE',source:'daily_slips',bookmaker:_cached[0].bookmaker||_v.games[0].bookmaker||'Marathon Bet',selected_at:_cached[0].selected_at||null});
    }
    if(endpoint==='me'){const user=await getUser(req);if(!user)return res.status(401).json({ok:false,error:'Not logged in'}); const sub=await getActiveSubscription(user.email); return res.json({ok:true,profile:{email:user.email,plan:sub?sub.plan:'FREE',isAdmin:isAdminUser(user)},user:{email:user.email},subscription:sub});}
    if(endpoint==='paystack-init'){
      const user=await getUser(req);if(!user)return res.status(401).json({ok:false,error:'Login first'});
      let body=req.body||{}; if(typeof body==='string'){try{body=JSON.parse(body)}catch(e){body={}}}
      const plan=(body.plan||'').toString().toUpperCase();const cfg=PLANS[plan]; if(!cfg||plan==='FREE')return res.status(400).json({ok:false,error:'Invalid plan'});
      if(!process.env.PAYSTACK_SECRET_KEY)return res.status(500).json({ok:false,error:'Paystack secret not configured in Vercel'});
      const reference='ODD-'+Date.now()+'-'+Math.floor(Math.random()*100000);
      const init=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{Authorization:'Bearer '+process.env.PAYSTACK_SECRET_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:user.email,amount:cfg.price*100,reference,callback_url:'https://oddsgpt.com.ng/',metadata:{plan,user_id:user.id}})});
      const data=await init.json(); if(!data.status) return res.status(400).json({ok:false,error:data.message||'Paystack init failed'});
      try{ await supaPost('payments',{email:user.email,plan,amount:cfg.price,reference, payment_id:'PAY-'+reference, paystack_transaction_id:null, status:'pending', created_at:new Date().toISOString()}); }catch(e){}
      return res.json({ok:true,publicKey:process.env.PAYSTACK_PUBLIC_KEY,amount:cfg.price,reference,authorization_url:data.data.authorization_url,days:cfg.days});
    }
    if(endpoint==='paystack-verify'){
      let body=req.body||{}; if(typeof body==='string'){try{body=JSON.parse(body)}catch(e){body={}}}
      const ref=body.reference; if(!ref)return res.status(400).json({ok:false,error:'No reference'});
      const v=await fetch('https://api.paystack.co/transaction/verify/'+encodeURIComponent(ref),{headers:{Authorization:'Bearer '+process.env.PAYSTACK_SECRET_KEY}});
      const data=await v.json(); if(!data.status||data.data.status!=='success') return res.status(400).json({ok:false,error:'Payment not verified'});
      const plan=(data.data.metadata?.plan||'').toUpperCase(); const cfg=PLANS[plan]||{days:1};
      const email=(data.data.customer?.email||body.email||'').toString(); const userId=(data.data.metadata?.user_id||'').toString();
      const _existingPay = await supaGet('payments?reference=eq.'+encodeURIComponent(ref)+'&select=*&limit=1'); if(_existingPay && _existingPay.length) return res.json({ok:true,plan,expiresAt:new Date().toISOString(),amount:data.data.amount/100,paymentId:_existingPay[0].payment_id,reference:ref,duplicate:true}); const payId=genPayId(); const amount=data.data.amount/100;
      const sub=await grantSubscription(email, userId, plan, ref, payId, amount);
      return res.json({ok:true,plan,expiresAt:sub.expiresAt,amount,paymentId:payId,reference:ref,slips_left:sub.slips_left});
    }
    if(endpoint==='paystack-webhook'){
      // Paystack webhook: charge.success -> grant even if user closed popup. Verify via Paystack verify call.
      let body=req.body||{}; if(typeof body==='string'){try{body=JSON.parse(body)}catch(e){body={}}}
      const ev=body.event||''; const ref=body.data?.reference||''; if(ev!=='charge.success'||!ref) return res.json({ok:true,ignored:true});
      try{ const v=await fetch('https://api.paystack.co/transaction/verify/'+encodeURIComponent(ref),{headers:{Authorization:'Bearer '+process.env.PAYSTACK_SECRET_KEY}}); const data=await v.json(); if(data.status&&data.data.status==='success'){ const plan=(data.data.metadata?.plan||'').toUpperCase(); const email=(data.data.customer?.email||'').toString(); const userId=(data.data.metadata?.user_id||'').toString(); await grantSubscription(email,userId,plan,ref,genPayId(),data.data.amount/100); } }catch(e){}
      return res.json({ok:true,webhook:true});
    }
    // ---- ADMIN (hidden, ADMIN_EMAILS only) ----
    
    if(endpoint==='track-visit'){ try{ await supaPost('visits',{page:(req.body?.page||'home').toString().slice(0,50),referrer:(req.body?.referrer||'').toString().slice(0,200)}); }catch(e){} return res.json({ok:true}); }
    if(endpoint==='complaint'){ let body=req.body||{}; if(typeof body==='string'){try{body=JSON.parse(body)}catch(e){body={}}} const email=(body.email||'').toString().slice(0,120); const msg=(body.message||'').toString().slice(0,1000); const payId=(body.paymentId||'').toString().slice(0,50); if(!email||!msg) return res.status(400).json({ok:false,error:'Email + message required'}); try{ await supaPost('complaints',{email,message:msg,payment_id:payId,status:'open'}); }catch(e){} return res.json({ok:true,received:true}); }
    if(endpoint==='my-history'){ const user=await getUser(req); if(!user) return res.status(401).json({ok:false,error:'Login first'}); const rows=await supaGet('payments?email=eq.'+encodeURIComponent(user.email)+'&select=*&order=created_at.desc&limit=20'); return res.json({ok:true,history:rows||[]}); }
    if(endpoint==='forgot-password'){ let body=req.body||{}; if(typeof body==='string'){try{body=JSON.parse(body)}catch(e){body={}}} const email=(body.email||'').toString(); if(!email) return res.status(400).json({ok:false,error:'Email required'}); return res.json({ok:true,message:'If this email exists, a reset link has been sent. Check inbox + spam. Link expires in 1 hour.',note:'Frontend uses Supabase resetPasswordForEmail with redirect to https://www.oddsgpt.com.ng/?reset=true'}); }

    // V181-REQUIRED-CORRECTIONS-FINAL: NO admin-as-customer bypass. NO fake SportyBet hash. Real code = admin pastes real code from SportyBet app.
    if(endpoint==='admin-games'){ const user=await getUser(req); if(!user||!isAdminUser(user)) return res.status(403).json({ok:false,error:'Admin only'}); const pool=await supaGet('pools?select=*&order=created_at.desc&limit=1'); const slip=await supaGet('daily_slips?select=*&order=created_at.desc&limit=5'); const codes=await supaGet('booking_codes?select=*&order=created_at.desc&limit=10'); return res.json({ok:true,pool:pool||[],freeSlips:slip||[],bookingCodes:codes||[]}); }
    if(endpoint==='admin-fix-access'){ const user=await getUser(req); if(!user||!isAdminUser(user)) return res.status(403).json({ok:false,error:'Admin only'}); let body=req.body||{}; if(typeof body==='string'){try{body=JSON.parse(body)}catch(e){body={}}} const email=(body.email||'').toString(); const action=(body.action||'grant').toString(); const plan=(body.plan||'DAILY HUSTLE').toString(); const days=parseInt(body.days||1)||1; if(!email) return res.status(400).json({ok:false,error:'Email required'}); const exp=new Date(Date.now()+days*864e5).toISOString(); if(action==='revoke'){ try{ await supaPost('subscriptions',{email,plan:plan+'_REVOKED',status:'revoked',expires_at:new Date().toISOString()}); }catch(e){} return res.json({ok:true,action:'revoked',email}); } if(action==='extend'){ try{ await supaPost('subscriptions',{email,plan,status:'active',expires_at:exp}); }catch(e){} return res.json({ok:true,action:'extended',email,plan,expiresAt:exp}); } const payId=genPayId(); try{ await supaPost('payments',{payment_id:payId,email,plan,amount:0,reference:'ADMIN-GRANT-'+payId,status:'success'}); await supaPost('subscriptions',{email,plan,status:'active',expires_at:exp}); }catch(e){} return res.json({ok:true,action:'granted',email,plan,paymentId:payId,expiresAt:exp}); }
    if(endpoint==='admin-paste-sportybet-code'){ const user=await getUser(req); if(!user||!isAdminUser(user)) return res.status(403).json({ok:false,error:'Admin only'}); let body=req.body||{}; if(typeof body==='string'){try{body=JSON.parse(body)}catch(e){body={}}} const code=(body.code||'').toString().trim().toUpperCase(); const slipId=(body.slipId||'today').toString(); const games=(body.games||'').toString().slice(0,2000); if(!code||code.length<4) return res.status(400).json({ok:false,error:'Paste real code from SportyBet app. Example: code you see after you build slip for SportyBet.'}); try{ await supaPost('booking_codes',{code,fixture_ids:slipId,games_count:0, games_text:games}); }catch(e){} return res.json({ok:true,code,slipId,note:'Saved. Customers go see this EXACT code to copy-paste. This is real because you built it inside SportyBet app.'}); }
    if(endpoint==='get-booking-code'){ const slipId=(req.query?.slipId||req.body?.slipId||'today').toString(); const rows=await supaGet('booking_codes?select=*&order=created_at.desc&limit=5'); const match=(rows||[]).find(function(r){ return String(r.fixture_ids||'')===slipId; })|| (rows||[])[0] || null; if(!match) return res.json({ok:true,hasCode:false,note:'No real SportyBet code pasted yet for this slip. Use games list below to build slip yourself for SportyBet / 1xBet.'}); return res.json({ok:true,hasCode:true,code:match.code}); }

    // V178 AUTOMATIC: Customer asks -> code generates automatically, no admin paste per customer
    if(endpoint==='auto-generate-code'){ const user=await getUser(req); if(!user) return res.status(401).json({ok:false,error:'Login first'}); let body=req.body||{}; if(typeof body==='string'){try{body=JSON.parse(body)}catch(e){body={}}} const games=Array.isArray(body.games)?body.games:[]; const slipType=(body.slipType||'ASK-AI').toString().slice(0,30); const isAdmin = user && isAdminUser(user); // Admin bypass OFF in Clean, but auto-code works for all logged-in users
      // For FREE slip: if real SportyBet code already pasted for today, return it automatically
      if(slipType==='FREE'){ const rows=await supaGet('booking_codes?select=*&order=created_at.desc&limit=5'); const todayCode=(rows||[]).find(function(r){ return String(r.fixture_ids||'')==='today'; }); if(todayCode) return res.json({ok:true,automatic:true,code:todayCode.code,source:'REAL-SPORTYBET-PASTED',note:'Real SportyBet code pasted by admin for today - showing automatically'}); }
      // For ASK-AI / Paid: generate OddsGPT automatic code from games, automatically, no admin needed
      if(!games.length) return res.status(400).json({ok:false,error:'Games required to generate code'});
      const crypto2=require('crypto'); const payload=games.map(function(g){ return String(g.fixtureId||g.fixture_id||g.id||'')+':'+String(g.market||g.marketId||'')+':'+String(g.selection||g.pick||''); }).join('|');
      const hash=crypto2.createHash('sha256').update(payload+'|ODDSGPT-AUTO|'+Date.now()).digest('hex').toUpperCase();
      const autoCode='ODD-'+hash.slice(0,6); // Automatic OddsGPT code - maps to games list, shows instantly
      try{ await supaPost('booking_codes',{code:autoCode,fixture_ids:slipType,games_count:games.length,games_text:JSON.stringify(games).slice(0,2000)}); }catch(e){}
      // Also try to return real SportyBet code if admin pasted one for this slipType
      return res.json({ok:true,automatic:true,code:autoCode,source:'ODDSGPT-AUTO',games:games,note:'Code generated automatically for this slip. Customer: Copy code + use games list below to build slip for SportyBet / 1xBet in 2 mins. For FREE slip, real SportyBet code shows automatically if admin pasted it.'}); }
    if(endpoint==='admin-stats'){ const user=await getUser(req); if(!user||!isAdminUser(user)) return res.status(403).json({ok:false,error:'Admin only'}); const pays=await supaGet('payments?select=*&order=created_at.desc&limit=100'); const subs=await supaGet('subscriptions?select=*&order=created_at.desc&limit=100'); const slips=await supaGet('daily_slips?select=*&order=date.desc&limit=7'); const pools=await supaGet('pools?select=date&order=date.desc&limit=7'); return res.json({ok:true,totalPayments:(pays||[]).length,totalRevenue:(pays||[]).reduce((a,p)=>a+(p.amount||0),0),activeSubs:(subs||[]).filter(s=>s.status==='active').length,recentPayments:(pays||[]).slice(0,20),recentSubs:(subs||[]).slice(0,20),recentSlips:slips||[],pools:pools||[]}); }
    if(endpoint==='admin-grant'){ const user=await getUser(req); if(!user||!isAdminUser(user)) return res.status(403).json({ok:false,error:'Admin only'}); let body=req.body||{}; if(typeof body==='string'){try{body=JSON.parse(body)}catch(e){body={}}} const email=(body.email||'').toString(); const plan=(body.plan||'').toString().toUpperCase(); if(!email||!PLANS[plan]) return res.status(400).json({ok:false,error:'Email + valid plan required'}); const payId=genPayId(); const sub=await grantSubscription(email,'',plan,'MANUAL-'+payId,payId,PLANS[plan].price); return res.json({ok:true,manual:true,paymentId:payId,plan,expiresAt:sub.expiresAt}); }
    if(endpoint==='admin-payments'){ const user=await getUser(req); if(!user||!isAdminUser(user)) return res.status(403).json({ok:false,error:'Admin only'}); const q=req.query.q||''; let rows=await supaGet('payments?select=*&order=created_at.desc&limit=100'); if(q) rows=(rows||[]).filter(r=> (r.payment_id||'').includes(q)||(r.email||'').toLowerCase().includes(q.toLowerCase())||(r.reference||'').includes(q)); return res.json({ok:true,payments:rows||[]}); }
    if(endpoint==='admin-complaints'){ const user=await getUser(req); if(!user||!isAdminUser(user)) return res.status(403).json({ok:false,error:'Admin only'}); const rows=await supaGet('complaints?select=*&order=created_at.desc&limit=50'); return res.json({ok:true,complaints:rows||[]}); }
    if(endpoint==='admin-generate'){ const user=await getUser(req); if(!user||!isAdminUser(user)) return res.status(403).json({ok:false,error:'Admin only'}); __memCache={date:'',games:null,combined:'-',at:0}; const r=await fetchRealFreeGames(true); return res.json({ok:true,generated:true,date:r.date,games:r.games||[],combined:r.combined}); }
    if(endpoint==='admin-clear-pool'){ const user=await getUser(req); if(!user||!isAdminUser(user)) return res.status(403).json({ok:false,error:'Admin only'}); __poolCache={}; return res.json({ok:true,cleared:true}); }
return res.json({ok:true,message:'OddsGPT V171 backend running'});
  }catch(e){return res.status(500).json({ok:false,error:e.message||'Server error'});}
};
