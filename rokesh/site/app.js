// Prompt-to-workflow builder: rule-based parser (no API key). Swap parse() for an LLM call later.
const CATALOG=[
 {re:/lead|inquiry|enquiry|signup|sign up|form/i,type:'Trigger',label:'New lead received'},
 {re:/qualif|score|intent/i,type:'AI',label:'AI qualifies lead'},
 {re:/crm|hubspot|salesforce|update contact/i,type:'Integration',label:'Update CRM'},
 {re:/whatsapp/i,type:'Channel',label:'Send WhatsApp message'},
 {re:/sms|rcs/i,type:'Channel',label:'Send SMS/RCS'},
 {re:/email|mail/i,type:'Channel',label:'Send email'},
 {re:/instagram|messenger|dm/i,type:'Channel',label:'Reply on Instagram/Messenger'},
 {re:/call|voice/i,type:'Channel',label:'Voice AI call'},
 {re:/payment|pay link|invoice|checkout/i,type:'Action',label:'Send payment link'},
 {re:/webhook|api/i,type:'Action',label:'Send webhook'},
 {re:/wait|delay|after \d|remind/i,type:'Control',label:'Wait 24h / reminder'},
 {re:/human|agent|escalat|handoff|support/i,type:'Action',label:'Hand off to human agent'},
];
function parse(p){
 const hits=CATALOG.map(c=>({c,i:p.search(c.re)})).filter(x=>x.i>=0).sort((a,b)=>a.i-b.i).map(x=>x.c);
 if(!hits.length)return[];
 if(hits[0].type!=='Trigger')hits.unshift({type:'Trigger',label:'Incoming event'});
 return hits;
}
const $=s=>document.querySelector(s);
let nodes=[];
function render(){
 $('#flow').innerHTML=nodes.map((n,i)=>`<div class="node" id="n${i}"><b>${n.type}</b>${n.label}</div>`).join('')||'<p style="color:var(--mut)">No steps yet. Describe a workflow and click Generate.</p>';
}
const log=t=>{const l=$('#log');l.textContent+=t+'\n';l.scrollTop=l.scrollHeight};
$('#gen')?.addEventListener('click',()=>{nodes=parse($('#prompt').value);render();$('#log').textContent=nodes.length?'Workflow generated: '+nodes.length+' steps.\n':'Could not detect steps. Try mentioning lead, WhatsApp, email, CRM, payment...\n'});
$('#run')?.addEventListener('click',async()=>{
 if(!nodes.length)return;$('#log').textContent='';
 for(let i=0;i<nodes.length;i++){
  const el=$('#n'+i);el.className='node run';log(`> ${nodes[i].label} ...`);
  await new Promise(r=>setTimeout(r,600));el.className='node ok';log(`  ok (simulated)`);
 }
 log('Workflow complete.');
});
// Lead form: stored locally; set window.LEAD_ENDPOINT to POST to a real backend.
$('#lead')?.addEventListener('submit',async e=>{
 e.preventDefault();const d=Object.fromEntries(new FormData(e.target));
 try{const k='leads',a=JSON.parse(localStorage.getItem(k)||'[]');a.push({...d,at:new Date().toISOString()});localStorage.setItem(k,JSON.stringify(a))}catch{}
 if(window.LEAD_ENDPOINT){try{await fetch(window.LEAD_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)})}catch{}}
 $('#leadmsg').textContent='Thanks! We will reach out shortly.';e.target.reset();
});
render();
