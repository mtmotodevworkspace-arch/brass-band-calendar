# 🎺 吹奏楽専用練習カレンダー Web アプリ (Production Release)

吹奏楽団・ブラスバンドのための練習日程・練習時間割・演奏曲目ライブラリ管理 Web アプリケーションです。
完全無料でリリース・運用が可能です。

## 🌟 主な機能

- **📅 練習日時・表示切り替え**: 月表示 / 週表示 / 日表示 / 時間割表示 / 演奏曲目ライブラリ表示
- **⏱️ 練習時間割 & 複数曲割り当て**: 各時間枠（例: 13:00〜17:00 全体合奏）に曲目を複数割り当て、直接 YouTube 参考動画を再生
- **🎼 演奏曲目ライブラリ**: 指揮者・練習ポイント・YouTube名演動画の自由編集・追加・削除・永続保存 (`localStorage`)
- **📅 期間指定 一括他カレンダー連携**: iPhone (.ics一括追加) / Googleカレンダー / Outlook / TimeTree へ一発登録
- **💬 LINE 一括送信 & 案内テキスト生成**: 1タップでLINEアプリ起動・練習案内一括送信
- **📍 GoogleMap 連携**: 練習場所をタップで Google Maps ルート検索
- **🪟 動きのある最前面表示**: クリックしたモーダル・操作画面が常に最前面に配置されるスマートレイヤー管理

## 🚀 完全無料ビルド & デプロイ方法 (完全費用0円)

### 方法 1: GitHub Pages (推奨・完全無料)
1. このリポジトリを GitHub へプッシュします。
2. GitHub リポジトリの **Settings > Pages** へ移動します。
3. Source を `main` ブランチ、Directory を `/brass_band_calendar` に設定して保存します。
4. 数分で無料の公開URL（`https://mtmoto2001.github.io/brass_band_calendar`）が発行され、LINEで直接共有できます。

### 方法 2: Vercel / Netlify / Cloudflare Pages (推奨・1分で公開)
1. [Vercel](https://vercel.com) または [Netlify](https://netlify.com) に無料登録します。
2. `brass_band_calendar` フォルダをドラッグ＆ドロップまたは GitHub 連携します。
3. SSL暗号化された無料URL（例: `https://brass-band-calendar.vercel.app`）が生成され、スマホ・PC両方から即座にアクセス可能です。
