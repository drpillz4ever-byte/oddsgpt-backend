
// AI Engine — Deep research factors, EV, CLV — Hidden deep search for all plans
import {deepSearchInternal, calcEV} from "./smart-pick-engine.js";
export function scorePick({form=70,eloDiff=0,xgDiff=0,injuryLoss=0,homeAdv=0,odds=1.8,marketProb=0.5}){
  deepSearchInternal({plan:"ALL"});
  let prob=0.5 + (form-50)/200 + eloDiff/1000 + xgDiff*0.08 - injuryLoss*0.02 + homeAdv*0.05;
  prob=Math.max(0.05,Math.min(0.95,prob));
  const ev=calcEV(prob,odds);
  return {prob:Number(prob.toFixed(3)),ev:Number(ev.toFixed(3)),marketProb,verdict:ev>0.05?"VALUE":ev>0?"SLIGHT VALUE":"NO VALUE"};
}
