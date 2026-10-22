#!/usr/bin/env python3
"""Generates tests/cases_python.js: small programs whose expected output comes from REAL CPython,
so the Python interpreter's tests can't just agree with themselves.  Run with Python 3.12+:
    python tests/gen_python_cases.py"""
import json, subprocess, sys, pathlib
RUNNER = r'''
import sys, json, io, builtins, traceback
d = json.loads(sys.stdin.read()); inputs = list(d["inputs"]); buf = io.StringIO(); real = sys.stdout; sys.stdout = buf
def _input(prompt=""):
    if not inputs: raise EOFError("EOF when reading a line")
    v = inputs.pop(0); print(str(prompt) + v); return v
builtins.input = _input
res = {"ok": True}
try: exec(compile(d["src"], "quest.py", "exec"), {"__name__": "__main__"})
except BaseException as e:
    line = None
    for fr in traceback.extract_tb(e.__traceback__):
        if fr.filename == "quest.py": line = fr.lineno
    if isinstance(e, SyntaxError) and e.filename == "quest.py": line = e.lineno
    res = {"ok": False, "type": type(e).__name__, "line": line}
sys.stdout = real; res["out"] = buf.getvalue(); print(json.dumps(res))
'''
CASES = [
 # strings
 ('print("hello".find("l"), "hello".find("z"), "hello".index("e"), "banana".count("an"), "hello".count(""))',[]),
 ('print("Hello".startswith("He"), "Hello".endswith(("x", "lo")), "abc".startswith(("x", "y")))',[]),
 ('print("xxhixx".strip("x"), "xxhixx".lstrip("x"), "xxhixx".rstrip("x"), "  hi  ".rstrip() + "|", "  hi".lstrip() + "|")',[]),
 ('print("hi".center(6, "*"), "hi".center(7, "*"), "hi".ljust(5, ".") + "|", "hi".rjust(5, "."), "-42".zfill(6), "7".zfill(3))',[]),
 ('print("Hello World".swapcase(), "hello world".title(), "hELLO".capitalize(), "x1y".title())',[]),
 ('print("abc".isalpha(), "abc1".isalnum(), "123".isdigit(), "  ".isspace(), "ABC".isupper(), "abc".islower(), "".isdigit(), "aB".isupper())',[]),
 ('print("a-b-c".replace("-", "+"), "aaa".replace("a", "b", 2), "x".replace("y", "z"))',[]),
 ('print("{0} {1} {0}".format("a", "b"), "{name}!".format(name="Bo"), "{:>4}|{:<4}|{:^5}|".format(1, 2, 3))',[]),
 ('print(f"{3.14159:.3f}|{7:+d}|{0.25:.0%}|{1234.5:,.1f}|{255:x}|{5:b}|{-3:+d}")',[]),
 ('name = "Ada"\nprint(f"{name!r} {name:>6} {name:*^9} {len(name):03d}")',[]),
 ('print("abc"[1], "abc"[-1], "abcdef"[::2], "abcdef"[4:1:-1], "abc"[5:] + "|", "abc"[:-5] + "|", "abcdef"[-3:])',[]),
 ('print(len("åäö"), "ÅÄÖ".lower(), ord("A"), chr(97), "abc" < "abd", "Z" < "a", "b" > "abc")',[]),
 ('print("ha" * 0 + "|", 3 * "ab", "x" in "xyz", "q" not in "xyz", "" in "abc")',[]),
 ('s = "abc"\ntry:\n    s.index("z")\nexcept ValueError as e:\n    print("ValueError:", e)',[]),
 ('print("a,b,,c".split(","), "  x  y ".split(), "one".split(","), "a b".split(" "))',[]),
 ('print("-".join(["a", "b", "c"]), "".join(reversed("abc")), ", ".join([]) + "|")',[]),
 ('print(repr("a\\nb"), "tab\\there", "back\\\\slash", \'q"q\', "q\'q", repr(\'q"q\'))',[]),
 ('print("""multi\nline""", \'\'\'x\'\'\')',[]),
 # numbers
 ('print(7 // -2, -7 % 3, 7 % -3, -7 // 2, 2 ** -1, 10 % 3.5, -3.5 // 2, 7.5 // 2)',[]),
 ('print(round(2.675, 2), round(-2.5), round(0.5), round(1.5), round(7, 1), round(3.14159), round(2.5) + round(3.5))',[]),
 ('print(abs(-3.5), abs(-7), int(3.9), int(-3.9), int("  42 "), float("2.5"), int("101", 2), int("ff", 16))',[]),
 ('print(divmod(17, 5), divmod(-17, 5), pow(2, 5), bin(10), hex(255), bin(-5), hex(0))',[]),
 ('print(1/4, 2.0, 1e16, 1e-5, 123456789.0 * 10, -0.0, 3.0 * 2, 0.1 * 3, 1e22, 1.5e-7, 12345678901234567.0)',[]),
 ('print(0.1 + 0.2 == 0.3, round(0.1 + 0.2, 2) == 0.3, 1 == 1.0, True == 1, None == 0, 2 ** 0.5)',[]),
 ('print(10 / 4, 9 / 3, 10 ** 20, 10.0 ** 20, 2 ** 64, -2 ** 2, (-2) ** 2)',[]),
 ('print(int(2.5e3), float(10), 5 // 2 * 2 + 5 % 2, 7 / 7, -7 / 2)',[]),
 ('import math\nprint(math.floor(-2.5), math.ceil(-2.5), math.sqrt(2), math.factorial(5), math.gcd(12, 18), math.pi, math.floor(3.0))',[]),
 ('print(max("apple", "pear", key=len), min([3, 1, 2]), max(1, 2, 3), min("b", "a"), max([], default=0), sum([0.5, 0.25]), sum([1, 2], 10))',[]),
 ('print(sorted([3, 1, 2], reverse=True), sorted("cab"), sorted([(2, "b"), (1, "z"), (2, "a")]), sorted([-3, 2, -1], key=abs))',[]),
 ('x = 10\nx -= 3\nx *= 2\nx //= 3\nx %= 3\nx **= 3\nprint(x)\ny = 7\ny /= 2\nprint(y)',[]),
 ('a = b = 5\na += 1\ns = "x"\ns += "y"\ns *= 2\nL = [1]\nL += [2]\nL *= 2\nprint(a, b, s, L)',[]),
 # truth & comparisons
 ('print(1 < 2 < 3, 3 > 2 > 2, 1 < 3 > 2, not [], not [0], bool(""), bool("0"), [] == [], (1, 2) < (1, 3), [1, 2] < [1, 2, 0])',[]),
 ('x = None\nprint(x is None, x is not None, 0 or "zero", "" or [] or "last", 5 and 0, 3 and 4, not None)',[]),
 ('print(5 in range(10), 10 in range(10), 4 in range(0, 10, 2), 5 in range(0, 10, 2), 3 in range(10, 0, -1), {"a": 1} == {"a": 1}, {"a": 1} == {"a": 2})',[]),
 ('print(len(range(0, 10, 3)), list(range(5, 0, -2)), list(range(3, 3)), range(10)[-1], list(range(-3, 1)))',[]),
 ('print(1 != 1.0, "a" != "b", [1] != [1], (1,) == (1,), 2 >= 2, 3 <= 2)',[]),
 # lists, dicts, tuples
 ('a = [1, 2, 3, 4]\nprint(a.pop(), a.pop(0), a)\na.insert(-1, 9)\na.insert(100, 7)\nprint(a)\na.remove(9)\nprint(a, a.index(7), a.count(2))',[]),
 ('a = [3, 1, 2]\nb = a.copy()\nb.sort()\na.reverse()\nprint(a, b)\na.extend((5, 6))\nc = a[:]\na.clear()\nprint(a, len(b), c)',[]),
 ('a = [1, 2, 3, 4, 5]\nprint(a[1:4], a[::-1], a[-2:], a[:2], a[::2], a[3:0:-1], a[10:], a[-10:2], a[::-2])',[]),
 ('a = [1, 2, 3]\ndel a[0]\nprint(a)\nd = {"x": 1, "y": 2}\ndel d["x"]\nprint(d)\na[0] = 9\nprint(a)',[]),
 ('d = {"a": 1}\nd.update({"b": 2})\nprint(d.setdefault("a", 9), d.setdefault("c", 3), d.pop("b"), d.pop("zz", "none"), d)',[]),
 ('d = {"a": 1, "b": 2}\nprint(list(d.keys()), list(d.values()), "a" in d, 2 in d, len(d), d.get("q"), d.get("a", 5), list(d.items()))',[]),
 ('t = (1, 2, 3)\na, b, c = t\nprint(t, t[1], len(t), (5,), (), a + b + c, t + (4,), t * 2, t[::-1])',[]),
 ('d = {}\nd[(1, 2)] = "pair"\nd[3] = "three"\nprint(d[(1, 2)], d[3], d)',[]),
 ('print([x * y for x in range(1, 3) for y in range(1, 4) if x != y], [c.upper() for c in "abc"], list(map(lambda n: n * 2, [1, 2])), list(filter(None, [0, 1, "", "x"])))',[]),
 ('print(list(zip([1, 2, 3], "ab")), list(enumerate("xy", start=5)), any([0, 0, 1]), all([]), all([1, 0]), any([]))',[]),
 ('print(isinstance(3, int), isinstance(True, int), isinstance("s", (int, str)), type([]) == list, isinstance(2.0, int), type(3.0) == float)',[]),
 ('nums = [5, 3, 9]\nnums.sort(key=lambda n: -n)\nprint(nums, sorted(["bb", "a", "ccc"], key=len, reverse=True), list(reversed([1, 2, 3])))',[]),
 ('grid = [[0] * 3 for _ in range(2)]\ngrid[0][1] = 5\nprint(grid, len(grid[1]), [row[1] for row in grid])',[]),
 ('print(None, True, [None, True, "s", 1.0], {"k": [1, (2,)]}, (1,), (), [[]], {})',[]),
 # control flow & functions
 ('for i in range(3):\n    pass\nelse:\n    print("loop done", i)\nwhile False:\n    pass\nelse:\n    print("while done")',[]),
 ('for i in range(5):\n    if i == 2:\n        break\nelse:\n    print("no break")\nprint(i)',[]),
 ('def f(a, b=2, *rest):\n    return a + b + len(rest)\nprint(f(1), f(1, 5), f(1, 2, 3, 4), f(b=10, a=1))',[]),
 ('def outer():\n    x = 1\n    def inner():\n        return x + 1\n    return inner()\nprint(outer())',[]),
 ('def fact(n):\n    return 1 if n <= 1 else n * fact(n - 1)\nprint(fact(10), (lambda x, y=3: x * y)(4))',[]),
 ('total = 0\ndef add(n):\n    global total\n    total += n\nadd(5)\nadd(7)\nprint(total)',[]),
 ('def g():\n    return 1, 2\na, b = g()\nprint(a, b, g())',[]),
 ('i = 0\nwhile True:\n    i += 1\n    if i % 2 == 0:\n        continue\n    if i > 7:\n        break\n    print(i, end=" ")\nprint()',[]),
 ('try:\n    x = [1][5]\nexcept (KeyError, IndexError) as e:\n    print("caught", e)\nelse:\n    print("no")\nfinally:\n    print("finally")',[]),
 ('try:\n    print("a")\nexcept ValueError:\n    print("b")\nelse:\n    print("c")\nfinally:\n    print("d")',[]),
 ('try:\n    raise ValueError("boom")\nexcept Exception as e:\n    print("got", e)\ntry:\n    1 / 0\nexcept ArithmeticError:\n    print("math!")',[]),
 ('def check(n):\n    assert n > 0, "must be positive"\n    return n\nprint(check(3))\ncheck(-1)',[]),
 ('x = (1 +\n     2)\ny = 3 \\\n    + 4\nprint(x, y)  # comment\n# whole-line comment\nprint("#not a comment")',[]),
 ('print()\nprint("a", end="")\nprint("b")\nprint(1, 2, 3, sep=", ")\nprint("x", "y", sep="")',[]),
 ('n = 5\nprint(f"{n} squared is {n ** 2}", f"{{literal}}", f"{n:03}", f"{\'x\' * 3}", f"{n=}", f"{n * 2 = }")',[]),
 ('items = ["a", "b"]\nprint(f"{len(items)} items: {items}", f"{items[0]!r}", f"{3.0}", f"{1/3:.2f}")',[]),
 ('import random\nrandom.seed(1)\nn = random.randint(1, 3)\nc = random.choice("abc")\nL = [1, 2, 3]\nrandom.shuffle(L)\nprint(1 <= n <= 3, c in "abc", sorted(L), 0 <= random.random() < 1, len(random.sample(range(10), 4)))',[]),
 ('a = int(input("a? "))\nb = int(input("b? "))\nprint(a * b)',['3','4']),
 ('word = input()\nprint(word[::-1].upper())',['stressed']),
 ('print(type(3) == int, str(3.0), str([1]), int(True), float(False), bool([0]), str(None), str(-0.5))',[]),
 # errors: type and line must match CPython
 ('x = {"a": 1}\nprint(x["b"])',[]), ('print(int("4.5"))',[]), ('print(float("abc"))',[]), ('print([1, 2] + 3)',[]),
 ('print(len(5))',[]), ('x = 5\nx()',[]), ('print("abc".foo())',[]), ('import nothing_here',[]),
 ('def f(x):\n    return f(x + 1)\nf(0)',[]), ('print(undefined_name)',[]), ('a, b = [1, 2, 3]',[]), ('a, b, c = [1, 2]',[]),
 ('print(1 +)',[]), ('for i in range(3)\n    print(i)',[]), ('print([].pop())',[]), ('[1, 2].remove(5)',[]),
 ('print(10 % 0)',[]), ('x = 5\nprint(x.upper())',[]), ('def f(a):\n    pass\nf(1, 2)',[]), ('def f(a):\n    pass\nf(b=1)',[]),
 ('"abc" + 5',[]), ('print(sum(["a", "b"]))',[]), ('print(", ".join([1, 2]))',[]), ('print(max([]))',[]), ('print(range(3)[5])',[]),
 ('x = input()',[]), ('t = (1, 2)\nt[0] = 5',[]), ('print("a" < 1)',[]), ('x = 1\nif x > 0:\nprint(x)',[]), ('print(-"a")',[]),
 ('print(int("abc"))',[]), ('d = {}\nd[[1]] = 2',[]), ('print(2 ** 10000 > 0, len(str(2 ** 100)))',[]),
 # added after mutation testing
 ('a = [1, 2]\na.insert(0, "x")\nb = [5, 6]\nb.remove(5)\nprint(a, b, [7, 8].index(7), [7, 8].index(8))',[]),
 ('print(int(), dict([("a", 1), ("b", 2)]), dict(x=1), round(2.7), round(-2.7), round(2.2))',[]),
 ('print(5.5 - 2.25, 1.5 * 2, 7.0 / 2, 3.0 / 1.0, 0.0001, 0.00012, 1e15, -1e-5)',[]),
 ('print(1 / 0.0)',[]),
 ('try:\n    {}["k"]\nexcept LookupError:\n    print("lookup")\ntry:\n    [][1]\nexcept LookupError:\n    print("lookup2")',[]),
 ('from math import nothing',[]), ('print(len([1], [2]))',[]),
 ('print(1); print(2)\nx = 3; y = 4; print(x + y)',[]),
 ('print(sorted([5, 2, 9, 1, 7, 3, 8, 6, 4, 0]), sorted([5, 2, 9, 1, 7, 3, 8, 6, 4, 0], reverse=True))',[]),
 ('print(list(range(5, 3)), list(range(0)), len(range(5, 3)), list(range(3, 0, -1)))',[]),
 ('break',[]), ('def f():\n    continue\nf()',[]), ('x = """abc',[]), ('import random\nrandom.randrange(0)',[]),
 ('print(f"{5:.2f}|{7:d}|{2.5:.1f}|{3:5d}|{-2.5:8.2f}|{1e6:,.0f}|{0.5:.1%}")',[]),
 ('print(isinstance(1.5, float), isinstance(None, int), str(1e16), str(2.5e-6))',[]),
 ('print(-4 / 2, -1.0, 0.1 - 0.3, -(2.0), abs(-0.0))',[]),
 # round 2 after mutation testing
 ('x = 1 + \\\n2\nprint(x)',[]),
 ('print(bool(()), bool((0,)), bool({}), bool({"a": 1}), bool(range(0)), bool(0.0))',[]),
 ('print({"a": 1} == {"b": 1}, None == None, [None] == [None], {"a": [1]} == {"a": [1]})',[]),
 ('print(7.0 // 1.0, 7.5 // 0.5, -7.5 // 2)',[]),
 ('print(f"{-5:04d}|{5:+04d}|{-3.5:07.2f}")',[]),
 ('print("abcdef"[10::-1], "abcdef"[:-10:-1], [1, 2, 3][5:0:-1], "abc"[-10:])',[]),
 ('print(2.5 in range(5), 5 in range(10, 0, -1), 10 in range(10, 0, -1), 0 in range(10, 0, -1), -1 in range(0, -5, -1))',[]),
 ('print("{0} {1}".format("a"))',[]),
 ('print((7, 8).index(7), (7, 8, 7).count(7))',[]),
 ('print(bin(0), hex(-1), bin(1))',[]),
 ('import random\nprint(random.randint(5, 5), random.randrange(3, 4), random.choice([9]))',[]),
 ('import math\nprint(round(math.tau, 4), math.e > 2.7)',[]),
]
def main():
    out = []
    for src, inputs in CASES:
        p = subprocess.run([sys.executable, '-c', RUNNER], input=json.dumps({'src': src, 'inputs': inputs}), capture_output=True, text=True, timeout=20)
        r = json.loads(p.stdout.strip().splitlines()[-1])
        out.append({'src': src, 'inputs': inputs, 'out': r['out'], 'err': None if r['ok'] else {'type': r['type'], 'line': r['line']}})
    dest = pathlib.Path(__file__).with_name('cases_python.js')
    dest.write_text('/* GENERATED by tests/gen_python_cases.py from real CPython %s. Do not edit by hand. */\nmodule.exports=%s;\n' % (sys.version.split()[0], json.dumps(out, ensure_ascii=False, indent=0)))
    print(f'wrote {len(out)} CPython-verified cases to {dest.name}')
if __name__ == '__main__': main()
