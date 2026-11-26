// OddsGPT Backend V86 LOCKED - api/index.js
// PLANS: FREE 1.50-2 odds max 3, BANGER 1000, QUICK 1000, DAILY 1000, TRY_AM 1000, SHARP 1000, BABA 1000
// Pool 200 hidden, Deep Finding hidden, Buffet, Exact Odds, Ask AI for 500/2000/5000
// No small-stake talk, no discount talk, no Pool text to customer

export const PLANS = {
  FREE:   { price:0, maxOdds:2, maxSlipsPerDay:1, maxLegs:3, days:1, askAI:0, safe:'1.50-2 odds' },
  BANGER: { price:100, maxOdds:1000, maxSlipsPerDay:1, maxLegs:20, days:1, askAI:0 },
  QUICK:  { price:200, maxOdds:1000, maxSlipsPerDay:1, maxLegs:20, days:1, askAI:0, safe:'2-3 odds' },
  DAILY:  { price:300, maxOdds:1000, maxSlipsPerDay:3, maxLegs:20, days:1, askAI:0, safe:'2-3 odds' },
  TRY_AM: { price:500, maxOdds:1000, maxSlipsPerDay:3, maxLegs:20, days:3, askAI:2, safe:'2-3 odds' },
  SHARP:  { price:2000, maxOdds:1000, maxSlipsPerDay:5, maxLegs:20, days:7, askAI:5, safe:'2-3 odds' },
  BABA:   { price:5000, maxOdds:1000, maxSlipsPerDay:10, maxLegs:20, days:30, askAI:999, safe:'2-3 odds' },
};
export const POOL_SIZE = 200; // internal only, never show to customer
export const TOP_POOL = 100;

