# CafeNote デプロイ手順

## 前提条件

- Cloudflareアカウントを作成済み
- wrangler CLIがインストール済み（`npm install -g wrangler`）

## 1. Cloudflareにログイン

```bash
wrangler login
```

## 2. D1データベースの作成

```bash
cd backend
wrangler d1 create cafenote-db
```

出力例:
```
✅ Successfully created DB 'guestbook-db'

[[d1_databases]]
binding = "DB"
database_name = "cafenote-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

この`database_id`をコピーして、`backend/wrangler.jsonc`の`database_id`を更新してください。

## 3. データベーススキーマの適用

```bash
wrangler d1 execute cafenote-db --file=./schema.sql
```

## 4. KVネームスペースの作成

コメントキャッシュ用:
```bash
wrangler kv:namespace create "COMMENT_CACHE"
```

出力例:
```
🌀 Creating namespace with title "guestbook-backend-COMMENT_CACHE"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "COMMENT_CACHE", id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
```

IP制限用:
```bash
wrangler kv:namespace create "IP_LIMIT"
```

出力例:
```
🌀 Creating namespace with title "guestbook-backend-IP_LIMIT"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "IP_LIMIT", id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
```

それぞれの`id`をコピーして、`backend/wrangler.jsonc`の対応する`id`を更新してください。

## 5. 環境変数の設定

`backend/wrangler.jsonc`の`vars`セクションで環境を設定:

```jsonc
"vars": {
  "ENVIRONMENT": "production",  // 本番環境では "production" に変更
  "GEMINI_API_KEY": "your-api-key",
  "GEMINI_MODEL": "gemini-2.5-flash-lite"
}
```

**重要**: `ENVIRONMENT`を`"production"`に設定すると、デバッグエンドポイント（`/debug/d1`, `/debug/kv`, `/trigger-sync`）が無効化されます。

## 6. Gemini API Keyの設定（オプションだが推奨）

Google AI Studioで取得したGemini API Keyを設定:

```bash
wrangler secret put GEMINI_API_KEY
```

プロンプトが表示されたら、APIキーを入力してEnterを押してください。

**注意**: APIキーを設定しない場合、コンテンツモデレーションはスキップされます。

## 7. デプロイ

```bash
npm run deploy
```

## 8. 動作確認

デプロイ後、表示されるWorkerのURLにアクセスして動作確認:

```bash
# コメント一覧取得
curl https://guestbook-backend.your-subdomain.workers.dev/test-room

# コメント投稿
curl -X POST https://cafenote-backend.your-subdomain.workers.dev/test-room \
  -H "Content-Type: application/json" \
  -d '{"message":"テストメッセージ"}'
```

## 8. Cron Triggersの確認

Cloudflare Dashboardから以下を確認:
1. Workers & Pages > あなたのWorker > Triggers
2. Cron Triggersが`*/5 * * * *`（5分ごと）に設定されていることを確認

## トラブルシューティング

### D1データベースが見つからない

```bash
wrangler d1 list
```

で作成済みデータベースを確認できます。

### KVネームスペースが見つからない

```bash
wrangler kv:namespace list
```

で作成済みネームスペースを確認できます。

### ローカルでの開発

```bash
npm run dev
```

ローカル開発時は、`http://localhost:8787/`でSwagger UIにアクセスできます。

**注意**: Cron Triggersはローカル環境では動作しません。
