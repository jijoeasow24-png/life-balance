import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';

const DOMAINS=[{label:'Work',color:'#378ADD',light:'#E6F1FB',icon:'Work',desc:'Plan your working hours with intention, not just habit.'},{label:'Spiritual',color:'#7F77DD',light:'#EEEDFE',icon:'Faith',desc:'Daily scripture, prayer blocks and Sabbath rest built in.'},{label:'Social',color:'#D4537E',light:'#FBEAF0',icon:'Family',desc:'Protect time for family, community and the people who matter.'},{label:'Fitness',color:'#639922',light:'#EAF3DE',icon:'Body',desc:'Your body is a temple. Track and honour it accordingly.'},{label:'Creativity',color:'#BA7517',light:'#FAEEDA',icon:'Create',desc:'Space for the gifts God put in you — music, art, writing.'}];
const FEATURES=[{title:'Daily scripture',body:'A different verse every morning, matched to your life season — rest, purpose, stewardship, strength.',color:'#7F77DD'},{title:'Balance wheel',body:'See your five domains as a radar chart. Imbalance becomes visible before it becomes a crisis.',color:'#378ADD'},{title:'Focus timer',body:'A built-in Pomodoro timer that logs deep work against each life domain automatically.',color:'#639922'},{title:'Sabbath mode',body:"On weekends the app reminds you to rest. You don't have to be productive every day.",color:'#1D9E75'},{title:'Weekly review',body:"A Sunday check-in that shows last week's balance, asks three questions, and sets your priority for the week ahead.",color:'#D4537E'},{title:'Tithe reminder',body:'On the 1st of every month, a gentle nudge to honour the Lord with your firstfruits.',color:'#BA7517'}];
const TESTIMONIALS=[{name:'Samuel O.',role:'Finance manager, Lagos',text:"I've tried Notion, Things 3, Todoist. None of them understood that Sunday is for rest, not a productivity sprint."},{name:'Grace M.',role:'Doctor, Nairobi',text:'The balance wheel showed me I was giving everything to work and nothing to my spiritual life. That one insight changed my week.'},{name:'David K.',role:'Engineer, Dubai',text:"The daily scripture hits different when it's tied to your actual schedule. It's not just an app — it's a posture."}];

