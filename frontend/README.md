# CafeNote Frontend (Cloudflare Pages)

Cloudflare Pagesにデプロイ可能な静的HTMLフロントエンド

## 機能

- 部屋ごとのコメント表示・投稿
- QRコード表示（URLの共有を容易に）
- レスポンシブデザイン（PC・スマホ対応）
- コメントの色分け表示
- エラー・成功・警告メッセージの表示
- ヘルプページ

## セットアップ

### 1. APIのURLを設定

`index.html`を開き、`API_URL`を実際のCloudflare WorkersのURLに変更してください：

```javascript
const API_URL = 'https://guestbook-backend.your-subdomain.workers.dev';
```

### 2. ローカルでテスト

任意のHTTPサーバーで`sample.html`を開いてテスト：

```bash
# Pythonの場合
python3 -m http.server 8000

# Node.jsのhttp-serverの場合
npx http-server -p 8000
```

ブラウザで`http://localhost:8000/sample.html?room=test`にアクセス

### 3. Cloudflare Pagesへデプロイ

#### 方法1: Cloudflare Dashboard経由

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) > Workers & Pages > Create application > Pages > Connect to Git
2. GitHubリポジトリを接続
3. Build settings:
   - Framework preset: None
   - Build command: (空欄)
   - Build output directory: `/frontend`
4. Deploy

#### 方法2: Wrangler CLI経由

```bash
cd frontend
npx wrangler pages deploy . --project-name=guestbook
```

## 使い方

### 部屋IDの指定

URLパラメータ`room`で部屋IDを指定できます：

```
https://your-pages.pages.dev/sample.html?room=AAA
https://your-pages.pages.dev/sample.html?room=room123
```

部屋IDを指定しない場合は、デフォルトで`AAA`が使用されます。

### QRコードの表示

ページ上部にQRコードが自動生成され、現在のページURLを表すQRコードが表示されます。これをスマートフォンで読み取ることで、簡単にアクセス可能です。

## カスタマイズ

### デザインの変更

`<style>`タグ内のCSSを編集してデザインをカスタマイズできます。

### 自動更新間隔の変更

デフォルトでは30秒ごとにコメントを再読み込みします。間隔を変更する場合：

```javascript
// 最後の行を編集
setInterval(loadComments, 60000); // 60秒ごとに変更
```

### QRコードサービスの変更

デフォルトでは`qrserver.com`のAPIを使用していますが、他のQRコード生成サービスに変更可能です。

## トラブルシューティング

### CORSエラーが発生する

バックエンドのCORS設定を確認してください。`backend/src/index.ts`で適切なoriginが設定されているか確認。

### コメントが表示されない

1. ブラウザの開発者ツールでコンソールエラーを確認
2. `API_URL`が正しく設定されているか確認
3. バックエンドが正常にデプロイされているか確認

### 投稿できない

1. レート制限（1時間に1回）に引っかかっていないか確認
2. メッセージが100文字以内か確認
3. バックエンドのログを確認
