"""Render the 1200x630 Open Graph cards in site/assets/og/ with headless Chrome: python3 scripts/og.py"""
import html
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "assets" / "og"
CHROME = os.environ.get("CHROME") or next(
    (c for c in [shutil.which("google-chrome"), shutil.which("chromium"),
                 "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"] if c and Path(c).exists()), None)
CARD = """<!doctype html><html><head><meta charset="utf-8"><style>
html,body{{margin:0;width:1200px;height:630px;overflow:hidden}}
body{{background:linear-gradient(135deg,#1b1530,#3b1f4f);color:#fff;font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
 display:flex;gap:48px;align-items:center;padding:56px 64px;box-sizing:border-box}}
img{{width:420px;height:518px;object-fit:cover;border-radius:22px;box-shadow:0 10px 40px rgba(0,0,0,.4)}}
.t{{display:flex;flex-direction:column;justify-content:center}}
.top{{font-size:34px;font-weight:800;color:#ffd166;margin-bottom:24px}}
h1{{font-size:62px;line-height:1.08;margin:0 0 22px;font-weight:900}}
p{{font-size:28px;color:#e6dcf5;margin:0}}
</style></head><body><img src="{img}"><div class="t"><div class="top">😂 Meme Taste Test</div><h1>{title}</h1><p>{sub}</p></div></body></html>"""


def render(name, img, title, sub, work):
    page = work / f"{name}.html"
    page.write_text(CARD.format(img=(ROOT / "site" / "assets" / img).as_uri(), title=html.escape(title), sub=html.escape(sub)), encoding="utf-8")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-first-run", "--hide-scrollbars", f"--user-data-dir={work / 'p'}",
                    "--allow-file-access-from-files", "--window-size=1200,630", "--virtual-time-budget=3000",
                    f"--screenshot={OUT / (name + '.png')}", page.as_uri()], check=True, capture_output=True)
    print(OUT / f"{name}.png")


if __name__ == "__main__":
    if not CHROME:
        raise SystemExit("Chrome not found; set CHROME")
    OUT.mkdir(parents=True, exist_ok=True)
    work = Path(tempfile.mkdtemp())
    try:
        render("home", "memes/met-437465.jpg", "What's your humor type?", "Swipe 50 memes, then see whose humor matches yours.", work)
        render("types", "memes/met-437859.jpg", "The 7 humor types", "Absurd, wholesome, deadpan, dark, nerdy, puns or relatable?", work)
    finally:
        shutil.rmtree(work)
