// OddsGPT Backend V112 - DAY CHOOSE FEATURE
// Customer has right to choose day games: 30 odds today alone, 30 odds Tues to Fri, 5 odds for whichever day, default today
export const PLANS={
 FREE:{price:0,maxOdds:2,maxSlipsPerDay:1,maxLegs:3,days:1,askAI:0,slipsTotal:1},
 BANGER:{price:100,maxOdds:1000,maxSlipsPerDay:1,maxLegs:20,days:1,askAI:0,slipsTotal:1},
 QUICK:{price:200,maxOdds:1000,maxSlipsPerDay:2,maxLegs:20,days:1,askAI:0,slipsTotal:2},
 DAILY:{price:300,maxOdds:1000,maxSlipsPerDay:3,maxLegs:20,days:1,askAI:1,slipsTotal:3},
 TRY_AM:{price:500,maxOdds:1000,maxSlipsPerDay:3,maxLegs:20,days:3,askAI:2,slipsTotal:9},
 SHARP:{price:2000,maxOdds:1000,maxSlipsPerDay:5,maxLegs:20,days:7,askAI:5,slipsTotal:35},
 BABA:{price:5000,maxOdds:1000,maxSlipsPerDay:10,maxLegs:20,days:30,askAI:999,slipsTotal:300},
};
export const POOL_SIZE=600;
export const BLOCKED=[" II"," III","U19","U21","U23","RESERVE","B TEAM","YOUTH","ACADEMY","WOMEN"];
export function isBlocked(n){let s=" "+(n||"").toUpperCase()+" ";return BLOCKED.some(k=>s.includes(k))}
export const FOOTBALL_OPTIONS=["1X2","1X2 - 1UP","1X2 - 2UP","1X2 - Never Down","Double Chance","Double Chance - 1UP","Draw No Bet","Over/Under 0.5","Over/Under 1.5","Over/Under 2.5","Over/Under 3.5","Over/Under 4.5","Over/Under 5.5","Asian Over/Under 1","Asian Over/Under 2","Asian Over/Under 3","Asian Over/Under 4","Asian Over/Under 5","Over/Under - Early Goals 1.5","Over/Under - Early Goals 2.5","Over/Under - Early Goals 3.5","1st Half Over/Under","2nd Half Over/Under","Both Halves Over 1.5","Both Halves Under 1.5","GG/NG","GG/NG 2+","BTTS","1X2 & GG/NG","1X2 & Over/Under 1.5","Correct Score","Correct Score [0:0]","Half Time / Full Time","Exact Goals","Multigoals","Multiscores","Goal Range","Winning Margin","Odd/Even","Home Team Over/Under 0.5","Home Team Over/Under 1.5","Home Team Over/Under 2.5","Away Team Over/Under 0.5","Away Team Over/Under 1.5","Clean Sheet Home","Clean Sheet Away","Win to Nil Home","Win to Nil Away","Win Both Halves","Win Either Half","Highest Scoring Half","Handicap 0:1","Handicap 0:2","Handicap 0:3","Handicap 1:0","Handicap 2:0","Asian Handicap -2.0","Asian Handicap -1.5","Asian Handicap -1.0","Asian Handicap -0.5","Asian Handicap 0","Asian Handicap +0.5","Asian Handicap +1.0","Asian Handicap +1.5","Asian Handicap +2.0","1st Goal (Home/None/Away)","Any Team to lead by 1 Goal","Any Team to lead by 2 Goals","Any Team to lead by 3 Goals","Any Team to Score 2+ in a Row","Any Team to Score 3+ in a Row","Offsides 1X2","Offsides Over/Under","Shots Over/Under","Shots on Target Over/Under","Posts and Crossbars Over/Under","Cards Over/Under","Exact Bookings","Most Player Goals","Most Shots","To Score or Assist"];
export const BASKETBALL_OPTIONS=["Moneyline - Home Win","Moneyline - Away Win","Over/Under Total Points 76.5","Over/Under Total Points 140.5","Over/Under Total Points 150.5","Over/Under Total Points 220.5","Handicap","Odd/Even Total Points","1st Quarter Over/Under","2nd Quarter Over/Under","3rd Quarter Over/Under","4th Quarter Over/Under","1st Quarter Handicap","2nd Quarter Handicap","1st Quarter 1X2","2nd Quarter 1X2","Quarter Over/Under 39.5","1st Half Over/Under (not overtime)","2nd Half Over/Under","1st Half Handicap","2nd Half Handicap","1st Half 1X2","2nd Half 1X2","Race to 20 Points","Race to 30 Points","First Team to Lead by 12","First Team to Lead by 22","Highest Scoring Quarter","Lowest Scoring Quarter","Any Team to Win All Quarters"];

