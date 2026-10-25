"""Build the Meme Taste Test static site into dist/. Standard library only (Python 3.9+).

    python3 pipeline/build.py [--out dist]

Optional environment (GitHub repository variables in CI; see OPERATIONS.md):
    SITE_URL         canonical origin + path, no trailing slash (default: the GitHub Pages URL)
    GOATCOUNTER_URL  e.g. https://memetaste.goatcounter.com/count -> cookieless analytics on
    SPONSOR_URL      sponsor or support link shown under results (with SPONSOR_LABEL)
    BUILD_DATE       YYYY-MM-DD, to reproduce a build
"""
import argparse
import datetime as dt
import hashlib
import html
import json
import os
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SITE_URL = "https://theguysaccount.github.io/tinder-for-memes"
REPO_URL = "https://github.com/theguysaccount/tinder-for-memes"
INDEXNOW_KEY = (ROOT / "site" / "indexnow-key.txt").read_text().strip()
BRAND = "Meme Taste Test"
STYLE_LABEL = {"absurd": "Absurd", "wholesome": "Wholesome", "dry": "Deadpan", "dark": "Dark", "nerdy": "Nerdy", "puns": "Puns", "relatable": "Relatable"}
e = html.escape


def attr(s):
    return html.escape(str(s), quote=True)


