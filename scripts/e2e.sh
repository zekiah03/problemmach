#!/usr/bin/env bash
# E2E 動作確認: 投稿 → 対話 → 分析 → 感情スコア まで通す
#
# 必須:
#   .env に本物の ANTHROPIC_API_KEY を設定
#   または export ANTHROPIC_API_KEY=sk-ant-...
#
# 実行:
#   npm run dev (別ターミナル)
#   bash scripts/e2e.sh
#
# 使い方:
#   BASE=http://localhost:3000 bash scripts/e2e.sh
set -eu

BASE="${BASE:-http://localhost:3000}"
JAR="${JAR:-/tmp/e2e-cookies.jar}"
rm -f "$JAR"

green()  { printf "\033[32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }
red()    { printf "\033[31m%s\033[0m\n" "$1"; }
bold()   { printf "\033[1m%s\033[0m\n" "$1"; }

# 事前チェック: API キーがプレースホルダでないか
ENV_KEY=$(grep -E '^ANTHROPIC_API_KEY=' .env 2>/dev/null | cut -d'"' -f2 || true)
if [ -z "$ENV_KEY" ] || echo "$ENV_KEY" | grep -q "placeholder"; then
  red "ANTHROPIC_API_KEY が未設定またはプレースホルダです。"
  red ".env を編集するか、以下を export してから再実行してください:"
  red "  export ANTHROPIC_API_KEY=sk-ant-..."
  exit 1
fi

# 事前チェック: dev server 生存
if ! curl -s -o /dev/null -w "%{http_code}" "$BASE/" | grep -q "200"; then
  red "dev server に到達できません ($BASE)"
  red "別ターミナルで 'npm run dev' を実行してください"
  exit 1
fi

bold "=== Step 1: 投稿 ==="
TEXT="この3ヶ月、転職するか迷っています。今の会社は安定しているけど成長を感じず、友人から誘われたスタートアップは魅力的だけど不安も大きい。家族もいるので失敗は避けたいが、5年後にこのままでよかったのかと思いそうな予感もしています。"

HTTP_FILE=/tmp/e2e-post.http
CODE=$(curl -s -c "$JAR" -o "$HTTP_FILE" -w "%{http_code}" -X POST -H "content-type: application/json" \
  -d "{\"text\":$(printf '%s' "$TEXT" | jq -R -s '.'),\"ageConfirmed\":true,\"termsAccepted\":true}" \
  "$BASE/api/posts")
echo "HTTP $CODE"
cat "$HTTP_FILE" | jq '.' 2>/dev/null || cat "$HTTP_FILE"
echo

POST_ID=$(jq -r '.postId // empty' "$HTTP_FILE" 2>/dev/null)
if [ -z "$POST_ID" ]; then
  red "投稿に失敗しました (HTTP $CODE)"
  exit 1
fi
green "✓ post created: $POST_ID"

bold "=== Step 2: 対話を 2 ターン進める ==="
for i in 1 2; do
  TURN_RESP=$(curl -s -b "$JAR" -X POST -H "content-type: application/json" \
    -d '{"text":"1〜3ヶ月ほど前からです。転職の話が具体化してからずっと考えています。"}' \
    "$BASE/api/posts/$POST_ID/turns")
  echo "turn $i:"
  echo "$TURN_RESP" | jq '.aiTurn | {acknowledgment, question, target_slot, ready_to_analyze}'
  READY=$(echo "$TURN_RESP" | jq -r '.aiTurn.ready_to_analyze // false')
  if [ "$READY" = "true" ]; then
    yellow "ready_to_analyze=true"
    break
  fi
done

bold "=== Step 3: 分析実行 ==="
ANALYZE_RESP=$(curl -s -b "$JAR" -X POST "$BASE/api/posts/$POST_ID/analyze")
echo "$ANALYZE_RESP" | jq '{
  structure: .analysis.structure,
  categoryPrimary: .analysis.categoryPrimary,
  selfResolvableScore: .analysis.selfResolvableScore,
  matchRecommend: .analysis.matchRecommend,
  templates: [.templates[] | .title]
}'
green "✓ analysis done"

bold "=== Step 4: 感情スコア ==="
curl -s -b "$JAR" -X POST -H "content-type: application/json" \
  -d '{"text":"整理ができて少し楽になった。まだ答えは出ないけど、軸が見えた。"}' \
  "$BASE/api/posts/$POST_ID/emotion" | jq '.'
green "✓ emotion saved"

bold "=== Step 5: cron バッチ (潜在 / 埋め込み / マッチ / 気づき) ==="
for route in latent embedding matching insights; do
  RESP=$(curl -s -X POST -H "x-cron-secret: dev-cron-secret" "$BASE/api/cron/$route")
  printf "%-10s → %s\n" "$route" "$RESP"
done

bold "=== Step 6: 履歴 UI 経由 ==="
LIST=$(curl -s -b "$JAR" "$BASE/history" | grep -c "この3ヶ月、転職" || true)
if [ "$LIST" -gt 0 ]; then
  green "✓ 履歴ページに投稿が表示されている"
else
  yellow "履歴ページに投稿が見つかりません"
fi

echo
green "E2E 完走。DB に保存された分析結果:"
PGPASSWORD=dev psql -U problemmach -h localhost -d problemmach -c "
  SELECT
    p.id AS post_id,
    p.status,
    a.\"categoryPrimary\" AS cat,
    a.\"selfResolvableScore\" AS self_resolvable,
    a.\"matchRecommend\" AS match,
    (SELECT count(*) FROM \"ConversationTurn\" t WHERE t.\"postId\" = p.id) AS turns,
    (SELECT count(*) FROM \"PresentedTemplate\" pt WHERE pt.\"postId\" = p.id) AS templates,
    (SELECT count(*) FROM \"LatentAnalysis\" l WHERE l.\"postId\" = p.id) AS latent
  FROM \"Post\" p
  LEFT JOIN \"Analysis\" a ON a.\"postId\" = p.id
  WHERE p.id = '$POST_ID';
" 2>&1 || yellow "psql 直接クエリが実行できない環境"
