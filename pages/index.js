import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';

const DOMAINS = {
  work:       { label:'Work',       color:'#378ADD', light:'#E6F1FB', dark:'#0C447C', goal:8 },
  spiritual:  { label:'Spiritual',  color:'#7F77DD', light:'#EEEDFE', dark:'#3C3489', goal:1 },
  social:     { label:'Social',     color:'#D4537E', light:'#FBEAF0', dark:'#72243E', goal:2 },
  fitness:    { label:'Fitness',    color:'#639922', light:'#EAF3DE', dark:'#27500A', goal:1 },
  creativity: { label:'Creativity', color:'#BA7517', light:'#FAEEDA', dark:'#633806', goal:1.5 },
};
const PRI_STYLES = {
  high:   { bg:'#FCEBEB', txt:'#A32D2D' },
  medium: { bg:'#FAEEDA', txt:'#633806' },
  low:    { bg:'#EAF3DE', txt:'#27500A' },
};
const RECUR_OPTIONS = [
  { value:'none',        label:'No repeat' },
  { value:'daily',       label:'Every day' },
  { value:'weekdays',    label:'Weekdays (Mon–Fri)' },
  { value:'weekends',    label:'Weekends (Sat–Sun)' },
  { value:'alternate',   label:'Every alternate day' },
  { value:'weekly',      label:'Every week' },
  { value:'fortnightly', label:'Every fortnight' },
  { value:'monthly',     label:'Every month' },
];

// Base dates anchored to week of Mar 20 2026
const MON='2026-03-23', TUE='2026-03-24', WED='2026-03-25', THU='2026-03-26', FRI='2026-03-20', SAT='2026-03-21', SUN='2026-03-22';

const DEFAULT_BLOCKS = [
  // Spiritual
  { id:1,  title:'Bible reading, meditation & prayer', domain:'spiritual', start:'06:15', end:'06:35', recur:'daily',       date:FRI },
  { id:2,  title:'Church',                             domain:'spiritual', start:'08:30', end:'11:00', recur:'weekly',      date:SUN },
  { id:3,  title:'Small group area meeting',           domain:'spiritual', start:'19:00', end:'21:30', recur:'fortnightly', date:FRI },
  { id:4,  title:'Sunday reflection & journaling',     domain:'spiritual', start:'16:00', end:'16:30', recur:'weekly',      date:SUN },
  // Work
  { id:5,  title:'Work',                               domain:'work',      start:'07:10', end:'19:00', recur:'weekdays',    date:FRI },
  // Fitness
  { id:6,  title:'Gym / workout',                      domain:'fitness',   start:'09:00', end:'10:00', recur:'weekly',      date:SAT },
  { id:7,  title:'Evening walk',                       domain:'fitness',   start:'20:00', end:'20:30', recur:'weekly',      date:MON },
  { id:8,  title:'Evening walk',                       domain:'fitness',   start:'20:00', end:'20:30', recur:'weekly',      date:WED },
  // Career growth
  { id:9,  title:'Learning — course / reading',        domain:'work',      start:'20:00', end:'20:45', recur:'weekly',      date:TUE },
  { id:10, title:'Learning — course / reading',        domain:'work',      start:'20:00', end:'20:45', recur:'weekly',      date:THU },
  { id:11, title:'Week planning & goal review',        domain:'work',      start:'17:00', end:'17:30', recur:'weekly',      date:SUN },
  // Social
  { id:12, title:'Family dinner & wind-down',          domain:'social',    start:'19:30', end:'20:00', recur:'weekdays',    date:FRI },
  { id:13, title:'Grocery shopping (family)',          domain:'social',    start:'10:30', end:'12:00', recur:'weekly',      date:SAT },
  { id:14, title:'Family outing',                      domain:'social',    start:'13:00', end:'16:00', recur:'weekly',      date:SAT },
  { id:15, title:'Family lunch after church',          domain:'social',    start:'11:30', end:'13:00', recur:'weekly',      date:SUN },
  { id:16, title:'Family evening',                     domain:'social',    start:'17:00', end:'19:00', recur:'weekly',      date:SAT },
  // Creativity
  { id:17, title:'Journaling / sketching / music',     domain:'creativity',start:'20:00', end:'21:00', recur:'weekly',      date:FRI },
  { id:18, title:'Creative project time',              domain:'creativity',start:'14:00', end:'15:00', recur:'weekly',      date:SAT },
];
const DEFAULT_TASKS = [];
const DEFAULT_WEEK  = { work:[0,0,0,0,0,0,0], spiritual:[0,0,0,0,0,0,0], social:[0,0,0,0,0,0,0], fitness:[0,0,0,0,0,0,0], creativity:[0,0,0,0,0,0,0] };

