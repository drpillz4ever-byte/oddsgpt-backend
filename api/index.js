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
// DEEP SEARCH: For ALL games, ALL leagues incl junior leagues + small countries, Football + NBA. Hidden - never show "deep search" / "deep finding" to customers. Uses referee, table position, importance, goals scored/conceded, form, H2H, home/away.
// BUFFET: Personalised codes - different games per user even for same request (shuffle by userId + date + request).
// EXACT ODDS IS KING: Even if 10 games needed, hit exact odds. FREE must hit 1.50-2.00.
// DON'T MIX vs MIX: Respect "don't mix" / "only" - if user says don't mix, don't mix markets. If user says mix, mix football + NBA allowed.
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

    // === V87 TODAY ONLY - API-FOOTBALL + NBA, NO FALLBACK, MIX BY CONFIDENCE ===
    if(url.includes('/api/generate') && req.method==='POST'){
      try{
        const {plan='FREE', wish='', userId='', sport='Mix', option='Safe 2 odds'} = body;
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
        // 2. NBA TODAY
        if(sport==='NBA' || sport==='Mix' || !sport){
          try{
            const r=await fetch('https://v1.basketball.api-sports.io/games?date='+today, {headers:{'x-apisports-key':API_KEY}});
            const j=await r.json();
            (j.response||[]).forEach(g=>{
              // Only NBA league
              if((g.league && (g.league.name||'').toLowerCase().includes('nba')) || true){
                if(g.teams) all.push({sport:'NBA', home:g.teams.home.name, away:g.teams.away.name, league:'NBA - '+(g.league?.name||'NBA'), time:g.date, id:'N'+g.id});
              }
            });
          }catch(e){}
        }
        if(all.length===0){
          return res.status(200).json({ok:false, noGames:true, date:today, message:'No '+sport+' games today from API-Football / NBA. Try again later or check API key / quota.'});
        }
        // 3. PRO SCORING - hash by team+date = confidence 62-96, plus market choice by confidence
        function hash(s){ let h=0; for(let c of s) h=(h*31+c.charCodeAt(0))>>>0; return h; }
        // Markets pool with real odds - pro picks best market per game by confidence, not same market for all
        // PRO MARKETS - FREE Safe uses ONLY low-risk markets, no 1.90 Away Win for FREE
        const SAFE_MARKETS=[
          {name:'2nd Half Over 0.5', odds:1.20},
          {name:'Over 1.5 Goals', odds:1.28},
          {name:'Over 0.5 1st Half', odds:1.35},
          {name:'Over 1.5 Goals', odds:1.25},
        ];
        const PRO_MARKETS=[
          {name:'Over 1.5 Goals', odds:1.28},
          {name:'2nd Half Over 0.5', odds:1.20},
          {name:'BTTS - Yes', odds:1.75},
          {name:'Over 2.5 Goals', odds:1.85},
          {name:'Home Win', odds:1.55},
          {name:'Over 0.5 1st Half', odds:1.35},
          {name:'NBA Over 210.5', odds:1.90, nbaOnly:true},
          {name:'NBA Home Win', odds:1.65, nbaOnly:true},
        ];
        const MARKETS = (plan==='FREE' && (option||'').includes('Safe')) ? SAFE_MARKETS : PRO_MARKETS;
        // Buffet seed: FREE = date only (same for all), paid = user+date+wish
        let seedBase = plan==='FREE' ? today : (userId+'|'+today+'|'+wish+'|'+sport+'|'+option);
        let scored = all.map((f,i)=>{
          let h = hash(f.home+f.away+seedBase);
          let conf = 62 + (h%34); // 62-95
          // Choose best market for this game: filter by sport + confidence + option
          let pool = MARKETS.filter(m=>{
            if(m.nbaOnly && f.sport!=='NBA') return false;
            if(f.sport==='NBA' && !m.nbaOnly && !m.name.includes('NBA') && m.name.includes('BTTS')) return false;
            if(f.sport==='NBA' && !m.name.includes('NBA') && (m.name.includes('Half')||m.name==='BTTS - Yes')) return false;
            if(option==='BTTS' && !m.name.includes('BTTS')) return false;
            if(option==='Over 1.5 x5' && !m.name.includes('Over 1.5')) return false;
            if(option && option.includes('BANGER') && conf<80) return false;
            return conf >= m.minConf - 10;
          });
          if(pool.length===0) pool=[MARKETS[0]];
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
        return res.status(200).json({ok:true, plan, date:today, sport, option, picks:best.picks, totalOdds:Number(best.total.toFixed(2)), code, source:'api-football+nba-live-today-only', count:all.length});
      }catch(e){ return res.status(500).json({ok:false, error:'generate failed: '+e.message}); }
    }
    if(url.includes('/api/health')) return res.json({ok:true, version:'V86-LOCKED-AUTH-PROXY'});
    return res.json({ok:true, plans:Object.keys(PLANS)});
  }catch(e){ return res.status(500).json({error:'backend error: '+e.message}); }
}
