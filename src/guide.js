'use strict';
const {routes,syllabus,calendar}=JSON.parse(document.querySelector('#db').textContent);
const view=document.querySelector('#view'), nav=document.querySelector('nav');
const tabs={overview:'院校總覽',details:'入試詳表',schedule:'日程與併願',eju:'EJU 考綱',saved:'我的備考',sources:'官方來源'};
const fields={unit:'招生單位與分流',route:'入試途徑',year:'入學年度',field:'專業方向',eligibility:'出願資格與預審',eju:'EJU 採認與場次',english:'英語成績與送分',selection:'選拔流程與校內考',quota:'名額、統計與併願',deadline:'出願與手續期限',match:'選科核對'};
const schools=[...new Set(routes.map(r=>r.school))];
const byId=new Map(routes.map(r=>[r.id,r]));
const q=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(url,title)=>/^https?:\/\//.test(url)?'<a target="_blank" rel="noopener" href="'+esc(url)+'">'+esc(title)+'</a>':esc(title);
const options=(arr,value)=>arr.map(x=>'<option '+(x===value?'selected ':'')+'value="'+esc(x)+'">'+esc(x)+'</option>').join('');
const sel=(id,label,arr,value='')=>'<select id="'+id+'" aria-label="'+esc(label)+'"><option value="">'+esc(label)+'</option>'+options([...new Set(arr.filter(Boolean))],value)+'</select>';
const btn=(action,id,title,on=false)=>'<button data-action="'+action+'" data-id="'+esc(id)+'" aria-pressed="'+on+'">'+esc(title)+'</button>';
const tag=r=>'<span class="tag '+(r.year<2028?'old':'')+'">'+esc(r.year)+' 入學 · '+esc(r.status)+'</span>';
const source=s=>link(s.url,s.title)+' <small>'+esc([s.section,s.checked].filter(Boolean).join(' · '))+'</small>';
const sourceList=r=>r.sources.map(source).join('<br>');
const section=(title,text='')=>'<h2>'+title+'</h2>'+(text?'<p class="muted">'+text+'</p>':'');
let tab='',comp=[],mobileId='',focusId='',subject=syllabus[0]?.subject||'日本語',historyOn=false;
const storageKey='jp-stem-2028.v1', defaults={version:1,favorites:[],done:[]};
function validState(data){
 if(data?.version!==1||!Array.isArray(data.favorites)||!Array.isArray(data.done))throw Error();
 const known=new Set(syllabus.map(i=>i.id));
 return {version:1,favorites:[...new Set(data.favorites.filter(id=>byId.has(id)))],done:[...new Set(data.done.filter(id=>known.has(id)))]};
}
let state;
try{state=validState(JSON.parse(localStorage.getItem(storageKey)))}catch{state=structuredClone(defaults)}
function notice(msg){q('#notice').textContent=msg;clearTimeout(notice.timer);notice.timer=setTimeout(()=>q('#notice').textContent='',3500)}
function persist(){try{localStorage.setItem(storageKey,JSON.stringify(state))}catch{notice('瀏覽器未能儲存，請匯出備份。')}}
function act(r){return '<div class="actions">'+btn('fav',r.id,state.favorites.includes(r.id)?'已收藏':'收藏',state.favorites.includes(r.id))+btn('compare',r.id,comp.includes(r.id)?'移出比較':'加入比較',comp.includes(r.id))+'</div>'}
function spec(r){return '<dl class="spec">'+Object.entries(fields).map(([k,title])=>'<dt>'+title+'</dt><dd>'+esc(r[k]||'官方資料待確認')+'</dd>').join('')+'</dl><b>官方依據</b><div>'+sourceList(r)+'</div>'}
function card(r){return '<article class="card">'+tag(r)+'<h3>'+esc(r.school)+'</h3><b>'+esc(r.unit)+'</b><p>'+esc(r.route)+'</p><p class="muted">'+esc(r.field)+'</p>'+btn('detail',r.id,'閱讀詳表 →')+act(r)+'</article>'}
function comparison(){
 let rs=comp.map(id=>byId.get(id));
 if(!rs.length)return '<p class="note">從途徑卡片加入比較，最多可同時核對三條途徑。</p>';
 if(!comp.includes(mobileId))mobileId=comp[0];
 return '<h3>途徑比較</h3><select class="mobile" id="mobileCompare" aria-label="選擇比較欄">'+rs.map(r=>'<option value="'+r.id+'" '+(r.id===mobileId?'selected':'')+'>'+esc(r.school+' · '+r.unit+' · '+r.year)+'</option>').join('')+'</select><div class="compare">'+rs.map(r=>'<article class="panel '+(r.id===mobileId?'':'inactive')+'">'+tag(r)+'<h3>'+esc(r.school)+'</h3>'+btn('compare',r.id,'移出比較',true)+spec(r)+'</article>').join('')+'</div>'
}
function indexPage(){
 view.innerHTML=section('院校總覽','依招生單位與入學年度查閱。先核對科目，再確認資格、送分與期限。')+'<div class="filters"><input id="search" type="search" aria-label="搜尋途徑" placeholder="搜尋學校、學系或科目">'+sel('school','全部院校',schools)+sel('status','全部狀態',routes.map(r=>r.status))+sel('kind','全部途徑',routes.map(r=>r.route))+'</div><details><summary>專業與考試條件</summary><div class="filters">'+[['field','專業方向'],['eju','EJU 條件'],['english','英語條件'],['selection','校內考']].map(([id,t])=>'<input id="'+id+'" type="search" aria-label="'+t+'" placeholder="'+t+'關鍵字">').join('')+'</div></details><div id="result"></div>';
 function filter(){let rs=routes.filter(r=>(!q('#school').value||r.school===q('#school').value)&&(!q('#kind').value||r.route===q('#kind').value)&&(!q('#status').value||r.status===q('#status').value)&&JSON.stringify(r).toLowerCase().includes(q('#search').value.trim().toLowerCase())&&['field','eju','english','selection'].every(k=>String(r[k]).toLowerCase().includes(q('#'+k).value.trim().toLowerCase())));q('#result').innerHTML='<div class="bar"><p>'+rs.length+' 條途徑</p>'+btn('goto','details','查看比較（'+comp.length+'）')+'</div><div class="grid">'+rs.map(card).join('')+'</div>'}
 view.oninput=filter;filter()
}
function details(){view.innerHTML=section('各校入試詳表')+comparison()+schools.map(s=>'<details '+(byId.get(focusId)?.school===s?'open':'')+'><summary>'+esc(s)+'</summary>'+routes.filter(r=>r.school===s).map(r=>'<details id="rec-'+r.id+'" '+(r.id===focusId?'open':'')+'><summary>'+tag(r)+' '+esc(r.unit+' ／ '+r.route)+'</summary>'+act(r)+spec(r)+'</details>').join('')+'</details>').join('')}
const events=[...calendar.map(e=>({...e,historical:false})),...routes.flatMap(r=>(r.events||[]).map(e=>({...e,id:r.id,school:r.school,historical:r.year!==2028})))].sort((a,b)=>a.date.localeCompare(b.date));
let scheduleSchools=new Set();
function schedule(){
 view.innerHTML=section('日程與併願','日本時間（JST）。預設收錄 2028 途徑已核日期與可用於規劃的全國考試。')+'<label><input id="history" type="checkbox" '+(historyOn?'checked':'')+'> 顯示往年入試日程</label><div class="filters">'+sel('month','全部月份',events.map(e=>e.date.slice(0,7)))+sel('eventtype','全部事件',events.map(e=>e.type))+'</div><details><summary>選擇院校並檢查衝突</summary>'+schools.map(s=>'<label><input type="checkbox" data-school="'+esc(s)+'" '+(scheduleSchools.has(s)?'checked':'')+'> '+esc(s)+'</label>　').join('')+'</details><div id="cal"></div>';
 function refresh(){historyOn=q('#history').checked;const base=events.filter(e=>(historyOn||!e.historical)&&(!e.id||!scheduleSchools.size||scheduleSchools.has(e.school)));const shown=base.filter(e=>(!q('#month').value||e.date.startsWith(q('#month').value))&&(!q('#eventtype').value||q('#eventtype').value===e.type));
 const overlaps=new Set();for(const e of base.filter(e=>e.id&&scheduleSchools.has(e.school)&&/試験|考試|筆試|面試|口試/.test(e.type))){for(const f of base){if(f.school!==e.school&&scheduleSchools.has(f.school)&&f.date===e.date&&/試験|考試|筆試|面試|口試/.test(f.type))overlaps.add(e.date+'　'+[e.school,f.school].sort().join(' ／ '))}}
 q('#cal').innerHTML='<h3>考試衝突</h3><p>'+(scheduleSchools.size<2?'選擇至少兩所學校以核對已收錄的考試日。':overlaps.size?esc([...overlaps].join('；')):'已收錄考試日期未見同日重疊。未定日期仍可能衝突。')+'</p><h3>送件、繳費與入學手續</h3><p>請分別核對文件必着、英語成績送達和入學金期限。尚無日期的手續請見各途徑詳表。</p>'+shown.map(e=>'<div class="event"><b>'+esc(e.date)+'</b><div><small>'+esc(e.school+' ／ '+e.type)+(e.historical?' · 往年':'')+'</small><br>'+esc(e.note)+' '+(e.id?btn('detail',e.id,'入試詳表'):link(e.url,'官方日程'))+'</div></div>').join('')+(shown.length?'':'<p>此條件下沒有已收錄日期。</p>')}
 view.oninput=e=>{if(e.target.dataset.school){const s=e.target.dataset.school;e.target.checked?scheduleSchools.add(s):scheduleSchools.delete(s)}refresh()};refresh()
}
function eju(){
 view.innerHTML=section('EJU 考綱','依官方日文與繁中對照複習，各科進度儲存在本機。')+'<div class="actions">'+[...new Set(syllabus.map(i=>i.subject))].map(s=>btn('subject',s,s,subject===s)).join('')+'</div><div class="filters"><input type="search" id="keyword" aria-label="搜尋考綱" placeholder="輸入日文或中文細目"><label><input type="checkbox" id="changed"> 只看已核改版</label></div><div id="checklist"></div>';
 function refresh(){const all=syllabus.filter(i=>i.subject===subject),done=all.filter(i=>state.done.includes(i.id)).length,rs=all.filter(i=>(!q('#changed').checked||i.change)&&(i.ja+' '+i.zh).toLowerCase().includes(q('#keyword').value.trim().toLowerCase()));q('#checklist').innerHTML='<p>'+done+' / '+all.length+' 已完成　<progress value="'+done+'" max="'+all.length+'"></progress></p>'+rs.map(i=>'<div class="item"><input type="checkbox" aria-label="完成 '+esc(i.zh)+'" data-done="'+i.id+'" '+(state.done.includes(i.id)?'checked':'')+'><details><summary>'+esc(i.zh)+'<small lang="ja">'+esc(i.ja)+'</small></summary><p>'+esc(i.version)+' · '+esc(i.page)+'</p><p>'+esc(i.note||'')+'</p>'+(i.change?'<p class="note">'+esc(i.change)+'</p>':'')+link(i.url,'正式考綱')+'　'+(i.sample?link(i.sample,'官方題目'):'')+'</details></div>').join('')+(rs.length?'':'<p>沒有符合的細目。</p>')}
 view.oninput=e=>{if(e.target.dataset.done){let id=e.target.dataset.done;state.done=e.target.checked?[...new Set([...state.done,id])]:state.done.filter(x=>x!==id);persist()}refresh()};refresh()
}
function saved(){const rs=state.favorites.map(id=>byId.get(id));view.innerHTML=section('我的備考與候選','備考組合　EJU 日本語、數學 Course 2、物理、化學及 TOEFL。')+'<div class="actions">'+btn('export','','匯出收藏與進度')+'<label class="btn">匯入備份 <input type="file" id="restore" accept=".json" style="width:8em"></label></div><h3>已收藏途徑（'+rs.length+'）</h3>'+(rs.length?rs.map(r=>'<details><summary>'+esc(r.school+' ／ '+r.unit)+' '+tag(r)+'</summary>'+spec(r)+act(r)+'</details>').join(''):'<p>在院校總覽點選「收藏」，即可在此核對各校的選科、校內考與時程。</p>')+section('依研究方向探索','以下依不同院校已收錄的專業方向列出探索起點。申請前請核對各卡片的年度與選科條件。')+'<div class="grid">'+schools.slice(0,6).map(s=>card(routes.find(r=>r.school===s))).join('')+'</div>';
 q('#restore').onchange=async e=>{try{let v=validState(JSON.parse(await e.target.files[0].text()));state.favorites=[...new Set([...state.favorites,...v.favorites])];state.done=[...new Set([...state.done,...v.done])];persist();saved();notice('已合併收藏與進度')}catch{notice('無法讀取此備份，請檢查格式。')}}}
