#!/bin/bash
cd ~/codium/cordis-it

DL=~/Téléchargements

# ── Créer les dossiers si nécessaire ──
mkdir -p css js data scripts

# ── index.html ──
SRC=$(ls -t "$DL"/index*.html 2>/dev/null | head -1)
if [ -n "$SRC" ]; then
  cp "$SRC" index.html && rm "$SRC" && echo "✅ index.html"
else
  echo "⚠ index.html non trouvé"
fi

# ── CSS ──
SRC=$(ls -t "$DL"/style*.css 2>/dev/null | head -1)
if [ -n "$SRC" ]; then
  cp "$SRC" css/style.css && rm "$SRC" && echo "✅ css/style.css"
else
  echo "⚠ style.css non trouvé"
fi

# ── JS modules ──
for name in data app sidebar cards budget partners disciplines geography timeline modal; do
  SRC=$(ls -t "$DL"/${name}*.js 2>/dev/null | head -1)
  if [ -n "$SRC" ]; then
    cp "$SRC" js/${name}.js && rm "$SRC" && echo "✅ js/${name}.js"
  else
    echo "⚠ ${name}.js non trouvé"
  fi
done

# ── Data (geo-paths.json) ──
SRC=$(ls -t "$DL"/geo-paths*.json 2>/dev/null | head -1)
if [ -n "$SRC" ]; then
  cp "$SRC" data/geo-paths.json && rm "$SRC" && echo "✅ data/geo-paths.json"
else
  echo "⚠ geo-paths.json non trouvé"
fi

# ── prepare_data.py ──
SRC=$(ls -t "$DL"/prepare_data*.py 2>/dev/null | head -1)
if [ -n "$SRC" ]; then
  cp "$SRC" scripts/prepare_data.py && rm "$SRC" && echo "✅ scripts/prepare_data.py"
else
  echo "⚠ prepare_data.py non trouvé"
fi

echo ""
echo "── Vérifications ──"
echo "index.html : $(wc -l < index.html 2>/dev/null || echo '?') lignes"
echo "style.css  : $(wc -l < css/style.css 2>/dev/null || echo '?') lignes"
for f in js/*.js; do
  open=$(grep -o '{' "$f" | wc -l)
  close=$(grep -o '}' "$f" | wc -l)
  if [ "$open" = "$close" ]; then
    printf "✅ %-20s {%d }%d\n" "$(basename $f)" "$open" "$close"
  else
    printf "❌ %-20s {%d }%d  DÉSÉQUILIBRE!\n" "$(basename $f)" "$open" "$close"
  fi
done
