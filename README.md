# 🎮 CODE QUEST  Pixel Academy

### *Hässelby Coding Coach*

An interactive, gamified Python & JavaScript coding tutor built as a single static HTML file. Designed for middle school students (ages 11-13) on Chromebooks in kiosk mode.

---

##  Features

###  RPG Quest System
- **11 Python lessons + 9 JavaScript lessons** with sequential unlock progression
- Story-driven quests with RPG flavor text and character lore
- Boss fights (FizzBuzz Dragon) as capstone challenges
- XP, coins, streak tracking, and level progression (1-10)

###  Standalone Puzzles
- 5 coding puzzles (Pyramid Builder, String Reverser, Loot Counter, Champion Finder, Pattern Printer)
- Open-order - no unlock gating, solve in any sequence
- Separate from the main quest path

###  Live Code Editor
- In-browser Python transpiler (converts Python to JS for execution)
- JavaScript runs natively
- Tab key support, line numbers, scroll sync
- Ctrl+Enter to run, Ctrl+Shift+Enter to submit
- Infinite loop protection (10,000 iteration guard)
- Friendly error messages

###  Python Transpiler Supports
- Variables, math, string operations
- `if` / `elif` / `else` (proper block tracking)
- `for` loops with `range()`, `for...in` lists
- `while` loops
- Functions with `def`, `return`
- Lists with `.append()`
- `len()`, `str()`, `int()`
- String slicing (`[::-1]`)
- f-strings (`f"Hello {name}"`)
- Boolean operators (`and`, `or`, `not`)
- `pass` statement
- Friendly `input()` error message

### 🇸🇪 Bilingual (English / Swedish)
- Full i18n - every UI string, lesson, quest description, tutor message, and error message
- Toggle between EN and SV on the title screen or in the HUD
- Swedish level titles (Nybörjarkodare → Kodkrigare → Kodlegend)

###  Pixel Sage Tutor
- Contextual help for every quest and puzzle
- Animated reactions: bounces on success 🎉, shakes on error 😰
- Tier-appropriate emoji (🧙 → ⚔️ → 👑)

###  Character Progression (3 Tiers)
- **Level 1-2: Apprentice** - basic tunic, brown boots
- **Level 3-4: Knight** - silver armor, cape
- **Level 5+: Archmage** - purple glowing robes, gold staff
- Pixel art avatar updates live in HUD and tutor panel
- Separate sprites for Python and JavaScript paths

###  Mini-Game: Code Catcher
- 30-second timed game - catch falling code snippets, avoid bugs
- Appears every 3 completed quests as a reward break
- Educational post-game breakdown: each caught item gets a one-line explanation
- Bonus XP (score ÷ 3) and coins awarded
- Skip button available anytime
- 22 items with bilingual descriptions

###  Sound Effects
- Web Audio API oscillator beeps (zero external files)
- Click, success (ascending C-E-G), error (low buzz), level-up fanfare
- Mini-game catch/miss sounds

###  Visual Rewards
- Physics-based confetti cannon (80 particles) on quest complete
- Screen shake on errors
- Particle burst effects
- Animated tutor character reactions

###  Interactive Tutorial
- 7-step map screen walkthrough
- 8-step lesson screen walkthrough
- Spotlight highlighting of each UI element
- Auto-shows on first visit, re-accessible via ❓ button
- Fully bilingual

###  Reset Button
- Always visible in HUD for kiosk mode
- Confirmation modal with bilingual warning
- Wipes all progress, XP, completed quests
- Perfect for shared Chromebook environments

---

##  Deployment

### GitHub Pages (recommended)

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to **main** branch, root folder
4. Your site will be live at `https://yourusername.github.io/code-quest/`

### Chromebook Kiosk Mode

1. Host the `index.html` file on any web server (GitHub Pages, school server, etc.)
2. In Chrome Enterprise admin: set the kiosk app URL to your hosted page
3. The app works fully offline after first load (fonts may fall back to Courier New)

### Local / USB

Just open `index.html` in any modern browser. No server needed.

---

##  Project Structure

```
code-quest/
├── index.html      ← The entire app (single file, ~113KB)
├── README.md        ← This file
├── LICENSE          ← MIT License
└── .gitignore       ← Git ignore rules
```

**Zero dependencies.** No npm, no build step, no frameworks. One HTML file with embedded CSS and JavaScript.

---

## Technical Details

| Feature | Implementation |
|---|---|
| Python execution | Custom transpiler converts Python subset → JavaScript, runs in `new Function()` |
| Loop protection | Counter injected into every `for`/`while` loop, throws at 10,000 iterations |
| Sound | Web Audio API oscillators (square, sawtooth, sine waves) |
| Pixel art | Canvas 2D with 16×16 sprite grids, `image-rendering: pixelated` |
| Confetti | Canvas 2D with 80 particles, gravity simulation, rotation |
| State persistence | localStorage with in-memory fallback for sandboxed environments |
| Fonts | Google Fonts (Silkscreen, JetBrains Mono, Nunito) with Courier New fallback |
| Compatibility | No optional chaining - works on Chrome 75+ |

### Browser Support

- ✅ Chrome / Chromium 75+
- ✅ Firefox 68+
- ✅ Safari 13+
- ✅ Edge 79+

---

## 📋 Curriculum

### Python Path
| # | Quest | Concept | XP |
|---|---|---|---|
| 1 | The First Spell: Hello World | `print()` | 20 |
| 2 | Inventory Slots: Variables | Variables, assignment | 25 |
| 3 | Damage Calculator: Math | Arithmetic operators | 25 |
| 4 | The Fork: If Statements | `if` / `else` | 35 |
| 5 | Multi-Path: Elif | `elif` chains | 35 |
| 6 | XP Grind: For Loops | `for` / `range()` | 40 |
| 7 | Boss Loop: While | `while` loops | 40 |
| 8 | Hero Party: Lists | Lists, `.append()` | 40 |
| 9 | Special Abilities: Functions | `def`, parameters | 50 |
| 10 | Loot Returns: Return Values | `return` | 50 |
| 🐉 | BOSS: FizzBuzz Dragon | Combined concepts | 80 |

### JavaScript Path
Mirrors the Python path with JS syntax (`console.log`, `let`, `{}` blocks, `function`, `.push()`).

### Puzzles
| Puzzle | Difficulty | Concepts |
|---|---|---|
| Pyramid Builder | ★☆☆ | Loops, string multiplication |
| String Reverser | ★★☆ | Functions, string manipulation |
| Loot Counter | ★☆☆ | Loops, accumulator pattern |
| Champion Finder | ★★☆ | Loops, comparison, no built-ins |
| Pattern Printer | ★★★ | Loops, string concatenation |

---

## Contributing

Contributions welcome! Some ideas:

- **More lessons** - Add chapters on dictionaries, string methods, nested loops
- **More puzzles** - Sorting algorithms, pattern matching, simple games
- **More mini-games** - Typing speed test, code debugging challenge
- **Accessibility** - Screen reader support, high contrast mode
- **More languages** - Add Finnish, Arabic, or other locale support

---

## License

MIT License - see [LICENSE](LICENSE) file.

Built for **Hässelby Coding Coach** 🇸🇪
