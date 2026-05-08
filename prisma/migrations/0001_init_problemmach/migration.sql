-- problemmach 初回セットアップ: schema + extension + 18 tables + 18 enums + 33 indexes + 14 FK
-- 適用方法:
--   1. Supabase Dashboard → SQL Editor に全文貼り付けて Run
--   2. または Supabase MCP の apply_migration で投入
--
-- 二重投入は CREATE ... IF NOT EXISTS / safe creates で安全。

CREATE SCHEMA IF NOT EXISTS "problemmach";
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";
SET search_path TO "problemmach", "extensions";

-- ===================== Enums =====================
CREATE TYPE "problemmach"."Persona" AS ENUM ('FLAT_POLITE', 'FLAT_CASUAL', 'EXPERT', 'FRIEND');
CREATE TYPE "problemmach"."PostStatus" AS ENUM ('IN_CONVERSATION', 'ANALYZED', 'CLOSED', 'BLOCKED');
CREATE TYPE "problemmach"."RiskFlag" AS ENUM ('NONE', 'SELF_HARM', 'HARM_OTHERS', 'ILLEGAL', 'MEDICAL', 'PII_DETECTED');
CREATE TYPE "problemmach"."Category" AS ENUM ('DECISION', 'CONTROL', 'IDENTITY', 'RISK');
CREATE TYPE "problemmach"."CoexistSub" AS ENUM ('LOSS', 'CONSTRAINT', 'INEVITABLE', 'OTHER_PERSON');
CREATE TYPE "problemmach"."TurnRole" AS ENUM ('USER', 'AI');
CREATE TYPE "problemmach"."TimeSlot" AS ENUM ('ORIGIN', 'COURSE', 'PRESENT', 'IDEAL', 'CONSTRAINT');
CREATE TYPE "problemmach"."SolutionType" AS ENUM ('INFO', 'ACTION', 'DIALOG', 'COEXIST', 'ACCEPTANCE');
CREATE TYPE "problemmach"."EmotionContext" AS ENUM ('POST_ANALYSIS', 'FOLLOW_UP_1W', 'FOLLOW_UP_1M');
CREATE TYPE "problemmach"."InsightVisibility" AS ENUM ('HIDDEN', 'HINT', 'SHOWN');
CREATE TYPE "problemmach"."InsightStatus" AS ENUM ('PENDING', 'SHOWN', 'DISMISSED', 'ACCEPTED');
CREATE TYPE "problemmach"."CostTolerance" AS ENUM ('FREE', 'LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "problemmach"."MatchType" AS ENUM ('MIRROR', 'EXPERIENCED');
CREATE TYPE "problemmach"."MatchStatus" AS ENUM ('SUGGESTED', 'ACCEPTED_A', 'ACCEPTED_B', 'MUTUAL', 'DECLINED', 'EXPIRED');
CREATE TYPE "problemmach"."ChatStatus" AS ENUM ('ACTIVE', 'CLOSED', 'REPORTED');
CREATE TYPE "problemmach"."ReportTarget" AS ENUM ('POST', 'MESSAGE', 'USER', 'MATCH');
CREATE TYPE "problemmach"."ReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'MONEY_REQUEST', 'EXTERNAL_SOLICITATION', 'SELF_HARM_CONCERN', 'OTHER');
CREATE TYPE "problemmach"."ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'ACTIONED', 'DISMISSED');

-- ===================== Tables =====================
CREATE TABLE "problemmach"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "isGuest" BOOLEAN NOT NULL DEFAULT true,
    "guestToken" TEXT,
    "ageConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "termsAcceptedAt" TIMESTAMP(3),
    "persona" "problemmach"."Persona" NOT NULL DEFAULT 'FLAT_POLITE',
    "displayName" TEXT,
    "encryptedApiKey" TEXT,
    "region" TEXT NOT NULL DEFAULT 'ja',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "problemmach"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "problemmach"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "problemmach"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "problemmach"."Post" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "initialText" TEXT NOT NULL,
    "status" "problemmach"."PostStatus" NOT NULL DEFAULT 'IN_CONVERSATION',
    "riskFlag" "problemmach"."RiskFlag" NOT NULL DEFAULT 'NONE',
    "matchEligible" BOOLEAN NOT NULL DEFAULT true,
    "categoryPrimary" "problemmach"."Category",
    "categorySecondary" "problemmach"."Category",
    "coexistSubtype" "problemmach"."CoexistSub",
    "longTermFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "problemmach"."ConversationTurn" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "turnNumber" INTEGER NOT NULL,
    "role" "problemmach"."TurnRole" NOT NULL,
    "content" TEXT NOT NULL,
    "questionOptions" JSONB,
    "selectedOption" TEXT,
    "filledSlot" "problemmach"."TimeSlot",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationTurn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "problemmach"."Analysis" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "structure" JSONB NOT NULL,
    "categoryPrimary" "problemmach"."Category" NOT NULL,
    "categorySecondary" "problemmach"."Category",
    "confidence" INTEGER NOT NULL,
    "timeInfo" JSONB NOT NULL,
    "solutionTypeScores" JSONB NOT NULL,
    "selfResolvableScore" INTEGER NOT NULL,
    "coexistSubtype" "problemmach"."CoexistSub",
    "longTermFlag" BOOLEAN NOT NULL DEFAULT false,
    "matchRecommend" BOOLEAN NOT NULL DEFAULT false,
    "matchReason" TEXT,
    "promptVersion" TEXT NOT NULL,
    "llmUsed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "problemmach"."SolutionTemplate" (
    "id" TEXT NOT NULL,
    "type" "problemmach"."SolutionType" NOT NULL,
    "sub" "problemmach"."CoexistSub",
    "title" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "whyItFits" TEXT NOT NULL,
    "appliesToCategory" "problemmach"."Category"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SolutionTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "problemmach"."PresentedTemplate" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "userClicked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PresentedTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "problemmach"."EmotionScore" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "scoreNumeric" INTEGER,
    "context" "problemmach"."EmotionContext" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmotionScore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "problemmach"."LatentAnalysis" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "emotionLayers" JSONB NOT NULL,
    "cognitiveDistortions" JSONB NOT NULL,
    "rootCauses" JSONB NOT NULL,
    "patternTags" TEXT[],
    "visibility" "problemmach"."InsightVisibility" NOT NULL DEFAULT 'HIDDEN',
    "llmUsed" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LatentAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "problemmach"."PotentialInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "insightType" TEXT NOT NULL,
    "detail" JSONB NOT NULL,
    "confidence" INTEGER NOT NULL,
    "status" "problemmach"."InsightStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shownAt" TIMESTAMP(3),
    CONSTRAINT "PotentialInsight_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "problemmach"."PostEmbedding" (
    "postId" TEXT NOT NULL,
    "ideal" extensions.vector(1536),
    "reality" extensions.vector(1536),
    "needVector" extensions.vector(1536),
    "offerVector" extensions.vector(1536),
    "fullText" extensions.vector(1536),
    "modelUsed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostEmbedding_pkey" PRIMARY KEY ("postId")
);

