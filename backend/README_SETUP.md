# セットアップ手順

## 1. 設定ファイルの作成

```bash
cp wrangler.jsonc.example wrangler.jsonc
```

## 2. wrangler.jsonc を編集

以下の値を実際の値に置き換えてください：

- `YOUR_DATABASE_ID` - D1データベースID
- `YOUR_COMMENT_CACHE_KV_ID` - コメントキャッシュ用KV ID
- `YOUR_IP_LIMIT_KV_ID` - IP制限用KV ID
- `YOUR_GEMINI_API_KEY_HERE` - Gemini API Key

## 3. 重要

**wrangler.jsonc はGitにコミットしないでください！**
このファイルは `.gitignore` に含まれています。
