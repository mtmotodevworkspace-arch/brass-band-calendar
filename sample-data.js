/**
 * 吹奏楽練習カレンダー 演奏曲目ライブラリ & 8月・9月練習スケジュール (「先生」排除・公文 / 下川表記完全統一版)
 * タイムスケジュール (時間軸明示型) 対応拡張データモデル
 */

// 演奏曲目マスターライブラリ (全12曲)
export const MASTER_REPERTOIRE = [
  {
    id: "rep-1",
    section: "第1部",
    no: "OP",
    title: "青少年のための管弦楽入門",
    composer: "B.ブリテン / Arr. 坂井貴祐",
    conductor: "公文",
    points: `【冒頭のテーマと変奏の表現】・パーセル主題の金管・木管・打楽器それぞれの音色対比をくっきり表現。 ・[フーガ部] 各パートのアインザッツは音量を控えめに、テーマの引き継ぎをリレーのように美しく。 ・トロンボーン・チューバ低音パート：クレッシェンドの打点とアタックを揃えること。`,
    videos: [
      { title: "オーケストラ（原曲）版", url: "https://www.youtube.com/results?search_query=The+Young+Person%27s+Guide+to+the+Orchestra+Britten", description: "オーケストラ原曲スコア音源" },
      { title: "吹奏楽版&スコア", url: "https://www.youtube.com/results?search_query=%E9%9D%92%E5%B0%91%E5%B9%B4%E3%81%AE%E3%81%9F%E3%82%81%E3%81%AE%E7%AE%A1%E5%BC%A6%E6%A5%BD%E5%85%A5%E9%96%80+%E5%90%B9%E5%A5%8F%E6%A5%BD", description: "プロ吹奏楽団・名門バンドによるテーマ＆フーガ名演" }
    ]
  },
  {
    id: "rep-2",
    section: "第1部",
    no: "2",
    title: "おジャ魔女カーニバル!!",
    composer: "MAHO堂 / Arr. 吹奏楽版",
    conductor: "公文",
    points: `【ポップスならではのアッパー感とドライブ感】・冒頭のファンファーレ：ハイトーンのピッチとアタックをキレ良く！ ・サビのバックグラウンド（トロンボーン・サックスのリフ）：裏拍のアクセントをタメすぎずに跳ねる。 ・木管16分音符のオブリガート：指回しを滑らかに、音量を殺さずクリアに。`,
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
    conductor: "下川",
    points: `【ディズニーの表情豊かな世界観の表現】・Under the Sea：カリプソ・スチールドラム風の軽やかなパーカッションビート。 ・Part of Your World：木管ソロの歌い込みとホルンの包み込むようなハーモニー。 ・Kiss the Girl：ミディアムテンポのアンサンブル。`,
    videos: [
      { title: "リトル・マーメイド・メドレー (星出尚志編) 東京佼成WO", url: "https://www.youtube.com/results?search_query=%E3%83%AA%E3%83%88%E3%83%AB%E3%83%9E%E3%83%BC%E3%83%A1%E3%82%A4%E3%83%89%E3%83%A1%E3%83%89%E3%83%AC%E3%83%BC+%E5%90%B9%E5%A5%8F%E6%A5%BD+%E6%98%9F%E5%87%BA%E5%B0%9A%E5%BF%97", description: "New Sounds in Brass 公式模範演奏" },
      { title: "演奏会ライブステージ映像", url: "https://www.youtube.com/results?search_query=%E3%83%AA%E3%83%88%E3%83%AB%E3%83%9E%E3%83%BC%E3%83%A1%E3%82%A4%E3%83%89%E3%83%A1%E3%83%89%E3%83%AC%E3%83%BC+%E5%90%B9%E5%A5%8F%E6%A5%BD+%E3%83%A9%E3%82%A4%E3%83%99", description: "ダイナミクスとテンポチェンジの参考" }
    ]
  },
  {
    id: "rep-4",
    section: "第1部",
    no: "4",
    title: "好きすぎて滅！",
    composer: "Arr. 吹奏楽ポップス",
    conductor: "下川",
    points: `【キャッチーなメロディとノリの良さ】・リズムセクション（ベース・ドラム）の縦の線をビシッと合わせる。 ・サビでの管楽器全員のフォルテシモ：音が割れないよう美しいブラスサウンドを意識。`,
    videos: [
      { title: "好きすぎて滅！ 吹奏楽アレンジ名演", url: "https://www.youtube.com/results?search_query=%E5%A5%BD%E3%81%8D%E3%81%99%E3%81%8E%E3%81%A6%E6%BB%85+%E5%90%B9%E5%A5%8F%E6%A5%BD", description: "ノリとサウンドバランスの参考" }
    ]
  },
  {
    id: "rep-5",
    section: "第2部",
    no: "1",
    title: "21世紀のスキッツォイドマン",
    composer: "R.フリップ / Arr. 三浦秀秋",
    conductor: "公文",
    points: `【プログレ・ブラスの重厚なリフと変拍子】・冒頭のユニゾンリフ：歪みを感じさせる重厚な金管とアルトサックスの咆哮。 ・中間部の高速変拍子セクション：カウントを全員で共有。 ・ドラムソロ〜ラスト：カタルシスに向けたダイナミックなクレッシェンド。`,
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
    conductor: "下川",
    points: `【美しい歌（Cantabile）の表現】・メロディパートのブレスコントロールとアゴギク。 ・ハーモニーパート：純正律を意識した美しいピッチ合わせ。`,
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
    conductor: "公文",
    points: `【トランペットソロ＆EDMスタイルのフェス感】・トランペットソロ：圧倒的な存在感とハイノートの輝き！ ・重低音セクション：EDMのドロップのような重低音ビート。`,
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
    conductor: "公文",
    points: `【会場一体となる輝かしいサンバサウンド】・イントロの華やかな金管ファンファーレ。 ・サンバパーカッション：本場のラテンリズムを徹底。 ・「オレ！」のかけ声の全団員の一致。`,
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
    composer: "大野雄二 / Arr. 星出尚志",
    conductor: "公文",
    points: `【ジャジーなスタイルとスリリングな展開】・ソロ回し：ジャズのニュアンスと音色。 ・ブラスのシャウト：音圧を保ちつつクールな音切り。`,
    videos: [
      { title: "ルパン三世のテーマ (NSB星出尚志編) 佼成WO", url: "https://www.youtube.com/results?search_query=%E3%83%AB%E3%83%91%E3%83%B3%E4%B8%89%E4%B8%96%E3%81%AE%E3%83%86%E3%83%BC%E3%83%9E+%E5%90%B9%E5%A5%8F%E6%A5%BD+%E6%98%9F%E5%87%BA%E5%B0%9A%E5%BF%97", description: "王道ジャズブラスの模範演奏" }
    ]
  },
  {
    id: "rep-10",
    section: "第2部",
    no: "6",
    title: "海の男たちの歌 (Songs of Sailor and Sea)",
    composer: "R.W.スミス",
    conductor: "公文",
    points: `【吹奏楽オリジナルの壮大なダイナミクスとドラマ】・冒頭の嵐のプレリュード：打楽器群と低音の強烈なアタック。 ・中間部「WHALE SONG」：クジラの鳴き声を模したチューバ・ユーフォ・弦バスの特殊奏法。 ・壮大なフィナーレ：海原の広がりを表現するスケールの大きな金管コラール。`,
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
    conductor: "公文",
    points: `【吹奏楽課題曲の永遠の名曲】・スネアドラムのディスコビートと全体の手拍子。 ・中間部のアルトサックス・ソロのアンニュイなメロディ。`,
    videos: [
      { title: "ディスコ・キッド 課題曲名演 (東京佼成WO)", url: "https://www.youtube.com/results?search_query=%E3%83%86%E3%82%99%E3%82%B9%E3%82%B3%E3%82%AD%E3%83%83%E3%83%89%E3%82%99+%E5%90%B9%E5%A5%8F%E6%A5%BD", description: "元祖・課題曲名演音源" }
    ]
  },
  {
    id: "rep-12",
    section: "Enc",
    no: "2",
    title: "76本のトロンボーン",
    composer: "M.ウィルソン / Arr. 岩井直溥",
    conductor: "未定",
    points: `【トロンボーンセクションフィーチャー & マーチ】・トロンボーンパート前列進行・グリッサンドの華やかさ。 ・堂々とした行進曲のテンポ感。`,
    videos: [
      { title: "76本のトロンボーン (岩井直溥編 NSB名演)", url: "https://www.youtube.com/results?search_query=76%E6%9C%AC%E3%81%AE%E3%83%88%E3%83%AD%E3%83%B3%E3%83%9C%E3%83%BC%E3%83%B3+%E5%90%B9%E5%A5%8F%E6%A5%BD+%E5%B2%A9%E4%BA%95%E7%9B%B4%E6%B5%A6", description: "トロンボーンフィーチャー名演" }
    ]
  }
];

