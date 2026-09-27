# AI向けプロジェクト情報

AIにコードを書かせるときは、このファイルを読ませてください。

## 技術スタック（バージョン厳守）

- TypeScript、Vue 3（Composition API・`<script setup>`）、Vue Router、Pinia
- Vite、Tailwind CSS 4（`@tailwindcss/vite`。`tailwind.config.js` は使わない）
- Firebase JS SDK v12（**modular API**：`import { getFirestore } from 'firebase/firestore'`。`firebase.firestore()` の書き方は禁止）
- VueFire 3（`useCollection` / `useDocument` / `useCurrentUser`）
- Cloud Functions **v2**（`firebase-functions/v2/https`、`firebase-functions/v2/scheduler` など。`functions.https.onCall` のv1形式は禁止）
- Zod 4

## ルール

- 型とZodスキーマは `shared/schemas.ts` に定義し、`@hitojichi/shared` から読み込む。画面側で型を再定義しない
- Firebaseの初期化は `web/src/lib/firebase.ts` の `auth` / `db` / `functions` を使う
- 称号（`users/{uid}.titleIds`）はクライアントから書き込まない。付与はFunctionsで行う
- Functionsのリージョンは `asia-northeast1`
- 画面は `web/src/views/`、共通部品は `web/src/components/` に置く

## Firestoreの構造

```
users/{uid}
teams/{teamId}
teams/{teamId}/tasks/{taskId}
titles/{titleId}
```
