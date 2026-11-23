
// SportyBet mapper — Confirmed: 1X2 marketId 1, Over/Under marketId 18. Others verify with 1 payload per market.
// No fake codes — Real code comes from SportyBet server via BetRelay / Manual Book Bet.
export function normalize(n){return n.toLowerCase().replace(/ fc$/,"").replace(/[^a-z0-9]/g,"").trim()}
export function isSameTeam(a,b){const na=normalize(a),nb=normalize(b); return na===nb||(na.length>4&&nb.length>4&&(na.includes(nb)||nb.includes(na)))}
export async function findSportyBetMatch(home,away){
  for(const q of [`${home} vs ${away}`,home,away]){
    try{const res=await fetch(`https://www.sportybet.com/api/ng/factsCenter/search?query=${encodeURIComponent(q)}`,{headers:{Accept:"application/json","User-Agent":"Mozilla/5.0",Referer:"https://www.sportybet.com/ng/"}}); const d=await res.json().catch(()=>null); if(!d) continue; const evs=d?.data?.events||d?.data?.matches||d?.data||[]; const list=Array.isArray(evs)?evs:[evs]; for(const ev of list){const h=ev.homeTeamName||ev.homeTeam?.name||""; const a=ev.awayTeamName||ev.awayTeam?.name||""; if(isSameTeam(h,home)&&isSameTeam(a,away)) return {eventId:ev.eventId||ev.id,homeTeamName:h,awayTeamName:a}}}catch(e){}
  } return null;
}
export const FOOTBALL_MARKETS={"1X2":{marketId:"1",specifier:null,outcomes:{HOME:"1",DRAW:"2",AWAY:"3"},confirmed:true},"OVER_2.5":{marketId:"18",specifier:"total=2.5",outcomes:{OVER:"12",UNDER:"13"},confirmed:true},"OVER_1.5":{marketId:"18",specifier:"total=1.5",outcomes:{OVER:"12",UNDER:"13"}},"UNDER_2.5":{marketId:"18",specifier:"total=2.5",outcomes:{OVER:"12",UNDER:"13"}},"GG":{marketId:"20",specifier:null,outcomes:{YES:"10",NO:"11"}},"DOUBLE_CHANCE":{marketId:"2",specifier:null,outcomes:{"1X":"14","12":"15","X2":"16"}}};
export const BASKETBALL_MARKETS={"WINNER":{marketId:"1001",specifier:null,outcomes:{HOME:"1",AWAY:"2"}},"OVER_220.5":{marketId:"1002",specifier:"total=220.5",outcomes:{OVER:"12",UNDER:"13"}}};
