# Guestbook Backend (Cloudflare Workers)

Cloudflare Workers + D1 + KVを使用したゲストブックバックエンドシステム

## 機能

- 部屋ごとのコメント投稿・閲覧
- IP制限（1時間に1回まで）
- Gemini APIを使ったコンテンツモデレーション
- KVキャッシュによる高速レスポンス
- 5分ごとの自動キャッシュ同期（Cron Triggers）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. D1データベースの作成

```bash
wrangler d1 create guestbook-db
```

作成されたdatabase_idを`wrangler.jsonc`の`database_id`に設定してください。

### 3. スキーマの適用

```bash
wrangler d1 execute guestbook-db --file=./schema.sql
```

### 4. KVネームスペースの作成

```bash
wrangler kv:namespace create "COMMENT_CACHE"
wrangler kv:namespace create "IP_LIMIT"
```

作成された各IDを`wrangler.jsonc`の対応する`id`に設定してください。

### 5. Gemini API Keyの設定

Gemini APIキーを取得し、以下のコマンドで設定：

```bash
wrangler secret put GEMINI_API_KEY
```

または、`wrangler.jsonc`の`vars`セクションに直接記載（開発環境のみ推奨）。

### 6. ローカル開発

```bash
npm run dev
```

### 7. デプロイ

```bash
npm run deploy
```

## API仕様

### GET /:roomId

指定された部屋のコメント一覧を取得

**レスポンス例:**
```json
[
  {
    "id": "uuid",
    "message": "こんにちは！",
    "created_at": 1699999999999
  }
]
```

### POST /:roomId

指定された部屋に新しいコメントを投稿

**リクエストボディ:**
```json
{
  "message": "こんにちは！"
}
```

**レスポンス例 (成功):**
```json
{
  "success": true,
  "id": "uuid",
  "warning": "軽度の不適切表現が検出されたため、内容は伏せられました。"
}
```

**エラーレスポンス:**
- 400: バリデーションエラー
- 403: コンテンツモデレーション拒否
- 429: レート制限超過

## コンテンツモデレーション

Gemini APIを使用して、投稿内容を以下のように判定：

- **レベル1**: 問題なし（通常投稿）
- **レベル2**: 軽度の不適切表現（"***"に置換して投稿）
- **レベル3**: 重度の不適切表現・個人情報（投稿拒否）

## 自動キャッシュ同期

5分ごとにCron Triggersが起動し、D1からKVへコメントデータを同期します。これによりGETリクエストの高速化と、Cloudflare無料枠内での運用を実現しています。

## 注意事項

- Gemini API Keyが設定されていない場合、コンテンツモデレーションはスキップされます
- 本番環境では必ず`wrangler secret`でAPIキーを設定してください
- Cron Triggersは本番環境でのみ動作します（ローカル開発では手動でテスト）

