import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
const C=window.APP_CONFIG||{},$=s=>document.querySelector(s);
if(!C.SUPABASE_URL||!C.SUPABASE_ANON_KEY){document.body.innerHTML='<p style="padding:2rem">Crea config.js partendo da config.example.js.</p>';throw new Error('config mancante')}
const sb=createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast=(m,er)=>{const t=$('#toast');t.textContent=m;t.className=er?'err show':'show';setTimeout(()=>t.className='',3500)};
const msg=e=>({23505:'Valore già presente (duplicato).',23503:'Collegamento non valido (es. mezzo non del cliente scelto).',23514:'Valore non ammesso o giacenza negativa.',42501:'Permesso negato.'}[e.code]||e.message||'Errore di rete, riprova.');
const fail=e=>{console.error(e);toast(msg(e),1)};
const dt=v=>v?new Date(v).toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'}):'—';
const loc=v=>{const d=new Date(v);return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,16)};
const L={
 wo:['da verificare','accettato','in diagnosi','in attesa','in attesa di ricambi','in lavorazione','pronto','consegnato','annullato'],
 pr:['bassa','normale','alta','urgente'],
 ap:['prenotato','confermato','arrivato','in lavorazione','completato','annullato','da ricontattare'],
 po:['bozza','da inviare','ordinato','parzialmente ricevuto','ricevuto','annullato'],
 ty:['motociclo','motosega','decespugliatore','tagliasiepi','soffiatore','rasaerba','generatore','altro'],
 ev:['ordine creato','mezzo ricevuto','diagnosi iniziata','diagnosi completata','ricambio richiesto','ricambio ricevuto','lavorazione iniziata','lavorazione completata','pronto','consegnato']};
const cn=c=>c?[c.last_name,c.first_name].filter(Boolean).join(' '):'—';
const an=a=>a?[a.type,a.brand,a.model,a.plate||a.serial_number].filter(Boolean).join(' '):'—';
const FK={customers:{s:'id,first_name,last_name',l:cn},assets:{s:'id,customer_id,type,brand,model,plate,serial_number',l:an},
 work_orders:{s:'id,number',l:r=>r.number},purchase_orders:{s:'id,number',l:r=>r.number}};
