import Link from 'next/link';
export default function Landing(){
 return <main>
  <section className="hero">
   <div className="eyebrow">NEXUS / ENGINEERING INTELLIGENCE</div>
   <h1>Understand your codebase before it becomes a problem.</h1>
   <p>NEXUS connects repository evidence, static analysis, security signals, dependency intelligence and AI reasoning into one engineering control plane.</p>
   <div style={{display:'flex',gap:10,marginTop:26}}><Link className="btn" href="/demo">Enter Demo →</Link><a className="btn secondary" href="https://github.com/" target="_blank">View Architecture</a></div>
   <div className="preview"><div className="previewbar"><i className="dot"/><i className="dot"/><i className="dot"/><span style={{marginLeft:8,fontSize:11,color:'#747b86'}}>nexus / acme-api</span></div><div className="previewbody"><div className="kicker">REPOSITORY HEALTH</div><div className="score">86<span style={{fontSize:20,color:'#7f8793'}}>/100</span></div><div className="grid"><div className="card span3"><div className="small muted">Security</div><div className="metric">92</div></div><div className="card span3"><div className="small muted">Quality</div><div className="metric">84</div></div><div className="card span3"><div className="small muted">Debt</div><div className="metric">18h</div></div><div className="card span3"><div className="small muted">Risk files</div><div className="metric">7</div></div></div></div></div>
  </section>
 </main>
}