function todayKey() { return new Date().toISOString().slice(0,10); }
function safeArr(v,fb) { return Array.isArray(v)?v:fb; }
function fmtTime(h24) {
  const [h,m]=h24.split(':').map(Number);
  return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;
}
function clockStr(d) {
  const h=d.getHours(),m=d.getMinutes();
  return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;
}
function occursOn(block, date) {
  const base  =new Date(block.date+'T00:00:00');
  const target=new Date(date.toISOString().slice(0,10)+'T00:00:00');
  const diff  =Math.round((target-base)/86400000);
  if(diff<0) return false;
  const dow=target.getDay();
  switch(block.recur){
    case 'none':        return diff===0;
    case 'daily':       return true;
    case 'weekdays':    return dow>=1&&dow<=5;
    case 'weekends':    return dow===0||dow===6;
    case 'alternate':   return diff%2===0;
    case 'weekly':      return diff%7===0;
    case 'fortnightly': return diff%14===0;
    case 'monthly':     return target.getDate()===base.getDate();
    default:            return diff===0;
  }
}
function sanitize(data) {
  if(!data||typeof data!=='object') return { tasks:[], blocks:DEFAULT_BLOCKS, week:DEFAULT_WEEK, streak:{count:1,lastDate:todayKey()} };
  return {
    tasks:  safeArr(data.tasks, []),
    blocks: safeArr(data.blocks, DEFAULT_BLOCKS),
    week:   (data.week&&typeof data.week==='object')?data.week:DEFAULT_WEEK,
    streak: (data.streak&&typeof data.streak==='object')?data.streak:{count:1,lastDate:todayKey()},
  };
}
function lsLoad() { try{ const r=localStorage.getItem('lb_app'); return r?sanitize(JSON.parse(r)):null; }catch{return null;} }
function lsSave(s) { try{localStorage.setItem('lb_app',JSON.stringify(s));}catch{} }
let syncTimer=null;
function scheduleSync(state) {
  clearTimeout(syncTimer);
  syncTimer=setTimeout(()=>{
    fetch('/api/data',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)}).catch(()=>{});
  },1500);
}
function blockedMins(blocks,domain,date) {
  return safeArr(blocks,[]).filter(b=>b.domain===domain&&occursOn(b,date)).reduce((acc,b)=>{
    const [sh,sm]=b.start.split(':').map(Number);
    const [eh,em]=b.end.split(':').map(Number);
    return acc+(eh*60+em-sh*60-sm);
  },0);
}

const cs = {
  card: {background:'var(--surface)',border:'0.5px solid var(--border)',borderRadius:12,padding:'12px 14px'},
  s2:   {background:'var(--surface2)',borderRadius:12,padding:'14px'},
  pill: (bg,txt)=>({display:'inline-flex',padding:'2px 9px',borderRadius:20,fontSize:11,fontWeight:500,background:bg,color:txt}),
  btn:  {background:'var(--text)',color:'var(--bg)',border:'none',padding:'8px 16px',borderRadius:8,fontSize:13,fontWeight:500,cursor:'pointer'},
  nav:  (a)=>({padding:'10px 14px',fontSize:13,background:'none',border:'none',borderBottom:a?'2px solid var(--text)':'2px solid transparent',color:a?'var(--text)':'var(--text2)',fontWeight:a?500:400,cursor:'pointer',whiteSpace:'nowrap'}),
  ghost:{background:'none',border:'0.5px solid var(--border)',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:12,color:'var(--text2)'},
};

