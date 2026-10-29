#!/usr/bin/env bash
# Ejecuta un paso de la CI y, si falla, publica las últimas líneas relevantes
# como anotación de error: se ven en el pull request sin abrir el log completo.
# Uso: bash .github/ci-paso.sh "Nombre del paso" comando arg1 arg2…
set -uo pipefail
nombre=$1
shift
salida=$(mktemp)
"$@" 2>&1 | tee "$salida"
estado=${PIPESTATUS[0]}
if [ "$estado" -ne 0 ]; then
  resumen=$(grep -E "error|Error|ERR|failing|✘|[0-9]+\) |AssertionError|expected|TS[0-9]{4}" "$salida" | tail -n 40)
  [ -z "$resumen" ] && resumen=$(tail -n 40 "$salida")
  # %0A = salto de línea dentro de una anotación de GitHub Actions
  mensaje=$(printf '%s' "$resumen" | sed 's/%/%25/g' | awk 'BEGIN{ORS="%0A"} {print}')
  echo "::error title=${nombre} falló::${mensaje}"
fi
exit "$estado"
