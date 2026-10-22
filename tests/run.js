#!/usr/bin/env node
/* =================================================================
   CODE QUEST TEST SUITE  ·  node tests/run.js   (no dependencies)
   Loads the shipped index.html and checks:
   1. the Python interpreter     2. the Rust interpreter
   3. every activity, duel question, test and expert challenge
      (reference solutions pass, starters and hardcoded answers fail)
   4. save codes                 5. step recording for the visualiser
   Exits with code 1 if anything fails.
   ================================================================= */
const fs=require('fs'),vm=require('vm'),path=require('path');
const html=fs.readFileSync(process.env.CQ_INDEX||path.join(__dirname,'..','index.html'),'utf8');
const script=html.match(/<script>([\s\S]*)<\/script>/)[1];
const ctx={console};vm.createContext(ctx);vm.runInContext(script,ctx,{filename:'index.html'});
const G=n=>vm.runInContext(n,ctx);
const Py=G('PyLang'),Rs=G('RsLang');
let passed=0,failed=0;const failures=[];
function report(name,ok,detail){if(ok)passed++;else{failed++;failures.push(name+(detail?'\n     '+detail:''));if(process.env.CQ_BAIL){console.log('FAIL '+name);process.exit(1);}}}
/* ---- Oracle mode: CQ_ORACLE=cpython judges every Python expectation with real CPython ---- */
const ORACLE=process.env.CQ_ORACLE||'',wording=[];let skipped={input:0,rand:0};
const PyOrig={run:Py.run},RsOrig={run:Rs.run};
if(ORACLE==='rustc'){
  const {spawnSync}=require('child_process'),os=require('os'),crypto=require('crypto');
  const v=spawnSync('rustc',['--version'],{encoding:'utf8'});
  if(v.error||v.status!==0){console.log('CQ_ORACLE=rustc needs the Rust compiler (rustc) on your PATH.');process.exit(2);}
  const DIR=fs.mkdtempSync(path.join(os.tmpdir(),'cq_rs_')),built=new Map();
  Rs.run=(src,opts)=>{opts=opts||{};
    if(/\brand::/.test(src)){const r=RsOrig.run(src,opts);r.skipped='rand';return r;}   /* bare rustc has no rand crate */
    let b=built.get(src);
    if(!b){const f=path.join(DIR,'p'+crypto.createHash('md5').update(src).digest('hex').slice(0,10)+'.rs'),exe=f.slice(0,-3);fs.writeFileSync(f,src);
      const c=spawnSync('rustc',['--edition','2021','-A','warnings','-o',exe,f],{encoding:'utf8',timeout:120000});
      if(c.status!==0){const t=c.stderr||'',m=t.match(/error(?:\[(E\d{4})\])?: ([^\n]*)/),l=t.match(/--> [^\n]*?:(\d+):(\d+)/);
        b={err:{kind:'compile',code:(m&&m[1])||null,msg:m?m[2]:t.slice(0,200),line:l?+l[1]:0,col:l?+l[2]:1,extra:{}}};}
      else b={exe};built.set(src,b);}
    if(b.err)return {ok:false,out:'',err:b.err};
    const p=spawnSync(b.exe,[],{input:(opts.inputs||[]).map(s=>s+'\n').join(''),encoding:'utf8',timeout:5000,maxBuffer:1<<24});
    if(p.signal||(p.error&&p.error.code==='ETIMEDOUT'))return {ok:false,out:p.stdout||'',err:{kind:'limit',code:null,msg:'still running after 5 seconds',line:0,col:1,extra:{}}};
    if(p.status===101){const m=(p.stderr||'').match(/panicked at [^\n]*?:(\d+):\d+:\n([^\n]*)/);return {ok:false,out:p.stdout||'',err:{kind:'panic',code:null,msg:m?m[2]:'panic',line:m?+m[1]:0,col:1,extra:{}}};}
    return {ok:true,out:p.stdout||''};};
  console.log('ORACLE MODE: every Rust program below is compiled and run with real '+v.stdout.trim());
}
if(ORACLE==='cpython'){
  const {spawnSync}=require('child_process'),os=require('os');
  const RUNNER=path.join(os.tmpdir(),'cq_cpython_runner.py');
  fs.writeFileSync(RUNNER,[
    'import sys, json, io, builtins, traceback',
    'd = json.loads(sys.stdin.read()); inputs = list(d["inputs"]); buf = io.StringIO(); real = sys.stdout; sys.stdout = buf',
    'def _input(prompt=""):',
    '    if not inputs: raise EOFError("EOF when reading a line")',
    '    v = inputs.pop(0); print(str(prompt) + v); return v   # a terminal shows the typed answer, as Code Quest does',
    'builtins.input = _input',
    'res = {"ok": True}',
    'try:',
    '    exec(compile(d["src"], "quest.py", "exec"), {"__name__": "__main__"})',
    'except BaseException as e:',
    '    line = None',
    '    for fr in traceback.extract_tb(e.__traceback__):',
    '        if fr.filename == "quest.py": line = fr.lineno',
    '    if isinstance(e, SyntaxError) and e.filename == "quest.py": line = e.lineno',
    '    res = {"ok": False, "type": type(e).__name__, "msg": e.msg if isinstance(e, SyntaxError) else str(e), "line": line}',
    'sys.stdout = real; res["out"] = buf.getvalue(); print(json.dumps(res))'].join('\n'));
  Py.run=(src,opts)=>{opts=opts||{};
    const p=spawnSync('python3',[RUNNER],{input:JSON.stringify({src,inputs:opts.inputs||[]}),encoding:'utf8',timeout:4000,maxBuffer:1<<24});
    if(p.signal||(p.error&&p.error.code==='ETIMEDOUT'))return {ok:false,out:'',err:{type:'TimeoutError',msg:'your program ran for too long',line:0}};
    let r;try{r=JSON.parse(p.stdout.trim().split('\n').pop());}catch(e){return {ok:false,out:'',err:{type:'RunnerError',msg:String(p.stderr).slice(-300),line:0}};}
    return r.ok?{ok:true,out:r.out}:{ok:false,out:r.out,err:{type:r.type,msg:r.msg,line:r.line||0}};};
  console.log('ORACLE MODE: every Python program below runs in real CPython '+spawnSync('python3',['--version'],{encoding:'utf8'}).stdout.trim());
}
const section=s=>console.log('\n== '+s+' ==');

section('1. Python interpreter');
function tp(src,exp,opts){const r=Py.run(src,opts);const got=r.ok?r.out.replace(/\n$/,''):'ERR '+r.err.type+': '+r.err.msg+' @'+r.err.line;
  if(ORACLE==='cpython'&&!r.ok&&exp.startsWith('ERR ')){const m=exp.match(/^ERR (\w+): ([\s\S]*) @(\d+)$/),ok=m&&m[1]===r.err.type&&(m[1]==='TimeoutError'||+m[3]===r.err.line);
    if(ok&&m[2]!==r.err.msg&&m[1]!=='TimeoutError')wording.push(JSON.stringify(src).slice(0,40)+'\n       Code Quest: '+m[2]+'\n       CPython:    '+r.err.msg);
    report('python vs CPython: '+JSON.stringify(src).slice(0,60),ok,'expected '+exp+' | CPython says '+got);return;}
  report('python: '+JSON.stringify(src).slice(0,60),got===exp,'expected '+JSON.stringify(exp)+' got '+JSON.stringify(got));}