// f: [campo, etichetta, tipo (text|area|number|date|tel|email|datetime-local|array opzioni|'fk:tabella'), obbligatorio]
const E={
customers:{t:'Clienti',arch:1,ord:'last_name',sel:'*',cols:[['Cliente',cn],['Telefono',r=>r.phone],['Email',r=>r.email]],
 f:[['first_name','Nome'],['last_name','Cognome / ragione sociale','text',1],['phone','Telefono','tel'],['email','Email','email'],['address','Indirizzo'],['contact_pref','Contatto preferito',['telefono','email','sms','whatsapp']],['notes','Note','area']]},
assets:{t:'Mezzi e attrezzature',arch:1,files:'asset_id',ord:'created_at',sel:'*,customers(first_name,last_name)',
 cols:[['Tipo',r=>r.type],['Mezzo',r=>[r.brand,r.model].filter(Boolean).join(' ')],['Targa / seriale',r=>r.plate||r.serial_number],['Cliente',r=>cn(r.customers)]],
 f:[['customer_id','Cliente','fk:customers',1],['type','Tipo',L.ty,1],['brand','Marca'],['model','Modello'],['plate','Targa (solo motocicli)'],['serial_number','Numero di serie'],['frame_number','Numero di telaio'],['year','Anno','number'],['color','Colore'],['displacement_cc','Cilindrata (cc)','number'],['mileage_km','Chilometraggio','number'],['hours_used','Ore di utilizzo','number'],['fuel','Alimentazione / carburante'],['engine_model','Modello motore'],['accessories','Accessori'],['purchase_date','Data di acquisto','date'],['inspection_notes','Revisione (scadenze/note)'],['notes','Note tecniche','area']]},
work_orders:{t:'Ordini di lavoro',desc:1,files:'work_order_id',ord:'created_at',sel:'*,customers(first_name,last_name,phone),assets(type,brand,model,plate,serial_number)',
 cols:[['N.',r=>r.number],['Cliente',r=>cn(r.customers)],['Telefono',r=>r.customers?.phone],['Mezzo',r=>an(r.assets)],['Stato',r=>r.status],['Priorità',r=>r.priority],['Consegna',r=>r.due_date&&new Date(r.due_date).toLocaleDateString('it-IT')]],
 f:[['customer_id','Cliente','fk:customers',1],['asset_id','Mezzo / attrezzatura','fk:assets',1],['category','Categoria intervento'],['reported_problem','Problema segnalato','area',1],['diagnosis','Diagnosi','area'],['work_done','Interventi eseguiti','area'],['status','Stato',L.wo],['priority','Priorità',L.pr],['due_date','Consegna prevista','date'],['notes','Note','area']]},
appointments:{t:'Agenda',desc:1,ord:'starts_at',sel:'*,customers(first_name,last_name,phone),assets(type,brand,model,plate,serial_number)',
 cols:[['Data e ora',r=>dt(r.starts_at)],['Durata',r=>r.duration_min+' min'],['Cliente',r=>cn(r.customers)],['Mezzo',r=>an(r.assets)],['Motivo',r=>r.reason],['Stato',r=>r.status]],
 f:[['starts_at','Data e ora','datetime-local',1],['duration_min','Durata (minuti)','number'],['customer_id','Cliente','fk:customers'],['asset_id','Mezzo / attrezzatura','fk:assets'],['work_order_id','Ordine di lavoro','fk:work_orders'],['reason','Motivo'],['status','Stato',L.ap],['reminder_at','Promemoria','datetime-local'],['notes','Note','area']]},
parts:{t:'Ricambi e magazzino',arch:1,ord:'code',sel:'*',
 cols:[['Codice',r=>r.code],['Descrizione',r=>r.description],['Giacenza',r=>r.qty_on_hand+(r.qty_on_hand<=0?' (ESAURITO)':r.qty_on_hand<=r.qty_min?' (SOTTO SCORTA)':'')],['Ubicazione',r=>r.location||'⚠ mancante'],['Ordinata',r=>r.qty_ordered]],
 f:[['code','Codice interno','text',1],['oem_code','Codice OEM'],['aftermarket_code','Codice aftermarket'],['description','Descrizione','text',1],['category','Categoria'],['brand','Marca'],['supplier','Fornitore'],['qty_min','Quantità minima','number'],['qty_reserved','Quantità impegnata','number'],['qty_ordered','Quantità ordinata','number'],['location','Ubicazione'],['notes','Note','area']]},
purchase_orders:{t:'Ordini di acquisto',desc:1,ord:'created_at',sel:'*',
 cols:[['N.',r=>r.number],['Fornitore',r=>r.supplier],['Prevista',r=>r.expected_date&&new Date(r.expected_date).toLocaleDateString('it-IT')],['Stato',r=>r.status]],
 f:[['supplier','Fornitore','text',1],['expected_date','Data prevista','date'],['status','Stato',L.po],['work_order_id','Ordine di lavoro','fk:work_orders'],['notes','Note','area']]}};
let cur='dash',uid=null;
const nav=[['dash','Dashboard'],...Object.keys(E).map(k=>[k,E[k].t]),['rep','Report']];

async function route(){
 cur=location.hash.slice(1)||'dash';
 $('#nav').innerHTML=nav.map(([k,l])=>`<a href="#${k}" class="${k===cur?'on':''}">${esc(l)}</a>`).join('');$('#nav').classList.remove('open');
 $('#main').innerHTML='<p class="muted">Caricamento…</p>';
 try{await(cur==='rep'?rep():E[cur]?list(cur):dash())}catch(e){fail(e);$('#main').innerHTML='<p class="err">Errore di caricamento. Controlla la connessione e riprova.</p>'}}

