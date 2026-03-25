import Head from 'next/head';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

const DOMAINS = {
  work:       { label:'Work',       color:'#378ADD', light:'#E6F1FB', dark:'#0C447C', goal:8 },
  spiritual:  { label:'Spiritual',  color:'#7F77DD', light:'#EEEDFE', dark:'#3C3489', goal:1 },
  social:     { label:'Social',     color:'#D4537E', light:'#FBEAF0', dark:'#72243E', goal:2 },
  fitness:    { label:'Fitness',    color:'#639922', light:'#EAF3DE', dark:'#27500A', goal:1 },
  creativity: { label:'Creativity', color:'#BA7517', light:'#FAEEDA', dark:'#633806', goal:1.5 },
};
const PRI_STYLES = { high:{bg:'#FCEBEB',txt:'#A32D2D'}, medium:{bg:'#FAEEDA',txt:'#633806'}, low:{bg:'#EAF3DE',txt:'#27500A'} };
const RECUR_OPTIONS = [
  {value:'none',label:'No repeat'},{value:'daily',label:'Every day'},
  {value:'weekdays',label:'Weekdays (Mon–Fri)'},{value:'weekends',label:'Weekends (Sat–Sun)'},
  {value:'alternate',label:'Every alternate day'},{value:'weekly',label:'Every week'},
  {value:'fortnightly',label:'Every fortnight'},{value:'monthly',label:'Every month'},
];
const MON='2026-03-23',TUE='2026-03-24',WED='2026-03-25',THU='2026-03-26',FRI='2026-03-20',SAT='2026-03-21',SUN='2026-03-22';
const DEFAULT_BLOCKS = [
  {id:1,title:'Bible reading, meditation & prayer',domain:'spiritual',start:'06:15',end:'06:35',recur:'daily',date:FRI},
  {id:2,title:'Church',domain:'spiritual',start:'08:30',end:'11:00',recur:'weekly',date:SUN},
  {id:3,title:'Small group area meeting',domain:'spiritual',start:'19:00',end:'21:30',recur:'fortnightly',date:FRI},
  {id:4,title:'Sunday reflection & journaling',domain:'spiritual',start:'16:00',end:'16:30',recur:'weekly',date:SUN},
  {id:5,title:'Work',domain:'work',start:'07:10',end:'19:00',recur:'weekdays',date:MON},
  {id:6,title:'Gym / workout',domain:'fitness',start:'09:00',end:'10:00',recur:'weekly',date:SAT},
  {id:7,title:'Evening walk',domain:'fitness',start:'20:00',end:'20:30',recur:'weekly',date:MON},
  {id:8,title:'Evening walk',domain:'fitness',start:'20:00',end:'20:30',recur:'weekly',date:WED},
  {id:9,title:'Learning — course / reading',domain:'work',start:'20:00',end:'20:45',recur:'weekly',date:TUE},
  {id:10,title:'Learning — course / reading',domain:'work',start:'20:00',end:'20:45',recur:'weekly',date:THU},
  {id:11,title:'Week planning & goal review',domain:'work',start:'17:00',end:'17:30',recur:'weekly',date:SUN},
  {id:12,title:'Family dinner & wind-down',domain:'social',start:'19:30',end:'20:00',recur:'weekdays',date:MON},
  {id:13,title:'Grocery shopping (family)',domain:'social',start:'10:30',end:'12:00',recur:'weekly',date:SAT},
  {id:14,title:'Family outing',domain:'social',start:'13:00',end:'16:00',recur:'weekly',date:SAT},
  {id:15,title:'Family lunch after church',domain:'social',start:'11:30',end:'13:00',recur:'weekly',date:SUN},
  {id:16,title:'Family evening',domain:'social',start:'17:00',end:'19:00',recur:'weekly',date:SAT},
  {id:17,title:'Journaling / sketching / music',domain:'creativity',start:'20:00',end:'21:00',recur:'weekly',date:FRI},
  {id:18,title:'Creative project time',domain:'creativity',start:'14:00',end:'15:00',recur:'weekly',date:SAT},
];
const DEFAULT_TASKS = [];
const DEFAULT_WEEK = {work:[0,0,0,0,0,0,0],spiritual:[0,0,0,0,0,0,0],social:[0,0,0,0,0,0,0],fitness:[0,0,0,0,0,0,0],creativity:[0,0,0,0,0,0,0]};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayKey(){return new Date().toISOString().slice(0,10);}
function weekKey(){const d=new Date();const mon=new Date(d);mon.setDate(d.getDate()-(d.getDay()===0?6:d.getDay()-1));return mon.toISOString().slice(0,10);}
function safeArr(v,fb){return Array.isArray(v)?v:fb;}
function fmtTime(h24){const[h,m]=h24.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;}
function clockStr(d){const h=d.getHours(),m=d.getMinutes();return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;}
function toMins(t){const[h,m]=t.split(':').map(Number);return h*60+m;}
function occursOn(block,date){
  const base=new Date(block.date+'T00:00:00'),target=new Date(date.toISOString().slice(0,10)+'T00:00:00');
  const diff=Math.round((target-base)/86400000);
  if(diff<0)return false;
  const dow=target.getDay();
  switch(block.recur){
    case 'none':return diff===0;case 'daily':return true;
    case 'weekdays':return dow>=1&&dow<=5;case 'weekends':return dow===0||dow===6;
    case 'alternate':return diff%2===0;case 'weekly':return diff%7===0;
    case 'fortnightly':return diff%14===0;case 'monthly':return target.getDate()===base.getDate();
    default:return diff===0;
  }
}
function sanitize(data){
  if(!data||typeof data!=='object')return{tasks:[],blocks:DEFAULT_BLOCKS,week:DEFAULT_WEEK,streak:{count:1,lastDate:todayKey()},sessions:[],lastReview:null};
  return{
    tasks:safeArr(data.tasks,[]),
    blocks:safeArr(data.blocks,DEFAULT_BLOCKS),
    week:(data.week&&typeof data.week==='object')?data.week:DEFAULT_WEEK,
    streak:(data.streak&&typeof data.streak==='object')?data.streak:{count:1,lastDate:todayKey()},
    sessions:safeArr(data.sessions,[]),
    lastReview:data.lastReview||null,
  };
}
function lsLoad(){try{const r=localStorage.getItem('lb_app');return r?sanitize(JSON.parse(r)):null;}catch{return null;}}
function lsSave(s){try{localStorage.setItem('lb_app',JSON.stringify(s));}catch{}}
let syncTimer=null;
function scheduleSync(state){clearTimeout(syncTimer);syncTimer=setTimeout(()=>{fetch('/api/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)}).catch(()=>{});},1500);}
function blockedMins(blocks,domain,date){
  return safeArr(blocks,[]).filter(b=>b.domain===domain&&occursOn(b,date)).reduce((acc,b)=>{
    const[sh,sm]=b.start.split(':').map(Number),[eh,em]=b.end.split(':').map(Number);
    return acc+(eh*60+em-sh*60-sm);
  },0);
}
function layoutBlocks(blocks){
  const sorted=[...blocks].sort((a,b)=>toMins(a.start)-toMins(b.start));
  const columns=[],result=[];
  sorted.forEach(block=>{
    const bStart=toMins(block.start),bEnd=toMins(block.end);let placed=false;
    for(let c=0;c<columns.length;c++){if(toMins(columns[c][columns[c].length-1].end)<=bStart){columns[c].push(block);result.push({block,col:c});placed=true;break;}}
    if(!placed){columns.push([block]);result.push({block,col:columns.length-1});}
  });
  result.forEach(item=>{
    const bStart=toMins(item.block.start),bEnd=toMins(item.block.end);let maxCol=item.col;
    result.forEach(o=>{const oS=toMins(o.block.start),oE=toMins(o.block.end);if(oS<bEnd&&oE>bStart)maxCol=Math.max(maxCol,o.col);});
    item.totalCols=maxCol+1;
  });
  return result;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cs={
  card:{background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:'12px 14px'},
  s2:{background:'var(--surface2)',borderRadius:12,padding:'14px'},
  pill:(bg,txt)=>({display:'inline-flex',padding:'2px 9px',borderRadius:20,fontSize:11,fontWeight:500,background:bg,color:txt}),
  btn:{background:'var(--text)',color:'var(--bg)',border:'none',padding:'8px 16px',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer'},
  nav:(a)=>({padding:'10px 14px',fontSize:13,background:'none',border:'none',borderBottom:a?'2px solid var(--text)':'2px solid transparent',color:a?'var(--text)':'var(--text2)',fontWeight:a?500:400,cursor:'pointer',whiteSpace:'nowrap'}),
  ghost:{background:'none',border:'0.5px solid var(--border)',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:12,color:'var(--text2)'},
};

// ─── Form Components ──────────────────────────────────────────────────────────

function BlockEditForm({block,onSave,onCancel}){
  const[f,setF]=useState({...block});
  return(
    <div style={{background:'var(--surface2)',borderRadius:10,padding:12,marginBottom:8}}>
      <div style={{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap'}}>
        <input style={{flex:2,minWidth:120}} value={f.title} onChange={e=>setF(x=>({...x,title:e.target.value}))}/>
        <select value={f.domain} onChange={e=>setF(x=>({...x,domain:e.target.value}))}>{Object.entries(DOMAINS).map(([k,d])=><option key={k} value={k}>{d.label}</option>)}</select>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap'}}>
        <input type="time" value={f.start} onChange={e=>setF(x=>({...x,start:e.target.value}))}/>
        <input type="time" value={f.end} onChange={e=>setF(x=>({...x,end:e.target.value}))}/>
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <select value={f.recur} onChange={e=>setF(x=>({...x,recur:e.target.value}))} style={{flex:1}}>{RECUR_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
      </div>
      <div style={{display:'flex',gap:8,marginTop:10}}>
        <button style={cs.btn} onClick={()=>onSave(f)}>Save</button>
        <button style={cs.ghost} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function TaskEditForm({task,onSave,onCancel}){
  const[f,setF]=useState({...task});
  return(
    <div style={{background:'var(--surface2)',borderRadius:10,padding:12,marginBottom:8}}>
      <div style={{display:'flex',gap:8,marginBottom:8}}><input style={{flex:1}} value={f.title} onChange={e=>setF(x=>({...x,title:e.target.value}))}/></div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <select value={f.domain} onChange={e=>setF(x=>({...x,domain:e.target.value}))}>{Object.entries(DOMAINS).map(([k,d])=><option key={k} value={k}>{d.label}</option>)}</select>
        <select value={f.pri} onChange={e=>setF(x=>({...x,pri:e.target.value}))}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
      </div>
      <div style={{display:'flex',gap:8,marginTop:10}}>
        <button style={cs.btn} onClick={()=>onSave(f)}>Save</button>
        <button style={cs.ghost} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ─── NEW: Focus Timer ─────────────────────────────────────────────────────────
// Floating Pomodoro timer. Logs completed sessions as minutes per domain.

function FocusTimer({onLog,addToast}){
  const[open,setOpen]=useState(false);
  const[domain,setDomain]=useState('work');
  const[phase,setPhase]=useState('idle'); // idle | work | break
  const[secs,setSecs]=useState(25*60);
  const WORK=25,BREAK=5;
  const timerRef=useRef(null);

  const startWork=()=>{clearInterval(timerRef.current);setPhase('work');setSecs(WORK*60);};
  const stopAndLog=()=>{
    clearInterval(timerRef.current);
    if(phase==='work'){
      const elapsed=Math.max(1,Math.round((WORK*60-secs)/60));
      onLog(domain,elapsed);
      addToast(`${elapsed}m logged for ${DOMAINS[domain].label} ✅`);
    }
    setPhase('idle');setSecs(WORK*60);
  };

  useEffect(()=>{
    if(phase==='idle'){clearInterval(timerRef.current);return;}
    timerRef.current=setInterval(()=>{
      setSecs(s=>{
        if(s<=1){
          clearInterval(timerRef.current);
          if(phase==='work'){
            onLog(domain,WORK);
            addToast(`${WORK}m deep work logged for ${DOMAINS[domain].label} 🎯`);
            setPhase('break');setSecs(BREAK*60);
            return 0;
          }else{
            setPhase('idle');setSecs(WORK*60);return 0;
          }
        }
        return s-1;
      });
    },1000);
    return()=>clearInterval(timerRef.current);
  },[phase,domain]);

  const mm=String(Math.floor(secs/60)).padStart(2,'0');
  const ss2=String(secs%60).padStart(2,'0');
  const d=DOMAINS[domain];
  const isRunning=phase!=='idle';
  const progress=phase==='work'?1-(secs/(WORK*60)):phase==='break'?1-(secs/(BREAK*60)):0;
  const circumference=2*Math.PI*34;

  return(
    <div style={{position:'fixed',bottom:88,right:16,zIndex:200}}>
      {!open?(
        <button onClick={()=>setOpen(true)} title="Focus timer" style={{
          width:50,height:50,borderRadius:'50%',
          background:isRunning?d.color:'var(--surface)',
          border:`1.5px solid ${isRunning?d.color:'var(--border)'}`,
          cursor:'pointer',fontSize:20,display:'flex',alignItems:'center',
          justifyContent:'center',boxShadow:'0 2px 12px rgba(0,0,0,0.12)',
          transition:'all 0.2s',
        }}>
          {isRunning?<span style={{fontSize:13,fontWeight:600,color:'#fff'}}>{mm}</span>:'⏱'}
        </button>
      ):(
        <div style={{
          background:'var(--surface)',border:'0.5px solid var(--border)',
          borderRadius:20,padding:'18px 18px 16px',width:230,
          boxShadow:'0 8px 32px rgba(0,0,0,0.14)',
        }}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:500}}>Focus timer</div>
            <button onClick={()=>setOpen(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--text2)',lineHeight:1}}>×</button>
          </div>

          {/* Circular progress ring */}
          <div style={{display:'flex',justifyContent:'center',marginBottom:14,position:'relative'}}>
            <svg width={84} height={84}>
              <circle cx={42} cy={42} r={34} fill="none" stroke="var(--border)" strokeWidth={4}/>
              {isRunning&&(
                <circle cx={42} cy={42} r={34} fill="none"
                  stroke={phase==='break'?'#639922':d.color} strokeWidth={4}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference*(1-progress)}
                  transform="rotate(-90 42 42)"
                  style={{transition:'stroke-dashoffset 0.9s linear'}}
                />
              )}
              <text x={42} y={44} textAnchor="middle" dominantBaseline="middle"
                style={{fontSize:18,fontWeight:600,fill:'var(--text)',fontFamily:'inherit'}}>
                {mm}:{ss2}
              </text>
            </svg>
          </div>

          <div style={{textAlign:'center',fontSize:11,color:'var(--text2)',marginBottom:14,height:16}}>
            {phase==='idle'&&'Select domain and start'}
            {phase==='work'&&`Focusing on ${d.label}`}
            {phase==='break'&&'Break — well done!'}
          </div>

          {phase==='idle'&&(
            <select value={domain} onChange={e=>setDomain(e.target.value)}
              style={{width:'100%',marginBottom:12,fontSize:13,padding:'6px 8px',
                borderRadius:8,border:'0.5px solid var(--border)',background:'var(--surface)',color:'var(--text)'}}>
              {Object.entries(DOMAINS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          )}

          <div style={{display:'flex',gap:8}}>
            {phase==='idle'?(
              <button onClick={startWork} style={{...cs.btn,flex:1,textAlign:'center',
                background:d.color,borderRadius:10,padding:'10px 0'}}>
                Start 25m
              </button>
            ):(
              <>
                <button onClick={stopAndLog} style={{...cs.btn,flex:1,textAlign:'center',
                  background:'#E24B4A',borderRadius:10,padding:'10px 0',fontSize:12}}>
                  Stop & log
                </button>
                {phase==='break'&&(
                  <button onClick={startWork} style={{...cs.ghost,flex:1,textAlign:'center',
                    borderRadius:10,padding:'10px 0',fontSize:12}}>
                    Work again
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NEW: Balance Wheel SVG Radar ────────────────────────────────────────────
// Pure SVG radar chart. No external library needed.

function BalanceWheel({pcts}){
  const cx=140,cy=140,R=100;
  const domainList=Object.entries(DOMAINS);
  const n=domainList.length;

  function polarToXY(i,scale){
    const angle=(i/n)*2*Math.PI-Math.PI/2;
    return[cx+R*scale*Math.cos(angle),cy+R*scale*Math.sin(angle)];
  }

  const gridLevels=[0.25,0.5,0.75,1.0];
  const gridPolygons=gridLevels.map(level=>{
    const pts=domainList.map((_,i)=>polarToXY(i,level).join(',')).join(' ');
    return{pts,level};
  });

  const dataPoints=domainList.map(([k],i)=>polarToXY(i,(pcts[i]||0)/100));
  const dataPolygon=dataPoints.map(p=>p.join(',')).join(' ');
  const outerPoints=domainList.map((_,i)=>polarToXY(i,1));

  return(
    <svg width="100%" viewBox="0 0 280 280" style={{maxWidth:280,margin:'0 auto',display:'block'}}>
      {/* Grid polygons */}
      {gridPolygons.map(({pts,level})=>(
        <polygon key={level} points={pts} fill="none"
          stroke="var(--border)" strokeWidth={level===1?1:0.5}/>
      ))}
      {/* Grid % labels at top spoke */}
      {gridLevels.map(level=>{
        const[lx,ly]=polarToXY(0,level);
        return(
          <text key={level} x={lx+4} y={ly} style={{fontSize:9,fill:'var(--text3)',fontFamily:'inherit'}}>
            {Math.round(level*100)}%
          </text>
        );
      })}
      {/* Spokes */}
      {outerPoints.map(([x,y],i)=>(
        <line key={i} x1={cx} y1={cy} x2={x} y2={y}
          stroke="var(--border)" strokeWidth={0.5}/>
      ))}
      {/* Data fill */}
      <polygon points={dataPolygon} fill="rgba(55,138,221,0.12)" stroke="#378ADD" strokeWidth={1.5}/>
      {/* Data dots */}
      {dataPoints.map(([x,y],i)=>{
        const[k,d]=domainList[i];
        return(
          <circle key={k} cx={x} cy={y} r={5} fill={d.color}
            stroke="var(--surface)" strokeWidth={2}/>
        );
      })}
      {/* Labels */}
      {domainList.map(([k,d],i)=>{
        const angle=(i/n)*2*Math.PI-Math.PI/2;
        const labelR=R+26;
        const lx=cx+labelR*Math.cos(angle);
        const ly=cy+labelR*Math.sin(angle);
        const pct=pcts[i]||0;
        return(
          <g key={k}>
            <text x={lx} y={ly-5} textAnchor="middle" dominantBaseline="central"
              style={{fontSize:11,fontWeight:500,fill:d.dark,fontFamily:'inherit'}}>
              {d.label}
            </text>
            <text x={lx} y={ly+10} textAnchor="middle"
              style={{fontSize:10,fill:'var(--text2)',fontFamily:'inherit'}}>
              {pct}%
            </text>
          </g>
        );
      })}
      {/* Centre score */}
      <text x={cx} y={cy-8} textAnchor="middle"
        style={{fontSize:22,fontWeight:500,fill:'var(--text)',fontFamily:'inherit'}}>
        {Math.round(pcts.reduce((a,b)=>a+b,0)/pcts.length)}%
      </text>
      <text x={cx} y={cy+10} textAnchor="middle"
        style={{fontSize:10,fill:'var(--text2)',fontFamily:'inherit'}}>balance</text>
    </svg>
  );
}

// ─── NEW: Weekly Review Modal ─────────────────────────────────────────────────
// Triggered on Sunday or via manual button in Progress tab.

function WeeklyReview({app,onSave,onDismiss}){
  const[q1,setQ1]=useState('');
  const[q2,setQ2]=useState('');
  const[q3,setQ3]=useState('');
  const domainList=Object.entries(DOMAINS);
  const allPcts=domainList.map(([k,d])=>{
    const arr=safeArr(app.week[k],[0,0,0,0,0,0,0]);
    return Math.min(100,Math.round(arr.reduce((a,b)=>a+b,0)/d.goal/7*100));
  });
  const score=Math.round(allPcts.reduce((a,b)=>a+b,0)/allPcts.length);
  const lowest=domainList.reduce((min,[k,d],i)=>allPcts[i]<allPcts[min[2]]?[k,d,i]:min,['work',DOMAINS.work,0]);
  const highest=domainList.reduce((max,[k,d],i)=>allPcts[i]>allPcts[max[2]]?[k,d,i]:max,['work',DOMAINS.work,0]);

  const submit=()=>{
    if(!q1.trim()&&!q2.trim()&&!q3.trim())return;
    onSave({date:todayKey(),went_well:q1,neglected:q2,priority:q3,score});
  };

  return(
    <div style={{
      position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:500,
      display:'flex',alignItems:'flex-end',justifyContent:'center',padding:'0 0 0 0',
    }} onClick={e=>{if(e.target===e.currentTarget)onDismiss();}}>
      <div style={{
        background:'var(--bg)',borderRadius:'20px 20px 0 0',padding:'24px 20px 32px',
        width:'100%',maxWidth:680,maxHeight:'90vh',overflowY:'auto',
        boxShadow:'0 -8px 40px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div>
            <div style={{fontSize:18,fontWeight:500}}>Weekly review</div>
            <div style={{fontSize:12,color:'var(--text2)',marginTop:2}}>
              {new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}
            </div>
          </div>
          <button onClick={onDismiss} style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:'var(--text2)'}}>×</button>
        </div>

        {/* Last week snapshot */}
        <div style={{...cs.s2,marginBottom:20}}>
          <div style={{fontSize:12,color:'var(--text2)',marginBottom:12,fontWeight:500}}>Last week at a glance</div>
          <div style={{display:'flex',gap:12,marginBottom:14,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:80,textAlign:'center'}}>
              <div style={{fontSize:28,fontWeight:500}}>{score}%</div>
              <div style={{fontSize:11,color:'var(--text2)'}}>Overall balance</div>
            </div>
            <div style={{flex:1,minWidth:80,textAlign:'center'}}>
              <div style={{fontSize:22,fontWeight:500,color:highest[1].dark}}>{highest[1].label}</div>
              <div style={{fontSize:11,color:'var(--text2)'}}>Most time</div>
            </div>
            <div style={{flex:1,minWidth:80,textAlign:'center'}}>
              <div style={{fontSize:22,fontWeight:500,color:lowest[1].dark}}>{lowest[1].label}</div>
              <div style={{fontSize:11,color:'var(--text2)'}}>Needs attention</div>
            </div>
          </div>
          {domainList.map(([k,d],i)=>(
            <div key={k} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <div style={{width:72,fontSize:12,fontWeight:500,color:d.dark}}>{d.label}</div>
              <div style={{flex:1,height:6,background:'var(--border)',borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${allPcts[i]}%`,background:d.color,borderRadius:3}}/>
              </div>
              <div style={{width:32,fontSize:11,color:'var(--text2)',textAlign:'right'}}>{allPcts[i]}%</div>
            </div>
          ))}
        </div>

        {/* 3 reflection questions */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:500,marginBottom:6}}>What went well this week?</div>
          <textarea value={q1} onChange={e=>setQ1(e.target.value)} rows={2}
            placeholder="e.g. Stayed consistent with morning prayer, had great family time..."
            style={{width:'100%',borderRadius:8,border:'0.5px solid var(--border)',
              padding:'10px 12px',fontSize:13,resize:'vertical',background:'var(--surface)',
              color:'var(--text)',boxSizing:'border-box'}}/>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:500,marginBottom:6}}>What was neglected or felt off?</div>
          <textarea value={q2} onChange={e=>setQ2(e.target.value)} rows={2}
            placeholder="e.g. Missed gym sessions, less creative time..."
            style={{width:'100%',borderRadius:8,border:'0.5px solid var(--border)',
              padding:'10px 12px',fontSize:13,resize:'vertical',background:'var(--surface)',
              color:'var(--text)',boxSizing:'border-box'}}/>
        </div>
        <div style={{marginBottom:24}}>
          <div style={{fontSize:13,fontWeight:500,marginBottom:6}}>What is the #1 priority for next week?</div>
          <textarea value={q3} onChange={e=>setQ3(e.target.value)} rows={2}
            placeholder="e.g. Block at least 3 fitness sessions, finish the creative project..."
            style={{width:'100%',borderRadius:8,border:'0.5px solid var(--border)',
              padding:'10px 12px',fontSize:13,resize:'vertical',background:'var(--surface)',
              color:'var(--text)',boxSizing:'border-box'}}/>
        </div>

        <div style={{display:'flex',gap:10}}>
          <button onClick={submit} style={{...cs.btn,flex:1,padding:'12px 0',borderRadius:10,textAlign:'center',fontSize:14}}>
            Save review
          </button>
          <button onClick={onDismiss} style={{...cs.ghost,padding:'12px 16px',borderRadius:10,fontSize:13}}>
            Later
          </button>
        </div>

        {/* Suggest area (shown only after any prev review exists in app) */}
        {app.lastReview&&(
          <div style={{marginTop:18,padding:'12px 14px',background:'var(--surface2)',borderRadius:10}}>
            <div style={{fontSize:12,color:'var(--text2)',marginBottom:4}}>Last week you prioritised:</div>
            <div style={{fontSize:13,fontStyle:'italic',color:'var(--text)'}}>{app.lastReview.priority||'—'}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({tasks,blocks,sessions,onNavigate,onOpenReview}){
  const today=new Date(),t=safeArr(tasks,[]),b=safeArr(blocks,[]);
  const highPri=t.filter(x=>x.pri==='high'&&!x.done).slice(0,5);
  const totalH=(Object.keys(DOMAINS).reduce((a,k)=>a+blockedMins(b,k,today),0)/60).toFixed(1);
  const todayBlocks=b.filter(x=>occursOn(x,today));

  // Today's focus sessions
  const todayKey2=today.toISOString().slice(0,10);
  const todaySessions=safeArr(sessions,[]).filter(s=>s.date===todayKey2);
  const focusMins=todaySessions.reduce((a,s)=>a+s.mins,0);

  return(
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:8,marginBottom:20}}>
        {Object.entries(DOMAINS).map(([k,d])=>{
          const hrs=blockedMins(b,k,today)/60,pct=Math.min(100,Math.round(hrs/d.goal*100));
          return(<div key={k} style={{...cs.card,borderTop:`3px solid ${d.color}`}}>
            <div style={{fontSize:12,fontWeight:500,color:d.dark,marginBottom:4}}>{d.label}</div>
            <div style={{height:4,background:'var(--border)',borderRadius:2,overflow:'hidden',margin:'4px 0'}}><div style={{height:'100%',width:`${pct}%`,background:d.color,borderRadius:2}}/></div>
            <div style={{fontSize:11,color:'var(--text2)'}}>{hrs.toFixed(1)}h / {d.goal}h</div>
            <div style={{fontSize:13,fontWeight:500,color:d.dark,marginTop:2}}>{pct}%</div>
          </div>);
        })}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:8,marginBottom:20}}>
        {[
          ['Time planned',`${totalH}h`,null],
          ['Focus today',`${focusMins}m`,null],
          ['Tasks done',`${t.filter(x=>x.done).length}/${t.length}`,'tasks'],
          ['High priority',`${t.filter(x=>x.pri==='high'&&x.done).length}/${t.filter(x=>x.pri==='high').length}`,'tasks-high'],
        ].map(([l,v,nav])=>(
          <div key={l} onClick={nav?()=>onNavigate(nav):undefined}
            style={{background:'var(--surface2)',borderRadius:8,padding:'12px 14px',cursor:nav?'pointer':'default'}}>
            <div style={{fontSize:11,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:4}}>{l}</div>
            <div style={{fontSize:22,fontWeight:500}}>{v}</div>
            {nav&&<div style={{fontSize:10,color:'var(--text3)',marginTop:3}}>tap to view →</div>}
          </div>
        ))}
      </div>

      {/* Sunday review nudge */}
      {new Date().getDay()===0&&(
        <div onClick={onOpenReview} style={{
          ...cs.s2,marginBottom:20,cursor:'pointer',
          borderLeft:'3px solid #7F77DD',
          display:'flex',alignItems:'center',justifyContent:'space-between',
        }}>
          <div>
            <div style={{fontSize:13,fontWeight:500,color:'#3C3489'}}>Weekly review</div>
            <div style={{fontSize:12,color:'var(--text2)'}}>Sunday check-in — reflect & plan ahead</div>
          </div>
          <div style={{fontSize:18,color:'#7F77DD'}}>→</div>
        </div>
      )}

      <div style={{fontSize:14,fontWeight:500,marginBottom:10}}>High priority focus</div>
      {highPri.length===0?<div style={{color:'var(--text2)',fontSize:13,padding:'8px 0'}}>{t.length===0?'No tasks yet — add some in the Tasks tab.':'All high-priority tasks done! 🎉'}</div>
        :highPri.map(task=>{const d=DOMAINS[task.domain];return(
          <div key={task.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',background:'var(--surface2)',borderRadius:8,marginBottom:6}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:d.color,flexShrink:0}}/>
            <div style={{flex:1,fontSize:13}}>{task.title}</div>
            <span style={cs.pill(d.light,d.dark)}>{d.label}</span>
          </div>
        );})}
    </div>
  );
}

// ─── Block Pill ───────────────────────────────────────────────────────────────

function BlockPill({block,onDelete,onEdit,showTime}){
  const d=DOMAINS[block.domain],recurLabel=RECUR_OPTIONS.find(o=>o.value===block.recur)?.label;
  return(
    <div style={{padding:'6px 9px',borderRadius:8,marginBottom:4,background:d.light,borderLeft:`3px solid ${d.color}`}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div style={{flex:1}}>
          <div style={{fontWeight:500,fontSize:12,color:d.dark}}>{block.title}</div>
          <div style={{fontSize:11,color:d.dark,opacity:0.7}}>
            {showTime&&`${fmtTime(block.start)} – ${fmtTime(block.end)}`}
            {block.recur&&block.recur!=='none'&&<span style={{marginLeft:showTime?6:0}}> · {recurLabel}</span>}
          </div>
        </div>
        <div style={{display:'flex',gap:6,marginLeft:8,flexShrink:0}}>
          <button onClick={onEdit} style={{background:'none',border:'none',color:d.dark,fontSize:12,opacity:0.6,cursor:'pointer',padding:'0 2px'}}>✎</button>
          <button onClick={onDelete} style={{background:'none',border:'none',color:d.dark,fontSize:14,opacity:0.5,cursor:'pointer',padding:'0 2px'}}>×</button>
        </div>
      </div>
    </div>
  );
}

// ─── Day Timeline ─────────────────────────────────────────────────────────────

function DayTimeline({date,blocks,editId,setEditId,onDelete,onSaveEdit}){
  const now=new Date(),isToday=date.toDateString()===now.toDateString();
  const nowMins=now.getHours()*60+now.getMinutes();
  const HOUR_H=64,START_H=5,END_H=23,HOURS=END_H-START_H;
  const dayBlocks=safeArr(blocks,[]).filter(b=>occursOn(b,date));
  const laid=layoutBlocks(dayBlocks);
  return(
    <div style={{position:'relative'}}>
      <div style={{position:'relative',height:HOURS*HOUR_H}}>
        {Array.from({length:HOURS+1},(_,i)=>i+START_H).map(h=>{
          const top=(h-START_H)*HOUR_H,label=fmtTime(`${String(h).padStart(2,'0')}:00`).replace(':00','');
          return(<div key={h} style={{position:'absolute',top,left:0,right:0,display:'flex',gap:10}}>
            <div style={{width:52,fontSize:11,color:'var(--text2)',textAlign:'right',flexShrink:0,marginTop:-7}}>{label}</div>
            <div style={{flex:1,borderTop:'0.5px solid var(--border)'}}/>
          </div>);
        })}
        {isToday&&nowMins>=START_H*60&&nowMins<=END_H*60&&(
          <div style={{position:'absolute',top:(nowMins-START_H*60)/60*HOUR_H,left:52,right:0,height:2,background:'#E24B4A',zIndex:10,display:'flex',alignItems:'center'}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#E24B4A',marginLeft:-4}}/>
            <span style={{fontSize:10,color:'#A32D2D',fontWeight:600,marginLeft:4}}>NOW</span>
          </div>
        )}
        {laid.map(({block,col,totalCols})=>{
          const startM=toMins(block.start),endM=toMins(block.end);
          const top=(startM-START_H*60)/60*HOUR_H,height=Math.max((endM-startM)/60*HOUR_H-4,20);
          const L=62,colW=`calc((100% - ${L}px) / ${totalCols})`,left=`calc(${L}px + ${col} * (100% - ${L}px) / ${totalCols})`;
          const d=DOMAINS[block.domain];
          if(editId===block.id)return(<div key={block.id} style={{position:'absolute',top,left,width:colW,zIndex:20,paddingRight:4}}><BlockEditForm block={block} onSave={onSaveEdit} onCancel={()=>setEditId(null)}/></div>);
          return(
            <div key={block.id} style={{position:'absolute',top,left,width:colW,paddingRight:4,zIndex:5,boxSizing:'border-box'}}>
              <div style={{height,background:d.light,borderLeft:`3px solid ${d.color}`,borderRadius:6,padding:'3px 6px',overflow:'hidden',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div style={{fontSize:11,fontWeight:600,color:d.dark,lineHeight:1.3,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{block.title}</div>
                  <div style={{display:'flex',gap:2,flexShrink:0}}>
                    <button onClick={()=>setEditId(block.id)} style={{background:'none',border:'none',color:d.dark,fontSize:11,opacity:0.6,cursor:'pointer',padding:0}}>✎</button>
                    <button onClick={()=>onDelete(block.id)} style={{background:'none',border:'none',color:d.dark,fontSize:13,opacity:0.5,cursor:'pointer',padding:0}}>×</button>
                  </div>
                </div>
                {height>32&&<div style={{fontSize:10,color:d.dark,opacity:0.7}}>{fmtTime(block.start)} – {fmtTime(block.end)}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

function Schedule({blocks,onChange}){
  const today=new Date();
  const[view,setView]=useState('day'),[offset,setOffset]=useState(0);
  const[form,setForm]=useState({title:'',domain:'work',start:'09:00',end:'10:00',recur:'none'});
  const[editId,setEditId]=useState(null);
  const sb=safeArr(blocks,[]),maxId=sb.reduce((a,b)=>Math.max(a,b.id||0),0);
  function anchorDate(){const d=new Date(today);if(view==='day')d.setDate(d.getDate()+offset);if(view==='week')d.setDate(d.getDate()+offset*7);if(view==='month')d.setMonth(d.getMonth()+offset);return d;}
  function getDates(){
    const anchor=anchorDate();
    if(view==='day')return[new Date(anchor)];
    if(view==='week'){const dow=anchor.getDay(),mon=new Date(anchor);mon.setDate(anchor.getDate()-(dow===0?6:dow-1));return Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d;});}
    if(view==='month'){const y=anchor.getFullYear(),m=anchor.getMonth();return Array.from({length:new Date(y,m+1,0).getDate()},(_,i)=>new Date(y,m,i+1));}
    return[];
  }
  function viewLabel(){
    const anchor=anchorDate();
    if(view==='day'){const isT=anchor.toDateString()===today.toDateString();return isT?'Today':anchor.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short'});}
    if(view==='week'){const ds=getDates();return `${ds[0].toLocaleDateString('en-GB',{day:'numeric',month:'short'})} – ${ds[6].toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`;}
    if(view==='month')return anchor.toLocaleDateString('en-GB',{month:'long',year:'numeric'});
  }
  const add=()=>{if(!form.title.trim())return;onChange([...sb,{...form,id:maxId+1,date:anchorDate().toISOString().slice(0,10)}]);setForm(f=>({...f,title:''}));};
  const saveEdit=(u)=>{onChange(sb.map(b=>b.id===u.id?u:b));setEditId(null);};
  const dates=getDates();
  return(
    <div>
      <div style={{...cs.s2,marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Add time block</div>
        <div style={{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap'}}>
          <input style={{flex:2,minWidth:120}} placeholder="Activity name..." value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&add()}/>
          <select value={form.domain} onChange={e=>setForm(f=>({...f,domain:e.target.value}))}>{Object.entries(DOMAINS).map(([k,d])=><option key={k} value={k}>{d.label}</option>)}</select>
        </div>
        <div style={{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap'}}>
          <input type="time" value={form.start} onChange={e=>setForm(f=>({...f,start:e.target.value}))}/>
          <input type="time" value={form.end} onChange={e=>setForm(f=>({...f,end:e.target.value}))}/>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <select value={form.recur} onChange={e=>setForm(f=>({...f,recur:e.target.value}))} style={{flex:1}}>{RECUR_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
          <button style={cs.btn} onClick={add}>+ Add</button>
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
        <button onClick={()=>setOffset(o=>o-1)} style={cs.ghost}>‹</button>
        <div style={{flex:1,textAlign:'center',fontSize:14,fontWeight:500}}>{viewLabel()}</div>
        <button onClick={()=>setOffset(o=>o+1)} style={cs.ghost}>›</button>
        <div style={{display:'flex',borderRadius:8,overflow:'hidden',border:'0.5px solid var(--border)'}}>
          {['day','week','month'].map(v=>(
            <button key={v} onClick={()=>{setView(v);setOffset(0);}} style={{padding:'5px 12px',fontSize:12,background:view===v?'var(--surface2)':'none',border:'none',cursor:'pointer',color:'var(--text)',fontWeight:view===v?500:400}}>
              {v.charAt(0).toUpperCase()+v.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {view==='day'&&<DayTimeline date={dates[0]} blocks={sb} editId={editId} setEditId={setEditId} onDelete={id=>onChange(sb.filter(x=>x.id!==id))} onSaveEdit={saveEdit}/>}
      {view==='week'&&dates.map(date=>{
        const dayBlocks=sb.filter(b=>occursOn(b,date)),isToday=date.toDateString()===today.toDateString();
        return(
          <div key={date.toISOString()} style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:500,color:isToday?'var(--text)':'var(--text2)',marginBottom:6,padding:'4px 0',borderBottom:'0.5px solid var(--border)'}}>
              {date.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})} {isToday&&'— Today'}
            </div>
            {dayBlocks.length===0?<div style={{fontSize:12,color:'var(--text3)',padding:'4px 0'}}>No blocks</div>
              :dayBlocks.map(b=>editId===b.id?<BlockEditForm key={b.id} block={b} onSave={saveEdit} onCancel={()=>setEditId(null)}/>:<BlockPill key={b.id} block={b} showTime onEdit={()=>setEditId(b.id)} onDelete={()=>onChange(sb.filter(x=>x.id!==b.id))}/>)}
          </div>
        );
      })}
      {view==='month'&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
          {['M','T','W','T','F','S','S'].map((d,i)=><div key={i} style={{fontSize:11,color:'var(--text2)',textAlign:'center',padding:'4px 0'}}>{d}</div>)}
          {Array.from({length:(dates[0].getDay()||7)-1},(_,i)=><div key={'e'+i}/>)}
          {dates.map(date=>{
            const dayBlocks=sb.filter(b=>occursOn(b,date)),isToday=date.toDateString()===today.toDateString();
            return(
              <div key={date.toISOString()} style={{border:`0.5px solid ${isToday?'var(--text)':'var(--border)'}`,borderRadius:8,padding:'4px 6px',minHeight:56,background:isToday?'var(--surface2)':'none'}}>
                <div style={{fontSize:11,fontWeight:isToday?600:400,color:isToday?'var(--text)':'var(--text2)',marginBottom:3}}>{date.getDate()}</div>
                {dayBlocks.slice(0,2).map(b=>{const d=DOMAINS[b.domain];return<div key={b.id} style={{fontSize:9,background:d.light,color:d.dark,borderRadius:3,padding:'1px 4px',marginBottom:2,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{b.title}</div>;})}
                {dayBlocks.length>2&&<div style={{fontSize:9,color:'var(--text3)'}}>+{dayBlocks.length-2}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

function Tasks({tasks,onChange,initialHighFilter,onClearHighFilter}){
  const t=safeArr(tasks,[]);
  const[form,setForm]=useState({title:'',domain:'work',pri:'high'});
  const[filter,setFilter]=useState('all');
  const[priFilter,setPriFilter]=useState(null);
  const[editId,setEditId]=useState(null);
  useEffect(()=>{if(initialHighFilter){setPriFilter('high');if(onClearHighFilter)onClearHighFilter();}},[initialHighFilter]);
  const maxId=t.reduce((a,x)=>Math.max(a,x.id||0),0);
  const add=()=>{if(!form.title.trim())return;onChange([...t,{...form,id:maxId+1,done:false}]);setForm(f=>({...f,title:''}));};
  const saveEdit=(u)=>{onChange(t.map(x=>x.id===u.id?u:x));setEditId(null);};
  const visible=[...t].filter(x=>(filter==='all'||x.domain===filter)&&(!priFilter||x.pri===priFilter)).sort((a,b)=>({high:0,medium:1,low:2}[a.pri]-{high:0,medium:1,low:2}[b.pri]));
  return(
    <div>
      <div style={{...cs.s2,marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Add task</div>
        <div style={{display:'flex',gap:8,marginBottom:8}}><input style={{flex:1}} placeholder="Task description..." value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&add()}/></div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <select value={form.domain} onChange={e=>setForm(f=>({...f,domain:e.target.value}))}>{Object.entries(DOMAINS).map(([k,d])=><option key={k} value={k}>{d.label}</option>)}</select>
          <select value={form.pri} onChange={e=>setForm(f=>({...f,pri:e.target.value}))}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
          <button style={cs.btn} onClick={add}>+ Add task</button>
        </div>
      </div>
      <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
        {['all',...Object.keys(DOMAINS)].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:'4px 12px',fontSize:12,borderRadius:20,border:'0.5px solid var(--border)',background:filter===f?'var(--surface2)':'none',fontWeight:filter===f?500:400,color:'var(--text)',cursor:'pointer'}}>
            {f==='all'?'All':DOMAINS[f].label}
          </button>
        ))}
      </div>
      <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>{[null,'high','medium','low'].map(p=>(<button key={p||'all'} onClick={()=>setPriFilter(p)} style={{padding:'3px 10px',fontSize:11,borderRadius:20,border:'0.5px solid var(--border)',background:priFilter===p?'var(--surface2)':'none',fontWeight:priFilter===p?500:400,color:'var(--text)',cursor:'pointer'}}>{p?p.charAt(0).toUpperCase()+p.slice(1):'All priorities'}</button>))}</div>
      {visible.length===0&&<div style={{color:'var(--text2)',fontSize:13,padding:'8px 0'}}>No tasks yet — add one above.</div>}
      {visible.map(task=>{
        if(editId===task.id)return<TaskEditForm key={task.id} task={task} onSave={saveEdit} onCancel={()=>setEditId(null)}/>;
        const d=DOMAINS[task.domain],p=PRI_STYLES[task.pri];
        return(
          <div key={task.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'0.5px solid var(--border)'}}>
            <div onClick={()=>onChange(t.map(x=>x.id===task.id?{...x,done:!x.done}:x))} style={{width:18,height:18,border:task.done?'none':'1.5px solid var(--border)',borderRadius:4,flexShrink:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',background:task.done?'#EAF3DE':'none'}}>
              {task.done&&<svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="#27500A" strokeWidth="1.8"/></svg>}
            </div>
            <div style={{flex:1,fontSize:13,textDecoration:task.done?'line-through':'none',color:task.done?'var(--text2)':'var(--text)'}}>{task.title}</div>
            <span style={cs.pill(d.light,d.dark)}>{d.label}</span>
            <span style={{...cs.pill(p.bg,p.txt),marginLeft:4}}>{task.pri}</span>
            <button onClick={()=>setEditId(task.id)} style={{background:'none',border:'none',color:'var(--text2)',fontSize:13,cursor:'pointer',padding:'0 2px'}}>✎</button>
            <button onClick={()=>onChange(t.filter(x=>x.id!==task.id))} style={{background:'none',border:'none',color:'var(--text2)',fontSize:18,cursor:'pointer',lineHeight:1}}>×</button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Progress (upgraded with Balance Wheel + Focus Sessions) ──────────────────

function Progress({week,sessions,onOpenReview,lastReview}){
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const sw=week&&typeof week==='object'?week:DEFAULT_WEEK;
  const domainList=Object.entries(DOMAINS);
  const allPcts=domainList.map(([k,d])=>{
    const arr=safeArr(sw[k],[0,0,0,0,0,0,0]);
    return Math.min(100,Math.round(arr.reduce((a,b)=>a+b,0)/d.goal/7*100));
  });
  const score=Math.round(allPcts.reduce((a,b)=>a+b,0)/allPcts.length);

  // Focus session totals this week
  const wk=weekKey();
  const thisWeekSessions=safeArr(sessions,[]).filter(s=>{
    const d=new Date(s.date),wkD=new Date(wk);
    return d>=wkD&&d<new Date(wkD.getTime()+7*86400000);
  });
  const focusByDomain=Object.fromEntries(Object.keys(DOMAINS).map(k=>[k,0]));
  thisWeekSessions.forEach(s=>{if(focusByDomain[s.domain]!==undefined)focusByDomain[s.domain]+=s.mins;});
  const totalFocusMins=Object.values(focusByDomain).reduce((a,b)=>a+b,0);

  return(
    <div>
      {/* Balance Wheel */}
      <div style={{marginBottom:28}}>
        <div style={{fontSize:14,fontWeight:500,marginBottom:16}}>Balance wheel</div>
        <BalanceWheel pcts={allPcts}/>
      </div>

      {/* Domain bar chart */}
      <div style={{fontSize:14,fontWeight:500,marginBottom:14}}>Domain progress this week</div>
      {domainList.map(([k,d],i)=>(
        <div key={k} style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
          <div style={{width:80,fontSize:13,fontWeight:500,color:d.dark}}>{d.label}</div>
          <div style={{flex:1,height:8,background:'var(--border)',borderRadius:4,overflow:'hidden'}}><div style={{height:'100%',width:`${allPcts[i]}%`,background:d.color,borderRadius:4}}/></div>
          <div style={{width:34,fontSize:12,color:'var(--text2)',textAlign:'right'}}>{allPcts[i]}%</div>
        </div>
      ))}

      {/* Focus session summary */}
      {totalFocusMins>0&&(
        <div style={{...cs.s2,marginBottom:24}}>
          <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Focus sessions this week</div>
          <div style={{fontSize:11,color:'var(--text2)',marginBottom:10}}>
            {Math.floor(totalFocusMins/60)}h {totalFocusMins%60}m total deep work
          </div>
          {domainList.filter(([k])=>focusByDomain[k]>0).map(([k,d])=>(
            <div key={k} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <div style={{width:72,fontSize:12,fontWeight:500,color:d.dark}}>{d.label}</div>
              <div style={{flex:1,height:5,background:'var(--border)',borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${Math.min(100,(focusByDomain[k]/Math.max(...Object.values(focusByDomain)))*100)}%`,background:d.color,borderRadius:3}}/>
              </div>
              <div style={{fontSize:11,color:'var(--text2)',minWidth:32,textAlign:'right'}}>{focusByDomain[k]}m</div>
            </div>
          ))}
        </div>
      )}

      {/* Weekly review button */}
      <div style={{marginBottom:24}}>
        <button onClick={onOpenReview} style={{
          ...cs.ghost,width:'100%',padding:'12px 16px',borderRadius:10,
          display:'flex',alignItems:'center',justifyContent:'space-between',
          fontSize:13,
        }}>
          <span style={{fontWeight:500,color:'var(--text)'}}>
            {lastReview?`Last review: ${new Date(lastReview.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}`:'Start weekly review'}
          </span>
          <span style={{color:'#7F77DD'}}>Open →</span>
        </button>
        {lastReview?.priority&&(
          <div style={{fontSize:12,color:'var(--text2)',marginTop:8,padding:'0 4px'}}>
            Last priority: <em>{lastReview.priority}</em>
          </div>
        )}
      </div>

      {/* Heatmap */}
      <div style={{fontSize:14,fontWeight:500,margin:'4px 0 12px'}}>Daily heatmap</div>
      <div style={{display:'grid',gridTemplateColumns:'72px repeat(7,1fr)',gap:4,fontSize:11}}>
        <div/>
        {days.map(d=><div key={d} style={{textAlign:'center',color:'var(--text2)',paddingBottom:5}}>{d}</div>)}
        {domainList.map(([k,d])=>{
          const arr=safeArr(sw[k],[0,0,0,0,0,0,0]),mx=Math.max(...arr,d.goal);
          return[
            <div key={k+'-l'} style={{color:d.dark,fontWeight:500,fontSize:12,display:'flex',alignItems:'center'}}>{d.label.slice(0,5)}</div>,
            ...arr.map((v,i)=><div key={k+i} style={{background:d.color,opacity:v===0?0.08:Math.max(0.18,v/mx),borderRadius:3,height:26,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:d.dark,fontWeight:500}}>{v>0?`${v}h`:''}</div>)
          ];
        })}
      </div>
    </div>
  );
}

// ─── Google Sync ──────────────────────────────────────────────────────────────

function GoogleSync({blocks,addToast}){
  const{data:session,status}=useSession();
  const[syncing,setSyncing]=useState(false);
  const push=async()=>{
    setSyncing(true);
    try{
      const r=await fetch('/api/calendar/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({blocks})});
      const d=await r.json();
      if(d.ok)addToast('Synced '+d.created+' events to Google Calendar ✅');
      else addToast('Sync failed: '+d.error,'warning');
    }catch(e){addToast('Sync failed','warning');}
    setSyncing(false);
  };
  if(status==='loading')return null;
  if(!session)return(
    <div style={{marginBottom:12}}>
      <button onClick={()=>signIn('google')} style={{display:'inline-flex',alignItems:'center',gap:8,background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:8,padding:'8px 16px',fontSize:13,cursor:'pointer',color:'var(--text)'}}>
        <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Sign in with Google to sync calendar
      </button>
    </div>
  );
  return(
    <div style={{marginBottom:12}}>
      <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>Signed in as {session.user?.email}</div>
      <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
        <button onClick={push} disabled={syncing} style={{background:'var(--text)',color:'var(--bg)',border:'none',borderRadius:8,padding:'8px 16px',fontSize:13,cursor:syncing?'wait':'pointer',opacity:syncing?0.7:1}}>
          {syncing?'Syncing...':'Push to Google Calendar'}
        </button>
        <button onClick={()=>signOut()} style={{background:'none',border:'0.5px solid var(--border)',borderRadius:8,padding:'8px 12px',fontSize:12,cursor:'pointer',color:'var(--text2)'}}>Sign out</button>
      </div>
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────

export default function Home(){
  const[app,setApp]=useState(null);
  const[tab,setTab]=useState('dashboard');
  const[highFilter,setHighFilter]=useState(false);
  const[now,setNow]=useState(null);
  const[toasts,setToasts]=useState([]);
  const[syncStatus,setSyncStatus]=useState('synced');
  const[showReview,setShowReview]=useState(false);

  const commit=useCallback((next)=>{
    const safe=sanitize(next);setApp(safe);lsSave(safe);
    setSyncStatus('saving');scheduleSync(safe);
    setTimeout(()=>setSyncStatus('synced'),2200);
  },[]);

  const addToast=useCallback((msg,type='success')=>{
    const id=Date.now();setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3000);
  },[]);

  // Log a focus session (domain + minutes)
  const logSession=useCallback((domain,mins)=>{
    setApp(prev=>{
      if(!prev)return prev;
      const session={id:Date.now(),domain,mins,date:todayKey()};
      const next=sanitize({...prev,sessions:[...safeArr(prev.sessions,[]),session]});
      lsSave(next);scheduleSync(next);
      return next;
    });
  },[]);

  // Save weekly review answers
  const saveReview=useCallback((review)=>{
    setApp(prev=>{
      if(!prev)return prev;
      const next=sanitize({...prev,lastReview:review});
      lsSave(next);scheduleSync(next);
      return next;
    });
    setShowReview(false);
    addToast('Review saved ✅');
  },[addToast]);

  useEffect(()=>{
    const cached=lsLoad();setApp(cached||sanitize({}));setNow(new Date());
    const timer=setInterval(()=>setNow(new Date()),30000);
    fetch('/api/data').then(r=>r.json()).then(({data})=>{
      if(!data)return;const parsed=typeof data==='string'?JSON.parse(data):data;
      const safe=sanitize(parsed);setApp(safe);lsSave(safe);
    }).catch(()=>setSyncStatus('offline'));
    return()=>clearInterval(timer);
  },[]);

  useEffect(()=>{
    if(!app)return;const today=todayKey();if(app.streak.lastDate===today)return;
    const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
    commit({...app,streak:{count:app.streak.lastDate===yesterday?app.streak.count+1:1,lastDate:today}});
  },[!!app]);

  // Auto-prompt weekly review on Sundays if not done this week
  useEffect(()=>{
    if(!app)return;
    const isSunday=new Date().getDay()===0;
    const alreadyReviewed=app.lastReview?.date===todayKey();
    if(isSunday&&!alreadyReviewed&&!showReview){
      const timer=setTimeout(()=>setShowReview(true),2000);
      return()=>clearTimeout(timer);
    }
  },[!!app]);

  if(!app||!now)return null;

  const allPcts=Object.entries(DOMAINS).map(([k,d])=>Math.min(100,blockedMins(app.blocks,k,now)/60/d.goal*100));
  const balScore=Math.round(allPcts.reduce((a,b)=>a+b,0)/allPcts.length);

  return(
    <>
      <Head>
        <title>Life Balance</title>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link rel="manifest" href="/manifest.json"/>
        <meta name="theme-color" content="#1a1a1a"/>
        <meta name="mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="default"/>
        <meta name="apple-mobile-web-app-title" content="Life Balance"/>
      </Head>

      <div style={{maxWidth:680,margin:'0 auto',padding:'0 16px 80px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'20px 0 16px'}}>
          <div>
            <div style={{fontSize:28,fontWeight:500}}>{clockStr(now)}</div>
            <div style={{fontSize:13,color:'var(--text2)'}}>{now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{background:'var(--amber-bg)',color:'var(--amber)',borderRadius:20,padding:'4px 12px',fontSize:12,fontWeight:500,marginBottom:4}}>
              Streak: {app.streak.count} day{app.streak.count!==1?'s':''} 🔥
            </div>
            <div style={{fontSize:11,color:'var(--text2)'}}>Balance: {balScore}%</div>
          </div>
        </div>

        {toasts.map(t=>(
          <div key={t.id} style={{padding:'9px 14px',borderRadius:8,marginBottom:8,fontSize:13,display:'flex',justifyContent:'space-between',background:t.type==='success'?'var(--green-bg)':'var(--amber-bg)',color:t.type==='success'?'var(--green)':'var(--amber)',border:`0.5px solid ${t.type==='success'?'var(--green)':'var(--amber)'}`}}>
            <span>{t.msg}</span>
            <button onClick={()=>setToasts(p=>p.filter(x=>x.id!==t.id))} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'inherit',lineHeight:1}}>×</button>
          </div>
        ))}

        <div style={{display:'flex',borderBottom:'0.5px solid var(--border)',marginBottom:24,overflowX:'auto'}}>
          {['dashboard','schedule','tasks','progress'].map(t=>(
            <button key={t} style={cs.nav(tab===t)} onClick={()=>setTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {tab==='dashboard'&&(
          <Dashboard
            tasks={app.tasks} blocks={app.blocks} sessions={app.sessions}
            onNavigate={(dest)=>{
              if(dest==='tasks-high'){setHighFilter(true);setTab('tasks');}
              else setTab(dest);
            }}
            onOpenReview={()=>setShowReview(true)}
          />
        )}
        {tab==='schedule'&&(
          <Schedule blocks={app.blocks} onChange={b=>{commit({...app,blocks:b});addToast('Schedule saved');}}/>
        )}
        {tab==='tasks'&&(
          <Tasks tasks={app.tasks} onChange={t=>{commit({...app,tasks:t});}}
            initialHighFilter={highFilter} onClearHighFilter={()=>setHighFilter(false)}/>
        )}
        {tab==='progress'&&(
          <Progress
            week={app.week} sessions={app.sessions}
            onOpenReview={()=>setShowReview(true)}
            lastReview={app.lastReview}
          />
        )}

        <div style={{marginTop:40,textAlign:'center'}}>
          <GoogleSync blocks={app.blocks} addToast={addToast}/>
          <button onClick={()=>{commit(sanitize({}));addToast('Reset to defaults','warning');}}
            style={{background:'none',border:'0.5px solid var(--border)',borderRadius:8,padding:'6px 14px',fontSize:12,color:'var(--text2)',cursor:'pointer',marginTop:8}}>
            Reset to defaults
          </button>
          <div style={{fontSize:11,color:syncStatus==='offline'?'var(--amber)':'var(--text3)',marginTop:6}}>
            {syncStatus==='saving'?'Saving to cloud...':syncStatus==='offline'?'Offline — saved locally':'Synced across all devices'}
          </div>
        </div>
      </div>

      {/* Floating Focus Timer */}
      <FocusTimer onLog={logSession} addToast={addToast}/>

      {/* Weekly Review Modal */}
      {showReview&&(
        <WeeklyReview
          app={app}
          onSave={saveReview}
          onDismiss={()=>setShowReview(false)}
        />
      )}
    </>
  );
}