tp('print("Hello World!")','Hello World!');
tp('print(7/2, 7//2, 7%3, 2**10, -7//2, -7%3)','3.5 3 1 1024 -4 2');
tp('print(10/2)','5.0');
tp('print(0.1+0.2)','0.30000000000000004');
tp('x = 5\nx += 2\nprint(x*1.5)','10.5');
tp('name="Ada"\nage=12\nprint(f"Hi {name}, next year {age+1}!")','Hi Ada, next year 13!');
tp('print(f"{3.14159:.2f} {42:>5}|{7:03d} {1234567:,}")','3.14    42|007 1,234,567');
tp('level = 12\nif level >= 10:\n    print("Boss fight unlocked!")\nelse:\n    print("Keep training!")','Boss fight unlocked!');
tp('gold=75\nif gold>=100:\n    print("Rich!")\nelif gold>=50:\n    print("Comfortable")\nelse:\n    print("Poor")','Comfortable');
tp('for i in range(1, 6):\n    print(i)','1\n2\n3\n4\n5');
tp('ammo=3\nwhile ammo>0:\n    print("Bang!")\n    ammo-=1\nprint("empty")','Bang!\nBang!\nBang!\nempty');
tp('team=["A","B"]\nteam.append("C")\nprint(team, len(team))',"['A', 'B', 'C'] 3");
tp('def heal(hp, amt=10):\n    return hp+amt\nprint(heal(50,30), heal(5))','80 15');
tp('for i in range(1,16):\n    if i%15==0: print("FizzBuzz")\n    elif i%3==0: print("Fizz")\n    elif i%5==0: print("Buzz")\n    else: print(i)','1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz');
tp('print("hello"[::-1], "hello"[1:3], [1,2,3,4][-2:])','olleh el [3, 4]');
tp('d={"a":1,"b":2}\nd["c"]=3\nfor k,v in d.items():\n    print(k,v)\nprint(d)',"a 1\nb 2\nc 3\n{'a': 1, 'b': 2, 'c': 3}");
tp('print(d)','ERR NameError: name \'d\' is not defined @1');
tp('pritn("x")',"ERR NameError: name 'pritn' is not defined. Did you mean: 'print'? @1");
tp('print("Age: " + 12)','ERR TypeError: can only concatenate str (not "int") to str @1');
tp('if x > 3\n    print(1)',"ERR SyntaxError: expected ':' @1");
tp('if 1 > 3:\nprint(1)','ERR IndentationError: expected an indented block @2');
tp('print("hi")\n  print("x")','ERR IndentationError: unexpected indent @2');
tp('print("hi"','ERR SyntaxError: \'(\' was never closed @1');
tp('print("hi)','ERR SyntaxError: unterminated string literal (did you forget the closing quote?) @1');
tp('x=[1,2]\nprint(x[5])','ERR IndexError: list index out of range @2');
tp('while True:\n    pass','ERR TimeoutError: your program ran for too long @2');
tp('count=0\ndef inc():\n    count += 1\ninc()',"ERR UnboundLocalError: cannot access local variable 'count' where it is not associated with a value @3");
tp('count=0\ndef inc():\n    global count\n    count += 1\ninc()\ninc()\nprint(count)','2');
tp('print([x*x for x in range(5) if x%2==0])','[0, 4, 16]');
tp('a, b = 1, 2\na, b = b, a\nprint(a, b)','2 1');
tp('print(sorted([3,1,2], reverse=True), max([4,9,2]), sum([1,2,3]), min(5,3))','[3, 2, 1] 9 6 3');
tp('s="Hello World"\nprint(s.upper(), s.lower(), s.split(), "-".join(["a","b"]), s.replace("World","Ferris"), s.count("o"))',"HELLO WORLD hello world ['Hello', 'World'] a-b Hello Ferris 2");
tp('try:\n    x=int("abc")\nexcept ValueError as e:\n    print("oops:", e)',"oops: invalid literal for int() with base 10: 'abc'");
tp('try:\n    print(1/0)\nexcept ZeroDivisionError:\n    print("no!")\nfinally:\n    print("done")','no!\ndone');
tp('import random\nrandom.seed(4)\nx=random.randint(1,6)\nprint(1<=x<=6)','True');
tp('import math\nprint(math.sqrt(16), math.floor(3.7), math.pi > 3)','4.0 3 True');
tp('name = input("Name? ")\nprint("Hi", name)','Name? Ada\nHi Ada',{inputs:['Ada']});
tp('def fact(n):\n    if n<=1: return 1\n    return n*fact(n-1)\nprint(fact(25))','15511210043330985984000000');
tp('print(True + 1, 3 == 3.0, "a" < "b", [1,2] == [1,2], None)','2 True True True None');
tp('print(type(5), type("x"), type(2.0))',"<class 'int'> <class 'str'> <class 'float'>");
tp('import this\n','__ZEN__'.replace('__ZEN__',PyOrig.run('import this').out.trim()));
tp('from __future__ import braces','ERR SyntaxError: not a chance @1');
tp('x = 5\nif x = 5:\n    print(x)',"ERR SyntaxError: invalid syntax. Maybe you meant '==' instead of '='? @2");
tp('print("*" * 3)\nfor i in range(1,4):\n    print("*"*i)','***\n*\n**\n***');
tp('nums=[3,7,2]\nnums.sort()\nprint(nums, nums.index(7), 7 in nums, 5 not in nums)','[2, 3, 7] 2 True True');
tp('print(round(2.5), round(3.5), round(3.14159, 2), abs(-4))','2 4 3.14 4');
tp('print(5 > "3")',"ERR TypeError: '>' not supported between instances of 'int' and 'str' @1");
tp('for i in 5:\n    print(i)',"ERR TypeError: 'int' object is not iterable @1");
tp('def f(a,b):\n    return a\nf(1)',"ERR TypeError: f() missing 1 required positional argument: 'b' @3");
tp('print("a", "b", sep="-", end="!")','a-b!');
tp('x = 3\nprint(f"{x=}")','x=3');
tp('print("{} has {} hp".format("Orc", 30))','Orc has 30 hp');
tp('words = "the cat the dog".split()\ncounts = {}\nfor w in words:\n    counts[w] = counts.get(w, 0) + 1\nprint(counts)',"{'the': 2, 'cat': 1, 'dog': 1}");
tp('print(list(enumerate(["a","b"], 1)))',"[(1, 'a'), (2, 'b')]");
tp('ålder = 12\nprint(ålder)','12');
tp('print(1e-7, 2.0*3, 1/3)','1e-07 6.0 0.3333333333333333');
tp('print(3x)','ERR SyntaxError: invalid decimal literal @1');
tp('x = 10\ndef show():\n    print(x)\nshow()','10');
tp('lst=[1,2,3]\nfor i, v in enumerate(lst):\n    lst[i] = v * 10\nprint(lst)','[10, 20, 30]');
tp('print(“hi”)',"ERR SyntaxError: invalid character '“' (U+201C) @1");
tp('print(sorted(["bob","Al","cy"], key=len))',"['Al', 'cy', 'bob']");
tp('for i in range(3):\n    if i == 1:\n        continue\n    print(i)\nelse:\n    print("end")','0\n2\nend');
tp('x = 0\nwhile x < 10:\n    x += 1\n    if x == 3:\n        break\nprint(x)','3');
tp('print(2**100)','1267650600228229401496703205376');
tp('print(10 / 0)','ERR ZeroDivisionError: division by zero @1');
tp('print("Ha" * 3, [0]*3)','HaHaHa [0, 0, 0]');
tp('print(", ".join(str(n) for n in range(3)))','0, 1, 2');
tp('s = "abc"\ns[0] = "z"',"ERR TypeError: 'str' object does not support item assignment @2");
tp('def f():\n    return\nprint(f())','None');
tp('raise ValueError("bad move")','ERR ValueError: bad move @1');
tp('print("it\'s", \'say "hi"\', repr("it\'s"))','it\'s say "hi" "it\'s"');

