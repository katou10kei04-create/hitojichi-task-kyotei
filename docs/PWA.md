# PWA（MVP）

## 実装範囲

- `vite-plugin-pwa` の `generateSW` でmanifestとService Workerを本番ビルド時に生成する。
- アプリ名・日本語・standalone表示・起動URL `/`・scope `/` を設定する。ルート配信を前提とする。
- 192px / 512pxのPNG、maskable用512px、Apple用180pxを同梱する。クリップボードとチェック印の仮アイコンで、SVG原図も同梱する。
- HTML・JS（遅延読み込み画面も含む）・CSS・アイコンを事前キャッシュする。
- Firebase Auth / Firestore / Functions のレスポンスはService Workerに保存しない。Firestoreの永続化設定も変更しない。
- Firebase Hostingの `/__/` 認証ハンドラーと `/api/` はSPAフォールバックから除外する。
- 更新を見つけても自動再読み込みしない。利用者が入力を保存した後に更新できる通知を表示する。「あとで」は現在の表示中だけ通知を閉じる。
- 開発サーバーではService Workerを無効化し、既存の開発フローを保つ。

## オフラインでできること・できないこと

オンラインで一度開き、Service Workerのインストールが完了した端末では、画面の再読み込みと直接URLからの起動ができる。通信断時は上部に案内を表示し、復帰時に消える。

初回からオフラインの場合は利用できない。ログイン、最新データ取得、タスクの追加・更新、招待などはオンラインで行うこと。オフライン編集、操作のキュー、バックグラウンド同期は実装していない。既存のフォームやFirebaseロジックは変更せず、接続復帰を待つよう案内する。認証状態によって、オフラインでは画面本文が表示されず案内だけになる場合がある。

`navigator.onLine` は端末・ブラウザーの接続状態の目安であり、Firebase側の障害や接続先だけの通信失敗を検知するものではない。

## ローカル確認

リポジトリルートで実行する。

```sh
npm run build -w web
npm run lint
npm run preview -w web -- --host 127.0.0.1 --port 4173 --strictPort
```

1. 通常モードのChrome / Edgeで `http://127.0.0.1:4173` を開く（シークレットではインストール不可）。
2. DevToolsのApplicationでManifestの名称・アイコン・エラーなし、Service Workersのactivatedを確認する。
3. 一度再読み込みし、Service Workerで制御されていることを確認する。
4. ブラウザーのインストール操作を確認する。iPhoneはSafariの共有メニューからホーム画面へ追加する。
5. DevToolsでOfflineにし、再読み込みする。上部にオフライン案内が出る。`/teams/<ID>` 等の直接URLでも案内が表示される。
6. Onlineに戻すと案内が消える。認証待ちなどで本文が戻らない場合は再読み込みする。
7. Cache Storageにはビルド済み静的ファイルのみがあり、Firebase APIの応答がないことを確認する。
8. 画面を開いたまま別ターミナルで再ビルドする（生成JSが変わる変更を含める）。Service Workerを更新すると更新通知が出る。「あとで」で再読み込みされず、「更新して再読み込み」で切り替わることを確認する。Workboxの短時間更新判定を避けるため、初回登録から1分以上空ける。

本番はHTTPSで配信する。localhost / 127.0.0.1は開発用例外。LAN内のHTTP URLではService Workerを利用できない。iPhone / Androidの実機インストールと本番HTTPSでの認証は公開前に確認する。

## 移行前の検証結果（main基点・2026-09-30）

- 開始時は `main`、未コミット変更なし。HEAD・ローカルupstream/main・リモートmainは `99c0e2f15273341870ce958be44e75e13d1d4fbe` で一致。
- Webのbuild（型チェック含む）とlintは成功。既存の大きなJSチャンクの警告あり。
- Edgeの独立した通常プロファイルでmanifest解析、各PNG寸法、インストール条件エラーなし、`beforeinstallprompt` 発火を確認。
- Service Worker制御、オフライン再読み込み・直接URL、接続復帰、静的ファイルのみのキャッシュを確認。ページ実行時エラーなし。
- 更新通知の表示・保留・利用者による更新再読み込みを確認。
- ルートの `npm run build` はWeb成功後、Functionsのesbuildで親ディレクトリの読み取り権限エラーにより停止。Functionsの型チェックは成功。Functionsコードは変更していない。
- 依存インストール時のauditは脆弱性0件。既存依存のバージョン変更なし。ローカルNode 24.14.0と既存FunctionsのNode 22指定などにengine警告あり。
- `.git` への書き込みが環境で拒否されたためfetchとブランチ作成は未実施。最新状態は `git -c http.sslBackend=openssl ls-remote upstream refs/heads/main` で照合。変更はmain上の未コミット差分。
- commit / push / PR / deployは未実施。実機へのインストール操作と本番Firebaseログインは未検証。

参考: https://vite-pwa-org.netlify.app/guide/prompt-for-update.html

## 新UIブランチへの移行（2026-09-30）

- `upstream/feature/team-list-ui` の `a1606b8` から `feature/pwa-team-list-ui` を作成し、このチェックアウトへPWA変更を移した。
- 元の `feature/pwa` と未コミット変更は元フォルダーに保管。新ブランチ側も未コミット。commit / push / PRは実施していない。
- 新UIのGoogle Fonts設定を保持。オフライン時に外部フォントが未キャッシュならシステムフォントで表示する。
- 新UI上でWeb build・型チェック・lint・差分チェック成功。Functions buildは同じ親ディレクトリ権限エラーで停止。
- `http://127.0.0.1:4174/` でmanifest・アイコン寸法・インストール条件（エラーなし）・インストールイベント・SW制御・オフライン再読み込みと直接URL・接続復帰・静的キャッシュのみを確認。ページ実行時エラーなし。
- `5174` は開発画面（SWなし）、`4174` はPWA検証用のビルド済み画面。
- node_modulesは元フォルダーへのジャンクションで再利用。依存関係を変更する際は共有であることに注意し、独立インストールへ切り替える。