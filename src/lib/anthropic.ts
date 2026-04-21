import Anthropic from "@anthropic-ai/sdk";
import { decrypt } from "./crypto";
import { prisma } from "./db";

export const MODEL_FAST = process.env.LLM_MODEL_FAST ?? "claude-haiku-4-5-20251001";
export const MODEL_DEEP = process.env.LLM_MODEL_DEEP ?? "claude-sonnet-4-6";

// ユーザーの BYOK キーがあればそれを使い、なければ運営キー
export async function getAnthropicForUser(userId: string): Promise<{
  client: Anthropic;
  usingUserKey: boolean;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { encryptedApiKey: true },
  });

  if (user?.encryptedApiKey) {
    try {
      const apiKey = decrypt(user.encryptedApiKey);
      return {
        client: new Anthropic({ apiKey }),
        usingUserKey: true,
      };
    } catch {
      // 復号失敗時は運営キーにフォールバック
    }
  }

  const operatorKey = process.env.ANTHROPIC_API_KEY;
  if (!operatorKey) throw new Error("ANTHROPIC_API_KEY is not set");
  return {
    client: new Anthropic({ apiKey: operatorKey }),
    usingUserKey: false,
  };
}
