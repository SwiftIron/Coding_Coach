#!/usr/bin/env python3
"""Code Quest browser playthrough: plays the shipped index.html in headless Chromium like real players.
Setup:  pip install playwright && python -m playwright install chromium
Run:    python tests/e2e_playthrough.py      (exits with code 1 if anything fails, ~3-4 minutes)"""
import json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = (Path(__file__).resolve().parent.parent / 'index.html').as_uri()
failures, errors, external = [], [], []
SEED = {'tut': {'hub': 1, 'code': 1}, 'exp': 'new'}

def check(name, cond, detail=''):
    print(('PASS  ' if cond else 'FAIL  ') + name + ('' if cond else f'   -> {detail}'))
    if not cond: failures.append(name)

def open_page(browser, seed=None, **kw):
    """Fresh browser context (own storage) per scenario; optional seeded progress."""
    ctx = browser.new_context(viewport=kw.pop('viewport', {'width': 1366, 'height': 768}), **kw)
    if seed is not None:
        ctx.add_init_script("if(!sessionStorage.getItem('cqSeed')){localStorage.setItem('cq5',%s);sessionStorage.setItem('cqSeed','1');}" % json.dumps(json.dumps(seed)))
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('request', lambda q: external.append(q.url) if not q.url.startswith(('file:', 'data:', 'blob:')) else None)
    pg.goto(URL); pg.wait_for_timeout(200)
    return pg

def saved(pg): return json.loads(pg.evaluate("localStorage.getItem('cq5')"))

def content(pg):
    return pg.evaluate("""(()=>{const m=C=>C.map(c=>({id:c.id,steps:c.steps.map(s=>({id:s.id,t:s.t,sol:s.sol,a:s.a,lines:s.lines,answer:s.answer})),test:c.test.sol,xid:c.expert.id,xsol:c.expert.sol}));return {python:m(PY_CHAPTERS),rust:m(RS_CHAPTERS)};})()""")

def solve(pg, s):
    if s['t'] in ('quiz', 'predict'):
        pg.click(f'.opt[data-o="{s["a"]}"]')
    elif s['t'] == 'parsons':
        for line in s['lines']:
            ok = pg.evaluate("([t])=>{for(const b of document.querySelectorAll('[data-p]')){if(b.textContent===t){b.click();return true}}return false}", [line])
            if not ok: raise RuntimeError('missing line ' + line)
        pg.click('#runBtn')
    else:
        pg.fill('.edwrap textarea', s['sol']); pg.click('#runBtn')
        if s['t'] == 'mystery':
            pg.wait_for_timeout(80); pg.click(f'[data-acc="{s["answer"]}"]')

def new_player(browser):
    print('\n== New player plays every quest ==')
    pg = open_page(browser, SEED); data = content(pg); stuck = []
    for lang in ('python', 'rust'):
        if lang == 'python': pg.click('[data-start=python]')
        else: pg.click('.logo'); pg.click('[data-setpath=rust]')
        for ch in data[lang]:
            if pg.query_selector('#playBtn'): pg.click('#playBtn')
            for s in ch['steps']:
                try:
                    solve(pg, s); pg.wait_for_selector('#mMap', timeout=6000)
                    if pg.query_selector('#mNext'): pg.click('#mNext')
                    elif pg.query_selector('#mNextCh'): pg.click('#mNextCh')
                    else: pg.click('#mMap'); pg.click('.logo')
                except Exception as e:
                    stuck.append(f"{s['id']}: {str(e)[:80]}"); pg.click('.logo'); break
    st = saved(pg); total = sum(len(c['steps']) for L in data.values() for c in L)
    check(f'all {total} quests completed through the interface', len([k for k in st['done'] if not k.endswith(('_t', '_x'))]) == total and not stuck, stuck)
    check('all 19 history cards unlocked', len(st['cards']) == 19, len(st['cards']))

