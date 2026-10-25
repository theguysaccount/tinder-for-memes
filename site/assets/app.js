// Meme taste test UI. Logic lives in core.js. Nothing is stored or sent: swipes live only in links.
import { encode, parseFragment, profile, compare, label, cleanName } from "./core.js";

const CFG = JSON.parse(document.getElementById("site-config").textContent);
const DECKS = JSON.parse(document.getElementById("deck").textContent).decks;
const DECK_ID = "1";
const DECK = DECKS[DECK_ID];
const ITEMS = DECK.items;
const TYPES = DECK.types;
const STYLE_LABEL = { absurd: "Absurd", wholesome: "Wholesome", dry: "Deadpan", dark: "Dark", nerdy: "Nerdy", puns: "Puns", relatable: "Relatable" };
const page = document.body.dataset.page;
const quick = /[?&](selftest|demo)=/.test(location.search) || matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const lines = (t) => esc(t).split("\n").map((l) => `<p>${l}</p>`).join("");

function track(name, detail) {
  try {
    if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: `event/${name}${detail ? "/" + detail : ""}`, title: name, event: true });
  } catch (e) { /* never break the test */ }
}

export function memeHtml(it) {
  if (it.kind === "art") {
    const c = it.credit;
    return `<figure class="meme art"><figcaption class="cap">${esc(it.caption)}</figcaption>
      <img src="${CFG.root}assets/${it.image}" alt="${esc(it.alt)}" draggable="false" width="640" height="640">
      <p class="credit">${esc(c.title)}, ${esc(c.artist)}${c.date ? ", " + esc(c.date) : ""}. The Met, public domain.</p></figure>`;
  }
  if (it.kind === "format") {
    return `<div class="meme format"><p class="fmt">Format: ${esc(it.format)} <span>(described in words)</span></p>${lines(it.text)}</div>`;
  }
  return `<div class="meme textcard ${esc(it.kind)}">${lines(it.text)}</div>`;
}

// ---------- swiping ----------
function runSwipes(box, { onDone }) {
  const likes = [];
  let i = 0;
  let busy = false;
  const preload = (k) => { if (ITEMS[k] && ITEMS[k].kind === "art") new Image().src = CFG.root + "assets/" + ITEMS[k].image; };
  const render = () => {
    busy = false;
    box.innerHTML = `
      <div class="qhead"><span>${i + 1} of ${ITEMS.length}</span><button type="button" class="link-btn" data-undo ${i ? "" : "disabled"}>Undo</button></div>
      <div class="progress" aria-hidden="true"><span style="width:${(i / ITEMS.length) * 100}%"></span></div>
      <div class="stack"><div class="card" data-card data-item="${esc(ITEMS[i].id)}" tabindex="0" aria-label="Meme ${i + 1} of ${ITEMS.length}. Swipe right or press the right arrow if it made you laugh.">${memeHtml(ITEMS[i])}</div></div>
      <div class="swipe-row">
        <button type="button" class="btn nope" data-vote="0" aria-label="Not funny">😐 Nope</button>
        <button type="button" class="btn haha" data-vote="1" aria-label="Funny">😂 Haha</button>
      </div>
      <p class="hint">Swipe, tap, or use ← and → keys.</p>`;
    preload(i + 1);
    const card = $("[data-card]", box);
    box.querySelectorAll("[data-vote]").forEach((b) => b.addEventListener("click", () => vote(b.dataset.vote === "1")));
    $("[data-undo]", box).addEventListener("click", () => { if (i > 0) { i--; likes.length = i; render(); } });
    let x0 = null, dx = 0;
    card.addEventListener("pointerdown", (ev) => { x0 = ev.clientX; dx = 0; card.setPointerCapture(ev.pointerId); card.style.transition = "none"; });
    card.addEventListener("pointermove", (ev) => {
      if (x0 === null) return;
      dx = ev.clientX - x0;
      card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
      card.dataset.lean = dx > 30 ? "haha" : dx < -30 ? "nope" : "";
    });
    const end = () => {
      if (x0 === null) return;
      x0 = null;
      card.style.transition = "";
      if (Math.abs(dx) > 90) vote(dx > 0);
      else { card.style.transform = ""; card.dataset.lean = ""; }
    };
    card.addEventListener("pointerup", end);
    card.addEventListener("pointercancel", end);
  };
  const vote = (liked) => {
    if (busy) return;
    busy = true;
    likes[i] = liked;
    const card = $("[data-card]", box);
    const next = () => {
      i++;
      if (i < ITEMS.length) render();
      else { document.removeEventListener("keydown", onKey); onDone(likes.slice()); }
    };
    if (quick) return next();
    card.style.transform = `translateX(${liked ? 120 : -120}%) rotate(${liked ? 14 : -14}deg)`;
    card.style.opacity = "0";
    setTimeout(next, 180);
  };
  const onKey = (ev) => {
    if (ev.target.closest("input, textarea")) return;
    if (ev.key === "ArrowRight") vote(true);
    else if (ev.key === "ArrowLeft") vote(false);
  };
  document.addEventListener("keydown", onKey);
  render();
}

