#!/bin/sh
# Deploy sonunda canlıdaki sürümü _deploy/status.json'a yazar.
# Kullanım: sh ops/write-status.sh <DEPLOYPATH>   (repo kökünden çalışır)
set -e
DEST="${1:?DEPLOYPATH gerekli}"
GIT=/usr/local/cpanel/3rdparty/bin/git
[ -x "$GIT" ] || GIT=git

json_escape() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | tr -d '\n\r'; }

COMMIT=$($GIT rev-parse HEAD)
SUBJECT=$(json_escape "$($GIT log -1 --format=%s)")
AUTHOR=$(json_escape "$($GIT log -1 --format=%an)")
COMMITTED=$($GIT log -1 --format=%cI)
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

TMP="${DEST}_deploy/status.json.tmp"
printf '{"site":"cevikcozum.com","commit":"%s","subject":"%s","author":"%s","committedAt":"%s","deployedAt":"%s"}\n' \
  "$COMMIT" "$SUBJECT" "$AUTHOR" "$COMMITTED" "$NOW" > "$TMP"
mv "$TMP" "${DEST}_deploy/status.json"