def kid_probes(browser):
    print('\n== Things real kids do ==')
    pg = open_page(browser, dict(SEED, teacher=True)); pg.click('[data-start=python]')
    pg.click('[data-go=sandbox]'); pg.fill('.edwrap textarea', ''); pg.click('.edwrap textarea')
    for k in ['level = 12', '\n', 'if level >= 10:', '\n', 'print("big")', '\n', '\b', 'else:', '\n', 'print("small")']:
        pg.keyboard.press('Enter') if k == '\n' else (pg.keyboard.press('Backspace') if k == '\b' else pg.keyboard.type(k))
    pg.click('#runBtn')
    check('typing if/else with auto-indent and Backspace works', pg.inner_text('#out').strip() == 'big', pg.input_value('.edwrap textarea'))
    pg.fill('.edwrap textarea', 'while True:\n    print("hi")'); t = time.time(); pg.click('#runBtn')
    check('endless printing is stopped with an explanation', 'OutputLimit' in pg.inner_text('#out') and time.time() - t < 3)
    pg.click('[data-setpath=rust]'); pg.fill('.edwrap textarea', ''); pg.click('.edwrap textarea')
    for k in ['fn main() {', '\n', 'let x = 5;', '\n', 'if x > 3 {', '\n', 'println!("big");', '\n', '}', '\n', '}']:
        pg.keyboard.press('Enter') if k == '\n' else pg.keyboard.type(k)
    pg.click('#runBtn')
    check('typing Rust with auto-indent and brace dedent works', pg.inner_text('#out').strip() == 'big', pg.input_value('.edwrap textarea'))
    pg.click('.logo'); pg.click('[data-go=map]'); pg.click('[data-ch=rs2]'); pg.click('[data-step=r2b]')
    pg.fill('.edwrap textarea', 'fn main() {\n    let mut lives = 3;\n}')
    pg.click('#menuBtn'); pg.click('[data-ui=sv]'); pg.click('#sClose')
    check('typed code survives a language switch', 'let mut lives' in pg.input_value('.edwrap textarea'))
    pg.click('.logo'); pg.click('#duelTile'); pg.click('#dGo'); pg.wait_for_timeout(300)
    pg.keyboard.press('a'); pg.keyboard.press('h'); pg.click('.logo'); pg.wait_for_timeout(4800)
    check('leaving a duel mid-question does not hijack the screen', not pg.query_selector('.duel'))

def experienced(browser):
    print('\n== Experienced coder tests out of everything ==')
    pg = open_page(browser, {'tut': {'hub': 1, 'code': 1}}); data = content(pg)
    pg.click('[data-start=python]'); pg.wait_for_selector('[data-exp=pro]'); pg.click('[data-exp=pro]')
    check('experienced player sees a skip-ahead test on the home screen', bool(pg.query_selector('#testBtn')))
    pg.click('#playBtn'); check('experienced player gets short lessons', bool(pg.query_selector('.lesson-body details.more'))); pg.click('.logo')
    for lang in ('python', 'rust'):
        if lang == 'rust': pg.click('.logo'); pg.click('[data-setpath=rust]')
        pg.click('#testBtn')
        for i, ch in enumerate(data[lang]):
            if i == 0 and lang == 'python':
                pg.fill('.edwrap textarea', 'print(1)'); pg.click('#runBtn'); pg.wait_for_timeout(100)
                check('skip-ahead tests hide hints', not pg.is_visible('#hintBtn'))
            pg.fill('.edwrap textarea', ch['test']); pg.click('#runBtn'); pg.wait_for_selector('#mMap', timeout=6000)
            pg.click('#mNextTest') if pg.query_selector('#mNextTest') else pg.click('#mMap')
    st = saved(pg)
    check('19 tests complete every chapter and unlock every card', len(st['tested']) == 19 and len(st['cards']) == 19, (len(st['tested']), len(st['cards'])))
    for lang in ('python', 'rust'):
        pg.click('.logo'); pg.click(f'[data-setpath={lang}]'); pg.click('[data-go=map]')
        for ch in data[lang]:
            pg.click(f"[data-ch={ch['id']}]"); pg.click(f"[data-step={ch['xid']}]"); pg.fill('.edwrap textarea', ch['xsol'])
            pg.click('#runBtn'); pg.wait_for_selector('#mMap', timeout=8000); pg.click('#mMap')
    check('all 19 expert challenges completed', len([k for k in saved(pg)['done'] if k.endswith('_x')]) == 19)

