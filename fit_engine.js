/*
 * BikeLab FIT Analyzer — engine 2.0.0
 * Copyright (c) 2025-2026 Carlos Eduardo Ravello Joo — BikeLab Studio (Trujillo, Peru)
 * ORCID 0009-0007-5631-7436 · https://bikelabstudio.com/articles/fit-analyzer-en
 * License: PolyForm Noncommercial 1.0.0 — see LICENSE.md
 * Required Notice: Copyright (c) 2025-2026 Carlos Eduardo Ravello Joo (https://bikelabstudio.com)
 *
 * Everything between BEGIN VERBATIM and END VERBATIM is copied byte for byte from
 * the script of the live tool. test/page_identity.mjs checks it against the page.
 * FIT is a protocol of Garmin International. This file contains no Garmin code.
 */
'use strict';
if (typeof window === 'undefined') { globalThis.window = { _dp: null }; }
// BEGIN VERBATIM
// VI: TrainingPeaks Help Center, art. 204071734 (tabla de referencia). Gravel = ruta (no está en la tabla).
var VIT={ruta:{vst:1.02,st:1.06,falla:1.35},gravel:{vst:1.02,st:1.06,falla:1.35},mtb:{vst:1.02,st:1.13,falla:1.50}};
var N_MC=500;
function aF(r,n,v){
  if(n===2){if(r._ea==null)r.altitude=v/5-500;}
  else if(n===78){r.altitude=v/5-500;r._ea=1;}
  else if(n===3)r.heart_rate=v;
  else if(n===4)r.cadence=v;
  else if(n===5)r.distance=v/100;
  else if(n===6){if(r._es==null)r.speed=v/1000;}
  else if(n===73){r.speed=v/1000;r._es=1;}
  else if(n===7)r.power=v;
}
function parseFIT(buf){
  // BikeLab FIT Analyzer 2.0.0 — lector validado contra @garmin/fitsdk 21.222.0
  var dv=new DataView(buf),N=dv.byteLength;
  if(N<12)throw new Error('Invalid FIT file');
  var EPOCH=631065600,records=[],timer=[],base=0,first=true;
  while(base+12<=N){
    var hs=dv.getUint8(base);
    if((hs!==12&&hs!==14)||base+hs>N||dv.getUint32(base+8,true)!==0x5449462E){
      if(first)throw new Error(hs!==12&&hs!==14?'Invalid FIT header: '+hs:'Invalid FIT signature');
      break;
    }
    var ds=dv.getUint32(base+4,true),offset=base+hs,end=Math.min(base+hs+ds,N);
    var defs={},lastTs=null,csRaw=null,csAcc=0,stop=false;
    first=false;
    var rd=function(f,o,le){
      var b=f.bt&0x1F,v;
      if(f.s===1){v=(b===1)?dv.getInt8(o):dv.getUint8(o);if(b===1?v===0x7F:(b===10?v===0:v===0xFF))return null;return v;}
      if(f.s===2){if(b===3){v=dv.getInt16(o,le);return v===0x7FFF?null:v;}v=dv.getUint16(o,le);if(b===11?v===0:v===0xFFFF)return null;return v;}
      if(f.s===4){if(b===5){v=dv.getInt32(o,le);return v===0x7FFFFFFF?null:v;}if(b===8)return null;v=dv.getUint32(o,le);if(b===12?v===0:v===0xFFFFFFFF)return null;return v;}
      return null;
    };
    var readMsg=function(def,ts){
      var r=def.gn===20?{}:null,ev=def.gn===21?{}:null,o=offset,cs=null;
      for(var i=0;i<def.fields.length;i++){
        var f=def.fields[i];
        if(o+f.s>end)return false;
        if(r&&f.n===8&&f.s===3){var c=dv.getUint8(o)|(dv.getUint8(o+1)<<8)|(dv.getUint8(o+2)<<16);o+=3;if(c!==0xFFFFFF)cs=c;continue;}
        var v=rd(f,o,def.le);o+=f.s;
        if(v===null)continue;
        if(f.n===253&&f.s===4){lastTs=v;if(r)r.timestamp=v+EPOCH;if(ev)ev.t=v+EPOCH;}
        else if(r)aF(r,f.n,v);
        else if(ev&&f.n<=1&&f.s===1)ev[f.n===0?'e':'k']=v;
      }
      if(ev&&ev.e===0&&ev.k!=null){if(ev.t==null&&ts!=null)ev.t=ts+EPOCH;if(ev.t!=null)timer.push({t:ev.t,k:ev.k});}
      if(o+def.dsz>end)return false;
      offset=o+def.dsz;
      if(r){
        if(cs!==null){
          var raw=(cs>>12)&0xFFF;
          if(csRaw===null)csAcc=raw;else csAcc+=(raw-csRaw)&0xFFF;
          csRaw=raw;
          if(r.speed==null)r.speed=(cs&0xFFF)/100;
          if(r.distance==null)r.distance=csAcc/16;
        }
        if(r.timestamp==null&&ts!=null)r.timestamp=ts+EPOCH;
        delete r._ea;delete r._es;
        if(r.timestamp!=null)records.push(r);
      }
      return true;
    };
    while(offset<end){
      var hb=dv.getUint8(offset++);
      if(hb&0x80){
        var ln=(hb>>5)&0x03,to=hb&0x1F,ts=null;
        if(lastTs!=null){ts=(lastTs&0xFFFFFFE0)+to;if(to<(lastTs&0x1F))ts+=0x20;lastTs=ts;}
        var def=defs[ln];
        if(!def||!readMsg(def,ts)){stop=true;break;}
        continue;
      }
      var local=hb&0x0F;
      if(hb&0x40){
        if(offset+5>end){stop=true;break;}
        var le=dv.getUint8(offset+1)===0;
        var gn=dv.getUint16(offset+2,le),nf=dv.getUint8(offset+4);offset+=5;
        if(offset+nf*3>end){stop=true;break;}
        var fields=[];
        for(var i=0;i<nf;i++){fields.push({n:dv.getUint8(offset),s:dv.getUint8(offset+1),bt:dv.getUint8(offset+2)});offset+=3;}
        var dsz=0;
        if(hb&0x20){
          if(offset+1>end){stop=true;break;}
          var nd=dv.getUint8(offset++);
          if(offset+nd*3>end){stop=true;break;}
          for(var k=0;k<nd;k++){dsz+=dv.getUint8(offset+1);offset+=3;}
        }
        defs[local]={gn:gn,fields:fields,le:le,dsz:dsz};
      }else{
        var def2=defs[local];
        if(!def2||!readMsg(def2,null)){stop=true;break;}
      }
    }
    if(stop)break;
    base=base+hs+ds+2;
  }
  if(!records.length)throw new Error('the file contains no activity records');
  records.sort(function(a,b){return a.timestamp-b.timestamp;});
  timer.sort(function(a,b){return a.t-b.t;});
  records.timer=timer;
  return records;
}
function getThresh(m,c){
  var p=window._dp,dF=p?p.df:1;
  var B={CV_c:{est:.030,falla:.060},VC_r:{est:.040,falla:.080},IES:{est:.040,falla:.080},VI:{vst:1.030,st:1.080,falla:1.150},PwHR:{est:5.0,falla:8.0}};
  var DD={CV_c:{ruta:0,gravel:.005,mtb:.010},VC_r:{ruta:0,gravel:.005,mtb:.010},IES:{ruta:0,gravel:.007,mtb:.015},VI:{ruta:0,gravel:.010,mtb:.030},PwHR:{ruta:0,gravel:.5,mtb:1.0}};
  var DS={CV_c:{rigida:0,hardtail:.005,doble:.010},VC_r:{rigida:0,hardtail:.002,doble:.003},IES:{rigida:0,hardtail:.008,doble:.015},VI:{rigida:0,hardtail:.010,doble:.020},PwHR:{rigida:0,hardtail:.3,doble:.5}};
  var DT={CV_c:{'2x':0,'1x':.005},VC_r:{'2x':0,'1x':.010},IES:{'2x':0,'1x':.008},VI:{'2x':0,'1x':.005},PwHR:{'2x':0,'1x':0}};
  var DW={CV_c:{'29':0,'27.5':.003,'26':.005},VC_r:{'29':0,'27.5':.002,'26':.003},IES:{'29':0,'27.5':.004,'26':.007},VI:{'29':0,'27.5':0,'26':0},PwHR:{'29':0,'27.5':0,'26':0}};
  var d=(DD[m][c.discipline]||0)+(DS[m][c.suspension]||0)+(DT[m][c.transmission]||0)+(DW[m][c.wheel]||0);
  var b=B[m];
  if(m==='VI'){var vt=VIT[c.discipline]||VIT.ruta;return{vst:vt.vst*dF,st:vt.st*dF,falla:vt.falla*dF};}
  return{est:(b.est+d)*dF,falla:(b.falla+d)*dF};
}
function mcInit(recs,cfg){
  return{recs:recs,i:0,
    hasPow:recs.some(function(r){return r.power>0&&r.power<=3000;}),
    hasHR:recs.some(function(r){return r.heart_rate>=40&&r.heart_rate<=220;}),
    th:{cv:getThresh('CV_c',cfg),vc:getThresh('VC_r',cfg),ies:getThresh('IES',cfg),vi:getThresh('VI',cfg),pw:getThresh('PwHR',cfg)},
    s:{cv:[],vc:[],ies:[],vi:[],pw:[]}};
}
function mcRun(st,n){
  var recs=st.recs,s=st.s,end=Math.min(N_MC,st.i+n);
  for(;st.i<end;st.i++){
    var nr=recs.map(function(r){
      var pd=0.05+Math.random()*0.10;
      return{timestamp:r.timestamp,speed:r.speed!=null?r.speed+(Math.random()*.6-.3):null,altitude:r.altitude!=null?r.altitude+(Math.random()*4-2):null,cadence:r.cadence!=null&&Math.random()>pd?r.cadence:null,power:r.power!=null&&r.power>0?r.power*(1+(Math.random()*2-1)*.02):(r.power===0?0:null),heart_rate:r.heart_rate,distance:r.distance};
    });
    nr.timer=recs.timer;
    var cv=mCV(nr),vc=mVC(nr),ies=mIES(nr),vi=st.hasPow?mVI(nr):null,pw=(st.hasPow&&st.hasHR)?mPW(nr):null;
    if(cv!=null)s.cv.push(cv);if(vc!=null)s.vc.push(vc);if(ies!=null)s.ies.push(ies);if(vi!=null)s.vi.push(vi);if(pw!=null)s.pw.push(pw);
  }
  return st.i>=N_MC;
}
function stat2(arr,est,falla){
  if(!arr.length)return{status:'na',M_obs:null,M_p5:null,M_p95:null,P_s:0,P_w:0,P_f:0,T_est:est,T_falla:falla,margin_est:null};
  arr.sort(function(a,b){return a-b;});
  var obs=arr[Math.floor(arr.length/2)],p5=arr[Math.floor(arr.length*.05)],p95=arr[Math.floor(arr.length*.95)];
  var ns=0,nw=0,nf=0;arr.forEach(function(v){if(v<est)ns++;else if(v<falla)nw++;else nf++;});
  return{status:obs<est?'stable':obs<falla?'warning':'fail',M_obs:obs,M_p5:p5,M_p95:p95,P_s:ns/arr.length,P_w:nw/arr.length,P_f:nf/arr.length,T_est:est,T_falla:falla,margin_est:obs-est};
}
function statVI(arr,th){
  if(!arr.length)return{status:'na',M_obs:null,M_p5:null,M_p95:null,P_s:0,P_w:0,P_f:0,T_vst:th.vst,T_st:th.st,T_falla:th.falla};
  arr.sort(function(a,b){return a-b;});
  var obs=arr[Math.floor(arr.length/2)],p5=arr[Math.floor(arr.length*.05)],p95=arr[Math.floor(arr.length*.95)];
  var ns=0,nw=0,nf=0;arr.forEach(function(v){if(v<th.st)ns++;else if(v<th.falla)nw++;else nf++;});
  return{status:obs<th.st?'stable':obs<th.falla?'warning':'fail',M_obs:obs,M_p5:p5,M_p95:p95,P_s:ns/arr.length,P_w:nw/arr.length,P_f:nf/arr.length,T_vst:th.vst,T_st:th.st,T_falla:th.falla,margin_est:obs-th.st,isVeryStable:obs<th.vst};
}
function mcEnd(st){
  var recs=st.recs,s=st.s,th=st.th,hasPow=st.hasPow,hasHR=st.hasHR;
  var dur=0;if(recs.length>1&&recs[0].timestamp&&recs[recs.length-1].timestamp)dur=recs[recs.length-1].timestamp-recs[0].timestamp;
  var dist=0;recs.forEach(function(r){if(r.distance!=null)dist=r.distance;});
  var sv=0,sn=0;recs.forEach(function(r){if(r.speed!=null&&r.speed>0){sv+=r.speed;sn++;}});
  return{cv:stat2(s.cv,th.cv.est,th.cv.falla),vc:stat2(s.vc,th.vc.est,th.vc.falla),ies:stat2(s.ies,th.ies.est,th.ies.falla),vi:hasPow?statVI(s.vi,th.vi):{status:'na',M_obs:null},pw:(hasPow&&hasHR)?stat2(s.pw,th.pw.est,th.pw.falla):{status:'na',M_obs:null},hasPow:hasPow,hasHR:hasHR,duration:dur,distance:dist,speedAvg:sn?sv/sn:0,recordCount:recs.length};
}
function computeAll(recs,cfg){var st=mcInit(recs,cfg);mcRun(st,N_MC);return mcEnd(st);}
function computeAllAsync(recs,cfg,prog,done,fail){
  var st=mcInit(recs,cfg);
  (function step(){
    try{var fin=mcRun(st,20);if(prog)prog(st.i/N_MC);if(fin)done(mcEnd(st));else setTimeout(step,0);}
    catch(e){fail(e);}
  })();
}
function mCV(r){var v=r.filter(function(x){return x.cadence>=30&&x.cadence<=160&&x.speed!=null&&x.speed>1;});if(v.length<30)return null;var cvs=[],W=30,st=10;for(var i=0;i<=v.length-W;i+=st){var w=v.slice(i,i+W).map(function(x){return x.cadence;});var mu=w.reduce(function(a,b){return a+b;},0)/W;var sd=Math.sqrt(w.reduce(function(s,x){return s+(x-mu)*(x-mu);},0)/(W-1));if(mu>0)cvs.push(sd/mu);}return cvs.length?cvs.reduce(function(a,b){return a+b;},0)/cvs.length:null;}
function mVC(r){var v=r.filter(function(x){return x.cadence>=30&&x.speed!=null&&x.speed>=2.5&&x.speed<=20;});if(v.length<20)return null;var R=v.map(function(x){return 60*x.speed/x.cadence;});var mu=R.reduce(function(a,b){return a+b;},0)/R.length;var sd=Math.sqrt(R.reduce(function(s,x){return s+(x-mu)*(x-mu);},0)/R.length);return mu>0?sd/mu:null;}
function mIES(r){if(r.length<50)return null;var alt=r.map(function(x){return x.altitude!=null?x.altitude:NaN;});var f0=-1;for(var i=0;i<alt.length;i++){if(!isNaN(alt[i])){f0=i;break;}}if(f0<0)return null;for(var i=0;i<f0;i++)alt[i]=alt[f0];for(var i=f0+1;i<alt.length;i++){if(isNaN(alt[i]))alt[i]=alt[i-1];}var segs=[],inC=false,sS=0;for(var i=50;i<r.length;i++){var dh=alt[i]-alt[i-50];var dd=r[i].distance!=null&&r[i-50].distance!=null?(r[i].distance-r[i-50].distance):50*(r[i].speed||0);var g=dd>5?dh/dd:0;if(g>=.03){if(!inC){inC=true;sS=i;}}else{if(inC&&i-sS>=30)segs.push({a:sS,b:i});inC=false;}}if(inC&&r.length-sS>=30)segs.push({a:sS,b:r.length});if(!segs.length)return null;var sum=0,n=0;segs.forEach(function(s){var ch=r.slice(s.a,s.b);var vs=ch.map(function(x){return x.speed;}).filter(function(x){return x!=null;});var cs=ch.map(function(x){return x.cadence;}).filter(function(x){return x!=null;});if(vs.length<10||cs.length<10)return;var vm=vs.reduce(function(a,b){return a+b;},0)/vs.length;var cm=cs.reduce(function(a,b){return a+b;},0)/cs.length;var sv2=Math.sqrt(vs.reduce(function(s,x){return s+(x-vm)*(x-vm);},0)/vs.length);var sc=Math.sqrt(cs.reduce(function(s,x){return s+(x-cm)*(x-cm);},0)/cs.length);sum+=.5*(sv2/(vm||1))+.5*(sc/(cm||1));n++;});return n?sum/n:null;}
function mVI(r){
  var tm=r.timer||[],ev=tm.length>0,GAP=30,W=30,win=[],ws=0,s4=0,n4=0,sP=0,nP=0,pT=null,pP=0,j=0;
  function put(p){sP+=p;nP++;win.push(p);ws+=p;if(win.length>W)ws-=win.shift();if(win.length===W){var a=ws/W;s4+=a*a*a*a;n4++;}}
  for(var i=0;i<r.length;i++){
    var x=r[i];if(x.timestamp==null||x.power==null||!(x.power>=0&&x.power<=3000))continue;
    var t=Math.round(x.timestamp),p=x.power,stop=false;
    while(j<tm.length&&tm[j].t<t){if(pT!==null&&tm[j].t>=pT&&(tm[j].k===1||tm[j].k===4||tm[j].k===8||tm[j].k===9))stop=true;j++;}
    if(pT===null)put(p);
    else{var dt=t-pT;if(dt<=0)continue;
      if(ev?stop:dt>GAP){win=[];ws=0;put(p);}
      else{for(var k=1;k<dt;k++)put(pP);put(p);}}
    pT=t;pP=p;
  }
  if(!n4)return null;
  var NP=Math.pow(s4/n4,.25),AP=sP/nP;return AP>0?NP/AP:null;
}
function mPW(r){var v=r.filter(function(x){return x.power>0&&x.power<=3000&&x.heart_rate>=40&&x.heart_rate<=220;});if(v.length<20)return null;var h=Math.floor(v.length/2);var r1=v.slice(0,h).map(function(x){return x.power/x.heart_rate;});var r2=v.slice(h).map(function(x){return x.power/x.heart_rate;});var R1=r1.reduce(function(a,b){return a+b;},0)/r1.length;var R2=r2.reduce(function(a,b){return a+b;},0)/r2.length;return R1>0?(R1-R2)/R1*100:null;}
// END VERBATIM

if (typeof module !== "undefined") module.exports = { aF, parseFIT, getThresh, mcInit, mcRun, stat2, statVI, mcEnd, computeAll, computeAllAsync, mCV, mVC, mIES, mVI, mPW, VIT, N_MC: N_MC };
