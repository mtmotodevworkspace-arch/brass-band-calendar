/**
 * 吹奏楽練習カレンダー 演奏曲目ライブラリ & 8月・9月練習スケジュール
 */

// 演奏曲目マスターライブラリ (全12曲) - 正確な吹奏楽名演動画リンク設定
export const MASTER_REPERTOIRE = [
  {
    id: "rep-1",
    section: "第1部",
    no: "OP",
    title: "青少年のための管弦楽入門",
    composer: "B.ブリテン / Arr. 坂井貴祐",
    conductor: "公文 先生",
    points: `【冒頭のテーマと変奏の表現】
・パーセル主題の金管・木管・打楽器それぞれの音色対比をくっきり表現。
・[フーガ部] 各パートのアインザッツは音量を控えめに、テーマの引き継ぎをリレーのように美しく。
・トロンボーン・チューバ低音パート：クレッシェンドの打点とアタックを揃えること。`,
    videos: [
      { title: "青少年のための管弦楽入門 吹奏楽名演", url: "https://www.youtube.com/results?search_query=%E9%9D%92%E5%B0%91%E5%B9%B4%E3%81%AE%E3%81%9F%E3%82%81%E3%81%AE%E7%AE%A1%E5%BC%A6%E6%A5%BD%E5%85%A5%E9%96%80+%E5%90%B9%E5%A5%8F%E6%A5%BD", description: "プロ吹奏楽団・名門バンドによるテーマ＆フーガ名演" },
      { title: "オーケストラ原曲＆スコア音源", url: "https://www.youtube.com/results?search_query=The+Young+Person%27s+Guide+to+the+Orchestra+Britten", description: "楽器紹介と変奏構造の比較確認用" }
    ]
  },
  {
    id: "rep-2",
    section: "第1部",
    no: "2",
    title: "おジャ魔女カーニバル!!",
    composer: "MAHO堂 / Arr. 吹奏楽版",
    conductor: "公文 先生",
    points: `【ポップスならではのアッパー感とドライブ感】
・冒頭のファンファーレ：ハイトーンのピッチとアタックをキレ良く！
・サビのバックグラウンド（トロンボーン・サックスのリフ）：裏拍のアクセントをタメすぎずに跳ねる。
・木管16分音符のオブリガート：指回しを滑らかに、音量を殺さずクリアに。`,
    videos: [
      { title: "おジャ魔女カーニバル!! 吹奏楽名演ライブ", url: "https://www.youtube.com/results?search_query=%E3%81%8A%E3%82%B8%E3%83%A3%E9%AD%94%E5%A5%B3%E3%82%AB%E3%83%BC%E3%83%8B%E3%83%90%E3%83%AB+%E5%90%B9%E5%A5%8F%E6%A5%BD", description: "シエナWO・名門高校吹奏楽部によるノリ抜群のライブ演奏" },
      { title: "少人数・フレックス編成参考音源", url: "https://www.youtube.com/results?search_query=%E3%81%8A%E3%82%B8%E3%83%A3%E9%AD%94%E5%A5%B3%E3%82%AB%E3%83%BC%E3%83%8B%E3%83%90%E3%83%AB+%E3%83%95%E3%83%AC%E3%83%83%E3%82%AF%E3%82%B9+%E5%90%B9%E5%A5%8F%E6%A5%BD", description: "セクション別の音量バランス確認用" }
    ]
  },
  {
    id: "rep-3",
    section: "第1部",
    no: "3",
    title: "リトル・マーメイド・メドレー",
    composer: "A.メンケン / Arr. 星出尚志 (NSB)",
    conductor: "下川 先生",
    points: `【ディズニーの表情豊かな世界観の表現】
・Under the Sea：カリプソ・スチールドラム風の軽やかなパーカッションビート。
・Part of Your World：木管ソロの歌い込みとホルンの包み込むようなハーモニー。
・Kiss the Girl：ミディアムテンポのアンサンブル。アコースティックな音色を保つ。`,
    videos: [
      { title: "リトル・マーメイド・メドレー (星出尚志編) 東京佼成WO", url: "https://www.youtube.com/results?search_query=%E3%83%AA%E3%83%88%E3%83%AB%E3%83%9E%E3%83%BC%E3%83%A1%E3%82%A4%E3%83%89%E3%83%A1%E3%83%89%E3%83%AC%E3%83%BC+%E5%90%B9%E5%A5%8F%E6%A5%BD+%E6%98%9F%E5%87%BA%E5%B0%9A%E5%BF%97", description: "New Sounds in Brass 公式模範演奏" },
      { title: "演奏会ライブステージ映像", url: "https://www.youtube.com/results?search_query=%E3%83%AA%E3%83%88%E3%83%AB%E3%83%9E%E3%83%BC%E3%83%A1%E3%82%A4%E3%83%89%E3%83%A1%E3%83%89%E3%83%AC%E3%83%BC+%E5%90%B9%E5%A5%8F%E6%A5%BD+%E3%83%A9%E3%82%A4%E3%83%96", description: "ダイナミクスとテンポチェンジの参考" }
    ]
  },
  {
    id: "rep-4",
    section: "第1部",
    no: "4",
    title: "好きすぎて滅！",
    composer: "Arr. 吹奏楽ポップス",
    conductor: "下川 先生",
    points: `【キャッチーなメロディとノリの良さ】
・リズムセクション（ベース・ドラム）の縦の線をビシッと合わせる。
・サビでの管楽器全員のフォルテシモ：音が割れないよう美しいブラスサウンドを意識。`,
    videos: [
      { title: "好きすぎて滅！ 吹奏楽アレンジ名演", url: "https://www.youtube.com/results?search_query=%E5%A5%BD%E3%81%8D%E3%81%99%E3%81%8E%E3%81%A6%E6%BB%85+%E5%90%B9%E5%A5%8F%E6%A5%BD", description: "ノリとサウンドバランスの参考" }
    ]
  },
  {
    id: "rep-5",
    section: "第2部",
    no: "1",
    title: "21世紀のスキッツォイドマン (21st Century Schizoid Man)",
    composer: "R.フリップ / Arr. 三浦秀秋",
    conductor: "公文 先生",
    points: `【プログレ・ブラスの重厚なリフと変拍子】
・冒頭のユニゾンリフ：歪みを感じさせる重厚な金管とアルトサックスの咆哮。
・中間部の高速変拍子セクション：カウントを全員で共有。変拍子の頭に遅れない。
・ドラムソロ〜ラスト：カタルシスに向けたダイナミックなクレッシェンド。`,
    videos: [
      { title: "21世紀のスキッツォイドマン シエナWO (三浦秀秋編)", url: "https://www.youtube.com/results?search_query=21%E4%B8%96%E7%B4%80%E3%81%AE%E3%82%B9%E3%82%AD%E3%83%83%E3%83%84%E3%82%A9%E3%82%A4%E3%83%89%E3%83%9E%E3%83%B3+%E5%90%B9%E5%A5%8F%E6%A5%BD+%E3%82%B7%E3%82%A8%E3%83%8A", description: "シエナ・ウインド・オーケストラによる伝説的名演" },
      { title: "ブラスフェスティバル ライブ動画", url: "https://www.youtube.com/results?search_query=21st+Century+Schizoid+Man+wind+orchestra", description: "変拍子リフと音圧の参考" }
    ]
  },
  {
    id: "rep-6",
    section: "第2部",
    no: "2",
    title: "カンタービレ・コレクション",
    composer: "Arr. 吹奏楽スペシャル",
    conductor: "下川 先生",
    points: `【美しい歌（Cantabile）の表現】
・メロディパートのブレスコントロールとアゴギク。
・ハーモニーパート：純正律を意識した美しいピッチ合わせ。`,
    videos: [
      { title: "カンタービレ・コレクション 吹奏楽名演", url: "https://www.youtube.com/results?search_query=%E3%82%AB%E3%83%B3%E3%82%BF%E3%83%BC%E3%83%93%E3%83%AC%E3%82%B3%E3%83%AC%E3%82%AF%E3%82%B7%E3%83%A7%E3%83%B3+%E5%90%B9%E5%A5%8F%E6%A5%BD", description: "美しい歌い込みとハーモニーの参考" }
    ]
  },
  {
    id: "rep-7",
    section: "第2部",
    no: "3",
    title: "Narco",
    composer: "Timmy Trumpet / Arr. 吹奏楽",
    conductor: "公文 先生",
    points: `【トランペットソロ＆EDMスタイルのフェス感】
・トランペットソロ：圧倒的な存在感とハイノートの輝き！
・重低音セクション（チューバ・バスクラ・サックス）：EDMのドロップのような重低音ビート。`,
    videos: [
      { title: "Narco トランペットソロ＆ブラスバンド名演", url: "https://www.youtube.com/results?search_query=Narco+Timmy+Trumpet+brass+band", description: "ソロトランペットとEDMブラス名演" },
      { title: "Narco 吹奏楽大編成ライブ", url: "https://www.youtube.com/results?search_query=Narco+%E5%90%B9%E5%A5%8F%E6%A5%BD", description: "大編成での音圧と盛り上がり参考" }
    ]
  },
  {
    id: "rep-8",
    section: "第2部",
    no: "4",
    title: "マツケンサンバⅡ",
    composer: "宮川彬良 / Arr. 真島俊夫 (NSB)",
    conductor: "公文 先生",
    points: `【会場一体となる輝かしいサンバサウンド】
・イントロの華やかな金管ファンファーレ。
・サンバパーカッション（クイーカ・パンデイロ・アゴゴ）：本場のラテンリズムを徹底。
・「オレ！」のかけ声の全団員の一致。`,
    videos: [
      { title: "マツケンサンバⅡ (真島俊夫編) 東京佼成WO", url: "https://www.youtube.com/results?search_query=%E3%83%9E%E3%83%84%E3%82%B1%E3%83%B3%E3%82%B5%E3%83%B3%E3%83%902+%E5%90%B9%E5%A5%8F%E6%A5%BD+%E7%9C%9F%E5%B3%B6%E4%BF%8A%E5%A4%AB", description: "真島俊夫アレンジの金字塔名演" },
      { title: "Osaka Shion Wind Orchestra ライブ", url: "https://www.youtube.com/results?search_query=%E3%83%9E%E3%83%84%E3%82%B1%E3%83%B3%E3%82%B5%E3%83%B3%E3%83%902+%E5%90%B9%E5%A5%8F%E6%A5%BD+Shion", description: "圧倒的盛り上がりのライブ映像" }
    ]
  },
  {
    id: "rep-9",
    section: "第2部",
    no: "5",
    title: "ルパン三世のテーマ",
    composer: "大野雄二 / Arr. 星出尚志 / 三浦秀秋",
    conductor: "公文 先生",
    points: `【ジャジーなスタイルとスリリングな展開】
・ソロ回し（サックス、トロンボーン、トランペット）：ジャズのニュアンスと音色。
・ブラスのシャウト：音圧を保ちつつクールな音切り。`,
    videos: [
      { title: "ルパン三世のテーマ (NSB星出尚志編) 佼成WO", url: "https://www.youtube.com/results?search_query=%E3%83%AB%E3%83%91%E3%83%B3%E4%B8%89%E4%B8%96%E3%81%AE%E3%83%86%E3%83%BC%E3%83%9E+%E5%90%B9%E5%A5%8F%E6%A5%BD+%E6%98%9F%E5%87%BA%E5%B0%9A%E5%BF%97", description: "王道ジャズブラスの模範演奏" },
      { title: "ルパン三世のテーマ'80 (シエナWO Live)", url: "https://www.youtube.com/results?search_query=%E3%83%AB%E3%83%91%E3%83%B3%E4%B8%89%E4%B8%96%E3%81%AE%E3%83%86%E3%83%BC%E3%83%9E+%E3%82%B7%E3%82%A8%E3%83%8A", description: "スリリングなテンポ感" }
    ]
  },
  {
    id: "rep-10",
    section: "第2部",
    no: "6",
    title: "海の男たちの歌 (Songs of Sailor and Sea)",
    composer: "R.W.スミス",
    conductor: "公文 先生",
    points: `【吹奏楽オリジナルの壮大なダイナミクスとドラマ】
・冒頭の嵐のプレリュード：打楽器群と低音の強烈なアタック。
・中間部「WHALE SONG」：クジラの鳴き声を模したチューバ・ユーフォ・弦バスの特殊奏法。
・壮大なフィナーレ：海原の広がりを表現するスケールの大きな金管コラール。`,
    videos: [
      { title: "R.W.スミス「海の男たちの歌」コンクール名演", url: "https://www.youtube.com/results?search_query=%E6%B5%B7%E3%81%AE%E7%94%B7%E3%81%9F%E3%81%A1%E3%81%AE%E6%AD%8C+%E5%90%B9%E5%A5%8F%E6%A5%BD", description: "吹奏楽コンクール最高峰の名演音源" },
      { title: "Tokyo Kosei Wind Orchestra 録音", url: "https://www.youtube.com/results?search_query=Songs+of+Sailor+and+Sea+wind+orchestra", description: "アーティキュレーションとダイナミクス参考" }
    ]
  },
  {
    id: "rep-11",
    section: "Enc",
    no: "1",
    title: "ディスコ・キッド",
    composer: "東海林修",
    conductor: "公文 先生",
    points: `【吹奏楽課題曲の永遠の名曲】
・スネアドラムのディスコビートと全体の手拍子（ディスコ・コール）。
・中間部のアルトサックス・ソロのアンニュイなメロディ。
・エンディングのアタック揃え。`,
    videos: [
      { title: "ディスコ・キッド 課題曲名演 (東京佼成WO)", url: "https://www.youtube.com/results?search_query=%E3%83%86%E3%82%99%E3%82%B9%E3%82%B3%E3%82%AD%E3%83%83%E3%83%89%E3%82%99+%E5%90%B9%E5%A5%8F%E6%A5%BD+%E4%BD%8E%E4%B8%8B", description: "元祖・課題曲名演音源" },
      { title: "シエナ・ウインド・オーケストラ 観客一体型ライブ", url: "https://www.youtube.com/results?search_query=%E3%83%86%E3%82%99%E3%82%B9%E3%82%B3%E3%82%AD%E3%83%83%E3%83%89%E3%82%99+%E3%82%B7%E3%82%A8%E3%83%8A", description: "アンコールでの盛り上がり方参考" }
    ]
  },
  {
    id: "rep-12",
    section: "Enc",
    no: "2",
    title: "76本のトロンボーン (Seventy Six Trombones)",
    composer: "M.ウィルソン / Arr. 岩井直溥",
    conductor: "未定",
    points: `【トロンボーンセクションフィーチャー & マーチ】
・トロンボーンパート前列進行・グリッサンドの華やかさ。
・堂々とした行進曲のテンポ感 (♩=120) をキープ。`,
    videos: [
      { title: "76本のトロンボーン (岩井直溥編 NSB名演)", url: "https://www.youtube.com/results?search_query=76%E6%9C%AC%E3%81%AE%E3%83%88%E3%83%AD%E3%83%B3%E3%83%9C%E3%83%BC%E3%83%B3+%E5%90%B9%E5%A5%8F%E6%A5%BD+%E5%B2%A9%E4%BA%95%E7%9B%B4%E6%B5%A6", description: "トロンボーンフィーチャー名演" },
      { title: "海外一流吹奏楽団 演奏会フィナーレ", url: "https://www.youtube.com/results?search_query=Seventy+Six+Trombones+wind+band", description: "マーチのノリとグリッサンド参考" }
    ]
  }
];

