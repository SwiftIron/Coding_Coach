#!/usr/bin/env node
/* =================================================================
   MUTATION TESTING · node tests/mutation.js [--sample N] [--seed S]
   Plants one small bug at a time ("mutant") in the interpreter and
   helper code inside index.html, then runs tests/run.js. A good test
   suite fails for every real bug: each mutant it misses is a gap.
   Strings, regular expressions and comments are never mutated.
   ================================================================= */
const fs=require('fs'),path=require('path'),os=require('os'),vm=require('vm'),{spawnSync}=require('child_process');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i>0?process.argv[i+1]:d;};
const SAMPLE=+arg('sample',0),SEED=+arg('seed',7),ONLY=arg('ids',''),OUT=arg('out','');
const ROOT=path.join(__dirname,'..'),html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const sStart=html.indexOf('<script>')+8,sEnd=html.lastIndexOf('</script>'),src=html.slice(sStart,sEnd);
const at=s=>{const i=src.indexOf(s);if(i<0)throw new Error('marker not found: '+s);return i;};
const REGIONS=[['Python interpreter',at('PYTHON INTERPRETER'),at('RUST INTERPRETER')],['Rust interpreter',at('RUST INTERPRETER'),at('SHARED CONTENT HELPERS')],['Shared helpers & save codes',at('SHARED CONTENT HELPERS'),at('CONTENT · PYTHON PATH')]];
/* ---- which characters are code (1) vs string/regex/comment (0) ---- */
function buildMask(s){
  const n=s.length,mask=new Uint8Array(n),KW=new Set(['return','typeof','case','in','of','new','delete','void','throw','else','do','instanceof']);
  function code(i,inTpl){let depth=0,sig='',word='';
    while(i<n){const c=s[i],d=s[i+1];
      if(c==='/'&&d==='/'){while(i<n&&s[i]!=='\n')i++;continue;}
      if(c==='/'&&d==='*'){i+=2;while(i<n&&!(s[i]==='*'&&s[i+1]==='/'))i++;i+=2;continue;}
      if(c==='"'||c==="'"){i++;while(i<n&&s[i]!==c&&s[i]!=='\n'){if(s[i]==='\\')i++;i++;}i++;sig='s';word='';continue;}
      if(c==='`'){i=tpl(i+1);sig='s';word='';continue;}
      if(c==='/'&&(sig===''||'(,=:[!&|?{};+-*%<>~^'.includes(sig)||KW.has(word))){i++;let cls=false;
        while(i<n){const ch=s[i];if(ch==='\\'){i+=2;continue;}if(ch==='\n')break;if(cls){if(ch===']')cls=false;}else if(ch==='[')cls=true;else if(ch==='/')break;i++;}
        i++;while(i<n&&/[a-z]/.test(s[i]))i++;sig='r';word='';continue;}
      if(inTpl){if(c==='{')depth++;else if(c==='}'){if(depth===0)return i+1;depth--;}}
      if(/[A-Za-z0-9_$]/.test(c)){let j=i;while(j<n&&/[A-Za-z0-9_$]/.test(s[j]))mask[j++]=1;word=s.slice(i,j);sig='w';i=j;continue;}
      mask[i]=1;if(!/\s/.test(c)){sig=c;word='';}i++;}
    return i;}
  function tpl(i){while(i<n){const c=s[i];if(c==='\\'){i+=2;continue;}if(c==='`')return i+1;if(c==='$'&&s[i+1]==='{'){i=code(i+2,true);continue;}i++;}return i;}
  code(0,false);return mask;
}
const mask=buildMask(src);
const isCode=(a,b)=>{for(let k=a;k<b;k++)if(!mask[k])return false;return true;};
const prevSig=k=>{k--;while(k>=0&&/\s/.test(src[k]))k--;return k>=0?src[k]:'';};
function matchParen(i){let d=0;for(let k=i;k<src.length;k++){if(!mask[k])continue;if(src[k]==='(')d++;else if(src[k]===')'){d--;if(d===0)return k;}}return -1;}
function fnName(pos){const re=/(?:function\s+([\w$]+)|(?:const|let|var)\s+([\w$]+)\s*=|case '([\w$]+)'|([\w$]+):\s*(?:\([^)]*\)|[\w$]+)\s*=>)/g;let m,last='?';const from=Math.max(0,pos-6000),chunk=src.slice(from,pos);while((m=re.exec(chunk)))last=m[1]||m[2]||(m[3]&&"case '"+m[3]+"'")||m[4];return last;}
/* ---- mutation operators ---- */
const cands=[];
for(const [region,lo,hi] of REGIONS){
  for(let i=lo;i<hi;i++){
    if(!mask[i])continue;
    const s3=src.substr(i,3),s2=src.substr(i,2),c=src[i];
    const add=(len,rep,op)=>{if(isCode(i,i+len))cands.push({region,start:i,end:i+len,rep,op,orig:src.substr(i,len)});};
    if(s3==='==='){add(3,'!==','=== → !==');i+=2;continue;}
    if(s3==='!=='){add(3,'===','!== → ===');i+=2;continue;}
    if(['>>=','<<=','**=','...'].includes(s3)){i+=2;continue;}
    if(s2==='=='){add(2,'!=','== → !=');i++;continue;}
    if(s2==='!='){add(2,'==','!= → ==');i++;continue;}
    if(['=>','>>','<<','**','++','--','+=','-=','*=','/=','%=','|=','&=','^='].includes(s2)){i++;continue;}
    if(s2==='<='){add(2,'<','<= → <');i++;continue;}
    if(s2==='>='){add(2,'>','>= → >');i++;continue;}
    if(s2==='&&'){add(2,'||','&& → ||');i++;continue;}
    if(s2==='||'){add(2,'&&','|| → &&');i++;continue;}
    if(c==='<'){add(1,'<=','< → <=');continue;}
    if(c==='>'){add(1,'>=','> → >=');continue;}
    const bin=/[A-Za-z0-9_$)\]'"`]/.test(prevSig(i));
    if(bin&&c==='+'){add(1,'-','+ → -');continue;}
    if(bin&&c==='-'){add(1,'+','- → +');continue;}
    if(bin&&c==='*'){add(1,'/','* → /');continue;}
    if(bin&&c==='/'){add(1,'*','/ → *');continue;}
    if(bin&&c==='%'){add(1,'*','% → *');continue;}
    if(c==='!'&&src[i+1]!=='='){add(1,'','delete !');continue;}
    if(/[A-Za-z_$]/.test(c)&&!/[\w$.]/.test(src[i-1]||'')){
      const w=src.slice(i,i+40).match(/^[A-Za-z_$][\w$]*/)[0];
      if(w==='true')add(4,'false','true → false');else if(w==='false')add(5,'true','false → true');
      else if(w==='if'&&src[i+2]==='('){const close=matchParen(i+2);if(close>0&&isCode(i,i+3))cands.push({region,start:i+3,end:close,rep:'!('+src.slice(i+3,close)+')',op:'negate if',orig:src.slice(i+3,close)});}
      i+=w.length-1;continue;}
    if(/[0-9]/.test(c)&&!/[\w$.]/.test(src[i-1]||'')){
      const num=src.slice(i,i+30).match(/^[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?\d+)?n?/)[0],m=num.match(/^(\d+)(n?)$/);
      if(m){const v=+m[1],nv=v===0?1:v===1?0:v+1;add(num.length,nv+m[2],'number '+num+' → '+nv+m[2]);}
      i+=num.length-1;continue;}
  }
}
/* ---- choose mutants ---- */
const RANGE=arg('range',''),APPEND=process.argv.includes('--append'),REPORT=arg('report','');
let seed=SEED;const rnd=()=>((seed=(seed*1103515245+12345)%2147483648)/2147483648);
cands.forEach((c,i)=>c.id=i);
let chosen=cands.slice();
if(ONLY)chosen=ONLY.split(',').map(Number).map(i=>cands[i]);
else if(SAMPLE&&SAMPLE<cands.length){for(let i=chosen.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[chosen[i],chosen[j]]=[chosen[j],chosen[i]];}chosen=chosen.slice(0,SAMPLE).sort((a,b)=>a.id-b.id);}
if(RANGE){const [a,b]=RANGE.split(':').map(Number);chosen=chosen.slice(a,b);}
const RECHECK=arg('recheck','');
if(RECHECK){ /* re-run earlier survivors, found again by the code around them (positions shift when code changes) */
  const old=JSON.parse(fs.readFileSync(RECHECK,'utf8')).filter(r=>r.status==='SURVIVED');let lost=0;chosen=[];
  for(const o of old){const key=o.ctxBefore+o.orig+o.ctxAfter,at=src.indexOf(key);
    if(at<0||src.indexOf(key,at+1)>=0){lost++;continue;}
    const start=at+o.ctxBefore.length;const c=Object.assign({},o,{start,end:start+o.orig.length});delete c.status;delete c.why;chosen.push(c);}
  console.log(`Re-checking ${chosen.length} earlier survivors (${lost} could not be located: the code around them changed)`);}
