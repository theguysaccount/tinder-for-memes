# Product: Meme Taste Test (Tinder for Memes, friends-first)

**User.** Young, online people who bond over humor: friends in a group chat, new couples, people deciding whether a match "gets" them.

**Painful job.** You can't tell from a profile whether someone shares your sense of humor, and humor is one of the first things people say they look for in friends and partners.

**Promise.** Two minutes of swiping tells you your humor type, and one link tells you how well anyone's humor matches yours.

**Wedge.** The compare link: every result is an invitation, and every friend who compares gets their own link to send on. The humor-types page answers "what's my sense of humor" and "meme personality test" searches.

**Why now.** Meme-sharing is how people show personality online, and "send me your results" quizzes travel well in group chats. A static site with no accounts can launch today and costs nothing to run.

**Activation metric.** `swipe_complete` (finished all 50). Loop metrics: compare links opened per completion, `own_from_result`.

**First revenue event.** A sponsor link under results (`SPONSOR_URL`). Later, if friends-matching proves out, a paid "see who likes your memes" tier on separate hosting.

**What v1 deliberately won't do.**
- Match strangers, run chat or dating features (moderation, age verification and safety duties).
- Host memes without clear rights: no scraped or uploaded images.
- Use jokes about real people, politics, religion, sex or appearance.
