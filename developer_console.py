import streamlit as st
import pandas as pd
import json
import os
import datetime
import data_manager
import ai_core
import line_api

def mask_key(key: str) -> str:
    if not key:
        return "未設定"
    if len(key) <= 8:
        return "***"
    return f"{key[:4]}...{key[-4:]}"

# ページ構成設定
st.set_page_config(page_title="Pet Daily AI - 開発者コントロールセンター", page_icon="🛠️", layout="wide")

# カスタムCSSで開発者画面らしいシャープでモダンなデザインへ
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&family=Noto+Sans+JP:wght@400;700&display=swap');
    html, body, [data-testid="stAppViewContainer"] {
        font-family: 'Noto Sans JP', sans-serif;
    }
    .console-header {
        background: linear-gradient(135deg, #1E1E2F 0%, #2A2A40 100%);
        padding: 2rem;
        border-radius: 16px;
        margin-bottom: 2rem;
        border: 1px solid #3A3A55;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }
    .console-title {
        color: #00E6FF;
        font-weight: 700;
        font-size: 2.2rem;
        margin: 0;
    }
    .console-subtitle {
        color: #A0A0C0;
        font-size: 1rem;
        margin-top: 0.5rem;
    }
    .kpi-card {
        background-color: #1E1E2E;
        padding: 1.5rem;
        border-radius: 12px;
        border-left: 5px solid #00E6FF;
        box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        text-align: center;
    }
    .kpi-value {
        font-size: 2.2rem;
        font-weight: 700;
        color: #FFFFFF;
        margin-bottom: 0.2rem;
    }
    .kpi-label {
        font-size: 0.85rem;
        color: #A0A0C0;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    .code-font {
        font-family: 'Fira Code', monospace;
    }
</style>
""", unsafe_allow_html=True)

# 開発者コンソールタイトルヘッダー
st.markdown("""
<div class="console-header">
    <h1 class="console-title">🛠️ Pet Daily AI Developer Console</h1>
    <p class="console-subtitle">実証PoC 10世帯向けシステム監視・テレメトリ・API疎通確認コントロールセンター</p>
</div>
""", unsafe_allow_html=True)

# 設定データのロード
config = data_manager.load_config()

# 開発者コンソールのサイドバー設定（クラウドデータ同期トグル）
st.sidebar.markdown("### ☁️ クラウド連携設定")
data_source = st.sidebar.radio(
    "データソース切り替え", 
    ["📂 ローカルファイル表示", "☁️ クラウド（Google Sheets）同期"], 
    index=1,
    help="スマホ実機からGoogle Sheetsに送信された全世帯データと実行ログをリアルタイムで同期します。"
)

# デフォルトのGASプロキシURL
default_proxy_url = "https://script.google.com/macros/s/AKfycby_yneEPDfmGGpGrZwCgEWt3KIQxZ_5V5LgX_8z9ItloS_Pg0p-SxsAqBW0OFdWa_WFog/exec"

# ログファイルの設定
log_file = data_manager.USAGE_LOG_FILE
logs = []
profiles = []

if data_source == "☁️ クラウド（Google Sheets）同期":
    api_key = config.get("GOOGLE_API_KEY", "")
    with st.spinner("クラウド上の Google Sheets データベース同期中..."):
        logs = data_manager.load_logs_cloud(default_proxy_url, api_key)
        profiles = data_manager.load_all_profiles() # 念のためローカル側もフォールバック用に取得
        cloud_profiles = data_manager.load_profiles_cloud(default_proxy_url, api_key)
        if cloud_profiles:
            profiles = cloud_profiles
else:
    # ローカルファイルの読み込み
    if os.path.exists(log_file):
        try:
            with open(log_file, "r", encoding="utf-8", errors="replace") as f:
                for line in f:
                    if line.strip():
                        try:
                            logs.append(json.loads(line.strip()))
                        except:
                            pass
        except Exception as e:
            st.error(f"ログファイルの読み込みエラー: {e}")
    profiles = data_manager.load_all_profiles()

df_logs = pd.DataFrame(logs)
df_profiles = pd.DataFrame(profiles)

# --- 1. KPIダッシュボードエリア ---
st.markdown("### 📊 システム利用状況サマリー")
col_kpi1, col_kpi2, col_kpi3, col_kpi4 = st.columns(4)

total_households = len(df_profiles) if not df_profiles.empty else 0
total_generations = len(df_logs) if not df_logs.empty else 0
error_count = len(df_logs[df_logs["status"] == "ERROR"]) if not df_logs.empty and "status" in df_logs.columns else 0
error_rate = (error_count / total_generations * 100) if total_generations > 0 else 0.0

with col_kpi1:
    st.markdown(f"""
    <div class="kpi-card" style="border-left-color: #00E6FF;">
        <div class="kpi-value">{total_households}</div>
        <div class="kpi-label">登録中の世帯数 (スマホ)</div>
    </div>
    """, unsafe_allow_html=True)

with col_kpi2:
    st.markdown(f"""
    <div class="kpi-card" style="border-left-color: #FFB800;">
        <div class="kpi-value">{total_generations}</div>
        <div class="kpi-label">累計ストーリー生成回数</div>
    </div>
    """, unsafe_allow_html=True)

with col_kpi3:
    st.markdown(f"""
    <div class="kpi-card" style="border-left-color: #FF4A4A;">
        <div class="kpi-value">{error_count}</div>
        <div class="kpi-label">システムエラー発生数</div>
    </div>
    """, unsafe_allow_html=True)

with col_kpi4:
    st.markdown(f"""
    <div class="kpi-card" style="border-left-color: #A652FF;">
        <div class="kpi-value">{error_rate:.1f}%</div>
        <div class="kpi-label">APIエラー発生率</div>
    </div>
    """, unsafe_allow_html=True)

st.write("---")

# メインタブ構成
tab_dashboard, tab_households, tab_api_test, tab_raw_logs = st.tabs([
    "📊 利用グラフ分析", 
    "👥 登録世帯一覧", 
    "🔑 API疎通テスト＆管理", 
    "📋 サーバ生ログビューワー"
])

# --- TAB 1: 利用グラフ分析 ---
with tab_dashboard:
    if df_logs.empty:
        st.info("データがありません。思い出ストーリーが生成されると、ここにグラフ分析がリアルタイム描画されます。")
    else:
        g_col1, g_col2 = st.columns(2)
        
        with g_col1:
            st.markdown("#### 👥 世帯（ペット名）別の思い出生成頻度")
            if "pet_name" in df_logs.columns:
                active_users = df_logs.groupby(["user_id", "pet_name"]).size().reset_index(name="生成回数")
                active_users["表示名"] = active_users["pet_name"] + " (" + active_users["user_id"] + ")"
                active_users = active_users.sort_values(by="生成回数", ascending=False)
                st.bar_chart(active_users.set_index("表示名")["生成回数"], horizontal=True, color="#00E6FF")
            
        with g_col2:
            st.markdown("#### 🎨 人気の小説ジャンル割合")
            if "genre" in df_logs.columns:
                genre_counts = df_logs[df_logs["genre"] != ""]["genre"].value_counts()
                st.bar_chart(genre_counts, color="#FFB800")
        
        st.write("")
        st.markdown("#### 📈 時間帯別ストーリー生成アクティビティ")
        if "timestamp" in df_logs.columns:
            try:
                df_logs["date_hour"] = pd.to_datetime(df_logs["timestamp"]).dt.strftime("%Y-%m-%d %H:00")
                hourly_counts = df_logs.groupby("date_hour").size().reset_index(name="生成回数")
                st.line_chart(hourly_counts.set_index("date_hour")["生成回数"], color="#A652FF")
            except Exception as e:
                st.caption(f"時系列パースエラー: {e}")

# --- TAB 2: 登録世帯一覧 ---
with tab_households:
    st.markdown("#### 🐾 登録世帯一覧 (10世帯PoC)")
    st.write("一般ユーザーがスマートフォンから初回登録・更新したペット情報一覧（最新順）。")
    
    if df_profiles.empty:
        st.warning("まだ登録世帯がありません。ユーザーがスマホで登録すると、ここに自動表示されます。")
    else:
        st.dataframe(
            df_profiles,
            use_container_width=True,
            column_config={
                "registered_at": st.column_config.TextColumn("登録日時", width="medium"),
                "user_id": st.column_config.TextColumn("世帯ID", width="small"),
                "name": st.column_config.TextColumn("名前", width="small"),
                "pet_type": st.column_config.TextColumn("種別", width="small"),
                "breed": st.column_config.TextColumn("品種", width="medium"),
                "age_display": st.column_config.TextColumn("年齢", width="medium"),
                "owner_call": st.column_config.TextColumn("呼び方", width="small")
            }
        )

# --- TAB 3: API疎通テスト＆管理 ---
with tab_api_test:
    st.markdown("#### 🔑 現在ロードされている資格情報")
    col_c1, col_c2, col_c3, col_c4 = st.columns(4)
    with col_c1:
        st.markdown(f"**Gemini APIキー:** <span class='code-font'>{mask_key(config.get('GOOGLE_API_KEY'))}</span>", unsafe_allow_html=True)
    with col_c2:
        st.markdown(f"**LINEトークン:** <span class='code-font'>{mask_key(config.get('LINE_CHANNEL_ACCESS_TOKEN'))}</span>", unsafe_allow_html=True)
    with col_c3:
        st.markdown(f"**VOICEVOX URL:** <span class='code-font'>{config.get('VOICEVOX_API_URL', '未設定 ⚠️')}</span>", unsafe_allow_html=True)
    with col_c4:
        st.markdown(f"**VOICEVOX APIキー:** <span class='code-font'>{mask_key(config.get('VOICEVOX_API_KEY'))}</span>", unsafe_allow_html=True)
    
    st.write("---")
    
    # 疎通テストフォーム
    st.markdown("##### 📡 API接続疎通テスト")
    st.write("「テスト実行」ボタンを押すと、実際のAPIに対して超軽量なリクエストを送り、キーが有効か検証できます。")
    
    test_google, test_line = st.columns(2)
    
    with test_google:
        st.markdown("###### 🧠 Gemini API 接続テスト")
        st.caption("Gemini 1.5 Flash（gemini-flash-latest）に「こんにちは」と送信し、1単語の応答を待ちます。")
        if st.button("⚡ Gemini API 疎通テストを実行", key="btn_test_gemini", use_container_width=True):
            api_key = config.get("GOOGLE_API_KEY")
            if not api_key:
                st.error("Gemini APIキーが未設定です。")
            else:
                with st.spinner("接続検証中..."):
                    try:
                        response = ai_core.run_lightweight_test(api_key)
                        st.success("✨ Gemini API 接続疎通に成功しました！")
                        st.info(f"AIからの応答: {response}")
                    except Exception as e:
                        st.error(f"❌ 接続失敗: {e}")
                        
    with test_line:
        st.markdown("###### 💬 LINE Messaging API テスト")
        st.caption("LINEチャンネルアクセストークンを用いて、ダミーのブロードキャスト送信が受け入れられるか確認します。")
        if st.button("⚡ LINE API 疎通テストを実行", key="btn_test_line", use_container_width=True):
            line_token = config.get("LINE_CHANNEL_ACCESS_TOKEN")
            if not line_token:
                st.error("LINEアクセストークンが未設定です。")
            else:
                with st.spinner("LINE疎通検証中..."):
                    status = line_api.test_line_credentials(line_token)
                    if "成功" in status or "200" in status or "400" in status:
                        st.success("✨ LINE API エンドポイントとの疎通を確認しました！")
                        st.info(f"API応答ステータス: {status}")
                    else:
                        st.error(f"❌ LINE疎通失敗: {status}")
                        
    st.write("---")
    
    # キー設定上書き保存フォーム
    st.markdown("##### 📝 ローカル API設定の直接編集")
    st.write("ローカルの `config.json` を直接編集して上書き保存します。保存するとクラウド（Google Sheets / GAS）へも自動同期されます。")
    
    with st.form(key="form_dev_config"):
        edit_line = st.text_input("LINEアクセストークン", value=config.get("LINE_CHANNEL_ACCESS_TOKEN", ""), type="password")
        edit_google = st.text_input("Google Gemini APIキー", value=config.get("GOOGLE_API_KEY", ""), type="password")
        edit_voicevox_url = st.text_input("VOICEVOX 接続先URL", value=config.get("VOICEVOX_API_URL", ""))
        edit_voicevox_key = st.text_input("VOICEVOX APIキー", value=config.get("VOICEVOX_API_KEY", ""), type="password")
        
        btn_save = st.form_submit_button("💾 設定をローカル config.json ＆ クラウドDB に保存")
        if btn_save:
            data_manager.save_config(edit_line, edit_google, edit_voicevox_url, edit_voicevox_key)
            st.success("ローカル config.json ＆ クラウドデータベースの更新が完了しました！")
            st.rerun()

# --- TAB 4: サーバ生ログビューワー ---
with tab_raw_logs:
    st.markdown("#### 📋 サーバ実行ログ（デバッグ・トレース用）")
    st.write("思い出ストーリー生成リクエストごとの、生の詳細な実行データをリアルタイムで時系列で確認できます（最新50件）。")
    
    if df_logs.empty:
        st.warning("実行ログがまだありません。アプリが動作するとここに追加されます。")
    else:
        # 新しい順にソート
        df_logs_sorted = df_logs.iloc[::-1].head(50)
        
        # 表示調整
        st.dataframe(
            df_logs_sorted,
            use_container_width=True,
            column_config={
                "timestamp": st.column_config.TextColumn("実行時刻", width="medium"),
                "user_id": st.column_config.TextColumn("世帯ID", width="small"),
                "pet_name": st.column_config.TextColumn("ペット名", width="small"),
                "duration_ms": st.column_config.NumberColumn("生成時間 (ms)", format="%d ms"),
                "status": st.column_config.TextColumn("成否", width="small"),
                "error_msg": st.column_config.TextColumn("エラーログ", width="large")
            }
        )
        
        # ログクリアボタン
        st.write("---")
        st.markdown("##### 🛠️ ログファイルのメンテナンス")
        if data_source == "☁️ クラウド（Google Sheets）同期":
            st.info("☁️ クラウドモードではスプレッドシート上の生データを直接削除することはできません。Google Driveから『PetDailyAI_Database』を開いてログ行を直接削除してください。")
        else:
            if st.button("🧹 実行ログをすべて消去する", key="btn_clear_logs_dev"):
                try:
                    if os.path.exists(log_file):
                        os.remove(log_file)
                    st.success("ログファイルを完全に消去しました。")
                    st.rerun()
                except Exception as e:
                    st.error(f"ログ消去失敗: {e}")

st.write("---")
st.caption("Pet Daily AI Developer Console - Strictly for Local Diagnostics & Development Support")