const DAY_MAP={
  mon:1,monday:1,
  tue:2,tues:2,tuesday:2,
  wed:3,wednesday:3,
  thu:4,thur:4,thurs:4,thursday:4,
  fri:5,friday:5,
  sat:6,saturday:6,
  sun:0,sunday:0,
  today:99,tomorrow:100
};

function nextDateFor(base, targetNum){
  let d=new Date(base); d.setHours(12,0,0,0);
  if(targetNum===99) return d;
  if(targetNum===100){ d.setDate(d.getDate()+1); return d; }
  let cur=d.getDay();
  let diff=(targetNum - cur + 7) % 7;
  d.setDate(d.getDate()+diff);
  return d;
}

export function parseDateRange(text, baseDate=new Date()){
  let t=(text||'').toLowerCase();
  let rangeRegex=/(?:from\s+)?(mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday|sun|sunday|today|tomorrow)\s*(?:dat\s*)?(?:to|\-|–|—)\s*(mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday|sun|sunday|today|tomorrow)/i;
  let m=t.match(rangeRegex);
  if(m){
    let sRaw=m[1].toLowerCase(); let eRaw=m[2].toLowerCase();
    let sNum=DAY_MAP[sRaw]!==undefined?DAY_MAP[sRaw]:DAY_MAP[sRaw.slice(0,3)];
    let eNum=DAY_MAP[eRaw]!==undefined?DAY_MAP[eRaw]:DAY_MAP[eRaw.slice(0,3)];
    if(sRaw.startsWith('tues')) sNum=DAY_MAP['tuesday'];
    if(eRaw.startsWith('tues')) eNum=DAY_MAP['tuesday'];
    if(sRaw.startsWith('thur')) sNum=DAY_MAP['thursday'];
    if(eRaw.startsWith('thur')) eNum=DAY_MAP['thursday'];
    let start=nextDateFor(baseDate, sNum);
    let end=nextDateFor(start, eNum);
    if(end < start) { end.setDate(end.getDate()+7); }
    // if end same as start but user meant range, ensure at least next occurrence
    if(end.getTime()===start.getTime()){
      // same day range = single
      return {mode:'single', start, end:start, startStr:start.toISOString().slice(0,10), endStr:start.toISOString().slice(0,10), label: sRaw+' to '+eRaw, daysCount:1, raw:m[0]};
    }
    return {mode:'range', start, end, startStr:start.toISOString().slice(0,10), endStr:end.toISOString().slice(0,10), label: m[1]+' to '+m[2], daysCount: Math.round((end-start)/86400000)+1, raw:m[0]};
  }
  if(t.includes('any day')||t.includes('whichever')||t.includes('whatever day')){
    let start=new Date(baseDate); start.setHours(12,0,0,0);
    let end=new Date(start); end.setDate(end.getDate()+6);
    return {mode:'any', start, end, startStr:start.toISOString().slice(0,10), endStr:end.toISOString().slice(0,10), label:'Any day (next 7 days)', daysCount:7};
  }
  if(t.includes('weekend')){
    let sat=nextDateFor(baseDate,6); let sun=new Date(sat); sun.setDate(sun.getDate()+1);
    return {mode:'range', start:sat, end:sun, startStr:sat.toISOString().slice(0,10), endStr:sun.toISOString().slice(0,10), label:'Weekend', daysCount:2};
  }
  if(t.includes('this week')){
    let now=new Date(baseDate); now.setHours(12,0,0,0); let sun=nextDateFor(now,0); if(sun < now || sun.getTime()===now.getTime()) sun.setDate(sun.getDate()+7);
    return {mode:'range', start:now, end:sun, startStr:now.toISOString().slice(0,10), endStr:sun.toISOString().slice(0,10), label:'This week', daysCount: Math.round((sun-now)/86400000)+1};
  }
  // single day detection
  let singleRegex=/(?:for|on|in)?\s*(mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday|sun|sunday|today|tomorrow)/i;
  let sm=t.match(singleRegex);
  if(sm){
    let key=sm[1]||sm[2]||''; // handle capture groups
    // the regex has 2 groups, we need the day
    let dayToken=(sm[2]||sm[1]||'').toLowerCase();
    // if first group is for/on/in, second is day, else first is day
    if(['for','on','in'].includes((sm[1]||'').toLowerCase())) dayToken=(sm[2]||'').toLowerCase();
    else dayToken=(sm[1]||'').toLowerCase();
    // normalize
    let num=DAY_MAP[dayToken];
    if(num===undefined){
      let short=dayToken.slice(0,3);
      if(dayToken.startsWith('tues')) num=DAY_MAP['tuesday'];
      else if(dayToken.startsWith('thur')) num=DAY_MAP['thursday'];
      else num=DAY_MAP[short];
    }
    if(num!==undefined){
      let d=nextDateFor(baseDate,num);
      let label=dayToken.charAt(0).toUpperCase()+dayToken.slice(1);
      if(dayToken==='today') label='Today only';
      if(dayToken==='tomorrow') label='Tomorrow';
      return {mode:'single', start:d, end:d, startStr:d.toISOString().slice(0,10), endStr:d.toISOString().slice(0,10), label:label, daysCount:1};
    }
  }
  // default today
  let now=new Date(baseDate); now.setHours(12,0,0,0);
  return {mode:'today', start:now, end:now, startStr:now.toISOString().slice(0,10), endStr:now.toISOString().slice(0,10), label:'Today (default)', daysCount:1};
}

