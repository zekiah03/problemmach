# problemmach

悩みを対話で整理する、分析エンジン中心のアプリ。

「本人が認識している悩み」を、AI との対話で時系列に整理し、
解決の型 (情報／行動／対話／共存／受容) を 3 つ提示します。
解決しない悩み (喪失・制約・不可避・他者) は「共存」として寄り添います。

本リポジトリは Phase 0 (分析エンジン単体 MVP) の実装です。

## コンセプト

- **分析 > マッチング** — マッチングは一部ルート。主役は分析
- **顕在層 (見せる)** と **潜在層 (溜める)** の 2 層に分けた設計
- **対話駆動** — 自由記述 → AI が動的に質問 → 分析結果
- 本人の顕在意識を尊重し、深層解釈を押し付けない

## Phase 0 機能 (実装済み)

- 自由記述フォーム (30〜4000 文字) + 利用規約・年齢確認
- 2 段階分析 (リスク判定 → 本分析)
- 自傷念慮検知時は専用応答 (国内相談窓口を表示、分析停止)
- 個人情報検知時は再編集を促す
- 時系列スロット (ORIGIN / COURSE / PRESENT / IDEAL / CONSTRAINT) で対話
- 最大 5 ターン、3 ターンごとに累積サマリ
- 「このまま分析する」ボタンで任意のタイミングで終了可
- 5 つの解決の型 (全 41 テンプレ) から 3 つ選出して提示
- 感情スコア (テキスト) を分析後に取得
- 4 ペルソナ (フラット敬語／フラットため口／専門家／友達)
- BYOK (任意) — Anthropic API キーを自分で持ち込める
- ゲスト可 (最大 3 投稿、30 日で自動削除)

## 技術スタック

- Next.js 15 (App Router) + TypeScript
- Prisma + PostgreSQL
- Tailwind CSS
- Anthropic SDK (Claude Haiku 4.5 / Sonnet 4.6)

## セットアップ

1. `.env.example` を `.env` にコピーして値を埋める
   - `ENCRYPTION_KEY` は `openssl rand -base64 32` で生成
2. Postgres を起動してデータベースを作成
3. 依存インストール
   ```bash
   npm install
   ```
4. Prisma スキーマ適用 & 解決の型シード
   ```bash
   npm run db:push
   npm run db:seed
   ```
5. 開発サーバー起動
   ```bash
   npm run dev
   ```

## ディレクトリ構成

```
src/
  app/              Next.js App Router
    api/            API ルート
    new/            投稿開始画面
    post/[id]/      対話画面
    post/[id]/analysis/  結果画面
    settings/       設定画面
  components/       UI コンポーネント
  data/templates.ts 解決の型 41 個
  lib/              db, anthropic (BYOK), crypto, guest, moderation
  lib/prompts/      system, personas, risk, conversation, analyze
  services/         conversation, analysis
prisma/
  schema.prisma     Phase 0 の 7 テーブル
  seed.ts           解決の型シード
```

## Phase 1 機能 (実装済み)

- **Auth.js v5 マジックリンク認証** — メール送信は Resend (キー未設定時は console 出力)
- **/history** — 投稿履歴一覧
- **/dashboard** — 投稿数・自己解決スコア平均・4類型比率・解決の型平均・感情ログ
- **潜在分析バッチ** — Sonnet で感情層 / 認知歪み / 5Why 風根源を裏で解析。`/api/cron/latent` を `X-Cron-Secret` ヘッダ付きで叩く
- **pgvector + OpenAI embedding** — `text-embedding-3-small` で投稿を 1536 次元にエンコード。Phase 2 マッチングで使用。`/api/cron/embedding`

### Cron 設定例

```bash
# 1日1回、潜在分析と embedding を更新
0 3 * * * curl -X POST -H "X-Cron-Secret: $CRON_SECRET" https://your-domain/api/cron/latent
5 3 * * * curl -X POST -H "X-Cron-Secret: $CRON_SECRET" https://your-domain/api/cron/embedding
```

Vercel を使う場合は `vercel.json` で同等の設定が可能。

## テスト

```bash
npm test          # vitest run
npm run test:watch
```

現在 30 件のユニットテスト (parsers / crypto / pickTemplates)。

## 今後の Phase

- **Phase 2**: マッチング (相補マッチ、ミラー+経験者、現実性フィルタ)
- **Phase 3**: マッチ後チャット・通報・モデレーションキュー
- **Phase 4**: 気づきフェーズ (長期寄り添い・パターン還元)

## 注意

- 本サービスは医療・法律・心理療法を提供するものではありません
- 18 歳以上の方が対象です
- 緊急時は専門機関へご相談ください (よりそいホットライン 0120-279-338 など)
