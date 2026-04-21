import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt } from "./crypto";

describe("crypto", () => {
  beforeAll(() => {
    // テスト用に決定的な鍵を設定
    process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  it("round trip preserves the plaintext", () => {
    const plain = "sk-ant-api03-XXXXXXXXXXXXXXXXX";
    const enc = encrypt(plain);
    expect(enc).not.toBe(plain);
    expect(decrypt(enc)).toBe(plain);
  });

  it("encrypts the same plaintext to different ciphertexts (random IV)", () => {
    const plain = "test-secret";
    const a = encrypt(plain);
    const b = encrypt(plain);
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe(plain);
    expect(decrypt(b)).toBe(plain);
  });

  it("handles empty string", () => {
    const enc = encrypt("");
    expect(decrypt(enc)).toBe("");
  });

  it("handles multibyte characters", () => {
    const plain = "悩みの分析エンジン";
    expect(decrypt(encrypt(plain))).toBe(plain);
  });

  it("rejects tampered ciphertext (GCM auth tag check)", () => {
    const enc = encrypt("hello");
    // 末尾を 1 文字変える
    const tampered = enc.slice(0, -1) + (enc.slice(-1) === "A" ? "B" : "A");
    expect(() => decrypt(tampered)).toThrow();
  });
});
