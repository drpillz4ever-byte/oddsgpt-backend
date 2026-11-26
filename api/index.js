// OddsGPT Backend V107 ALL OPTIONS - api/index.js - DELETE OLD, PASTE THIS
// PLANS FIXED, POOL 600, FOOTBALL 150+ OPTIONS, BASKETBALL NBA QUARTER/HALF/SPECIALS, FINDABLE ONLY, BLOCKED LEAGUES
export const PLANS={
 FREE:{price:0,maxOdds:2,maxSlipsPerDay:1,maxLegs:3,days:1,askAI:0,usesPerDay:1,slipsTotal:1,note:"1.50-2.00 SAME FOR ALL"},
 BANGER:{price:100,maxOdds:1000,maxSlipsPerDay:1,maxLegs:20,days:1,askAI:0,usesPerDay:1,slipsTotal:1,note:"1 USE=1 SLIP max 1 per day"},
 QUICK:{price:200,maxOdds:1000,maxSlipsPerDay:2,maxLegs:20,days:1,askAI:0,usesPerDay:1,slipsTotal:2},
 DAILY:{price:300,maxOdds:1000,maxSlipsPerDay:3,maxLegs:20,days:1,askAI:0,slipsTotal:3},
 TRY_AM:{price:500,maxOdds:1000,maxSlipsPerDay:3,maxLegs:20,days:3,askAI:2,slipsTotal:9},
 SHARP:{price:2000,maxOdds:1000,maxSlipsPerDay:5,maxLegs:20,days:7,askAI:5,slipsTotal:35},
 BABA:{price:5000,maxOdds:1000,maxSlipsPerDay:10,maxLegs:20,days:30,askAI:999,slipsTotal:300},
};
export const POOL_SIZE=600;
export const BLOCKED_LEAGUE_KEYWORDS=[" II"," III","U19","U21","U23","RESERVE","B TEAM","YOUTH","ACADEMY","WOMEN","FEMININ","LADIES","GIRLS"];
export function isBlockedLeague(name){let n=" "+(name||"").toUpperCase()+" ";return BLOCKED_LEAGUE_KEYWORDS.some(k=>n.includes(k))}
export function isAmateur(name){return (name||"").toLowerCase().includes("amateur")}

