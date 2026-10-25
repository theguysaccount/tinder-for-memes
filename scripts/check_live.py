"""Weekly health check of the live site: python3 scripts/check_live.py https://theguysaccount.github.io/tinder-for-memes

Every sitemap page and /compare/ answers 200 with its own canonical; every meme image loads; the live
deck 1 equals data/deck.json (old compare links index into it). Exits 1 on any failure.
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UA = "MemeTasteTestHealthCheck/1.0 (+https://github.com/theguysaccount/tinder-for-memes)"


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30) as r:
        return r.status, r.read()


def main(base):
    base = base.rstrip("/")
    problems = []
    urls = re.findall(r"<loc>([^<]+)</loc>", get(f"{base}/sitemap.xml")[1].decode())
    for u in urls + [f"{base}/compare/"]:
        try:
            status, body = get(u)
            canon = re.search(r'<link rel="canonical" href="([^"]+)"', body.decode())
            if status != 200 or not canon or canon.group(1) != u:
                problems.append(f"{u}: status {status}")
        except Exception as e:
            problems.append(f"{u}: {e}")
    deck = json.loads((ROOT / "data" / "deck.json").read_text(encoding="utf-8"))
    try:
        page = get(f"{base}/compare/")[1].decode()
        live = json.loads(re.search(r'<script type="application/json" id="deck">(.*?)</script>', page, re.S).group(1))
        if live["decks"]["1"] != deck["decks"]["1"]:
            problems.append("deck 1 on the live site differs from data/deck.json; old compare links would misread")
    except Exception as e:
        problems.append(f"deck: {e}")
    images = [it["image"] for it in deck["decks"]["1"]["items"] if it["kind"] == "art"]
    for img in images:
        try:
            status, body = get(f"{base}/assets/{img}")
            if status != 200 or body[:3] != b"\xff\xd8\xff":
                problems.append(f"{img}: not a JPEG")
        except Exception as e:
            problems.append(f"{img}: {e}")
    print(f"checked {len(urls) + 1} pages and {len(images)} images")
    for p in problems:
        print(f"::error::{p}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
