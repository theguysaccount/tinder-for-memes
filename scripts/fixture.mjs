// node scripts/fixture.mjs > tests/fixtures/links.json
import { readFileSync } from "node:fs";
import { encode, compare } from "../site/assets/core.js";
import { PEOPLE, likesFor } from "../site/assets/patterns.js";
const deck = JSON.parse(readFileSync(new URL("../data/deck.json", import.meta.url))).decks["1"];
const n = deck.items.length;
const invite = encode({ name: PEOPLE.A.name, likes: likesFor("A", n) });
const reply = encode({ name: PEOPLE.B.name, likes: likesFor("B", n) });
console.log(JSON.stringify({ invite, result: `${invite}.${reply}`, match: compare(likesFor("A", n), likesFor("B", n)).match }, null, 1));