// 初期練習スケジュール (8月・9月の通常練習 & 長時間練習)
export const INITIAL_PRACTICE_DATA = [
  {
    id: "p-20260802",
    date: "2026-08-02",
    title: "通常練習",
    category: "合奏",
    locationName: "日章福祉交流センター 会議室①",
    locationAddress: "高知県南国市日章",
    conductors: "公文 先生 / 下川 先生",
    pieces: [],
    timetable: [
      { startTime: "18:00", endTime: "19:00", category: "個人練習", title: "音出し・チューニング", details: "個人準備・ウォームアップ" },
      { startTime: "19:00", endTime: "21:00", category: "合奏", title: "全体合奏 (曲目調整中)", details: "合奏" }
    ],
    generalNotes: "18:00〜21:00 日章福祉交流センター 会議室①"
  },
  {
    id: "p-20260808",
    date: "2026-08-08",
    title: "通常練習 (※よさこい被り)",
    category: "合奏",
    locationName: "日章福祉交流センター 会議室①",
    locationAddress: "高知県南国市日章",
    conductors: "公文 先生 / 下川 先生",
    pieces: [],
    timetable: [
      { startTime: "18:00", endTime: "21:00", category: "合奏", title: "夜間練習", details: "※よさこい祭りと日程重複のため移動注意" }
    ],
    generalNotes: "よさこい祭り期間中のため、交通混雑にご注意ください。"
  },
  {
    id: "p-20260816",
    date: "2026-08-16",
    title: "通常練習 (16:00〜)",
    category: "合奏",
    locationName: "日章福祉交流センター 会議室①",
    locationAddress: "高知県南国市日章",
    conductors: "公文 先生 / 下川 先生",
    pieces: [],
    timetable: [
      { startTime: "16:00", endTime: "18:00", category: "パート練習", title: "セクション練習", details: "木管・金管分奏" },
      { startTime: "18:00", endTime: "21:00", category: "合奏", title: "全体合奏", details: "16:00開始ですのでご注意ください" }
    ],
    generalNotes: "16:00開始（通常と開始時間が異なります）"
  },
  {
    id: "p-20260822",
    date: "2026-08-22",
    title: "❌ 練習なし (お休み)",
    category: "その他",
    locationName: "-",
    locationAddress: "",
    conductors: "-",
    pieces: [],
    timetable: [],
    generalNotes: "8月22日は練習はありません。"
  },
  {
    id: "p-20260823",
    date: "2026-08-23",
    title: "通常練習",
    category: "合奏",
    locationName: "日章福祉交流センター 会議室①",
    locationAddress: "高知県南国市日章",
    conductors: "公文 先生 / 下川 先生",
    pieces: [],
    timetable: [
      { startTime: "18:00", endTime: "21:00", category: "合奏", title: "夜間通常合奏", details: "第1部・第2部曲目の返し合奏" }
    ],
    generalNotes: "18:00〜21:00"
  },
  {
    id: "p-20260829",
    date: "2026-08-29",
    title: "🔥 長時間集中練習 (天然色劇場)",
    category: "合奏",
    locationName: "天然色劇場",
    locationAddress: "高知県香南市吉川町吉原1843-1",
    conductors: "公文 先生 / 下川 先生",
    pieces: [],
    timetable: [
      { startTime: "12:00", endTime: "13:00", category: "個人練習", title: "搬入・個人ウォームアップ", details: "大型打楽器・譜面台セッティング" },
      { startTime: "13:00", endTime: "17:00", category: "パート練習", title: "昼間セクション・パート集中練習", details: "音量・響きの確認" },
      { startTime: "17:00", endTime: "18:00", category: "休憩", title: "夕食・休憩", details: "各自持参または周辺にて" },
      { startTime: "18:00", endTime: "22:00", category: "合奏", title: "夜間全体強化合奏", details: "22:00終了・片付け" }
    ],
    generalNotes: "長時間練習 12:00〜22:00 (天然色劇場) 水分補給を十分に準備してください。"
  },
  {
    id: "p-20260830",
    date: "2026-08-30",
    title: "🔥 長時間集中練習 (天然色劇場)",
    category: "合奏",
    locationName: "天然色劇場",
    locationAddress: "高知県香南市吉川町吉原1843-1",
    conductors: "公文 先生 / 下川 先生",
    pieces: [],
    timetable: [
      { startTime: "09:00", endTime: "12:00", category: "合奏", title: "午前全体合奏", details: "第1部通し" },
      { startTime: "12:00", endTime: "13:00", category: "休憩", title: "昼食休憩", details: "" },
      { startTime: "13:00", endTime: "17:00", category: "合奏", title: "午後通し合奏 & メイン曲仕上げ", details: "17:00 完全撤収" }
    ],
    generalNotes: "09:00〜17:00 (天然色劇場)"
  },
  {
    id: "p-20260905",
    date: "2026-09-05",
    title: "🔥 長時間集中練習 (富家コミュニティ)",
    category: "合奏",
    locationName: "富家防災コミュニティセンター",
    locationAddress: "高知県香南市野市町富家",
    conductors: "公文 先生 / 下川 先生",
    pieces: [],
    timetable: [
      { startTime: "12:00", endTime: "22:00", category: "合奏", title: "長時間集中リハーサル", details: "12:00〜22:00" }
    ],
    generalNotes: "12:00〜22:00 場所: 富家防災コミュニティセンター"
  },
  {
    id: "p-20260906",
    date: "2026-09-06",
    title: "🔥 長時間集中練習 (富家コミュニティ)",
    category: "合奏",
    locationName: "富家防災コミュニティセンター",
    locationAddress: "高知県香南市野市町富家",
    conductors: "公文 先生 / 下川 先生",
    pieces: [],
    timetable: [
      { startTime: "08:30", endTime: "17:00", category: "合奏", title: "朝一開始リハーサル", details: "08:30集合・セッティング" }
    ],
    generalNotes: "08:30〜17:00 (8時半開始ですので早めの準備をお願いします)"
  },
  {
    id: "p-20260912",
    date: "2026-09-12",
    title: "🔥 長時間集中練習 (天然色劇場)",
    category: "合奏",
    locationName: "天然色劇場",
    locationAddress: "高知県香南市吉川町吉原1843-1",
    conductors: "公文 先生 / 下川 先生",
    pieces: [],
    timetable: [
      { startTime: "12:00", endTime: "22:00", category: "合奏", title: "本番直前全体リハーサル", details: "12:00〜22:00" }
    ],
    generalNotes: "12:00〜22:00 場所: 天然色劇場"
  },
  {
    id: "p-20260913",
    date: "2026-09-13",
    title: "🔥 最終総仕上げリハーサル",
    category: "合奏",
    locationName: "富家防災コミュニティセンター",
    locationAddress: "高知県香南市野市町富家",
    conductors: "公文 先生 / 下川 先生",
    pieces: [],
    timetable: [
      { startTime: "09:00", endTime: "17:00", category: "合奏", title: "全曲最終通しリハーサル", details: "09:00〜17:00" }
    ],
    generalNotes: "09:00〜17:00 場所: 富家防災コミュニティセンター"
  }
];
