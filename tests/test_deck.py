"""The deck: 50 well-formed memes, every image present and credited, every style covered."""
import json
import re
import struct
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DECKS = json.loads((ROOT / "data" / "deck.json").read_text(encoding="utf-8"))["decks"]
STYLES = {"absurd", "wholesome", "dry", "dark", "nerdy", "puns", "relatable"}


def jpeg_size(path):
    data = path.read_bytes()
    i = 2
    while i < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker in (0xC0, 0xC1, 0xC2):
            h, w = struct.unpack(">HH", data[i + 5:i + 9])
            return w, h
        i += 2 + struct.unpack(">H", data[i + 2:i + 4])[0]
    return None


class DeckTest(unittest.TestCase):
    def test_deck_one(self):
        deck = DECKS["1"]
        items = deck["items"]
        self.assertEqual(len(items), 50)
        self.assertEqual(len({i["id"] for i in items}), 50)
        self.assertEqual(set(deck["types"]), STYLES)
        for it in items:
            with self.subTest(it["id"]):
                self.assertTrue(1 <= len(it["styles"]) <= 2)
                self.assertTrue(set(it["styles"]) <= STYLES)
                if it["kind"] == "art":
                    self.assertTrue(it["caption"] and it["alt"])
                    c = it["credit"]
                    self.assertRegex(c["url"], r"^https://www\.metmuseum\.org/art/collection/search/\d+$")
                    self.assertEqual(c["license"], "CC0 (public domain)")
                    img = ROOT / "site" / "assets" / it["image"]
                    self.assertTrue(img.exists())
                    w, h = jpeg_size(img)
                    self.assertLessEqual(max(w, h), 640)
                    self.assertLess(img.stat().st_size, 200_000)
                    self.assertEqual(it["id"], "met-" + c["url"].rsplit("/", 1)[1])
                else:
                    self.assertTrue(it["text"].strip())
                if it["kind"] == "format":
                    self.assertTrue(it["format"])

    def test_every_style_has_enough_memes(self):
        items = DECKS["1"]["items"]
        for s in STYLES:
            self.assertGreaterEqual(sum(s in it["styles"] for it in items), 5, s)

    def test_formats_are_spread_out(self):
        pos = [n for n, it in enumerate(DECKS["1"]["items"]) if it["kind"] == "format"]
        self.assertTrue(all(b - a >= 4 for a, b in zip(pos, pos[1:])), pos)

    def test_no_unused_images(self):
        used = {it["image"].split("/")[-1] for it in DECKS["1"]["items"] if it["kind"] == "art"}
        files = {p.name for p in (ROOT / "site" / "assets" / "memes").glob("*.jpg")}
        self.assertEqual(files, used)

    def test_content_rules(self):
        blob = json.dumps(DECKS, ensure_ascii=False).lower()
        for word in ("trump", "biden", "election", "sex", "nude", "religion", "jesus", "drake"):
            self.assertNotRegex(blob, rf"\b{word}\b", word)


if __name__ == "__main__":
    unittest.main()
