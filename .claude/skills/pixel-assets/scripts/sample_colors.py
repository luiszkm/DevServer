"""Print the dominant colors inside boxes of a reference image.

Use it to pull a new ramp out of the key art before adding it to references/palette.json.

    python3 sample_colors.py web/public/keyart.png 1245,755,45,60 90,770,90,80 --top 6

Each box is x,y,w,h in image pixels. Colors are bucketed (default step 12) so the
AI-upscaled noise in the key art collapses into the few tones the artist meant.
"""
import argparse
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(__file__))
import png  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("boxes", nargs="+", help="x,y,w,h")
    ap.add_argument("--top", type=int, default=6)
    ap.add_argument("--step", type=int, default=12)
    args = ap.parse_args()
    rows = png.read(args.image)
    s = args.step
    for box in args.boxes:
        x, y, w, h = map(int, box.split(","))
        counts = Counter()
        for row in rows[y:y + h]:
            for r, g, b, _ in row[x:x + w]:
                counts[(r // s * s + s // 2, g // s * s + s // 2, b // s * s + s // 2)] += 1
        total = sum(counts.values())
        tones = ", ".join(f"#{r:02x}{g:02x}{b:02x} {n * 100 // total}%" for (r, g, b), n in counts.most_common(args.top))
        print(f"{box}: {tones}")


if __name__ == "__main__":
    main()
