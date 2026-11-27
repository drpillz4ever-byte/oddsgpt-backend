// OddsGPT Backend V155 - REAL games + REAL prediction - Deploy as api/index.js in oddsgpt-backend repo
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
  if(!key) return {ok:false,error:'API_FOOTBALL_KEY not set in Vercel'};
  const today=watToday();
  const fxRes=await fetch('https://v3.football.api-sports.io/fixtures?date='+today,{headers:{'x-apisports-key':key}});
  const fx=await fxRes.json();
  if(!fx.response || !fx.response.length) return {ok:true,date:today,games:[],combined:'-',message:'No real fixtures today from API-Football'};
  // Take first 12 fixtures, try to get real odds for each
  const games=[];
  for(const f of fx.response.slice(0,12)){
    if(games.length>=3) break;
    try{
      const oRes=await fetch('https://v3.football.api-sports.io/odds?fixture='+f.fixture.id+'&bookmaker=8',{headers:{'x-apisports-key':key}});
      const oData=await oRes.json();
      let pick=null, odd=null, market='1X2';
      // Find Match Winner odds
      const bets=oData.response?.[0]?.bookmakers?.[0]?.bets||[];
      const mw=bets.find(b=>b.name==='Match Winner');
      if(mw && mw.values && mw.values.length>=2){
        // Pick the lowest odd (favourite) - real odd from bookmaker, not invented
        const sorted=[...mw.values].sort((a,b)=>parseFloat(a.odd)-parseFloat(b.odd));
        const fav=sorted[0];
        pick=fav.value; odd=parseFloat(fav.odd);
        // Only use if odd is reasonable for FREE 1.50-2.00 combined (1.10-1.45 each)
        if(odd<1.10 || odd>1.60) continue;
      } else {
        continue; // Skip if no real odds - never invent
      }
      const kickoff=new Date(f.fixture.date).toLocaleString('en-NG',{timeZone:'Africa/Lagos',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'});
      games.push({
        home:f.teams.home.name, away:f.teams.away.name,
        league:f.league.name+' • '+f.league.country,
        kickoff, market, pick, odd:odd.toFixed(2),
        reason:'Real fixture + real bookmaker odd. Favourite from live odds. No invented stats.'
      });
    }catch(e){ continue; }
  }
  if(!games.length) return {ok:true,date:today,games:[],combined:'-',message:'Real fixtures exist but no usable real odds for FREE range today.'};
  let combined=1; games.forEach(g=>combined*=parseFloat(g.odd));
  return {ok:true,date:today,games,combined:combined.toFixed(2),plan:'FREE'};
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
    return res.json({ok:true,message:'OddsGPT V155 backend running'});
  }catch(e){return res.status(500).json({ok:false,error:e.message||'Server error'});}
};
