# Assemble Putt League into one HTML page (three.js r128 from cdnjs, everything else inline).
# Every venue in src/venues/ goes in (<id>.js, then <id>.scene.js); the first registered is the default, ?venue=<id> picks another.
import sys, os
D = os.path.dirname(os.path.abspath(__file__)); S = os.path.join(D, 'src')
venues = sorted(f for f in os.listdir(os.path.join(S, 'venues')) if f.endswith('.js'))
venues.sort(key=lambda f: (f != 'taproom.js' and f != 'taproom.scene.js', f))   # the Taproom stays the default
local = '--local' in sys.argv
shell = open(os.path.join(S, 'shell.html')).read()
js = ''.join(open(os.path.join(S, f)).read() + '\n' for f in ['flightline-physics.js', 'flightline-basket.js', 'ddm-materials.js', 'ddm-contact.js', 'venues.js'] + ['venues/' + v for v in venues] + ['course.js', 'scene.js'])
game = open(os.path.join(S, 'game.js')).read()
boot = """(function () {
  var run = function () { if (run.done) return; run.done = true;
""" + game + """
  };
  try {
    var f = document.fonts;
    if (f && f.load) Promise.race([Promise.all([f.load('40px Bangers'), f.load('700 30px "Barlow Condensed"'), f.load('30px "Permanent Marker"')]), new Promise(function (r) { setTimeout(r, 2500); })]).then(run, run);
    else run();
  } catch (e) { run(); }
})();
"""
three = '<script src="three.min.js"></script>' if local else '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>'
html = shell + '\n' + three + '\n<script>\n' + js + '\n</script>\n<script>\n' + boot + '</script>\n'
out = os.path.join(D, 'dist', 'putt-league-taproom' + ('-local' if local else '') + '.html')
os.makedirs(os.path.dirname(out), exist_ok=True); open(out, 'w').write(html)
print(out, len(html))
# the public test build for GitHub Pages: the same page wrapped in a full document (docs/index.html)
if not local:
    page = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<meta name="theme-color" content="#120c08"><style>html,body{margin:0;height:100%;background:#120c08}'
            '[hidden]{display:none!important}</style></head><body>' + html + '</body></html>\n')
    docs = os.path.join(D, 'docs', 'index.html')
    os.makedirs(os.path.dirname(docs), exist_ok=True); open(docs, 'w').write(page)
    open(os.path.join(D, 'docs', '.nojekyll'), 'w').write('')
    print(docs, len(page))