class Site:
    def __init__(self, out, today):
        self.out, self.today = out, today
        self.site_url = os.environ.get("SITE_URL", DEFAULT_SITE_URL).rstrip("/")
        self.goatcounter = os.environ.get("GOATCOUNTER_URL", "").strip()
        self.sponsor_url = os.environ.get("SPONSOR_URL", "").strip()
        self.sponsor_label = os.environ.get("SPONSOR_LABEL", "").strip()
        self.decks = json.loads((ROOT / "data" / "deck.json").read_text(encoding="utf-8"))
        self.deck = self.decks["decks"]["1"]
        self.pages = []
        h = hashlib.sha1()
        for p in sorted((ROOT / "site" / "assets").rglob("*")):
            if p.is_file() and "memes" not in p.parts and "og" not in p.parts:
                h.update(p.name.encode() + p.read_bytes())
        h.update((ROOT / "data" / "deck.json").read_bytes())
        self.ver = h.hexdigest()[:10]

    def url(self, path):
        return f"{self.site_url}/{path}"

    def write(self, path, text):
        f = self.out / path
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(text, encoding="utf-8")

    def layout(self, path, title, description, body, *, page="static", og="home", jsonld=None, noindex=False, current="", root=None, app=True):
        if root is None:
            depth = path.count("/")
            root = "../" * depth if depth else "./"
        here = ' aria-current="page"'
        nav = "".join(f'<a href="{root}{p}"{here if p == current else ""}>{t}</a>' for p, t in
                      [("", "Take the test"), ("humor-types/", "Humor types"), ("credits/", "About")])
        ld = "".join('<script type="application/ld+json">%s</script>\n' % json.dumps(b, ensure_ascii=False).replace("</", "<\\/")
                     for b in (jsonld or []))
        scripts = ""
        if app:
            cfg = json.dumps({"root": root, "siteUrl": self.site_url, "sponsorUrl": self.sponsor_url, "sponsorLabel": self.sponsor_label})
            deck = json.dumps(self.decks, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
            scripts = (f'<script type="application/json" id="site-config">{cfg}</script>\n'
                       f'<script type="application/json" id="deck">{deck}</script>\n'
                       f'<script type="module" src="{root}assets/app.js?v={self.ver}"></script>\n')
        gc = (f'<script data-goatcounter="{attr(self.goatcounter)}" async src="https://gc.zgo.at/count.js"></script>\n'
              if self.goatcounter else "")
        privacy = ("Visits are counted with GoatCounter (no cookies, no personal data). " if self.goatcounter else "") + \
            "Your swipes stay in your browser and in the links you choose to share. Nothing is stored."
        return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{attr(description)}">
<link rel="canonical" href="{self.url(path)}">
{'<meta name="robots" content="noindex">' if noindex else ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="{BRAND}">
<meta property="og:title" content="{attr(title)}">
<meta property="og:description" content="{attr(description)}">
<meta property="og:url" content="{self.url(path)}">
<meta property="og:image" content="{self.site_url}/assets/og/{og}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#6b2fd6">
<link rel="icon" href="{root}favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="{root}assets/site.css?v={self.ver}">
{ld}{scripts}{gc}</head>
<body data-page="{page}">
<a class="skip" href="#main">Skip to content</a>
<header class="site-head"><div class="wrap">
<a class="logo" href="{root}">😂 {BRAND}</a>
<nav class="nav" aria-label="Main">{nav}</nav>
</div></header>
<main id="main" class="wrap">
{body}
</main>
<footer class="site-foot"><div class="wrap">
<nav aria-label="Footer"><a href="{root}">Take the test</a><a href="{root}humor-types/">The 7 humor types</a><a href="{root}credits/">About, credits and privacy</a><a href="{REPO_URL}">Source code</a></nav>
<p>{privacy}</p>
<p>Captions are original. Paintings are public-domain works from The Metropolitan Museum of Art's Open Access collection (CC0). Famous meme formats are described in words, never copied.</p>
</div></footer>
</body>
</html>
"""

    def home(self):
        body = f"""
<section id="intro">
<h1>What's your humor type? Swipe 50 memes and find out</h1>
<p class="lede">Swipe right if it made you laugh, left if it didn't. Two minutes later you get your humor type, and a link that shows a friend, partner or group chat how well your humor matches.</p>
<div class="card-box">
<label class="name">Your first name or nickname (optional, shown to friends who open your link) <input id="name" type="text" maxlength="24" autocomplete="given-name"></label>
<div class="btn-row"><button class="btn" type="button" data-start>Start swiping</button></div>
<p class="note">No sign-up, no matching with strangers. Everything stays in your browser and the links you share.</p>
</div>
<h2>How it works</h2>
<p>The deck mixes classical paintings with new captions, short text memes and famous meme formats described in words. Each meme leans toward one or two of seven humor styles: absurd, wholesome, deadpan, dark, nerdy, puns and relatable. Your humor type is the style you laugh at most. <a href="humor-types/">Meet all seven types →</a></p>
<h2>Compare with friends</h2>
<p>Your result comes with a link. Whoever opens it swipes the same 50 memes and sees your humor match, both of your types, and the memes you both loved. It's the fastest way to find out who in the group chat actually gets you.</p>
</section>
<section id="flow" hidden><div data-swipes></div></section>
<section id="result" hidden><div data-result></div></section>
<noscript><p>The test needs JavaScript. <a href="humor-types/">Read about the seven humor types</a> instead.</p></noscript>
"""
        ld = [{"@context": "https://schema.org", "@type": "Quiz", "name": f"{BRAND}: what's your humor type?", "url": self.site_url + "/",
               "educationalUse": "self-assessment", "isAccessibleForFree": True, "inLanguage": "en",
               "about": {"@type": "Thing", "name": "Sense of humor"},
               "description": "Swipe 50 memes to find your humor type and compare with friends."}]
        self.write("index.html", self.layout("", f"{BRAND}: what's your humor type? Swipe 50 memes",
                                             "A free meme personality test: swipe 50 memes, get your humor type, and send a link to see whose humor matches yours. No sign-up.",
                                             body, page="home", jsonld=ld, current=""))
        self.pages.append("")

    def compare(self):
        body = """
<section id="landing"><h1>Compare your humor</h1><p class="lede">Loading…</p></section>
<section id="flow" hidden><div data-swipes></div></section>
<section id="result" hidden><div data-result></div></section>
<noscript><p>Comparing needs JavaScript to read the swipes in the link.</p></noscript>
"""
        self.write("compare/index.html", self.layout("compare/", f"Does your humor match? | {BRAND}",
                                                     "A friend sent you their meme swipes. Swipe the same 50 memes and see how well your humor matches.",
                                                     body, page="compare", noindex=True))

    def example(self, it):
        if it["kind"] == "art":
            return (f'<figure class="meme art"><figcaption class="cap">{e(it["caption"])}</figcaption>'
                    f'<img src="../assets/{it["image"]}" alt="{attr(it["alt"])}" loading="lazy" width="640" height="640"></figure>')
        text = "".join(f"<p>{e(l)}</p>" for l in it["text"].split("\n"))
        if it["kind"] == "format":
            return f'<div class="meme format"><p class="fmt">Format: {e(it["format"])} <span>(described in words)</span></p>{text}</div>'
        return f'<div class="meme textcard">{text}</div>'

    def humor_types(self):
        root = "../"
        items = self.deck["items"]
        arts = []
        for style, t in self.deck["types"].items():
            ex = next((it for it in items if it["styles"][0] == style and it["kind"] != "art"), None) or \
                next(it for it in items if style in it["styles"])
            n = sum(style in it["styles"] for it in items)
            arts.append(f"""<article id="{style}"><h2>{e(t['name'])}</h2><p><b>Laughs hardest at: {e(STYLE_LABEL[style].lower())} humor.</b> {e(t['blurb'])}</p>
<p class="note">{n} of the {len(items)} memes in the test lean this way. One of them:</p><div class="card">{self.example(ex)}</div></article>""")
        body = f"""
<h1>The 7 humor types: which one are you?</h1>
<p class="lede">Most people's sense of humor leans toward one or two styles. The Meme Taste Test measures seven, by how often you laugh at memes in each style. Here's what each type says about you.</p>
<p><a class="btn" href="{root}">Find your humor type</a></p>
<div class="typelist">{''.join(arts)}</div>
<h2>How the type is chosen</h2>
<p>For each style, the test counts how many of its memes made you laugh, smoothed so a style with only a few memes can't win on one lucky swipe: (laughs + 1) ÷ (memes + 2). Your type is the style with the highest rate; your second-highest is your “side”. Comparing with a friend combines how often you agreed (both laughed or both passed) with how much your laughs overlap.</p>
<p><a class="btn" href="{root}">Take the test</a></p>
"""
        ld = [{"@context": "https://schema.org", "@type": "Article", "headline": "The 7 humor types: which one are you?",
               "dateModified": self.today.isoformat(), "mainEntityOfPage": self.url("humor-types/"), "inLanguage": "en",
               "author": {"@type": "Organization", "name": BRAND}, "publisher": {"@type": "Organization", "name": BRAND}}]
        self.write("humor-types/index.html", self.layout("humor-types/", f"The 7 humor types: what's your sense of humor? | {BRAND}",
                                                         "Absurd, wholesome, deadpan, dark, nerdy, puns or relatable: the seven humor types, what they say about you, and a free test to find yours.",
                                                         body, og="types", jsonld=ld, current="humor-types/", app=False))
        self.pages.append("humor-types/")

    def credits(self):
        arts = [it for it in self.deck["items"] if it["kind"] == "art"]
        lis = "".join(
            f'<li><a href="{attr(it["credit"]["url"])}" rel="noopener">{e(it["credit"]["title"])}</a>, {e(it["credit"]["artist"])}'
            f'{", " + e(it["credit"]["date"]) if it["credit"]["date"] else ""}. Caption: “{e(it["caption"])}”</li>' for it in arts)
        formats = ", ".join(e(it["format"]) for it in self.deck["items"] if it["kind"] == "format")
        sponsor = (f'<p><a href="{attr(self.sponsor_url)}" rel="noopener sponsored">{e(self.sponsor_label or "Support the Meme Taste Test")}</a></p>'
                   if self.sponsor_url else "")
        body = f"""
<h1>About the Meme Taste Test</h1>
<p class="lede">A two-minute humor test you take for yourself and share with friends. There's no matching with strangers, no account and no database.</p>
<h2>Privacy</h2>
<p>Your swipes stay in your browser. When you share, they're packed into the part of the link after the “#”, which browsers never send to any server. Anyone with your link can see which memes made you laugh; a result link holds both people's swipes. {'Visits are counted with GoatCounter, which sets no cookies and collects no personal data.' if self.goatcounter else 'No cookies and no analytics.'}</p>
<h2>Where the memes come from</h2>
<p>Every caption and text meme was written for this test. The paintings are public-domain works released under CC0 by The Metropolitan Museum of Art's Open Access program; the copies here were resized. Famous meme formats ({formats}) are described in words rather than copied, because the original images belong to their photographers.</p>
<p>The deck avoids memes about real people, politics, religion, sex and anyone's appearance.</p>
<h2>Artwork credits</h2>
<ul class="credits">{lis}</ul>
<h2>Open source</h2>
<p>The code is on <a href="{REPO_URL}">GitHub</a> (MIT). Problems or meme suggestions: <a href="{REPO_URL}/issues/new">open an issue</a>.</p>
{sponsor}
"""
        self.write("credits/index.html", self.layout("credits/", f"About, artwork credits and privacy | {BRAND}",
                                                     "How the Meme Taste Test works, where its memes and public-domain paintings come from, and why your swipes never leave your links.",
                                                     body, current="credits/", app=False))
        self.pages.append("credits/")

    def not_found(self):
        after = self.site_url.split("://", 1)[1]
        prefix = "/" + after.split("/", 1)[1] + "/" if "/" in after else "/"
        body = f'<h1>Page not found</h1><p>That page doesn\'t exist.</p><p><a class="btn" href="{prefix}">Take the Meme Taste Test</a></p>'
        self.write("404.html", self.layout("404.html", f"Page not found | {BRAND}", "That page doesn't exist. Take the Meme Taste Test instead.",
                                           body, noindex=True, root=prefix, app=False))

    def meta_files(self):
        lastmod = self.today.isoformat()
        urls = "".join(f"<url><loc>{self.url(p)}</loc><lastmod>{lastmod}</lastmod></url>\n" for p in self.pages)
        self.write("sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n')
        self.write("robots.txt", f"User-agent: *\nAllow: /\nSitemap: {self.site_url}/sitemap.xml\n")
        self.write(f"{INDEXNOW_KEY}.txt", INDEXNOW_KEY)
        self.write(".nojekyll", "")
        (self.out / "urls.txt").write_text("".join(self.url(p) + "\n" for p in self.pages), encoding="utf-8")

    def build(self):
        if self.out.exists():
            shutil.rmtree(self.out)
        shutil.copytree(ROOT / "site" / "assets", self.out / "assets")
        for name in ("app.js", "selftest.js"):
            f = self.out / "assets" / name
            f.write_text(f.read_text(encoding="utf-8").replace('from "./core.js"', f'from "./core.js?v={self.ver}"')
                         .replace('from "./patterns.js"', f'from "./patterns.js?v={self.ver}"')
                         .replace('import("./selftest.js")', f'import("./selftest.js?v={self.ver}")'), encoding="utf-8")
        shutil.copy(ROOT / "site" / "favicon.svg", self.out / "favicon.svg")
        self.home()
        self.compare()
        self.humor_types()
        self.credits()
        self.not_found()
        self.meta_files()
        return self


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / "dist"))
    args = ap.parse_args()
    today = dt.date.fromisoformat(os.environ["BUILD_DATE"]) if os.environ.get("BUILD_DATE") else dt.datetime.now(dt.timezone.utc).date()
    site = Site(Path(args.out), today).build()
    print(f"built {len(site.pages)} pages into {args.out}")


if __name__ == "__main__":
    main()
