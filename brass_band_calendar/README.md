# 🎺 吹奏楽専用練習カレンダー Web アプリ (Standalone Project)

吹奏楽団・ブラスバンドのための練習日程・練習時間割・演奏曲目ライブラリ管理 Web アプリケーションです。
独立した専用プロジェクトとして完全無料で公開・運用が可能です。

## 🌟 主な機能

- **📅 練習日時・表示切り替え**: 月表示 / 週表示 / 日表示 / 時間割表示 / 演奏曲目ライブラリ表示
- **⏱️ 練習時間割 & 複数曲割り当て**: 各時間枠（例: 13:00〜17:00 全体合奏）に曲目を複数割り当て、直接 YouTube 参考動画を再生
- **🎼 演奏曲目ライブラリ**: 指揮者・練習ポイント・YouTube名演動画の自由編集・追加・削除・永続保存 (`localStorage`)
- **📅 期間指定 一括他カレンダー連携**: iPhone (.ics一括追加) / Googleカレンダー / Outlook / TimeTree へ一発登録
- **💬 LINE 一括送信 & 案内テキスト生成**: 1タップでLINEアプリ起動・練習案内一括送信
- **📍 GoogleMap 連携**: 練習場所をタップで Google Maps ルート検索
- **🪟 動きのある最前面表示**: クリックしたモーダル・操作画面が常に最前面に配置されるスマートレイヤー管理

## 🚀 独立プロジェクトとしての無料デプロイ手順 (完全費用0円)

### 1. GitHub 新規リポジトリへのプッシュ
1. GitHub にて新しい空のリポジトリ（例: `brass-band-calendar`）を作成します。
2. ターミナルで以下のコマンドを実行し、新規リポジトリへリモート登録＆プッシュします：
   ```bash
   git remote add origin https://github.com/mtmoto2001/brass-band-calendar.git
   git push -u origin main
   ```

### 2. GitHub Pages での自動無料公開
1. リポジトリの **Settings > Pages > Source** を **「GitHub Actions」** に選択します。
2. 自動デプロイが起動し、専用の無料公開URL（`https://mtmoto2001.github.io/brass-band-calendar/`）が発行されます。

### 3. Vercel での無料公開 (代替方法)
1. [Vercel](https://vercel.com) にログインし、「Add New Project」から `brass-band-calendar` リポジトリを選択します。
2. 無料ドメイン（例: `https://brass-band-calendar.vercel.app`）が即座に発行されます。