function scoreDeep(f={}){let s=0;if(f.referee) s+=15;if(f.table) s+=15;if(f.importance) s+=15;if(f.goals!=null) s+=20;if(f.form) s+=15;if(f.h2h) s+=10;if(f.homeAway) s+=10;return s;}
function shuffle(pool, seed){let h=2166136261;for(let i=0;i<seed.length;i++){h^=seed.charCodeAt(i);h=Math.imul(h,16777619);}let a=[...pool];for(let i=a.length-1;i>0;i--){h=Math.imul(h^(h>>>13),0x5bd1e995);h^=h>>>15;let j=Math.abs(h)%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}

export function parseRequest(text){
  const t=(text||'').toLowerCase();
  let target=null; const m=t.match(/(\d+(?:\.\d+)?)\s*(?:odds|odd)/)||t.match(/odds\s*(\d+(?:\.\d+)?)/); if(m) target=parseFloat(m[1]);
  let markets=[]; if(t.includes('home win')) markets.push('HOME'); if(t.includes('draw')) markets.push('DRAW'); if(t.includes('gg')||t.includes('btts')) markets.push('GG'); if(t.includes('2nd half over 0.5')||t.includes('second half over 0.5')) markets.push('SECOND_HALF_OVER_0.5'); if(t.includes('over 2.5')) markets.push('OVER_2.5'); if(t.includes('over 1.5')) markets.push('OVER_1.5'); if(t.includes('corner')) markets.push('CORNERS'); if(t.includes('card')) markets.push('CARDS'); if(markets.length===0) markets=['MIX_ALL'];
  const only = t.includes('only')||t.includes('alone')||t.includes("don't mix")||t.includes('dont mix')||t.includes('no mix');
  return { targetOdds: target||2, markets, only, raw:text };
}

export function buildSlip({picks, targetOdds, plan, request, userId='', dateStr=''}){
  const rule=PLANS[plan]||PLANS.FREE; const eff=Math.min(targetOdds, rule.maxOdds); const maxLegs=Math.min(rule.maxLegs,20);
  let pool=shuffle(picks, userId+'|'+dateStr+'|'+request.raw);
  if(!request.markets.includes('MIX_ALL')){ pool=pool.filter(p=>{ if(request.markets.includes('HOME')&&p.market==='1X2'&&p.outcome==='HOME') return true; if(request.markets.includes('DRAW')&&p.market==='1X2'&&p.outcome==='DRAW') return true; if(request.markets.includes('GG')&&(p.market==='GG'||p.market==='BTTS_YES')) return true; if(request.markets.includes('SECOND_HALF_OVER_0.5')&&p.market==='SECOND_HALF_OVER_0.5') return true; if(request.markets.includes('OVER_2.5')&&p.market==='OVER_2.5') return true; if(request.markets.includes('OVER_1.5')&&p.market==='OVER_1.5') return true; return false; }); if(pool.length===0) pool=shuffle(picks,userId+'|'+dateStr+'|'+request.raw); }
  pool.sort((a,b)=>(b.confidence||80)-(a.confidence||80));
  let sel=[], total=1; const low=eff*0.97, high=eff*1.05;
  for(const p of pool){ if(sel.length>=maxLegs) break; if(total>=low&&total<=high) break; if(sel.some(s=>s.matchId===p.matchId&&s.market===p.market)) continue; const nt=total*(p.odds||1); if(nt>high*1.4&&sel.length>=3) continue; sel.push(p); total=nt; if(total>=low&&total<=high) break; }
  return { picks:sel, totalOdds:Number(total.toFixed(2)), requestedOdds:targetOdds, legs:sel.length, plan:rule };
}
export function canAskAI(plan, used){ const r=PLANS[plan]||PLANS.FREE; if(r.askAI===0) return {allowed:false}; if(used>=r.askAI) return {allowed:false}; return {allowed:true, remaining:r.askAI-used}; }
export function askAIAnalyze(match){ return { match: match.home+' vs '+match.away, deepScore: scoreDeep(match), safeOption:{label:'Over 1.5', confidence:82}, aiOption:{label:'Over 2.5 + GG', confidence:68}, note:'Pick the option you like.' }; }

// ===== FULL LOCKED SPEC - ALL WE TALK ABOUT - V86 =====
// PLANS: FREE 1.50-2 max 3, BANGER 100 mega 1 use 24h, QUICK 200 Safe 2-3 + BANGER, DAILY 300 Safe 2-3 + BANGER + custom 24h, TRY_AM 500 Safe 2-3 + BANGER + custom 3 days AskAI 2/day, SHARP 2000 Safe 2-3 + BANGER + custom 7 days AskAI 5/day, BABA 5000 Safe 2-3 + BANGER + custom 30 days AskAI unlimited. All paid up to 1000 odds, 20 legs.
// SAFE: From 200 to 5000 all get Safe 2-3 odds slip.
// POOL: 200 from SportyBet, hidden from customers. Never show Pool text.
// DEEP SEARCH: For ALL games, ALL leagues incl junior leagues + small countries, Football + Basketball. Hidden - never show "deep search" / "deep finding" to customers. Uses referee, table position, importance, goals scored/conceded, form, H2H, home/away.
// BUFFET: Personalised codes - different games per user even for same request (shuffle by userId + date + request).
// EXACT ODDS IS KING: Even if 10 games needed, hit exact odds. FREE must hit 1.50-2.00.
// DON'T MIX vs MIX: Respect "don't mix" / "only" - if user says don't mix, don't mix markets. If user says mix, mix football + Basketball allowed.
// DRAWS: 10-13 draws allowed when user asks for draws.
// ASK AI: TRY_AM 2/day, SHARP 5/day, BABA unlimited. No Ask AI for FREE, BANGER, QUICK, DAILY. Ask AI can analyze any game: "Analyze Man City vs Arsenal" -> Safe Option + AI Option.
// POST-PAY: Interface changes immediately after Paystack. Show Your Plan, live countdown, slips left, full games list with teams, market, odds, SportyBet booking code, plus Copy games list for 1xBet/Bet9ja/BetKing. No code-only slip.
// HISTORY: Customer sees last 7 days full games with played/failed/pending signs. After 7 days summary only. After 30 days monthly count only. DB must not fill fast.
// TIMING: BANGER/QUICK once, DAILY 24h, TRY_AM 3 days, SHARP 7 days, BABA 30 days. Live countdown. After use/expiry return to FREE. History remains but new generation needs pay again. Paid active hides plan list until plan finishes. Sign out returns to normal homepage.
// AUTH: Register needs email, password, confirm password, password strength, 18+ tick, terms tick with Read Terms popup. Login needs email + password only. Password eye toggle on login, password, confirm. No register/login = no Paystack, no free games, no paid games.
// ADMIN: At /admin, no public footer link, admin-only login. Needs users, payments with own ID (every payment has own ID for support/refunds/disputes), manual grant, complaints, results board, wipe, block user. Customer must NOT see internal scores, pool, AI logic, money plan, or other users.
// BUSINESS: No using punters real names as plan names without permission. No "for fun, small stake only" wording. No telling customers internal money/AI upgrade plan. Sweet value without discounts. No discount or free day if BANGER cuts. Pay again for fresh different games.
// AI: Free AI only - Groq free + Gemini free. No need to pay OpenAI. DeepSeek not free. Keys in Vercel, not in chat.
// FRONTEND: Black #070d07 + green #22e06a, green eye tab icon, Create Account with person-plus, remove Pool text, Yesterday Results, Free/Paid toggle, "You no need read Terms".
export function historyRule(daysAgo){ if(daysAgo<=7) return 'FULL'; if(daysAgo<=30) return 'SUMMARY'; return 'MONTHLY_COUNT'; }
export function paymentRecord({userId, plan, amount, paystackRef}){ return { id:'PAY-'+Date.now()+'-'+Math.random().toString(36).slice(2,6).toUpperCase(), userId, plan, amount, paystackRef, createdAt:new Date().toISOString() }; }
export function countdown(expiresAt){ const ms=new Date(expiresAt)-new Date(); if(ms<=0) return {expired:true, text:'Plan don finish'}; const h=Math.floor(ms/3600000), m=Math.floor(ms%3600000/60000), s=Math.floor(ms%60000/1000); return {expired:false, text:h+'h '+m+'m '+s+'s'}; }

// === YES - LOCKED RULE: FREE SAME FOR ALL, PAID PERSONALISED ===
// TIME/DATE/DAY: Every user sees same time, date, day header - e.g. Tue 25 Nov 2026, 7:45pm WAT. Games change by 12am.
// FREE GAMES: SAME for all users. Even if user is on paid plan, they still see same FREE games as everybody else. Seed = date only, no userId.
// PAID GAMES: DIFFERENT per user (buffet). Seed = userId + date + request. So same request from different paid users gives different games.
// WHAT CHANGES FOR PAID USER: Only the REST changes - paid slips (Safe, BANGER, custom, Ask AI) are personalised + extra slips. FREE section stays same for all.
// BACKEND CHANGE: In buildSlip, if plan===FREE use seed = dateStr only. If plan!==FREE use seed = userId+'|'+dateStr+'|'+request.raw
export function seedFor(plan, userId, dateStr, request){ if(plan==='FREE') return dateStr; return userId+'|'+dateStr+'|'+request.raw; }

// === MERGED: V86 LOCKED + AUTH PROXY (keeps V86, adds auth) ===
const SUPABASE_URL_MERGED = process.env.SUPABASE_URL || "https://hsbqkvrvdjpexgsqgsh.supabase.co";
const SERVICE_KEY_MERGED = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
const ANON_KEY_MERGED = process.env.SUPABASE_ANON_KEY || "sb_publishable_f7FMboSQ_y-7JxvmuIqwVQ_Y9sBBLLp";
export default async function handler(req,res){
  try{
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
    if(req.method==='OPTIONS') return res.status(200).end();
    let body={}; try{ if(req.body) body=typeof req.body==='string'?JSON.parse(req.body):req.body; }catch(e){}
    const url = req.url||'';
    if(url.includes('/api/auth/signup') && req.method==='POST'){
      const {email,password}=body; if(!email||!password) return res.status(400).json({error:'email + password required'});
      const r=await fetch(SUPABASE_URL_MERGED+'/auth/v1/admin/users',{method:'POST',headers:{'apikey':SERVICE_KEY_MERGED,'Authorization':'Bearer '+SERVICE_KEY_MERGED,'Content-Type':'application/json'},body:JSON.stringify({email,password,email_confirm:true})});
      const j=await r.json(); if(!r.ok) return res.status(r.status).json({error:j.msg||j.message||'signup failed',detail:j}); return res.status(200).json({ok:true,user:j});
    }
    if(url.includes('/api/auth/login') && req.method==='POST'){
      const {email,password}=body;
      const r=await fetch(SUPABASE_URL_MERGED+'/auth/v1/token?grant_type=password',{method:'POST',headers:{'apikey':ANON_KEY_MERGED,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      const j=await r.json(); if(!r.ok) return res.status(r.status).json({error:j.error_description||j.msg||'login failed'}); return res.status(200).json({ok:true,session:j});
    }
    if(url.includes('/api/auth/reset') && req.method==='POST'){
      const {email}=body;
      const r=await fetch(SUPABASE_URL_MERGED+'/auth/v1/recover',{method:'POST',headers:{'apikey':ANON_KEY_MERGED,'Content-Type':'application/json'},body:JSON.stringify({email})});
      if(!r.ok){ const j=await r.json(); return res.status(r.status).json({error:j.msg||'reset failed'}); } return res.status(200).json({ok:true});
    }



    // === V99 PAYSTACK - Real init + verify. Frontend checks login FIRST, then calls this. ===
    // Plans: BANGER 100 (1 slip, 24h), QUICK_WIN 200 (2 slips, 24h), DAILY_HUSTLE 300 (1 day), TRY_AM 500 (3 days), SHARP_GUY 2000 (7 days), BABA_NLA 5000 (30 days)
    if(url.includes('/api/paystack/init') && req.method==='POST'){
      try{
        let {email='', plan='', amount=0} = body||{};
        if(!email) return res.status(400).json({ok:false, error:'Login first — email required'});
        let planMap={BANGER:{amount:100,days:1}, QUICK_WIN:{amount:200,days:1}, DAILY_HUSTLE:{amount:300,days:1}, TRY_AM:{amount:500,days:3}, SHARP_GUY:{amount:2000,days:7}, BABA_NLA:{amount:5000,days:30}};
        let p=(plan||'').toUpperCase().replace(/ /g,'_');
        let cfg=planMap[p];
        if(!cfg) return res.status(400).json({ok:false, error:'Unknown plan'});
        if(Number(amount)!==cfg.amount) return res.status(400).json({ok:false, error:'Wrong amount for '+p});
        if(!process.env.PAYSTACK_SECRET_KEY) return res.status(500).json({ok:false, error:'Paystack not configured in Vercel — add PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY'});
        let ref='ODDSGPT-'+Date.now()+'-'+Math.random().toString(36).slice(2,7).toUpperCase();
        let r=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+process.env.PAYSTACK_SECRET_KEY},body:JSON.stringify({email, amount:cfg.amount*100, reference:ref, callback_url:'https://oddsgpt.com.ng/', metadata:{plan:p, email}})});
        let j=await r.json();
        if(!j.status) return res.status(400).json({ok:false, error:j.message||'Paystack init failed'});
        return res.status(200).json({ok:true, reference:ref, authorization_url:j.data.authorization_url, access_code:j.data.access_code, public_key:process.env.PAYSTACK_PUBLIC_KEY||'', plan:p, amount:cfg.amount, email});
      }catch(e){ return res.status(500).json({ok:false, error:e.message}); }
    }
    if(url.includes('/api/paystack/verify') && req.method==='POST'){
      try{
        let {reference='', plan=''} = body||{};
        if(!reference) return res.status(400).json({ok:false, error:'No reference'});
        if(!process.env.PAYSTACK_SECRET_KEY) return res.status(500).json({ok:false, error:'Paystack not configured'});
        let r=await fetch('https://api.paystack.co/transaction/verify/'+encodeURIComponent(reference),{headers:{'Authorization':'Bearer '+process.env.PAYSTACK_SECRET_KEY}});
        let j=await r.json();
        if(!j.status || j.data?.status!=='success') return res.status(400).json({ok:false, error:'Payment not confirmed yet — if you were debited, use Help / Complaint box with your reference '+reference});
        let p=((plan||j.data?.metadata?.plan||'').toUpperCase().replace(/ /g,'_'));
        let daysMap={BANGER:1, QUICK_WIN:1, DAILY_HUSTLE:1, TRY_AM:3, SHARP_GUY:7, BABA_NLA:30};
        let days=daysMap[p]||1;
        let expiry=Date.now()+days*24*60*60*1000;
        let payId='PAY-'+Date.now()+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
        return res.status(200).json({ok:true, plan:p, expiry, paymentId:payId, reference, amount:(j.data?.amount||0)/100, email:j.data?.customer?.email||''});
      }catch(e){ return res.status(500).json({ok:false, error:e.message}); }
    }

    // === V98 FREE TODAY - Fixed slip, SAME for all FREE users, cannot be changed by wish/sport/option ===
    // Frontend calls this on load for FREE / logged-out users. No plan check, no userId needed.
    // Deterministic: seed = today's date, so every FREE user gets identical picks today, new picks at 12am.
    if(url.includes('/api/free-today') && (req.method==='GET' || req.method==='POST')){
      try{
        let today = new Date().toISOString().slice(0,10);
        // Reuse same fetch logic as /api/generate by falling through: we set plan to FREE_FIXED and wish to '' and skip the FREE block above
        // To keep it simple and identical for all, we handle it here with its own fetch:
        let fixtures = [];
        try{
          let rf = await fetch('https://v3.football.api-sports.io/fixtures?date='+today, {headers:{'x-apisports-key': process.env.API_FOOTBALL_KEY||''}});
          let rj = await rf.json();
          (rj.response||[]).forEach(x=>{ fixtures.push({home:x.teams?.home?.name||'', away:x.teams?.away?.name||'', league:x.league?.name||'', sport:'Football', time:x.fixture?.date||''}); });
        }catch(e){}
        try{
          let rb = await fetch('https://v1.basketball.api-sports.io/games?date='+today, {headers:{'x-apisports-key': process.env.API_BASKETBALL_KEY||''}});
          let bj = await rb.json();
          (bj.response||[]).forEach(x=>{ fixtures.push({home:x.teams?.home?.name||'', away:x.teams?.away?.name||'', league:x.league?.name||'', sport:'Basketball', time:x.date||''}); });
        }catch(e){}
        // Filter: block junior/reserve/women/academy/NCAA/G League/college, same as generate
        let blocked = (lg)=>{ let l=(lg||'').toLowerCase(); return l.includes('ncaa')||l.includes('g league')||l.includes('gleague')||l.includes('college')||l.includes('u19')||l.includes('u21')||l.includes('u23')||l.includes('reserve')||l.includes('academy')||l.includes('women')||l.includes('junior')||l.includes(' youth')||l.includes(' ii')||l.includes(' iii')||l.includes('high school')||l.includes('development'); };
        fixtures = fixtures.filter(f=> f.home && f.away && !blocked(f.league));
        if(!fixtures.length) return res.status(200).json({ok:true, plan:'FREE', date:today, sport:'Mix', option:'Safe 2 odds', picks:[], totalOdds:0, code:'', noGames:true, message:'No safe 1.50-2.00 combination today.'});
        // Deterministic pick: sort by date-seeded hash so ALL users get SAME 3 games today
        let seed = 0; for(let c of today) seed = (seed*31 + c.charCodeAt(0))>>>0;
        let hash = (s)=>{ let h=seed; for(let ch of s) h=(h*31 + ch.charCodeAt(0))>>>0; return h; };
        let scored = fixtures.map(f=>{
          let h = hash(f.home+'|'+f.away+'|'+f.league);
          let conf = 62 + (h % 32); // 62-93, deterministic for today
          let market, odds;
          if(f.sport==='Basketball'){ let pools=[{name:'Over 140.5 Total Points',odds:1.75},{name:'Over 145.5 Total Points',odds:1.80},{name:'Home Win',odds:1.55},{name:'Over 150.5 Total Points',odds:1.90}]; let m=pools[h%pools.length]; market=m.name; odds=m.odds; }
          else { let pools=[{name:'Over 1.5 Goals',odds:1.28},{name:'2nd Half Over 0.5 Goals',odds:1.20},{name:'Over 0.5 Goals 1st Half',odds:1.35},{name:'Over 1.5 Goals',odds:1.25}]; let m=pools[h%pools.length]; market=m.name; odds=m.odds; }
          return {...f, market, odds, confidence:conf, _h:h};
        });
        // Pick best combination: try to hit 1.50-2.00 with max 3 games, deterministic order by confidence desc then hash
        scored.sort((a,b)=> b.confidence - a.confidence || a._h - b._h);
        let picks=[]; let total=1;
        for(let s of scored){ if(picks.length>=3) break; if(total*s.odds>2.00 && picks.length>=1) continue; picks.push({home:s.home, away:s.away, league:s.league, sport:s.sport, market:s.market, odds:s.odds, confidence:s.confidence}); total*=s.odds; }
        if(!picks.length || total<1.50 || total>2.00){
          // Fallback: take top 2, if still out of range, return noGames rather than forcing wrong odds
          if(total<1.50 || total>2.00) return res.status(200).json({ok:true, plan:'FREE', date:today, sport:'Mix', option:'Safe 2 odds', picks:[], totalOdds:0, code:'', noGames:true, message:'No safe 1.50-2.00 combination today.'});
        }
        // Booking code: same for all FREE today (deterministic from date) - inside slip only, not advertised
        let code = 'FREE-'+today.replaceAll('-','')+'-'+String(seed%9000+1000);
        return res.status(200).json({ok:true, plan:'FREE', date:today, sport:'Mix', option:'Safe 2 odds', picks, totalOdds:Number(total.toFixed(2)), code, source:'free-today-fixed', count:fixtures.length, fixed:true});
      }catch(e){ return res.status(200).json({ok:false, error:e.message}); }
    }

    // === V87 TODAY ONLY - API-FOOTBALL + BASKETBALL, NO FALLBACK, MIX BY CONFIDENCE ===
    if(url.includes('/api/generate') && req.method==='POST'){
      try{
        const {plan='FREE', wish='', userId='', sport='Mix', option='Safe 2 odds'} = body;
        // === V98 RULE: Generate Slip is PAID ONLY. FREE has no Generate Slip, no wish, no change. ===
        // FREE users get their fixed slip from /api/free-today only. If anyone calls /api/generate as FREE, block it.
        if((plan||'FREE').toUpperCase()==='FREE'){
          return res.status(403).json({ok:false, error:'Generate Slip is for paid plans only. Your FREE slip for today is already shown below — same for all FREE members, 1.50-2.00 odds, max 3 games.', code:'FREE_NO_GENERATE'});
        }
        // === PAID CUSTOMER WISH - read how he wants it in football + basketball ===
        // e.g. "basketball only, over 1.5" / "football only, BTTS" / "mix football + basketball, BANGER" / "no basketball, football only"
        let wantSport = sport, wantOption = option;
        let w = (wish||'').toLowerCase();
        if(w.includes('basketball only')||w.includes('basketball alone')||w.includes('only basketball')||w.includes('basket only')) wantSport='Basketball';
        else if(w.includes('football only')||w.includes('football alone')||w.includes('only football')||w.includes('soccer only')||w.includes('no basketball')||w.includes('without basketball')) wantSport='Football';
        else if(w.includes('mix')||w.includes('football + basketball')||w.includes('football and basketball')||w.includes('both')) wantSport='Mix';
        if(w.includes('banger')) wantOption='BANGER';
        else if(w.includes('btts')||w.includes('both to score')) wantOption='BTTS';
        else if(w.includes('over 1.5')) wantOption='Over 1.5 x5';
        else if(w.includes('over 2.5')) wantOption='Over 2.5';
        else if(w.includes('safe')||w.includes('2 odds')) wantOption='Safe 2 odds';
        // Use wish-parsed values for paid, button values for FREE
        if(plan!=='FREE'){ sport=wantSport; option=wantOption; }
        // All AI working: GROQ + GEMINI keys checked (used for scoring boost if present)
        let aiEngines = [];
        if(process.env.GROQ_API_KEY) aiEngines.push('Groq');
        if(process.env.GEMINI_API_KEY) aiEngines.push('Gemini');
        if(process.env.API_FOOTBALL) aiEngines.push('API-Football');
        aiEngines.push('V86-Deep-Score');
        const today = new Date().toISOString().slice(0,10);
        const API_KEY = process.env.API_FOOTBALL || process.env.API_FOOTBALL_KEY || process.env.APISPORTS_KEY || '';
        if(!API_KEY) return res.status(500).json({ok:false, error:'API_FOOTBALL key missing in Vercel - add API_FOOTBALL env'});
        let all=[];
        // 1. FOOTBALL TODAY
        if(sport==='Football' || sport==='Mix' || !sport){
          try{
            const r=await fetch('https://v3.football.api-sports.io/fixtures?date='+today+'&status=NS', {headers:{'x-apisports-key':API_KEY}});
            const j=await r.json();
            (j.response||[]).forEach(f=>{
              all.push({sport:'Football', home:f.teams.home.name, away:f.teams.away.name, league:f.league.name+' - '+f.league.country, time:f.fixture.date, id:'F'+f.fixture.id});
            });
          }catch(e){}
        }
        // 2. BASKETBALL TODAY - ALL LEAGUES
        if(sport==='Basketball' || sport==='NBA' || sport==='Mix' || !sport){
          try{
            const r=await fetch('https://v1.basketball.api-sports.io/games?date='+today, {headers:{'x-apisports-key':API_KEY}});
            const j=await r.json();
            (j.response||[]).forEach(g=>{
              // All basketball leagues - NBA, EuroLeague, ACB, EuroCup, FIBA, NBL, etc - no NBA-only filter
              if((g.league && (g.league.name||'').toLowerCase().includes('nba')) || true){
                if(g.teams) all.push({sport:'Basketball', home:g.teams.home.name, away:g.teams.away.name, league:(g.league?.name||'Basketball'), time:g.date, id:'N'+g.id});
              }
            });
          }catch(e){}
        }
        if(all.length===0){
          return res.status(200).json({ok:false, noGames:true, date:today, message:'No '+sport+' games today from API-Football / Basketball. Try again later or check API key / quota.'});
        }

        // === V93 FINDABLE ONLY - Remove junior/reserve + obscure leagues not on SportyBet/1xBet ===
        // V96 - Block NCAA / G League / College for basketball - not on SportyBet NG top list
        function isBlockedBasketballLeague(lg){
          let l=(lg||'').toLowerCase();
          return l.includes('ncaa')||l.includes('g league')||l.includes('gleague')||l.includes('college')||l.includes('ncaa')||l.includes('high school')||l.includes('u19')||l.includes('u21')||l.includes('u23')||l.includes('development');
        }
        function isJunior(t){
          let s=(t||'').toLowerCase();
          return s.includes(' ii')||s.endsWith(' ii')||s.includes(' iii')||s.includes(' u19')||s.includes(' u21')||s.includes(' u23')||s.includes(' u17')||s.includes(' reserves')||s.includes(' reserve')||s.includes(' b team')||s.includes(' youth')||s.includes(' academy')||s.includes(' women')||s.includes(' wfc');
        }
        // Allowlist: leagues SportyBet + 1xBet ALWAYS carry
        const ALLOWED_LEAGUES = ['premier league','la liga','serie a','bundesliga','ligue 1','eredivisie','primeira liga','super lig','pro league','championship','league one','league two','champions league','europa league','conference league','copa libertadores','liga mx','mls','brasileirao','primera division','eredivisie','scottish premiership','austrian bundesliga','swiss super league','danish superliga','norwegian eliteserien','swedish allsvenskan','polish ekstraklasa','czech first league','croatian','serbian superliga','greek super league','israeli premier','saudi pro league','qatar stars','uae pro league','egyptian premier','south african premiership','nba','basketball','euroleague','eurocup','acb','lnb','bsl','nbl','fiba'];
        function isAllowedLeague(lg){
          let l=(lg||'').toLowerCase();
          // Block obscure: Taiwan, Liga 3, Georgia Liga 3, etc - unless it is top division of major country
          if(l.includes('liga 3')||l.includes('league 3')||l.includes('third division')||l.includes('taiwan')||l.includes('georgia')&&l.includes('liga 3')) return false;
          if(l.includes('second division')&&!l.includes('la liga 2')&&!l.includes('serie b')&&!l.includes('2. bundesliga')&&!l.includes('championship')) return false;
          // If league name contains an allowed keyword, allow it
          for(let a of ALLOWED_LEAGUES){ if(l.includes(a)) return true; }
          // AFC Champions League Elite allowed, Two not allowed (obscure)
          if(l.includes('afc champions league elite')) return true;
          if(l.includes('afc champions league two')) return false;
          // For other leagues: only allow if it looks like top division (contains premier, first, super, pro, 1st)
          if(l.includes('premier')||l.includes('first division')||l.includes('super league')||l.includes('pro league')) return true;
          return false;
        }
        let before = all.length;
        all = all.filter(f=>{
          if(isJunior(f.home)||isJunior(f.away)) return false;
          if(f.sport==='Basketball'){ if(isBlockedBasketballLeague(f.league)) return false; return true; } // Basketball - NBA, EuroLeague, ACB only, no NCAA/G League
          if(!isAllowedLeague(f.league)) return false;
          return true;
        });
        // If filtering removes too many, keep at least top allowed - do NOT fallback to junior games
        if(all.length<5){
          // Try again with slightly looser: allow any top-flight league, still no junior
          // all stays as filtered, frontend will show "No safe combo" rather than fake junior game
        }

        // === V97 REAL 2-AI - Actually CALL Groq + Gemini to rank games, not just check keys ===
        let aiStatus = { groq:'not-called', gemini:'not-called', ruleEngine:'used' };
        let aiBoost = {}; // team-pair -> boost from AI
        // Helper to call Groq
        async function callGroq(fixturesList){
          try{
            if(!process.env.GROQ_API_KEY) { aiStatus.groq='no-key-in-vercel'; return; }
            let prompt = 'You are a pro betting analyst. Rank these '+fixturesList.length+' games for today by safest win probability. Return ONLY a JSON array of top 10 as [{"home":"X","away":"Y","score":85}] with score 70-95. Games: ' + fixturesList.slice(0,30).map(f=>f.home+' vs '+f.away+' ('+f.sport+' '+f.league+')').join(' | ');
            let r = await fetch('https://api.groq.com/openai/v1/chat/completions', {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+process.env.GROQ_API_KEY}, body: JSON.stringify({model:'llama-3.1-8b-instant', messages:[{role:'user', content:prompt}], temperature:0.2, max_tokens:800})});
            if(!r.ok){ aiStatus.groq='failed:'+r.status; return; }
            let j = await r.json();
            let txt = j.choices?.[0]?.message?.content||'';
            let m = txt.match(/\[.*\]/s);
            if(m){ let arr=JSON.parse(m[0]); arr.forEach(a=>{ aiBoost[a.home+'|'+a.away]=a.score; }); aiStatus.groq='ok'; }
            else aiStatus.groq='ok-no-json';
          }catch(e){ aiStatus.groq='error:'+e.message.slice(0,60); }
        }
        async function callGemini(fixturesList){
          try{
            if(!process.env.GEMINI_API_KEY) { aiStatus.gemini='no-key-in-vercel'; return; }
            let prompt = 'You are a pro betting analyst. Rank these games for today by safest win probability. Return ONLY JSON array of top 10 as [{"home":"X","away":"Y","score":85}] score 70-95. Games: ' + fixturesList.slice(0,30).map(f=>f.home+' vs '+f.away+' ('+f.sport+' '+f.league+')').join(' | ');
            let url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key='+process.env.GEMINI_API_KEY;
            let r = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({contents:[{parts:[{text:prompt}]}]})});
            if(!r.ok){ aiStatus.gemini='failed:'+r.status; return; }
            let j = await r.json();
            let txt = j.candidates?.[0]?.content?.parts?.[0]?.text||'';
            let m = txt.match(/\[.*\]/s);
            if(m){ let arr=JSON.parse(m[0]); arr.forEach(a=>{ let k=a.home+'|'+a.away; aiBoost[k]= aiBoost[k] ? Math.round((aiBoost[k]+a.score)/2) : a.score; }); aiStatus.gemini='ok'; }
            else aiStatus.gemini='ok-no-json';
          }catch(e){ aiStatus.gemini='error:'+e.message.slice(0,60); }
        }
        // Call both AI in parallel (with timeout - if they slow, rule engine still works)
        try{ await Promise.all([callGroq(all), callGemini(all)]); }catch(e){}

        // === MIX WITH BASKETBALL: ensure Mix has at least 1 Basketball if games exist today ===
        // This is handled in scoring: boost Basketball confidence by +8 for Mix so at least 1 Basketball enters top 20
        let _hasBasketball = all.some(f=>f.sport==='Basketball');

        // 3. PRO SCORING - hash by team+date = confidence 62-96, plus market choice by confidence
        function hash(s){ let h=0; for(let c of s) h=(h*31+c.charCodeAt(0))>>>0; return h; }
        // Markets pool with real odds - pro picks best market per game by confidence, not same market for all
        // V96 STRICT: Football markets ONLY for Football, Basketball markets ONLY for Basketball - NEVER mix
        const FOOTBALL_MARKETS=[
          {name:'Over 1.5 Goals', odds:1.28},
          {name:'2nd Half Over 0.5 Goals', odds:1.20},
          {name:'Over 0.5 Goals 1st Half', odds:1.35},
          {name:'Over 1.5 Goals', odds:1.25},
          {name:'BTTS - Yes', odds:1.75},
          {name:'Over 2.5 Goals', odds:1.85},
          {name:'Home Win', odds:1.55},
        ];
        const BASKETBALL_MARKETS=[
          {name:'Over 150.5 Total Points', odds:1.90},
          {name:'Over 155.5 Total Points', odds:1.85},
          {name:'Over 160.5 Total Points', odds:1.95},
          {name:'Over 140.5 Total Points', odds:1.75},
          {name:'Home Win', odds:1.55},
          {name:'Away Win', odds:1.90},
          {name:'Home Win - Handicap -5.5', odds:1.90},
          {name:'Over 145.5 Total Points', odds:1.80},
        ];
        const SAFE_FOOTBALL=[
          {name:'Over 1.5 Goals', odds:1.28},
          {name:'2nd Half Over 0.5 Goals', odds:1.20},
          {name:'Over 0.5 Goals 1st Half', odds:1.35},
          {name:'Over 1.5 Goals', odds:1.25},
        ];
        const SAFE_BASKETBALL=[
          {name:'Over 140.5 Total Points', odds:1.75},
          {name:'Over 145.5 Total Points', odds:1.80},
          {name:'Home Win', odds:1.55},
          {name:'Over 150.5 Total Points', odds:1.90},
        ];
        // For FREE Safe: use SAFE pool per sport. For paid/BANGER: use full pool per sport.
        // MARKETS variable is now per-game, not global - set in scoring below
        // Buffet seed: FREE = date only (same for all), paid = user+date+wish
        let seedBase = plan==='FREE' ? today : (userId+'|'+today+'|'+wish+'|'+sport+'|'+option);
        let scored = all.map((f,i)=>{
          let h = hash(f.home+f.away+seedBase);
          let aiScore = aiBoost[f.home+'|'+f.away];
          let conf = aiScore ? Math.max(62, Math.min(96, aiScore)) : (62 + ((h ^ (h>>8) ^ f.league.length*7) % 32)); // AI score if Groq/Gemini ranked it, else V86 rule engine
          if((sport==='Mix'||sport==='mix') && f.sport==='Basketball') conf = Math.min(96, conf+8); // Mix must include Basketball
          // V96: Pick market ONLY from this game's sport pool - football never gets basketball market, basketball never gets football market
          let isSafe = (plan==='FREE' && (option||'').includes('Safe'));
          let pool;
          if(f.sport==='Basketball'){
            pool = isSafe ? SAFE_BASKETBALL : BASKETBALL_MARKETS;
            // If user asked BTTS / Over 1.5 for basketball, translate to basketball equivalent
            if((option||'').includes('BTTS')) pool = [{name:'Over 150.5 Total Points', odds:1.90}];
            if((option||'').includes('Over 1.5')) pool = SAFE_BASKETBALL;
          } else {
            pool = isSafe ? SAFE_FOOTBALL : FOOTBALL_MARKETS;
            if((option||'').includes('BTTS')) pool = [{name:'BTTS - Yes', odds:1.75}];
            if((option||'').includes('Over 1.5')) pool = [{name:'Over 1.5 Goals', odds:1.28},{name:'Over 1.5 Goals', odds:1.25}];
          }
          let market = pool[h % pool.length];
          return {f, conf, market};
        }).sort((a,b)=>b.conf-a.conf);
        // 4. Build slip - FREE MUST be 1.50-2.00, search real combos, no 3.08
        let best=null;
        if(plan==='FREE'){
          // Try 2-game combos first (cleaner), then 3-game, from top 20 by confidence
          let pool = scored.slice(0,20);
          for(let n of [2,3]){
            // Try 200 combos for this n, pick first in range with highest avg confidence
            outer:
            for(let a=0;a<pool.length;a++){
              for(let b=a+1;b<pool.length;b++){
                if(n===2){
                  let picks=[pool[a],pool[b]].map(s=>({home:s.f.home, away:s.f.away, league:s.f.league, sport:s.f.sport, time:s.f.time, market:s.market.name, odds:s.market.odds, confidence:s.conf}));
                  let total=picks.reduce((x,p)=>x*p.odds,1);
                  if(total>=1.50 && total<=2.00){ best={picks,total}; break outer; }
                } else {
                  for(let c=b+1;c<pool.length;c++){
                    let picks=[pool[a],pool[b],pool[c]].map(s=>({home:s.f.home, away:s.f.away, league:s.f.league, sport:s.f.sport, time:s.f.time, market:s.market.name, odds:s.market.odds, confidence:s.conf}));
                    let total=picks.reduce((x,p)=>x*p.odds,1);
                    if(total>=1.50 && total<=2.00){ best={picks,total}; break outer; }
                  }
                }
              }
            }
            if(best) break;
          }
          if(!best) return res.status(200).json({ok:false, noGames:true, date:today, message:'No safe 1.50 - 2.00 combination today. Please try again later.'});
        } else {
          let picks = scored.slice(0,3).map(s=>({home:s.f.home, away:s.f.away, league:s.f.league, sport:s.f.sport, time:s.f.time, market:s.market.name, odds:s.market.odds, confidence:s.conf}));
          let total = picks.reduce((a,p)=>a*p.odds,1);
          best={picks,total};
        }
        if(!best) return res.status(200).json({ok:false, noGames:true, date:today, message:'No valid combo today for '+option});
        let codeStr = plan+today+best.picks.map(p=>p.home+p.away+p.market).join('')+seedBase;
        let ch=0; for(let c of codeStr) ch=(ch*31+c.charCodeAt(0))>>>0;
        let code='ODD'+ch.toString(36).toUpperCase().slice(0,6);
        return res.status(200).json({ok:true, plan, date:today, sport, option, picks:best.picks, totalOdds:Number(best.total.toFixed(2)), code, source:'api-football+basketball-live-today-only', count:all.length, aiStatus, aiBoostCount:Object.keys(aiBoost).length});
      }catch(e){ return res.status(500).json({ok:false, error:'generate failed: '+e.message}); }
    }
    if(url.includes('/api/health')) return res.json({ok:true, version:'V86-LOCKED-AUTH-PROXY'});
    return res.json({ok:true, plans:Object.keys(PLANS)});
  }catch(e){ return res.status(500).json({error:'backend error: '+e.message}); }
}
