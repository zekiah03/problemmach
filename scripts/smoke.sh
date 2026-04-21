#!/usr/bin/env bash
# 簡易スモークテスト: 公開ページが 200 を返すかと、
# 認証が必要なエンドポイントが期待通りの挙動をするか
set -eu

BASE="${BASE:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:-dev-cron-secret}"

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red() { printf "\033[31m%s\033[0m\n" "$1"; }

check() {
  local name="$1" url="$2" expected="$3"
  local got
  got=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$got" = "$expected" ]; then
    green "✓ $name → $got"
  else
    red "✗ $name → $got (expected $expected)"
    return 1
  fi
}

check_post() {
  local name="$1" url="$2" expected="$3" header="${4:-}"
  local got
  if [ -n "$header" ]; then
    got=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "$header" "$url")
  else
    got=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$url")
  fi
  if [ "$got" = "$expected" ]; then
    green "✓ $name → $got"
  else
    red "✗ $name → $got (expected $expected)"
    return 1
  fi
}

echo "Smoke test: $BASE"
echo "---"

check "ランディング"   "$BASE/"                "200"
check "投稿フォーム"   "$BASE/new"             "200"
check "ログイン"      "$BASE/signin"           "200"
check "確認画面"      "$BASE/verify-request"   "200"
check "認証エラー"    "$BASE/auth-error"       "200"
check "履歴"          "$BASE/history"          "200"
check "ダッシュボード" "$BASE/dashboard"        "200"
check "設定"          "$BASE/settings"         "200"

# 存在しない投稿: Next.js のストリーミング都合で HTTP は 200 でも本文に 404 UI が含まれていればOK
echo -n "✓ 存在しない投稿の404 UI表示 → "
if curl -s "$BASE/post/nonexistent" | grep -q "お探しのページ"; then
  green "OK"
else
  red "MISSING"
  exit 1
fi

echo "---"
check_post "/api/cron/latent (no auth)"    "$BASE/api/cron/latent"    "401"
check_post "/api/cron/latent (auth)"       "$BASE/api/cron/latent"    "200" "x-cron-secret: $CRON_SECRET"
check_post "/api/cron/embedding (auth)"    "$BASE/api/cron/embedding" "200" "x-cron-secret: $CRON_SECRET"

echo "---"
green "Smoke OK"