// ---------- sharing ----------
function shareRow(url, text, subject, what) {
  const enc = encodeURIComponent;
  return `<div class="btn-row">
    ${navigator.share ? `<button class="btn small" type="button" data-native>Share…</button>` : ""}
    <a class="btn small secondary" href="sms:?&body=${enc(text + " " + url)}" data-t="${what}-sms">Text it</a>
    <a class="btn small secondary" href="https://wa.me/?text=${enc(text + " " + url)}" target="_blank" rel="noopener" data-t="${what}-whatsapp">WhatsApp</a>
    <button class="btn small secondary" type="button" data-copy>Copy link</button>
  </div><input class="link" readonly value="${esc(url)}" aria-label="Link" data-link>`;
}

function wireShare(el, url, text, subject, what) {
  el.querySelector("[data-native]")?.addEventListener("click", async () => {
    track("share", what + "-native");
    try { await navigator.share({ title: subject, text, url }); } catch (e) { /* cancelled */ }
  });
  el.querySelector("[data-copy]").addEventListener("click", async (ev) => {
    track("share", what + "-copy");
    try { await navigator.clipboard.writeText(url); ev.target.textContent = "Copied ✓"; } catch (e) { window.prompt("Copy this link:", url); }
  });
  el.querySelectorAll("[data-t]").forEach((a) => a.addEventListener("click", () => track("share", a.dataset.t)));
}

function drawCard(canvas, { kicker, title, blurb }) {
  const w = 1080, h = 1080;
  canvas.width = w; canvas.height = h;
  const g = canvas.getContext("2d");
  const grad = g.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#1b1530"); grad.addColorStop(1, "#3b1f4f");
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  g.fillStyle = "#ffd166"; g.font = "700 46px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  g.fillText("😂 Meme Taste Test", 80, 130);
  g.fillStyle = "#cbbbe6"; g.font = "600 44px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  g.fillText(kicker, 80, 380);
  g.fillStyle = "#ffffff"; g.font = "900 104px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  let y = wrap(g, title, 80, 500, w - 160, 112);
  g.fillStyle = "#e6dcf5"; g.font = "400 40px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  wrap(g, blurb, 80, y + 70, w - 160, 54);
  g.fillStyle = "#ffd166"; g.font = "600 34px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  g.fillText(CFG.siteUrl.replace(/^https?:\/\//, ""), 80, 1010);
}

function wrap(g, text, x, y, maxW, lh) {
  let line = "";
  for (const word of text.split(" ")) {
    const test = line ? line + " " + word : word;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); line = word; y += lh; } else line = test;
  }
  if (line) g.fillText(line, x, y);
  return y;
}

async function showCard(box, card, text) {
  const canvas = box.querySelector("canvas");
  drawCard(canvas, card);
  box.hidden = false;
  const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
  const file = new File([blob], "humor-type.png", { type: "image/png" });
  box.querySelector("[data-download]").href = URL.createObjectURL(blob);
  const native = box.querySelector("[data-native-card]");
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    native.hidden = false;
    native.onclick = async () => { track("card_share", "native"); try { await navigator.share({ files: [file], text: `${text} ${CFG.siteUrl}/` }); } catch (e) { /* cancelled */ } };
  }
  box.dataset.ready = String(blob.size);
}

const cardBox = `<div class="cardbox" data-cardbox hidden><canvas width="1080" height="1080" aria-label="Your humor type card"></canvas>
  <div class="btn-row"><button class="btn small" type="button" data-native-card hidden>Share…</button><a class="btn small secondary" data-download download="humor-type.png" href="#">Download image</a></div></div>`;

function bars(rates, other) {
  return `<div class="bars">${Object.keys(STYLE_LABEL).map((s) => {
    const r = rates[s] ? Math.round(rates[s].rate * 100) : 0;
    const o = other && other[s] ? Math.round(other[s].rate * 100) : null;
    return `<div class="bar"><span>${STYLE_LABEL[s]}</span><span class="track"><span style="width:${r}%"></span>${o === null ? "" : `<span class="them" style="width:${o}%"></span>`}</span><b>${r}%</b></div>`;
  }).join("")}</div>`;
}

