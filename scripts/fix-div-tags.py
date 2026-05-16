import pathlib

root = pathlib.Path(__file__).resolve().parent.parent / "popup" / "src"
for p in root.rglob("*.jsx"):
    t = p.read_text(encoding="utf-8")
    t2 = t.replace("</motion>", "</div>").replace("<motion ", "<div ")
    if t2 != t:
        p.write_text(t2, encoding="utf-8")
        print("fixed", p.name)