function summarize(res,showSurvivors){
  const valid=res.filter(r=>r.status!=='invalid'),killed=valid.filter(r=>r.status.startsWith('killed')),surv=valid.filter(r=>r.status==='SURVIVED');
  console.log('\nRegion results:');
  for(const [region] of REGIONS){const v=valid.filter(r=>r.region===region),k=v.filter(r=>r.status.startsWith('killed'));if(v.length)console.log(`  ${region.padEnd(30)} ${k.length}/${v.length} killed  (${Math.round(100*k.length/v.length)}%)`);}
  console.log(`\nMUTATION SCORE: ${killed.length}/${valid.length} = ${(100*killed.length/Math.max(1,valid.length)).toFixed(1)}%   (${res.length-valid.length} mutants did not parse and were skipped)`);
  if(showSurvivors&&surv.length){console.log('\nSurvivors (bugs the tests did NOT catch):');surv.forEach(r=>{const ctx=src.slice(Math.max(0,r.start-45),r.end+45).replace(/\s+/g,' ');console.log(`  #${r.id} [${r.region.split(' ')[0]} · ${r.fn}] ${r.op}\n      …${ctx}…`);});}
}
if(REPORT){summarize(JSON.parse(fs.readFileSync(REPORT,'utf8')),true);process.exit(0);}
const byRegion={};cands.forEach(c=>byRegion[c.region]=(byRegion[c.region]||0)+1);
console.log(`Mutation sites found: ${cands.length} (${Object.entries(byRegion).map(([k,v])=>k+': '+v).join(', ')})`);
console.log(`Testing ${chosen.length} mutants${SAMPLE&&!ONLY?` (random sample, seed ${SEED}${RANGE?', slice '+RANGE:''})`:''}…`);
/* ---- run each mutant against the unit suite; results are saved after every mutant ---- */
const TMP=path.join(os.tmpdir(),'cq_mutant.html'),RUN=path.join(__dirname,'run.js');
const res=APPEND&&OUT&&fs.existsSync(OUT)?JSON.parse(fs.readFileSync(OUT,'utf8')):[];
const done=new Set(res.map(r=>r.id)),t0=Date.now();
chosen.forEach((m,k)=>{
  if(done.has(m.id))return;
  const mutated=src.slice(0,m.start)+m.rep+src.slice(m.end);
  let r;
  try{new vm.Script(mutated);
    fs.writeFileSync(TMP,'<script>'+mutated+'</script>');
    const p=spawnSync('node',[RUN],{env:Object.assign({},process.env,{CQ_INDEX:TMP,CQ_BAIL:'1'}),encoding:'utf8',timeout:30000});
    const status=p.signal?'killed (timeout)':p.status!==0?'killed':'SURVIVED';
    r=Object.assign({status,why:status==='killed'?(p.stdout.match(/FAIL (.*)/)||[,'content check'])[1].slice(0,70):''},m);
  }catch(e){r=Object.assign({status:'invalid'},m);}
  r.line=src.slice(0,m.start).split('\n').length;r.fn=fnName(m.start);
  res.push(r);if(OUT)fs.writeFileSync(OUT,JSON.stringify(res));
  if((k+1)%25===0)console.log(`  ${k+1}/${chosen.length}  (${Math.round((Date.now()-t0)/1000)}s)`);
});
summarize(res,!OUT);
