# reuse-checked: rendered-ui-qualification rules 33/37/42 (layout.json rects, contrast per leaf, block alignment) + launch-videos-library references/omp-card-grammar.md (omp numbers). No existing scorer covers real-Tern Glide cards; this composes those checks.
"""Pixel rubric for Glide cards in the studio Tern (1060x596, font 13, dash).

Usage: glide/tools/tern_rubric.py SHOT_DIR NAME [NAME...] [-v] [--card=<class>]
Prints a table, writes SHOT_DIR/rubric.json and exits 1 if any criterion fails. Each NAME needs NAME.png and
NAME.layout.json from `tern ctl shot`. The lowest card (the newest reply) is judged. Criteria: docs/DESIGN-LANGUAGE.md §7.
Calibration: an omp shot scored with --card=sf-tool-body passes every grammar criterion (R05-R17).
"""
import colorsys, json, math, sys
from pathlib import Path
from PIL import Image

STAGE = (12, 12, 10)
TOKENS = {'fg': (0xEC, 0xE8, 0xDF), 'muted': (0xBB, 0xB5, 0xA9), 'dim': (0xAC, 0xA7, 0x9D), 'gold': (0xD7, 0xB9, 0x86)}
GOLD_HUE = colorsys.rgb_to_hsv(*[c / 255 for c in TOKENS['gold']])[0] * 360
COL_X, COL_W = 90, 880          # omp transcript column
COMPOSER = (162, 736)           # omp composer x, width
RADIUS, INSET = 8, 14           # omp flat box
FONT_SCALE = {10.0, 10.5, 11.0, 11.5, 12.0, 13.0}  # omp text scale; one hero size per card allowed


def rgba(s):
    if not s or not s.startswith('rgb'):
        return None
    v = [float(x) for x in s[s.index('(') + 1:s.index(')')].replace('/', ',').split(',') if x.strip()]
    return (v[0], v[1], v[2], v[3] if len(v) > 3 else 1.0)


def lum(c):
    def ch(x):
        x /= 255
        return x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4
    return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2])


def contrast(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def dist(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a[:3], b[:3])))


def leaf(e):
    return e['path'].split('>')[-1]


