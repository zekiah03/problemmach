-- pgvector 用インデックス。
-- Prisma の Unsupported("vector") は通常のインデックス構文では届かないため、
-- スキーマ適用後に一度だけ実行する。
--
-- 使い方:
--   psql $DATABASE_URL -f prisma/indexes.sql
-- または:
--   npm run db:index
--
-- HNSW: 高速な近似最近傍探索。精度は ef_construction / m の調整で変わる。
-- vector_cosine_ops: コサイン距離用 (我々のユースケース)

CREATE INDEX IF NOT EXISTS idx_postembedding_fulltext_hnsw
  ON "PostEmbedding"
  USING hnsw ("fullText" vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_postembedding_ideal_hnsw
  ON "PostEmbedding"
  USING hnsw ("ideal" vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_postembedding_reality_hnsw
  ON "PostEmbedding"
  USING hnsw ("reality" vector_cosine_ops);

-- Match の探索を高速化
CREATE INDEX IF NOT EXISTS idx_match_status_expires
  ON "Match" ("status", "expiresAt");

-- 通報レビュー用
CREATE INDEX IF NOT EXISTS idx_report_status_created
  ON "Report" ("status", "createdAt" DESC);

-- 自動検知ログ
CREATE INDEX IF NOT EXISTS idx_moderationevent_created
  ON "ModerationEvent" ("createdAt" DESC);
