// Auth.js のルートハンドラ
// auth.ts と分離することで、サーバー側の auth() を他の場所からインポートしやすく
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
