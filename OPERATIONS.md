# Operations

The Meme Taste Test is a static site on GitHub Pages. Swipes live only in the browser and in links people share; there is no server or database. Actions runs the deploy, a weekly self-test and a monthly license check.

**Live:** https://theguysaccount.github.io/tinder-for-memes/
**Repo:** https://github.com/theguysaccount/tinder-for-memes

## Automated jobs

| Job | Workflow | When | What it does | How it fails safe |
|---|---|---|---|---|
| Deploy | `pages.yml` | every push to `main` | Deck checks (50 memes, images present and small, credits, styles, content rules), encoding and scoring tests, build, three end-to-end runs in headless Chrome (swipe a deck and get a type, answer a compare link, open a result), deploy, the same runs live, IndexNow | Any failure stops before deploy; the last good site stays live. |
| Self-test + keep-alive | `selftest.yml` | Fridays 17:19 UTC | Tests; the three end-to-end runs on the **live** site; every page answers 200 with its canonical; all 28 meme images load; the live deck 1 equals `data/deck.json`. Then the keep-alive. | Failure opens or comments on one `ops-alert` issue; GitHub emails the owner. The site is untouched. |
| License check | `licenses.yml` | the 7th of every month | Asks The Met's Open Access API whether each of the 28 paintings is still public domain (1.5 s between requests) | A painting that's no longer public domain fails the run and opens an issue. An API refusal or timeout is only a warning. |
| Keep-alive | `selftest.yml` → `scripts/keepalive.sh` | weekly | Re-enables every scheduled workflow; empty `[skip ci]` commit after 45 days without commits | Nothing else commits here, so this keeps the schedules alive past GitHub's 60-day cutoff. |

## Content rules (why the deck is safe to host)

- **Paintings:** public-domain works The Met releases under CC0, resized copies hosted here. Credited on the About page with links to The Met.
- **Captions and text memes:** written for this site.
- **Famous formats** (Distracted boyfriend, Expanding brain, This is fine, Two buttons, Is this a pigeon?, Woman yelling at cat): described in words only. Their images belong to their photographers and artists and are never copied or hotlinked.
- No real people, politics, religion, sex or jokes about appearance. `tests/test_deck.py` checks for some of these words.

## What to watch

- **Open `ops-alert` issues** from the self-test or the license check.
- **Never edit deck 1.** Compare links index into it by position. Changes go into a new deck (see "Replacing a meme").

## Replacing a meme, or rotating in new ones

1. Copy deck 1 to a new key (`"2"`) in `data/deck.json`, swap or add memes there, and set `DECK_ID = "2"` in `site/assets/app.js`. Old links keep decoding against deck 1.
2. New paintings: pick from the screened list in `data/backlog.md`, or search The Met's API (`/public/collection/v1.1/search?isPublicDomain=true&hasImages=true&q=...`), confirm `isPublicDomain`, resize to 640px.
3. Run `python3 -m unittest discover -s tests`, `node --test tests/js/*.test.mjs`, `node scripts/fixture.mjs > tests/fixtures/links.json` (the self-test uses it), `scripts/e2e.sh`. Push.

## Keys Jack can turn later

### 1. Monthly content routine

The brief's monthly "rotate in fresh memes" needs AI-written captions, which can't run in Actions. Schedule a Claude Code routine (claude.ai/code → Routines) for the 1st of each month on this repo:

> In theguysaccount/tinder-for-memes: create the next deck in data/deck.json by copying the newest deck and replacing 10 memes with new ones, using data/backlog.md (screened public-domain paintings from The Met, caption seeds, format ideas). Follow the content rules in OPERATIONS.md: original captions, CC0 paintings only (confirm isPublicDomain with The Met's API), formats described in words, no real people, politics, religion, sex or appearance jokes. Point DECK_ID in site/assets/app.js at the new deck, regenerate tests/fixtures/links.json, run all tests and scripts/e2e.sh, then commit and push. Remove used seeds from the backlog.

### 2. Custom domain

No domain matched in the portfolio for this idea; the one related owned name is `mememates.org` (listed as a redirect; the note rejected "mememates" as a brand as "too girly"). Candidates:

| # | Domain | Note |
|---|---|---|
| 1 | `mememates.org` | owned (DNS at SiteGround, resolving to 216.150.1.1 today); free; at least a redirect, even if not the brand |
| 2 | `memetastetest.com` | unregistered on 2026-10-25 (WHOIS), about $11/yr; matches the product name |
| 3 | `humortypes.com` | unregistered on 2026-10-25 (WHOIS), about $11/yr; matches the search. (`humortype.com` is taken.) |

Steps once chosen: DNS `A @` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (and `AAAA @` → `2606:50c0:8000::153` … `8003::153`), `CNAME www` → `theguysaccount.github.io`; Settings → Pages → Custom domain, then Enforce HTTPS; repo variable `SITE_URL` = `https://<domain>`; `gh workflow run pages.yml -R theguysaccount/tinder-for-memes`.

### 3. Money: sponsor slot

Pages is non-commercial; there's no checkout. The slot is a link under every result and on the About page, hidden until set: repo variables `SPONSOR_URL` (and optionally `SPONSOR_LABEL`, e.g. "Sponsored by …"). An ad network would need an account and a cookie banner, which the site avoids today.

### 4. Analytics

Off by default. Events in the code: `swipe_start`, `swipe_complete` (**activation**), `share/<channel>`, `card_open`, `card_share`, `compare_opened`, `compare_complete/<bucket>`, `result_opened`, `own_from_result` (**the loop**). Set `GOATCOUNTER_URL` = `https://<code>.goatcounter.com/count` and redeploy.

### 5. Search Console

Verify in Google Search Console and submit `/sitemap.xml`. IndexNow runs on every deploy.