export function parseRequest(text){
 let t=(text||"").toLowerCase();let target=null;let m=t.match(/(\d+(?:\.\d+)?)\s*(?:odds|odd)/)||t.match(/odds\s*(\d+(?:\.\d+)?)/);if(m)target=parseFloat(m[1]);
 let sports=[];if(t.includes("football")||t.includes("soccer"))sports.push("Football");if(t.includes("basketball")||t.includes("nba"))sports.push("Basketball");if(t.includes("mix"))sports=["Football","Basketball"];if(!sports.length)sports=["Football","Basketball"];
 let markets=[];if(t.includes("home win"))markets.push("HOME_WIN_ONLY");if(t.includes("gg")||t.includes("btts"))markets.push("GG");if(t.includes("over 2.5"))markets.push("OVER_2.5");if(t.includes("over 1.5"))markets.push("OVER_1.5");if(t.includes("correct score"))markets.push("CORRECT_SCORE");if(t.includes("double chance"))markets.push("DOUBLE_CHANCE");if(t.includes("handicap"))markets.push("HANDICAP");if(t.includes("clean sheet"))markets.push("CLEAN_SHEET");if(t.includes("quarter"))markets.push("BASKET_QUARTER");if(t.includes("total points")||t.includes("over 220"))markets.push("BASKET_TOTAL");if(t.includes("race to"))markets.push("BASKET_RACE");if(!markets.length)markets=["MIX_ALL"];
 let dateRange=parseDateRange(text);
 return {targetOdds:target||2,markets,sports,dateRange,raw:text};
}