function favorites(indices, max = 6) {
  const arts = indices.map((i) => ITEMS[i]).filter((it) => it.kind === "art").slice(0, max);
  const texts = indices.map((i) => ITEMS[i]).filter((it) => it.kind !== "art").slice(0, Math.max(0, max - arts.length));
  return `<div class="favs">${arts.map((it) => `<figure><img src="${CFG.root}assets/${it.image}" alt="${esc(it.alt)}" loading="lazy"><figcaption>${esc(it.caption)}</figcaption></figure>`).join("")}
    ${texts.map((it) => `<figure class="txt"><figcaption>${esc((it.format ? "Format: " + it.format + ". " : "") + it.text.split("\n").slice(-1)[0])}</figcaption></figure>`).join("")}</div>`;
}

function renderProfile(box, likes, name) {
  const p = profile(ITEMS, likes);
  const t = TYPES[p.top], t2 = TYPES[p.second];
  const link = `${CFG.siteUrl}/compare/#${encode({ name, likes, deck: Number(DECK_ID) })}`;
  const liked = likes.map((l, i) => (l ? i : -1)).filter((i) => i >= 0);
  box.innerHTML = `
    <p class="eyebrow">Your humor type</p>
    <h1 class="type" data-type="${p.top}">${esc(t.name)}</h1>
    <p class="lede">${esc(t.blurb)}</p>
    <p>With a side of <b>${esc(t2.name)}</b>. You laughed at ${p.liked} of ${p.total} memes.</p>
    ${bars(p.rates)}
    <div class="share-box"><h2>Compare with a friend</h2><p>They swipe the same 50 memes and see how well your humor matches. Your swipes are inside the link, nowhere else.</p><div data-share></div></div>
    <div class="btn-row"><button class="btn" type="button" data-make-card>Make my humor card</button><button class="btn secondary" type="button" data-again>Swipe again</button></div>
    ${cardBox}
    ${liked.length ? `<h2>Memes that got you</h2>${favorites(liked)}` : ""}
    ${CFG.sponsorUrl ? `<p class="note"><a href="${esc(CFG.sponsorUrl)}" rel="noopener sponsored">${esc(CFG.sponsorLabel || "Support the Meme Taste Test")}</a></p>` : ""}`;
  const text = `My humor type is ${t.name}. Swipe 50 memes and see if we match:`;
  $("[data-share]", box).innerHTML = shareRow(link, text, "Does our humor match?", "invite");
  wireShare(box, link, text, "Does our humor match?", "invite");
  $("[data-make-card]", box).addEventListener("click", () => {
    showCard($("[data-cardbox]", box), { kicker: "My humor type:", title: t.name, blurb: t.blurb }, `My humor type is ${t.name}.`);
    track("card_open");
  });
  return { p, link };
}

function renderMatch(box, A, B, { justSwiped }) {
  const r = compare(A.likes, B.likes);
  const pa = profile(ITEMS, A.likes), pb = profile(ITEMS, B.likes);
  const nameA = A.name || "They", nameB = B.name || (justSwiped ? "You" : "Their friend");
  box.innerHTML = `
    <p class="eyebrow">${esc(nameA)} + ${esc(nameB)}</p>
    <p class="score" data-match="${r.match}">${r.match}%</p>
    <p class="verdict">${esc(label(r.match))}</p>
    <p>You agreed on ${r.agree} of ${r.total} memes and both laughed at ${r.both.length}.</p>
    <div class="types"><div><span>${esc(nameA)}</span><b>${esc(TYPES[pa.top].name)}</b></div><div><span>${esc(nameB)}</span><b>${esc(TYPES[pb.top].name)}</b></div></div>
    <h2>Humor styles</h2><p class="note">Bars: ${esc(nameA)}. Thin lines: ${esc(nameB)}.</p>
    ${bars(pa.rates, pb.rates)}
    ${r.both.length ? `<h2>You both laughed at</h2>${favorites(r.both)}` : ""}
    <div data-actions></div>`;
  return r;
}

// ---------- pages ----------
function initHome() {
  const intro = $("#intro"), flow = $("#flow"), result = $("#result");
  document.querySelectorAll("[data-start]").forEach((b) => b.addEventListener("click", () => {
    const name = cleanName($("#name")?.value);
    intro.hidden = true;
    result.hidden = true;
    flow.hidden = false;
    track("swipe_start");
    runSwipes($("[data-swipes]", flow), {
      onDone: (likes) => {
        flow.hidden = true;
        result.hidden = false;
        renderProfile($("[data-result]", result), likes, name);
        $("[data-again]", result).addEventListener("click", () => { result.hidden = true; intro.hidden = false; window.scrollTo(0, 0); });
        result.scrollIntoView({ block: "start" });
        track("swipe_complete");
      },
    });
  }));
}

