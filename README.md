# 🎮 Code Quest — Pixel Academy (v0.5)

### *Hässelby Coding Coach*

A gamified Python and Rust tutor for learners of every age — complete beginners and people who already code — built as **one static HTML file** for Chromebooks in kiosk mode. No server, no install, no build step.

---

## What's new in v0.5

- **Python + Rust paths** (JavaScript retired), each with its own tutor: Pixel Sage 🧙 for Python, Rusty 🦀 for Rust.
- **Real interpreters, real error messages.** Both languages are parsed and run by small interpreters written for this project. Students see the same errors the real tools give — `NameError: name 'pritn' is not defined. Did you mean: 'print'?` or `error[E0382]: borrow of moved value` — plus a plain-language explanation in English or Swedish.
- **117 activities in 7 formats** (see Curriculum below), every one auto-verified.
- **Two-player Duel mode** on one keyboard.
- **Codex** of 19 true history cards, unlocked one per finished chapter.
- **Arcade** (Code Catcher; Syntax Sprint, which takes its lines from the lessons you've reached) and **Free play** sandbox.
- **Decluttered UI**: one main action per screen, larger readable text, settings tucked behind ⚙.

---

## Features

### 👣 Watch it run
Every coding screen and Free play has a **Watch it run** button. It replays the program one step at a time:
- the line about to run is highlighted
- every variable is shown with its value and type, and changes flash yellow
- the chain of function calls and the output so far are shown alongside

Players can step forwards and backwards, drag a slider, or press Play. In Rust, a value that has been moved shows as *moved away (line N)* — ownership made visible. A Rust program that doesn't compile shows the compiler error instead, because real Rust never runs such a program.

### 💾 Save codes
Progress is stored in the browser, and some Chromebooks wipe that at logout. Under ⚙ → Save code, players get a short code (18–49 characters, e.g. `3C10-A03V-1854-RBZZ-ZZY0-T32T`) that holds their quests, level, XP, coins, streak, settings and shop items.
- Typing the code on any computer restores everything. The title screen has a "Have a save code?" link.
- Codes avoid look-alike characters (no I, L, O or U) and ignore dashes, spaces and capital letters.
- A checksum catches typos, so a mistyped code is rejected instead of loading the wrong progress.
- No server or account is involved.

### Beginners and experienced coders
On first start, players choose **"I'm new to coding"** or **"I've coded before"**. They can change this any time in ⚙ Settings.
- **New coders** get the full step-by-step path.
- **Experienced coders** get short lessons: the example code stays visible and the full explanation folds behind "Show explanation".
- **Skip-ahead tests** (⚡, open to everyone): each chapter has one test. Pass it and every quest in the chapter counts as done, history card included, with 60% of the skipped XP. Most tests run the program against several inputs, like an online judge, so printing the expected answer doesn't pass. A failed input is shown in the terminal.
- **Expert challenges** (⭐, optional): one harder challenge per chapter, unlocked when the chapter is done. Examples: FizzBuzz without `if`, Fibonacci by recursion, run-length encoding, a borrow-checker puzzle.

### Seven ways to learn

| Type | What the student does |
|---|---|
| 📜 Lesson | Short explanation, then write code that meets a goal |
| ❓ Quiz | Multiple choice on a concept, with the "why" explained |
| 🔮 Crystal ball | Read code and predict its exact output |
| 🐛 Bug hunt | Fix a broken program using the error messages |
| 🧩 Code puzzle | Tap shuffled lines into the right order (one line is a trap) |
| 🔍 Mystery | Write code to sift clues, then accuse a suspect. Wrong accusations cost 5 coins and shrink the reward |
| 🐉 Boss fight | A bigger challenge combining the whole chapter |

### Help that teaches

- **Errors become lessons.** Every error type has a friendly bilingual explanation, shown in the terminal right under the error and by the tutor. The error line is highlighted in the editor.
- **"Expected output" panel.** When a program runs but the output is wrong, the terminal shows what the goal wanted.
- **Layered hints.** Each press of Hint reveals the next clue (up to four on the hardest quests). The last step shows a full solution, which lowers that quest's XP by 30%.
- **Program input box.** Lessons using `input()` or `read_line` get a box where students type answers (one per line), so input works without pop-ups.

### Editor
Syntax highlighting, line numbers, Tab / Shift+Tab indenting, auto-indent after `:` (Python) and `{` (Rust), Ctrl+Enter to run. Each quest's code is saved, so students can leave and come back. Keyboard users: Tab indents inside the editor; press Escape, then Tab, to move on.

### Duel mode (2 players, 1 Chromebook)
- **Buzzer rounds:** Player 1 answers with **A S D F**, Player 2 with **H J K L** (or tap the on-screen pads). The first correct answer scores 100 plus a speed bonus. A wrong guess costs 25 points and locks that player out of the question.
- **Code showdown** (optional finale): both players get the same coding challenge, taking turns while the other looks away. The fastest working program wins 300 points (100 for the slower one).
- Choose Python, Rust or both, and 5, 8 or 12 questions.
- **Question bank:** 112 questions (83 duel-only plus the lesson quizzes). Questions from chapters already reached on this Chromebook come first, and questions already seen this session go to the back of the queue.

### Rewards
XP and levels (10 titles in English and Swedish), coins, daily streak 🔥, a pixel avatar that changes at levels 4 and 7, confetti and sound effects. Coins buy tunic colours and hats for the avatar in the 🛒 Shop (click your coin count), and purchases travel with save codes. Sound effects start switched off (classroom-friendly) and can be turned on in ⚙.

### For teachers
- **Teacher mode** (⚙ → Teacher mode) unlocks every chapter, for demos or students who want to jump ahead.
- **New player** resets the Chromebook for the next student, and first shows that student's save code.
- **Save codes** (⚙ → Save code) let students continue on any computer.
- **Teacher PIN:** search `index.html` for `TEACHER_PIN` and set a PIN, for example `'4826'`, so students can't switch on Teacher mode. It's empty by default, which means anyone can use Teacher mode until you set one.
- Progress is stored in `localStorage` (key `cq5`) on each device.

---

## Curriculum

### 🐍 Python — 10 chapters, 58 activities
1. Hello, Python — `print`, quotes, multiple lines
2. Inventory — variables, naming rules, changing values
3. The number forge — `+ - * / // % **`, `round` · *Mystery: the vault code*
4. Word smithy — f-strings, string methods, slicing, `input()`, `int()`
5. Crossroads — `if / elif / else`, `and / or / not` · *Mystery: the missing crown*
6. The grind — `for`, `range`, `while`, `break` · *Boss: FizzBuzz dragon*
7. Party up — lists, `append`, `len`, `max/min/sum/sorted`, counting pattern
8. The spellbook — functions, `return`, default parameters
9. Treasure maps — dictionaries, `.items()`, `.get()` · *Mystery: the museum heist*
10. Dragon's peak — `random`, a guessing game, `try/except` · *Boss: Caesar cipher*

### 🦀 Rust — 9 chapters, 59 activities
1. Hello, Rustacean — `fn main`, `println!`, macros, semicolons
2. Let it be — `let`, `mut`, shadowing, `const`
3. The type forge — `i32` vs `f64`, `bool`, `char`, `u8`, overflow
4. Crossroads — `if` as an expression, `match`, ranges, `_`
5. Loop lagoon — `for`, `while`, `loop` with `break` value · *Boss: FizzBuzz kraken*
6. Function forge — parameter types, return values, the tail-expression semicolon trap
7. Ownership island — copy vs move, `String` vs `&str`, `clone`, `&`, `&mut`
8. The crate of collections — `Vec`, `{:?}`, iterators, `map/filter/collect`
9. The Option oracle — `Option`, `match`, structs, `impl`, reading input, `cmp` · *Mystery: the crab who stole the pearl* · *Boss: the guessing game from The Rust Book*

**Estimated time:** roughly 4–6 hours per language for a complete beginner, plus replay time in Duel and Arcade. Experienced coders can test out of familiar chapters in minutes and spend their time on the expert challenges.

### Roadmap to 20 hours per language
The engine supports more chapters without code changes. Planned next:

- **Python:** nested loops and patterns · string algorithms · list comprehensions (already supported by the interpreter) · 2D lists and grid games · classes and objects · recursion · a text-adventure capstone · simple algorithms (search, sort) · a "debug the program" exam chapter.
- **Rust:** enums with data · `Result` and the `?` operator · `HashMap` · traits (`Display`) · slices and borrowing rules in depth · modules and Cargo concepts · iterator adapters in depth · a text-adventure capstone.

Some of these need small interpreter additions (Python classes; Rust enums, traits, `?`, `HashMap`). Those are noted in the code where they would go.

---

## Adding content

All content is plain data in `index.html`, in sections marked **CONTENT · PYTHON PATH** and **CONTENT · RUST PATH**. A lesson looks like this:

```js
{id:'p3a', t:'code', xp:25, title:L('Damage calculator','Skadekalkylatorn'),
 body:L('<p>English lesson HTML…</p>','<p>Svensk lektion…</p>'),
 goal:L('Print the total damage.','Skriv ut den totala skadan.'),
 hint:L('print(3 * 15)','print(3 * 15)'),
 starter:'', sol:'print(3 * 15)',
 ck:all(eq('45'), uses(/\*/))}
```

- `L(en, sv)` holds both languages.
- `ck` is the checker. `eq('text')` means "output must be exactly this". `has('a','b')` means "output contains these". `uses(/regex/)` requires a construct in the code. `all(...)` combines checkers.
- `quiz` and `predict` use `opts` and `a` (the index of the right answer). `bug` uses a broken `starter`. `parsons` uses `lines` and `distract`. `mystery` uses `opts` and `answer`.
- In lesson HTML, write `<` as `&lt;` and `&` as `&amp;` (Rust types like `Vec&lt;i32&gt;`).
- Each chapter's `card` points to a history card in `LORE`.
- Extra hint steps go in the `HINTS` table. Extra duel questions go in `DUEL_Q`; tag each with its chapter index `ch`.
- **Save codes:** add every new activity id to the **end** of the matching list in `SAVE_IDS`. Never reorder or remove ids, or existing save codes will load the wrong progress. `node tests/run.js` checks this.
- **Shop items:** add new items to the end of `SHOP`. Save codes store the first 8 items by position, so never reorder them.

**Before publishing any change, run the tests** (see Testing below). They run every reference solution against its checker, confirm every bug-hunt starter and hardcoded answer really fails, check every predict answer against the interpreter's real output, and check that every activity is listed in `SAVE_IDS`.

---

## Deployment

### GitHub Pages
1. Push `index.html` and `README.md` to a repository.
2. Settings → Pages → source **main**, root folder.
3. The site is live at `https://<user>.github.io/<repo>/`.

### Chromebook kiosk
Set the kiosk app URL to the hosted page in Google Admin. Everything, including the font, is inside the one file, so after the first load it works without internet.

**Shared or wiped Chromebooks.** Progress is stored in each browser. If your Chromebooks clear data at logout, or students move between devices, have them use **save codes** (⚙ → Save code).

### Local / USB
Open `index.html` in any modern browser.

---

## Technical notes

| Area | Implementation |
|---|---|
| Python | Tokenizer with INDENT/DEDENT → parser → tree-walking interpreter. Integers are BigInt (so `2 ** 100` works); floats are JS numbers. Supports f-strings with format specs, comprehensions, dicts, `try/except`, `global`, lambdas, and the `random`, `math` and `time` modules. Easter eggs: `import this`, `import antigravity`, `from __future__ import braces`. |
| Rust | Lexer → parser → interpreter with simulated compiler checks: immutability (E0384/E0596/E0594), moves (E0382/E0507), type mismatches (E0308), mixed int/float (E0277), missing `Display`/`Debug`, non-exhaustive `match` (E0004), the tail-expression semicolon trap, and panics (bounds, overflow by declared type, `unwrap` on `None`). Compile errors suppress program output, as with real `rustc`. Includes `stdin().read_line`, `Ordering`, and a mini `rand`. |
| Safety | Step limit (infinite loops stop with a friendly message), recursion limit, output limit. |
| Storage | `localStorage` with in-memory fallback. |
| Save codes | Crockford base32. Holds a version number, settings, total XP, coins, streak, one bit per activity in `SAVE_IDS` order (trailing unfinished ones trimmed), and a 10-bit checksum. `SAVE_IDS` is append-only. |
| Visualiser | The interpreters record a snapshot before each statement (line, variables, call stack, output length), capped at 600 steps. |
| Fonts & privacy | Headings use Quest Pixel, an original 116-glyph pixel font (3 KB) embedded in the file. Text and code use the device's system fonts. The page makes no network requests and sends no data anywhere. |
| Sound | Web Audio oscillators. No audio files. |

**Known limits.**
- Python: no classes yet, and no `turtle`/`tkinter`.
- Rust: no enums, traits, lifetimes or `?` yet.
- The Rust checks run as the program executes. A mistake on a line that never runs isn't reported, whereas real `rustc` checks every line before running. Type inference is simpler than `rustc`'s, so a few rare valid programs may need an extra type annotation.

**Browser support.** Chrome/Edge 111+, Firefox 113+, Safari 16.4+ (needed for CSS `color-mix`). Any auto-updating Chromebook qualifies.

---

## Testing

Four layers, each checking something different. All run on every push (GitHub Actions); mutation testing runs on demand.

**1. Unit suite**: `node tests/run.js` (Node only, no installs, about 2 seconds, 567 checks). Covers both interpreters, all 117 activities, the duel bank, skip-ahead tests, save codes, the visualiser and the error explanations.
- `tests/cases_python.js`: 132 Python programs whose expected output was produced by **real CPython 3.12**, not written by hand, so the interpreter can't simply agree with itself. Regenerate with `python tests/gen_python_cases.py`.
- `tests/cases_rust.js`: about 140 Rust programs, hand-checked against real Rust behaviour.

**2. Oracle modes**: the same suite, with the real language as the judge.
- `CQ_ORACLE=cpython node tests/run.js` runs every Python program (test cases, model answers, buggy starters, predict answers, skip-ahead judge cases) in CPython.
- `CQ_ORACLE=rustc node tests/run.js` compiles every Rust program with real `rustc`. Needs Rust installed (GitHub's runners have it). Programs using `rand`, and programs that read input, are skipped and counted. Error codes must match; differences in wording or line are listed for review. This CI job is report-only until its first results are reviewed.

**3. Mutation testing** (checks the tests themselves): `node tests/mutation.js --sample 400 --seed 7`. It plants one small bug at a time in the interpreters and helpers (flips `<` to `<=`, `&&` to `||`, `+` to `-`, deletes a `!`, changes a number) and checks the unit suite fails. Strings, regular expressions and comments are never mutated. Every planted bug the suite misses is a gap. Options: `--range a:b --append --out FILE` (resumable batches), `--report FILE`, `--recheck FILE` (re-test earlier survivors after code changes).

| Round | Mutants | Caught |
|---|---|---|
| Original suite | 397 random | 53.7% |
| + CPython cases, Rust cases, explanation tests | 397 random (new sample) | 66.8% |
| + second round of targeted tests | 399 random (new sample) | 68.9% |
| + third round | same 399 as the row above | **76.4%** |

Of the remaining survivors, about 20 cannot change behaviour (for example a shop-mask limit of 8 when only 7 items exist) and most others affect message wording or visualiser internals.

Real bugs found by this work, all fixed: negative whole floats lost their minus sign (`-4 / 2` printed `2.0`); `round(2.675, 2)` gave 2.68; very large or small floats printed differently from Python; tuples lacked `.index()`/`.count()`; calling a non-existent Rust method crashed the interpreter; overflow that rustc rejects at compile time was reported as a runtime panic (lesson r3f rewritten so the overflow really happens at runtime); assigning into an immutable `Vec`, `*x = 3` on a non-reference and `break` outside a loop gave the wrong error or line; the "text needs quotes" advice misfired on unclosed brackets and curly quotes.

**4. Browser playthrough**: `python tests/e2e_playthrough.py` (Playwright, Chromium), which plays the game as new and experienced players.

### Known gaps versus real Rust
- Whole numbers beyond about ±9 quadrillion (2^53) lose precision, so `i64::MAX` and `u64::MAX` print rounded.
- Mixing integer types (`i32 + i64`) runs instead of being a type error.
- Compile-time overflow detection covers constants and immutable variables; rustc also catches some straight-line `mut` cases.
- `{:?}` on very large or small floats uses plain digits; rustc switches to exponent form (`1e16`).
- Checks happen while the program runs, so a later compile error can appear after earlier output, and some messages are worded differently from rustc.

## Project structure

```
code-quest/
├── index.html                   ← the whole app (one file, works offline)
├── README.md
├── tests/
│   ├── run.js                   ← interpreter and content tests (Node, no dependencies)
│   └── e2e_playthrough.py       ← browser playthrough (Playwright)
├── tools/
│   └── pixelfont.py             ← source of the Quest Pixel font: edit glyphs, then rebuild
└── .github/workflows/tests.yml  ← runs both suites on every push
```

## License

MIT License — see LICENSE.

Built for **Hässelby Coding Coach** 🇸🇪