section('2. Rust interpreter');
const MR=b=>'fn main() {\n'+b+'\n}';
function tr(src,exp,opts){const r=Rs.run(src,opts);
  if(ORACLE==='rustc'){const name='rust vs rustc: '+JSON.stringify(src).slice(0,60);
    if(opts&&opts.inputs&&opts.inputs.length){skipped.input++;return;} if(r.skipped){skipped.rand++;return;}
    const m=exp.match(/^[\s\S]*?ERR (\w+): ([\s\S]*) @(\d+)$/),said=r.ok?'ran fine and printed '+JSON.stringify(r.out):(r.err.code||r.err.kind)+': '+r.err.msg+' @'+r.err.line;
    if(m){const ok=!r.ok&&(r.err.code||r.err.kind)===m[1];
      if(ok&&(m[2].split('\n')[0]!==r.err.msg||+m[3]!==r.err.line))wording.push(JSON.stringify(src).slice(0,50)+'\n       Code Quest: '+m[2].split('\n')[0]+' @'+m[3]+'\n       rustc:      '+r.err.msg+' @'+r.err.line);
      report(name,ok,'Code Quest expects '+m[1]+' | rustc: '+said);return;}
    report(name,r.ok&&r.out.replace(/\n$/,'')===exp,'Code Quest expects '+JSON.stringify(exp)+' | rustc: '+said);return;}
const got=r.ok?r.out.replace(/\n$/,''):(r.out?r.out:'')+'ERR '+(r.err.code||r.err.kind)+': '+r.err.msg+' @'+r.err.line;report('rust: '+JSON.stringify(src).slice(0,60),got===exp,'expected '+JSON.stringify(exp)+' got '+JSON.stringify(got));}
tr(MR('println!("Hello, Ferris!");'),'Hello, Ferris!');
tr(MR('let x = 5;\nlet y = 7;\nprintln!("{} + {} = {}", x, y, x + y);'),'5 + 7 = 12');
tr(MR('let name = "Ada";\nprintln!("Hi {name}!");'),'Hi Ada!');
tr(MR('let x = 5;\nx = 6;'),'ERR E0384: cannot assign twice to immutable variable `x` @3');
tr(MR('let mut x = 5;\nx += 1;\nprintln!("{x}");'),'6');
tr(MR('let x = 5;\nlet x = x * 2;\nprintln!("{}", x);'),'10');
tr(MR('println!("{}", 7 / 2);\nprintln!("{}", 7.0 / 2.0);\nprintln!("{}", 7 % 3);'),'3\n3.5\n1');
tr(MR('let a = 5 + 2.5;'),'ERR E0277: cannot add a float to an integer @2');
tr(MR('let a: f64 = 5;'),'ERR E0308: mismatched types: expected `f64`, found integer @2');
tr(MR('let v = vec![1, 2, 3];\nprintln!("{}", v);'),'ERR E0277: `Vec<i32>` doesn\'t implement `std::fmt::Display` @3');
tr(MR('let v = vec![1, 2, 3];\nprintln!("{:?}", v);'),'[1, 2, 3]');
tr(MR('let s1 = String::from("hi");\nlet s2 = s1;\nprintln!("{}", s1);'),'ERR E0382: borrow of moved value: `s1` @4');
tr(MR('let s1 = String::from("hi");\nlet s2 = s1.clone();\nprintln!("{} {}", s1, s2);'),'hi hi');
tr(MR('let v = vec![1];\nv.push(2);'),'ERR E0596: cannot borrow `v` as mutable, as it is not declared as mutable @3');
tr(MR('let mut v = Vec::new();\nv.push(10);\nv.push(20);\nprintln!("{:?} len={}", v, v.len());'),'[10, 20] len=2');
tr(MR('let v = vec![1,2,3];\nprintln!("{}", v[5]);'),'ERR panic: index out of bounds: the len is 3 but the index is 5 @3');
tr(MR('for i in 1..=5 {\n    println!("{}", i);\n}'),'1\n2\n3\n4\n5');
tr(MR('for i in 0..3 { print!("{} ", i); }\nprintln!();'),'0 1 2 ');
tr(MR('let mut n = 0;\nlet r = loop {\n    n += 1;\n    if n == 4 { break n * 10; }\n};\nprintln!("{r}");'),'40');
tr('fn add(a: i32, b: i32) -> i32 {\n    a + b\n}\n'+MR('println!("{}", add(2, 3));'),'5');
tr('fn add(a: i32, b: i32) -> i32 {\n    a + b;\n}\n'+MR('println!("{}", add(2, 3));'),'ERR E0308: mismatched types: expected `i32`, found `()` @2');
tr(MR('let n = 7;\nlet kind = if n % 2 == 0 { "even" } else { "odd" };\nprintln!("{kind}");'),'odd');
tr(MR('let n = 3;\nmatch n {\n    1 => println!("one"),\n    2 | 3 => println!("two or three"),\n    _ => println!("many"),\n}'),'two or three');
tr(MR('let n = 3;\nmatch n {\n    1 => println!("one"),\n}'),'ERR E0004: non-exhaustive patterns: `_` not covered @3');
tr(MR('let age = 15;\nlet stage = match age {\n    0..=12 => "kid",\n    13..=19 => "teen",\n    _ => "adult",\n};\nprintln!("{stage}");'),'teen');
tr(MR('let x: u8 = 255;\nlet y = x + 1;'),'ERR compile: this arithmetic operation will overflow @3');
tr(MR('let x: u8 = 300;'),'ERR undefined: literal out of range for `u8` @2'.replace('undefined','compile'));
tr(MR('let v = vec![3, 1, 2];\nlet total: i32 = v.iter().sum();\nlet doubled: Vec<i32> = v.iter().map(|x| x * 2).collect();\nprintln!("{} {:?}", total, doubled);'),'6 [6, 2, 4]');
tr(MR('let v = vec![3, 1, 2];\nlet t = v.iter().sum();'),'ERR E0282: type annotations needed @3');
tr(MR('let o: Option<i32> = None;\nprintln!("{}", o.unwrap());'),'ERR panic: called `Option::unwrap()` on a `None` value @3');
tr(MR('let o = Some(5);\nmatch o {\n    Some(n) => println!("got {n}"),\n    None => println!("nothing"),\n}'),'got 5');
tr(MR('let o = Some(5);\nif let Some(n) = o { println!("{}", n + 1); }'),'6');
tr('#[derive(Debug)]\nstruct Hero { name: String, hp: i32 }\n'+MR('let h = Hero { name: String::from("Ada"), hp: 100 };\nprintln!("{:?}", h);\nprintln!("{} has {} hp", h.name, h.hp);'),'Hero { name: "Ada", hp: 100 }\nAda has 100 hp');
tr('struct Hero { name: String, hp: i32 }\n'+MR('let h = Hero { name: String::from("Ada"), hp: 100 };\nprintln!("{:?}", h);'),"ERR E0277: `Hero` doesn't implement `Debug` @4");
tr('struct Hero { name: String, hp: i32 }\n'+MR('let h = Hero { name: "Ada", hp: 100 };'),'ERR E0308: mismatched types: expected `String`, found `&str` @3');
tr('struct Hero { name: String, hp: i32 }\nimpl Hero {\n    fn new(name: &str) -> Self {\n        Self { name: name.to_string(), hp: 100 }\n    }\n    fn hit(&mut self, d: i32) {\n        self.hp -= d;\n    }\n    fn show(&self) {\n        println!("{}: {}", self.name, self.hp);\n    }\n}\n'+MR('let mut h = Hero::new("Bo");\nh.hit(30);\nh.show();'),'Bo: 70');
tr('struct Hero { hp: i32 }\nimpl Hero {\n    fn hit(&mut self, d: i32) { self.hp -= d; }\n}\n'+MR('let h = Hero { hp: 5 };\nh.hit(1);'),'ERR E0596: cannot borrow `h` as mutable, as it is not declared as mutable @7');
tr('struct Hero { hp: i32 }\nimpl Hero {\n    fn hit(&self, d: i32) { self.hp -= d; }\n}\n'+MR('let mut h = Hero { hp: 5 };\nh.hit(1);'),'ERR E0594: cannot assign to `self.hp`, which is behind a `&` reference @3');
tr('fn greet(name: &str) { println!("Hi {name}"); }\n'+MR('let s = String::from("Ada");\ngreet(&s);\ngreet("Bo");'),'Hi Ada\nHi Bo');
tr('fn greet(name: &str) { println!("Hi {name}"); }\n'+MR('let s = String::from("Ada");\ngreet(s);'),'ERR E0308: mismatched types: expected `&str`, found `String` @4');
tr('fn take(s: String) { println!("{s}"); }\n'+MR('let s = String::from("x");\ntake(s);\ntake(s);'),'ERR E0382: use of moved value: `s` @5');
tr('fn add_one(n: &mut i32) { *n += 1; }\n'+MR('let mut x = 1;\nadd_one(&mut x);\nadd_one(&mut x);\nprintln!("{x}");'),'3');
tr(MR('let a = "hi" + "there";'),'ERR E0369: cannot add `&str` to `&str` @2');
tr(MR('let a = String::from("hi ") + "there";\nprintln!("{a}");'),'hi there');
tr(MR('let x = 5\nprintln!("{}", x);'),'ERR compile: expected `;`, found `println` @2');
tr(MR('let x = 5;\nif x {\n    println!("yes");\n}'),'ERR E0308: mismatched types: expected `bool`, found integer @3');
tr(MR('println("hi");'),'ERR E0423: expected function, found macro `println` @2');
tr(MR('println!(5);'),'ERR compile: format argument must be a string literal @2');
tr(MR('println!("{} {}", 1);'),'ERR compile: 2 positional arguments in format string, but there is 1 argument @2');
tr(MR('let score = 10;\nprintln!("{}", scroe);'),'ERR E0425: cannot find value `scroe` in this scope (a local variable with a similar name exists: `score`) @3');
tr(MR('x = 5;'),'ERR E0425: cannot find value `x` in this scope @2');
tr('fn helper() {}','ERR E0601: `main` function not found in crate `quest` @1');
tr(MR('let s = "héllo";\nprintln!("{}", s.len());'),'6');
tr(MR('let w = "ferris";\nlet r: String = w.chars().rev().collect();\nprintln!("{r}");'),'sirref');
tr(MR('let s = "hi";\nlet c = s[0];'),'ERR E0277: the type `str` cannot be indexed by `{integer}` @3');
tr(MR('let pi = 3.14159;\nprintln!("{:.2} {:>6}|{:<4}|{:05}", pi, 42, "ab", 7);'),'3.14     42|ab  |00007');
tr(MR('println!("{}", 10.0);\nprintln!("{:?}", 10.0);'),'10\n10.0');
tr(MR('let n: i32 = "42".parse().unwrap();\nprintln!("{}", n + 1);'),'43');
tr(MR('let r = "abc".parse::<i32>();\nmatch r {\n    Ok(n) => println!("{n}"),\n    Err(e) => println!("oops: {}", e),\n}'),'oops: invalid digit found in string');
tr(MR('let mut guess = String::new();\nstd::io::stdin().read_line(&mut guess).expect("fail");\nlet g: u32 = guess.trim().parse().unwrap();\nprintln!("You guessed {g}");'),'42\nYou guessed 42',{inputs:['42']});
tr('use std::cmp::Ordering;\n'+MR('let secret = 50;\nlet g = 30;\nmatch g.cmp(&secret) {\n    Ordering::Less => println!("Too small!"),\n    Ordering::Greater => println!("Too big!"),\n    Ordering::Equal => println!("You win!"),\n}'),'Too small!');
tr(MR('let t = (1, "two", 3.0);\nprintln!("{} {} {:?}", t.0, t.1, t);'),'1 two (1, "two", 3.0)');
tr(MR('let mut v = vec![1, 2, 3];\nfor x in v.iter_mut() {\n    *x *= 10;\n}\nprintln!("{:?}", v);'),'[10, 20, 30]');
tr(MR('let v = vec![1, 2, 3];\nfor x in v {\n    print!("{x}");\n}\nprintln!("{:?}", v);'),'ERR E0382: borrow of moved value: `v` @6');
tr(MR('let v = vec![1, 2, 3];\nfor x in &v {\n    print!("{x}");\n}\nprintln!(" {:?}", v);'),'123 [1, 2, 3]');
tr(MR('let names = vec!["a", "b"];\nlet j = names.join("-");\nprintln!("{j}");'),'a-b');
tr(MR('let evens: Vec<i32> = (1..=10).filter(|n| n % 2 == 0).collect();\nprintln!("{:?}", evens);'),'[2, 4, 6, 8, 10]');
tr(MR('let x = 1 < 2 < 3;'),'ERR compile: comparison operators cannot be chained @2');
tr(MR('let a = [0; 3];\nprintln!("{:?} {}", a, a.len());'),'[0, 0, 0] 3');
tr(MR('let i: i32 = 1;\nlet v = vec![1,2];\nprintln!("{}", v[i]);'),'ERR E0277: the type `[i32]` cannot be indexed by `i32` @4');
tr(MR('let x = 5;\nlet y = x as f64 / 2.0;\nprintln!("{y}");'),'2.5');
tr(MR('let x = 1;\nif x > 0:\n    println!("pos");'),'ERR compile: expected `{`, found `:` @3');
tr(MR('let c = \'R\';\nprintln!("{} {}", c.is_alphabetic(), c.to_ascii_lowercase());'),'true r');
tr(MR('let mut count = 0;\nwhile count < 3 {\n    count += 1;\n}\nprintln!("{count}");'),'3');
tr(MR('loop {}'),'ERR limit: your program ran for too long @2');
tr(MR('let s = String::from("hi");\nlet t = s + &String::from("!");\nprintln!("{t}");'),'hi!');
tr('const MAX_HP: i32 = 100;\n'+MR('println!("{}", MAX_HP);'),'100');
tr(MR('let v: Vec<String> = vec![String::from("a")];\nlet s = v[0];'),'ERR E0507: cannot move out of index of `Vec<String>` @3');
tr(MR('println!("{}", i32::MAX);'),'2147483647');
tr('fn fact(n: u64) -> u64 {\n    if n <= 1 { 1 } else { n * fact(n - 1) }\n}\n'+MR('println!("{}", fact(10));'),'3628800');
tr(MR('let x;\nx = 5;\nprintln!("{x}");'),'5');
tr(MR('let data = vec![4, 9, 2];\nlet m = data.iter().max().unwrap();\nprintln!("{m}");'),'9');
tr(MR('let mut s = String::from("Hello");\ns.push_str(", world");\ns.push(\'!\');\nprintln!("{s}");'),'Hello, world!');
tr(MR('let s = String::from("Hello");\ns.push_str("!");'),'ERR E0596: cannot borrow `s` as mutable, as it is not declared as mutable @3');
tr(MR('let total = 2147483647;\nlet more = total + 1;'),'ERR compile: this arithmetic operation will overflow @3');
section('2b. Python behaviour, expected answers produced by real CPython');
{const PYC=require('./cases_python.js');
 for(const c of PYC){const r=PyOrig.run(c.src,{inputs:c.inputs||[],seed:1});
   const ok=c.err?(!r.ok&&r.err.type===c.err.type&&(c.err.type==='TimeoutError'||r.err.line===c.err.line)):(r.ok&&r.out===c.out);
   report('python = CPython: '+JSON.stringify(c.src).slice(0,60),ok,c.err?`CPython: ${c.err.type} @${c.err.line} | Code Quest: ${r.ok?'no error':r.err.type+' @'+r.err.line}`:`CPython printed ${JSON.stringify(c.out)} | Code Quest: ${JSON.stringify(r.out)}${r.ok?'':' then '+r.err.type}`);}
 console.log(PYC.length+' CPython-generated cases');}
