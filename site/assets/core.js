// Meme taste test logic, shared by the browser (app.js) and the Node tests. No DOM access here.
//
// Swipes travel only inside the link, after the "#" (never sent to a server):
//   [0] format (1)  [1] deck (1)  [2] name length n  [3..3+n) name in UTF-8
//   then one bit per meme (1 = laughed), then a 2-byte checksum.
// A compare invite is "#<swipes>"; a result is "#<swipes>.<swipes>" (the person who shared first).

export const FORMAT = 1;
export const MAX_NAME_BYTES = 60;

function fnv16(bytes) {
  let h = 0x811c9dc5;
  for (const b of bytes) {
    h ^= b;
    h = Math.imul(h, 0x01000193);
  }
  h >>>= 0;
  return (h ^ (h >>> 16)) & 0xffff;
}

function toBase64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(str) {
  if (!/^[A-Za-z0-9_-]+$/.test(str)) throw new Error("bad characters");
  const s = atob(str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

export function cleanName(name) {
  let n = String(name || "").replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim();
  const enc = new TextEncoder();
  while (enc.encode(n).length > MAX_NAME_BYTES) n = n.slice(0, -1);
  return n;
}

export function encode({ name = "", likes, deck = 1 }) {
  const nameBytes = new TextEncoder().encode(cleanName(name));
  const packed = new Uint8Array(Math.ceil(likes.length / 8));
  likes.forEach((liked, i) => { if (liked) packed[i >> 3] |= 0x80 >> (i & 7); });
  const body = Uint8Array.from([FORMAT, deck, nameBytes.length, ...nameBytes, ...packed]);
  const sum = fnv16(body);
  return toBase64url(Uint8Array.from([...body, sum >> 8, sum & 0xff]));
}

export function decode(str, decks) {
  const bytes = fromBase64url(str);
  if (bytes.length < 5) throw new Error("too short");
  const body = bytes.slice(0, -2);
  if (fnv16(body) !== ((bytes[bytes.length - 2] << 8) | bytes[bytes.length - 1])) throw new Error("checksum");
  if (body[0] !== FORMAT) throw new Error("unknown format");
  const deck = decks[String(body[1])];
  if (!deck) throw new Error("unknown deck");
  const n = body[2];
  if (n > MAX_NAME_BYTES || 3 + n > body.length) throw new Error("bad name");
  const name = cleanName(new TextDecoder().decode(body.slice(3, 3 + n)));
  const packed = body.slice(3 + n);
  if (packed.length !== Math.ceil(deck.items.length / 8)) throw new Error("wrong length");
  const likes = deck.items.map((_, i) => ((packed[i >> 3] >> (7 - (i & 7))) & 1) === 1);
  return { name, deck: body[1], likes };
}

export function parseFragment(hash, decks) {
  const parts = String(hash || "").replace(/^#/, "").split(".").filter(Boolean);
  if (!parts.length || parts.length > 2) return null;
  try {
    const a = decode(parts[0], decks);
    const b = parts[1] ? decode(parts[1], decks) : null;
    if (b && b.deck !== a.deck) return null;
    return { a, b };
  } catch (e) {
    return { error: e.message };
  }
}

// Humor profile: for each style, the share of its memes you laughed at, smoothed so a style with
// few memes can't win on one lucky swipe: (likes + 1) / (shown + 2).
export function profile(items, likes) {
  const rates = {};
  items.forEach((it, i) => {
    for (const s of it.styles) {
      rates[s] ||= { likes: 0, shown: 0 };
      rates[s].shown++;
      if (likes[i]) rates[s].likes++;
    }
  });
  for (const r of Object.values(rates)) r.rate = (r.likes + 1) / (r.shown + 2);
  const ranked = Object.keys(rates).sort((x, y) => rates[y].rate - rates[x].rate || rates[y].shown - rates[x].shown || (x < y ? -1 : 1));
  return { liked: likes.filter(Boolean).length, total: likes.length, rates, top: ranked[0], second: ranked[1], ranked };
}

// Humor match: half how often you agreed (both laughed or both passed), half how much your laughs
// overlap (shared laughs / memes either of you laughed at).
export function compare(likesA, likesB) {
  let agree = 0;
  const both = [];
  let either = 0;
  likesA.forEach((a, i) => {
    const b = likesB[i];
    if (a === b) agree++;
    if (a && b) both.push(i);
    if (a || b) either++;
  });
  const agreement = agree / likesA.length;
  const overlap = either ? both.length / either : 1;
  return { match: Math.round(100 * (0.5 * agreement + 0.5 * overlap)), agree, total: likesA.length, both };
}

export function label(match) {
  if (match >= 85) return "Humor twins";
  if (match >= 70) return "Same wavelength";
  if (match >= 55) return "You get each other most of the time";
  if (match >= 40) return "Different senses of humor (more to roast)";
  return "Opposite humor: perfect for roasting each other";
}
