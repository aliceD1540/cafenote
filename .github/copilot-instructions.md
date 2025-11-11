# CafeNote - Copilot Instructions

## プロジェクト概要
CafeNoteは、Cloudflare Workers + D1 + KV + Pagesで構築された匿名掲示板システムです。

## コーディング規約
- TypeScript: strict mode
- インデント: タブ
- コミットメッセージ: 英語、簡潔に

## プルリクエスト作成時の注意
プルリクエストやissueコメントを作成する際は、必ず末尾に以下の一文を追加してください：

```
---
*This pull request was created with GitHub Copilot.*
```

または

```
---
*This comment was created with GitHub Copilot.*
```

## アーキテクチャ
- **Backend**: Cloudflare Workers (TypeScript)
  - エンドポイント: `/rooms`, `/:roomId` (GET/POST)
  - D1データベースでコメント永続化
  - KVでキャッシング（5分TTL）
  - Cron Triggers: 5分ごとにD1→KVキャッシュ同期

- **Frontend**: Cloudflare Pages (静的HTML/CSS/JavaScript)
  - index.html: メインコメント画面
  - rooms.html: 部屋一覧
  - help.html: ヘルプページ
  - QRコード: qrcode.jsを使用（外部API不使用）

## 開発フロー
1. issueを確認
2. feature/#<issue_number>-xxx ブランチを作成（例: feature/#1-room-list）
3. 実装・コミット
4. プッシュしてPR作成
5. `Fixes #<issue_number>` でissueをリンク

## ブランチ命名規則
- feature: 新機能追加 → `feature/#<issue_number>-<short-description>`
- fix: バグ修正 → `fix/#<issue_number>-<short-description>`
- docs: ドキュメント修正 → `docs/#<issue_number>-<short-description>`

例:
- `feature/#1-room-list`
- `fix/#2-qr-code-display`
- `docs/#3-update-readme`