function initCompare() {
  const landing = $("#landing"), flow = $("#flow"), result = $("#result");
  const show = () => {
    const parsed = parseFragment(location.hash, DECKS);
    landing.hidden = flow.hidden = result.hidden = true;
    if (!parsed || parsed.error) {
      landing.hidden = false;
      landing.innerHTML = `<h1>${parsed ? "This link looks incomplete" : "Compare your humor"}</h1><p class="lede">${parsed ? "Part of it may have been cut off. Ask for the link again, or take the test yourself." : "Open the link a friend sent you to compare, or take the test and send your own."}</p><p><a class="btn" href="../">Take the Meme Taste Test</a></p>`;
      return;
    }
    const A = parsed.a;
    if (parsed.b) {
      result.hidden = false;
      const r = renderMatch($("[data-result]", result), A, parsed.b, { justSwiped: false });
      $("[data-actions]", result).innerHTML = `<div class="share-box"><h2>Find your humor type</h2><p>Swipe 50 memes and get a link to compare with anyone.</p><p><a class="btn" href="../" data-own>Take the test</a></p></div>`;
      $("[data-own]", result).addEventListener("click", () => track("own_from_result"));
      track("result_opened", String(r.match));
      return;
    }
    const who = A.name || "Someone";
    landing.hidden = false;
    landing.innerHTML = `
      <p class="eyebrow">Meme Taste Test</p>
      <h1>${esc(who)} swiped 50 memes. Does your humor match?</h1>
      <p class="lede">Swipe the same 50: right if it made you laugh, left if not. Then see your humor match, your types, and the memes you both loved.</p>
      <label class="name">Your first name (optional, shown on the result) <input id="name" type="text" maxlength="24" autocomplete="given-name"></label>
      <p><button class="btn" type="button" data-begin>Start swiping</button></p>
      <p class="note">${esc(who)}'s swipes are inside this link, and yours will be inside the result link. Nothing is stored anywhere else.</p>`;
    track("compare_opened");
    $("[data-begin]", landing).addEventListener("click", () => {
      const myName = cleanName($("#name", landing).value);
      landing.hidden = true;
      flow.hidden = false;
      runSwipes($("[data-swipes]", flow), {
        onDone: (likes) => {
          const B = { name: myName, deck: Number(DECK_ID), likes };
          flow.hidden = true;
          result.hidden = false;
          const r = renderMatch($("[data-result]", result), A, B, { justSwiped: true });
          const back = `${CFG.siteUrl}/compare/#${location.hash.replace(/^#/, "").split(".")[0]}.${encode(B)}`;
          const mine = `${CFG.siteUrl}/compare/#${encode(B)}`;
          const text = `${myName || "I"} took your Meme Taste Test: our humor is a ${r.match}% match. See which memes we both loved:`;
          $("[data-actions]", result).innerHTML = `
            <div class="share-box"><h2>Send the result to ${esc(who)}</h2><p>It shows ${esc(who)} the same breakdown. It holds both of your swipes.</p><div data-back></div></div>
            <div class="share-box"><h2>Your own compare link</h2><p>Send this to other friends: they'll be compared with you.</p><div data-mine></div></div>`;
          $("[data-back]", result).innerHTML = shareRow(back, text, "Our humor match", "result");
          wireShare($("[data-back]", result).parentElement, back, text, "Our humor match", "result");
          $("[data-mine]", result).innerHTML = shareRow(mine, "Swipe 50 memes and see if our humor matches:", "Does our humor match?", "invite2");
          wireShare($("[data-mine]", result).parentElement, mine, "Swipe 50 memes and see if our humor matches:", "Does our humor match?", "invite2");
          result.scrollIntoView({ block: "start" });
          track("compare_complete", String(Math.round(r.match / 10) * 10));
        },
      });
    });
  };
  window.addEventListener("hashchange", show);
  show();
}

({ home: initHome, compare: initCompare })[page]?.();

if (/[?&]selftest=1\b/.test(location.search)) {
  import("./selftest.js").then((m) => m.run(page, { ITEMS, DECKS })).catch((e) => { document.body.dataset.selftest = "fail: " + e.message; });
}
const demo = new URLSearchParams(location.search).get("demo");
if (demo) import("./selftest.js").then((m) => m.demo(page, demo, { ITEMS }));
