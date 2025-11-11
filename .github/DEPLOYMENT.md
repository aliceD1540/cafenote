# GitHub Actions Deployment Setup

このリポジトリはGitHub Actionsを使用してCloudflare Workersに自動デプロイします。

## 必要なGitHub Secrets

以下のSecretsをGitHub Repositoryに設定してください：

### 1. CLOUDFLARE_API_TOKEN

Cloudflare API Tokenを作成：

1. Cloudflare Dashboard > My Profile > API Tokens
2. "Create Token" をクリック
3. "Edit Cloudflare Workers" テンプレートを使用
4. または、以下の権限を持つカスタムトークンを作成：
   - Account > Workers Scripts > Edit
   - Account > Workers KV Storage > Edit
   - Account > D1 > Edit

生成されたトークンを`CLOUDFLARE_API_TOKEN`としてGitHub Secretsに登録

### 2. D1_DATABASE_ID

```bash
wrangler d1 list
```

出力から`cafenote-db`のIDをコピーして`D1_DATABASE_ID`として登録

### 3. KV_COMMENT_CACHE_ID

```bash
wrangler kv:namespace list
```

出力から`COMMENT_CACHE`のIDをコピーして`KV_COMMENT_CACHE_ID`として登録

### 4. KV_IP_LIMIT_ID

同様に`IP_LIMIT`のIDをコピーして`KV_IP_LIMIT_ID`として登録

### 5. GEMINI_API_KEY

Google AI StudioのGemini API Keyを`GEMINI_API_KEY`として登録

## GitHub Secretsの登録方法

1. GitHubリポジトリページを開く
2. Settings > Secrets and variables > Actions
3. "New repository secret" をクリック
4. Name と Value を入力して "Add secret"

## デプロイ

releaseブランチにpushすると自動的にデプロイされます：

```bash
git push origin release
```

または、GitHub ActionsのUIから手動実行も可能です。

## ブランチ戦略

- **master**: 開発ブランチ（自動デプロイなし）
- **release**: 本番リリース用ブランチ（自動デプロイ）

masterからreleaseにマージすることで本番デプロイを実行します。

## ローカル開発

ローカル開発では従来通り`wrangler.jsonc`を使用します：

```bash
cp wrangler.jsonc.example wrangler.jsonc
# wrangler.jsonc を編集
npm run dev
```

`wrangler.jsonc`は`.gitignore`に含まれているため、Gitにコミットされません。
