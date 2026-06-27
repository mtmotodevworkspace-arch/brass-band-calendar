import streamlit as st
import datetime
import os
import uuid
import base64
import data_manager
import ai_core
import line_api
import streamlit.components.v1 as components
import pandas as pd
import json

@st.cache_data
def get_loading_video_base64():
    video_path = os.path.join(os.path.dirname(__file__), "loading_animation.mp4")
    if os.path.exists(video_path):
        with open(video_path, "rb") as f:
            data = f.read()
        return base64.b64encode(data).decode()
    return ""

def render_admin_dashboard():
    st.markdown("""
    <div style="background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); padding: 1.5rem; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <h2 style="color: #00E6FF; margin: 0; font-weight: bold; font-size: 1.8rem; text-align: left;">🛠️ 管理者コントロールセンター</h2>
        <p style="color: #94A3B8; font-size: 0.9rem; margin-top: 0.3rem; margin-bottom: 0; text-align: left;">実証PoC 10世帯向けシステム監視・テレメトリ・疎通テスト</p>
    </div>
    """, unsafe_allow_html=True)
    
    # ログファイルの読み込みとDataFrame化
    log_file = data_manager.USAGE_LOG_FILE
    logs = []
    if os.path.exists(log_file):
        try:
            with open(log_file, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        logs.append(json.loads(line.strip()))
        except Exception as e:
            st.error(f"ログファイルの読み込みエラー: {e}")

    df_logs = pd.DataFrame(logs)

    # 世帯プロフィールのロード
    profiles = data_manager.load_all_profiles()
    df_profiles = pd.DataFrame(profiles)
    
    # KPIメトリクス算出
    total_households = len(df_profiles) if not df_profiles.empty else 0
    total_generations = len(df_logs) if not df_logs.empty else 0
    
    success_count = 0
    error_count = 0
    error_rate = 0.0
    avg_duration = 0.0
    
    if not df_logs.empty:
        if "status" in df_logs.columns:
            error_count = len(df_logs[df_logs["status"] == "ERROR"])
            success_count = len(df_logs[df_logs["status"] == "SUCCESS"])
        total_generations = len(df_logs)
        error_rate = (error_count / total_generations * 100) if total_generations > 0 else 0.0
        
        # 成功したリクエストの平均処理時間を計算
        if "duration_ms" in df_logs.columns:
            success_durations = df_logs[df_logs["status"] == "SUCCESS"]["duration_ms"]
            if not success_durations.empty:
                avg_duration = success_durations.mean() / 1000.0  # 秒単位に変換
                
    # KPIサマリー表示 (高コントラストダークテーマ用)
    col_kpi1, col_kpi2, col_kpi3, col_kpi4 = st.columns(4)
    with col_kpi1:
        st.markdown(f"""
        <div class="admin-card" style="border-left: 4px solid #00E6FF; text-align: center;">
            <div style="font-size: 1.8rem; font-weight: bold; color: #00E6FF;">{total_households}</div>
            <div style="font-size: 0.8rem; color: #94A3B8;">登録世帯数 (スマホ)</div>
        </div>
        """, unsafe_allow_html=True)
    with col_kpi2:
        st.markdown(f"""
        <div class="admin-card" style="border-left: 4px solid #FFB800; text-align: center;">
            <div style="font-size: 1.8rem; font-weight: bold; color: #FFB800;">{total_generations}</div>
            <div style="font-size: 0.8rem; color: #94A3B8;">思い出ストーリー生成数</div>
        </div>
        """, unsafe_allow_html=True)
    with col_kpi3:
        st.markdown(f"""
        <div class="admin-card" style="border-left: 4px solid #FF4A4A; text-align: center;">
            <div style="font-size: 1.8rem; font-weight: bold; color: #FF4A4A;">{error_count}</div>
            <div style="font-size: 0.8rem; color: #94A3B8;">システムエラー数</div>
        </div>
        """, unsafe_allow_html=True)
    with col_kpi4:
        st.markdown(f"""
        <div class="admin-card" style="border-left: 4px solid #A652FF; text-align: center;">
            <div style="font-size: 1.8rem; font-weight: bold; color: #A652FF;">{error_rate:.1f}%</div>
            <div style="font-size: 0.8rem; color: #94A3B8;">APIエラー率</div>
        </div>
        """, unsafe_allow_html=True)

    # タブ構成
    tab_dash, tab_house, tab_api, tab_log = st.tabs(["📈 利用統計", "🏡 登録世帯一覧", "🔑 API疎通テスト ＆ 鍵管理", "📝 サーバー生ログ"])
    
    with tab_dash:
        st.markdown("### 📈 システム利用統計 ＆ 稼働状況")
        
        # 稼働メトリクスを並べて表示
        m1, m2, m3 = st.columns(3)
        with m1:
            st.markdown(f"""
            <div class="admin-card" style="text-align: center; padding: 1rem;">
                <div style="font-size: 1.5rem; font-weight: bold; color: #10B981;">{100.0 - error_rate:.1f}%</div>
                <div style="font-size: 0.8rem; color: #94A3B8;">システム正常処理率</div>
            </div>
            """, unsafe_allow_html=True)
        with m2:
            st.markdown(f"""
            <div class="admin-card" style="text-align: center; padding: 1rem;">
                <div style="font-size: 1.5rem; font-weight: bold; color: #00E6FF;">{avg_duration:.2f} 秒</div>
                <div style="font-size: 0.8rem; color: #94A3B8;">平均AI処理時間</div>
            </div>
            """, unsafe_allow_html=True)
        with m3:
            st.markdown(f"""
            <div class="admin-card" style="text-align: center; padding: 1rem;">
                <div style="font-size: 1.5rem; font-weight: bold; color: #FFB800;">{success_count} 回</div>
                <div style="font-size: 0.8rem; color: #94A3B8;">成功ストーリー生成</div>
            </div>
            """, unsafe_allow_html=True)
            
        if df_logs.empty:
            st.info("ストーリーが生成されると、ここにグラフ分析がリアルタイム描画されます🐾")
        else:
            # 昨日からの利用状況の計算 (Activity Since Yesterday)
            tz_jst = datetime.timezone(datetime.timedelta(hours=9))
            now_jst = datetime.datetime.now(tz_jst)
            today_str = now_jst.strftime("%Y-%m-%d")
            yesterday_str = (now_jst - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
            
            yesterday_count = 0
            today_count = 0
            activity_since_yesterday = []
            
            if not df_logs.empty and "timestamp" in df_logs.columns:
                for _, log in df_logs.iterrows():
                    ts = log.get("timestamp", "")
                    if ts:
                        log_date = ts.split(" ")[0]
                        if log_date == today_str:
                            today_count += 1
                            activity_since_yesterday.append(log)
                        elif log_date == yesterday_str:
                            yesterday_count += 1
                            activity_since_yesterday.append(log)
            
            df_since_yesterday = pd.DataFrame(activity_since_yesterday)
            
            # 昨日・今日の生成回数を最上部に大きくカード表示
            st.markdown("##### 📅 昨日からの利用状況 (Activity Since Yesterday)")
            col_y1, col_y2 = st.columns(2)
            with col_y1:
                st.markdown(f"""
                <div class="admin-card" style="border-left: 4px solid #FFA87D; text-align: center; padding: 1rem;">
                    <div style="font-size: 1.6rem; font-weight: bold; color: #FFA87D;">{yesterday_count} 回</div>
                    <div style="font-size: 0.85rem; color: #94A3B8;">昨日 ({yesterday_str}) の思い出生成数</div>
                </div>
                """, unsafe_allow_html=True)
            with col_y2:
                st.markdown(f"""
                <div class="admin-card" style="border-left: 4px solid #FF8096; text-align: center; padding: 1rem;">
                    <div style="font-size: 1.6rem; font-weight: bold; color: #FF8096;">{today_count} 回</div>
                    <div style="font-size: 0.85rem; color: #94A3B8;">今日 ({today_str}) の思い出生成数</div>
                </div>
                """, unsafe_allow_html=True)
            
            st.markdown("##### 📝 昨日から今日にかけての利用アクティビティ生データ一覧")
            if df_since_yesterday.empty:
                st.info("昨日から今日にかけての利用履歴はまだありません🐾")
            else:
                existing_y_cols = [c for c in ["timestamp", "user_id", "pet_name", "pet_type", "story_mode", "genre", "duration_ms", "status"] if c in df_since_yesterday.columns]
                display_y_cols = {
                    "timestamp": "タイムスタンプ",
                    "user_id": "世帯ID",
                    "pet_name": "ペット名",
                    "pet_type": "種別",
                    "story_mode": "生成モード",
                    "genre": "ジャンル",
                    "duration_ms": "処理時間(ms)",
                    "status": "ステータス"
                }
                df_since_yesterday_display = df_since_yesterday[existing_y_cols].rename(columns=display_y_cols)
                df_since_yesterday_display = df_since_yesterday_display.sort_values(by="タイムスタンプ", ascending=False)
                st.dataframe(df_since_yesterday_display, use_container_width=True, hide_index=True)
            
            st.write("---")
            g1, g2 = st.columns(2)
            with g1:
                st.markdown("##### 🐶 世帯（ペット名）別の思い出生成頻度")
                if "pet_name" in df_logs.columns:
                    active_users = df_logs.groupby(["user_id", "pet_name"]).size().reset_index(name="生成回数")
                    df_display1 = active_users[["pet_name", "user_id", "生成回数"]].rename(columns={"pet_name": "ペットの名前", "user_id": "世帯ID"})
                    st.dataframe(df_display1, use_container_width=True, hide_index=True)
            with g2:
                st.markdown("##### 📚 人気の小説ジャンル")
                if "genre" in df_logs.columns:
                    genre_counts = df_logs[df_logs["genre"] != ""]["genre"].value_counts()
                    df_display2 = genre_counts.reset_index()
                    df_display2.columns = ["小説ジャンル", "生成回数"]
                    st.dataframe(df_display2, use_container_width=True, hide_index=True)
            
            # エラー発生原因ランキング
            st.write("---")
            st.markdown("##### ⚠️ エラー発生原因ランキング")
            if error_count == 0:
                st.success("現在、システムエラーは発生していません 🟢")
            else:
                if "error_msg" in df_logs.columns:
                    error_logs = df_logs[(df_logs["status"] == "ERROR") & (df_logs["error_msg"] != "")]
                    if not error_logs.empty:
                        def categorize_error(msg):
                            m = str(msg).lower()
                            if "429" in m or "quota" in m or "exhausted" in m or "rate limit" in m:
                                return "Gemini API 制限超過 (Rate Limit / Quota Exceeded)"
                            if "api key" in m or "api_key" in m or "unauthorized" in m or "403" in m:
                                return "APIキー認証エラー (Invalid / Unauthorized API Key)"
                            if "timeout" in m or "timed out" in m:
                                return "通信タイムアウト (Timeout)"
                            if "sanitize" in m or "decode" in m or "format" in m:
                                return "画像フォーマット・デコードエラー (Image Processing Error)"
                            return f"その他例外: {msg[:100]}"
                        
                        error_logs["エラーカテゴリ"] = error_logs["error_msg"].apply(categorize_error)
                        error_ranking = error_logs["エラーカテゴリ"].value_counts().reset_index()
                        error_ranking.columns = ["検出されたエラー原因・内容", "発生回数"]
                        st.dataframe(error_ranking, use_container_width=True, hide_index=True)
                    else:
                        st.warning("エラーログはありますが、エラー詳細メッセージは空です。")
                        
    with tab_house:
        st.markdown("### 🏡 登録世帯一覧 ＆ アクションパネル")
        if df_profiles.empty:
            st.warning("まだ登録世帯がありません。")
        else:
            # 1. 登録世帯全体のデータグリッド
            st.markdown("##### 📊 世帯データ一覧")
            display_cols = {
                "registered_at": "登録日時",
                "user_id": "世帯ID",
                "name": "名前",
                "pet_type": "種別",
                "breed": "品種",
                "age_display": "計算年齢",
                "owner_call": "飼い主の呼び方",
                "personality": "基本性格"
            }
            existing_cols = [c for c in display_cols.keys() if c in df_profiles.columns]
            st.dataframe(df_profiles[existing_cols].rename(columns=display_cols), use_container_width=True, hide_index=True)
            
            st.write("---")
            
            # 2. 世帯の個別詳細表示 & 削除パネル
            st.markdown("##### 🔍 世帯プロフィールの詳細表示 ＆ 個別管理")
            house_options = []
            house_map = {}
            for _, row in df_profiles.iterrows():
                opt_str = f"{row.get('name', '名前なし')} ({row.get('user_id')}) - 飼い主: {row.get('owner_name', '未登録')}"
                house_options.append(opt_str)
                house_map[opt_str] = row
                
            selected_opt = st.selectbox("詳細表示・操作対象の世帯を選択してください", options=house_options)
            
            if selected_opt:
                selected_row = house_map[selected_opt]
                sel_user_id = selected_row.get("user_id")
                
                # 詳細プロフィールカード
                st.markdown(f"""
                <div class="admin-card">
                    <h4 style="color: #00E6FF; margin-top: 0;">🐶 {selected_row.get('name')} ちゃんの登録プロファイル</h4>
                    <table style="width:100%; border-collapse: collapse; color: #FFFFFF;">
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);"><td style="padding: 6px; font-weight: bold; width: 30%;">世帯ID (user_id)</td><td style="padding: 6px;"><code>{sel_user_id}</code></td></tr>
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);"><td style="padding: 6px; font-weight: bold;">登録日時 (更新時)</td><td style="padding: 6px;">{selected_row.get('registered_at')}</td></tr>
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);"><td style="padding: 6px; font-weight: bold;">飼い主のおなまえ</td><td style="padding: 6px;">{selected_row.get('owner_name')}</td></tr>
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);"><td style="padding: 6px; font-weight: bold;">4桁の暗証番号 (PIN)</td><td style="padding: 6px;"><code>{selected_row.get('pin_code')}</code></td></tr>
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);"><td style="padding: 6px; font-weight: bold;">ペットの名前</td><td style="padding: 6px;">{selected_row.get('name')} ({selected_row.get('gender')})</td></tr>
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);"><td style="padding: 6px; font-weight: bold;">ペット一人称</td><td style="padding: 6px;">「{selected_row.get('pronoun')}」</td></tr>
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);"><td style="padding: 6px; font-weight: bold;">ペット種類 (品種)</td><td style="padding: 6px;">{selected_row.get('pet_type')} ({selected_row.get('breed')})</td></tr>
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);"><td style="padding: 6px; font-weight: bold;">お誕生日 / 計算年齢</td><td style="padding: 6px;">{selected_row.get('birthday')} / {selected_row.get('age_display')}</td></tr>
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);"><td style="padding: 6px; font-weight: bold;">飼い主の呼び方</td><td style="padding: 6px;">{selected_row.get('owner_call')}</td></tr>
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);"><td style="padding: 6px; font-weight: bold;">基本性格</td><td style="padding: 6px;">{selected_row.get('personality')}</td></tr>
                        <tr><td style="padding: 6px; font-weight: bold;">専用アルバムURL</td><td style="padding: 6px;"><a href="https://pet-emotion-analyzer-dr57r4gvnh66nvh3epzptd.streamlit.app/?user_id={sel_user_id}" target="_blank" style="color: #00E6FF; text-decoration: underline;">専用URLを開く 🔗</a></td></tr>
                    </table>
                </div>
                """, unsafe_allow_html=True)
                
                # 削除パネル
                st.markdown("⚠️ **管理者操作パネル**")
                confirm_delete = st.checkbox("この世帯のプロファイル及びデータを完全に削除することに同意します (この操作は取り消せません)", key=f"confirm_del_{sel_user_id}")
                
                if st.button("🗑️ この世帯のデータを削除する", key=f"btn_del_{sel_user_id}", type="secondary", use_container_width=True):
                    if not confirm_delete:
                        st.error("❌ 削除を実行するには、上記の同意チェックボックスをオンにしてください。")
                    else:
                        with st.spinner("世帯データを削除中..."):
                            success = data_manager.delete_profile(sel_user_id)
                            if success:
                                st.success(f"🟢 世帯ID: {sel_user_id} のプロファイルデータを完全に削除しました。")
                                import time
                                time.sleep(1)
                                st.rerun()
                            else:
                                st.error("❌ データの削除に失敗しました。ファイルが存在しないか、権限エラーが発生した可能性があります。")
            
    with tab_api:
        st.markdown("### 🔑 API鍵の管理 ＆ 疎通テスト")
        
        c_data = data_manager.load_config()
        
        def mask_key(k):
            if not k: return "未設定 🔴"
            return f"{k[:6]}...{k[-6:]} (設定済み 🟢)"
            
        # 1. 鍵管理セクション (入力 & 保存)
        st.markdown("##### ⚙️ マスター認証情報の更新")
        st.write("Google Gemini APIキーおよびLINE Channel Access Tokenを更新できます。")
        
        with st.form("api_key_settings_form"):
            input_google_key = st.text_input(
                "🔑 Google Gemini APIキー", 
                value=c_data.get("GOOGLE_API_KEY", ""), 
                type="password", 
                help="Gemini-1.5-Pro / Gemini-2.5 などの実行に使用するAPIキー"
            )
            input_line_token = st.text_input(
                "💬 LINE Channel Access Token (アクセストークン)", 
                value=c_data.get("LINE_CHANNEL_ACCESS_TOKEN", ""), 
                type="password", 
                help="LINE公式アカウントのMessaging APIブロードキャスト送信トークン"
            )
            
            save_master_btn = st.form_submit_button("💾 設定を保存する")
            
            if save_master_btn:
                data_manager.save_config(input_line_token, input_google_key)
                st.success("🟢 マスター設定を config.json へ正常に保存しました！")
                import time
                time.sleep(1)
                st.rerun()
                
        st.write("---")
        
        # 2. 現在の設定状況
        st.markdown("##### 📡 現在設定されている鍵の情報")
        st.markdown(f"""
        <div class="admin-card">
            <table style="width:100%; border-collapse: collapse; color: #FFFFFF;">
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);"><td style="padding: 8px; font-weight: bold; width: 40%;">Google Gemini API Key</td><td style="padding: 8px;"><code>{mask_key(c_data.get('GOOGLE_API_KEY'))}</code></td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">LINE Channel Access Token</td><td style="padding: 8px;"><code>{mask_key(c_data.get('LINE_CHANNEL_ACCESS_TOKEN'))}</code></td></tr>
            </table>
        </div>
        """, unsafe_allow_html=True)
        
        st.write("---")
        
        # 3. 疎通テストセクション
        st.markdown("##### 📡 API接続・疎通テストの実行")
        test_g, test_l = st.columns(2)
        with test_g:
            if st.button("🤖 Gemini API 疎通テストを実行", key="dash_test_gemini", use_container_width=True):
                api_key = c_data.get("GOOGLE_API_KEY")
                if not api_key: 
                    st.error("❌ APIキーが登録されていません。")
                else:
                    with st.spinner("Gemini APIへテストリクエスト送信中..."):
                        try:
                            response = ai_core.run_lightweight_test(api_key)
                            st.success(f"🟢 接続成功！\n\n**AIからの応答:**\n{response}")
                        except Exception as e: 
                            st.error(f"❌ 接続失敗:\n{e}")
        with test_l:
            if st.button("💬 LINE Messaging API 疎通テストを実行", key="dash_test_line", use_container_width=True):
                line_token = c_data.get("LINE_CHANNEL_ACCESS_TOKEN")
                if not line_token: 
                    st.error("❌ LINEアクセストークンが登録されていません。")
                else:
                    with st.spinner("LINE APIサーバーへテストリクエスト送信中..."):
                        status = line_api.test_line_credentials(line_token)
                        if "成功" in status or "200" in status:
                            st.success(f"🟢 LINE疎通成功！\n\n**詳細:**\n{status}")
                        else: 
                            st.error(f"❌ LINE疎通失敗:\n{status}")
                            
    with tab_log:
        st.markdown("### 📝 サーバー実行ログ（最新100件）")
        
        if df_logs.empty:
            st.warning("実行ログがまだありません。")
        else:
            # 1. フィルタリング選択
            filter_status = st.selectbox(
                "表示するログのステータスでフィルタリング:",
                options=["すべてを表示", "成功のみ (SUCCESS)", "エラーのみ (ERROR)"]
            )
            
            # ソート（最新順）
            df_logs_sorted = df_logs.iloc[::-1]
            
            # フィルター適用
            if filter_status == "成功のみ (SUCCESS)":
                df_filtered = df_logs_sorted[df_logs_sorted["status"] == "SUCCESS"]
            elif filter_status == "エラーのみ (ERROR)":
                df_filtered = df_logs_sorted[df_logs_sorted["status"] == "ERROR"]
            else:
                df_filtered = df_logs_sorted
                
            st.markdown(f"表示中: `{len(df_filtered)}` 件のログ")
            
            # グリッドカラム表示の最適化
            existing_log_cols = [c for c in ["timestamp", "user_id", "pet_name", "pet_type", "story_mode", "genre", "duration_ms", "status", "error_msg"] if c in df_filtered.columns]
            
            display_log_cols = {
                "timestamp": "タイムスタンプ",
                "user_id": "世帯ID",
                "pet_name": "ペット名",
                "pet_type": "種別",
                "story_mode": "生成モード",
                "genre": "ジャンル",
                "duration_ms": "処理時間(ms)",
                "status": "ステータス",
                "error_msg": "エラー内容"
            }
            
            filtered_display = df_filtered[existing_log_cols].rename(columns=display_log_cols)
            
            st.dataframe(
                filtered_display,
                use_container_width=True,
                hide_index=True
            )
            
            st.write("---")
            
            # 2. ログクリアアクション
            st.markdown("⚠️ **ログデータ管理**")
            confirm_clear = st.checkbox("すべてのサーバー生ログを完全に消去することに同意します", key="confirm_clear_logs")
            
            if st.button("🗑️ 実行ログをすべて消去する", key="dash_clear_logs", type="secondary", use_container_width=True):
                if not confirm_clear:
                    st.error("❌ 消去を実行するには、上記の同意チェックボックスをオンにしてください。")
                else:
                    try:
                        if os.path.exists(log_file): 
                            os.remove(log_file)
                        st.success("🟢 サーバー生ログファイルを正常に初期化しました。")
                        import time
                        time.sleep(1)
                        st.rerun()
                    except Exception as e: 
                        st.error(f"❌ ログ消去中にエラーが発生しました: {e}")

def mask_error_message(err_msg):
    """
    英語の機械的なAPIエラーや例外メッセージを、
    一般世帯のユーザー（美咲さん等）に不安を与えない極めて優しい日本語にマスク・翻訳する。
    """
    err_str = str(err_msg).lower()
    
    if "429" in err_str or "quota" in err_str or "exhausted" in err_str or "rate limit" in err_str:
        return "ただいまアクセスが少し混み合っています🐾 1分ほど時間を置いて、もう一度ゆっくり試してみてくださいね。"
        
    if "api key" in err_str or "api_key" in err_str or "unauthorized" in err_str or "403" in err_str:
        return "ただいまシステム設定を準備中です🐾 アプリの管理者に連絡してください。"
        
    if "timeout" in err_str or "timed out" in err_str:
        return "インターネットの通信が少し不安定なようです🐾 電波の良い場所で、もう一度思い出をアップロードしてみてください。"
        
    if "invalid image" in err_str or "decode" in err_str or "format" in err_str or "sanitize" in err_str:
        return "写真の読み込みがうまくいかなかったようです🐾 別の写真を選び直して、もう一度お試しください。"
        
    return "思い出の読み込み中に少しエラーが起きてしまいました🐾 もう一度だけ「思い出のストーリーをつくる」を押してみてください。"

# --- ページのカスタムアイコン読込 ＆ PWAホームアイコン設定 ---
icon_image = "🐾"
app_icon_base64 = ""
try:
    from PIL import Image
    import base64
    icon_path = os.path.join(os.path.dirname(__file__), "app_icon.png")
    if os.path.exists(icon_path):
        icon_image = Image.open(icon_path)
        with open(icon_path, "rb") as f:
            app_icon_base64 = base64.b64encode(f.read()).decode("utf-8")
except Exception as e:
    pass

# --- ページ設定 ---
st.set_page_config(page_title="うちのコ日常アルバム - Pet Daily AI", page_icon=icon_image, layout="wide")


# --- PWA完全対応：manifest・メタタグ・Service Worker を親headに注入 ---
pwa_inject_html = """
<script>
(function() {
    try {
        const pDoc = window.parent.document;
        const pHead = pDoc.head;

        // 1. manifest.json リンク
        if (!pDoc.querySelector("link[rel='manifest']")) {
            const manifest = pDoc.createElement("link");
            manifest.rel = "manifest";
            manifest.href = "/_statics/manifest.json";
            pHead.appendChild(manifest);
        }

        // 2. iOS ホーム画面アプリ化メタタグ
        const metas = {
            "apple-mobile-web-app-capable": "yes",
            "apple-mobile-web-app-status-bar-style": "black-translucent",
            "apple-mobile-web-app-title": "うちのコ",
            "mobile-web-app-capable": "yes",
            "theme-color": "#C72C48"
        };
        for (const [name, content] of Object.entries(metas)) {
            if (!pDoc.querySelector("meta[name='" + name + "']")) {
                const m = pDoc.createElement("meta");
                m.name = name;
                m.content = content;
                pHead.appendChild(m);
            }
        }

        // 3. Apple Touch Icon（iOS ホーム画面アイコン）
        if (!pDoc.querySelector("link[rel='apple-touch-icon']")) {
            const appleIcon = pDoc.createElement("link");
            appleIcon.rel = "apple-touch-icon";
            appleIcon.href = "/_statics/icons/apple-touch-icon.png";
            pHead.appendChild(appleIcon);
        }

        // 4. ビューポート固定（ピンチズーム無効化でアプリ感UP）
        const vp = pDoc.querySelector("meta[name='viewport']");
        if (vp) {
            vp.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
        }

        // 5. Service Worker 登録
        if ('serviceWorker' in window.parent.navigator) {
            window.parent.navigator.serviceWorker.register('/_statics/sw.js')
                .then(function(reg) { console.log('[PWA] SW registered:', reg.scope); })
                .catch(function(err) { console.warn('[PWA] SW registration failed:', err); });
        }

    } catch(e) {
        console.warn('[PWA] inject failed:', e);
    }
})();
</script>
"""
components.html(pwa_inject_html, height=0, width=0)


# --- 管理者判定と専用ルーティング ---
is_admin = st.query_params.get("admin") == "true"
if is_admin:
    st.markdown("""
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;700&display=swap');
        
        /* 管理者専用ダークテーマの強制適用 */
        html, body, [data-testid="stAppViewContainer"], [data-testid="stApp"] {
            font-family: 'Noto Sans JP', sans-serif !important;
            background-color: #0F172A !important;
            color: #F8FAFC !important;
        }
        
        /* 管理者画面のテキスト要素は白〜明るいグレーを強制 */
        label, p, span, li, h1, h2, h3, h4, h5, h6, .stMarkdown, .stText, [data-testid="stWidgetLabel"] p {
            color: #F8FAFC !important;
        }
        
        /* ダッシュボードカード */
        .admin-card {
            background-color: #1E293B !important;
            border-radius: 16px !important;
            padding: 1.5rem !important;
            margin-bottom: 1.5rem !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25) !important;
        }
        
        /* 入力フィールドの文字色と背景色を強制固定（管理者用） */
        div[data-baseweb="input"] input, 
        div[data-baseweb="textarea"] textarea,
        .stTextArea textarea, 
        .stTextInput input {
            background-color: #1E293B !important;
            color: #FFFFFF !important;
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
        }
        
        /* タブの文字色と背景色の強制指定 (管理者用) */
        button[data-baseweb="tab"] {
            color: #94A3B8 !important;
            font-weight: bold !important;
            opacity: 0.7 !important;
        }
        button[data-baseweb="tab"][aria-selected="true"] {
            color: #00E6FF !important;
            border-bottom-color: #00E6FF !important;
            opacity: 1.0 !important;
        }
        
        /* 選択ボックスのライトテーマ解除 (管理者用) */
        div[data-baseweb="select"] > div {
            background-color: #1E293B !important;
            color: #FFFFFF !important;
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
        }
        div[role="listbox"] {
            background-color: #1E293B !important;
        }
        div[role="listbox"] li, div[role="option"] {
            background-color: #1E293B !important;
            color: #FFFFFF !important;
        }
        div[role="listbox"] li:hover, div[role="option"]:hover,
        div[role="listbox"] li[aria-selected="true"] {
            background-color: #334155 !important;
            color: #00E6FF !important;
        }

        /* ボタンデザイン (管理者用 - コントラスト重視の #E5E5E5 ボタン) */
        .stButton>button,
        div[data-testid="stFormSubmitButton"] button {
            background: #E5E5E5 !important;
            color: #000000 !important;
            border: 1px solid #000000 !important;
            font-weight: 700 !important;
            border-radius: 12px !important;
            padding: 0.6rem 1.5rem !important;
            width: 100% !important;
        }
        .stButton>button:hover,
        div[data-testid="stFormSubmitButton"] button:hover {
            background: #D8D8D8 !important;
            color: #000000 !important;
            border: 1px solid #000000 !important;
        }
    </style>
    """, unsafe_allow_html=True)
    render_admin_dashboard()
    st.stop()

if st.session_state.get("clear_localstorage"):
    components.html("""
    <script>
    try {
        localStorage.removeItem("pet_profile");
        localStorage.removeItem("pet_user_id");
        let parentUrl = "";
        try {
            parentUrl = window.top.location.href.split("?")[0];
        } catch(e) {
            parentUrl = document.referrer ? document.referrer.split("?")[0] : window.location.href.split("?")[0];
        }
        window.top.location.href = parentUrl;
    } catch(e) {
        console.error("Local storage clear failed:", e);
    }
    </script>
    """, height=0, width=0)
    st.session_state.clear()
    st.stop()

# --- ユーザーID（世帯ID）の自動生成とクエリパラメータ処理 ---
if "user_id" not in st.query_params:
    new_id = str(uuid.uuid4())[:8]
    st.query_params["user_id"] = new_id
    st.rerun()

user_id = st.query_params["user_id"]

# --- LocalStorage からのペット情報復元処理 ---
if "restore_profile" in st.query_params:
    import urllib.parse
    import json
    try:
        raw_val = st.query_params["restore_profile"]
        profile_json = urllib.parse.unquote(raw_val)
        profile_data = json.loads(profile_json)
        if profile_data and "name" in profile_data:
            # サーバー側に保存してセッションを復元
            data_manager.save_profile(profile_data, user_id)
            st.query_params.pop("restore_profile")
            st.rerun()
    except Exception as e:
        pass

st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;700&display=swap');
    
    /* ベースリセット ＆ さくらミルクティー・ライトテーマの強制適用 */
    html, body, [data-testid="stAppViewContainer"], [data-testid="stApp"] {
        font-family: 'Noto Sans JP', sans-serif !important;
        background-color: #FFF5F5 !important;
        color: #3D2D2D !important;
    }
    
    /* すべての一般的な文字要素に高視認性のココアブラウンを強制 */
    label, p, span, li, h1, h2, h3, h4, h5, h6, .stMarkdown, .stText, [data-testid="stWidgetLabel"] p {
        color: #3D2D2D !important;
    }
    
    /* メインタイトル (ローズゴールド/サクラピンクの美しいグラデーション) */
    .main-title {
        background: linear-gradient(135deg, #FF8096 0%, #FFA87D 100%) !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        font-weight: 700 !important;
        font-size: 2.1rem !important;
        margin-bottom: 0.2rem !important;
        text-align: center !important;
        letter-spacing: -0.5px;
        filter: drop-shadow(0px 2px 4px rgba(255, 128, 150, 0.25));
    }
    .sub-title {
        color: #3D2D2D !important;
        opacity: 0.8 !important;
        font-size: 0.92rem !important;
        margin-bottom: 1.8rem !important;
        text-align: center !important;
        line-height: 1.6 !important;
    }
    
    /* プレミアムカード (ピュアホワイト) */
    .status-card {
        background-color: #FFFFFF !important;
        border-radius: 18px !important;
        padding: 1.2rem !important;
        margin-bottom: 1.2rem !important;
        border: 1px solid rgba(255, 128, 150, 0.4) !important;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05) !important;
    }
    .status-card, .status-card * {
        color: #3D2D2D !important;
    }
    
    /* ストーリープレビューボックス (ピュアホワイト、高い視認性) */
    .line-preview-box { 
        background-color: #FFFFFF !important; 
        border-left: 5px solid #FF8096 !important; 
        border-radius: 14px !important; 
        padding: 1.4rem !important; 
        margin-top: 1rem !important; 
        white-space: pre-wrap !important; 
        font-size: 1.05rem !important; 
        line-height: 1.9 !important;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
        border: 1px solid rgba(255, 128, 150, 0.25) !important;
    }
    .line-preview-box, .line-preview-box * {
        color: #3D2D2D !important; 
    }
    
    /* 親しみやすい透過入力フォーム */
    div[data-testid="stForm"] {
        background-color: #FFFFFF !important;
        border-radius: 24px !important;
        border: 1px solid rgba(255, 128, 150, 0.35) !important;
        padding: 1.6rem !important;
        box-shadow: 0 12px 35px rgba(0, 0, 0, 0.05) !important;
    }
    
    /* 🐾 写真フレーム風カスタムアップローダー */
    div[data-testid="stFileUploader"] {
        border: 2px dashed rgba(255, 128, 150, 0.5) !important;
        background-color: #FFFFFF !important;
        border-radius: 18px !important;
        padding: 1.2rem !important;
        text-align: center !important;
        transition: all 0.3s ease !important;
    }
    div[data-testid="stFileUploader"]:hover {
        border-color: rgba(255, 128, 150, 0.9) !important;
    }
    div[data-testid="stFileUploader"] section {
        padding: 0 !important;
        background: transparent !important;
    }
    div[data-testid="stFileUploader"] label {
        color: #C72C48 !important;
        font-weight: bold !important;
        font-size: 1rem !important;
        margin-bottom: 0.5rem !important;
    }
    
    /* ボタンの色デザインの統一 (背景薄い灰色、文字黒、枠線黒) */
    .stButton>button,
    div[data-testid="stFormSubmitButton"] button,
    div[data-testid="stFileUploader"] button,
    div.stLinkButton a,
    div[data-testid="stLinkButton"] a {
        background: #E5E5E5 !important;
        color: #000000 !important;
        border: 1px solid #000000 !important;
        font-weight: 700 !important;
        cursor: pointer !important;
        box-shadow: none !important;
        text-shadow: none !important;
        border-radius: 12px !important;
        text-decoration: none !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
    }
    .stButton>button:hover,
    div[data-testid="stFormSubmitButton"] button:hover,
    div[data-testid="stFileUploader"] button:hover,
    div.stLinkButton a:hover,
    div[data-testid="stLinkButton"] a:hover {
        background: #D8D8D8 !important; /* ホバー時はわずかに暗い灰色 */
        color: #000000 !important;
        border: 1px solid #000000 !important;
        text-decoration: none !important;
    }
    
    /* ボタン専用 of サイズ・配置調整 */
    .stButton>button,
    div[data-testid="stFormSubmitButton"] button,
    div.stLinkButton a,
    div[data-testid="stLinkButton"] a {
        padding: 0.95rem 2rem !important;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        width: 100% !important;
        font-size: 1.1rem !important;
        letter-spacing: 0.5px;
    }
    .stButton>button:active,
    div[data-testid="stFormSubmitButton"] button:active,
    div.stLinkButton a:active,
    div[data-testid="stLinkButton"] a:active {
        transform: scale(0.97) !important;
    }
    
    /* ファイルアップロードボタン専用のサイズ調整・テキスト変更 (Browse files -> ファイルアップロード) */
    div[data-testid="stFileUploader"] button {
        padding: 0.55rem 1.4rem !important;
        font-size: 0 !important;
        transition: background-color 0.2s ease !important;
    }
    div[data-testid="stFileUploader"] button::after {
        content: "ファイルアップロード" !important;
        font-size: 0.9rem !important;
        color: #000000 !important;
        font-weight: 700 !important;
        display: block !important;
        line-height: normal !important;
    }
    
    /* フルスクリーンローディング (システムの背景色に同調) */
    .full-screen-loader {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background-color: #FFF5F5 !important;
        z-index: 9999999 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 1.5rem !important;
        box-sizing: border-box !important;
    }
    .loader-card {
        text-align: center !important;
        max-width: 440px !important;
        width: 100% !important;
        background-color: #FFFFFF !important;
        border: 1px solid rgba(255, 128, 150, 0.3) !important;
        padding: 2.2rem 1.8rem !important;
        border-radius: 28px !important;
        box-shadow: 0 20px 50px rgba(0,0,0,0.1) !important;
        backdrop-filter: blur(20px) !important;
        -webkit-backdrop-filter: blur(20px) !important;
    }
    .loading-video {
        width: 100% !important;
        max-width: 280px !important;
        border-radius: 20px !important;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
        border: 2px solid rgba(255, 182, 193, 0.3) !important;
        margin-bottom: 1.8rem !important;
    }
    
    /* サイドバーの背景色をシステムの背景色に同調 */
    section[data-testid="stSidebar"] {
        background-color: #FFF5F5 !important;
        border-right: 1px solid rgba(255, 128, 150, 0.2) !important;
    }
    section[data-testid="stSidebar"] * {
        color: #3D2D2D !important;
    }

    /* Streamlitのネイティブ入力フィールドとテキストエリアの文字色と背景色を強制固定して視認性を確保 */
    div[data-baseweb="input"] input, 
    div[data-baseweb="textarea"] textarea,
    .stTextArea textarea, 
    .stTextInput input {
        background-color: #FFFFFF !important;
        color: #3D2D2D !important;
        border: 1px solid rgba(255, 128, 150, 0.4) !important;
    }
    
    /* セレクトボックスとオプションリストのライトテーマ強制 ＆ 視認性完全強化 */
    div[data-baseweb="select"] > div {
        background-color: #FFFFFF !important;
        color: #3D2D2D !important;
        border: 1px solid rgba(255, 128, 150, 0.4) !important;
    }
    
    /* ドロップダウンメニュー全体の背景を白に徹底固定 */
    div[role="listbox"],
    ul[role="listbox"],
    div[data-baseweb="popover"],
    div[data-baseweb="menu"],
    [data-baseweb="menu"] ul,
    ul[data-baseweb="menu"] {
        background-color: #FFFFFF !important;
        background: #FFFFFF !important;
        border: 1px solid rgba(255, 128, 150, 0.4) !important;
    }
    
    /* ドロップダウン項目のテキストと背景を明示的に強制指定 */
    div[role="listbox"] li,
    ul[role="listbox"] li,
    div[role="option"],
    [role="option"] *,
    [data-baseweb="menu"] li,
    [data-baseweb="menu"] li * {
        background-color: #FFFFFF !important;
        background: #FFFFFF !important;
        color: #3D2D2D !important;
    }
    
    /* リスト項目のホバー・アクティブ状態の配色 */
    div[role="listbox"] li:hover,
    ul[role="listbox"] li:hover,
    div[role="option"]:hover,
    [data-baseweb="menu"] li:hover,
    [data-baseweb="menu"] li:hover *,
    div[role="listbox"] li[aria-selected="true"],
    ul[role="listbox"] li[aria-selected="true"] {
        background-color: #FFF5F5 !important;
        background: #FFF5F5 !important;
        color: #C72C48 !important;
    }
    
    /* ラジオボタン・チェックボックスの文字色保護 */
    div[data-testid="stRadio"] label, div[data-testid="stRadio"] label p, div[data-testid="stRadio"] label span,
    div[data-testid="stCheckbox"] label, div[data-testid="stCheckbox"] label p {
        color: #3D2D2D !important;
    }
    
    /* アコーディオン・エキスパンダーのヘッダーと中身の視認性確保 */
    div[data-testid="stExpander"] {
        background-color: #FFFFFF !important;
        border: 1px solid rgba(255, 128, 150, 0.3) !important;
        border-radius: 14px !important;
    }
    div[data-testid="stExpander"] summary {
        color: #C72C48 !important;
        font-weight: bold !important;
    }

    /* タブの文字色と背景色の強制指定 */
    button[data-baseweb="tab"] {
        color: #3D2D2D !important;
        font-weight: bold !important;
        opacity: 0.7 !important;
    }
    button[data-baseweb="tab"][aria-selected="true"] {
        color: #C72C48 !important;
        border-bottom-color: #C72C48 !important;
        opacity: 1.0 !important;
    }
    
    /* 使い方ガイド（ダイアログ）の背景と文字色のコントラスト徹底強制 */
    div[role="dialog"], 
    div[data-testid="stDialog"],
    div[role="dialog"] div,
    [data-testid="stDialog"] div,
    [data-testid="stDialog"] p,
    [data-testid="stDialog"] span,
    [data-testid="stDialog"] li,
    [data-testid="stDialog"] label {
        background-color: #FFFFFF !important;
        background: #FFFFFF !important;
        color: #3D2D2D !important;
    }
    
    /* ダイアログの見出しはローズレッドで高コントラスト化 */
    div[role="dialog"] h1, div[role="dialog"] h2, div[role="dialog"] h3, div[role="dialog"] h4, div[role="dialog"] h5,
    [data-testid="stDialog"] h1, [data-testid="stDialog"] h2, [data-testid="stDialog"] h3, [data-testid="stDialog"] h4, [data-testid="stDialog"] h5 {
        background-color: #FFFFFF !important;
        background: #FFFFFF !important;
        color: #C72C48 !important;
    }
    
    /* ダイアログ内の警告・案内テキスト背景も調和させる */
    div[role="dialog"] .stInfo, div[role="dialog"] .stSuccess, div[role="dialog"] .stWarning,
    [data-testid="stDialog"] .stInfo, [data-testid="stDialog"] .stSuccess, [data-testid="stDialog"] .stWarning {
        background-color: #FFF5F5 !important;
        background: #FFF5F5 !important;
    }
    
    /* レスポンシブ強制適用 (どの端末でも比率を完全に均一化) */
    @media (max-width: 768px) {
        .block-container {
            padding-left: 0.6rem !important;
            padding-right: 0.6rem !important;
            padding-top: 1.2rem !important;
        }
        .main-title {
            font-size: 1.85rem !important;
        }
        .line-preview-box {
            padding: 1.1rem !important;
            font-size: 0.98rem !important;
            line-height: 1.8 !important;
        }
    }
</style>
""", unsafe_allow_html=True)

# --- 使い方チュートリアルダイアログの定義 ---
@st.dialog("📖 うちのコ日常アルバム 使い方ガイド")
def show_tutorial_dialog():
    st.write("アプリの使い方を紙芝居形式で分かりやすくガイドします。上のタブを切り替えてお読みください🐾")
    
    tab1, tab2, tab3, tab4 = st.tabs(["👋 ようこそ！", "💡 基本の使い方", "🎨 4コマ漫画の作り方", "📱 アプリアイコン化"])
    
    with tab1:
        st.markdown("""
        ### ようこそ！『うちのコ日常アルバム』へ 🐾
        このアプリは、愛するペットのお気に入りの写真から**「ペットの本当の気持ち（心の声）」**や**「特別な思い出ショートストーリー」**を最先端AI（Gemini）がつむぐアルバムアプリです。
        
        さらに、そのストーリーをベースにした**「超高品質な4コマ漫画」**をChatGPTで作成できる魔法のプロンプトを生成します！
        
        まずは右上の「基本の使い方」タブをタップしてみましょう ➡
        """)
        st.info("💡 登録されたペットの性格や年齢に合わせて、AIが世界に一つだけのストーリーを執筆します。")
        
    with tab2:
        st.markdown("""
        ### 💡 アプリの基本の使い方（簡単3ステップ）
        
        1. **📸 写真のアップロード**:
           画面の左側で、おうちのコのお気に入りの写真（JPEG/PNG形式）を1枚アップロードします。
        2. **📚 小説スタイルの選択**:
           客観的に描く『絵本小説風（6つのジャンル選択可能）』か、ペット本人が語りかける『おしゃべり風』から選択します。
        3. **⚡ ストーリーをつくる**:
           「思い出のストーリーをつくる」ボタンを押して数十秒待つと、画面右側に心情分析と小説が完成します！
        """)
        st.success("✨ 動画アップロードには非対応です。お写真をお使いください！")
        
    with tab3:
        st.markdown("""
        ### 🎨 4コマ漫画のつくり方（ChatGPT連携）
        ストーリー生成後に画面右側に出力されるプロンプトを使い、ChatGPTで最高品質の4コマ漫画を生成します。
        
        1. **📋 コピーボタンをタップ**:
           プロンプト欄のすぐ下にある **「プロンプトをコピーする」** ボタンをタップします（クリップボードに記憶されます）。
        2. **🚀 ChatGPTを起動**:
           その下にある **「ChatGPTで4コマ漫画生成」** ボタンをタップして、ChatGPT（DALL-E 3）の画面を開きます。
        3. **📝 貼り付けて送信するだけ！**:
           ChatGPTのチャット入力欄にコピーしたプロンプトを**そのまま貼り付けて送信**してください。
           自動的に、あなたのコの特徴や表情を100%引き継いだ、感動的な4コマ漫画が目の前で描き出されます！
        """)
        st.warning("⚠️ ChatGPT側で画像が生成されるまで1〜2分かかります。そのまま楽しみにお待ちください！")
        
    with tab4:
        st.markdown("""
        ### 📱 スマートフォンのホーム画面にアプリアイコンを作る方法
        このWebアプリを、スマホのホーム画面にアプリアイコンとして登録することで、SafariやChromeの枠が消えて**本物のネイティブアプリ同様の全画面表示**で快適に起動できるようになります！
        
        * **🍎 iPhone (Safariの場合)**:
          1. Safariでこのアプリを開きます。
          2. 下部の **「共有ボタン」**（四角から矢印が出ているアイコン）をタップします。
          3. **「ホーム画面に追加」** をタップして、右上の「追加」を押します。
        * **🤖 Android (Chromeの場合)**:
          1. Chromeでこのアプリを開きます。
          2. 右上の **「三点リーダー（メニュー）」** をタップします。
          3. **「ホーム画面に追加」** または **「アプリをインストール」** をタップします。
        """)
        st.info("🐾 ホーム画面に追加すると、次回からホーム画面の可愛い肉球アイコン（🐾）をタップするだけで一瞬で起動します！")

    if st.button("ガイドを閉じる", key="btn_close_tutorial", use_container_width=True):
        st.rerun()

# --- データの読み込み ---
saved_config = data_manager.load_config(user_id)
saved_profile = data_manager.load_profile(user_id)

# 管理者用パラメータチェック
is_admin = st.query_params.get("admin") == "true"

# ウェルカムゲート画面 (ログイン画面の手前に表示する歓迎ページ)
if "welcome" in st.query_params and saved_profile and not is_admin and not st.session_state.get("logged_in"):
    st.markdown(f"""
    <div style="background: linear-gradient(135deg, #FFF0F2 0%, #FFF5F5 100%); border: 2px solid rgba(255, 182, 193, 0.5); border-radius: 24px; padding: 2.5rem 2rem; text-align: center; box-shadow: 0 12px 40px rgba(255, 128, 150, 0.12); max-width: 480px; margin: 2rem auto; box-sizing: border-box;">
        <div style="font-size: 3rem; margin-bottom: 1rem; display: inline-block;">🐾</div>
        <h2 style="color: #C72C48; font-weight: 700; font-size: 1.65rem; margin: 0 0 0.5rem 0; text-align: center;">おかえりなさい！</h2>
        <h3 style="color: #3D2D2D; font-weight: 600; font-size: 1.15rem; margin: 0 0 2.2rem 0; line-height: 1.4; text-align: center;">
            {saved_profile.get('owner_name', '飼い主')} 様 ＆ {saved_profile.get('name', 'ペット')} ちゃんのお部屋🐾
        </h3>
    </div>
    """, unsafe_allow_html=True)
    
    col_btn1, col_btn2, col_btn3 = st.columns([1, 2, 1])
    with col_btn2:
        if st.button("ログインへ 🚀", key="btn_transition_to_login", use_container_width=True):
            st.query_params.pop("welcome")
            st.rerun()
    st.stop()

# ログイン画面強制 (スマートフォン特化インターフェース)
if saved_profile and not is_admin and not st.session_state.get("logged_in"):
    st.markdown(f"""
    <div style="background: linear-gradient(135deg, #FFF0F2 0%, #FFF5F5 100%); padding: 1.5rem; border-radius: 20px; border: 1px solid rgba(255, 182, 193, 0.5); margin: 1rem 0; text-align: center; box-shadow: 0 8px 32px rgba(255, 128, 150, 0.08);">
        <h2 style="color: #C72C48; margin: 0; font-weight: bold; font-size: 1.5rem; text-align: center;">🔑 ログイン</h2>
        <h4 style="color: #3D2D2D; margin-top: 0.5rem; font-size: 1.1rem; text-align: center;">{saved_profile.get('owner_name', '飼い主')} 様 ＆ {saved_profile.get('name', 'ペット')} ちゃん</h4>
        <p style="color: #7D6363; font-size: 0.85rem; margin-top: 0.4rem; margin-bottom: 0; text-align: center;">ご登録いただいた4桁の暗証番号 (PIN) を入力してください🔑</p>
    </div>
    """, unsafe_allow_html=True)
    
    with st.form("mobile_login_form"):
        login_pin = st.text_input("4桁の暗証番号 (PIN)", value="", max_chars=4, type="password", key="mobile_login_pin_input")
        submit_login = st.form_submit_button("🐾 ログインしてアルバムを開く")
        
        if submit_login:
            if login_pin.strip() == saved_profile.get("pin_code", "").strip():
                st.session_state["logged_in"] = True
                st.success("🟢 ログインしました！")
                st.rerun()
            else:
                st.error("❌ 暗証番号が正しくありません🐾")
                
    st.write("---")
    if st.button("🆕 別のペットを登録・ログインする", key="btn_switch_profile_mobile", use_container_width=True):
        st.session_state["clear_localstorage"] = True
        st.query_params.clear()
        st.rerun()
        
    st.stop()

# サーバー側にプロフィールが無い場合、LocalStorageに保存データがあれば自動でそのユーザーIDへリダイレクトしてログイン画面へ
if not saved_profile:
    # 新規登録のパラメータがある場合は、このリダイレクトをスキップして登録画面のみを出す
    if "new_registration" in st.query_params:
        pass
    else:
        # Use parent-level img onerror hack to read from parent localStorage securely
        st.markdown("""
        <img src="x" onerror="
            try {
                const savedUserId = localStorage.getItem('pet_user_id');
                if (savedUserId) {
                    let parentUrl = window.location.href.split('?')[0];
                    window.location.href = parentUrl + '?user_id=' + encodeURIComponent(savedUserId) + '&welcome=1';
                }
            } catch(e) {
                console.error('Parent localStorage read failed:', e);
            }
        " style="display:none;"/>
        """, unsafe_allow_html=True)

# --- 登録完了後に自動でチュートリアルを表示する処理 ---
if st.session_state.get("show_tutorial_after_reg"):
    st.session_state.pop("show_tutorial_after_reg")
    show_tutorial_dialog()

st.markdown('<p class="main-title">🐾 うちのコ日常アルバム</p>', unsafe_allow_html=True)
st.markdown('<p class="sub-title">お気に入りの写真から、愛犬・愛猫の心の声と特別な4コマストーリーをつむぐアルバムアプリ</p>', unsafe_allow_html=True)

# --- 🐾 アップデート情報 (What's New) パネル ---
with st.expander("🐾 アップデート情報 (What's New) — バージョン 1.6.2 (最新)", expanded=False):
    st.markdown("""
    **【バージョン 1.6.2 アップデート情報 — Androidの完全対応と朗読・漢字表現の改善】**
    * 🤖 **Android端末での写真登録時のエラー・フリーズ不具合の解消**
      Androidスマホからペットの新規登録（写真付き）を行う際、高解像度写真による大容量データが原因でアプリがフリーズしたり、保存容量制限エラーで登録に失敗するバグを徹底解消！写真を自動リサイズ・圧縮（300x300px）してから保存・送信する仕組みを導入し、Android端末でも一瞬で安定して登録できるようになりました🐾
    * 🔊 **Android端末における「音声朗読（読み上げ）」の再生に完全対応**
      これまでAndroid環境のExpo Goでコラムやニュースの音声朗読を再生した際、音声が再生されなかったりエラーが出ていた不具合を修正！音声データを一時キャッシュファイルに安全に書き出してから再生する構造に変更し、iPhoneだけでなくAndroidでも高音質な読み上げ音声が再生されるようになりました。
    * 📰 **日常新聞の漢字読み上げ表現の自然化＆ダミー名混入防止ルールの追加**
      音声読み上げ時に不自然に平仮名だらけになっていたコラムや一面記事のルールを緩和！新聞として知的でユーモラスな文体と漢字表現を自然に使用できるよう改善しました（※「うちのコ」のみ読み間違い防止のため「うちのこ」に固定）。また、過去の思い出履歴データからテスト用の名前や異なる品種名が混入して生成されてしまう問題を完全に根絶し、現在登録されているペットプロフィール（名前・品種）のみが厳格に新聞に反映されるようAIプロンプトを再強化しました。

    **【バージョン 1.6.1 アップデート情報】**
    * 📰 **「コラム・社説のモバイル特化全幅レイアウト ＆ 著者プロフィール枠」の全面刷新**
    * 📰 **「コラム・社説のモバイル特化全幅レイアウト ＆ 著者プロフィール枠」の全面刷新**  
      スマートフォンの狭い画面でも社説コラムが圧倒的に読みやすくなるよう、左右2カラム分割を廃止し、横幅いっぱいにゆったりと文字が流れるシングルカラム配置に大改善！フォントサイズと行間（lineHeight: 21px）を引き上げ、丸いアバター写真と名前・肩書きが美しく並ぶプレミアムな著者プロフィールブロックを実装しました。
    
    * 🎭 **「3名のユニークなコラムニストキャラクター（ソクラテス / マグリット / エリザベス）」によるユーモア＆抜け感（ギャップ萌え）執筆システムの新設**  
      日常新聞の社説コラムがより愛らしくクスッと笑える特別な内容になるよう、AIのプロンプトを大幅チューニング！それぞれの硬い文体の合間に「（嬉しそうにしっぽを振りながら）」「（おやつ缶の音がすれば私は即座に走る）」「（ついでに、顎の下をそっと撫でることを許可しよう）」のような、ペットらしい愛らしい仕草やツンデレな抜け感（かっこ書き）を散りばめることに成功。大真面目でくだらない論理とペット特有の可愛らしさの究極のギャップを楽しめます🐾
    
    * 🎬 **「高品質AI動画プロンプト自動生成 ＆ ツールクイック起動連携ボタン」の完全実装**  
      日常新聞の最下部に「🎬 魔法のペット動画をAIで生成する」特設セクションをアンティーク調デザインで実装！思い出の写真とストーリーからシネマティックで滑らかな物理的挙動を表現する英語プロンプトを自動生成します。
      - 📋 **動画プロンプトをコピー**: ワンタップでクリップボードにコピー可能！
      - 🚀 **外部動画生成AIをワンタップ起動**: 最先端AI「Luma Dream Machine (Luma AI)」や「Runway Gen-3 (Runway AI)」の公式サイトへの安全なクイック起動ボタンを配置しました。
      - 🎨 **4コマ漫画プロンプトコピー**: 既存の4コマ漫画用プロンプトのコピー機能も、新しいセクションデザインに調和させて美しく整理・併記しました。
    
    * 🌧️ **「ココロお天気」の文字切れ・右側はみ出しバグの恒久・根本修正**  
      ウェザーボックス内のテキストが画面サイズや文字の長さによって切り切れてしまう問題を、UIレイアウトの構造的な改善（flex/shrinkの最適化）によって根本的に解決し、文字切れすることなく常に美しく収まるように恒久修正しました。
    
    * ⏱️ **印刷中ローディング動画のフリーズ防止安全タイマー（最大8秒）を新設**  
      アルバムからの思い出読み込み中や新聞生成中のフリーズを強制解除する安全タイマー（最大8秒）を実装し、どんな通信状況でもスムーズにアプリ利用を継続できるよう堅牢性を大幅に高めました。

    * 🔒 **ユーザー用アプリからの「中継API URL設定欄」の完全撤廃＆完全隠蔽化**  
      一般ユーザーのスマートフォンアプリ画面から、Geminiプロキシ中継URLの入力フィールドや設定TIP等を完全に撤去・抹消しました！これにより、意図しない画面共有や操作によってAPIキー関連の情報が漏洩するリスクを「表示させない」アプローチで100%根本から根絶し、API関連のすべての管理はPC側の「管理者メニュー」で一括管理・隠蔽する当初の極めてセキュアな設計に回帰しました🔑

    **【メジャーバグ修正・UI設計の全面刷新】**
    * 🔑 **「新規登録」「ウェルカムゲート」「ログイン」の3画面完全分離化**  
      これまでタブ表示で混在していた「新規登録」と「ログイン」を完全に独立した個別ページへと再設計しました！
      - **初めてのペット登録**: 新規ユーザーのみに表示されるようになり、余計なログイン案内は一切排除され、登録作業に集中できるようになりました🐾
      - **ウェルカムゲート**: 登録済みユーザーが再アクセスした際は、温かい歓迎カード（「おかえりなさい！ ○○様 ＆ ○○ちゃんのお部屋🐾」）と「ログインへ 🚀」ボタンのみが表示され、登録フォームを完全に隠す完璧なフローへ改善しました。
      - **ログイン画面**: 名称を不自然だった「以前のデータからログイン」からシンプルで分かりやすい **「ログイン」** へと改め、暗証番号 (PIN) 入力とプロフィールの安全な切り替えのみを行える専用のセキュリティ画面にリニューアルしました🔑
    
    * 📱 **スマートフォン特化「モバイルPINログインゲート」の新設 (v1.4.0)**  
      初回登録を済ませたユーザーが次回以降アクセスした際、セキュリティとマイアルバム専用感を高める「おなまえと4桁の暗証番号 (PIN)」を求める可愛いログインゲート画面からスタートするようになりました！セッション中の自動ログイン保持により、登録直後や情報更新後の再入力の手間なく快適にお使いいただけます。
    * 🌸 **スマートフォン視認性の完全強化＆コントラスト改善 (v1.4.0)**  
      小説のジャンル選択リストがダークモード環境で黒つぶれするバグを徹底根絶！プルダウンの背景を常に清潔なホワイトに固定し、テキストをはっきりとしたココアブラウンで描画します。また、ChatGPT連携用のリンクボタンもコピーボタン同様に高コントラストの「薄い灰色背景・黒文字・黒枠線」に刷新し、最初から完璧な視認性を実現しました。
    * 🐶 **アプリアイコンのクローズアップ加工（わんちゃんクローズアップ）(v1.4.0)**  
      アプリアイコン `app_icon.png` の中央にある可愛いわんちゃんのお顔をクローズアップして正方形（`192x192`）にズーム・トリミング加工！スマホのホーム画面にショートカット登録した際のお顔がより大きく可愛い表示に生まれ変わりました。
    * ✍️ **ボタンの日本語化（Browse files -> ファイルアップロード）(v1.4.0)**  
      画像アップローダー内の「Browse files」ボタンを親しみやすい「ファイルアップロード」に日本語化し、最初から高コントラストなデザインが反映されるようバインドしました。
    * 🏡 **管理者アプリのモニタリング強化 (v1.4.0)**  
      管理者用の早期ルーティング分離により干渉を防止。さらに、過去ログを完全にロードして昨日から今日にかけてのトラフィックを可視化する「昨日からの利用状況モニタリング」パネルを新設しました。
    """)


# --- モード切り替え (管理者用) ---
current_mode = "アルバム作成🐾"
if is_admin:
    st.markdown("### 🛠️ 管理者メニュー")
    current_mode = st.radio("表示モードを選択してください", ["アルバム作成🐾", "管理者ダッシュボード📊"], index=0, horizontal=True, key="admin_mode_select")
    st.write("---")
    
    if current_mode == "管理者ダッシュボード📊":
        render_admin_dashboard()
        st.stop()  # 処理をここで中断し、これ以降の通常アルバム作成画面のレンダリングを防ぐ

# --- LocalStorageへの保存トリガーJSの出力 ---
if "save_profile_to_localstorage" in st.session_state:
    st.session_state.pop("save_profile_to_localstorage")
    
    # Use parent-level img onerror hack to write securely to parent localStorage
    # We only need to write 'pet_user_id' as the profile is loaded natively on the server-side!
    st.markdown(f"""
    <img src="x" onerror="
        try {{
            localStorage.setItem('pet_user_id', '{user_id}');
        }} catch(e) {{
            console.error('Parent localStorage save failed:', e);
        }}
    " style="display:none;"/>
    """, unsafe_allow_html=True)

with st.sidebar:
    # 📖 使い方ガイドボタンをサイドバーの最上部に設置
    st.markdown("### 📖 ナビゲーション")
    if st.button("📖 アプリの使い方（チュートリアル）", key="btn_show_tutorial_global", use_container_width=True):
        show_tutorial_dialog()
    
    st.write("---")

    # 管理者用パラメータチェック (?admin=true がある場合のみシステム設定を表示)
    is_admin = st.query_params.get("admin") == "true"
    
    if is_admin:
        st.markdown("### 🛠️ システム設定（管理者専用）")
        input_line = st.text_input("💬 LINEアクセストークン", value=saved_config.get("LINE_CHANNEL_ACCESS_TOKEN", ""), type="password", key="root_lt_id")
        input_google = st.text_input("🔑 Google Gemini APIキー", value=saved_config.get("GOOGLE_API_KEY", ""), type="password", key="root_gk_id")
        
        if st.button("💾 設定を保存する", key="btn_save_root_config"):
            data_manager.save_config(input_line, input_google)
            st.success("設定を保存しました。")
            st.rerun()

        st.write("---")
        st.markdown("### 📡 送信設定")
        line_switch = st.checkbox("🟢 LINEに自動で送る", value=False, key="root_switch_ls_id")
        st.write("---")
    else:
        # 一般ユーザーはLINE自動送信はOFF固定、APIキーはSecretsから読み込んだ値をバインド
        input_line = saved_config.get("LINE_CHANNEL_ACCESS_TOKEN", "")
        input_google = saved_config.get("GOOGLE_API_KEY", "")
        line_switch = False

    if saved_profile:
        st.markdown("### 📝 登録されているペットの情報")
        st.markdown(f"""
        <div class="status-card">
        🐶 <b>お名前:</b> {saved_profile.get('name')} ({saved_profile.get('gender', '女の子')})<br>
        🗣️ <b>一人称:</b> 「{saved_profile.get('pronoun', 'わたし')}」<br>
        🏷️ <b>種類:</b> {saved_profile.get('pet_type')} ({saved_profile.get('breed')})<br>
        ⏳ <b>年齢:</b> {saved_profile.get('age_display')}<br>
        👤 <b>飼い主さんの呼び方:</b> {saved_profile.get('owner_call')}
        </div>
        """, unsafe_allow_html=True)
        
        # --- 専用URLコピーエリアの追加 ---
        app_url = f"https://pet-emotion-analyzer-dr57r4gvnh66nvh3epzptd.streamlit.app/?user_id={user_id}"
        st.markdown("### 🔗 あなた専用のアルバムURL")
        st.markdown(f"""
        <div style="background: var(--background-color); padding: 0.8rem; border-radius: 12px; border: 1px solid rgba(255, 128, 150, 0.25); font-size: 0.75rem; margin-bottom: 0.5rem; word-break: break-all; font-family: monospace; color: var(--text-color);">
            {app_url}
        </div>
        """, unsafe_allow_html=True)
        
        # クリップボードコピー機能用のボタン
        copy_js = f"""
        <div style="text-align: center; width: 100%;">
            <button onclick="copyUrl()" style="width: 100%; padding: 0.65rem; background: linear-gradient(135deg, #FF8096 0%, #FFA87D 100%); color: #3D2D2D; font-weight: bold; border: none; border-radius: 10px; cursor: pointer; font-size: 0.85rem; box-shadow: 0 4px 12px rgba(255, 123, 147, 0.3);">
                📋 専用URLをコピーする
            </button>
        </div>
        <script>
        function copyUrl() {{
            const tempInput = document.createElement("input");
            tempInput.value = "{app_url}";
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand("copy");
            document.body.removeChild(tempInput);
            alert("🐾 あなた専用のアルバムURLをコピーしました！\\n\\nブラウザのブックマークに登録するか、LINEのメモ等に保存してください。次回からこのURLをタップするだけで直接アルバムを開けます。");
        }}
        </script>
        """
        components.html(copy_js, height=45)
        st.caption("※このURLをブックマーク、またはスマホの『ホーム画面に追加』に登録すると、次回から入力なしで直接このアルバムを開くことができます🐾")
        
        with st.expander("📝 登録情報を変更する"):
            st.info("情報を変更して「登録情報を更新する」を押してください。")
            st.warning("⚠️ 飼い主名や暗証番号を変更すると、ログイン用情報やあなた専用のアルバムURLが新しく再生成されます。")
            edit_owner_name = st.text_input("飼い主のおなまえ", value=saved_profile.get("owner_name", ""), key="ed_owner_name")
            edit_pin_code = st.text_input("4桁の暗証番号 (PIN)", value=saved_profile.get("pin_code", ""), max_chars=4, type="password", key="ed_pin_code")
            edit_name = st.text_input("名前", value=saved_profile.get("name", ""), key="ed_name")
            edit_type = st.selectbox("種類", ["犬", "猫"], index=0 if saved_profile.get("pet_type", "犬") == "犬" else 1, key="ed_type")
            edit_breed = st.text_input("品種", value=saved_profile.get("breed", ""), key="ed_breed")
            edit_color = st.text_input("毛色", value=saved_profile.get("color", ""), key="ed_color")
            edit_gender = st.radio("性別", ["男の子", "女の子"], index=0 if saved_profile.get("gender", "男の子") == "男の子" else 1, key="ed_gender", horizontal=True)
            
            # --- 性別連動型の一人称変更 ---
            if edit_gender == "男の子":
                pronoun_options = [
                    "ボク (甘えん坊・王道)", 
                    "オレ (やんちゃ・活発)", 
                    "ぼくちゃん (あざと可愛い・赤ちゃん)", 
                    "自分 (忠実・おっとり)", 
                    "拙者 (武士・忠義の侍)", 
                    "世 (王様・尊大)", 
                    f"{edit_name} (名前呼び・無邪気)", 
                    "その他 (自由入力)"
                ]
            else:
                pronoun_options = [
                    "わたし (お姉さん・上品)", 
                    "あたし (チャーミング・小悪魔)", 
                    "うち (カジュアル・気さく)", 
                    "あたい (おてんば・ツンデレ)", 
                    "ぼく (ボーイッシュ・僕っこ)", 
                    "あちき (花魁風・妖艶)", 
                    f"{edit_name} (名前呼び・無邪気)", 
                    "その他 (自由入力)"
                ]
            
            # 既存の設定値にマッチさせるデフォルトインデックス算出
            current_pronoun = saved_profile.get("pronoun", "ボク" if edit_gender == "男の子" else "わたし")
            default_index = 0
            for idx, opt in enumerate(pronoun_options):
                if opt.startswith(current_pronoun + " "):
                    default_index = idx
                    break
            else:
                if current_pronoun == edit_name:
                    for idx, opt in enumerate(pronoun_options):
                        if opt.startswith(edit_name + " "):
                            default_index = idx
                            break
                else:
                    default_index = len(pronoun_options) - 1
            
            edit_pronoun_sel = st.selectbox("うちのコの一人称 🐾", pronoun_options, index=default_index, key="ed_pronoun_sel")
            
            if edit_pronoun_sel == "その他 (自由入力)":
                default_custom = current_pronoun if current_pronoun not in [o.split(" ")[0] for o in pronoun_options[:-1]] else "おれ様"
                edit_pronoun = st.text_input("自由に入力してください", value=default_custom, key="ed_pronoun_custom")
            else:
                edit_pronoun = edit_pronoun_sel.split(" ")[0]
                
            edit_owner = st.text_input("飼い主さんの呼び方", value=saved_profile.get("owner_call", "パパ"), key="ed_owner")
            
            # --- お誕生日、性格、エピソードの編集項目を追加 ---
            st.write("お誕生日（年齢判定用🐾）")
            # 既存値からデフォルトの日付を作成
            saved_y = saved_profile.get("birth_y", 2023)
            saved_m = saved_profile.get("birth_m", 1)
            default_birth_date = datetime.date(saved_y, saved_m, 1)
            
            edit_birthday = st.date_input(
                "お誕生日を変更",
                value=default_birth_date,
                min_value=datetime.date(2026-25, 1, 1),
                max_value=datetime.date(2026, 5, 24),
                key="ed_birthday_input",
                label_visibility="collapsed"
            )
            
            personality_options = ["元気いっぱいでやんちゃ", "甘えん坊で寂しがり屋", "おっとりマイペース", "賢く、人間の言葉を理解しようとする", "臆病だけど優しい"]
            try:
                pers_index = personality_options.index(saved_profile.get("personality", "元気いっぱいでやんちゃ"))
            except ValueError:
                pers_index = 0
                
            edit_personality = st.selectbox("基本の性格傾向", personality_options, index=pers_index, key="ed_personality")
            edit_personality_detail = st.text_area("具体的なエピソード・行動詳細", value=saved_profile.get("personality_detail", ""), key="ed_pers_detail")
            
            if st.button("💾 登録情報を更新する"):
                edit_owner_name_clean = edit_owner_name.strip()
                edit_pin_code_clean = edit_pin_code.strip()
                
                if not edit_owner_name_clean:
                    st.error("⚠️ 飼い主のおなまえを入力してください。")
                elif not edit_pin_code_clean or len(edit_pin_code_clean) != 4 or not edit_pin_code_clean.isdigit():
                    st.error("⚠️ 暗証番号は4桁の数字を入力してください。")
                else:
                    # 年齢の自動計算
                    current_date = datetime.date(2026, 5, 24)
                    birth_date = edit_birthday
                    total_months = (current_date.year - birth_date.year) * 12 + current_date.month - birth_date.month
                    if total_months < 0: age_display = "生後0ヶ月"
                    elif total_months < 12: age_display = f"子犬/子猫期（生後 {total_months} ヶ月）"
                    else: age_display = f"成犬/成猫期（ {total_months // 12} 歳 {total_months % 12} ヶ月）"
                    
                    updated_data = saved_profile.copy()
                    updated_data.update({
                        "owner_name": edit_owner_name_clean,
                        "pin_code": edit_pin_code_clean,
                        "name": edit_name, 
                        "pet_type": edit_type, 
                        "breed": edit_breed, 
                        "color": edit_color, 
                        "gender": edit_gender, 
                        "pronoun": edit_pronoun,
                        "birth_y": edit_birthday.year,
                        "birth_m": edit_birthday.month,
                        "personality": edit_personality,
                        "personality_detail": edit_personality_detail,
                        "owner_call": edit_owner,
                        "age_display": age_display
                    })
                    
                    # 新しい user_id の生成
                    new_user_id = data_manager.generate_user_id(edit_owner_name_clean, edit_pin_code_clean)
                    
                    data_manager.save_profile(updated_data, new_user_id)
                    st.session_state["save_profile_to_localstorage"] = updated_data
                    st.query_params["user_id"] = new_user_id
                    st.session_state["logged_in"] = True
                    st.success("ペット情報を更新しました。専用URLが新しくなりました🐾")
                    st.rerun()

    # --- 誤操作防止のため、クリアボタンをサイドバーの最下部に移動 ---
    st.write("---")
    st.markdown("### ⚙️ 管理・クリア")
    if st.button("🗑️ 表示をクリアする（過去の生成結果を消去）", key="sidebar_clear_btn_v7"):
        st.session_state.pop('display_story', None)
        st.session_state.pop('display_feelings', None)
        st.session_state.pop('display_prompt', None)
        st.session_state.pop('line_status', None)
        st.success("表示データをクリアしました。")
        st.rerun()

LINE_CHANNEL_ACCESS_TOKEN = input_line if input_line else saved_config.get("LINE_CHANNEL_ACCESS_TOKEN", "")
GOOGLE_API_KEY = input_google if input_google else saved_config.get("GOOGLE_API_KEY", "")

def show_profile_dialog():
    if "reg_page_mode" not in st.session_state:
        st.session_state["reg_page_mode"] = "register"

    if st.session_state["reg_page_mode"] == "login":
        st.markdown("""
        <div style="background: linear-gradient(135deg, #FFF0F2 0%, #FFF5F5 100%); padding: 1.5rem; border-radius: 20px; border: 1px solid rgba(255, 182, 193, 0.4); margin-bottom: 1.5rem; box-shadow: 0 8px 32px rgba(255, 128, 150, 0.08);">
            <h2 style="color: #C72C48; margin: 0; font-weight: bold; font-size: 1.6rem; text-align: center;">🔑 データ復元 ログイン</h2>
            <p style="color: #7D6363; font-size: 0.9rem; margin-top: 0.4rem; margin-bottom: 0; text-align: center;">登録した「飼い主のおなまえ」と「4桁の暗証番号」を入力してください🐾</p>
        </div>
        """, unsafe_allow_html=True)
        
        st.write("以前登録したお名前と暗証番号から、サーバーに保存されているデータを完全に復元してログインできます🔑")
        
        login_owner_name = st.text_input("飼い主のおなまえ", value="", key="restore_owner_name")
        login_pin_code = st.text_input("4桁の暗証番号 (PIN)", value="", max_chars=4, type="password", key="restore_pin_code")
        
        if st.button("🔑 ログインしてデータを復元する", key="btn_restore_submit", use_container_width=True):
            l_owner_clean = login_owner_name.strip()
            l_pin_clean = login_pin_code.strip()
            
            if not l_owner_clean:
                st.warning("⚠️ お名前を入力してください。")
            elif not l_pin_clean or len(l_pin_clean) != 4 or not l_pin_clean.isdigit():
                st.warning("⚠️ 暗証番号は4桁の数字を入力してください。")
            else:
                login_user_id = data_manager.generate_user_id(l_owner_clean, l_pin_clean)
                loaded_profile = data_manager.load_profile(login_user_id)
                
                if loaded_profile and "name" in loaded_profile:
                    st.session_state["save_profile_to_localstorage"] = loaded_profile
                    st.query_params["user_id"] = login_user_id
                    st.session_state["logged_in"] = True
                    st.success(f"おかえりなさい！ {loaded_profile.get('name')}ちゃんのお部屋にログインしました🐾")
                    st.rerun()
                else:
                    st.error("❌ 一致する登録データが見つかりませんでした。お名前や暗証番号が合っているか再度ご確認いただくか、お手数ですが新規登録をお願いいたします🐾")
                    
        st.write("---")
        if st.button("👋 新規登録に戻る", key="btn_go_back_to_register", use_container_width=True):
            st.session_state["reg_page_mode"] = "register"
            st.rerun()
            
    else:
        st.markdown("""
        <div style="background: linear-gradient(135deg, #FFF0F2 0%, #FFF5F5 100%); padding: 1.5rem; border-radius: 20px; border: 1px solid rgba(255, 182, 193, 0.4); margin-bottom: 1.5rem; box-shadow: 0 8px 32px rgba(255, 128, 150, 0.08);">
            <h2 style="color: #C72C48; margin: 0; font-weight: bold; font-size: 1.6rem; text-align: center;">🐾 👋 はじめてのペット登録</h2>
            <p style="color: #7D6363; font-size: 0.9rem; margin-top: 0.4rem; margin-bottom: 0; text-align: center;">愛するうちのコの基本設定を行って、アルバムを開始しましょう🐾</p>
        </div>
        """, unsafe_allow_html=True)

        st.write("うちのコの情報を登録して始めましょう。情報はサーバー上に安全に保存され、お名前と暗証番号でいつでもログイン・復元できます🔑")
        
        # ログイン連携情報
        st.markdown("##### 👤 1. 飼い主さまとログイン設定 (必須)")
        col_o1, col_o2 = st.columns(2)
        with col_o1:
            p_owner_name = st.text_input("飼い主のおなまえ (例: 佐藤美咲)", value="", key="p_owner_name")
        with col_o2:
            p_pin_code = st.text_input("4桁の暗証番号 (例: 1234)", value="", max_chars=4, type="password", key="p_pin_code")
            
        st.write("---")
        st.markdown("##### 🐶 2. うちのコの情報")
        
        p_name = st.text_input("名前", value="ベル", key="p_name")
        p_type = st.selectbox("動物の種別", ["犬", "猫"], key="p_type")
        p_breed = st.text_input("犬種・猫種", value="ミニチュアダックスフンド", key="p_breed")
        p_color = st.text_input("毛色・視覚的特徴", value="レッド", key="p_color")
        p_gender = st.radio("性別", ["男の子", "女の子"], horizontal=True, key="p_gender")
        
        # 性別に応じた一人称の提案リスト
        if p_gender == "男の子":
            pronoun_options = [
                "ボク (甘えん坊・王道)", 
                "オレ (やんちゃ・活発)", 
                "ぼくちゃん (あざと可愛い・赤ちゃん)", 
                "自分 (忠実・おっとり)", 
                "拙者 (武士・忠義の侍)", 
                "世 (王様・尊大)", 
                f"{p_name} (名前呼び・無邪気)", 
                "その他 (自由入力)"
            ]
        else:
            pronoun_options = [
                "わたし (お姉さん・上品)", 
                "あたし (チャーミング・小悪魔)", 
                "うち (カジュアル・気さく)", 
                "あたい (おてんば・ツンデレ)", 
                "ぼく (ボーイッシュ・僕っこ)", 
                "あちき (花魁風・妖艶)", 
                f"{p_name} (名前呼び・無邪気)", 
                "その他 (自由入力)"
            ]
            
        p_pronoun_sel = st.selectbox("うちのコの一人称（おしゃべり語尾）🐾", pronoun_options, key="p_pronoun_sel")
        
        if p_pronoun_sel == "その他 (自由入力)":
            p_pronoun = st.text_input("自由に入力してください（例：俺様、ボクちん、ミーなど）", value="おれ様", key="p_pronoun_custom")
        else:
            p_pronoun = p_pronoun_sel.split(" ")[0]
            
        p_owner_call = st.text_input("飼い主さんの呼び方（パパ, ママなど）", value="パパ", key="p_owner_call")
        
        st.write("お誕生日（年齢の自動判定に使用します🐾）")
        today = datetime.date(2026, 5, 24)
        default_birth = datetime.date(2023, 1, 1)
        min_birth = datetime.date(today.year - 25, 1, 1)
        
        p_birthday = st.date_input(
            "お誕生日を選択",
            value=default_birth,
            min_value=min_birth,
            max_value=today,
            key="pet_birthday_input",
            label_visibility="collapsed"
        )
        p_birth_y = p_birthday.year
        p_birth_m = p_birthday.month
        
        personality_options = ["元気いっぱいでやんちゃ", "甘えん坊で寂しがり屋", "おっとりマイペース", "賢く、人間の言葉を理解しようとする", "臆病だけど優しい"]
        p_pers = st.selectbox("基本の性格傾向", personality_options, key="p_pers")
        p_pers_detail = st.text_area("具体的なエピソード・行動詳細", value="お気に入りのおもちゃをくわえて、得意げに部屋中を走り回っていたこと。", key="p_pers_detail")
        
        if st.button("💾 この内容で登録する", key="btn_register_submit"):
            p_owner_clean = p_owner_name.strip()
            p_pin_clean = p_pin_code.strip()
            
            if not p_owner_clean:
                st.warning("⚠️ 飼い主のおなまえを入力してください。")
            elif not p_pin_clean or len(p_pin_clean) != 4 or not p_pin_clean.isdigit():
                st.warning("⚠️ 暗証番号は4桁の数字を入力してください。")
            else:
                # 年齢の自動計算
                current_date = datetime.date(2026, 5, 24)
                birth_date = datetime.date(p_birth_y, p_birth_m, 1)
                total_months = (current_date.year - birth_date.year) * 12 + current_date.month - birth_date.month
                if total_months < 0: age_display = "生後0ヶ月"
                elif total_months < 12: age_display = f"子犬/子猫期（生後 {total_months} ヶ月）"
                else: age_display = f"成犬/成猫期（ {total_months // 12} 歳 {total_months % 12} ヶ月）"
         
                profile_data = {
                    "owner_name": p_owner_clean,
                    "pin_code": p_pin_clean,
                    "name": p_name, 
                    "pet_type": p_type, 
                    "breed": p_breed, 
                    "color": p_color,
                    "gender": p_gender, 
                    "pronoun": p_pronoun, 
                    "birth_y": p_birth_y, 
                    "birth_m": p_birth_m,
                    "personality": p_pers, 
                    "personality_detail": p_pers_detail, 
                    "owner_call": p_owner_call,
                    "age_display": age_display
                }
                
                # 新しい安定IDを計算
                registered_user_id = data_manager.generate_user_id(p_owner_clean, p_pin_clean)
                
                data_manager.save_profile(profile_data, registered_user_id)
                st.session_state["save_profile_to_localstorage"] = profile_data
                st.query_params["user_id"] = registered_user_id
                st.session_state["show_tutorial_after_reg"] = True
                st.session_state["logged_in"] = True
                st.success("登録が完了しました！使い方ガイドを表示します。")
                st.rerun()

        st.write("---")
        st.write("💡 すでに以前ペットを登録したデータをお持ちですか？")
        if st.button("🔑 登録済みデータから復元・ログインする", key="btn_switch_to_login", use_container_width=True):
            st.session_state["reg_page_mode"] = "login"
            st.rerun()

# データがなければ登録画面をインライン表示して処理を停止
if not saved_profile:
    show_profile_dialog()
    st.stop()

col1, col2 = st.columns([1, 1], gap="large")

with col1:
    st.markdown("### 🎬 思い出の写真とストーリーの選択")
    
    uploaded_file = st.file_uploader("愛犬・愛猫の写真ファイルをアップロードしてください（.jpg / .jpeg / .png）🐾", type=["jpg", "jpeg", "png", "JPG", "JPEG", "PNG"], key="fu_native_v7")
    
    with st.form(key="secure_capsule_form_v7"):
        story_mode = st.radio("📝 ストーリーのスタイルを選んでください", ["絵本小説風（客観的な視点から）", "おしゃべり風（うちのコの一人称で）"], horizontal=True, key="sm_sel_v7")
        
        # --- 小説ジャンルの選択プルダウンを追加 ---
        genre = "ほのぼの日常風"
        if story_mode == "絵本小説風（客観的な視点から）":
            genre = st.selectbox(
                "📚 小説のジャンルを選んでください",
                ["ほのぼの日常風", "恋愛小説風", "冒険小説風", "ミステリー（世にも奇妙な物語風）", "異世界転生風", "学園小説風"],
                index=0,
                key="novel_genre_selectbox"
            )
            
        submit_button = st.form_submit_button(label="⚡️ 思い出のストーリーをつくる")
    
    p_bar = st.empty()
    p_text = st.empty()
    
    if submit_button:
        # 新しい処理を始める前に、過去の結果をクリアする
        st.session_state.pop('display_story', None)
        st.session_state.pop('display_feelings', None)
        st.session_state.pop('display_prompt', None)
        
        if not GOOGLE_API_KEY:
            if is_admin:
                st.error("Google Gemini APIキーが未設定です。上の管理者設定から登録して保存してください。")
            else:
                st.error("システム設定エラーが発生しました。時間を置いて再度お試しいただくか、開発者にお問い合わせください🐾")
        elif uploaded_file is None:
            st.warning("思い出の写真ファイルを選んでアップロードしてください。")
        elif not saved_profile:
            st.error("ペットの情報が登録されていません。")
        else:
            temp_dir = "temp_uploads"
            os.makedirs(temp_dir, exist_ok=True)
            
            # Androidや特殊なMIME形式でもエラーにならないよう、拡張子の大文字小文字を整え、空なら.jpgに安全フォールバック
            _, raw_ext = os.path.splitext(uploaded_file.name)
            ext = raw_ext.lower() if raw_ext else ".jpg"
            if ext not in [".jpg", ".jpeg", ".png"]:
                ext = ".jpg"
            
            temp_file_path = os.path.join(temp_dir, f"{uuid.uuid4().hex}{ext}")
            
            p_bar.progress(10)
            p_text.info("📥 思い出の写真を綺麗に準備しています...")
            
            try:
                # どんな端末・フォルダからの画像データでも安全にデコードして標準JPEGにサニタイズ保存
                ai_core.sanitize_image(uploaded_file, temp_file_path)
            except Exception as e_sanitize:
                err_msg = mask_error_message(e_sanitize)
                st.error(err_msg)
                data_manager.log_usage(
                    user_id=user_id,
                    pet_name=saved_profile.get("name", "不明"),
                    pet_type=saved_profile.get("pet_type", "不明"),
                    story_mode=story_mode,
                    genre=genre if story_mode == "絵本小説風（客観的な視点から）" else "おしゃべり風",
                    duration_ms=0,
                    status="ERROR",
                    error_msg=f"Sanitize failed: {e_sanitize}"
                )
                p_bar.empty()
                p_text.empty()
                st.stop()
            
            try:
                loading_placeholder = st.empty()
                with loading_placeholder.container():
                    video_base64 = get_loading_video_base64()
                    st.markdown(f"""
                    <div class="full-screen-loader">
                      <div class="loader-card">
                        <video class="loading-video" autoplay loop muted playsinline>
                          <source src="data:video/mp4;base64,{video_base64}" type="video/mp4">
                          Your browser does not support the video tag.
                        </video>
                        <h3 style="color: #C72C48; margin-top: 0.5rem; font-weight: bold; font-size: 1.4rem;">心を込めて執筆中...🐾</h3>
                        <p style="color: var(--text-color); opacity: 0.85; font-size: 0.95rem; line-height: 1.6; margin-top: 0.8rem; margin-bottom: 0;">
                          AIが思い出の写真から本当の気持ちを読み解き、特別なショートストーリーを創作しています。<br>10〜30秒ほど楽しみにお待ちください。
                        </p>
                      </div>
                    </div>
                    """, unsafe_allow_html=True)

                import time
                start_time = time.time()
                feelings_res, story_res, prompt_res = ai_core.run_ai_factory(GOOGLE_API_KEY, saved_profile, temp_file_path, story_mode, genre, p_bar, p_text)
                duration_ms = (time.time() - start_time) * 1000
                
                if feelings_res:
                    st.session_state['display_feelings'] = feelings_res
                    st.session_state['display_story'] = story_res
                    st.session_state['display_prompt'] = prompt_res
                    
                    # ログの記録 (成功)
                    data_manager.log_usage(
                        user_id=user_id,
                        pet_name=saved_profile.get("name", "不明"),
                        pet_type=saved_profile.get("pet_type", "不明"),
                        story_mode=story_mode,
                        genre=genre if story_mode == "絵本小説風（客観的な視点から）" else "おしゃべり風",
                        duration_ms=duration_ms,
                        status="SUCCESS"
                    )
                    
                    uploaded_file.seek(0)
                    st.session_state['display_image'] = uploaded_file.read()
                    st.session_state['display_mime'] = uploaded_file.type
                    
                    # LINE自動送信は管理者セッション（is_admin=True）かつスイッチONの場合のみ実行
                    if is_admin and line_switch:
                        # LINE配信用テキストの構築
                        line_text = f"🐾 【{saved_profile['name']}ちゃんの日常心情分析】\n{feelings_res}\n\n📖 【思い出ストーリー】\n{story_res}\n\n🎨 【GPT用4コマ漫画生成プロンプト】\n{prompt_res}"
                        status = line_api.send_to_line_broadcast(LINE_CHANNEL_ACCESS_TOKEN, line_text, prompt_res)
                        st.session_state['line_status'] = status
                    elif is_admin:
                        st.session_state['line_status'] = "ℹ️ LINE自動送信はOFFです。ローカル画面のみに出力しました。"
                    else:
                        # 一般ユーザーの場合はLINEステータスを出さず、メッセージ自体を格納しない
                        st.session_state.pop('line_status', None)
                else:
                    masked_err = mask_error_message(prompt_res)
                    st.error(masked_err)
                    # ログの記録 (失敗)
                    data_manager.log_usage(
                        user_id=user_id,
                        pet_name=saved_profile.get("name", "不明"),
                        pet_type=saved_profile.get("pet_type", "不明"),
                        story_mode=story_mode,
                        genre=genre if story_mode == "絵本小説風（客観的な視点から）" else "おしゃべり風",
                        duration_ms=duration_ms,
                        status="ERROR",
                        error_msg=prompt_res
                    )
            finally:
                if 'loading_placeholder' in locals():
                    loading_placeholder.empty()
                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)
                p_bar.empty()
                p_text.empty()

with col2:
    st.markdown("### 📚 完成した思い出ストーリー")
    if 'line_status' in st.session_state: st.info(st.session_state['line_status'])
        
    if 'display_feelings' in st.session_state and 'display_story' in st.session_state:
        feelings_text = st.session_state['display_feelings']
        story_text = st.session_state['display_story']
        manga_prompt_text = st.session_state['display_prompt']
        
        # まずアップロードした元画像を表示
        if 'display_image' in st.session_state:
            st.markdown("#### 📸 アップロードした思い出写真")
            st.image(st.session_state['display_image'], use_container_width=True)
            
        st.write("---")
        # 1. 写真の分析(ペットの気持ち分析)
        st.markdown("#### 🐶 写真の分析（ペットの気持ち分析）")
        st.markdown(f'<div class="line-preview-box">{feelings_text}</div>', unsafe_allow_html=True)
        st.write("---")
        
        # 2. ストーリー
        st.markdown("#### 📖 ストーリー")
        st.markdown(f'<div class="line-preview-box">{story_text}</div>', unsafe_allow_html=True)
        st.write("---")

        # 3. GPTが4コマ漫画を最高品質で生成する最高のプロンプト
        st.markdown("#### 🎨 GPTが4コマ漫画を最高品質で生成する最高のプロンプト")
        st.info("💡 下のプロンプトをワンクリックでコピーし、すぐ下の「ChatGPTで4コマ漫画生成」ボタンを押してChatGPTに貼り付けてください！")
        
        # --- スマホでもPCでも確実にコピー動作する、プロンプトテキスト＆コピペボタン併設の特別HTMLウィジェット ---
        html_copy_code = f"""
        <div style="display: flex; flex-direction: column; gap: 10px; width: 100%; height: 100%; box-sizing: border-box; font-family: sans-serif;">
            <style>
                textarea {{
                    width: 100%; 
                    height: 190px; 
                    background-color: #FFFDFC; 
                    color: #3D2D2D; 
                    border: 1px solid rgba(255, 182, 193, 0.5); 
                    border-radius: 8px; 
                    padding: 10px; 
                    font-family: monospace; 
                    font-size: 14px; 
                    box-sizing: border-box; 
                    resize: none;
                    outline: none;
                }}
                @media (prefers-color-scheme: dark) {{
                    textarea {{
                        background-color: #1A202C;
                        color: #FFFFFF;
                        border: 1px solid #4A5568;
                    }}
                }}
            </style>
            <textarea id="promptText" readonly>{manga_prompt_text}</textarea>
            <button onclick="copyToClipboard()" style="background: linear-gradient(135deg, #FF8096 0%, #FFA87D 100%); color: #3D2D2D; border: none; border-radius: 8px; padding: 12px; font-weight: bold; cursor: pointer; font-size: 15px; width: 100%; transition: opacity 0.2s;">📋 プロンプトをコピーする</button>
        </div>
        <script>
        function copyToClipboard() {{
            var copyText = document.getElementById("promptText");
            copyText.select();
            copyText.setSelectionRange(0, 99999); /* For mobile devices */
            try {{
                var successful = document.execCommand('copy');
                if (successful) {{
                    alert("プロンプトをクリップボードにコピーしました！");
                }} else {{
                    alert("コピーに失敗しました。手動でコピーしてください。");
                }}
            }} catch (err) {{
                alert("コピー機能がサポートされていません。手動でコピーしてください。");
            }}
        }}
        </script>
        """
        components.html(html_copy_code, height=255)
        
        # --- ChatGPTへ直行するボタンを設置 ---
        st.write("")
        st.link_button("🚀 ChatGPTで4コマ漫画生成", "https://chatgpt.com/", use_container_width=True)
        
    else:
        st.info("左側で写真をセットし、ボタンを押すと進捗バーが走り出し、完了後にここに心情分析と小説、そして4コマ漫画プロンプトが生成されます。")

st.write("---")
st.caption("With Love and Warmth — Powered by Gemini 2.5 Flash & NanoBanana (Imagen 3) Architecture")