async function list(k){
 const e=E[k];let q=sb.from(k).select(e.sel).order(e.ord,{ascending:!e.desc});if(e.arch)q=q.is('archived_at',null);
 const{data,error}=await q;if(error)throw error;
 $('#main').innerHTML=`<div class="bar"><h1>${esc(e.t)}</h1><input id="q" type="search" placeholder="Cerca…" aria-label="Cerca"><button class="pri" id="add">+ Nuovo</button></div>
 <table><thead><tr>${e.cols.map(c=>`<th>${c[0]}</th>`).join('')}</tr></thead><tbody>${data.map((r,i)=>`<tr tabindex="0" data-i="${i}">${e.cols.map(c=>`<td data-l="${c[0]}">${esc(c[1](r)??'')}</td>`).join('')}</tr>`).join('')||'<tr><td>Nessun elemento</td></tr>'}</tbody></table>`;
 $('#add').onclick=()=>form(k);
 $('#q').oninput=ev=>document.querySelectorAll('tbody tr').forEach(tr=>tr.hidden=!tr.textContent.toLowerCase().includes(ev.target.value.toLowerCase()));
 document.querySelectorAll('tr[data-i]').forEach(tr=>{const o=()=>form(k,data[tr.dataset.i]);tr.onclick=o;tr.onkeydown=ev=>ev.key==='Enter'&&o()})}

async function form(k,row){
 const e=E[k],d=$('#dlg'),opt={};
 try{await Promise.all([...new Set(e.f.filter(f=>String(f[2]).startsWith('fk:')).map(f=>f[2].slice(3)))].map(async t=>{const{data,error}=await sb.from(t).select(FK[t].s).order('created_at');if(error)throw error;opt[t]=data}))}catch(x){return fail(x)}
 const inp=([n,l,t='text',req])=>{const v=row?.[n]??'',id='f_'+n,r=req?' required':'';let h;
  if(Array.isArray(t))h=`<select id="${id}" name="${n}"${r}><option value="">—</option>${t.map(o=>`<option${o===v?' selected':''}>${esc(o)}</option>`).join('')}</select>`;
  else if(t.startsWith('fk:')){const T=t.slice(3);h=`<select id="${id}" name="${n}"${r}><option value="">—</option>${opt[T].map(o=>`<option value="${o.id}" data-c="${o.customer_id||''}"${o.id===v?' selected':''}>${esc(FK[T].l(o))}</option>`).join('')}</select>`}
  else if(t==='area')h=`<textarea id="${id}" name="${n}" rows="3">${esc(v)}</textarea>`;
  else h=`<input id="${id}" name="${n}" type="${t}" value="${esc(t==='datetime-local'&&v?loc(v):v)}"${r}${t==='number'?' step="any"':''}>`;
  return`<div><label for="${id}">${esc(l)}${req?' *':''}</label>${h}</div>`};
 d.innerHTML=`<form id="fm"><h2>${row?'Modifica':'Nuovo'} — ${esc(e.t)}</h2><div class="grid">${e.f.map(inp).join('')}</div><p id="ferr" class="err" role="alert"></p>
 <div class="acts"><button type="button" id="cx">Chiudi</button>${row?`<button type="button" class="dng" id="rm">${e.arch?'Archivia':'Elimina'}</button>`:''}<button class="pri">Salva</button></div></form><div id="ex"></div>`;
 d.showModal();$('#cx').onclick=()=>d.close();
 const cs=$('#f_customer_id'),as=$('#f_asset_id');
 if(cs&&as){const fl=()=>[...as.options].forEach(o=>o.hidden=o.disabled=!!(cs.value&&o.dataset.c&&o.dataset.c!==cs.value));cs.onchange=()=>{as.value='';fl()};fl()}
 $('#fm').onsubmit=async ev=>{ev.preventDefault();const fd=new FormData(ev.target),p={};
  for(const[n,,t]of e.f){let v=fd.get(n);if(v==='')v=row?null:undefined;else if(t==='number')v=Number(v);else if(t==='datetime-local')v=new Date(v).toISOString();if(v!==undefined)p[n]=v}
  const{error}=await(row?sb.from(k).update(p).eq('id',row.id):sb.from(k).insert(p));
  if(error)return $('#ferr').textContent=msg(error);d.close();toast('Salvato');route()};
 if(row){
  $('#rm').onclick=async()=>{if(!confirm(e.arch?'Archiviare questo elemento?':'Eliminare definitivamente questo elemento?'))return;
   const{error}=await(e.arch?sb.from(k).update({archived_at:new Date().toISOString()}).eq('id',row.id):sb.from(k).delete().eq('id',row.id));
   if(error)return $('#ferr').textContent=msg(error);d.close();route()};
  if(e.files)files(e.files,row.id);if(k==='work_orders')timeline(row.id);if(k==='purchase_orders')items(row.id);if(k==='parts')move(row.id)}}

