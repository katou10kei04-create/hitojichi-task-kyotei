# AGENTS.md

AIにコードを書かせるときは、このファイルを読ませてください（Claude Code を使う場合は `CLAUDE.md` も参照。そちらから本ファイルを読み込む構成になっています）。

## プロジェクト概要

- **名前**：人質タスク協定
- **イベント**：技育ハッカソン2026 vol.5（3人チーム）
- **コンセプト**：仲間を「人質」にしてサボりを封じる、チーム向けタスク管理アプリ
- **最優先事項**：本番当日に動くデモを見せること。完璧さより「デモで動く・見栄えがする」を優先する

## ドメイン用語

コード・UI・コメントでは以下の用語を統一して使うこと。

| 用語 | 意味 | コード上の命名例 |
|---|---|---|
| dis称号 | タスクをサボった本人に付与される恥ずかしい称号 | `selfDisTitle` |
| team dis称号 | サボった人のチームメンバー（相手）に付与される称号 | `teamDisTitle` |
| 人質 | 自分のサボりが仲間の称号にも影響する仕組み全体。チーム作成時に作成者が「dis称号」と「team dis称号」の組を選んで決める | `hostage` |
| チーム | ユーザーが所属するグループ。招待コードで参加する。作成時に人質（dis称号・team dis称号）を設定する | `team` |
| タスク | 各メンバーが自分で追加・管理する個人の作業。他人に割り当てるものではない。期限と状態を持つ | `task` |
| チーム進捗度 | チームメンバー全員のタスクを合算した完了率（完了タスク数 ÷ 全タスク数） | `teamProgress` |
| 称号 | ユーザーに付与されるバッジ。不名誉度（`shameLevel`）を持つマスタデータ | `title` |

型定義の正本は [`shared/schemas.ts`](shared/schemas.ts)（zod スキーマ、フロントとFunctionsで共用）。用語を追加・変更したらそちらも合わせて更新すること。

## 技術スタック（バージョン厳守）

- TypeScript、Vue 3（Composition API・`<script setup>`）、Vue Router、Pinia
- Vite、Tailwind CSS 4（`@tailwindcss/vite`。`tailwind.config.js` は使わない。デザイントークンは `web/src/assets/main.css` の `@theme` に書く）
- Firebase JS SDK v12（**modular API**：`import { getFirestore } from 'firebase/firestore'`。`firebase.firestore()` の書き方は禁止）
- VueFire 3（`useCollection` / `useDocument` / `useCurrentUser`）
- Cloud Functions **v2**（`firebase-functions/v2/https`、`firebase-functions/v2/scheduler` など。`functions.https.onCall` のv1形式は禁止）
- Zod 4
- DB：Cloud Firestore／認証：Firebase Authentication

## コマンド

npm workspaces 構成（`web` / `functions` / `shared`）。基本はリポジトリルートで実行する。

```bash
npm install               # 依存関係のインストール（ルートで一括）
npm run dev                # web の開発サーバー起動
npm run emulators           # Firebase エミュレータ起動（共有の seed/ から起動し、終了時に個人用 emulator-data/ へ保存）
npm run emulators:resume    # 前回の個人データ（emulator-data/）から再開する
npm run emulators:seed      # 共有の初期データ（seed/）を編集する。終了時に seed/ へ保存されるのでコミットして共有
npm run fn:watch            # functions を監視ビルド（エミュレータと並行して別ターミナルで起動）
npm run build               # web + functions のビルド
npm run lint                # web の Lint（oxlint + eslint）
npm run format               # prettier で web/functions/shared を一括フォーマット
npm run deploy               # ビルドしてから firebase deploy
```

`web` ディレクトリ配下で直接実行する場合は `npm run dev -w web` のように `-w <workspace>` を付けるか、`cd web` してから実行する。

## ディレクトリ構成

npm workspaces のモノレポ。`web`（フロントエンド）・`functions`（Cloud Functions）・`shared`（共通の型・zod スキーマ）に分かれている。

```
web/
  src/
    components/   # 再利用するUIコンポーネント（現状 .gitkeep のみ、これから追加）
    layouts/      # AppLayout.vue など画面共通レイアウト
    views/        # 画面単位のコンポーネント（LoginView, TeamListView, TeamNewView, TeamTasksView, TitleListView, ProfileView）
    stores/       # Pinia ストア（現状 .gitkeep のみ、これから追加）
    router/       # vue-router 設定
    lib/firebase.ts  # Firebase 初期化（auth / db / functions）
functions/
  src/index.ts    # Cloud Functions のエントリポイント
shared/
  schemas.ts      # フロント・Functions共通の型・zod バリデーション
firestore.rules             # Firestore セキュリティルール
firestore.indexes.json      # Firestore インデックス定義
```

`composables/` はまだ存在しないため、Firestore アクセスロジックを切り出す際は `web/src/composables/useXxx.ts` として新規作成する。型は `web/src/types/` ではなく `shared/schemas.ts` に集約する。

## コーディング規約

- TypeScript は `strict` 前提。`any` は原則使わない
- 型とZodスキーマは `shared/schemas.ts` に定義し、`@hitojichi/shared` から読み込む。画面側で型を再定義しない
- Firestore へのアクセスはコンポーネントに直接書かず、composable にまとめる
- Firebaseの初期化は `web/src/lib/firebase.ts` の `auth` / `db` / `functions` を使う
- 称号（`users/{uid}.titleIds`）はクライアントから書き込まない。付与はFunctionsで行う
- Functionsのリージョンは `asia-northeast1`
- 画面は `web/src/views/`、共通部品は `web/src/components/` に置く
- Firebase の設定値は `.env`（`VITE_FIREBASE_*`）から読み込み、**ハードコード・コミットしない**

## Firestoreの構造

```
users/{uid}
teams/{teamId}
teams/{teamId}/tasks/{taskId}
titles/{titleId}
```

## デザイン方針

プロトタイプは質素すぎるため、**ゲームっぽい雰囲気**に寄せる。

- ボタンには影や縁取りをつける
- 見出しなどにゴシック調の文字を使う
- アイコンを積極的に使う

### カラーパレット

Tailwind v4 のため、`web/src/assets/main.css` の `@theme` にカスタムカラーとして登録し、クラス名で使うこと（色コードを直書きしない）。

| 役割 | 色 | 名前（案） |
|---|---|---|
| メイン | `#F8F7F7` | `base` |
| アソート | `#7F60CB` | `primary` |
| アソート | `#242035` | `ink` |
| アソート | `#C7C6D9` | `muted` |
| アクセント | `#F2D516` | `accent` |

## チーム体制

メンバーの中にはweb開発に慣れていない人もいる。コードを書いたときは、**何をしたか・なぜそうしたかを短く説明する**こと。