section('2c. Rust behaviour, hand-checked against Rust');
{const RSC=require('./cases_rust.js');for(const [src,exp] of RSC)tr(src,exp);console.log(RSC.length+' Rust behaviour cases');}
console.log(`interpreter cases: ${passed} passed, ${failed} failed`);

section('3. Content');
{
const {DUEL_Q,HINTS,PY_CHAPTERS,RS_CHAPTERS,LORE,RACES,PyLang,RsLang,norm,SAVE_IDS}=G('({DUEL_Q,HINTS,PY_CHAPTERS,RS_CHAPTERS,LORE,RACES,PyLang,RsLang,norm,SAVE_IDS})');
let ok=0,bad=0,acts=0;const ids=new Set();
const fail=(id,m)=>{bad++;console.log('✗',id,m);};
const run=(lang,code,inputs)=>(lang==='python'?PyLang:RsLang).run(code,{inputs:inputs||[],seed:7});
const errLine=(lang,r)=>lang==='python'?`${r.err.type}: ${r.err.msg}`:(r.err.kind==='panic'?"thread 'main' panicked":`error[${r.err.code}]: ${r.err.msg}`);
for(const [lang,chs] of [['python',PY_CHAPTERS],['rust',RS_CHAPTERS]]){
 for(const ch of chs){
  if(!LORE[ch.card])fail(ch.id,'missing lore '+ch.card);
  for(const s of ch.steps){acts++;
   if(ids.has(s.id))fail(s.id,'duplicate id');ids.add(s.id);
   for(const k of ['title'])if(!s[k]||!s[k].en||!s[k].sv)fail(s.id,'missing '+k);
   if(['code','bug','boss','mystery','parsons'].includes(s.t)){
     if(!s.goal||!s.goal.sv||!s.body||!s.body.sv)fail(s.id,'missing goal/body');
     const code=s.t==='parsons'?s.lines.join('\n'):s.sol;
     const r=run(lang,code,s.inputs);
     if(!r.ok){fail(s.id,'SOL ERROR '+JSON.stringify(r.err)+'\n'+r.out);continue;}
     if(!s.ck(r.out,code)){fail(s.id,'SOL fails ck. out=\n'+r.out);continue;}
     if(s.t!=='parsons'){const r2=run(lang,s.starter,s.inputs);if(r2.ok&&s.ck(r2.out,s.starter))fail(s.id,'STARTER already passes');}
     if(s.t==='bug'){const r2=run(lang,s.starter,s.inputs);if(r2.ok&&s.ck(r2.out,s.starter))fail(s.id,'bug starter passes');}
     if(s.t==='mystery'&&!s.opts.includes(s.answer))fail(s.id,'answer not in opts');
     if(s.t==='mystery'&&!/^Vault/.test(s.answer)&&!norm(r.out).includes(s.answer))fail(s.id,'sol output lacks answer');
     if(s.t==='parsons'&&s.distract){for(const d of s.distract){const ls=s.lines.slice();ls.splice(Math.min(ls.length-1,2),0,d);const r3=run(lang,ls.join('\n'));if(r3.ok&&s.ck(r3.out,ls.join('\n')))fail(s.id,'distractor still passes: '+d);}}
     ok++;
   }else if(s.t==='predict'){
     const r=run(lang,s.code);const got=r.ok?norm(r.out):errLine(lang,r);
     if(norm(s.opts[s.a])!==got)fail(s.id,'predict mismatch: got '+JSON.stringify(got)+' want '+JSON.stringify(s.opts[s.a]));else ok++;
     if(new Set(s.opts.map(norm)).size!==s.opts.length)fail(s.id,'duplicate options');
   }else if(s.t==='quiz'){if(s.a<0||s.a>=s.opts.length||!s.why)fail(s.id,'bad quiz');else ok++;}
   else fail(s.id,'unknown type '+s.t);
  }
 }
}
for(const lang of ['python','rust'])RACES[lang].forEach((rc,i)=>{const r=run(lang,rc.sol);if(!r.ok||!rc.ck(r.out,rc.sol))fail('race '+lang+i,JSON.stringify(r));else ok++;const r2=run(lang,rc.starter);if(r2.ok&&rc.ck(r2.out,rc.starter))fail('race '+lang+i,'starter passes');});
const cnt=t=>[...PY_CHAPTERS,...RS_CHAPTERS].reduce((a,c)=>a+c.steps.filter(s=>s.t===t).length,0);
console.log(`activities ${acts} (py ${PY_CHAPTERS.reduce((a,c)=>a+c.steps.length,0)}, rs ${RS_CHAPTERS.reduce((a,c)=>a+c.steps.length,0)}) | checks ok ${ok} bad ${bad}`);
console.log('by type:',['code','quiz','predict','bug','parsons','mystery','boss'].map(t=>t+':'+cnt(t)).join(' '));
console.log('lore cards',Object.keys(LORE).length);

let dq=0;
for(const lang of ['python','rust'])DUEL_Q[lang].forEach((d,i)=>{const id='dq_'+lang+i;
  if(!d.why||!d.why.sv)fail(id,'missing why');if(d.q&&!d.q.sv)fail(id,'missing sv q');
  const nrm=d.opts.map(o=>norm(typeof o==='string'?o:o.en));
  if(new Set(nrm).size!==nrm.length)fail(id,'duplicate options');
  if(d.ch==null||d.ch<0||d.ch>=(lang==='python'?PY_CHAPTERS:RS_CHAPTERS).length)fail(id,'bad chapter');
  if(d.code){const r=run(lang,d.code);const got=r.ok?norm(r.out):errLine(lang,r);
    if(nrm[d.a]!==got)fail(id,'answer mismatch: real output '+JSON.stringify(got));else dq++;
    nrm.forEach((o,k)=>{if(k!==d.a&&o===got)fail(id,'two correct options');});}else dq++;});
for(const k in HINTS){if(!ids.has(k))fail(k,'hint for unknown step');HINTS[k].forEach(h=>{if(!h.en||!h.sv)fail(k,'hint missing language');});}
console.log(`duel bank verified ${dq} (py ${DUEL_Q.python.length}, rs ${DUEL_Q.rust.length}) | hint sets ${Object.keys(HINTS).length} | total bad ${bad}`);

const M=G('M');
let tx2=0;
for(const [lang,chs] of [['python',PY_CHAPTERS],['rust',RS_CHAPTERS]])chs.forEach(ch=>{for(const s of [ch.test,ch.expert]){
  if(!s){fail(ch.id,'missing test/expert');continue;}
  if(ids.has(s.id))fail(s.id,'duplicate id');ids.add(s.id);
  if(!s.title.sv||!s.goal.sv||!s.body.sv||(s.t==='expert'&&!(s.hint&&s.hint.sv)))fail(s.id,'missing language or hint');
  const r=run(lang,s.sol,s.inputs);if(!r.ok){fail(s.id,'SOL ERROR '+JSON.stringify(r.err));continue;}
  if(!s.ck(r.out,s.sol)){fail(s.id,'SOL fails: '+JSON.stringify(s.ck.lastFail||r.out));continue;}
  const r2=run(lang,s.starter,s.inputs);if(r2.ok&&s.ck(r2.out,s.starter))fail(s.id,'starter passes');
  if(s.inputs){const o=norm(r.out);const hard=lang==='python'?'print('+JSON.stringify(o)+')':M('print!('+JSON.stringify(o.replace(/\{/g,'{{').replace(/\}/g,'}}')+'\n')+');');
    const r3=run(lang,hard,s.inputs);if(r3.ok&&s.ck(r3.out,hard))fail(s.id,'hardcoded answer passes!');}
  tx2++;}});
console.log(`tests+experts verified ${tx2}/38 | total bad ${bad}`);

const saveAll=[...SAVE_IDS.python,...SAVE_IDS.rust];
if(new Set(saveAll).size!==saveAll.length)fail('SAVE_IDS','duplicate id');
ids.forEach(i=>{if(!saveAll.includes(i))fail(i,'missing from SAVE_IDS — append it to the end of the right list');});
report('content checks',bad===0,bad+' problem(s) listed above');
}