// 初期練習スケジュール (8月・9月の通常練習 & 長時間練習 - タイムスケジュール時間軸明示対応)
export const INITIAL_PRACTICE_DATA = [
  {
    id: "p-20260802",
    date: "2026-08-02",
    title: "通常練習 (18:00〜21:00)",
    category: "合奏",
    locationName: "日章福祉交流センター 会議室①",
    locationAddress: "高知県南国市日章",
    conductors: "公文",
    pieces: [
      { title: "青少年のための管弦楽入門", conductor: "公文" },
      { title: "海の男たちの歌 (Songs of Sailor and Sea)", conductor: "公文" }
    ],
    timetable: [
      {
        startTime: "18:00",
        endTime: "19:00",
        category: "個人練習",
        title: "個人音出し・チューニング",
        conductor: "各自",
        pieceIds: ["rep-1"],
        customPiece: "基礎練習・Long Tone",
        youtubeUrl: "https://www.youtube.com/results?search_query=The+Young+Person%27s+Guide+to+the+Orchestra+Britten",
        message: "18:00開場です。各自ウォームアップと音出しを済ませてください。"
      },
      {
        startTime: "19:00",
        endTime: "21:00",
        category: "合奏",
        title: "第1部OP & 第2部メイン返し合奏",
        conductor: "公文",
        pieceIds: ["rep-1", "rep-10"],
        customPiece: "",
        youtubeUrl: "",
        message: "パーセル主題の金管・木管ハーモニーと海の男たちの歌のコラールを中心に合わせます。"
      }
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
    conductors: "公文",
    pieces: [
      { title: "おジャ魔女カーニバル!!", conductor: "公文" },
      { title: "マツケンサンバⅡ", conductor: "公文" }
    ],
    timetable: [
      {
        startTime: "18:00",
        endTime: "19:00",
        category: "パート練習",
        title: "ポップスノリ・リフ集中パート分奏",
        conductor: "公文",
        pieceIds: ["rep-2", "rep-8"],
        customPiece: "真島俊夫ラテンパーカッション打ち合わせ",
        youtubeUrl: "https://www.youtube.com/results?search_query=%E3%83%9E%E3%83%84%E3%82%B1%E3%83%B3%E3%82%B5%E3%83%B3%E3%83%902+%E5%90%B9%E5%A5%8F%E6%A5%BD",
        message: "※よさこい祭り開催中のため道路混雑が予想されます。時間に余裕をもってお越しください。"
      },
      {
        startTime: "19:00",
        endTime: "21:00",
        category: "合奏",
        title: "ポップスプログラム全体合奏",
        conductor: "公文",
        pieceIds: ["rep-2", "rep-8"],
        customPiece: "",
        youtubeUrl: "",
        message: "かけ声とサンバリズムの一致を徹底します！"
      }
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
    conductors: "公文",
    pieces: [
      { title: "青少年のための管弦楽入門", conductor: "公文" },
      { title: "海の男たちの歌 (Songs of Sailor and Sea)", conductor: "公文" }
    ],
    timetable: [
      {
        startTime: "16:00",
        endTime: "18:00",
        category: "パート練習",
        title: "木管・金管セクション分奏",
        conductor: "公文",
        pieceIds: ["rep-1", "rep-10"],
        customPiece: "ブリテン・フーガリレーパート練習",
        youtubeUrl: "",
        message: "※16:00開始ですので、開始時間にお気をつけください。"
      },
      {
        startTime: "18:00",
        endTime: "21:00",
        category: "合奏",
        title: "全体合奏",
        conductor: "公文",
        pieceIds: ["rep-1", "rep-10"],
        customPiece: "",
        youtubeUrl: "",
        message: ""
      }
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
    conductors: "公文 / 下川",
    pieces: [
      { title: "リトル・マーメイド・メドレー", conductor: "下川" },
      { title: "ルパン三世のテーマ", conductor: "公文" }
    ],
    timetable: [
      {
        startTime: "18:00",
        endTime: "19:30",
        category: "合奏",
        title: "ディズニーメドレー合奏",
        conductor: "下川",
        pieceIds: ["rep-3"],
        customPiece: "",
        youtubeUrl: "https://www.youtube.com/results?search_query=%E3%83%AA%E3%83%88%E3%83%AB%E3%83%9E%E3%83%BC%E3%83%A1%E3%82%A4%E3%83%89%E3%83%A1%E3%83%89%E3%83%AC%E3%83%BC+%E5%90%B9%E5%A5%8F%E6%A5%BD",
        message: "星出尚志アレンジのディズニー世界観を歌い込みます。"
      },
      {
        startTime: "19:30",
        endTime: "21:00",
        category: "合奏",
        title: "ジャズブラス合奏",
        conductor: "公文",
        pieceIds: ["rep-9"],
        customPiece: "",
        youtubeUrl: "",
        message: ""
      }
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
    conductors: "公文 / 下川",
    pieces: [
      { title: "21世紀のスキッツォイドマン", conductor: "公文" },
      { title: "Narco", conductor: "公文" },
      { title: "ディスコ・キッド", conductor: "公文" }
    ],
    timetable: [
      {
        startTime: "12:00",
        endTime: "13:00",
        category: "個人練習",
        title: "搬入・大型打楽器セッティング・ウォームアップ",
        conductor: "各自",
        pieceIds: [],
        customPiece: "打楽器セッティング",
        youtubeUrl: "",
        message: "大型楽器の搬入にご協力をお願いいたします。"
      },
      {
        startTime: "13:00",
        endTime: "17:00",
        category: "パート練習",
        title: "昼間プログレ・変拍子セクション集中練習",
        conductor: "公文",
        pieceIds: ["rep-5", "rep-7"],
        customPiece: "高速変拍子カウント合わせ",
        youtubeUrl: "https://www.youtube.com/results?search_query=21%E4%B8%96%E7%B4%80%E3%81%AE%E3%82%B9%E3%82%AD%E3%83%83%E3%83%84%E3%82%A9%E3%82%A4%E3%83%89%E3%83%9E%E3%83%B3+%E5%90%B9%E5%A5%8F%E6%A5%BD",
        message: "変拍子のタテの刻みをパート毎にしっかり共有。"
      },
      {
        startTime: "17:00",
        endTime: "18:00",
        category: "その他",
        title: "夕食・休憩時間",
        conductor: "-",
        pieceIds: [],
        customPiece: "",
        youtubeUrl: "",
        message: "各自持参の夕食または周辺店舗をご利用ください。"
      },
      {
        startTime: "18:00",
        endTime: "22:00",
        category: "合奏",
        title: "夜間全体強化合奏 & ディスコキッド",
        conductor: "公文",
        pieceIds: ["rep-5", "rep-7", "rep-11"],
        customPiece: "アンコールディスコ手拍子合わせ",
        youtubeUrl: "",
        message: "22:00完全撤収となります。"
      }
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
    conductors: "公文 / 下川",
    pieces: [
      { title: "青少年のための管弦楽入門", conductor: "公文" },
      { title: "海の男たちの歌 (Songs of Sailor and Sea)", conductor: "公文" },
      { title: "76本のトロンボーン", conductor: "未定" }
    ],
    timetable: [
      {
        startTime: "09:00",
        endTime: "12:00",
        category: "合奏",
        title: "午前全体合奏 (第1部プログラム通し)",
        conductor: "公文",
        pieceIds: ["rep-1"],
        customPiece: "",
        youtubeUrl: "",
        message: "09:00音出し開始です。"
      },
      {
        startTime: "12:00",
        endTime: "13:00",
        category: "その他",
        title: "昼食休憩",
        conductor: "-",
        pieceIds: [],
        customPiece: "",
        youtubeUrl: "",
        message: ""
      },
      {
        startTime: "13:00",
        endTime: "17:00",
        category: "合奏",
        title: "午後メイン曲仕上げ & トロンボーンフィーチャー",
        conductor: "公文 / 下川",
        pieceIds: ["rep-10", "rep-12"],
        customPiece: "76本トロンボーン前列進行練習",
        youtubeUrl: "",
        message: "17:00片付け・撤収"
      }
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
    conductors: "公文 / 下川",
    pieces: [
      { title: "カンタービレ・コレクション", conductor: "下川" },
      { title: "好きすぎて滅！", conductor: "下川" }
    ],
    timetable: [
      {
        startTime: "12:00",
        endTime: "22:00",
        category: "合奏",
        title: "下川指揮 企画プログラム集中合奏",
        conductor: "下川",
        pieceIds: ["rep-4", "rep-6"],
        customPiece: "",
        youtubeUrl: "",
        message: "富家防災コミュニティセンターにて12時〜22時"
      }
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
    conductors: "公文 / 下川",
    pieces: [
      { title: "おジャ魔女カーニバル!!", conductor: "公文" },
      { title: "マツケンサンバⅡ", conductor: "公文" }
    ],
    timetable: [
      {
        startTime: "08:30",
        endTime: "17:00",
        category: "合奏",
        title: "早朝リハーサル & 全体ポップス仕上げ",
        conductor: "公文",
        pieceIds: ["rep-2", "rep-8"],
        customPiece: "",
        youtubeUrl: "",
        message: "08:30集合となりますので早めの準備をお願いいたします。"
      }
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
    conductors: "公文 / 下川",
    pieces: [
      { title: "青少年のための管弦楽入門", conductor: "公文" },
      { title: "海の男たちの歌 (Songs of Sailor and Sea)", conductor: "公文" },
      { title: "マツケンサンバⅡ", conductor: "公文" }
    ],
    timetable: [
      {
        startTime: "12:00",
        endTime: "22:00",
        category: "合奏",
        title: "本番直前全曲リハーサル",
        conductor: "公文 / 下川",
        pieceIds: ["rep-1", "rep-8", "rep-10"],
        customPiece: "",
        youtubeUrl: "",
        message: "本番直前につき全曲の演出・並び順確認を行います。"
      }
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
    conductors: "公文 / 下川",
    pieces: [
      { title: "全プログラム12曲", conductor: "公文 / 下川" }
    ],
    timetable: [
      {
        startTime: "09:00",
        endTime: "17:00",
        category: "合奏",
        title: "全12曲最終ランスルー (総仕上げ)",
        conductor: "公文 / 下川",
        pieceIds: ["rep-1", "rep-2", "rep-3", "rep-4", "rep-5", "rep-6", "rep-7", "rep-8", "rep-9", "rep-10", "rep-11", "rep-12"],
        customPiece: "アンコール2曲含め全曲通し",
        youtubeUrl: "",
        message: "最終リハーサルです。楽譜・手拍子・かけ声の最終確認を揃えます。"
      }
    ],
    generalNotes: "09:00〜17:00 場所: 富家防災コミュニティセンター"
  }
];
