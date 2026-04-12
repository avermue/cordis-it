#!/bin/bash
cd ~/codium/cordis-it

# index.html
SRC_HTML=$(ls -t ~/Téléchargements/index*.html 2>/dev/null | head -1)
if [ -n "$SRC_HTML" ]; then
  cp "$SRC_HTML" index.html && rm "$SRC_HTML" && echo "✅ index.html copié et supprimé"
else
  echo "⚠ index.html non trouvé"
fi

# prepare_data.py
SRC_PY=$(ls -t ~/Téléchargements/prepare_data*.py 2>/dev/null | head -1)
if [ -n "$SRC_PY" ]; then
  cp "$SRC_PY" scripts/prepare_data.py && rm "$SRC_PY" && echo "✅ prepare_data.py copié et supprimé"
else
  echo "⚠ prepare_data.py non trouvé"
fi