const sec=()=>{const s=document.createElement('section');$('#ex').append(s);return s};

async function files(col,id){const b=sec();
 const draw=async()=>{const{data,error}=await sb.from('attachments').select('*').eq(col,id).order('created_at',{ascending:false});if(error)return fail(error);
  const u=await Promise.all(data.map(a=>sb.storage.from(a.bucket).createSignedUrl(a.storage_path,3600)));
  b.innerHTML=`<h3>Foto e documenti</h3><div class="files">${data.map((a,i)=>{const h=u[i].data?.signedUrl||'#';return`<figure>${(a.mime_type||'').startsWith('image/')?`<a href="${h}" target="_blank" rel="noopener"><img src="${h}" alt="${esc(a.original_name)}" loading="lazy"></a>`:`<a href="${h}" target="_blank" rel="noopener">📄 ${esc(a.original_name)}</a>`}<br><button type="button" class="dng" data-d="${i}">Elimina</button></figure>`}).join('')||'<p class="muted">Nessun file</p>'}</div>
  <label class="btn">Carica file<input id="up" type="file" accept="image/*,application/pdf" multiple hidden></label> <label class="btn">Scatta foto<input id="cam" type="file" accept="image/*" capture="environment" hidden></label> <span id="ld" class="muted"></span>`;
  b.querySelectorAll('[data-d]').forEach(x=>x.onclick=async()=>{const a=data[x.dataset.d];if(!confirm('Eliminare il file?'))return;
   const r=await sb.storage.from(a.bucket).remove([a.storage_path]);if(r.error)return fail(r.error);const{error:e2}=await sb.from('attachments').delete().eq('id',a.id);if(e2)fail(e2);draw()});
  const up=async ev=>{for(const f of ev.target.files){
    if(!/^(image\/|application\/pdf)/.test(f.type))return toast('Tipo di file non consentito (solo immagini e PDF)',1);
    if(f.size>10485760)return toast('File oltre i 10 MB',1);
    b.querySelector('#ld').textContent='Caricamento…';const p=`${col}/${id}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]/g,'_')}`;
    const r=await sb.storage.from('workshop-files').upload(p,f,{contentType:f.type});if(r.error){fail(r.error);continue}
    const{error:e2}=await sb.from('attachments').insert({storage_path:p,original_name:f.name,internal_name:p.split('/').pop(),mime_type:f.type,size_bytes:f.size,[col]:id,category:f.type.startsWith('image/')?'foto':'documento'});if(e2)fail(e2)}
   draw()};
  b.querySelector('#up').onchange=up;b.querySelector('#cam').onchange=up};
 draw()}

async function timeline(id){const b=sec();
 const draw=async()=>{const{data,error}=await sb.from('work_order_events').select('*').eq('work_order_id',id).order('created_at');if(error)return fail(error);
  b.innerHTML=`<h3>Timeline</h3><ol>${data.map(v=>`<li>${esc(v.event)} — ${dt(v.created_at)}${v.notes?' · '+esc(v.notes):''}</li>`).join('')||'<li class="muted">Nessun evento</li>'}</ol>
  <select id="ev" aria-label="Evento">${L.ev.map(o=>`<option>${o}</option>`).join('')}</select><input id="en" placeholder="Nota (facoltativa)" aria-label="Nota"><button type="button" id="ea">Registra</button>`;
  b.querySelector('#ea').onclick=async()=>{const{error}=await sb.from('work_order_events').insert({work_order_id:id,event:b.querySelector('#ev').value,notes:b.querySelector('#en').value||null});if(error)fail(error);draw()}};
 draw()}