// ── Inline edit form (shared by blocks & tasks) ──────────────────────────────
function BlockEditForm({ block, onSave, onCancel }) {
  const [f,setF]=useState({...block});
  return (
    <div style={{background:'var(--surface2)',borderRadius:10,padding:12,marginBottom:8}}>
      <div style={{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap'}}>
        <input style={{flex:2,minWidth:120}} value={f.title} onChange={e=>setF(x=>({...x,title:e.target.value}))} placeholder="Activity name..."/>
        <select value={f.domain} onChange={e=>setF(x=>({...x,domain:e.target.value}))}>
          {Object.entries(DOMAINS).map(([k,d])=><option key={k} value={k}>{d.label}</option>)}
        </select>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap'}}>
        <input type="time" value={f.start} onChange={e=>setF(x=>({...x,start:e.target.value}))}/>
        <input type="time" value={f.end}   onChange={e=>setF(x=>({...x,end:e.target.value}))}/>
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <select value={f.recur} onChange={e=>setF(x=>({...x,recur:e.target.value}))} style={{flex:1}}>
          {RECUR_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div style={{display:'flex',gap:8,marginTop:10}}>
        <button style={cs.btn} onClick={()=>onSave(f)}>Save</button>
        <button style={cs.ghost} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function TaskEditForm({ task, onSave, onCancel }) {
  const [f,setF]=useState({...task});
  return (
    <div style={{background:'var(--surface2)',borderRadius:10,padding:12,marginBottom:8}}>
      <div style={{display:'flex',gap:8,marginBottom:8}}>
        <input style={{flex:1}} value={f.title} onChange={e=>setF(x=>({...x,title:e.target.value}))} placeholder="Task description..."/>
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <select value={f.domain} onChange={e=>setF(x=>({...x,domain:e.target.value}))}>
          {Object.entries(DOMAINS).map(([k,d])=><option key={k} value={k}>{d.label}</option>)}
        </select>
        <select value={f.pri} onChange={e=>setF(x=>({...x,pri:e.target.value}))}>
          <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
      </div>
      <div style={{display:'flex',gap:8,marginTop:10}}>
        <button style={cs.btn} onClick={()=>onSave(f)}>Save</button>
        <button style={cs.ghost} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ tasks, blocks }) {
  const today=new Date();
  const t=safeArr(tasks,[]), b=safeArr(blocks,[]);
  const highPri=t.filter(x=>x.pri==='high'&&!x.done).slice(0,5);
  const totalH=(Object.keys(DOMAINS).reduce((a,k)=>a+blockedMins(b,k,today),0)/60).toFixed(1);
  const todayBlocks=b.filter(x=>occursOn(x,today));
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:8,marginBottom:20}}>
        {Object.entries(DOMAINS).map(([k,d])=>{
          const hrs=blockedMins(b,k,today)/60;
          const pct=Math.min(100,Math.round(hrs/d.goal*100));
          return (
            <div key={k} style={{...cs.card,borderTop:`3px solid ${d.color}`}}>
              <div style={{fontSize:12,fontWeight:500,color:d.dark,marginBottom:4}}>{d.label}</div>
              <div style={{height:4,background:'var(--border)',borderRadius:2,overflow:'hidden',margin:'4px 0'}}>
                <div style={{height:'100%',width:`${pct}%`,background:d.color,borderRadius:2}}/>
              </div>
              <div style={{fontSize:11,color:'var(--text2)'}}>{hrs.toFixed(1)}h / {d.goal}h</div>
              <div style={{fontSize:13,fontWeight:500,color:d.dark,marginTop:2}}>{pct}%</div>
            </div>
          );
        })}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:8,marginBottom:20}}>
        {[['Time planned',`${totalH}h`],['Blocks today',`${todayBlocks.length}`],['Tasks done',`${t.filter(x=>x.done).length}/${t.length}`],['High priority',`${t.filter(x=>x.pri==='high'&&x.done).length}/${t.filter(x=>x.pri==='high').length}`]].map(([l,v])=>(
          <div key={l} style={{background:'var(--surface2)',borderRadius:8,padding:'12px 14px'}}>
            <div style={{fontSize:11,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:4}}>{l}</div>
            <div style={{fontSize:22,fontWeight:500}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{fontSize:14,fontWeight:500,marginBottom:10}}>High priority focus</div>
      {highPri.length===0
        ? <div style={{color:'var(--text2)',fontSize:13,padding:'8px 0'}}>{t.length===0?'No tasks yet — add some in the Tasks tab.':'All high-priority tasks done! 🎉'}</div>
        : highPri.map(task=>{const d=DOMAINS[task.domain];return(
          <div key={task.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',background:'var(--surface2)',borderRadius:8,marginBottom:6}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:d.color,flexShrink:0}}/>
            <div style={{flex:1,fontSize:13}}>{task.title}</div>
            <span style={cs.pill(d.light,d.dark)}>{d.label}</span>
          </div>
        );})}
    </div>
  );
}

// ── Schedule ──────────────────────────────────────────────────────────────────
function Schedule({ blocks, onChange }) {
  const today=new Date();
  const [view,setView]=useState('day');
  const [offset,setOffset]=useState(0);
  const [form,setForm]=useState({title:'',domain:'work',start:'09:00',end:'10:00',recur:'none'});
  const [editId,setEditId]=useState(null);
  const sb=safeArr(blocks,[]);
  const maxId=sb.reduce((a,b)=>Math.max(a,b.id||0),0);

  function anchorDate() {
    const d=new Date(today);
    if(view==='day')   d.setDate(d.getDate()+offset);
    if(view==='week')  d.setDate(d.getDate()+offset*7);
    if(view==='month') d.setMonth(d.getMonth()+offset);
    return d;
  }
  function getDates() {
    const anchor=anchorDate();
    if(view==='day') return [new Date(anchor)];
    if(view==='week') {
      const dow=anchor.getDay();
      const mon=new Date(anchor); mon.setDate(anchor.getDate()-(dow===0?6:dow-1));
      return Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d;});
    }
    if(view==='month') {
      const y=anchor.getFullYear(),m=anchor.getMonth();
      return Array.from({length:new Date(y,m+1,0).getDate()},(_,i)=>new Date(y,m,i+1));
    }
    return [];
  }
  function viewLabel() {
    const anchor=anchorDate();
    if(view==='day') { const isT=anchor.toDateString()===today.toDateString(); return isT?'Today':anchor.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short'}); }
    if(view==='week') { const ds=getDates(); return `${ds[0].toLocaleDateString('en-GB',{day:'numeric',month:'short'})} – ${ds[6].toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`; }
    if(view==='month') return anchorDate().toLocaleDateString('en-GB',{month:'long',year:'numeric'});
  }
  const add=()=>{
    if(!form.title.trim()) return;
    onChange([...sb,{...form,id:maxId+1,date:anchorDate().toISOString().slice(0,10)}]);
    setForm(f=>({...f,title:''}));
  };
  const saveEdit=(updated)=>{
    onChange(sb.map(b=>b.id===updated.id?updated:b));
    setEditId(null);
  };
  const dates=getDates();

  return (
    <div>
      <div style={{...cs.s2,marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Add time block</div>
        <div style={{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap'}}>
          <input style={{flex:2,minWidth:120}} placeholder="Activity name..." value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&add()}/>
          <select value={form.domain} onChange={e=>setForm(f=>({...f,domain:e.target.value}))}>
            {Object.entries(DOMAINS).map(([k,d])=><option key={k} value={k}>{d.label}</option>)}
          </select>
        </div>
        <div style={{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap'}}>
          <input type="time" value={form.start} onChange={e=>setForm(f=>({...f,start:e.target.value}))}/>
          <input type="time" value={form.end}   onChange={e=>setForm(f=>({...f,end:e.target.value}))}/>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <select value={form.recur} onChange={e=>setForm(f=>({...f,recur:e.target.value}))} style={{flex:1}}>
            {RECUR_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
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

      {view==='day' && (
        <DayTimeline date={dates[0]} blocks={sb} editId={editId} setEditId={setEditId} onDelete={id=>onChange(sb.filter(x=>x.id!==id))} onSaveEdit={saveEdit}/>
      )}
      {view==='week' && dates.map(date=>{
        const dayBlocks=sb.filter(b=>occursOn(b,date));
        const isToday=date.toDateString()===today.toDateString();
        return (
          <div key={date.toISOString()} style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:500,color:isToday?'var(--text)':'var(--text2)',marginBottom:6,padding:'4px 0',borderBottom:'0.5px solid var(--border)'}}>
              {date.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})} {isToday&&'— Today'}
            </div>
            {dayBlocks.length===0
              ? <div style={{fontSize:12,color:'var(--text3)',padding:'4px 0'}}>No blocks</div>
              : dayBlocks.map(b=>editId===b.id
                  ? <BlockEditForm key={b.id} block={b} onSave={saveEdit} onCancel={()=>setEditId(null)}/>
                  : <BlockPill key={b.id} block={b} showTime onEdit={()=>setEditId(b.id)} onDelete={()=>onChange(sb.filter(x=>x.id!==b.id))}/>
                )
            }
          </div>
        );
      })}
      {view==='month' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
          {['M','T','W','T','F','S','S'].map((d,i)=><div key={i} style={{fontSize:11,color:'var(--text2)',textAlign:'center',padding:'4px 0'}}>{d}</div>)}
          {Array.from({length:(dates[0].getDay()||7)-1},(_,i)=><div key={'e'+i}/>)}
          {dates.map(date=>{
            const dayBlocks=sb.filter(b=>occursOn(b,date));
            const isToday=date.toDateString()===today.toDateString();
            return (
              <div key={date.toISOString()} style={{border:`0.5px solid ${isToday?'var(--text)':'var(--border)'}`,borderRadius:8,padding:'4px 6px',minHeight:56,background:isToday?'var(--surface2)':'none'}}>
                <div style={{fontSize:11,fontWeight:isToday?600:400,color:isToday?'var(--text)':'var(--text2)',marginBottom:3}}>{date.getDate()}</div>
                {dayBlocks.slice(0,2).map(b=>{const d=DOMAINS[b.domain];return(
                  <div key={b.id} style={{fontSize:9,background:d.light,color:d.dark,borderRadius:3,padding:'1px 4px',marginBottom:2,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{b.title}</div>
                );})}
                {dayBlocks.length>2&&<div style={{fontSize:9,color:'var(--text3)'}}>+{dayBlocks.length-2}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DayTimeline({ date, blocks, editId, setEditId, onDelete, onSaveEdit }) {
  const now=new Date(), nowMins=now.getHours()*60+now.getMinutes();
  const isToday=date.toDateString()===now.toDateString();
  const dayBlocks=safeArr(blocks,[]).filter(b=>occursOn(b,date));
  return (
    <div>
      {Array.from({length:18},(_,i)=>i+5).map(h=>{
        const label=fmtTime(`${String(h).padStart(2,'0')}:00`).replace(':00 ',' ').replace(':00','');
        const isNow=isToday&&Math.abs(h*60-nowMins)<30;
        const here=dayBlocks.filter(b=>parseInt(b.start)===h);
        return (
          <div key={h} style={{display:'flex',gap:10,minHeight:40,marginBottom:2}}>
            <div style={{width:52,fontSize:11,color:'var(--text2)',paddingTop:4,textAlign:'right',flexShrink:0}}>{label}</div>
            <div style={{flex:1,borderLeft:'0.5px solid var(--border)',paddingLeft:10,paddingTop:3}}>
              {isNow&&<div style={{height:1,background:'#E24B4A',marginBottom:4}}><span style={{fontSize:10,color:'#A32D2D',fontWeight:600}}>NOW</span></div>}
              {here.map(b=>editId===b.id
                ? <BlockEditForm key={b.id} block={b} onSave={onSaveEdit} onCancel={()=>setEditId(null)}/>
                : <BlockPill key={b.id} block={b} showTime onEdit={()=>setEditId(b.id)} onDelete={()=>onDelete(b.id)}/>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BlockPill({ block, onDelete, onEdit, showTime }) {
  const d=DOMAINS[block.domain];
  const recurLabel=RECUR_OPTIONS.find(o=>o.value===block.recur)?.label;
  return (
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
          <button onClick={onEdit}   style={{background:'none',border:'none',color:d.dark,fontSize:12,opacity:0.6,cursor:'pointer',padding:'0 2px'}}>✎</button>
          <button onClick={onDelete} style={{background:'none',border:'none',color:d.dark,fontSize:14,opacity:0.5,cursor:'pointer',padding:'0 2px'}}>×</button>
        </div>
      </div>
    </div>
  );
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
function Tasks({ tasks, onChange }) {
  const t=safeArr(tasks,[]);
  const [form,setForm]=useState({title:'',domain:'work',pri:'high'});
  const [filter,setFilter]=useState('all');
  const [editId,setEditId]=useState(null);
  const maxId=t.reduce((a,x)=>Math.max(a,x.id||0),0);
  const add=()=>{ if(!form.title.trim()) return; onChange([...t,{...form,id:maxId+1,done:false}]); setForm(f=>({...f,title:''})); };
  const saveEdit=(updated)=>{ onChange(t.map(x=>x.id===updated.id?updated:x)); setEditId(null); };
  const visible=[...t].filter(x=>filter==='all'||x.domain===filter)
    .sort((a,b)=>({high:0,medium:1,low:2}[a.pri]-{high:0,medium:1,low:2}[b.pri]));
  return (
    <div>
      <div style={{...cs.s2,marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Add task</div>
        <div style={{display:'flex',gap:8,marginBottom:8}}>
          <input style={{flex:1}} placeholder="Task description..." value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&add()}/>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <select value={form.domain} onChange={e=>setForm(f=>({...f,domain:e.target.value}))}>
            {Object.entries(DOMAINS).map(([k,d])=><option key={k} value={k}>{d.label}</option>)}
          </select>
          <select value={form.pri} onChange={e=>setForm(f=>({...f,pri:e.target.value}))}>
            <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
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
      {visible.length===0&&<div style={{color:'var(--text2)',fontSize:13,padding:'8px 0'}}>No tasks yet — add one above.</div>}
      {visible.map(task=>{
        if(editId===task.id) return <TaskEditForm key={task.id} task={task} onSave={saveEdit} onCancel={()=>setEditId(null)}/>;
        const d=DOMAINS[task.domain], p=PRI_STYLES[task.pri];
        return (
          <div key={task.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'0.5px solid var(--border)'}}>
            <div onClick={()=>onChange(t.map(x=>x.id===task.id?{...x,done:!x.done}:x))}
              style={{width:18,height:18,border:task.done?'none':'1.5px solid var(--border)',borderRadius:4,flexShrink:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',background:task.done?'#EAF3DE':'none'}}>
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

// ── Progress ──────────────────────────────────────────────────────────────────
function Progress({ week }) {
  const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const sw=week&&typeof week==='object'?week:DEFAULT_WEEK;
  const allPcts=Object.entries(DOMAINS).map(([k,d])=>{
    const arr=safeArr(sw[k],[0,0,0,0,0,0,0]);
    return Math.min(100,Math.round(arr.reduce((a,b)=>a+b,0)/d.goal/7*100));
  });
  const score=Math.round(allPcts.reduce((a,b)=>a+b,0)/allPcts.length);
  return (
    <div>
      <div style={{marginBottom:24}}>
        <div style={{fontSize:11,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.04em',marginBottom:4}}>Weekly balance score</div>
        <div style={{fontSize:44,fontWeight:500}}>{score}%</div>
        <div style={{fontSize:13,color:'var(--text2)'}}>across all 5 life domains</div>
      </div>
      <div style={{fontSize:14,fontWeight:500,marginBottom:14}}>Domain progress this week</div>
      {Object.entries(DOMAINS).map(([k,d],i)=>(
        <div key={k} style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
          <div style={{width:80,fontSize:13,fontWeight:500,color:d.dark}}>{d.label}</div>
          <div style={{flex:1,height:8,background:'var(--border)',borderRadius:4,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${allPcts[i]}%`,background:d.color,borderRadius:4}}/>
          </div>
          <div style={{width:34,fontSize:12,color:'var(--text2)',textAlign:'right'}}>{allPcts[i]}%</div>
        </div>
      ))}
      <div style={{fontSize:14,fontWeight:500,margin:'24px 0 12px'}}>Daily heatmap</div>
      <div style={{display:'grid',gridTemplateColumns:'72px repeat(7,1fr)',gap:4,fontSize:11}}>
        <div/>
        {days.map(d=><div key={d} style={{textAlign:'center',color:'var(--text2)',paddingBottom:5}}>{d}</div>)}
        {Object.entries(DOMAINS).map(([k,d])=>{
          const arr=safeArr(sw[k],[0,0,0,0,0,0,0]);
          const mx=Math.max(...arr,d.goal);
          return [
            <div key={k+'-l'} style={{color:d.dark,fontWeight:500,fontSize:12,display:'flex',alignItems:'center'}}>{d.label.slice(0,5)}</div>,
            ...arr.map((v,i)=>(
              <div key={k+i} style={{background:d.color,opacity:v===0?0.08:Math.max(0.18,v/mx),borderRadius:3,height:26,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:d.dark,fontWeight:500}}>
                {v>0?`${v}h`:''}
              </div>
            ))
          ];
        })}
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const [app,setApp]=useState(null);
  const [tab,setTab]=useState('dashboard');
  const [now,setNow]=useState(null);
  const [toasts,setToasts]=useState([]);
  const [syncStatus,setSyncStatus]=useState('synced');

  const commit=useCallback((next)=>{
    const safe=sanitize(next);
    setApp(safe); lsSave(safe);
    setSyncStatus('saving');
    scheduleSync(safe);
    setTimeout(()=>setSyncStatus('synced'),2200);
  },[]);

  const addToast=useCallback((msg,type='success')=>{
    const id=Date.now();
    setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3000);
  },[]);

  useEffect(()=>{
    const cached=lsLoad();
    setApp(cached||sanitize({}));
    setNow(new Date());
    const timer=setInterval(()=>setNow(new Date()),30000);
    fetch('/api/data').then(r=>r.json()).then(({data})=>{
      if(!data) return;
      const parsed=typeof data==='string'?JSON.parse(data):data;
      const safe=sanitize(parsed);
      setApp(safe); lsSave(safe);
    }).catch(()=>setSyncStatus('offline'));
    return()=>clearInterval(timer);
  },[]);

  useEffect(()=>{
    if(!app) return;
    const today=todayKey();
    if(app.streak.lastDate===today) return;
    const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
    const newCount=app.streak.lastDate===yesterday?app.streak.count+1:1;
    commit({...app,streak:{count:newCount,lastDate:today}});
  },[!!app]);

  if(!app||!now) return null;

  const allPcts=Object.entries(DOMAINS).map(([k,d])=>Math.min(100,blockedMins(app.blocks,k,now)/60/d.goal*100));
  const balScore=Math.round(allPcts.reduce((a,b)=>a+b,0)/allPcts.length);

  return (
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

        {tab==='dashboard'&&<Dashboard tasks={app.tasks} blocks={app.blocks}/>}
        {tab==='schedule' &&<Schedule  blocks={app.blocks} onChange={b=>{commit({...app,blocks:b});addToast('Schedule saved');}}/>}
        {tab==='tasks'    &&<Tasks     tasks={app.tasks}   onChange={t=>{commit({...app,tasks:t});}}/>}
        {tab==='progress' &&<Progress  week={app.week}/>}

        <div style={{marginTop:40,textAlign:'center'}}>
          <button onClick={()=>{commit(sanitize({}));addToast('Reset to defaults','warning');}} style={{background:'none',border:'0.5px solid var(--border)',borderRadius:8,padding:'6px 14px',fontSize:12,color:'var(--text2)',cursor:'pointer'}}>
            Reset to defaults
          </button>
          <div style={{fontSize:11,color:syncStatus==='offline'?'var(--amber)':'var(--text3)',marginTop:6}}>
            {syncStatus==='saving'?'Saving to cloud...':syncStatus==='offline'?'Offline — saved locally':'Synced across all devices'}
          </div>
        </div>
      </div>
    </>
  );
}
