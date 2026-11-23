
// Niche markets — EV, Poisson, Player Saves, 1H Corners, etc. — No fake odds
export function poisson(k,lam){let s=0; for(let i=0;i<=k;i++) s+=Math.exp(-lam)*Math.pow(lam,i)/fact(i); return s}
function fact(n){let r=1; for(let i=2;i<=n;i++) r*=i; return r}
export function playerSavesEV({oppSoT=12,savePct=0.72,line=4.5,odds=1.69}){const lam=oppSoT*savePct; const pOver=1-poisson(Math.floor(line),lam); const ev=pOver*(odds-1)-(1-pOver); return {lam:Number(lam.toFixed(2)),pOver:Number(pOver.toFixed(3)),ev:Number(ev.toFixed(3)),verdict:ev>0?"VALUE":"NO VALUE"}}
export function firstHalfCornersEV({avg1H=4.2,line=5.5,odds=1.75}){const pUnder=poisson(Math.floor(line),avg1H); const ev=pUnder*(odds-1)-(1-pUnder); return {pUnder:Number(pUnder.toFixed(3)),ev:Number(ev.toFixed(3))}}
export function danceGuard(){return {allowed:false,message:"No fake odds for dance / non-sport markets. We show picks only for real sport markets."}}