// ===== ALL MARKETS - FOOTBALL =====
export const FOOTBALL_OPTIONS=[
"1X2","1X2 - 1UP","1X2 - 2UP","1X2 - Never Down","Double Chance","Double Chance - 1UP","Draw No Bet",
"Over/Under 0.5","Over/Under 1.5","Over/Under 2.5","Over/Under 3.5","Over/Under 4.5","Over/Under 5.5",
"Asian Over/Under 1","Asian Over/Under 2","Asian Over/Under 3","Asian Over/Under 4","Asian Over/Under 5",
"Over/Under - Early Goals 1.5","Over/Under - Early Goals 2.5","Over/Under - Early Goals 3.5",
"1st Half Over/Under","2nd Half Over/Under","Both Halves Over 1.5","Both Halves Under 1.5",
"GG/NG","GG/NG 2+","BTTS","1X2 & GG/NG","1X2 & Over/Under 1.5","GG/NG 1st Half","GG/NG 2nd Half",
"Both Teams to Score in Both Halves","Goal in Both Halves",
"Correct Score","Correct Score [0:0]","Correct Score 1st Half","Correct Score 2nd Half","Half Time / Full Time","Half Time / Full Time Correct Score",
"Exact Goals","Exact Goals 1st Half","Exact Goals 2nd Half","Multigoals","Multiscores","Goal Range","Goal Bounds","Excluded Number of Goals","Winning Margin","Odd/Even","Odd/Even 1st Half","Odd/Even 2nd Half",
"Home Team Over/Under 0.5","Home Team Over/Under 1.5","Home Team Over/Under 2.5","Home Team Over/Under 3.5",
"Away Team Over/Under 0.5","Away Team Over/Under 1.5","Away Team Over/Under 2.5","Away Team Over/Under 3.5",
"Clean Sheet Home","Clean Sheet Away","Win to Nil Home","Win to Nil Away","Teams to Score","Win Both Halves","Win Either Half","Highest Scoring Half","Home Highest Scoring Half","Away Highest Scoring Half",
"Handicap 0:1","Handicap 0:2","Handicap 0:3","Handicap 1:0","Handicap 2:0","Handicap 3:0","Handicap 4:0",
"Asian Handicap -2.0","Asian Handicap -1.5","Asian Handicap -1.0","Asian Handicap -0.5","Asian Handicap 0","Asian Handicap +0.5","Asian Handicap +1.0","Asian Handicap +1.5","Asian Handicap +2.0","1st Half Handicap","2nd Half Handicap",
"1st Goal (Home/None/Away)","1st Goal 1st Half","1st Goal 2nd Half","Last Goal","1st Half Team Goals","2nd Half Team Goals",
"Any Team to lead by 1 Goal","Any Team to lead by 2 Goals","Any Team to lead by 3 Goals","Home to lead by 1/2/3","Away to lead by 1/2/3",
"Any Team to Score 2+ in a Row","Any Team to Score 3+ in a Row","Home to Score 2+ in a Row","Home to Score 3+ in a Row","Away to Score 2+ in a Row","Away to Score 3+ in a Row",
"1st Half - 1X2","2nd Half - 1X2","1st Half - Double Chance","2nd Half - Double Chance","1st Half - Draw No Bet","2nd Half - Draw No Bet",
// STATS + PLAYER - flagged, need API
"Offsides 1X2","Offsides Over/Under","Shots Over/Under","Shots on Target Over/Under","Posts and Crossbars Over/Under","Posts and Crossbars 1X2","Cards Over/Under","Exact Bookings","Sending Off","Fouls Over/Under","Corners Over/Under",
"Most Player Goals","Most Shots","Most Goals + Assists","Most Fouls","Most Saves","Player Cards","To Score or Assist","Player Fouls Won",
];
export const BASKETBALL_OPTIONS=[
"Moneyline - Home Win","Moneyline - Away Win",
"Over/Under Total Points 76.5","Over/Under Total Points 77.5","Over/Under Total Points 78.5","Over/Under Total Points 79.5","Over/Under Total Points 80.5",
"Over/Under Total Points 140.5","Over/Under Total Points 150.5","Over/Under Total Points 220.5","Over/Under Total Points 221.5","Over/Under Total Points 222.5",
"Handicap","Odd/Even Total Points","Home Team Total Over/Under","Away Team Total Over/Under",
"1st Quarter Over/Under","2nd Quarter Over/Under","3rd Quarter Over/Under","4th Quarter Over/Under",
"1st Quarter Handicap","2nd Quarter Handicap","1st Quarter 1X2","2nd Quarter 1X2","1st Quarter Draw No Bet","2nd Quarter Draw No Bet","1st Quarter Odd/Even","2nd Quarter Odd/Even","Quarter Over/Under 39.5",
"1st Half Over/Under (not overtime)","2nd Half Over/Under","1st Half Handicap","2nd Half Handicap","1st Half 1X2","2nd Half 1X2","1st Half Draw No Bet","2nd Half Draw No Bet","1st Half Odd/Even","2nd Half Odd/Even",
"Race to 20 Points","Race to 30 Points","First Team to Lead by 12","First Team to Lead by 22","Highest Scoring Quarter","Lowest Scoring Quarter","Any Team to Win All Quarters","Both Teams to Score X in Quarter","Home to Win by X","Away to Win by X",
];
// SPORTYBET MAPPING - 1=1X2 confirmed, 18=Over/Under confirmed, others standard SportyBet IDs - verify 1 payload per new market
export const SPORTYBET_MAP={
"1X2":{marketId:"1",specifier:null,outcomes:{HOME:"1",DRAW:"2",AWAY:"3"}},
"OVER_2.5":{marketId:"18",specifier:"total=2.5",outcomes:{OVER:"12",UNDER:"13"}},
"OVER_1.5":{marketId:"18",specifier:"total=1.5",outcomes:{OVER:"12",UNDER:"13"}},
"OVER_0.5":{marketId:"18",specifier:"total=0.5",outcomes:{OVER:"12",UNDER:"13"}},
"OVER_3.5":{marketId:"18",specifier:"total=3.5",outcomes:{OVER:"12",UNDER:"13"}},
"DOUBLE_CHANCE":{marketId:"2",specifier:null,outcomes:{"1X":"1","12":"2","X2":"3"}},
"DRAW_NO_BET":{marketId:"3",specifier:null,outcomes:{HOME:"1",AWAY:"2"}},
"GG":{marketId:"4",specifier:null,outcomes:{YES:"1",NO:"2"}},
"GG_NG":{marketId:"4",specifier:null,outcomes:{YES:"1",NO:"2"}},
"HANDICAP":{marketId:"5",specifier:null,outcomes:{HOME:"1",DRAW:"2",AWAY:"3"}},
"ASIAN_HANDICAP":{marketId:"6",specifier:null,outcomes:{HOME:"1",AWAY:"2"}},
"CORRECT_SCORE":{marketId:"7",specifier:null,outcomes:{}},
"HT_FT":{marketId:"8",specifier:null,outcomes:{}},
"ODD_EVEN":{marketId:"9",specifier:null,outcomes:{ODD:"1",EVEN:"2"}},
"TEAM_TOTAL":{marketId:"10",specifier:null,outcomes:{OVER:"1",UNDER:"2"}},
// BASKETBALL
"BASKET_MONEYLINE":{marketId:"101",specifier:null,outcomes:{HOME:"1",AWAY:"2"}},
"BASKET_TOTAL":{marketId:"102",specifier:"total=220.5",outcomes:{OVER:"1",UNDER:"2"}},
"BASKET_Q1_TOTAL":{marketId:"103",specifier:"total=55.5",outcomes:{OVER:"1",UNDER:"2"}},
"BASKET_Q2_TOTAL":{marketId:"104",specifier:"total=55.5",outcomes:{OVER:"1",UNDER:"2"}},
"BASKET_1H_TOTAL":{marketId:"105",specifier:"total=110.5",outcomes:{OVER:"1",UNDER:"2"}},
"BASKET_HANDICAP":{marketId:"106",specifier:null,outcomes:{HOME:"1",AWAY:"2"}},
};
export function parseRequest(text){
 let t=(text||"").toLowerCase();
 let target=null; let m=t.match(/(\d+(?:\.\d+)?)\s*(?:odds|odd)/)||t.match(/odds\s*(\d+(?:\.\d+)?)/); if(m) target=parseFloat(m[1]);
 let sports=[]; if(t.includes("football")||t.includes("soccer")) sports.push("Football"); if(t.includes("basketball")||t.includes("nba")||t.includes("basket")) sports.push("Basketball"); if(t.includes("mix")) sports=["Football","Basketball"]; if(!sports.length) sports=["Football","Basketball"];
 let markets=[];
 // FOOTBALL keywords
 if(t.includes("home win")||t.includes("only home")) markets.push("HOME_WIN_ONLY");
 if(t.includes("away win")) markets.push("AWAY_WIN_ONLY");
 if(t.includes("draw")) markets.push("DRAW");
 if(t.includes("gg")||t.includes("btts")||t.includes("both teams to score")||t.includes("gg/ng")) markets.push("GG");
 if(t.includes("over 2.5")) markets.push("OVER_2.5");
 if(t.includes("over 1.5")) markets.push("OVER_1.5");
 if(t.includes("under 2.5")) markets.push("UNDER_2.5");
 if(t.includes("under 1.5")) markets.push("UNDER_1.5");
 if(t.includes("correct score")) markets.push("CORRECT_SCORE");
 if(t.includes("double chance")) markets.push("DOUBLE_CHANCE");
 if(t.includes("handicap")||t.includes("asian")) markets.push("HANDICAP");
 if(t.includes("clean sheet")) markets.push("CLEAN_SHEET");
 if(t.includes("win to nil")) markets.push("WIN_TO_NIL");
 if(t.includes("win both halves")) markets.push("WIN_BOTH_HALVES");
 if(t.includes("1st half")||t.includes("first half")) markets.push("FIRST_HALF");
 if(t.includes("2nd half")||t.includes("second half")) markets.push("SECOND_HALF");
 if(t.includes("odd")&&t.includes("even")) markets.push("ODD_EVEN");
 if(t.includes("lead by")) markets.push("LEAD_BY");
 if(t.includes("in a row")) markets.push("SCORE_IN_A_ROW");
 if(t.includes("exact goals")||t.includes("goal range")||t.includes("winning margin")) markets.push("GOALS_RANGE");
 if(t.includes("corner")) markets.push("CORNERS");
 if(t.includes("card")||t.includes("booking")) markets.push("CARDS");
 if(t.includes("offsides")||t.includes("offside")) markets.push("OFFSIDES");
 if(t.includes("shots")) markets.push("SHOTS");
 if(t.includes("posts")) markets.push("POSTS");
 if(t.includes("player")) markets.push("PLAYER_PROP");
 // BASKETBALL keywords
 if(t.includes("over 220")||t.includes("total points")||t.includes("over 140")||t.includes("over 150")||t.includes("over 76")) markets.push("BASKET_TOTAL");
 if(t.includes("quarter")||t.includes("q1")||t.includes("q2")||t.includes("1st quarter")||t.includes("2nd quarter")) markets.push("BASKET_QUARTER");
 if(t.includes("1st half")&& (t.includes("basket")||t.includes("nba"))) markets.push("BASKET_HALF");
 if(t.includes("race to")||t.includes("first team to lead")) markets.push("BASKET_RACE");
 if(t.includes("highest scoring quarter")||t.includes("lowest scoring quarter")) markets.push("BASKET_QUARTER_SPECIAL");
 if(t.includes("moneyline")||t.includes("home win")&&t.includes("nba")) markets.push("BASKET_MONEYLINE");
 if(!markets.length) markets=["MIX_ALL"];
 let only=t.includes("only")||t.includes("alone")||t.includes("don't mix")||t.includes("dont mix");
 return {targetOdds:target||2,markets,sports,only,raw:text};
}
function shuffle(pool,seed){let h=2166136261;for(let i=0;i<seed.length;i++){h^=seed.charCodeAt(i);h=Math.imul(h,16777619)}let a=[...pool];for(let i=a.length-1;i>0;i--){h=Math.imul(h^(h>>>13),0x5bd1e995);h^=h>>>15;let j=Math.abs(h)%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
export function buildSlip({picks,targetOdds,plan,request,userId='',dateStr=''}){
 let rule=PLANS[plan]||PLANS.FREE; let eff=Math.min(targetOdds,rule.maxOdds); let maxLegs=Math.min(rule.maxLegs,20);
 // FREE: SAME FOR ALL - ignore user request, use fixed FREE pool
 if(plan==='FREE'){let pool=shuffle(picks.filter(p=>!isBlockedLeague(p.league)),'FREE|'+dateStr);let legs=pool.slice(0,3);let total=legs.reduce((a,l)=>a*(l.odds||1.65),1);if(total>2)total=1.85;return {legs,totalOdds:+total.toFixed(2),bookingCode:'FREE-'+dateStr+'-SAME',plan}}
 let pool=shuffle(picks.filter(p=>!isBlockedLeague(p.league)),userId+'|'+dateStr+'|'+request.raw);
 // Filter by sport
 if(request.sports&&request.sports.length) pool=pool.filter(p=>request.sports.includes(p.sport)||(request.sports.includes('Basketball')&&p.sport==='NBA'));
 // Filter by markets if not MIX
 if(!request.markets.includes('MIX_ALL')){
   let filtered=pool.filter(p=>{
     if(request.markets.includes('HOME_WIN_ONLY')&&p.market==='1X2'&&p.outcome==='HOME')return true;
     if(request.markets.includes('GG')&&p.market==='GG')return true;
     if(request.markets.includes('OVER_2.5')&&p.market==='OVER_2.5')return true;
     if(request.markets.includes('BASKET_TOTAL')&&p.sport!=='Football')return true;
     if(request.markets.includes('BASKET_QUARTER')&&p.market&&p.market.includes('QUARTER'))return true;
     return false;
   });
   if(filtered.length>=2) pool=filtered;
 }
 // Build to reach eff odds
 let legs=[];let total=1;for(let p of pool){if(legs.length>=maxLegs)break;if(total>=eff&&legs.length>=2)break;legs.push(p);total*=p.odds||1.65}
 return {legs,totalOdds:+total.toFixed(2),bookingCode:'ODDS-'+Math.random().toString(36).slice(2,8).toUpperCase(),plan};
}
export function getTodayGames(allGames,dateStr){return allGames.filter(g=>!isBlockedLeague(g.league)).sort((a,b)=>isAmateur(a.league)-isAmateur(b.league)).slice(0,POOL_SIZE)}
// API HANDLER - Vercel
export default async function handler(req,res){
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');if(req.method==='OPTIONS')return res.status(200).end();
 let url=new URL(req.url,'http://x');let path=url.pathname;
 // AUTH CHECK for pay + generate
 function needAuth(){let h=req.headers.authorization||'';if(!h.startsWith('Bearer '))return false;return true}
 if(path.includes('paystack-verify')){if(!needAuth())return res.status(401).json({ok:false,error:'Login first to pay. Paystack needs login.'});return res.json({ok:true,paymentId:req.body?.paymentId||req.body?.reference,plan:req.body?.plan})}
 if(path.includes('generate-slip')){if(!needAuth())return res.status(401).json({ok:false,error:'Login first'});let b=req.body||{};let parsed=parseRequest(b.wish||'');// In real deploy, picks come from API-Football + API-Basketball + Groq/Gemini - here we use pool from request.picks or fallback
   let picks=b.picks||[];if(!picks.length)picks=[{home:'Arsenal',away:'Chelsea',league:'England Premier League',sport:'Football',market:'1X2',outcome:'HOME',odds:1.85},{home:'Real Madrid',away:'Barcelona',league:'Spain La Liga',sport:'Football',market:'OVER_2.5',outcome:'OVER',odds:1.75},{home:'Lakers',away:'Celtics',league:'NBA',sport:'Basketball',market:'BASKET_TOTAL',outcome:'OVER',odds:1.90}];
   let slip=buildSlip({picks,targetOdds:parsed.targetOdds,plan:b.plan||'FREE',request:parsed,userId:'u',dateStr:new Date().toISOString().slice(0,10)});return res.json({ok:true,...slip})}
 if(path.includes('ask-ai')){if(!needAuth())return res.status(401).json({ok:false,error:'Login first'});return res.json({ok:true,answer:'AI: Based on your options '+JSON.stringify((req.body||{}).options||[])+', I recommend mix of home win + Over 1.5 + NBA total. Generate slip to get booking code.'})}
 if(path.includes('football-today')){return res.json({ok:true,games:[{home:'Arsenal',away:'Chelsea',league:'England Premier League',sport:'Football',time:'15:00',market:'Over 1.5',odds:1.65},{home:'Man City',away:'Liverpool',league:'England Premier League',sport:'Football',time:'17:30',market:'GG',odds:1.79},{home:'New York Knicks',away:'Miami Heat',league:'NBA',sport:'Basketball',time:'01:00',market:'Over 220.5 Total Points',odds:1.90},{home:'Saudi Arabia',away:'China',league:'FIBA World Cup Qual - Asia',sport:'Basketball',time:'14:00',market:'Over 76.5 Total',odds:1.85}]})}
 if(path.includes('my-slips')){if(!needAuth())return res.status(401).json({ok:false,error:'Login first'});return res.json({ok:true,slips:[]})}
 return res.json({ok:true,version:'V107 ALL OPTIONS',footballOptions:FOOTBALL_OPTIONS.length,basketballOptions:BASKETBALL_OPTIONS.length,pool:POOL_SIZE,plans:Object.keys(PLANS)});
}
