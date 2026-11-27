// OddsGPT Backend V161 - REAL games + REAL prediction - Deploy as api/index.js in oddsgpt-backend repo
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
// --- V161: DAILY CACHED FREE SLIP - same for everyone, changes only 12AM WAT ---
async function supaGet(path){
  if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try{const r=await fetch(process.env.SUPABASE_URL+'/rest/v1/'+path,{headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY}}); if(!r.ok) return null; return await r.json();}catch(e){return null;}
}
async function supaPost(path, body){
  if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try{const r=await fetch(process.env.SUPABASE_URL+'/rest/v1/'+path,{method:'POST',headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+process.env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(body)}); if(!r.ok) return null; return await r.json();}catch(e){return null;}
}
function hashStr(s){let h=0; for(let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i); h|=0;} return Math.abs(h);}
async function fetchRealFreeGames(){
  const key=process.env.API_FOOTBALL_KEY;
  const bkey=process.env.API_BASKETBALL_KEY||key;
  if(!key) return {ok:false,error:'API_FOOTBALL_KEY not set in Vercel'};
  const today=watToday();
  // 1) CACHED: if today's slip already saved in Supabase, return SAME slip for everyone
  const cached=await supaGet('daily_slips?date=eq.'+today+'&select=*&limit=1');
  if(cached && cached.length && cached[0].games){
    try{const g=typeof cached[0].games==='string'?JSON.parse(cached[0].games):cached[0].games; if(g && g.length) return {ok:true,date:today,games:g,combined:cached[0].combined||'-',plan:'FREE',cached:true};}catch(e){}
  }
  const dates=[today];
  try{const d=new Date(today+'T12:00:00');d.setDate(d.getDate()+1);dates.push(d.toISOString().slice(0,10));}catch(e){}
  const BLOCKED=[' II',' III','U19','U21','U23','RESERVE','YOUTH','WOMEN','ACADEMY','G LEAGUE'];
  function blocked(name){const n=(' '+(name||'').toUpperCase());return BLOCKED.some(x=>n.includes(x));}
  let candidates=[]; let fixtureCount=0;
  // 2) FOOTBALL - collect MANY markets, odds 1.05-2.50 (so single 1.50-2.00 also possible)
  for(const date of dates){
    let fx={response:[]};
    try{const r=await fetch('https://v3.football.api-sports.io/fixtures?date='+date,{headers:{'x-apisports-key':key}});fx=await r.json();}catch(e){continue;}
    fixtureCount+=(fx.response||[]).length;
    for(const f of (fx.response||[])){
      if(candidates.length>=60) break;
      if(!f.teams||!f.teams.home) continue;
      if(blocked(f.league?.name)) continue;
      try{
        const oRes=await fetch('https://v3.football.api-sports.io/odds?fixture='+f.fixture.id,{headers:{'x-apisports-key':key}});
        const oData=await oRes.json();
        const bms=oData.response?.[0]?.bookmakers||[]; if(!bms.length) continue;
        const bm=bms[0]; const bets=bm.bets||[];
        const kickoff=new Date(f.fixture.date).toLocaleString('en-NG',{timeZone:'Africa/Lagos',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'});
        const base={sport:'Football',home:f.teams.home.name,away:f.teams.away.name,league:(f.league?f.league.name+' • '+f.league.country:'Football'),kickoff,fixtureId:'F'+f.fixture.id};
        function add(betName, pick, odd, market, reason){
          const o=parseFloat(odd); if(isNaN(o)||o<1.05||o>2.50) return;
          candidates.push({...base,market,pick,odd:o,reason:reason+' ('+bm.name+').'});
        }
        const dc=bets.find(x=>x.name==='Double Chance'); if(dc) for(const v of dc.values) add('DC',v.value,v.odd,'Double Chance','Real fixture + real bookmaker odd. Double Chance');
        const ou=bets.find(x=>x.name==='Goals Over/Under'); if(ou) for(const v of ou.values){ if(['Over 0.5','Over 1.5','Over 2.5','Under 2.5','Under 3.5'].includes(v.value)) add('OU',v.value,v.odd,v.value+' Goals','Real fixture + real bookmaker odd. '+v.value+' Goals');}
        const btts=bets.find(x=>/Both Teams|BTTS/i.test(x.name)); if(btts) for(const v of btts.values) add('BTTS',v.value,v.odd,'Both Teams To Score','Real fixture + real bookmaker odd. BTTS');
        const mw=bets.find(x=>x.name==='Match Winner'); if(mw) for(const v of mw.values) add('MW',v.value,v.odd,'1X2','Real fixture + real bookmaker odd. 1X2');
      }catch(e){continue;}
    }
    if(candidates.length>=60) break;
  }
  // 3) BASKETBALL - same pool for mix
  if(bkey){
    for(const date of dates){
      try{
        const r=await fetch('https://v1.basketball.api-sports.io/games?date='+date,{headers:{'x-apisports-key':bkey}});
        const g=await r.json(); fixtureCount+=(g.response||[]).length;
        for(const gm of (g.response||[]).slice(0,12)){
          if(candidates.length>=80) break;
          if(!gm.teams||!gm.teams.home) continue; if(blocked(gm.league?.name)) continue;
          try{
            const oRes=await fetch('https://v1.basketball.api-sports.io/odds?game='+gm.id,{headers:{'x-apisports-key':bkey}});
            const oData=await oRes.json(); const bms=oData.response?.[0]?.bookmakers||[]; if(!bms.length) continue;
            const bm=bms[0]; const bets=bm.bets||[];
            const kickoff=new Date(gm.date).toLocaleString('en-NG',{timeZone:'Africa/Lagos',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'});
            const base={sport:'Basketball',home:gm.teams.home.name,away:gm.teams.away.name,league:(gm.league?gm.league.name+' • '+gm.league.country:'Basketball'),kickoff,fixtureId:'B'+gm.id};
            for(const bet of bets){ for(const v of (bet.values||[])){ const o=parseFloat(v.odd); if(!isNaN(o)&&o>=1.05&&o<=2.50) candidates.push({...base,market:bet.name,pick:v.value,odd:o,reason:'Real fixture + real bookmaker odd ('+bm.name+'). Basketball.'}); if(candidates.length>=80) break; } if(candidates.length>=80) break; }
          }catch(e){continue;}
        }
      }catch(e){continue;}
    }
  }
  // 4) DETERMINISTIC pool: sort by fixture+market+pick so same input = same output for everyone
  const byKey={}; for(const c of candidates){const k=c.fixtureId+'|'+c.market+'|'+c.pick; if(!byKey[k]||c.odd<byKey[k].odd) byKey[k]=c;}
  let pool=Object.values(byKey).sort((a,b)=>(a.fixtureId+a.market+a.pick).localeCompare(b.fixtureId+b.market+b.pick));
  // Seed by date so today's pick is stable, tomorrow's differs
  const seed=hashStr(today); pool=pool.map((c,i)=>({...c,_s:hashStr(today+c.fixtureId+c.market+c.pick+i)})).sort((a,b)=>a._s-b._s).slice(0,30);
  // 5) SEARCH combos 3 -> 2 -> 1 that give 1.50-2.00, prefer mix + 3 games, first fit in deterministic order wins (stable)
  function findCombo(n){
    const idx=[]; function rec(start,depth){ if(depth===n){ const prod=idx.reduce((a,c)=>a*c.odd,1); if(prod>=1.50&&prod<=2.00) return [...idx]; return null; } for(let i=start;i<pool.length;i++){ idx.push(pool[i]); const r=rec(i+1,depth+1); if(r) return r; idx.pop(); } return null; } return rec(0,0);
  }
  let best=findCombo(3)||findCombo(2)||findCombo(1);
  let games, combined;
  if(best){
    games=best.map(g=>({home:g.home,away:g.away,league:g.league,kickoff:g.kickoff,market:g.market,pick:g.pick,odd:g.odd.toFixed(2),reason:g.reason,sport:g.sport}));
    combined=best.reduce((a,c)=>a*c.odd,1).toFixed(2);
  } else {
    // 6) ULTIMATE FALLBACK: never return empty if real fixtures exist - show 3 real fixtures, no invented odds
    // Use first 3 distinct fixtures from pool (or from fixtures if pool empty)
    const seen={}; const fb=[];
    for(const c of pool){ if(fb.length>=3) break; if(seen[c.fixtureId]) continue; seen[c.fixtureId]=1; fb.push({home:c.home,away:c.away,league:c.league,kickoff:c.kickoff,market:c.market,pick:c.pick,odd:c.odd.toFixed(2),reason:c.reason,sport:c.sport}); }
    if(!fb.length) return {ok:true,date:today,games:[],combined:'-',message:'API returned '+fixtureCount+' fixtures but no usable odds for today. Check API-Football quota in Vercel. No fake games shown.'};
    games=fb; combined='-';
  }
  // 7) SAVE today's slip to Supabase so next login/logout sees SAME slip until 12AM
  try{ await supaPost('daily_slips', {date:today,games:JSON.stringify(games),combined:combined}); }catch(e){}
  return {ok:true,date:today,games,combined,plan:'FREE',cached:false};
}
module.exports = async (req,res)=>{
  cors(res);
  if(req.method==='OPTIONS')return res.status(200).end();
  const endpoint=(req.query.endpoint||req.body?.endpoint||'').toString();
  try{
    if(endpoint==='status'){return res.json({ok:true,footballKey:!!process.env.API_FOOTBALL_KEY,basketballKey:!!process.env.API_BASKETBALL_KEY,aiKey:!!(process.env.GEMINI_API_KEY||process.env.GROQ_API_KEY),paystackKey:!!process.env.PAYSTACK_SECRET_KEY});}
    if(endpoint==='free-slip'){const r=await fetchRealFreeGames();return res.json(r);}
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
    return res.json({ok:true,message:'OddsGPT V161 backend running'});
  }catch(e){return res.status(500).json({ok:false,error:e.message||'Server error'});}
};