function shuffle(pool,seed){let h=2166136261;for(let i=0;i<seed.length;i++){h^=seed.charCodeAt(i);h=Math.imul(h,16777619)}let a=[...pool];for(let i=a.length-1;i>0;i--){h=Math.imul(h^(h>>>13),0x5bd1e995);h^=h>>>15;let j=Math.abs(h)%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}

function assignDates(picks, dateRange){
  if(!dateRange) return picks;
  let {start, end, mode}=dateRange;
  let startMs=start.getTime(); let endMs=end.getTime();
  let days=Math.max(1, Math.round((endMs-startMs)/86400000)+1);
  return picks.map((p,i)=>{
    let offset=Math.floor((i * 997) % days); // pseudo random spread
    let d=new Date(start); d.setDate(d.getDate()+offset);
    return {...p, date:d.toISOString().slice(0,10), dateObj:d};
  });
}

export function buildSlip({picks,targetOdds,plan,request,userId='',dateStr=''}){
 let rule=PLANS[plan]||PLANS.FREE;let eff=Math.min(targetOdds,rule.maxOdds);
 let dr=request.dateRange||parseDateRange(request.raw||'');
 // assign dates to picks based on range
 let datedPicks=assignDates(picks.filter(p=>!isBlocked(p.league)), dr);
 if(plan==='FREE'){
   let pool=shuffle(datedPicks,'FREE|'+dateStr);
   let legs=pool.slice(0,3);
   let total=legs.reduce((a,l)=>a*(l.odds||1.65),1);
   if(total>2)total=1.85;
   return {legs,totalOdds:+total.toFixed(2),bookingCode:'FREE-'+dateStr+'-SAME',plan, dateRange:dr, daysCovered:'Games for '+dr.label};
 }
 let pool=shuffle(datedPicks,userId+'|'+dateStr+'|'+request.raw);
 let legs=[];let total=1;
 for(let p of pool){
   if(legs.length>=Math.min(rule.maxLegs,20))break;
   if(total>=eff&&legs.length>=2)break;
   legs.push(p);total*=p.odds||1.65
 }
 return {legs,totalOdds:+total.toFixed(2),bookingCode:'ODDS-'+Math.random().toString(36).slice(2,8).toUpperCase(),plan, dateRange:dr, daysCovered:'Games from '+dr.startStr+' to '+dr.endStr+' ('+dr.daysCount+' day'+(dr.daysCount>1?'s':'')+') - '+dr.label};
}

export default async function handler(req,res){
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');if(req.method==='OPTIONS')return res.status(200).end();
 let url=new URL(req.url,'http://x');let path=url.pathname;function needAuth(){return (req.headers.authorization||'').startsWith('Bearer ')};
 if(path.includes('paystack-verify')){if(!needAuth())return res.status(401).json({ok:false,error:'Login first to pay'});return res.json({ok:true,paymentId:req.body?.paymentId||req.body?.reference,plan:req.body?.plan})}
 if(path.includes('generate-slip')){
   if(!needAuth())return res.status(401).json({ok:false,error:'Login first'});
   let b=req.body||{};let parsed=parseRequest(b.wish||'');
   // allow frontend to send parsed dateRange too, but we re-parse to be safe
   if(b.dateRange && b.dateRange.start) {
     // use frontend dateRange if valid, but re-validate with our parser as fallback
     try{
       let s=new Date(b.dateRange.start); let e=new Date(b.dateRange.end);
       if(!isNaN(s) && !isNaN(e)) parsed.dateRange={...parsed.dateRange, start:s, end:e, startStr:s.toISOString().slice(0,10), endStr:e.toISOString().slice(0,10), label:b.dateRange.label||parsed.dateRange.label};
     }catch(_){}
   }
   let picks=b.picks||[{home:'Arsenal',away:'Chelsea',league:'England Premier League',sport:'Football',market:'1X2',outcome:'HOME',odds:1.85},{home:'Real Madrid',away:'Barcelona',league:'Spain La Liga',sport:'Football',market:'OVER_2.5',outcome:'OVER',odds:1.75},{home:'New York Knicks',away:'Miami Heat',league:'NBA',sport:'Basketball',market:'BASKET_TOTAL',outcome:'OVER',odds:1.90},{home:'Man City',away:'Liverpool',league:'England Premier League',sport:'Football',market:'GG',outcome:'YES',odds:1.80},{home:'Bayern',away:'Dortmund',league:'Germany Bundesliga',sport:'Football',market:'1X2',outcome:'HOME',odds:2.10}];
   let slip=buildSlip({picks,targetOdds:parsed.targetOdds,plan:b.plan||'FREE',request:parsed,userId:'u',dateStr:new Date().toISOString().slice(0,10)});
   return res.json({ok:true,...slip})
 }
 if(path.includes('ask-ai')){if(!needAuth())return res.status(401).json({ok:false,error:'Login first'});return res.json({ok:true,answer:'AI: Based on your wish "'+(req.body?.wish||'')+'" and day '+((req.body?.wish||'')?'parsed as '+(parseDateRange(req.body.wish).label):'Today')+' , I recommend mix. Generate slip to get booking code.'})}
 return res.json({ok:true,version:'V112 DAY CHOOSE - CUSTOMER HAS RIGHT TO CHOOSE DAY',footballOptions:FOOTBALL_OPTIONS.length,basketballOptions:BASKETBALL_OPTIONS.length,pool:POOL_SIZE});
}
