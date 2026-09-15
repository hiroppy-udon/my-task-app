# My Task App - 目標達成コミットメントアプリ

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-blue)
![Vite](https://img.shields.io/badge/Vite-7-blue)

## 🎯 概要

目標に「誓約」として向き合うためのWebアプリ。

タスクを立てるだけでなく、「なぜやるのか」「達成できなかった時のリスク」を明文化し、
自分の声で宣言を録音してから確定する。確定後は日々「達成/未達成」を正直に記録し、
ヒートマップで継続状況を可視化する。

データはSupabase上のDBを唯一の正(source of truth)として同期する。LocalStorageは
オフライン時などのための一時キャッシュとして併用している。

> 🔒 音声データの暗号化(AES-GCM)や、声質変換の機能は過去に検討・試作したが、
> 現在のコードベースには含まれていない。

## ✨ 主な機能

- ✅ 目標(契約)の新規作成 — タイトル・理由・期限・リスクを入力
- ✅ 音声で宣言を録音し、確定前に聴き直して確認
- ✅ 日次で「達成できた/ダメだった」を記録(1日1回、上書き不可)
- ✅ 達成・未達成の履歴をヒートマップ(カレンダー形式)で可視化
- ✅ 目標ごとの累計達成日数の集計
- ✅ Supabaseによるクラウド同期(複数端末間でデータ共有)
- ✅ PWA対応(`vite-plugin-pwa`)
- ✅ 契約の破棄(削除)機能(確認モーダルあり)

## 🛠 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フロントエンド | React 19 |
| ビルドツール | Vite 7 |
| スタイリング | 素のCSS(`App.css` / `index.css`) |
| 音声処理 | MediaRecorder API(録音)、Audio API(再生) |
| データ永続化 | Supabase(正)+ LocalStorageキャッシュ |
| ヒートマップ表示 | 自前実装(`react-calendar-heatmap`は依存に含むが現状未使用) |
| ツールチップ | react-tooltip |
| PWA | vite-plugin-pwa |

## 🚀 セットアップ

### 前提条件
- Node.js 18.x 以上
- npm
- Supabaseプロジェクト(`goals`テーブルを持つもの)

### 環境変数

プロジェクトルートに `.env` を作成し、Supabaseの接続情報を設定する。

```bash
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

`goals`テーブルには最低限、以下のカラムが必要(`src/lib/supabase.js`のマッピング参照):
`id, title, reason, deadline, risk, reward, is_signed, voice_data, logs, failure_logs, updated_at`

### インストール
```bash
# リポジトリのクローン
git clone https://github.com/hiroppy-udon/my-task-app.git
cd my-task-app

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで http://localhost:5173 を開く

### ビルド
```bash
# 本番用ビルド
npm run build

# ビルドのプレビュー
npm run preview
```

## 📂 プロジェクト構成
```
my-task-app/
├── src/
│   ├── lib/
│   │   └── supabase.js   # Supabaseクライアント & DB⇔JS変換
│   ├── assets/
│   ├── App.jsx            # メインロジック・全画面をここに集約
│   ├── App.css
│   ├── index.css
│   └── main.jsx            # エントリーポイント
├── public/
├── package.json
└── vite.config.js
```

## 📚 開発の背景

- 個人開発での課題解決(目標に対して継続力を維持したい)
- 元々はタスク管理+モチベーション音声録音アプリとして開発を開始
- 「音声という個人データを扱うから暗号化しよう」という動機で暗号技術入門の学習を進めていたが、
  アプリの実態が「Supabase同期の目標コミットメントアプリ」へと変化したため、
  暗号化機能は現状スコープ外としている
- 航空宇宙分野への応用を見据えたセキュリティ学習という関心自体は継続中(このアプリとは別軸)

## 🤝 コントリビューション

このプロジェクトは個人学習目的だが、フィードバックやアドバイスは歓迎する。

## 📝 ライセンス

MIT License

## 👤 作成者

GitHub: [@hiroppy-udon](https://github.com/hiroppy-udon)