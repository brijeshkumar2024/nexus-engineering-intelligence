import Link from 'next/link';
const findings=[
 {title:'Dynamic command construction',file:'src/jobs/export.ts',sev:'HIGH',conf:'0.96'},
 {title:'Complex request orchestration',file:'src/modules/orders/service.ts',sev:'MEDIUM',conf:'0.91'},
 {title:'Outdated dependency detected',file:'package.json',sev:'MEDIUM',conf:'0.99'},
];
export default function Demo(){
 return <div className="shell"><aside className="sidebar"><div className="brand">NEXUS</div><nav className="nav"><Link className="active" href="/demo">Overview</Link><Link href="/demo">Repositories</Link><Link href="/demo">Security</Link><Link href="/demo">Dependencies</Link><Link href="/demo">PR Intelligence</Link><Link href="/demo">NEXUS AI</Link><Link href="/demo">Settings</Link></nav><div style={{position:'absolute',bottom:20,padding:'0 12px'}} className="small muted">DEMO WORKSPACE · SYNTHETIC DATA</div></aside>
 <main className="main"><header className="top"><div><div className="eyebrow">WORKSPACE / ENGINEERING</div><h1 className="h1">Repository health</h1><div className="muted small">acme-platform / acme-api · main · analyzed 12m ago</div></div><button className="btn">Run analysis</button></header>
 <section className="grid">
  <div className="card span3"><div className="small muted">Repository Health</div><div className="metric">86<span className="small muted"> / 100</span></div><div className="bar"><i style={{width:'86%'}}/></div></div>
  <div className="card span3"><div className="small muted">Security</div><div className="metric">92</div><div className="small ok">↑ 4 vs previous</div></div>
  <div className="card span3"><div className="small muted">Technical Debt</div><div className="metric">18.4h</div><div className="small muted">heuristic estimate</div></div>
  <div className="card span3"><div className="small muted">Open Findings</div><div className="metric">14</div><div className="small critical">2 high priority</div></div>
  <div className="card span8"><div className="row"><div><b>Health dimensions</b><div className="small muted">Explainable inputs, not random scores</div></div><span className="badge">LAST 30 DAYS</span></div><div className="list">{[['Code Quality',84],['Security',92],['Maintainability',81],['Architecture',79],['Dependencies',88],['Activity',93]].map(([n,v])=><div className="row" key={n}><span className="small">{n}</span><span style={{width:200}}><div className="bar"><i style={{width:`${v}%`}}/></div></span><span className="small muted">{v}</span></div>)}</div></div>
  <div className="card span4"><b>AI priority queue</b><div className="list"><div className="listitem"><div className="small critical">HIGH · 0.96</div><b>Harden export command boundary</b><div className="small muted">src/jobs/export.ts</div></div><div className="listitem"><div className="small medium">MEDIUM · 0.91</div><b>Split order orchestration</b><div className="small muted">src/modules/orders/service.ts</div></div></div></div>
  <div className="card span12"><div className="row"><div><b>Security & engineering findings</b><div className="small muted">Evidence-backed demo findings</div></div><span className="badge">14 OPEN</span></div><table className="table"><thead><tr><th>Finding</th><th>File</th><th>Severity</th><th>Confidence</th><th>Action</th></tr></thead><tbody>{findings.map(f=><tr key={f.title}><td>{f.title}</td><td className="muted">{f.file}</td><td className={f.sev==='HIGH'?'critical':'medium'}>{f.sev}</td><td>{f.conf}</td><td><span className="badge">INSPECT →</span></td></tr>)}</tbody></table></div>
 </section></main></div>
}