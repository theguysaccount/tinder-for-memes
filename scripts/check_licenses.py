"""Monthly: confirm every painting in the deck is still public domain at The Met.

    python3 scripts/check_licenses.py

Asks The Met's Open Access API about each artwork, slowly (one request every 1.5 s). A painting that
is no longer marked public domain fails the run, so it can be replaced (OPERATIONS.md). If the API
refuses or times out, that's a warning: it says nothing about the license.
"""
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UA = "MemeTasteTest/1.0 (+https://github.com/theguysaccount/tinder-for-memes)"
API = "https://collectionapi.metmuseum.org/public/collection/v1/objects/{}"


def main():
    deck = json.loads((ROOT / "data" / "deck.json").read_text(encoding="utf-8"))
    arts = [it for d in deck["decks"].values() for it in d["items"] if it["kind"] == "art"]
    problems, checked, unknown = [], 0, 0
    for it in arts:
        oid = it["id"].split("-", 1)[1]
        try:
            req = urllib.request.Request(API.format(oid), headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                obj = json.loads(r.read())
            checked += 1
            if not obj.get("isPublicDomain"):
                problems.append(f"{it['id']} ({obj.get('title')}) is no longer marked public domain")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                problems.append(f"{it['id']}: The Met no longer lists this object")
            else:
                unknown += 1
                print(f"::warning::{it['id']}: couldn't check ({e.code})")
        except OSError as e:
            unknown += 1
            print(f"::warning::{it['id']}: couldn't check ({e})")
        time.sleep(1.5)
    print(f"{checked} of {len(arts)} paintings confirmed public domain; {unknown} couldn't be checked")
    for p in problems:
        print(f"::error::{p}")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
