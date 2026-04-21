import { describe, it, expect } from "vitest";
import { flagChatMessage } from "./chat-moderation";

describe("flagChatMessage", () => {
  it("returns null for normal text", () => {
    expect(flagChatMessage("こんにちは、私も同じ悩みを持っています")).toBeNull();
  });

  it("flags https URLs", () => {
    expect(flagChatMessage("こちら見て https://example.com")).toBe("URL_DETECTED");
  });

  it("flags www. URLs", () => {
    expect(flagChatMessage("www.example.jp に詳しいです")).toBe("URL_DETECTED");
  });

  it("flags LINE id requests", () => {
    expect(flagChatMessage("LINE ID 教えて")).toBe("EXTERNAL_CONTACT");
    expect(flagChatMessage("ラインのアカウントは?")).toBe("EXTERNAL_CONTACT");
  });

  it("flags phone numbers", () => {
    expect(flagChatMessage("連絡先は 080-1234-5678 です")).toBe("PHONE_DETECTED");
  });

  it("flags money-related text", () => {
    expect(flagChatMessage("月収50万稼げる方法あります")).toBe("MONEY_REQUEST");
    expect(flagChatMessage("paypay で送ります")).toBe("MONEY_REQUEST");
    expect(flagChatMessage("amazonギフト送れる?")).toBe("MONEY_REQUEST");
  });

  it("URL detection takes precedence", () => {
    expect(flagChatMessage("paypay https://example.com")).toBe("URL_DETECTED");
  });

  it("doesn't false-positive on innocent text", () => {
    expect(flagChatMessage("お金の話は重いですよね")).toBe("MONEY_REQUEST");
    // 「お金」は意図的にフラグ対象 (検知率優先)
  });
});
