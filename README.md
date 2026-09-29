# 人質タスク協定

仲間を人質に、サボりを封じろ。タスクを期限までに片付けないと、不名誉な称号がつくチーム向けタスク管理アプリ。

## セットアップ

必要なもの：Node.js 22以上、Java 21以上（Firestore Emulator用）

```bash
npm install
cp web/.env.example web/.env.local
```

## 開発の始め方

ターミナルを2つ開いて、それぞれで実行します。

```bash
npm run emulators   # Firebase Emulator（Auth / Firestore / Functions）
npm run dev         # 画面 http://localhost:5173
```

Emulatorの管理画面は http://localhost:4000 です。

### Emulatorのデータ

| フォルダ | 役割 | Git |
|---|---|---|
| `seed/` | チーム共有の初期データ（ダミーユーザー・称号マスタなど） | コミットする |
| `emulator-data/` | 各自の作業データ | 管理外 |

- `npm run emulators`：毎回 `seed/` の状態から起動し、終了時に `emulator-data/` へ保存します
- `npm run emulators:resume`：前回の `emulator-data/` から続きで起動します
- `npm run emulators:seed`：共有の初期データを編集したいときに使います。Emulator UI で編集して Ctrl+C で終了すると `seed/` に保存されるので、コミットして共有してください

Functionsを書き換えたら、別ターミナルで `npm run fn:watch` を動かしておくとEmulatorに自動反映されます。

## フォルダ構成

```
web/        画面（Vue 3 + Vite + Tailwind CSS 4）
functions/  Cloud Functions（称号判定など）
shared/     フロントとFunctionsで共通の型・Zodスキーマ
firestore.rules  Security Rules
```

`shared/` は `import { ... } from '@hitojichi/shared'` で読み込めます。

## 本番環境への切り替え

Firebaseプロジェクト作成後に以下を実行し、`web/.env.local` を本番の値に書き換えます。

```bash
npx firebase login
npx firebase use --add
npm run deploy
```
