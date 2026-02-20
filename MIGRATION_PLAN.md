# Supabase移行計画

## 概要
Pythonバックエンドの `/sync` をSupabaseに置き換える。
`/convert`（ずんだもん音声変換）は引き続きローカルPythonサーバーを使うが、URLを `.env` で管理する。

---

## 変更するファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `package.json` | `@supabase/supabase-js` を追加 |
| `.env` (新規作成) | Supabase認証情報 + 変換サーバーURL |
| `src/lib/supabase.js` (新規作成) | Supabaseクライアント初期化 |
| `src/App.jsx` | 同期ロジックをSupabaseに置き換え |

---

## Supabaseテーブル設計

ユーザーが Supabase ダッシュボードで実行するSQL:

```sql
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  reason TEXT DEFAULT '',
  deadline TEXT DEFAULT '',
  risk TEXT DEFAULT '',
  reward TEXT DEFAULT '',
  is_signed BOOLEAN DEFAULT false,
  voice_data TEXT,
  zunda_voice_data TEXT,
  logs TEXT[] DEFAULT ARRAY[]::TEXT[],
  failure_logs TEXT[] DEFAULT ARRAY[]::TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON goals FOR ALL USING (true) WITH CHECK (true);
```

---

## App.jsx の変更箇所

### 削除するもの
- `serverUrl` state（14-16行）
- URLパラメータ読み取り useEffect（18-28行）
- `SERVER_URL` localStorage useEffect（45-47行）
- `/sync` fetch useEffect（49-77行）

### 追加するもの
- Supabaseインポート
- マウント時に Supabase からデータ読み込み（localStorageとマージ）
- goalsが変わったら Supabase にupsert（2秒デバウンス）

### 変更するもの
- `${serverUrl}/convert` → `${import.meta.env.VITE_CONVERT_URL}/convert`

---

## camelCase ↔ snake_case マッピング

| JSのキー | DBのカラム |
|---------|----------|
| `isSigned` | `is_signed` |
| `voiceData` | `voice_data` |
| `zundaVoiceData` | `zunda_voice_data` |
| `failureLogs` | `failure_logs` |

---

## 同期ロジック（新）

```
マウント時:
  1. Supabase から全ゴールを取得
  2. localStorage のゴールとマージ（logs は和集合）
  3. マージ結果を state と localStorage にセット

goalsが変化したとき（2秒デバウンス）:
  1. 全ゴールを Supabase にupsert（camelCase→snake_case変換）
```

---

## .env ファイル

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
VITE_CONVERT_URL=https://xxx.trycloudflare.com
```

VITE_CONVERT_URL はずんだもん変換を使うときだけ設定すればよい。
未設定でも変換失敗のエラーになるだけで、他の機能は正常動作する。
