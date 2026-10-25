# Meme Taste Test

**Live:** https://theguysaccount.github.io/tinder-for-memes/ · **Screens:** [docs/screens](docs/screens/)

Swipe 50 memes, get your humor type, and send a link so friends can see whose humor matches yours. No matching of strangers, no account, nothing stored: swipes are packed into the link itself (one bit per meme, plus a checksum, 22 characters).

- **The deck:** 28 public-domain paintings from The Met (CC0) with original captions, 16 original text memes, and 6 famous meme formats described in words (never copied).
- **Seven humor types:** absurd, wholesome, deadpan, dark, nerdy, puns, relatable. Your type is the style you laugh at most (smoothed so a small style can't win on one swipe).
- **Compare:** a friend swipes the same 50 and sees your match, both types, and the memes you both loved; they can send the result back.
- **Share card** drawn in the browser.

## How it runs

| What | Where | When |
|---|---|---|
| Tests, build, three headless-Chrome end-to-end runs, deploy, live runs, IndexNow | `.github/workflows/pages.yml` | every push |
| Live end-to-end runs, page, image and deck checks, keep-alive | `.github/workflows/selftest.yml` | weekly |
| Confirm every painting is still public domain at The Met | `.github/workflows/licenses.yml` | monthly |

Content rules, deck rotation and the keys for a domain, sponsor link and analytics: [OPERATIONS.md](OPERATIONS.md).

## Run, test, deploy

```bash
python3 pipeline/build.py && python3 -m http.server -d dist 8000
python3 -m unittest discover -s tests        # deck and build
node --test tests/js/*.test.mjs              # encoding, profile, comparison
scripts/e2e.sh                               # swipe the built site in headless Chrome
python3 scripts/check_licenses.py            # ask The Met about every painting
```

Deploy is a push to `main`.

## License

Code: MIT. Captions and text memes: CC BY 4.0. Paintings: public domain (CC0) via The Metropolitan Museum of Art Open Access; see the About page for each work.
