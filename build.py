# Assemble Putt League Brewery into one HTML page (three.js r128 from cdnjs, everything else inline).
import sys, os
D = os.path.dirname(os.path.abspath(__file__)); S = os.path.join(D, 'src')
local = '--local' in sys.argv
shell = open(os.path.join(S, 'shell.html')).read()
js = ''.join(open(os.path.join(S, f)).read() + '\n' for f in ['flightline-physics.js', 'flightline-basket.js', 'ddm-materials.js', 'ddm-contact.js', 'course.js', 'scene.js'])
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
