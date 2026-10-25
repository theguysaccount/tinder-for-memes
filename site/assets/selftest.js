// End-to-end self-test, loaded only with ?selftest=1: swipes through the real buttons with the
// patterns in patterns.js and checks the humor type, the compare link and the match.
import { decode, encode, profile, compare } from "./core.js";
import { PEOPLE, likesFor } from "./patterns.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, what, ms = 10000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const v = fn();
    if (v) return v;
    await wait(20);
  }
  throw new Error("timed out waiting for " + what);
}

async function swipeAll(likes, ctx) {
  for (let i = 0; i < likes.length; i++) {
    const card = await until(() => document.querySelector(`[data-card][data-item="${ctx.ITEMS[i].id}"]`), `meme ${i + 1}`);
    if (!card.textContent.trim()) throw new Error(`meme ${i + 1} is empty`);
    document.querySelector(`[data-vote="${likes[i] ? 1 : 0}"]`).click();
  }
}

const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);

async function home(ctx, log) {
  document.querySelector("#name").value = PEOPLE.A.name;
  document.querySelector("[data-start]").click();
  const likes = likesFor("A", ctx.ITEMS.length);
  await swipeAll(likes, ctx);
  const type = await until(() => document.querySelector("[data-type]")?.dataset.type, "the humor type");
  const want = profile(ctx.ITEMS, likes).top;
  if (type !== want) throw new Error(`type ${type}, expected ${want}`);
  const link = document.querySelector("[data-link]").value;
  const got = decode(link.split("#")[1], ctx.DECKS);
  if (got.name !== PEOPLE.A.name || !same(got.likes, likes)) throw new Error("compare link doesn't hold the swipes");
  if (link.split("#")[1] !== encode({ name: PEOPLE.A.name, likes })) throw new Error("link not deterministic");
  document.querySelector("[data-make-card]").click();
  const size = Number(await until(() => document.querySelector("[data-cardbox]").dataset.ready, "the card"));
  if (size < 10000) throw new Error("card too small");
  const imgs = [...document.querySelectorAll(".favs img")];
  for (const img of imgs) await until(() => img.complete, "favorite images");
  if (imgs.some((img) => !img.naturalWidth)) throw new Error("a meme image failed to load");
  log.push(`type ${type}, link ${link.length} chars, card ${size} bytes, ${imgs.length} images ok`);
}

async function invite(ctx, log) {
  const landing = document.querySelector("#landing");
  await until(() => landing.querySelector("[data-begin]"), "landing");
  if (!landing.textContent.includes(`${PEOPLE.A.name} swiped 50 memes`)) throw new Error("landing doesn't name the sender");
  landing.querySelector("#name").value = PEOPLE.B.name;
  landing.querySelector("[data-begin]").click();
  const mine = likesFor("B", ctx.ITEMS.length);
  await swipeAll(mine, ctx);
  const shown = await until(() => document.querySelector("[data-match]")?.dataset.match, "the match");
  const A = decode(location.hash.slice(1).split(".")[0], ctx.DECKS);
  const want = compare(A.likes, mine).match;
  if (Number(shown) !== want) throw new Error(`shown ${shown}%, expected ${want}%`);
  const back = document.querySelector("[data-back] [data-link]").value.split("#")[1].split(".");
  const B = decode(back[1], ctx.DECKS);
  if (back[0] !== location.hash.slice(1) || B.name !== PEOPLE.B.name || !same(B.likes, mine)) throw new Error("result link is wrong");
  log.push(`match ${shown}%`);
}

async function result(ctx, log) {
  const shown = await until(() => document.querySelector("[data-match]")?.dataset.match, "the match");
  const [a, b] = location.hash.slice(1).split(".");
  const want = compare(decode(a, ctx.DECKS).likes, decode(b, ctx.DECKS).likes).match;
  if (Number(shown) !== want) throw new Error(`shown ${shown}%, expected ${want}%`);
  log.push(`match ${shown}%`);
}

export async function run(page, ctx) {
  const log = [];
  try {
    const parts = location.hash.slice(1).split(".").filter(Boolean).length;
    if (page === "home") await home(ctx, log);
    else if (page === "compare" && parts === 1) await invite(ctx, log);
    else if (page === "compare" && parts === 2) await result(ctx, log);
    for (const el of document.querySelectorAll("button")) {
      if (el.offsetParent && !el.textContent.trim()) throw new Error("a visible button has no label");
    }
    document.body.dataset.selftest = "pass";
  } catch (e) {
    document.body.dataset.selftest = "fail: " + e.message;
  }
  const pre = document.createElement("pre");
  pre.id = "selftest";
  pre.textContent = document.body.dataset.selftest + "\n" + log.join("\n");
  document.body.appendChild(pre);
}

// Screenshot helper: ?demo=3 shows meme 3; ?demo=end plays the A pattern to the result.
export async function demo(page, what, ctx) {
  if (page === "home") {
    document.querySelector("#name").value = PEOPLE.A.name;
    document.querySelector("[data-start]").click();
    const likes = likesFor("A", ctx.ITEMS.length);
    const n = what === "end" ? likes.length : Math.max(0, Number(what) - 1);
    await swipeAll(likes.slice(0, n), ctx);
  } else if (page === "compare" && what === "end") {
    await until(() => document.querySelector("[data-begin]"), "landing");
    document.querySelector("#landing #name").value = PEOPLE.B.name;
    document.querySelector("[data-begin]").click();
    await swipeAll(likesFor("B", ctx.ITEMS.length), ctx);
  }
  window.scrollTo(0, 0);
}
