import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS ホーム画面用アイコン (PNG を動的生成)
// icon.svg と同じ「包まれているが閉じていない」デザイン
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4a6fa5",
          borderRadius: 40,
        }}
      >
        <svg
          width="180"
          height="180"
          viewBox="0 0 180 180"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 128 57 A 50 50 0 1 0 128 123"
            stroke="white"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="90" cy="90" r="10" fill="white" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
