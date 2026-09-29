# 人質タスク協定

仲間を人質に、サボりを封じろ。タスクを期限までに片付けないと、自分だけでなく仲間にも不名誉な称号がつくチーム向けタスク管理アプリ（技育ハッカソン2026 vol.5）。

## 主な画面

| パス | 画面 |
|---|---|
| `/login` | ログイン |
| `/` | チーム一覧 |
| `/teams/new` | チーム作成 |
| `/teams/:teamId` | チームのタスク一覧 |
| `/titles` | 称号一覧 |
| `/profile` | プロフィール |

ログイン画面以外は、未ログインだと `/login` にリダイレクトされます。

## セットアップ

必要なもの：Node.js 22以上、Java 21以上（Firestore Emulator用）

```bash
npm install
cp web/.env.example web/.env.local
```

`web/.env.local` はそのまま（`VITE_USE_EMULATOR=true`）で、ローカルのEmulatorに接続されます。

## 開発の始め方

ターミナルを2つ開いて、それぞれで実行します。

```bash
npm run emulators   # Firebase Emulator（Auth / Firestore / Functions / Hosting）
npm run dev         # 画面 http://localhost:5173
```

Emulatorの管理画面は http://localhost:4000 です。

Functionsを書き換えたら、別ターミナルで `npm run fn:watch` を動かしておくとEmulatorに自動反映されます。

### Emulatorのデータ

| フォルダ | 役割 | Git |
|---|---|---|
| `seed/` | チーム共有の初期データ（ダミーユーザー・称号マスタなど） | コミットする |
| `emulator-data/` | 各自の作業データ | 管理外 |

- `npm run emulators`：毎回 `seed/` の状態から起動し、終了時に `emulator-data/` へ保存します
- `npm run emulators:resume`：前回の `emulator-data/` から続きで起動します
- `npm run emulators:seed`：共有の初期データを編集したいときに使います。Emulator UI で編集して Ctrl+C で終了すると `seed/` に保存されるので、コミットして共有してください

## その他のコマンド

```bash
npm run build    # web + functions のビルド
npm run lint     # web の Lint（oxlint + eslint）
npm run format   # prettier で web / functions / shared を整形
```

## フォルダ構成

```
web/                 画面（Vue 3 + Vite + Tailwind CSS 4 + VueFire）
  src/views/         画面単位のコンポーネント
  src/layouts/       共通レイアウト（AppLayout.vue）
  src/composables/   Firestore へのアクセス（useTeams, useTeamTasks など）
  src/lib/firebase.ts  Firebase の初期化
functions/           Cloud Functions v2（称号判定など）
shared/              フロントとFunctionsで共通の型・Zodスキーマ
seed/                Emulator の共有初期データ
firestore.rules      Security Rules
```

`shared/` は `import { ... } from '@hitojichi/shared'` で読み込めます。

開発ルール（用語・コーディング規約・デザイン方針）は [AGENTS.md](AGENTS.md) にまとめています。

## 本番へのデプロイ

`.firebaserc` に本番プロジェクトが `prod` エイリアス（`hitojichi-task-kyotei`）として登録済みで、`npm run deploy` は常に本番へデプロイします（Hosting / Firestore / Functions）。

1. `web/.env.production.local` を作り、Firebaseコンソールの本番の値を入れて `VITE_USE_EMULATOR=false` にする（ビルド時は `.env.local` より優先されます）
2. 以下を実行する

```bash
npx firebase login
npm run deploy
```
