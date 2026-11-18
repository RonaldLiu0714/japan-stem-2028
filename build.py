"""Build the offline guide and queryable SQLite snapshot from reviewed JSON."""
import hashlib
import json
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"


def read(name):
    return json.loads((DATA / name).read_text())


def key(*parts):
    return hashlib.sha256(json.dumps(parts, ensure_ascii=False).encode()).hexdigest()[:16]


routes = read("admissions.json")
syllabus = read("eju.json")
calendar = read("calendar.json")
for route in routes:
    route["id"] = key(route["school"], route["unit"], route["route"], route["year"])
for item in syllabus:
    item.setdefault("id", key(item["subject"], item["ja"], item["page"]))
snapshot = DATA / "admissions.sqlite.tmp"
snapshot.unlink(missing_ok=True)
with sqlite3.connect(snapshot) as db:
    db.executescript("""
        PRAGMA foreign_keys=ON;
        CREATE TABLE routes(id TEXT PRIMARY KEY, school TEXT, unit TEXT, route TEXT, year INTEGER,
          status TEXT, field TEXT, eligibility TEXT, eju TEXT, english TEXT, selection TEXT,
          quota TEXT, deadline TEXT, match TEXT);
        CREATE TABLE sources(route_id TEXT REFERENCES routes, title TEXT, url TEXT, section TEXT, checked TEXT);
        CREATE TABLE events(route_id TEXT REFERENCES routes, date TEXT, type TEXT, note TEXT);
        CREATE TABLE syllabus(id TEXT PRIMARY KEY, subject TEXT, ja TEXT, zh TEXT, page TEXT, version TEXT,
          change TEXT, url TEXT, sample TEXT, note TEXT, revisionSource TEXT, checked TEXT);
        CREATE TABLE shared_calendar(date TEXT, type TEXT, note TEXT, url TEXT, school TEXT);
    """)
    def insert(table, row):
        columns = [col[1] for col in db.execute(f"PRAGMA table_info({table})")]
        values = [row.get(c) for c in columns]
        db.execute(f"INSERT INTO {table} VALUES ({','.join('?' for c in columns)})",
                   [json.dumps(v, ensure_ascii=False) if isinstance(v,(list,dict)) else v for v in values])
    for r in routes:
        insert("routes",r)
        for s in r["sources"]:
            insert("sources",dict(s,route_id=r["id"]))
        for e in r.get("events",[]):
            insert("events",dict(e,route_id=r["id"]))
    for item in syllabus:
        insert("syllabus",item)
    for event in calendar:
        insert("shared_calendar",event)
    assert db.execute("PRAGMA integrity_check").fetchone() == ("ok",)
db.close()
snapshot.replace(DATA / "admissions.sqlite")
payload = json.dumps(dict(routes=routes,syllabus=syllabus,calendar=calendar),ensure_ascii=False).replace("<","\\u003c")
src = ROOT / "src"
html = (src/"index.html").read_text().replace("/*STYLE*/",(src/"guide.css").read_text()).replace("/*SCRIPT*/",(src/"guide.js").read_text()).replace("<!--DATA-->",payload)
(ROOT/"dist").mkdir(exist_ok=True)
(ROOT/"dist/index.html").write_text(html)
print(len(routes),"routes,",len(syllabus),"syllabus items,",len(html.encode()),"HTML bytes")