export default function Landing(){
  const[email,setEmail]=useState('');
  const[status,setStatus]=useState('idle');
  const router=useRouter();
  const join=async()=>{
    if(!email.trim()||!email.includes('@'))return;
    setStatus('loading');
    try{const r=await fetch('/api/waitlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});const d=await r.json();if(d.ok){setStatus('done');setEmail('');}else setStatus('error');}
    catch{setStatus('error');}
  };
  return(
    <>
      <Head>
        <title>Life Balance — Steward your life well</title>
        <meta name="description" content="A faith-integrated life planner for Christian professionals."/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
      </Head>
      <div style={{fontFamily:'system-ui,-apple-system,sans-serif',color:'#1a1a1a',lineHeight:1.6}}>
        <nav style={{maxWidth:680,margin:'0 auto',padding:'18px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:16,fontWeight:600,color:'#3C3489'}}>Life Balance</div>
          <button onClick={()=>router.push('/')} style={{background:'#7F77DD',color:'#fff',border:'none',borderRadius:8,padding:'8px 18px',fontSize:13,fontWeight:500,cursor:'pointer'}}>Open app</button>
        </nav>
        <section style={{maxWidth:680,margin:'0 auto',padding:'48px 20px 56px',textAlign:'center'}}>
          <div style={{display:'inline-block',background:'#EEEDFE',color:'#534AB7',borderRadius:20,padding:'4px 14px',fontSize:12,fontWeight:500,marginBottom:20}}>For Christian professionals</div>
          <h1 style={{fontSize:40,fontWeight:700,lineHeight:1.2,margin:'0 0 20px',color:'#1a1a1a'}}>Steward your life<br/><span style={{color:'#7F77DD'}}>well.</span></h1>
          <p style={{fontSize:17,color:'#555',maxWidth:480,margin:'0 auto 32px',lineHeight:1.7}}>A life planner built around your faith — not just your tasks. Balance work, prayer, family, fitness and creativity with a tool that actually understands Sunday is for rest.</p>
          {status==='done'?(
            <div style={{background:'#E1F5EE',border:'1px solid #1D9E75',borderRadius:12,padding:'16px 24px',display:'inline-block',color:'#085041',fontSize:14,fontWeight:500}}>You're on the list! We'll be in touch soon.</div>
          ):(
            <div style={{display:'flex',gap:10,maxWidth:400,margin:'0 auto',flexWrap:'wrap',justifyContent:'center'}}>
              <input type="email" placeholder="Your email address" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&join()} style={{flex:1,minWidth:220,padding:'12px 16px',borderRadius:10,border:'1.5px solid #ddd',fontSize:14,outline:'none'}}/>
              <button onClick={join} disabled={status==='loading'} style={{background:'#7F77DD',color:'#fff',border:'none',borderRadius:10,padding:'12px 24px',fontSize:14,fontWeight:600,cursor:'pointer',opacity:status==='loading'?0.7:1}}>{status==='loading'?'Joining...':'Join waitlist'}</button>
              {status==='error'&&<div style={{width:'100%',textAlign:'center',fontSize:13,color:'#A32D2D'}}>Something went wrong. Try again.</div>}
            </div>
          )}
          <div style={{fontSize:12,color:'#999',marginTop:12}}>Free during beta. No spam. Unsubscribe anytime.</div>
        </section>
        <section style={{background:'#EEEDFE',padding:'32px 20px',textAlign:'center'}}>
          <div style={{maxWidth:560,margin:'0 auto'}}>
            <p style={{fontSize:18,fontStyle:'italic',color:'#26215C',margin:'0 0 10px',lineHeight:1.7}}>"Commit to the Lord whatever you do, and he will establish your plans."</p>
            <div style={{fontSize:13,fontWeight:500,color:'#534AB7'}}>Proverbs 16:3</div>
          </div>
        </section>
        <section style={{maxWidth:680,margin:'0 auto',padding:'56px 20px'}}>
          <h2 style={{fontSize:26,fontWeight:600,textAlign:'center',marginBottom:8}}>Five domains. One life.</h2>
          <p style={{textAlign:'center',color:'#666',marginBottom:36,fontSize:15}}>Life Balance tracks all five areas God calls you to steward — not just your inbox.</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14}}>
            {DOMAINS.map(d=>(
              <div key={d.label} style={{background:d.light,borderRadius:14,padding:'18px 16px',borderTop:`3px solid ${d.color}`}}>
                <div style={{fontSize:12,fontWeight:600,color:d.color,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>{d.icon}</div>
                <div style={{fontSize:15,fontWeight:600,color:'#1a1a1a',marginBottom:6}}>{d.label}</div>
                <div style={{fontSize:13,color:'#555',lineHeight:1.6}}>{d.desc}</div>
              </div>
            ))}
          </div>
        </section>
        <section style={{background:'#fafafa',padding:'56px 20px'}}>
          <div style={{maxWidth:680,margin:'0 auto'}}>
            <h2 style={{fontSize:26,fontWeight:600,textAlign:'center',marginBottom:8}}>Built for how you actually live</h2>
            <p style={{textAlign:'center',color:'#666',marginBottom:36,fontSize:15}}>Every feature exists because faith and productivity are not separate things.</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16}}>
              {FEATURES.map(f=>(
                <div key={f.title} style={{background:'#fff',borderRadius:14,padding:'20px 18px',border:'0.5px solid #e8e8e8',borderLeft:`3px solid ${f.color}`}}>
                  <div style={{fontSize:14,fontWeight:600,color:'#1a1a1a',marginBottom:8}}>{f.title}</div>
                  <div style={{fontSize:13,color:'#666',lineHeight:1.6}}>{f.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section style={{maxWidth:680,margin:'0 auto',padding:'56px 20px'}}>
          <h2 style={{fontSize:26,fontWeight:600,textAlign:'center',marginBottom:36}}>What early users say</h2>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16}}>
            {TESTIMONIALS.map(t=>(
              <div key={t.name} style={{background:'#fff',border:'0.5px solid #e8e8e8',borderRadius:14,padding:'20px 18px'}}>
                <p style={{fontSize:14,color:'#333',lineHeight:1.7,fontStyle:'italic',margin:'0 0 16px'}}>"{t.text}"</p>
                <div style={{fontSize:13,fontWeight:600,color:'#1a1a1a'}}>{t.name}</div>
                <div style={{fontSize:12,color:'#888'}}>{t.role}</div>
              </div>
            ))}
          </div>
        </section>
        <section style={{background:'#3C3489',padding:'56px 20px',textAlign:'center'}}>
          <h2 style={{fontSize:28,fontWeight:700,color:'#fff',margin:'0 0 12px'}}>Ready to steward your life well?</h2>
          <p style={{color:'#AFA9EC',fontSize:15,margin:'0 0 32px'}}>Join the waitlist. Free during beta.</p>
          {status==='done'?(
            <div style={{background:'#fff',borderRadius:12,padding:'14px 28px',display:'inline-block',color:'#3C3489',fontSize:14,fontWeight:500}}>You're on the list!</div>
          ):(
            <div style={{display:'flex',gap:10,maxWidth:400,margin:'0 auto',flexWrap:'wrap',justifyContent:'center'}}>
              <input type="email" placeholder="Your email address" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&join()} style={{flex:1,minWidth:220,padding:'12px 16px',borderRadius:10,border:'none',fontSize:14,outline:'none'}}/>
              <button onClick={join} disabled={status==='loading'} style={{background:'#7F77DD',color:'#fff',border:'none',borderRadius:10,padding:'12px 24px',fontSize:14,fontWeight:600,cursor:'pointer'}}>{status==='loading'?'Joining...':'Join waitlist'}</button>
            </div>
          )}
          <div style={{marginTop:40}}>
            <button onClick={()=>router.push('/')} style={{background:'none',border:'1px solid #AFA9EC',color:'#AFA9EC',borderRadius:10,padding:'10px 24px',fontSize:13,cursor:'pointer'}}>Already a user? Open the app</button>
          </div>
        </section>
        <footer style={{padding:'24px 20px',textAlign:'center',background:'#26215C'}}>
          <div style={{fontSize:12,color:'#7F77DD'}}>Life Balance · Built for Christian professionals · Free during beta</div>
        </footer>
      </div>
    </>
  );
}