def judge(d, name, sel='eu-card'):
    L = json.loads((d / f'{name}.layout.json').read_text())
    im = Image.open(d / f'{name}.png').convert('RGB')
    px = im.load()
    W, H = im.size
    E = [e for e in L['elements'] if e.get('visible') and e['rect'][2] > 0 and e['rect'][3] > 0]
    res = {}

    def put(k, ok, val):
        res[k] = ('PASS' if ok else 'FAIL', val)

    tab = max((e['rect'][1] + e['rect'][3] for e in E if leaf(e).startswith('div.tb-in')), default=40)
    dock = min((e['rect'][1] for e in E if leaf(e).startswith('div.tv-dock')), default=446)
    veil = next((rgba(e['backgroundColor']) for e in L['elements'] if e['path'].endswith('tn-veil')), None)
    put('R01 stage dash', veil is not None and dist(veil, STAGE) < 2, veil and tuple(round(x) for x in veil[:3]))
    put('R02 no error lines', not any('sf-t-error' in e['path'] for e in E), sum('sf-t-error' in e['path'] for e in E))
    cards = [e for e in E if sel in leaf(e) and e['rect'][1] + e['rect'][3] > tab]
    if not cards:
        put('R00 card present', False, 'no card')
        return res
    card = max(cards, key=lambda e: e['rect'][1] + e['rect'][3])
    cx, cy, cw, ch = card['rect']
    cp = card['path']
    # sibling cards share path strings, so a descendant must also start inside this card's span
    inside = [e for e in E if e['path'].startswith(cp + '>') and cy - 1 <= e['rect'][1] < cy + ch]
    put('R03 head clear of top fade', cy >= tab + 14 - 0.5, f'y={cy:.0f} need>={tab + 14:.0f}')  # transcript fades its top 14px (measured)
    # the reply = card + rows drawn after it (notes, Refresh) until the dock
    below = [e for e in E if e['rect'][1] >= cy + ch - 1 and e['rect'][1] < dock and not e['path'].startswith(cp)
             and 'tv-dock' not in e['path'] and e['rect'][3] < 60 and e['rect'][2] < 1000]
    bottom = max([cy + ch] + [e['rect'][1] + e['rect'][3] for e in below])
    put('R04 reply above dock', bottom <= dock + 0.5, f'bottom={bottom:.0f} dock={dock:.0f}')
    blk = max((e for e in E if 'sf-main' in leaf(e) and cp.startswith(e['path'])), key=lambda e: len(e['path']), default=None)
    bx, bw_ = (blk['rect'][0], blk['rect'][2]) if blk else (16, 1028)
    want_w = min(COL_W, bw_ - 32)
    want_x = bx + (bw_ - want_w) / 2 if want_w == COL_W else bx + 16
    hd = next((e for e in inside if leaf(e).startswith('header.sf.sf-el.eu-h')), None)
    if hd:
        put('R17 head row <=30 (omp 30)', hd['rect'][3] <= 30.5, f"{hd['rect'][3]:.0f}px")
    put('R05 column (omp 880, centred)', abs(cx - want_x) <= 1 and abs(cw - want_w) <= 1, f'x={cx:.0f}/{want_x:.0f} w={cw:.0f}/{want_w:.0f}')
    comp = [e for e in E if leaf(e).startswith('div.sf.sf-col') and 'sf-dock' in e['path'] and abs(e['rect'][2] - COMPOSER[1]) < 40]
    if comp:
        x, _, w, _ = comp[0]['rect']
        put('R06 composer 162/736', abs(x - COMPOSER[0]) <= 1 and abs(w - COMPOSER[1]) <= 1, f'x={x:.0f} w={w:.0f}')
    # clipping: descendants outside the card, or below a capped scroll box they live in
    over = [leaf(e)[:30] for e in inside if e['rect'][0] + e['rect'][2] > cx + cw + 1 or e['rect'][0] < cx - 1]
    boxes = [e for e in inside if any(k in leaf(e) for k in ('is-stage', 'is-notes'))]
    clipped = []
    for b in boxes:
        bb = b['rect'][1] + b['rect'][3]
        for e in inside:
            if e['path'].startswith(b['path'] + '>') and e['rect'][1] < bb and e['rect'][1] + e['rect'][3] > bb + 1 \
                    and not any(k in leaf(e) for k in ('is-pane', 'is-hero', 'is-side', 'is-flist', 'is-frow', 'svg')):
                clipped.append(leaf(e)[:30])
    put('R07 nothing clipped', not over and not clipped, (over + clipped)[:4] or 0)
    # pixels: radius, border, shadow
    x0, y0 = int(round(cx)), int(round(cy))
    inner = px[min(W - 1, x0 + cw // 2), min(H - 1, y0 + 6)]
    outside = px[max(0, x0 - 6), min(H - 1, y0 + int(ch) // 2)]
    edge_c = px[x0, min(H - 1, y0 + int(ch) // 2)]
    # radius: on the top border row, how far in from the card edge the border line starts (omp reads 8)
    def bright(y):
        return dist(px[min(W - 1, x0 + int(cw) // 2), y], outside)
    yb_top = max(range(max(0, y0 - 1), y0 + 3), key=bright)
    lvl = max(4.0, bright(yb_top) / 2)
    offs = []
    for k in range(0, 16):  # first-ink x offset per row down the top-left corner
        y = yb_top + k
        offs.append(next((q for q in range(0, 24) if y < H and dist(px[x0 + q, y], outside) > lvl), 24))
    def model(r, k):
        return r - math.sqrt(max(0.0, r * r - (r - k - 0.5) ** 2)) if k < r else 0.0
    r_est = min((sum((model(r / 2, k) - o) ** 2 for k, o in enumerate(offs)), r / 2) for r in range(0, 61))[1]
    put('R08 radius 8', abs(r_est - RADIUS) <= 1.5, f'{r_est:.1f}px')
    midy = y0 + int(ch) // 2
    bw = 0
    for k in range(0, 6):
        c = px[x0 + k, midy]
        if dist(c, inner) > 4 and dist(c, outside) > 4:
            bw += 1
        elif bw:
            break
    put('R09 border 1px', bw == 1, f'{bw}px')
    def band(y1, y2):
        s = [px[x, y] for y in range(max(0, y1), min(H, y2)) for x in range(x0 + 20, x0 + int(cw) - 20, 7)]
        return tuple(sum(c[i] for c in s) / max(1, len(s)) for i in range(3)) if s else outside
    # shadow/glow: the 2-6px band just outside the card must equal the stage beside it (omp 0.0)
    yb = int(round(cy + ch))
    shadow = max(dist(band(yb + 2, yb + 6), outside), dist(band(y0 - 6, y0 - 2), outside) if y0 - 6 > tab else 0)
    put('R10 no shadow/glow', shadow < 2.0, f'd={shadow:.1f}')
    # inset: first glyph-ink column right of the card edge, below the head (omp ink inset 13-15)
    ink_in = None
    for k in range(2, 80):
        col = [px[x0 + k, y] for y in range(y0 + (30 if sel == 'eu-card' else 3), min(H, y0 + int(ch) - 3))]
        if sum(1 for c in col if sum(c) / 3 - sum(inner) / 3 > 45) >= 2:
            ink_in = k
            break
    put('R11 inset 14', ink_in is not None and 12 <= ink_in <= 16, f'{ink_in}px')
    texts = [e for e in inside if rgba(e.get('color')) and (e.get('text') or '').strip() and e['rect'][3] < 40]
    # contrast + palette per text leaf
    def bg_of(e):
        p = e['path']
        best = None
        for o in E:
            if p.startswith(o['path']) and (best is None or len(o['path']) > len(best['path'])):
                c = rgba(o.get('backgroundColor'))
                if c and c[3] > 0.5:
                    best = o
        c = rgba(best['backgroundColor']) if best else None
        return c[:3] if c else STAGE
    worst, offpal = 99.0, set()
    for e in texts:
        c = rgba(e['color'])
        if c[3] < 0.5:
            continue
        worst = min(worst, contrast(c, bg_of(e)))
        h, s, v = colorsys.rgb_to_hsv(*[x / 255 for x in c[:3]])
        if s > 0.2 and v > 0.3 and abs(h * 360 - GOLD_HUE) > 12:
            offpal.add(tuple(round(x) for x in c[:3]))
    put('R12 text contrast >=4.5', worst >= 4.5, round(worst, 2))
    put('R13 only gold hue (text)', not offpal, sorted(offpal)[:3] or 0)
    hues = 0
    for y in range(y0 + 2, min(H, y0 + int(ch) - 2), 3):
        for x in range(x0 + 2, x0 + int(cw) - 2, 3):
            h, s, v = colorsys.rgb_to_hsv(*[c / 255 for c in px[x, y]])
            if s > 0.35 and v > 0.35 and abs(h * 360 - GOLD_HUE) > 15:
                hues += 1
    def med(y1, y2):
        v = sorted(sum(px[x, y]) / 3 for y in range(y1, y2) for x in range(x0 + 40, x0 + int(cw) - 40, 5))
        return v[len(v) // 2] if v else 0
    headd = abs(med(y0 + 3, y0 + 8) - med(y0 + int(ch) - 8, y0 + int(ch) - 3))
    put('R16 flat head (no tint)', headd < 2.5, f'd={headd:.1f}')
    put('R14 only gold hue (pixels)', hues <= 3, hues)
    sizes = sorted({round(float(e['fontSize'].rstrip('px')) * 2) / 2 for e in texts if e.get('fontSize')})
    extra = [s for s in sizes if s not in FONT_SCALE]
    put('R15 type scale', len(extra) <= 1, f'{sizes}')
    return res


def main():
    d = Path(sys.argv[1])
    out, fails = {}, 0
    sel = next((a.split('=', 1)[1] for a in sys.argv if a.startswith('--card=')), 'eu-card')
    for n in [a for a in sys.argv[2:] if not a.startswith('-')]:
        r = judge(d, n, sel)
        out[n] = r
        nf = sum(v[0] == 'FAIL' for v in r.values())
        fails += nf
        print(f'== {n}: {len(r) - nf}/{len(r)}')
        for k, (st, val) in r.items():
            if st == 'FAIL' or '-v' in sys.argv:
                print(f'   {st} {k}: {val}')
    (d / 'rubric.json').write_text(json.dumps(out, indent=1))
    print('TOTAL FAIL', fails)
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