section('4. Save codes');
if(!ORACLE){
const enc=G('saveEncode'),dec=G('saveDecode'),SID=G('SAVE_IDS'),SH=G('SHOP');
let seed=12345;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
let roundOk=0,typoCaught=0,typos=0;
for(let k=0;k<200;k++){
  const st={exp:['new','pro',null][k%3],path:k%2?'rust':'python',ui:k%4<2?'en':'sv',level:1+Math.floor(rnd()*9),xp:Math.floor(rnd()*90),coins:Math.floor(rnd()*900),streak:Math.floor(rnd()*30),lastDay:'2026-'+(1+Math.floor(rnd()*12))+'-'+(1+Math.floor(rnd()*28)),done:{},owned:{},equip:{}};
  SH.forEach(it=>{if(rnd()<0.5)st.owned[it.id]=1;});if(rnd()<0.5)st.equip.tunic='gold';if(rnd()<0.5)st.equip.hat='crown';
  [...SID.python,...SID.rust].forEach(id=>{if(rnd()<0.4)st.done[id]=1;});
  const code=enc(st),o=dec(code);
  const same=o&&o.level===st.level&&o.xp===st.xp&&o.coins===st.coins&&o.streak===st.streak&&o.lastDay===st.lastDay&&o.exp===st.exp&&o.path===st.path&&o.ui===st.ui&&JSON.stringify(Object.keys(o.done).sort())===JSON.stringify(Object.keys(st.done).sort())&&JSON.stringify(o.owned)===JSON.stringify(st.owned)&&JSON.stringify(o.equip)===JSON.stringify(st.equip);
  if(same)roundOk++;
  const chars=code.replace(/-/g,''),pos=Math.floor(rnd()*chars.length),alt='0123456789ABCDEFGHJKMNPQRSTVWXYZ'.replace(chars[pos],'');
  const bad=chars.slice(0,pos)+alt[Math.floor(rnd()*alt.length)]+chars.slice(pos+1);typos++;if(!dec(bad))typoCaught++;
}
report('save codes round-trip exactly (200 random players)',roundOk===200,roundOk+'/200');
report('save codes reject single-character typos (≥97%)',typoCaught/typos>=0.97,typoCaught+'/'+typos);
const c=enc({exp:'new',path:'python',ui:'en',level:2,xp:5,coins:3,streak:1,lastDay:'2026-10-21',done:{p1a:1}});
report('save codes accept lowercase, spaces and O/0 mix-ups',!!dec(c.toLowerCase().replace(/-/g,' '))&&!!dec(c.replace(/0/g,'O')));
report('save codes reject garbage',dec('hello world')===null&&dec('')===null);
report('save codes keep an empty last-played day empty',dec(enc({exp:'new',path:'python',ui:'en',level:1,xp:0,coins:0,streak:0,lastDay:'',done:{}})).lastDay==='');
report('old version-1 save codes still load',!!dec('3C10-A03V-1854-RBZZ-ZZY0-T32T'));
console.log('save code checks done');
}