CREATE TABLE "problemmach"."UserMatchCondition" (
    "userId" TEXT NOT NULL,
    "locationRegion" TEXT,
    "availableSlots" TEXT[],
    "language" TEXT NOT NULL DEFAULT 'ja',
    "costTolerance" "problemmach"."CostTolerance" NOT NULL DEFAULT 'FREE',
    "skillTags" TEXT[],
    "acceptMatch" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserMatchCondition_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "problemmach"."Match" (
    "id" TEXT NOT NULL,
    "postAId" TEXT NOT NULL,
    "postBId" TEXT NOT NULL,
    "matchType" "problemmach"."MatchType" NOT NULL,
    "compatibilityScore" INTEGER NOT NULL,
    "realnessScore" INTEGER NOT NULL,
    "status" "problemmach"."MatchStatus" NOT NULL DEFAULT 'SUGGESTED',
    "acceptedByA" BOOLEAN NOT NULL DEFAULT false,
    "acceptedByB" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "problemmach"."ChatRoom" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "status" "problemmach"."ChatStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    CONSTRAINT "ChatRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "problemmach"."ChatMessage" (
    "id" TEXT NOT NULL,
    "chatRoomId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "moderationFlag" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "problemmach"."Report" (
    "id" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "targetType" "problemmach"."ReportTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" "problemmach"."ReportReason" NOT NULL,
    "detail" TEXT,
    "status" "problemmach"."ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "problemmach"."ModerationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "detail" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModerationEvent_pkey" PRIMARY KEY ("id")
);

-- ===================== Indexes =====================
CREATE UNIQUE INDEX "User_email_key" ON "problemmach"."User"("email");
CREATE UNIQUE INDEX "User_guestToken_key" ON "problemmach"."User"("guestToken");
CREATE INDEX "User_guestToken_idx" ON "problemmach"."User"("guestToken");
CREATE INDEX "User_email_idx" ON "problemmach"."User"("email");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "problemmach"."Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "problemmach"."Session"("sessionToken");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "problemmach"."VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "problemmach"."VerificationToken"("identifier", "token");
CREATE INDEX "Post_userId_idx" ON "problemmach"."Post"("userId");
CREATE INDEX "Post_status_idx" ON "problemmach"."Post"("status");
CREATE INDEX "Post_expiresAt_idx" ON "problemmach"."Post"("expiresAt");
CREATE INDEX "Post_matchEligible_status_idx" ON "problemmach"."Post"("matchEligible", "status");
CREATE INDEX "ConversationTurn_postId_idx" ON "problemmach"."ConversationTurn"("postId");
CREATE UNIQUE INDEX "ConversationTurn_postId_turnNumber_key" ON "problemmach"."ConversationTurn"("postId", "turnNumber");
CREATE UNIQUE INDEX "Analysis_postId_key" ON "problemmach"."Analysis"("postId");
CREATE INDEX "SolutionTemplate_type_idx" ON "problemmach"."SolutionTemplate"("type");
CREATE INDEX "SolutionTemplate_isActive_idx" ON "problemmach"."SolutionTemplate"("isActive");
CREATE INDEX "PresentedTemplate_postId_idx" ON "problemmach"."PresentedTemplate"("postId");
CREATE UNIQUE INDEX "PresentedTemplate_postId_templateId_key" ON "problemmach"."PresentedTemplate"("postId", "templateId");
CREATE INDEX "EmotionScore_postId_idx" ON "problemmach"."EmotionScore"("postId");
CREATE UNIQUE INDEX "LatentAnalysis_postId_key" ON "problemmach"."LatentAnalysis"("postId");
CREATE INDEX "LatentAnalysis_postId_idx" ON "problemmach"."LatentAnalysis"("postId");
CREATE INDEX "PotentialInsight_userId_idx" ON "problemmach"."PotentialInsight"("userId");
CREATE INDEX "PotentialInsight_status_idx" ON "problemmach"."PotentialInsight"("status");
CREATE INDEX "Match_postAId_idx" ON "problemmach"."Match"("postAId");
CREATE INDEX "Match_postBId_idx" ON "problemmach"."Match"("postBId");
CREATE INDEX "Match_status_idx" ON "problemmach"."Match"("status");
CREATE UNIQUE INDEX "Match_postAId_postBId_key" ON "problemmach"."Match"("postAId", "postBId");
CREATE UNIQUE INDEX "ChatRoom_matchId_key" ON "problemmach"."ChatRoom"("matchId");
CREATE INDEX "ChatMessage_chatRoomId_idx" ON "problemmach"."ChatMessage"("chatRoomId");
CREATE INDEX "ChatMessage_senderUserId_idx" ON "problemmach"."ChatMessage"("senderUserId");
CREATE INDEX "Report_status_idx" ON "problemmach"."Report"("status");
CREATE INDEX "Report_targetType_targetId_idx" ON "problemmach"."Report"("targetType", "targetId");
CREATE INDEX "ModerationEvent_userId_idx" ON "problemmach"."ModerationEvent"("userId");
CREATE INDEX "ModerationEvent_eventType_idx" ON "problemmach"."ModerationEvent"("eventType");

-- ===================== Foreign Keys =====================
ALTER TABLE "problemmach"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "problemmach"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "problemmach"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "problemmach"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "problemmach"."Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "problemmach"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "problemmach"."ConversationTurn" ADD CONSTRAINT "ConversationTurn_postId_fkey" FOREIGN KEY ("postId") REFERENCES "problemmach"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "problemmach"."Analysis" ADD CONSTRAINT "Analysis_postId_fkey" FOREIGN KEY ("postId") REFERENCES "problemmach"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "problemmach"."PresentedTemplate" ADD CONSTRAINT "PresentedTemplate_postId_fkey" FOREIGN KEY ("postId") REFERENCES "problemmach"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "problemmach"."PresentedTemplate" ADD CONSTRAINT "PresentedTemplate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "problemmach"."SolutionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "problemmach"."EmotionScore" ADD CONSTRAINT "EmotionScore_postId_fkey" FOREIGN KEY ("postId") REFERENCES "problemmach"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "problemmach"."PotentialInsight" ADD CONSTRAINT "PotentialInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "problemmach"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "problemmach"."UserMatchCondition" ADD CONSTRAINT "UserMatchCondition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "problemmach"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "problemmach"."Match" ADD CONSTRAINT "Match_postAId_fkey" FOREIGN KEY ("postAId") REFERENCES "problemmach"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "problemmach"."Match" ADD CONSTRAINT "Match_postBId_fkey" FOREIGN KEY ("postBId") REFERENCES "problemmach"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "problemmach"."ChatRoom" ADD CONSTRAINT "ChatRoom_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "problemmach"."Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "problemmach"."ChatMessage" ADD CONSTRAINT "ChatMessage_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "problemmach"."ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
