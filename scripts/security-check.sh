#!/usr/bin/env bash
# ============================================================
# Uji keamanan runtime — Prioritas 1 (Semesta POS)
#
# Pemakaian:
#   KASIR_PIN=<pin> ADMIN_USER=<user> ADMIN_PASS=<pass> \
#     B=http://localhost:3000 bash scripts/security-check.sh
#
# Kredensial dibaca dari ENV — tidak ada nilai rahasia di repo ini.
# ============================================================
set -u
B=${B:-http://localhost:3000}
: "${KASIR_PIN:?set KASIR_PIN}"
: "${ADMIN_USER:?set ADMIN_USER}"
: "${ADMIN_PASS:?set ADMIN_PASS}"

JAR="_cookies_kasir.txt"
AJAR="_cookies_admin.txt"
rm -f "$JAR" "$AJAR"

code() { curl -s -o /dev/null -w "%{http_code}" -m 5 "$@"; }
loc()  { curl -s -o /dev/null -D - -m 5 "$@" | tr -d '\r' | awk 'tolower($1)=="location:"{print $2}'; }

echo "===================== UJI KEAMANAN PRIORITAS 1 =====================

[1] Halaman admin TANPA login (harap 307 -> /login)"
c=$(code "$B/dashboard"); l=$(loc "$B/dashboard")
echo "    GET /dashboard -> HTTP $c  Location: $l"

echo; echo "[2] API TANPA login (harap 401)"
for p in /api/products /api/transactions /api/rekap/list /api/spreadsheet/save /api/customers; do
  echo "    GET $p -> HTTP $(code "$B$p")"
done

echo; echo "[3] Login KASIR PIN SALAH (harap 401)"
echo "    -> HTTP $(code -X POST "$B/api/auth/login" -H 'Content-Type: application/json' -d '{"mode":"kasir","pin":"0000"}')"

echo; echo "[4] Login KASIR PIN BENAR (harap 200 + Set-Cookie httpOnly)"
curl -s -c "$JAR" -D - -o /dev/null -m 5 -X POST "$B/api/auth/login" \
  -H 'Content-Type: application/json' -d "{\"mode\":\"kasir\",\"pin\":\"$KASIR_PIN\"}" \
  | tr -d '\r' | grep -iE "^HTTP|^set-cookie" | sed 's/^/    /'

echo; echo "[5] Sebagai KASIR: API admin (harap 403)"
for p in /api/products /api/spreadsheet/save /api/customers; do
  echo "    GET $p -> HTTP $(code -b "$JAR" "$B$p")"
done

echo; echo "[6] Sebagai KASIR: API kasir (harap bukan 401/403)"
for p in /api/transactions /api/rekap/list /api/attendance; do
  echo "    GET $p -> HTTP $(code -b "$JAR" "$B$p")"
done

echo; echo "[7] Sebagai KASIR: halaman admin (harap 307 -> /)"
c=$(code -b "$JAR" "$B/dashboard"); l=$(loc -b "$JAR" "$B/dashboard")
echo "    GET /dashboard -> HTTP $c  Location: $l"

echo; echo "[8] /api/debug-env di production (harap 404)"
echo "    GET /api/debug-env -> HTTP $(code -b "$JAR" "$B/api/debug-env")"

echo; echo "[9] Cookie PALSU 'admin' (harap 401)"
echo "    GET /api/products -> HTTP $(code -H 'Cookie: semesta-session=admin' "$B/api/products")"

echo; echo "[10] Rate limit PIN salah 12x (harap muncul 429)"
for i in $(seq 1 12); do
  printf "    percobaan %2d -> HTTP %s\n" "$i" "$(code -X POST "$B/api/auth/login" -H 'Content-Type: application/json' -d '{"mode":"kasir","pin":"9999"}')"
done

echo; echo "[11] Login ADMIN user/pass BENAR (harap 200)"
curl -s -c "$AJAR" -D - -o /dev/null -m 5 -X POST "$B/api/auth/login" \
  -H 'Content-Type: application/json' -d "{\"mode\":\"admin\",\"user\":\"$ADMIN_USER\",\"pass\":\"$ADMIN_PASS\"}" \
  | tr -d '\r' | grep -iE "^HTTP|^set-cookie" | sed 's/^/    /'

echo; echo "[12] Sebagai ADMIN: API admin (harap bukan 401/403)"
for p in /api/products /api/spreadsheet/parse; do
  echo "    GET $p -> HTTP $(code -b "$AJAR" "$B$p")"
done

echo; echo "[13] Sebagai ADMIN: halaman admin /dashboard (harap 200)"
echo "    GET /dashboard -> HTTP $(code -b "$AJAR" "$B/dashboard")"

echo; echo "[14] /api/auth/session tanpa login (harap session null)"
echo "    -> $(curl -s -m 5 "$B/api/auth/session")"
echo; echo "[15] /api/auth/session sebagai ADMIN"
echo "    -> $(curl -s -b "$AJAR" -m 5 "$B/api/auth/session")"

rm -f "$JAR" "$AJAR"
echo; echo "===================== SELESAI ====================="
