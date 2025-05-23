# Gemma3 Summarizer

Chrome拡張機能：Ollama（Gemma3モデル）HTTP APIを使ってWebページのテキストを日本語で要約します。

## 特徴
- 📝 **自動要約**: ページを開いてクリックするだけで即座に要約を生成
- 🎨 **Markdownレンダリング**: 見出し、リスト、コードブロック等に対応した美しい表示
- 📋 **ワンクリックコピー**: Markdown形式で要約をクリップボードにコピー
- 🔧 **動的モデル選択**: Ollama APIから利用可能なモデル一覧を自動取得
- 🏷️ **モデル表示**: ヘッダーに現在選択中のモデル名を表示
- ⚡ **スマート処理**: 長文の自動切り捨て（5000文字制限）と`<think>`タグの除去

## デフォルト設定
- Ollamaエンドポイント: `http://localhost:11434`
- モデル名: `gemma3:27b-it-qat`

## インストール
1. このリポジトリをクローンまたはダウンロード
   ```bash
   git clone https://github.com/unco3/gemma3-summarizer.git
   ```
2. Chrome（またはChromium系ブラウザ）の拡張機能画面を開く（`chrome://extensions/`）
3. 右上の「デベロッパーモード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」をクリックし、`extension`ディレクトリを選択

## 利用方法
1. **要約の実行**: ブラウザツールバーの拡張アイコンをクリック
   - ページ内テキストの要約が自動実行され、Markdownレンダリングされた結果が表示されます
2. **コピー機能**: 「コピー」ボタンでMarkdown形式の生の要約をクリップボードへコピー
3. **設定変更**: ⚙️アイコンをクリックしてオプション画面を開く
   - エンドポイントを変更すると利用可能なモデル一覧が自動更新されます
   - モデルを変更すると拡張機能のヘッダータイトルも更新されます

## オプション設定
- **Ollamaエンドポイント**: Ollama HTTP APIサーバーのホストとポート（例: `http://localhost:11434`）
- **モデル名**: 要約に使用するモデル（接続先から自動取得されたリストから選択）

## 対応機能
### Markdownレンダリング
- ✅ 見出し（H1-H6）
- ✅ 箇条書きリスト
- ✅ コードブロック・インラインコード
- ✅ 引用ブロック
- ✅ 太字テキスト

### エラーハンドリング
- 🔌 接続エラーの詳細表示
- 🛡️ APIエラーレスポンスの解析
- 📄 ページアクセス権限エラーの対応
- ⏱️ タイムアウト処理

## 開発・デバッグ
- `popup.js` や `options.js` を編集後は、拡張機能をリロードして動作確認してください
- デバッグ用のコンソールログが各ファイルに含まれています（コメントアウト済み）

## 技術仕様
- **Manifest Version**: 3
- **必要な権限**: `activeTab`, `scripting`, `storage`
- **テキスト制限**: 5000文字（超過分は自動切り捨て）
- **対応API**: Ollama HTTP API (`/api/generate`, `/api/tags`)

---
_この拡張機能は [Ollama](https://ollama.com/) のHTTP APIを利用します_。