def player_feedback(browser):
    print('\n== Feedback a player sees ==')
    pg = open_page(browser, dict(SEED, coins=100)); pg.click('[data-start=python]'); pg.click('[data-go=map]')
    pg.click('[data-ch=py2]', force=True); pg.wait_for_timeout(150)
    check('clicking a locked chapter explains what to finish', 'Finish chapter 1' in pg.inner_text('#toasts'))
    pg.click('[data-step=p1a]'); pg.fill('.edwrap textarea', 'print("Hello World!")'); pg.click('.edwrap textarea')
    pg.keyboard.press('Control+Enter'); pg.keyboard.press('Control+Enter'); pg.wait_for_timeout(500)
    check('pressing Run twice keeps the first-time reward', '+20 XP' in pg.inner_text('.modal'), pg.inner_text('.modal')[:120])
    pg.click('#mMap'); pg.click('[data-step=p1a]'); pg.fill('.edwrap textarea', 'print("my own work")'); pg.click('#rstBtn')
    check('Reset code asks before wiping work', bool(pg.query_selector('#rcYes'))); pg.click('#rcNo')
    pg.click('.edwrap textarea'); pg.keyboard.press('Escape'); pg.keyboard.press('Tab')
    check('Escape then Tab leaves the code editor', pg.evaluate('document.activeElement.tagName') != 'TEXTAREA')
    pg.fill('.edwrap textarea', ''); pg.click('#vizBtn'); pg.wait_for_timeout(150)
    check('Watch it run on empty code explains instead of opening', not pg.query_selector('.vzwrap'))
    pg.fill('.edwrap textarea', 'print("hi"'); pg.click('#vizBtn'); pg.wait_for_timeout(150)
    check('Watch it run on a typo shows the mistake', 'mistake' in pg.inner_text('.modal h2')); pg.click('#vzOk')
    pg.click('.logo'); before = saved(pg)['coins']; pg.click('[data-go=shop]'); pg.click('[data-buy=ruby]'); pg.wait_for_timeout(150); st = saved(pg)
    check('the shop sells and dresses the hero', st['coins'] == before - 25 and st['owned'].get('ruby') and st['equip'].get('tunic') == 'ruby', st.get('equip'))
    pg.click('#menuBtn'); pg.click('#sSave'); code = pg.inner_text('#scode'); pg.click('#scClose')
    pg.click('#menuBtn'); pg.click('#sRst'); pg.click('#rYes'); pg.wait_for_timeout(200); pg.click('#tLoad'); pg.fill('#lcIn', code); pg.click('#lcGo'); pg.click('#lcYes'); pg.wait_for_timeout(200)
    check('shop items travel with the save code', saved(pg)['equip'].get('tunic') == 'ruby')

def save_codes_and_visualiser(browser):
    print('\n== Save codes and the visualiser ==')
    seed = dict(SEED, teacher=True, coins=77, level=2, xp=15, done={k: 1 for k in ['p1a', 'p1b', 'p1c', 'p1d', 'p1e', 'p1f', 'r1a']})
    pg = open_page(browser, seed); pg.click('[data-start=python]')
    pg.click('#menuBtn'); pg.click('#sSave'); code = pg.inner_text('#scode'); pg.click('#scClose')
    pg.click('#menuBtn'); pg.click('#sRst'); pg.wait_for_timeout(300)
    check('New player shows the save code before erasing', code in pg.inner_text('.modal'))
    pg.click('#rYes'); pg.wait_for_timeout(300); pg.click('#tLoad'); pg.fill('#lcIn', 'zzzz-1234'); pg.click('#lcGo')
    check('a wrong code gets a friendly message', 'typo' in pg.inner_text('#lcMsg'))
    pg.fill('#lcIn', code.lower().replace('-', ' ')); pg.click('#lcGo'); pg.click('#lcYes'); pg.wait_for_timeout(300)
    st = saved(pg)
    check('save code restores quests, level, XP, coins and cards', sorted(st['done']) == sorted(seed['done']) and st['level'] == 2 and st['xp'] == 15 and st['coins'] == 77 and 'py_birth' in st['cards'], st)
    pg.click('[data-go=sandbox]')
    pg.fill('.edwrap textarea', 'total = 0\nfor i in range(1, 4):\n    total += i\nprint(total)'); pg.click('#vizBtn'); pg.wait_for_selector('.vz')
    for _ in range(4): pg.click('#vzNext')
    check('visualiser shows variables changing', 'total' in pg.inner_text('#vzVars') and 'Step 5' in pg.inner_text('#vzCount'))
    pg.keyboard.press('Escape'); check('visualiser closes with Escape', not pg.query_selector('.vzwrap'))
    pg.click('[data-setpath=rust]')
    pg.fill('.edwrap textarea', 'fn main() {\n    let a = String::from("crab");\n    let b = a;\n    println!("{}", b);\n}'); pg.click('#vizBtn'); pg.wait_for_selector('.vz')
    pg.click('#vzLast'); check('visualiser shows Rust moves', 'moved away' in pg.inner_text('#vzVars'))

if __name__ == '__main__':
    started = time.time()
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for scenario in (player_feedback, save_codes_and_visualiser, kid_probes, experienced, new_player):
            try: scenario(browser)
            except Exception as e: check(scenario.__name__ + ' ran to the end', False, str(e)[:300])
        browser.close()
    check('no JavaScript errors', not errors, errors[:3])
    check('no network requests leave the page', not external, external[:3])
    print(f"\n{'❌' if failures else '✅'} {len(failures)} failure(s) in {time.time() - started:.0f}s")
    sys.exit(1 if failures else 0)
