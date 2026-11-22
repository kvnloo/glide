#!/usr/bin/env python3
"""Create a clean-room OBJ + WAV page for the GL-060 smoke check."""
import argparse
import json
import math
import struct
import wave
from pathlib import Path

HTML = r"""<!doctype html><meta charset="utf-8">
<title>Gold scene</title>
<style>
body { background: var(--glide-bg, #14100e); color: var(--glide-fg, #fff); font: 18px system-ui; text-align: center }
h1 { color: var(--glide-accent, #fff) }
canvas { display: block; margin: 1rem auto; background: var(--glide-surface, #251f1a); max-width: 100% }
</style>
<h1>Gold scene</h1>
<canvas width="400" height="280" aria-label="Rotating wireframe pyramid"></canvas>
<audio controls preload="metadata" src="media/tone.wav"></audio>
<script type="module">
const obj = (await (await fetch('media/pyramid.obj')).text()).trim().split('\n')
const points = obj.filter(l => l.startsWith('v ')).map(l => l.split(' ').slice(1).map(Number))
const faces = obj.filter(l => l.startsWith('f ')).map(l => l.split(' ').slice(1).map(n => Number(n) - 1))
const canvas = document.querySelector('canvas')
const g = canvas.getContext('2d')
function draw(time) {
  const c = Math.cos(time / 900), s = Math.sin(time / 900)
  g.clearRect(0, 0, canvas.width, canvas.height)
  g.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--glide-accent').trim() || '#fff'
  g.lineWidth = 3
  for (const face of faces) {
    g.beginPath()
    face.forEach((i, j) => {
      const [x, y, z] = points[i]
      const scale = 220 / (3.6 + z * c - x * s)
      g[j ? 'lineTo' : 'moveTo'](200 + (x * c + z * s) * scale, 140 - (y - z * .3) * scale)
    })
    g.closePath()
    g.stroke()
  }
  requestAnimationFrame(draw)
}
requestAnimationFrame(draw)
document.body.dataset.model = String(faces.length)
</script>
"""

OBJ = """v -1 -1 -1
v 1 -1 -1
v 1 -1 1
v -1 -1 1
v 0 1 0
f 1 2 3 4
f 1 2 5
f 2 3 5
f 3 4 5
f 4 1 5
"""


SAMPLE_RATE_HZ = 8000
CONCERT_A_HZ = 440
AMPLITUDE = 2500


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path)
    folder = parser.parse_args().destination.resolve()
    (folder / "media").mkdir(parents=True)
    page = folder / "index.html"
    page.write_text(HTML, encoding="utf-8")
    (folder / "media/pyramid.obj").write_text(OBJ, encoding="utf-8")
    with wave.open(str(folder / "media/tone.wav"), "wb") as tone:
        tone.setparams((1, 2, SAMPLE_RATE_HZ, 0, "NONE", "not compressed"))
        tone.writeframes(b"".join(
            struct.pack("<h", round(AMPLITUDE * math.sin(2 * math.pi * CONCERT_A_HZ * i / SAMPLE_RATE_HZ) * (1 - i / SAMPLE_RATE_HZ)))
            for i in range(SAMPLE_RATE_HZ)
        ))
    print(json.dumps({"id": "gold-scene", "title": "Gold scene", "path": str(page),
                      "how": "over", "assets": ["media/pyramid.obj", "media/tone.wav"]}))


if __name__ == "__main__":
    main()