section('5. Step recording ("Watch it run")');
if(!ORACLE){
let r=Py.run('total = 0\nfor i in range(3):\n    total += i\nprint(total)',{trace:true});
const last=r.trace[r.trace.length-1];
report('python trace ends with final variable values',last.line===0&&JSON.stringify(last.frames[0].vars.map(v=>v[0]+'='+v[1]))==='["total=3","i=2"]',JSON.stringify(last));
r=Py.run('def sq(n):\n    return n * n\nprint(sq(4))',{trace:true});
report('python trace records function calls',r.trace.some(s=>s.stack.join('>')==='<module>>sq()'));
r=Rs.run('fn main() {\n    let a = String::from("x");\n    let b = a;\n    println!("{}", b);\n}',{trace:true});
report('rust trace marks moved values',r.trace.some(s=>s.frames[0].vars.some(v=>v[0]==='a'&&v[3]==='moved')));
r=Py.run('for i in range(5000):\n    pass',{trace:true,traceMax:600});
report('trace is capped for long programs',r.ok&&r.trace.length===600&&r.traceCut);
r=Py.run('x = 1\nprint(x + "a")',{trace:true});
report('python trace survives errors',!r.ok&&r.trace.length===2);
r=Py.run('print "hi"');report('python 2 style print gets the real Python 3 message',!r.ok&&/Missing parentheses/.test(r.err.msg));
report('missing quotes gets a quotes explanation',/quotes/.test(G('explainPy')(Py.run('print(Hello World!)').err,'print(Hello World!)').en));
}

