# 吹奏楽専用練習カレンダー Web アプリ (Brass Band Practice Calendar)

吹奏楽団・ブラスバンド・オーケストラの練習スケジュール、時間割、練習曲、指導者、練習ポイント（長文対応）、YouTube参考音源、Google Maps練習場所連携、LINE共有、各種カレンダー連携（Google / Outlook / iPhone / TimeTree）を搭載した Web アプリケーションです。

---

## 🌟 主な機能 (Key Features)

1. **表示切り替え**:
   - **月表示 (Month View)**: 月間の練習日と練習区分（合奏・パート・個人・本番）をひと目で確認。
   - **週表示 (Week View)**: 7日間のスケジュールを縦コラムで比較。
   - **日表示 (Day View)**: 当日の詳細情報と時間割を表示。
   - **時間割表示 (Timetable View)**: 吹奏楽練習特有の時間枠ごとの曲目、指導者、長文の練習ポイント、YouTube音源をリスト表示。

2. **練習曲 & 練習ポイント & 参考音源 (YouTube)**:
   - 1回の練習につき複数の練習曲を登録可能。
   - 長文の練習ポイント（小節番号、アタック、テンポ、アーティキュレーション、チューニング注意事項など）に対応。
   - YouTube URLを入力すると、アプリ内で直接埋め込み動画再生・参考音源の視聴が可能。

3. **練習場所 & Google Maps連携**:
   - 会館名・部屋番号＋住所を登録。
   - ワンタップで Google Maps のナビゲーションを直接起動。

4. **カレンダー連携**:
   - **Googleカレンダー**: 「Googleカレンダーに追加」でワンクリック登録。
   - **Outlookカレンダー**: Outlook Onlineに追加。
   - **iPhoneカレンダー (Apple iCal)**: `.ics` ファイルを直接ダウンロードしてiPhoneのカレンダーに追加。
   - **TimeTree**: TimeTree用フォーマットテキストコピー。

5. **LINE共有**:
   - アプリの「LINEで共有」ボタン 1 タップで、練習日時・場所・時間割・練習曲・ポイント・アプリURLを LINE に直接送信。
   - クリップボードへの「LINE用テキストコピー」機能。

6. **デザイン (Liquid Glass UI)**:
   - 金管楽器の輝き（Brass Gold）とクラシックなコンサートホールの雰囲気を融合させた Glassmorphism デザイン。
   - PC・スマートフォン（iOS / Android）両対応のフルレスポンシブ。

7. **セキュリティ & プライバシー (完全無料)**:
   - LocalStorage を使用したブラウザ内データ保存（サーバー送信なしで安全）。
   - JSON ファイルでのエクスポート／インポート（バックアップ・団員共有対応）。
   - XSS 対策エスケープ処理済。

---

## 🚀 無料でのリリース・デプロイ手順 (Free Deployment Guide)

本アプリはサーバー費用・データベース費用が **完全0円（永続無料）** で運用できます。

### 方法1: Vercel に 1 タップでデプロイ（推奨）
1. [Vercel](https://vercel.com/) に無料会員登録します。
2. 本リポジトリの `brass_band_calendar` ディレクトリを GitHub / GitLab にプッシュします。
3. Vercel ダッシュボードで `Import Project` を選択し、リポジトリを選択して「Deploy」をクリックします。
4. 数秒で `https://your-band-calendar.vercel.app` のような公開URLが発行され、リリース完了です！

### 方法2: GitHub Pages で公開
1. GitHub リポジトリの `Settings` > `Pages` を開きます。
2. `Branch` を `main` (または `master`) の `root` または `/brass_band_calendar` に設定して `Save` をクリックします。
3. `https://<your-username>.github.io/<repository-name>/` で無料で即座にアクセス可能になります。

---

## 💻 ローカルでの起動方法 (Local Execution)

```bash
# brass_band_calendar ディレクトリに移動
cd brass_band_calendar

# Node.js http-server または npx serve でローカルサーバーを起動
npx serve .
# または
npx http-server .
```
ブラウザで `http://localhost:3000` または表示されたアドレスを開いてください。
