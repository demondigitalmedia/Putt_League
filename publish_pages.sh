#!/bin/sh
# Rebuild and publish the public test page (GitHub Pages serves the gh-pages branch).
set -e
python3 build.py
T=$(mktemp -d)
cp docs/index.html "$T/index.html"; touch "$T/.nojekyll"
cd "$T" && git init -q -b gh-pages && git add -A && git commit -q -m "Public test build" && git push -f -q "$(git -C "$OLDPWD" remote get-url origin)" gh-pages
echo "Published: https://demondigitalmedia.github.io/Putt_League/"