if(ORACLE&&wording.length)console.log('\nSame kind of error as the real '+(ORACLE==='rustc'?'compiler':'interpreter')+', different wording or line ('+wording.length+'):\n - '+wording.join('\n - '));
if(ORACLE==='rustc')console.log(`\nSkipped ${skipped.input} programs that read input and ${skipped.rand} that use the rand crate.`);
section('5b. Sandbox rules and tools (Code Quest-specific, not compared with CPython)');
if(!ORACLE){
  tp('t = (1, 2)\nt[0] = 5',"ERR TypeError: 'tuple' object does not support item assignment @2");
  tp('def f():\n    pass\nf(1)','ERR TypeError: f() takes 0 positional arguments but 1 was given @3');
  tp('def f(a):\n    pass\nf(1, 2)','ERR TypeError: f() takes 1 positional argument but 2 were given @3');
  tp('try:\n    while True:\n        pass\nexcept:\n    print("caught")','ERR TimeoutError: your program ran for too long @2');
  tp('print(len("ab" * 10 ** 7))','ERR MemoryError: that would make something far too big @1');
  let r=Py.run('x = 1\nprint(x + "a")');report('python error display shows the failing line',Py.formatError(r.err,'x = 1\nprint(x + "a")').includes('    print(x + "a")\nTypeError'),Py.formatError(r.err,'x = 1\nprint(x + "a")'));
  r=Rs.run(MR('let x = 5;\nx = 6;'));const fe=Rs.formatError(r.err,MR('let x = 5;\nx = 6;'));
  report('rust error display points at the line',fe.includes('--> src/main.rs:3:1')&&fe.includes('3 | x = 6;')&&fe.startsWith('error[E0384]'),fe);
  r=Rs.run(MR('let v = vec![1];\nprintln!("{}", v[4]);'));report('rust panic display matches rustc layout',Rs.formatError(r.err,'').startsWith("thread 'main' panicked at src/main.rs:3:"),Rs.formatError(r.err,''));
  r=Rs.run(MR('loop {}'));report('rust stopped-program display',Rs.formatError(r.err,'').startsWith('Code Quest stopped your program'),Rs.formatError(r.err,''));
  r=Py.run('x = list(range(100))\ny = 1',{trace:true});const xv=r.trace[r.trace.length-1].frames[0].vars.find(v=>v[0]==='x')[1];
  report('visualiser shortens long values',xv.length<=70&&xv.endsWith('…'),xv);
  r=Rs.run(MR('let mut i = 0;\nwhile i < 2 {\n    i += 1;\n}'),{trace:true});
  report('rust trace has exactly one snapshot per step',r.trace.length===7&&r.trace[r.trace.length-1].line===0,r.trace.map(s=>s.line).join(','));
  r=Rs.run(MR('let x;\nx = 5;'),{trace:true});report('visualiser shows unset variables',r.trace[1].frames[0].vars[0][1]==='(not set yet)',JSON.stringify(r.trace[1].frames));
  const ck=G('cases')('python',[[[],'1']]);report('judge reports the error a test case hit',!ck('','print(1/0)')&&/ZeroDivisionError/.test(ck.lastFail.got),JSON.stringify(ck.lastFail));
  const enc=G('saveEncode'),dec=G('saveDecode'),code=enc({exp:'new',path:'python',ui:'en',level:1,xp:0,coins:0,streak:0,lastDay:'',done:{}});
  report('save codes reject an extra character',dec(code+'0')===null&&!!dec(code));
  tp('print x',"ERR SyntaxError: Missing parentheses in call to 'print'. Did you mean print(...)? @1");
  tp('pirnt(1)',"ERR NameError: name 'pirnt' is not defined. Did you mean: 'print'? @1");
  {const s='if x\n    y = 1';const q=Py.run(s);const f=Py.formatError(q.err,s);report('python syntax errors show no traceback header',!f.includes('Traceback')&&f.includes('SyntaxError'),f);}
  {const q=Py.run('def f():\n    return 1\nf()',{trace:true});report('visualiser call stack names the function',q.trace.some(s=>s.stack.includes('f()')),JSON.stringify(q.trace.map(s=>s.stack)));}
  {const q=Py.run('x = list(range(100))\ny = 1',{trace:true});const v=q.trace[q.trace.length-1].frames[0].vars.find(v=>v[0]==='x')[1];report('visualiser keeps the start of long values',v.startsWith('[0, 1, 2'),v);}
}
section('6. Friendly explanations pick the right advice');
if(!ORACLE){
const ePy=G('explainPy'),eRs=G('explainRs');
const PYX=[['pritn(1)','did you mean'],['print(zebra)','quotes'],['if 1 > 0\n    print(1)','colon'],['x = 1\nif x = 1:\n    pass','two'],['print((1)','pairs'],['print("hi)','quote'],
 ['print(\u201chi\u201d)','straight'],['print("a" "b" x)','confused'],['if 1 > 0:\nprint(1)','Tab'],['x = 1\n    y = 2','extra spaces'],['if 1:\n        x = 1\n    y = 2','uneven'],
 ['print("a" + 1)','f-string'],['print(1 < "a")','int()'],['for i in 5:\n    pass','range'],['def f(a):\n    pass\nf()','more values'],['def f():\n    pass\nf(1)','too many'],
 ['x = 1\nx()','a function'],['s = "a"\ns[0] = "b"','new string'],['[1][0.5]','whole numbers'],['print(-"a")','wrong type'],['print(1 / 0)','zero'],['print([][0])','[0]'],
 ['print({}["k"])','.get'],['int("x")','try/except'],['n = 0\ndef f():\n    n += 1\nf()','global'],['while True:\n    pass','never stopped'],['def f():\n    f()\nf()','stopping case'],
 ['"a".uper()','did you mean'],['(5).zzz()','kind of value'],['input()','program input'],['import nope','random'],['while True:\n    print("x")','mountain'],['print "x"','python 3'],
 ['print(Hello World!)','quotes around'],['assert 1 == 2','last line']];
for(const [src,word] of PYX){const r=PyOrig.run(src);const ex=r.ok?null:ePy(r.err,src);
  report('python explanation for '+JSON.stringify(src).slice(0,30),!!(ex&&ex.en.toLowerCase().includes(word.toLowerCase())&&ex.sv),ex?ex.en:'program ran without error');}
const RSX=[['let x = 1;\nx = 2;','let mut'],['fn f(v: &Vec<i32>) { v.push(1); }\nfn main() { let mut v = vec![]; f(&v); }','&mut'],['let a = String::new();\nlet b = a;\nprintln!("{}", a);','clone'],
 ['println!("{}", vec![1]);','{:?}'],['struct P { x: i32 }\nfn main() { println!("{}", P { x: 1 }); }','derive(Debug)'],['struct P { x: i32 }\nfn main() { let b = P { x: 1 } == P { x: 1 }; }','PartialEq'],
 ['struct P { x: i32 }\nfn main() { let p = P { x: 1 }; let q = p.clone(); }','Clone'],['let a = 1 + 2.0;','5.0'],['let a: f64 = 1;','decimal number'],['let a: i32 = 1.5;','whole number'],
 ['let s: String = "hi";','String::from'],['let s = String::from(5);','.to_string()'],['fn f(s: &str) {}\nfn main() { let s = String::new(); f(s); }','borrow'],
 ['fn f(n: &mut i32) {}\nfn main() { let mut x = 1; f(&x); }','&mut x'],['let a = String::new();\nlet b = String::new();\nlet c = a + b;','&b'],['let c = "a" + "b";','format!'],
 ['let s = String::from("a") + 1;','number to text'],['let x = 1\nlet y = 2;','BEFORE'],['fn f() -> i32 { 1; }\nfn main() { f(); }','remove that semicolon'],['fn f() -> i32 { }\nfn main() { f(); }','promises a value'],
 ['if 1 { }','true/false'],['println("x");','exclamation'],['println!("{} {}", 1);','each {}'],['println!("{}", 1, 2);','more values'],['println!("{1 + 1}");','after the comma'],['println!("{");','pairs'],
 ['x = 5;','let'],['let count = 1;\nprintln!("{}", cuont);','spelling'],['println!("{}", zzz);','create it with let'],['let o: Option<i32> = Some(1);\nmatch o { Some(x) => {} }','catch-all'],
 ['let o: Option<i32> = None;\nlet Some(x) = o;','if let'],['let v = vec![1];\nlet t = v.iter().sum();','i32'],['let v = (1..3).collect();','Vec<i32>'],['let x: u8 = 300;','0–255'],
 ['let s = "hi";\nlet c = s[0];','chars'],['let v = vec![1];\nlet i: i32 = 0;\nprintln!("{}", v[i]);','as usize'],['for c in "abc" { }','.chars()'],['for i in 5 { }','0..5'],
 ['let v = vec![String::new()];\nlet s = v[0];','&v[0]'],['fn helper() {}','fn main()'],['let mut v = vec![1.5, 0.5];\nv.sort();','NaN'],['let s = "a";\ns.upper();','habit'],
 ['let v = vec![1];\nv.map(|x| x);','.iter()'],['let s = "a";\ns.push_str("b");','owned String'],["let mut s = String::new();\ns.push_str('a');",'one character'],['let mut s = String::new();\ns.push("ab");','push_str'],
 ['let mut a = [1, 2];\na.push(3);','fixed size'],['let v = vec![1, 2];\nv.join(",");','list of text'],['let n = 5;\nn.len();','length'],['let b = !"a";','means'],['let n = 5;\nprintln!("{}", n.x);','Only structs'],
 ['let v = vec![1];\nprintln!("{}", v[3]);','len() - 1'],['let mut x: u8 = 250;\nloop { x += 1; }','bigger type'],['let x: u8 = 255;\nlet y = x + 1;','refuses to compile'],
 ['let o: Option<i32> = None;\no.unwrap();','if let'],['let n: i32 = "x".parse().unwrap();','Err case'],['let a = 1;\nlet b = a - 1;\nlet c = a / b;','refuses to compile'],
 ['let mut d = 1;\nd -= 1;\nlet c = 5 / d;','crab'],['panic!("boom");','crashed'],['loop {}','never stopped'],['let mut s = String::new();\nstd::io::stdin().read_line(&mut s).unwrap();','Program input'],
 ['fn f(a: i32) {}\nfn main() { f(); }','Count the values'],['let v = vec![1];\nv.zzzz();','spelling'],['let v: Vec<i32> = 5;','expected'],['println!(5);','text template'],
 ['if 1 > 0: { }','colon'],['let b = 1 < 2 < 3;','&&'],['let x = 5;\n*x = 3;','* only works'],['let v = vec![1];\nlet w = v.iter().zzz();','spelling'],['5 = 3;','strict'],['let n = 5;\nn.zzz();','spelling']];
for(const [body,word] of RSX){const src=/fn main|fn helper/.test(body)?body:MR(body);const r=Rs.run(src);const ex=r.ok?null:eRs(r.err);
  report('rust explanation for '+JSON.stringify(body).slice(0,30),!!(ex&&ex.en.toLowerCase().includes(word.toLowerCase())&&ex.sv),ex?ex.en:'program ran without error');}
}
console.log(`\n${failed?'❌':'✅'} ${passed} passed, ${failed} failed`);
if(failed){console.log('\nFailures:\n - '+failures.join('\n - '));process.exit(1);}
