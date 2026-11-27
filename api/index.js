// OddsGPT Backend V159 - REAL games + REAL prediction - Deploy as api/index.js in oddsgpt-backend repo
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
async function fetchRealFreeGames(){
  const key=process.env.API_FOOTBALL_KEY;
  const bkey=process.env.API_BASKETBALL_KEY||key;
  if(!key) return {ok:false,error:'API_FOOTBALL_KEY not set in Vercel'};
  const today=watToday();
  const dates=[today];
  try{const d=new Date(today+'T12:00:00');d.setDate(d.getDate()+1);dates.push(d.toISOString().slice(0,10));}catch(e){}
  const BLOCKED=[' II',' III','U19','U21','U23','RESERVE','YOUTH','WOMEN','ACADEMY','G LEAGUE'];
  function blocked(name){const n=(' '+(name||'').toUpperCase());return BLOCKED.some(x=>n.includes(x));}
  let candidates=[];
  // 1) FOOTBALL - collect LOW-odd candidates (Double Chance, Over 0.5, Match Winner favourite <1.35)
  for(const date of dates){
    if(candidates.length>=40) break;
    let fx={response:[]};
    try{const r=await fetch('https://v3.football.api-sports.io/fixtures?date='+date,{headers:{'x-apisports-key':key}});fx=await r.json();}catch(e){continue;}
    for(const f of (fx.response||[])){
      if(candidates.length>=40) break;
      if(!f.teams||!f.teams.home) continue;
      if(blocked(f.league?.name)) continue;
      try{
        const oRes=await fetch('https://v3.football.api-sports.io/odds?fixture='+f.fixture.id,{headers:{'x-apisports-key':key}});
        const oData=await oRes.json();
        const bms=oData.response?.[0]?.bookmakers||[];
        if(!bms.length) continue;
        const bm=bms[0];
        const bets=bm.bets||[];
        const kickoff=new Date(f.fixture.date).toLocaleString('en-NG',{timeZone:'Africa/Lagos',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'});
        const base={sport:'Football',home:f.teams.home.name,away:f.teams.away.name,league:(f.league?f.league.name+' • '+f.league.country:'Football'),kickoff,fixtureId:'F'+f.fixture.id};
        // Double Chance - best for low combined
        const dc=bets.find(x=>x.name==='Double Chance');
        if(dc) for(const v of dc.values){const o=parseFloat(v.odd); if(o>=1.10&&o<=1.40) candidates.push({...base,market:'Double Chance',pick:v.value,odd:o,reason:'Real fixture + real bookmaker odd ('+bm.name+'). Double Chance.'});}
        // Over 0.5 goals
        const ou=bets.find(x=>x.name==='Goals Over/Under');
        if(ou){const ov=ou.values.find(v=>v.value==='Over 0.5'); if(ov){const o=parseFloat(ov.odd); if(o>=1.05&&o<=1.35) candidates.push({...base,market:'Over 0.5 Goals',pick:'Over 0.5',odd:o,reason:'Real fixture + real bookmaker odd ('+bm.name+'). Over 0.5 Goals.'});}}
        // Match Winner favourite only if low
        const mw=bets.find(x=>x.name==='Match Winner');
        if(mw){const s=[...mw.values].sort((a,b)=>parseFloat(a.odd)-parseFloat(b.odd)); const fav=s[0]; const o=parseFloat(fav.odd); if(o>=1.10&&o<=1.35) candidates.push({...base,market:'1X2',pick:fav.value,odd:o,reason:'Real fixture + real bookmaker odd ('+bm.name+'). Favourite.'});}
      }catch(e){continue;}
    }
  }
  // 2) BASKETBALL - Moneyline / Total Over low odds, to allow mix
  if(bkey){
    for(const date of dates){
      if(candidates.length>=50) break;
      try{
        const r=await fetch('https://v1.basketball.api-sports.io/games?date='+date,{headers:{'x-apisports-key':bkey}});
        const g=await r.json();
        for(const gm of (g.response||[]).slice(0,10)){
          if(candidates.length>=50) break;
          if(!gm.teams||!gm.teams.home) continue;
          if(blocked(gm.league?.name)) continue;
          try{
            const oRes=await fetch('https://v1.basketball.api-sports.io/odds?game='+gm.id,{headers:{'x-apisports-key':bkey}});
            const oData=await oRes.json();
            const bms=oData.response?.[0]?.bookmakers||[];
            if(!bms.length) continue;
            const bm=bms[0]; const bets=bm.bets||[];
            const kickoff=new Date(gm.date).toLocaleString('en-NG',{timeZone:'Africa/Lagos',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'});
            const base={sport:'Basketball',home:gm.teams.home.name,away:gm.teams.away.name,league:(gm.league?gm.league.name+' • '+gm.league.country:'Basketball'),kickoff,fixtureId:'B'+gm.id};
            const ml=bets.find(x=>/Moneyline|Match Winner|Winner/i.test(x.name));
            if(ml){const s=[...ml.values].sort((a,b)=>parseFloat(a.odd)-parseFloat(b.odd)); const fav=s[0]; const o=parseFloat(fav.odd); if(o>=1.10&&o<=1.40) candidates.push({...base,market:'Moneyline',pick:fav.value,odd:o,reason:'Real fixture + real bookmaker odd ('+bm.name+'). Basketball favourite.'});}
          }catch(e){continue;}
        }
      }catch(e){continue;}
    }
  }
  if(!candidates.length) return {ok:true,date:today,games:[],combined:'-',message:'Real fixtures exist but no low-odd (1.10-1.40) candidates found for 1.50-2.00 combo today. No fake games shown.'};
  // 3) SEARCH for combo of 2 or 3 DIFFERENT fixtures whose product is 1.50-2.00, closest to 1.75
  // Deduplicate by fixtureId+market+pick, keep lowest odd per fixture for diversity
  const byFix={}; for(const c of candidates){if(!byFix[c.fixtureId]||c.odd<byFix[c.fixtureId].odd) byFix[c.fixtureId]=c;}
  const pool=Object.values(byFix);
  let best=null, bestScore=999;
  function tryCombo(arr){
    if(arr.length<2) return;
    const prod=arr.reduce((a,c)=>a*c.odd,1);
    if(prod<1.50||prod>2.00) return;
    const score=Math.abs(prod-1.75);
    // Prefer mix (football+basketball) and 3 games
    const hasMix=new Set(arr.map(a=>a.sport)).size>1;
    const adj=score - (hasMix?0.05:0) - (arr.length===3?0.03:0);
    if(adj<bestScore){bestScore=adj; best=arr;}
  }
  // Try 3-game combos
  for(let i=0;i<pool.length;i++) for(let j=i+1;j<pool.length;j++) for(let k=j+1;k<pool.length;k++) tryCombo([pool[i],pool[j],pool[k]]);
  // Try 2-game combos if no 3-game found
  if(!best) for(let i=0;i<pool.length;i++) for(let j=i+1;j<pool.length;j++) tryCombo([pool[i],pool[j]]);
  if(!best) return {ok:true,date:today,games:[],combined:'-',message:'Could not build 1.50-2.00 combo from real low odds today (all combos above 2.00 or below 1.50). No fake games shown - try again after odds update.'};
  const games=best.map(g=>({home:g.home,away:g.away,league:g.league,kickoff:g.kickoff,market:g.market,pick:g.pick,odd:g.odd.toFixed(2),reason:g.reason,sport:g.sport}));
  const combined=best.reduce((a,c)=>a*c.odd,1).toFixed(2);
  return {ok:true,date:today,games,combined,plan:'FREE'};
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
    return res.json({ok:true,message:'OddsGPT V159 backend running'});
  }catch(e){return res.status(500).json({ok:false,error:e.message||'Server error'});}
};