async function items(id){const b=sec();const{data:parts}=await sb.from('parts').select('id,code,description').is('archived_at',null).order('code');
 const draw=async()=>{const{data,error}=await sb.from('purchase_order_items').select('*,parts(code,description)').eq('purchase_order_id',id);if(error)return fail(error);
  b.innerHTML=`<h3>Ricambi ordinati</h3><ul>${data.map(i=>`<li>${esc(i.parts.code)} ${esc(i.parts.description)} — ricevuti ${i.qty_received}/${i.qty_ordered} ${i.qty_received<i.qty_ordered?`<button type="button" data-r="${i.id}">Ricevi tutto</button>`:''}</li>`).join('')||'<li class="muted">Nessuna riga</li>'}</ul>
  <select id="ip" aria-label="Ricambio">${(parts||[]).map(p=>`<option value="${p.id}">${esc(p.code+' '+p.description)}</option>`).join('')}</select><input id="iq" type="number" min="1" step="any" value="1" aria-label="Quantità"><button type="button" id="ia">Aggiungi</button>`;
  b.querySelector('#ia').onclick=async()=>{const{error}=await sb.from('purchase_order_items').insert({purchase_order_id:id,part_id:b.querySelector('#ip').value,qty_ordered:Number(b.querySelector('#iq').value)});if(error)fail(error);draw()};
  b.querySelectorAll('[data-r]').forEach(x=>x.onclick=async()=>{const it=data.find(i=>i.id===x.dataset.r);const{error}=await sb.from('purchase_order_items').update({qty_received:it.qty_ordered}).eq('id',it.id);if(error)fail(error);else toast('Ricevuto: carico registrato');draw()})};
 draw()}

function move(id){const b=sec();
 b.innerHTML=`<h3>Movimento di magazzino</h3><select id="mk" aria-label="Tipo"><option>carico</option><option>scarico</option><option>rettifica</option><option>trasferimento</option></select>
 <input id="mq" type="number" step="any" placeholder="Quantità (rettifica: ± differenza)" aria-label="Quantità"><input id="ml" placeholder="Nuova ubicazione (trasferimento)" aria-label="Ubicazione"><button type="button" id="ma">Registra</button>`;
 b.querySelector('#ma').onclick=async()=>{const k=b.querySelector('#mk').value,q=Number(b.querySelector('#mq').value||0);
  if(k!=='trasferimento'&&!q)return toast('Inserisci una quantità',1);if(k==='rettifica'&&!confirm('Confermi la rettifica di giacenza?'))return;
  const{error}=await sb.from('inventory_movements').insert({part_id:id,kind:k,quantity:k==='trasferimento'?0:q,location_to:b.querySelector('#ml').value||null});
  if(error)return fail(error);toast('Movimento registrato');$('#dlg').close();route()}}

async function dash(){
 const t0=new Date();t0.setHours(0,0,0,0);const t1=new Date(t0);t1.setDate(t1.getDate()+1);
 const cnt=(t,f)=>f(sb.from(t).select('id',{count:'exact',head:true})).then(r=>{if(r.error)throw r.error;return r.count});
 const done='(consegnato,annullato)';
 const[ap,wo,wp,ur,po,parts,log,shop]=await Promise.all([
  cnt('appointments',q=>q.gte('starts_at',t0.toISOString()).lt('starts_at',t1.toISOString()).neq('status','annullato')),
  cnt('work_orders',q=>q.not('status','in',done)),cnt('work_orders',q=>q.eq('status','in attesa di ricambi')),
  cnt('work_orders',q=>q.eq('priority','urgente').not('status','in',done)),cnt('purchase_orders',q=>q.not('status','in','(ricevuto,annullato)')),
  sb.from('parts').select('qty_on_hand,qty_min').is('archived_at',null),sb.from('activity_log').select('*').order('created_at',{ascending:false}).limit(8),
  sb.from('work_orders').select('assets(type)').not('status','in','(pronto,consegnato,annullato)')]);
 const low=(parts.data||[]).filter(p=>p.qty_on_hand<=p.qty_min).length,sh=shop.data||[],mo=sh.filter(x=>x.assets?.type==='motociclo').length;
 const Q=[['work_orders','Nuovo ordine di lavoro'],['customers','Nuovo cliente'],['assets','Nuovo motociclo / attrezzatura'],['appointments','Nuovo appuntamento'],['parts','Aggiungi ricambio'],['purchase_orders','Crea ordine di acquisto']];
 const K=[['Appuntamenti oggi',ap,'appointments'],['Ordini aperti',wo,'work_orders'],['In attesa di ricambi',wp,'work_orders'],['Urgenti',ur,'work_orders'],['Motocicli in officina',mo,'work_orders'],['Attrezzature in officina',sh.length-mo,'work_orders'],['Ricambi sotto scorta',low,'parts'],['Ordini di acquisto aperti',po,'purchase_orders']];
 $('#main').innerHTML=`<h1>Dashboard</h1><div class="quick">${Q.map(([k,l])=>`<button class="pri" data-n="${k}">${l}</button>`).join('')}</div>
 <div class="cards">${K.map(([l,n,k])=>`<a class="card" href="#${k}"><b>${n}</b><span>${l}</span></a>`).join('')}</div>
 <h2>Ultime attività</h2><ul>${(log.data||[]).map(l=>`<li>${dt(l.created_at)} · ${esc(l.action)} su ${esc(l.table_name)}</li>`).join('')||'<li class="muted">Nessuna attività</li>'}</ul>`;
 document.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>form(b.dataset.n))}

