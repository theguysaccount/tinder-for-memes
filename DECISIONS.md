# Decisions

1. **Friends first, as a shareable quiz.** Settles "dating or friendship first?" in the evaluator's direction: the compare link has no cold start and no safety obligations. Matching strangers needs accounts, moderation and age checks.
2. **Name: "Meme Taste Test".** Settles "final name?" for v1 on what people search ("meme test", "humor type quiz"). The repo keeps the idea's working name; "Tinder" is a trademark and stays out of the product. `mememates.org` (owned) can redirect.
3. **Memes with clear rights only.** Public-domain paintings released CC0 by The Met with original captions, original text memes, and famous formats described in words. No scraped images, no hotlinked templates, no user uploads (which would need moderation).
4. **Images hosted in the repo.** The Art Institute of Chicago's image server sits behind a Cloudflare challenge and wasn't used. The Met's API and images were reachable; 28 resized copies (about 2 MB) load fast from Pages and don't depend on a third party staying up.
5. **One bit per meme in the link.** 50 swipes, a name and a checksum fit in 22 characters; a truncated link is caught by the checksum.
6. **Deck 1 is frozen.** Links index memes by position. New memes go into a new deck; the live self-test fails if deck 1 ever drifts.
7. **Smoothed style rates.** Styles have different numbers of memes (5 to 25), so a type is chosen by (laughs + 1) / (memes + 2), which stops a small style winning on one swipe.
8. **Match = half agreement, half overlap.** Agreement alone rewards two people who both hate everything; overlap alone ignores shared dislikes. The blend is explained on the humor-types page.
9. **Monthly rotation is a key.** Writing captions needs AI, which can't run in Actions. The monthly workflow checks licenses; a Claude routine (OPERATIONS.md) can build deck 2 from the screened backlog.
