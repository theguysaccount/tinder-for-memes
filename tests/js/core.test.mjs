// Swipe encoding, humor profile and comparison: node --test tests/js/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { encode, decode, parseFragment, profile, compare, label, cleanName } from "../../site/assets/core.js";
import { PEOPLE, likesFor } from "../../site/assets/patterns.js";

const DECKS = JSON.parse(readFileSync(new URL("../../data/deck.json", import.meta.url))).decks;
const ITEMS = DECKS["1"].items;
const N = ITEMS.length;
const all = (v) => Array.from({ length: N }, () => v);

test("swipes round-trip through a link", () => {
  for (let k = 0; k < 300; k++) {
    const likes = Array.from({ length: N }, (_, i) => ((i * 2654435761 + k * 97) >>> 7) % 3 === 0);
    const link = encode({ name: "Alex", likes });
    assert.match(link, /^[A-Za-z0-9_-]+$/);
    assert.ok(link.length < 40);
    const back = decode(link, DECKS);
    assert.equal(back.name, "Alex");
    assert.deepEqual(back.likes, likes);
  }
});

test("damaged or foreign links are rejected", () => {
  const link = encode({ name: "Alex", likes: likesFor("A", N) });
  assert.throws(() => decode(link.slice(0, -2), DECKS));
  for (const pos of [4, 9, 14]) {
    const c = link[pos] === "A" ? "B" : "A";
    assert.throws(() => decode(link.slice(0, pos) + c + link.slice(pos + 1), DECKS));
  }
  assert.throws(() => decode(encode({ likes: all(true), deck: 7 }), DECKS), /deck/);
  assert.throws(() => decode(encode({ likes: all(true).slice(0, 40) }), DECKS), /length/);
  assert.ok(parseFragment("#nope", DECKS).error);
  assert.equal(parseFragment("", DECKS), null);
  assert.equal(cleanName("<i>Al</i>\u0000"), "iAl/i");
});

test("profile picks the style laughed at most, smoothed", () => {
  const onlyPuns = ITEMS.map((it) => it.styles.includes("puns"));
  const p = profile(ITEMS, onlyPuns);
  assert.equal(p.top, "puns");
  const n = ITEMS.filter((it) => it.styles.includes("puns")).length;
  assert.equal(p.rates.puns.rate, (n + 1) / (n + 2));
  assert.equal(p.liked, n);
  const none = profile(ITEMS, all(false));
  for (const r of Object.values(none.rates)) assert.equal(r.rate, 1 / (r.shown + 2));
});

test("comparison", () => {
  assert.equal(compare(all(true), all(true)).match, 100);
  assert.equal(compare(all(false), all(true)).match, 0);
  const a = likesFor("A", N), b = likesFor("B", N);
  const r = compare(a, b);
  const agree = a.filter((x, i) => x === b[i]).length;
  const both = a.filter((x, i) => x && b[i]).length;
  const either = a.filter((x, i) => x || b[i]).length;
  assert.equal(r.match, Math.round(100 * (0.5 * agree / N + 0.5 * both / either)));
  assert.equal(r.both.length, both);
  assert.equal(compare(a, b).match, compare(b, a).match);
  assert.equal(label(90), "Humor twins");
  assert.equal(label(10), "Opposite humor: perfect for roasting each other");
});

test("fixture links match the patterns", () => {
  const fx = JSON.parse(readFileSync(new URL("../fixtures/links.json", import.meta.url)));
  const invite = encode({ name: PEOPLE.A.name, likes: likesFor("A", N) });
  assert.equal(fx.invite, invite);
  assert.equal(fx.result, `${invite}.${encode({ name: PEOPLE.B.name, likes: likesFor("B", N) })}`);
});