function sources(){view.innerHTML=section('待追蹤與官方來源','2026 年 11 月 18 日查核。建議每季複查入試變更預告，2027 年夏季起每月複查募集要項，報名前再確認正式期限。')+'<p class="note">資格自查：國籍、在留資格、是否就讀過日本學校、海外學制及畢業年月。未滿十二年學制須核對指定課程或個別資格審查。 '+link('https://www.mext.go.jp/a_menu/koutou/shikaku/20260525-mxt_daigakuc01-0000_1.pdf','文部科学省・大学入学資格ガイド')+'</p>'+schools.map(s=>{const rs=routes.filter(r=>r.school===s);return '<details><summary>'+esc(s)+' · '+rs.length+' 條紀錄</summary><p>追蹤令和10年度募集要項、EJU 採認場次、新版 TOEFL 與文件必着日。</p>'+[...new Set(rs.flatMap(r=>r.sources.map(source)))].join('<br>')+'</details>'}).join('')}
function render(){tab=Object.hasOwn(tabs,location.hash.slice(1))?location.hash.slice(1):'overview';nav.innerHTML=Object.entries(tabs).map(([id,name])=>btn('goto',id,name,id===tab)).join('');view.oninput=null;({overview:indexPage,details,schedule,eju,saved,sources})[tab]()}
function go(next){if(tab===next)render();else location.hash=next}
document.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b)return;const id=b.dataset.id;
 switch(b.dataset.action){
 case 'goto':go(id);break;
 case 'detail':focusId=id;go('details');requestAnimationFrame(()=>q('#rec-'+id)?.scrollIntoView({block:'start'}));break;
 case 'subject':subject=id;eju();break;
 case 'fav':state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];persist();if(tab==='saved')saved();else{document.querySelectorAll('button[data-action="fav"][data-id="'+id+'"]').forEach(el=>{el.textContent=state.favorites.includes(id)?'已收藏':'收藏';el.setAttribute('aria-pressed',state.favorites.includes(id))})}break;
 case 'compare':if(comp.includes(id))comp=comp.filter(x=>x!==id);else if(comp.length<3)comp.push(id);else{notice('最多可比較三條途徑');break}if(tab==='overview')view.oninput();else render();break;
 case 'export':{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='升學手帖-備份.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);break}
 }});
document.addEventListener('change',e=>{if(e.target.id==='mobileCompare'){mobileId=e.target.value;details()}});
window.addEventListener('hashchange',render);
q('#counts').textContent=schools.length+' 所院校　／　'+routes.length+' 條入試紀錄　／　4 科 EJU';
render();