async function rep(){
 const[w,a,p]=await Promise.all([sb.from('work_orders').select('status,assets(type)'),sb.from('appointments').select('status'),sb.from('purchase_orders').select('status')]);
 const g=(rows,f)=>Object.entries((rows||[]).reduce((o,r)=>{const v=f(r)||'n/d';o[v]=(o[v]||0)+1;return o},{})).sort((x,y)=>y[1]-x[1]);
 const tb=(t,r)=>`<h2>${t}</h2><table><tbody>${r.map(([k,n])=>`<tr><td>${esc(k)}</td><td>${n}</td></tr>`).join('')||'<tr><td>Nessun dato</td></tr>'}</tbody></table>`;
 $('#main').innerHTML='<h1>Report</h1>'+tb('Ordini di lavoro per stato',g(w.data,r=>r.status))+tb('Ordini per tipo di mezzo',g(w.data,r=>r.assets?.type))+tb('Appuntamenti per stato',g(a.data,r=>r.status))+tb('Ordini di acquisto per stato',g(p.data,r=>r.status))}

// Autenticazione (nessuna registrazione pubblica: gli utenti si creano dal Dashboard Supabase)
const show=s=>{$('#auth').hidden=s;$('#app').hidden=!s};
async function boot(s){if(!s){show(false);return}
 const{data}=await sb.from('profiles').select('*').eq('id',s.user.id).maybeSingle();
 $('#who').textContent=data?`${data.first_name||data.email} (${data.role})`:s.user.email;show(true);route()}
sb.auth.onAuthStateChange((ev,s)=>{
 if(ev==='PASSWORD_RECOVERY'){const p=prompt('Nuova password (almeno 8 caratteri)');if(p&&p.length>=8)sb.auth.updateUser({password:p}).then(r=>r.error?fail(r.error):toast('Password aggiornata'))}
 if(['INITIAL_SESSION','SIGNED_IN','SIGNED_OUT'].includes(ev)&&(s?.user.id||null)!==uid){uid=s?.user.id||null;setTimeout(()=>boot(s),0)}});
$('#lf').onsubmit=async ev=>{ev.preventDefault();const{error}=await sb.auth.signInWithPassword({email:$('#em').value,password:$('#pw').value});
 $('#aerr').textContent=error?(error.message==='Invalid login credentials'?'Email o password non corretti.':msg(error)):''};
$('#fg').onclick=async()=>{const m=$('#em').value;if(!m)return $('#aerr').textContent='Inserisci prima la tua email.';
 const{error}=await sb.auth.resetPasswordForEmail(m,{redirectTo:location.origin+location.pathname});$('#aerr').textContent=error?msg(error):'Controlla la tua email per il link di recupero.'};
$('#out').onclick=()=>sb.auth.signOut();
$('#menu').onclick=()=>$('#nav').classList.toggle('open');
$('#theme').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('theme',t)}catch{}};
try{document.documentElement.dataset.theme=localStorage.getItem('theme')||'dark'}catch{}
addEventListener('hashchange',()=>!$('#app').hidden&&route());
