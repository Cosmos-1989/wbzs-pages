'use strict';
document.documentElement.classList.add('js');
const root = document.body.dataset.root;
const $ = (s, e=document) => e.querySelector(s);
const $$ = (s, e=document) => [...e.querySelectorAll(s)];
const menu = $('.mobile-menu');
menu?.addEventListener('click', () => {const open=document.body.classList.toggle('nav-open');menu.setAttribute('aria-expanded', String(open));menu.setAttribute('aria-label',open?'收起导航':'展开导航');});
let completed=[];
try {const data=JSON.parse(localStorage.getItem('wbzs-studied')||'[]');if(Array.isArray(data))completed=data.filter(x=>typeof x==='string');} catch {}
function refreshStudy(){
  $$('[data-status]').forEach(el=>{const done=completed.includes(el.dataset.status);el.textContent=done?'✓':'○';el.classList.toggle('done',done);el.setAttribute('aria-label',done?'已研习':'尚未标记');});
  $$('.study-toggle').forEach(b=>{const done=completed.includes(b.dataset.problem);b.setAttribute('aria-pressed',String(done));b.innerHTML=done?'✓ 已研习 · 点击撤销':'✓ 标记为已研习';});
}
refreshStudy();
$$('.study-toggle').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.problem;const next=completed.includes(id)?completed.filter(x=>x!==id):[...completed,id];try{localStorage.setItem('wbzs-studied',JSON.stringify(next));completed=next;refreshStudy();}catch{$('.study-actions p').textContent='浏览器存储不可用，未能保存。';}}));
window.addEventListener('storage',e=>{if(e.key==='wbzs-studied'){try{const data=JSON.parse(e.newValue||'[]');completed=Array.isArray(data)?data.filter(x=>typeof x==='string'):[];refreshStudy();}catch{}}});
const form=$('#problem-filters');
if(form){
  const params=new URLSearchParams(location.search);const validTopics=$$('[data-topic]').map(b=>b.dataset.topic);let topic=validTopics.includes(params.get('topic'))?params.get('topic'):'';
  const fields=['q','subject','origin','difficulty','sort'];
  fields.forEach(k=>{if(params.has(k))form.elements[k].value=params.get(k);});
  if(!form.elements.sort.value)form.elements.sort.value='asc';
  const rows=$$('.problem-table tbody tr');
  function filter(){
    const value=Object.fromEntries(fields.map(k=>[k,form.elements[k].value]));const q=value.q.trim().toLocaleLowerCase();
    const sorted=[...rows].sort((a,b)=>value.sort==='id'?a.dataset.id.localeCompare(b.dataset.id):(Number(a.dataset.difficulty)-Number(b.dataset.difficulty))*(value.sort==='desc'?-1:1)||a.dataset.id.localeCompare(b.dataset.id));
    const body=$('.problem-table tbody');let count=0;
    sorted.forEach(row=>{const d=row.dataset;const match=(!q||q.split(/\s+/).every(t=>d.query.includes(t)))&&(!topic||d.topics.split('|').includes(topic))&&(!value.subject||value.subject===d.subject)&&(!value.origin||value.origin===d.origin)&&(!value.difficulty||value.difficulty===d.difficulty);row.hidden=!match;if(match)count++;body.append(row);});
    $('#problem-count').textContent=`共 ${count} 道题目`;
    $('#problem-empty').hidden=count!==0;
    $$('[data-topic]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.topic===topic)));
    const state=new URLSearchParams();for(const k of fields)if(value[k]&&(k!=='sort'||value[k]!=='asc'))state.set(k,value[k]);if(topic)state.set('topic',topic);history.replaceState(null,'',location.pathname+(state.size?'?'+state:''));
  }
  form.addEventListener('submit',e=>{e.preventDefault();filter();});form.addEventListener('input',filter);form.addEventListener('change',filter);
  $$('[data-topic]').forEach(b=>b.addEventListener('click',()=>{topic=b.dataset.topic;filter();}));
  $('#reset-filters').addEventListener('click',()=>{form.reset();topic='';filter();});filter();
}
const newsFilters=$$('[data-category]');
newsFilters.forEach(b=>b.addEventListener('click',()=>{newsFilters.forEach(n=>n.setAttribute('aria-pressed',String(n===b)));let count=0;$$('[data-news-category]').forEach(n=>{n.hidden=!!b.dataset.category&&n.dataset.newsCategory!==b.dataset.category;if(!n.hidden)count++;});$('#news-empty').hidden=count>0;}));
let indexPromise;
function getIndex(){return indexPromise||(indexPromise=fetch(root+'assets/search-index.json').then(r=>{if(!r.ok)throw new Error('index');return r.json();}).catch(e=>{indexPromise=null;throw e;}));}
function search(records,query){const terms=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);if(!terms.length)return [];return records.map(r=>{const heading=(r.id+' '+r.title+' '+r.topics).toLocaleLowerCase();const body=(heading+' '+r.text+' '+r.summary).toLocaleLowerCase();return {r,score:terms.every(t=>body.includes(t))?terms.reduce((s,t)=>s+(r.id.toLowerCase()===t?20:heading.includes(t)?5:1),0):0};}).filter(r=>r.score>0).sort((a,b)=>b.score-a.score||a.r.id.localeCompare(b.r.id)).map(x=>x.r);}
function resultElement(r){const a=document.createElement('a');a.className='search-result';a.href=root+r.id+'/';const type=document.createElement('span');type.textContent=r.category+' · '+r.id;const h=document.createElement('h2');h.textContent=r.title;const p=document.createElement('p');p.textContent=r.summary;a.append(type,h,p);return a;}
function message(target,text){const p=document.createElement('p');p.className='muted';p.textContent=text;target.replaceChildren(p);}
const dialog=$('#search-dialog');const quick=$('#global-query');let quickSeq=0;
function openSearch(){dialog.showModal();quick.focus();}
$('.search-trigger')?.addEventListener('click',openSearch);
$('.close-dialog')?.addEventListener('click',()=>dialog.close());
dialog?.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();dialog.open?dialog.close():openSearch();}if(e.key==='Escape'){if(dialog.open){e.preventDefault();dialog.close();}document.body.classList.remove('nav-open');menu?.setAttribute('aria-expanded','false');}});
quick?.addEventListener('input',async()=>{const seq=++quickSeq;const target=$('#quick-results');const q=quick.value.trim();if(!q){message(target,'输入标题、编号或关键词。');return;}message(target,'正在搜索…');try{const records=await getIndex();if(seq!==quickSeq)return;const found=search(records,q);target.replaceChildren(...found.slice(0,8).map(resultElement));if(!found.length)message(target,'没有找到匹配内容。试试题目编号或更短的关键词。');if(found.length>8){const a=document.createElement('a');a.className='search-result';a.href=root+'search/?q='+encodeURIComponent(q);a.textContent=`查看全部 ${found.length} 条结果 →`;target.append(a);}}catch{if(seq===quickSeq)message(target,'搜索索引暂时无法载入，请稍后重试或前往知识目录。');}});
quick?.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();$('#quick-results a')?.focus();}if(e.key==='Enter'){e.preventDefault();location.href=root+'search/?q='+encodeURIComponent(quick.value);}});
const pageQuery=$('#page-query');
if(pageQuery){pageQuery.value=new URLSearchParams(location.search).get('q')||'';let seq=0;async function fullSearch(){const key=++seq;const q=pageQuery.value.trim();if(!q){$('#search-count').textContent='输入关键词搜索全站。';return;}history.replaceState(null,'',location.pathname+'?q='+encodeURIComponent(q));try{const records=await getIndex();if(key!==seq)return;const found=search(records,q);$('#search-results').replaceChildren(...found.map(resultElement));$('#search-count').textContent=`“${q}” · ${found.length} 条结果`;if(!found.length)message($('#search-results'),'没有找到匹配内容，请尝试其他关键词。');}catch{$('#search-count').textContent='搜索暂时不可用，下方保留全部内容供浏览。';}}$('.full-search').addEventListener('submit',e=>{e.preventDefault();fullSearch();});pageQuery.addEventListener('input',()=>{if(pageQuery.value.trim())fullSearch();else{history.replaceState(null,'',location.pathname);getIndex().then(records=>{$('#search-results').replaceChildren(...records.map(resultElement));$('#search-count').textContent='全部内容';}).catch(()=>{});}});if(pageQuery.value)fullSearch();}
function revealHash(){if(!location.hash)return;const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(!target)return;let n=target;while(n){if(n.tagName==='DETAILS')n.open=true;n=n.parentElement;}target.scrollIntoView();}
window.addEventListener('hashchange',revealHash);if(location.hash)revealHash();
const headings=$$('.article-section[id],.solution[id]');if(headings.length&&'IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){$$('.article-rail a').forEach(a=>a.classList.toggle('active',a.hash==='#'+e.target.id));}},{rootMargin:'-15% 0px -65% 0px'});headings.forEach(h=>observer.observe(h));}
let printState=[];window.addEventListener('beforeprint',()=>{printState=$$('.solution').map(d=>[d,d.open]);printState.forEach(([d])=>d.open=true);});window.addEventListener('afterprint',()=>printState.forEach(([d,o])=>d.open=o));
