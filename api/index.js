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
export default function handler(req,res){ if(req.url?.includes('/api/health')) return res.json({ok:true, version:'V86-LOCKED'}); return res.json({ok:true, plans:Object.keys(PLANS)}); }

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
