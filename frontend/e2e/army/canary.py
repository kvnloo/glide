"""Copy a static build, then inject defects into that copy only."""
import json
from pathlib import Path
import shutil

DEFECTS = [
    {'id': 'dead-button', 'selector': '.fh-needs', 'expected': 'Needs you filters blocked agents',
     'terms': ['needs you', 'button', 'click', 'nothing', 'respond', 'dead', 'filter']},
    {'id': 'black-light-surface', 'selector': '[data-scheme=light] .fh-root',
     'expected': 'Light theme uses the light surface token',
     'terms': ['black', 'dark', 'light', 'theme', 'surface', 'background']},
    {'id': 'phone-clipped-label', 'selector': '.fh-title at <=390px',
     'expected': 'Hosts title is readable at phone width',
     'terms': ['clip', 'truncat', 'label', 'title', 'phone', 'hosts']},
    {'id': 'wrong-stat', 'selector': '.fh-count', 'expected': 'Online count equals the host fixture',
     'terms': ['99', 'count', 'stat', 'number', 'online', 'incorrect', 'wrong']},
]


def prepare_site(source: Path, dest: Path, enabled: bool):
    source, dest = source.resolve(), dest.resolve()
    if source == dest or source in dest.parents or dest in source.parents:
        raise ValueError('served copy must be separate from source')
    if not (source / 'fleet.html').is_file():
        raise ValueError('KIT_DIR must contain fleet.html')
    # Reject symlinks before copying so outside files cannot enter the payload.
    for path in source.rglob('*'):
        if path.is_symlink():
            raise ValueError('kit contains a symlink; provide a self-contained built directory')
    shutil.copytree(source, dest, dirs_exist_ok=True, symlinks=False)
    if enabled:
        html = dest / 'fleet.html'
        html.write_text(html.read_text().replace('</body>', '<script src="army-canary.js"></script></body>'))
        (dest / 'army-canary.js').write_text('''
(() => {
  const css = document.createElement('style');
  css.textContent = `[data-scheme="light"] .fh-root { background: #000 !important; }
    @media(max-width:390px) { .fh-title { display:block!important; max-width:18px!important;
      overflow:hidden!important; white-space:nowrap!important; text-overflow:clip!important; } }`;
  document.head.append(css);
  document.addEventListener('click', event => {
    if (event.target.closest('.fh-needs')) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  const patch = () => {
    const count = document.querySelector('.fh-count');
    if (count && count.textContent !== '99/6 online') count.textContent = '99/6 online';
  };
  new MutationObserver(patch).observe(document.body, { childList:true, subtree:true });
  patch();
})();
''')
    return {'enabled': enabled, 'defects': DEFECTS if enabled else []}


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('dest', type=Path)
    parser.add_argument('--canary', action='store_true')
    parser.add_argument('--manifest', type=Path, required=True)
    args = parser.parse_args()
    args.manifest.write_text(json.dumps(prepare_site(args.source, args.dest, args.canary), indent=2))
