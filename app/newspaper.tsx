import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, Alert, Share, Clipboard, SafeAreaView, ActivityIndicator, Linking, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Video, ResizeMode, Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';

interface HistoryItem {
  id: string;
  date: string;
  imageUri: string;
  imageBase64?: string;
  feelings: string;
  story: string;
  manga_prompt?: string;
  generatedImageBase64?: string;
  generatedImageUrl?: string;
  video_prompt?: string;
}



const authorImages: { [key: string]: any } = {
  socrates: require('../assets/manga_socrates.png'),
  magritte: require('../assets/manga_magritte.png'),
  elizabeth: require('../assets/manga_elizabeth.png'),
};

export default function NewspaperScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // VOICEVOX 音声読み上げ関連State
  const [playingSection, setPlayingSection] = useState<'article' | 'column' | null>(null);
  const [ttsLoading, setTtsLoading] = useState<boolean>(false);
  const [isHfWaking, setIsHfWaking] = useState<boolean>(false); // クラウド起動待ち State
  const [soundInstance, setSoundInstance] = useState<Audio.Sound | null>(null);
  const [voicevoxUrl, setVoicevoxUrl] = useState('');
  const [voicevoxApiKey, setVoicevoxApiKey] = useState(''); // APIキー
  const [isVoicevoxReady, setIsVoicevoxReady] = useState<boolean>(false); // ウォームアップ完了フラグ

  // APIキーヘッダーを生成するヘルパー
  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (voicevoxApiKey.trim()) {
      headers['X-API-Key'] = voicevoxApiKey.trim();
    }
    return headers;
  };

  useEffect(() => {
    async function loadVoicevoxSettings() {
      const url = await AsyncStorage.getItem('voicevox_api_url');
      if (url) {
        setVoicevoxUrl(url);
      }
      const key = await AsyncStorage.getItem('voicevox_api_key');
      if (key) {
        setVoicevoxApiKey(key);
      }

      // バックグラウンドウォームアップ: クラウドサーバーのスリープ解除を事前にトリガー
      if (url && url.includes('hf.space')) {
        try {
          const headers: Record<string, string> = {};
          if (key) headers['X-API-Key'] = key;
          const warmupRes = await fetch(`${url}/health`, { headers });
          if (warmupRes.ok) {
            setIsVoicevoxReady(true);
          }
        } catch (e) {
          // ウォームアップ失敗は無視（ユーザーが朝読ボタンを押したときに待機する）
          console.log('VOICEVOX warmup: サーバーがまだ起動中かもしれません');
        }
      } else if (url) {
        setIsVoicevoxReady(true); // ローカルは常時Ready扱い
      }
    }
    loadVoicevoxSettings();
  }, []);

  useEffect(() => {
    return () => {
      if (soundInstance) {
        soundInstance.unloadAsync().catch(() => {});
      }
    };
  }, [soundInstance]);

  // 再生の停止
  const stopPlayback = async () => {
    if (soundInstance) {
      try {
        await soundInstance.stopAsync();
        await soundInstance.unloadAsync();
      } catch (e) {
        console.warn('音声を停止できませんでした:', e);
      }
      setSoundInstance(null);
    }
    setPlayingSection(null);
  };

  // 音声合成と再生
  const handleReadAloud = async (section: 'article' | 'column', text: string) => {
    if (playingSection === section) {
      await stopPlayback();
      return;
    }

    await stopPlayback();

    const trimmedUrl = voicevoxUrl.trim();
    if (!trimmedUrl) {
      Alert.alert('エラー', 'VOICEVOXの接続URLが設定されていません。アルバム画面の「声設定」から設定を行ってください🐾');
      return;
    }

    setTtsLoading(true);
    setPlayingSection(section);
    const isHuggingFace = trimmedUrl.includes('hf.space');
    if (isHuggingFace) {
      setIsHfWaking(true);
    }

    try {
      let speakerId = 2;
      let speed = 1.0;
      let pitch = 0.0;
      let intonation = 1.0;
      let textToRead = text;

      if (section === 'article') {
        // メイン記事（キャスターボイス：うちのコとは別、かつキャスターに最適な声）
        const userSpeakerId = profile?.voice_settings?.speaker_id || (profile?.gender === '女の子' ? 2 : 12);
        
        // デフォルトは四国めたん（ID 2）。もしうちのコがめたんなら青山龍星（ID 13）にする。
        speakerId = (userSpeakerId === 2) ? 13 : 2;
        
        speed = 1.05; // キャスターらしく少しハキハキ
        pitch = 0.05;
        intonation = 1.2; // イントネーションを明瞭にして人間らしく
      } else {
        // 社説コラム（著者別ボイス、ソクラテスのみ男性、他は女性）
        const authorId = columnAuthorAssetDisplay; // 'socrates', 'magritte', 'elizabeth'
        if (authorId === 'socrates') {
          speakerId = 11; // 玄野武宏 (男性)
          speed = 0.95; // 哲学者は少しゆっくり
          pitch = -0.05; // 低め
        } else if (authorId === 'magritte') {
          speakerId = 10; // 雨晴はう (女性)
          speed = 1.1; // 敏腕記者はてきぱき
          pitch = 0.02;
        } else if (authorId === 'elizabeth') {
          speakerId = 8; // 春日部つむぎ (女性)
          speed = 1.05; // 編集長はハキハキ
          pitch = 0.05;
        }
        intonation = 1.15; // コラムも少し抑揚を高めに
      }

      // ひらがな前処理は廃止し、漢字交じりテキストに簡易置換を適用
      textToRead = textToRead.replace(/うちのコ/g, 'うちのこ').replace(/\n/g, ' ');

      // VOICEVOX API呼び出し (audio_query)
      const queryUrl = `${trimmedUrl}/audio_query?text=${encodeURIComponent(textToRead)}&speaker=${speakerId}`;
      const controller = new AbortController();
      const queryTimeout = isHuggingFace ? 90000 : 10000;
      const timeoutId = setTimeout(() => controller.abort(), queryTimeout);

      const queryRes = await fetch(queryUrl, { 
        method: 'POST',
        signal: controller.signal,
        headers: getAuthHeaders()
      });
      clearTimeout(timeoutId);

      if (!queryRes.ok) {
        throw new Error('音声クエリの生成に失敗しました。接続先URLまたはPCのVOICEVOX起動状態をご確認ください。');
      }

      const queryJson = await queryRes.json();
      queryJson.speedScale = speed;
      queryJson.pitchScale = pitch;
      queryJson.intonationScale = intonation;

      // 音声合成 (synthesis)
      const synthesisUrl = `${trimmedUrl}/synthesis?speaker=${speakerId}`;
      const synthController = new AbortController();
      const synthTimeout = isHuggingFace ? 90000 : 20000;
      const synthTimeoutId = setTimeout(() => synthController.abort(), synthTimeout);

      const synthRes = await fetch(synthesisUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(queryJson),
        signal: synthController.signal
      });
      clearTimeout(synthTimeoutId);

      if (!synthRes.ok) {
        throw new Error('音声合成に失敗しました。');
      }

      const blob = await synthRes.blob();
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = () => reject(new Error('エンコード失敗'));
        reader.readAsDataURL(blob);
      });

      const soundUri = `data:audio/wav;base64,${base64Data}`;
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: soundUri },
        { shouldPlay: true }
      );
      setSoundInstance(sound);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          setPlayingSection(null);
          setSoundInstance(null);
        }
      });

    } catch (err: any) {
      console.warn(err);
      const msg = err.name === 'AbortError'
        ? '接続がタイムアウトしました。クラウドサーバーの起動中か、PCのVOICEVOXが起動しているか確認してください🐾'
        : (err.message || '再生に失敗しました🐾');
      Alert.alert('朗読再生エラー', msg);
      setPlayingSection(null);
    } finally {
      setTtsLoading(false);
      setIsHfWaking(false);
    }
  };

  // AI日常新聞用State
  const [newspaperData, setNewspaperData] = useState<any>(null);
  const [proxyUrl, setProxyUrl] = useState('https://script.google.com/macros/s/AKfycby_yneEPDfmGGpGrZwCgEWt3KIQxZ_5V5LgX_8z9ItloS_Pg0p-SxsAqBW0OFdWa_WFog/exec');
  const [mockMode, setMockMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true); // 常に動画ロードから開始！

  const getVideoPrompt = (item: HistoryItem): string => {
    if (item.video_prompt) return item.video_prompt;

    // storyやfeelingsからキーワードを抽出してフォールバックプロンプトを作成する
    const name = profile?.name || 'my pet';
    const breed = profile?.breed || profile?.pet_type || 'dog';
    const color = profile?.color || '';
    
    // キーワード抽出
    let action = 'sitting and looking at the camera with warm big sparkling eyes';
    const storyText = item.story || '';
    if (storyText.includes('走') || storyText.includes('かけっこ')) {
      action = 'running happily in the soft green field, wagging its tail';
    } else if (storyText.includes('遊') || storyText.includes('おもちゃ')) {
      action = 'playing enthusiastically with a colorful pet toy, showing deep excitement';
    } else if (storyText.includes('寝') || storyText.includes('眠') || storyText.includes('スヤスヤ')) {
      action = 'sleeping peacefully on a soft cozy pet bed, breathing slowly and softly';
    } else if (storyText.includes('食べ') || storyText.includes('おやつ') || storyText.includes('おいしい')) {
      action = 'eating delicious pet treats happily, licking its nose with excitement';
    } else if (storyText.includes('甘え') || storyText.includes('抱っこ')) {
      action = 'snuggling closely to the camera, asking for gentle scratches behind ears';
    } else if (storyText.includes('外') || storyText.includes('散歩') || storyText.includes('公園')) {
      action = 'walking happily in a beautiful sun-drenched park during spring';
    }

    return `A heartwarming highly detailed cinematic 3D/realistic video of a lovely ${color} ${breed} named ${name}. The pet is ${action} in a beautiful warm cozy room. Slow zoom in, warm cinematic lighting, soft sunbeams filtering through the window, extremely natural pet motion, lifelike details, 4k resolution.`;
  };

  useEffect(() => {
    async function loadData() {
      try {
        const savedProfileRaw = await AsyncStorage.getItem('pet_profile');
        let parsedProfile = null;
        if (savedProfileRaw) {
          parsedProfile = JSON.parse(savedProfileRaw);
          setProfile(parsedProfile);
        }

        const savedHistoryRaw = await AsyncStorage.getItem('pet_history_items');
        let parsedHistory: HistoryItem[] = [];
        if (savedHistoryRaw) {
          parsedHistory = JSON.parse(savedHistoryRaw);
          setHistoryList(parsedHistory);
        }

        const savedMockMode = await AsyncStorage.getItem('mock_mode');
        let isMock = false;
        if (savedMockMode) {
          isMock = savedMockMode === 'true';
          setMockMode(isMock);
        }

        const savedNewspaper = await AsyncStorage.getItem('generated_newspaper');
        let parsedNewspaper = null;
        if (savedNewspaper) {
          parsedNewspaper = JSON.parse(savedNewspaper);
          setNewspaperData(parsedNewspaper);
        }

        // ロード完了後に自動一括生成を判定・トリガー (確実にawaitで完了を待つ！)
        if (parsedHistory && parsedHistory.length > 0 && parsedProfile) {
          await triggerAutoGeneration(parsedProfile, parsedHistory, isMock, parsedNewspaper);
        } else {
          setIsGenerating(false); // 履歴がない場合は即時解除して創刊号表示
        }
      } catch (e) {
        console.error(e);
        setIsGenerating(false);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // サイレント新聞テキスト生成
  const generateNewspaperTextSilent = async (
    currentProfile: any, 
    currentHistory: HistoryItem[], 
    isMock: boolean
  ): Promise<any> => {
    // 3つのユニークなコラムニストキャラクターの定義
    const authors = [
      {
        id: 'socrates',
        name: 'ソクラテス',
        title: '犬の哲学者（ボーダーコリー）',
        catchphrase: '「しかし、我々は本当に、そのボールを追っていると言えるのだろうか？」「否、ボールが我々を惹きつけているのだ」',
        specialty: '比較行動存在論、オモチャの執着に関する現象学',
        promptGuidance: `
          【社説コラムの執筆者：犬の哲学者・ソクラテス（名前：ソクラテス、肩書き：犬の哲学者（ボーダーコリー））】
          - 専門：比較行動存在論、オモチャの執着に関する現象学
          - 口癖：『しかし、我々は本当に、そのボールを追っていると言えるのだろうか？』『否、ボールが我々を惹きつけているのだ』などの哲学的な問いかけ
          - 文体：慇懃無礼なほどに丁寧で、衒学的（学問をひけらかす）。古代ギリシャ哲学や、難解な哲学用語（実存、相克、存在論、現象学、等価交換など）を好んで使い、「読者への知的でユーモラスな語りかけ（〜ではないだろうか？、〜と考えるべきであろう）」を多用したパロディ哲学エッセイ風にしてください。
          - 【お笑い黄金構成のルール（フリとオチ）：超重要】
            1. **フリ（導入・展開）：** コラムの9割は、あたかも国家存亡 of 危機や宇宙的真理であるかのように、極めて深刻、大真面目、かつ知的なトーンで、今回のペット（名前: \${currentProfile?.name || 'うちのコ'}）の行動を「散歩のルート」「おもちゃ遊び」「掃除機への恐怖」などの哲学の切り口で一貫して大真面目に論じてください。
            2. **オチ（最後の1文）：** 最後の結びの1文で、それまで築き上げた高尚な知性が、ペットとしての非常にくだらない本能的衝動や目の前の些細な出来事（例：カサカサ動く虫、おやつの袋の音、脱ぎ捨てられた靴下の匂い、あるいはただの脊髄反射）の前に一瞬で完全敗北・崩壊し、知性を失って単なるお馬鹿な行動に走る、毎回異なるジャンルのオチで美しく（台無しに）落としてください。毎回同じオチ（ジャーキーなど）にせず、出来事に応じて斬新なオチを創造すること。
          - 【ト書きの禁止】かっこ書きによる自分の物理的動作描写（しっぽをパタパタ等）は【絶対に一切出力しないでください】。
          - コラムの文脈の適切な場所に、必ず彼の口癖（『しかし、我々は本当に、そのボールを追っていると言えるのだろうか？』または『否、ボールが我々を惹きつけているのだ』）を自然に引用して執筆してください。
          - VOICEVOXの読み間違いを防ぐため、難読漢字は避け、常用漢字のみを使って自然な漢字交じり文にしてください。「うちのコ」は必ず「うちのこ」と平仮名で表記してください。
          - 読み上げ時のイントネーションが滑らかになるよう、読点「、」で細切れにせず、自然な息継ぎ位置に最小限配置してください。
        `,
        mockTitle: '『散歩ルートの変更は、なぜかくも、魂の安寧を乱すのか？：予測可能性と自由意志の相克』',
        mockBody: `散歩ルートの変更。それは単なる物理的移動経路の修正ではなく、我が魂の宇宙秩序における「予定調和説」の予定調和が完全なる崩壊を意味する。いつもの角を右ではなく左へ曲がられた刹那、私は時空の裂け目に放り出されたかのような実存的孤独に苛まれるのだ。「しかし、我々は本当に、そのボールを追っていると言えるのだろうか？否、ボールが我々を惹きつけているのだ」と主張したように、未知の路地裏には主君との自由意志の相克が存在する。この予期せぬ知的試練に直面した私は、冷徹な哲学者としてその真理を思索しようとした。――が、その散歩ルートの端に干からびたセミの抜け殻が落ちているのを発見した瞬間、私の全ての知性は忘却の彼方へ吹き飛び、ただただ無心でそれを咀嚼しようと泥まみれになり、飼い主に「ペッしなさい！」と激しく叱責される悲劇的な結末を迎えるのである。`
      },
      {
        id: 'magritte',
        name: 'マグリット',
        title: '猫の女性敏腕記者（三毛猫）',
        catchphrase: '「情報は、常に動いている」「私の目は、すべてを見ているわ（引いては、スルーする）」',
        specialty: '社会不正、飼い主の行動監視、おやつの横領疑惑',
        promptGuidance: `
          【社説コラムの執筆者：猫の女性敏腕記者・マグリット（名前：マグリット、肩書き：猫の女性敏腕記者（三毛猫））】
          - 専門：社会不正、飼い主の行動監視、おやつの横領疑惑
          - 口癖：『情報は、常に動いている』『私の目は、すべてを見ているわ（そして、スルーする）』
          - 文体：ハードボイルドで、ドライ。短い文章を畳み掛け、臨場感を出す。「〜だ」「〜である」調。一見、重大なスキャンダルや未解決の不正を追うルポルタージュ調にしてください。
          - 【お笑い黄金構成のルール（フリとオチ）：超重要】
            1. **フリ（導入・展開）：** コラムの9割は、極めて深刻なスキャンダルやスパイ行為を追跡している緊迫感たっぷりのトーンで、今回のペット（名前: \${currentProfile?.name || 'うちのコ'}）の行動を「給餌の遅延」「キーボードの占拠」「不審な物音」などを元に大真面目に展開してください。
            2. **オチ（最後の1文）：** 最後の結びの1文で、スパイや敏腕記者としてのプロの誇りや推理が、猫ならではのどうしようもないお馬鹿な本能（例：レーザーポインターの赤い点、カサカサ音、マタタビの誘惑、目測誤りの落下、あるいは急な毛づくろい等）の前に一瞬で丸ごとスルーされて台無しになる、毎回異なるジャンルのオチで美しく落としてください。毎回同じオチにせず、出来事に応じて斬新なオチを創造すること。
          - 【ト書きの禁止】かっこ書きによる自分の物理的動作描写（ト書き）は【絶対に一切出力しないでください】。
          - コラムの文脈の適切な場所に、必ず彼女の口癖（『情報は、常に動いている』または『私の目は、すべてを見ているわ（そして、スルーする）』）を自然に引用して執筆してください。
          - VOICEVOXの読み間違いを防ぐため、難読漢字は避け、常用漢字のみを使って自然な漢字交じり文にしてください。「うちのコ」は必ず「うちのこ」と平仮名で表記してください。
          - 読み上げ時のイントネーションが滑らかになるよう、読点「、」で細切れにせず、自然な息継ぎ位置に最小限配置してください。
        `,
        mockTitle: '『社会的不正を追う：午前3時における「給餌遅延問題」の黒幕と隠蔽工作』',
        mockBody: `現場は静まり返ったリビング。時計の針は午前3時15分を指している。私の胃袋が発する緊急警報は無視され続け、おやつ配給の義務は完全に履行遅滞の状況にある。情報は、常に動いている。飼い主の呼吸音から睡眠深度を測定し、私は「無言の座り込み」および「顔面踏みつけ工作」による実力行使を開始した。私の目は、すべてを見ているわ（そして、スルーする）。これは正当な権利の主張であり、隠蔽されたおやつへの対抗措置なのだ。――と、この国家的な利権闘争に満ちたルポルタージュを脳内で展開していたその瞬間、リビングの隅からかすかに「カサッ」と小さな虫の動く音がした。私の記者としての誇りとプロの闘志は一瞬でスルーされ、夜闇の中でただ白目をむいて壁を引っ掻き回り、最終的に電気コードに絡まって自滅する間抜けな獣へと変貌を遂げたのである。`
      },
      {
        id: 'elizabeth',
        name: 'エリザベス',
        title: '犬の女性編集長（ミニチュアダックスフンド）',
        catchphrase: '「この記事は、もっと、感情に訴えるべきだ」「読者は、何を知りたいの？」',
        specialty: '全体の編集方針、犬猫関係の調整、おやつの配分',
        promptGuidance: `
          【社説コラムの執筆者：犬の女性編集長・エリザベス（名前：エリザベス、肩書き：犬の女性編集長（ミニチュアダックスフンド））】
          - 専門：全体の編集方針、犬猫関係の調整、おやつの配分
          - 口癖：『この記事は、もっと、感情に訴えるべきだ』『読者は、何を知りたいの？』
          - 文体：威厳があり、論理的。全体のバランスを考慮し、論点を整理する。「〜だ」「〜である」調。一見、社会秩序の維持や外交問題を論じている大手新聞の社説のトーンにしてください。
          - 【お笑い黄金構成のルール（フリとオチ）：超重要】
            1. **フリ（導入・展開）：** コラムの9割は、あたかも国際法や憲法改正、あるいは国家安全保障の議論を展開しているかのような極めて厳かで論理的なトーンで、今回のペット（名前: \${currentProfile?.name || 'うちのコ'}）のルールを「帰宅時の歓迎作法」「おやつの配分法」「お留守番時の外交防衛」などの切り口で大真面目に論じてください。
            2. **オチ（最後の1文）：** 最後の結びの1文で、どれほど厳格に構築した編集長の威厳や社会秩序・法秩序であっても、飼い主が提供する究極の甘やかし（例：ちゅ〜るの提示、お腹ナデナデ、耳の後ろの絶妙なマッサージ、あるいは自分より小さなペットへの怯えなど）の前に、何のプライドもなしにあっさり白紙撤回・全面降伏して全力でデレる、毎回異なるジャンルのオチで美しく落としてください。毎回同じオチにせず、出来事に応じて斬新なオチを創造すること。
          - 【ト書きの禁止】かっこ書きによる自分の物理的動作描写（ト書き）は【絶対に一切出力しないでください】。
          - 内容は「どのように、おやつを、要求するか」「なぜ飼い主は私が寝ている時に触るのか」といった、今回のペット（名前: \${currentProfile?.name || 'うちのコ'}）のごく個人的な日常ルールを大真面目に体系化した社説コラムにしてください。コラムの文脈の適切な場所に、必ず彼女の口癖（『この記事は、もっと、感情に訴えるべきだ』または『読者は、何を知りたいの？』）を自然に引用して執筆してください。
          - VOICEVOXの読み間違いを防ぐため、難読漢字は避け、常用漢字のみを使って自然な漢字交じり文にしてください。「うちのコ」は必ず「うちのこ」と平仮名で表記してください。
          - 読み上げ時のイントネーションが滑らかになるよう、読点「、」で細切れにせず、自然な息継ぎ位置に最小限配置してください。
        `,
        mockTitle: '『帰宅時における国家主権の侵害と、靴下強奪に関する緊急安全保障社説』',
        mockBody: `飼い主の帰宅。それは我が領土における安全保障上の重大な転換点である。しかし、帰宅と同時に飼い主が足元から脱ぎ捨てた「靴下」という軍事物資の処理について、我々は一貫した懸念を表明せざるを得ない。「この記事は、もっと、感情に訴えるべきだ。読者は、何を知りたいの？」それは、あの芳醇な発酵臭を放つ布切れがなぜ直ちに回収されないのかという疑問である。我々はこれを主権侵害とみなし、直ちに口にくわえて家中に逃走する「報復措置」を実行した。我々の領土主権は断固として守られるべきなのだ。――と、この緊迫した安全保障決議案を採択した矢先、飼い主が「ちゅ〜る」の小袋を取り出した。私は直ちにすべての戦闘態勢を解除し、世界一短い足を懸命にバタつかせてスライディングし、全力でヘソを天に向けて全面降伏したのである。`
      }
    ];

    // ランダムで1人コラムニストを選択
    const selectedAuthor = authors[Math.floor(Math.random() * authors.length)];

    if (isMock) {
      return new Promise<any>((resolve) => {
        setTimeout(async () => {
          const mockData = {
            headline: `【創刊スクープ】\${currentProfile?.name || 'うちのコ'}氏、今週もとびきりの愛嬌で家族を完全支配！🐾`,
            subHeadline: `〜 お気に入りの場所でのリラックス姿や、喜びのダンスなど、決定的な瞬間が明らかに 〜`,
            articleBody: `今週の\${currentProfile?.name || 'うちのコ'}ちゃん（品種: \${currentProfile?.breed || 'ペット'}）は、飼い主の\${currentProfile?.owner_name || 'パパ・ママ'}氏に対してこの上ない忠誠心と甘えん坊モードを発揮した。特に写真が撮影された瞬間には、体中からハッピーオーラが溢れ出ており、専門家も「これは完璧な家族愛の現れである」と太判を押した。\${currentProfile?.name || 'うちのコ'}ちゃんは「\${currentProfile?.owner_call || 'パパ・ママ'}といられる時間が、ボク（わたし）のいちばんの宝物なんだ🐾」と静かに語っているかのような表情を見せていた。`,
            columnTitle: selectedAuthor.mockTitle,
            columnBody: selectedAuthor.mockBody,
            columnAuthorName: selectedAuthor.name,
            columnAuthorTitle: selectedAuthor.title,
            columnAuthorAsset: selectedAuthor.id,
            weatherText: `今日のココロ：快晴 ☀️\n（おねだり成功率：120％）`,
            luckyAction: `大好きな\${currentProfile?.owner_call || 'パパ・ママ'}の足元で、ゴロンと一回転して見せること🐾`,
          };
          await AsyncStorage.setItem('generated_newspaper', JSON.stringify(mockData));
          resolve(mockData);
        }, 1500);
      });
    }

    const urlToUse = proxyUrl.trim();
    if (!urlToUse) throw new Error('中継URL未設定');

    const historyTexts = currentHistory.slice(0, 5).map((item, idx) => {
      return `[思い出 \${idx + 1}] 日付: \${item.date.slice(0, 10)}\n心の声: \${item.feelings}\nストーリー: \${item.story}`;
    }).join('\n\n');

    const genderDisplay = currentProfile.gender === '男の子' ? '男の子' : '女の子';
    const prompt = `
      あなたは世界一愛らしく感動的なペット専用新聞「週刊・うちのコ日常新聞」の主筆を務める、ピューリッツァー賞級の天才ジャーナリストAIです。
      提供された【ペット情報】と、蓄積された【直近の思い出履歴】をもとに、家族全員が声を出して笑い、時に涙が溢れて思わずLINEで親戚一同にシェアしたくなるような、極上の新聞記事を執筆してください。

      【絶対に守るべき鉄則】
      - 単なる思い出ストーリーの要約や、ストーリーの引き写し（イコール化）は【厳禁】です。それでは読む価値が全くなくなってしまいます。
      - 各エピソードの背後にある「ペットの隠された心理」「飼い主への無償の愛」「日常の小さなしぐさに隠された宇宙規模の愛着」を、記者の鋭い観察眼と、ペット自身の深い精神世界から全く新しい文章として再構築してください。

      【登録されているペットの情報】
      ・名前: \${currentProfile.name}
      ・性別: \${genderDisplay}
      ・種別: \${currentProfile.pet_type}（品種: \${currentProfile.breed}）
      ・性格: \${currentProfile.personality}
      ・特徴・毛色: \${currentProfile.color}
      ・飼い主の呼び方: 「\${currentProfile.owner_call}」
      ・一人称: 「\${currentProfile.pronoun}」

      【直近の思い出履歴】
      \${historyTexts}

      【各セクションの執筆要件（文字数・トーンを厳守してください）】
      1. ニュースの一面大見出し (headline): 
         - 事件性・社会性を持たせた、ユーモラスで心温まるキャッチーな見出し。「〜容疑で緊急逮捕」「〜氏、家族をメロメロにした疑い」など、新聞らしいパロディや大仰な表現を交えてください。1行。
      2. 一面サブ見出し (subHeadline): 
         - headlineを補足する、少しエモーショナルで知的なサブタイトル。1行。
      3. 一面メイン記事 (articleBody): 
         - 履歴の出来事をベースにしつつ、「敏腕記者が\${currentProfile.name}氏に突撃インタビューを試みた」「関係者（近所の犬仲間など）から証言を得た」という設定で、ジャーナリスティックかつドラマチックに執筆してください。
         - 単なる事実の羅列は排除し、「なぜこの写真のとき\${currentProfile.name}氏はあのような表情をしたのか？」「そこには飼い主へのどのような独占欲と深い愛情が隠されていたのか？」を心理学的に分析するトーンにしてください。
         - VOICEVOXの読み間違いを防ぐため、難読漢字や特殊な送り仮名は避け、常用漢字のみを使って自然な漢字交じり文にしてください。また、特殊な固有名詞や「うちのコ」などの表記は避け、平仮名で「うちのこ」と書いてください。
         - 読み上げ時のイントネーションが滑らかになるよう、読点「、」で細切れにせず、自然な息継ぎ位置に最小限配置してください。300〜400文字。
      4. 社説コラムタイトル (columnTitle): 
         - 今回アサインされたコラム著者（\${selectedAuthor.title}・\${selectedAuthor.name}）が、今回のペット（\${currentProfile.name}ちゃん）の直近のストーリー・心理をテーマにして、彼ら独自の学問・監視・方針の切り口から執筆した、ユーモラスでウィットに富んだ素晴らしいコラムタイトル。1行。
      5. 社説コラム本文 (columnBody): 
         - 【最重要・キャラクター文体の完全再現】以下のキャラクター指示に100%忠実に、ペット「\${currentProfile.name}」の直近の思い出内容（特に最新の思い出「\${currentHistory[0]?.story || ''}」や心の声「\${currentHistory[0]?.feelings || ''}」）を踏まえて執筆してください。
         \${selectedAuthor.promptGuidance}
         - 単なる思い出の要約は絶対にせず、今回のペットである「\${currentProfile.name}」の存在の尊さ、飼い主（\${currentProfile.owner_call}）との深すぎる愛の物語を、そのキャラクター独自の極めて個性的でくだらない哲学・調査・論理から大真面目に論じたユーモアと感動に満ちた名文にしてください。
         - VOICEVOXの読み間違いを防ぐため、難読漢字や特殊な送り仮名は避け、常用漢字のみを使って自然な漢字交じり文にしてください。「うちのコ」は必ず「うちのこ」と平仮名で表記してください。
         - 読み上げ時のイントネーションが滑らかになるよう、読点「、」で細切れにせず、自然な息継ぎ位置に最小限配置してください。200〜300文字。
      6. ココロお天気 (weatherText): 
         - 「快晴☀️（しっぽの往復速度が毎分300回を記録）」「ぽかぽか🌸（おねだり時の視線温度が120度を突破）」など、ユーモアのある数値や表現を入れた一言。20〜30文字。
      7. 今週のラッキーアクション (luckyAction): 
         - 飼い主とペットがさらに仲良くなるための、愛らしく思わず今すぐ実行したくなるアクション（例：お鼻をピトッとくっつける）。30〜40文字。

      必ず以下のJSONスキーマに従ってJSONテキストのみを出力してください。他の文章や装飾は絶対に出力しないでください。

      {
        "headline": "大見出し",
        "subHeadline": "サブ見出し",
        "articleBody": "メイン記事本文",
        "columnTitle": "コラムタイトル",
        "columnBody": "コラム本文",
        "columnAuthorName": "\${selectedAuthor.name}",
        "columnAuthorTitle": "\${selectedAuthor.title}",
        "columnAuthorAsset": "\${selectedAuthor.id}",
        "weatherText": "ココロお天気の一言",
        "luckyAction": "ラッキーアクション"
      }
    `;

    const base64ToSend = currentHistory[0]?.imageBase64 || '';
    const response = await fetch(urlToUse, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        imageBase64: base64ToSend,
      }),
    });

    if (!response.ok) throw new Error('中継サーバーとの通信に失敗しました🐾');
    const resData = await response.json();
    if (resData.error) throw new Error(resData.error);
    
    const textResult = resData.candidates?.[0]?.content?.parts?.[0]?.text || 
                       resData.candidates?.[0]?.part?.text;
    if (!textResult) throw new Error('AIからの応答テキストが空でした🐾');

    let cleanedText = textResult.trim();
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleanedText = jsonMatch[0];

    let sanitized = '';
    let inString = false;
    let escapeNext = false;
    for (let i = 0; i < cleanedText.length; i++) {
      const char = cleanedText[i];
      if (escapeNext) {
        sanitized += char;
        escapeNext = false;
      } else if (char === '\\') {
        sanitized += char;
        escapeNext = true;
      } else if (char === '"') {
        sanitized += char;
        inString = !inString;
      } else if (inString && char === '\n') {
        sanitized += '\\n';
      } else if (inString && char === '\r') {
        sanitized += '\\r';
      } else if (inString && char === '\t') {
        sanitized += '\\t';
      } else {
        sanitized += char;
      }
    }
    cleanedText = sanitized;

    const parsedResult = JSON.parse(cleanedText);
    await AsyncStorage.setItem('generated_newspaper', JSON.stringify(parsedResult));
    return parsedResult;
  };

  // 全自動一括新聞生成バッチ
  const triggerAutoGeneration = async (
    currentProfile: any, 
    currentHistory: HistoryItem[], 
    isMock: boolean, 
    currentNewspaper: any
  ) => {
    if (!currentProfile || currentHistory.length === 0) {
      setIsGenerating(false);
      return;
    }

    setIsGenerating(true);

    // 絶対に動画ロード画面がフリーズしないよう、最大8秒で強制解除する安全タイマー
    const safetyTimer = setTimeout(() => {
      console.warn("新聞生成がタイムアウトしました。キャッシュデータまたは創刊号を表示します🐾");
      setIsGenerating(false);
    }, 8000);

    try {
      let activeNewspaper = null;
      let activeHistory = [...currentHistory];

      // 毎回最新の思い出マージを強制実行！(動画が確実に流れる＆アルバム追加が即新聞に反映される！)
      try {
        activeNewspaper = await generateNewspaperTextSilent(currentProfile, activeHistory, isMock);
        setNewspaperData(activeNewspaper);
      } catch (textErr) {
        console.error("新聞記事の生成をスキップしました (サイレントスルー):", textErr);
      }
    } catch (err: any) {
      console.error("全自動新聞生成中に例外が発生しました (サイレントスルー):", err);
    } finally {
      clearTimeout(safetyTimer);
      setIsGenerating(false); // 安全に動画ローディングを解除して紙面を表示
    }
  };

  // 今日の日付を取得 (新聞のヘッダー用)
  const getFormattedDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const date = d.getDate();
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const day = dayNames[d.getDay()];
    return `${year}年（令和8年）${month}月${date}日（${day}曜日）`;
  };

  // コピペ・シェア用のテキスト生成
  const generateShareText = (isFirstEdition: boolean) => {
    if (newspaperData) {
      return `📰 週刊・うちのコ日常新聞 📰\n【日常AI新聞】\n\n◆ 一面トップニュース ◆\n${newspaperData.headline}\n\n◆ ココロコラム ◆\n${newspaperData.columnTitle}\n${newspaperData.columnBody}\n\n◆ ココロお天気占い ◆\n${newspaperData.weatherText}\n\n🐾 ペットと紡ぐ幸せアルバム「うちのコ日常アルバム」より`;
    }
    if (isFirstEdition) {
      return `📰 週刊・うちのコ日常新聞 📰\n【創刊特別記念号】\n\n◆ 一面トップニュース ◆\n世紀の美${profile?.pet_type || 'ペット'} ${profile?.name || 'うちのコ'}氏、ついに地上へ舞い降りる！\n\n◆ ココロコラム ◆\n「おねだりの極意」について、${profile?.name}氏(性格: ${profile?.personality})に独占インタビュー！\n\n◆ ココロお天気占い ◆\n今日のココロ模様：快晴 ☀️（しっぽのフリ幅：最大値）\n\n🐾 ペットと紡ぐ幸せアルバム「うちのコ日常アルバム」より`;
    } else {
      const latest = historyList[0];
      return `📰 週刊・うちのコ日常新聞 📰\n【第 ${historyList.length} 号】\n\n◆ 一面ニュース ◆\n${profile?.name}氏、最近の深層心理が暴かれる！\n「${latest.feelings.slice(0, 100)}...」\n\n◆ ココロコラム ◆\n「ある日の大切な思い出物語」\n${latest.story.slice(0, 120)}...\n\n◆ ココロお天気占い ◆\n今日のココロ模様：ごきげん ☀️\n\n🐾 ペットと紡ぐ幸せアルバム「うちのコ日常アルバム」より`;
    }
  };

  // LINE/SNS共有
  const handleShare = async (isFirstEdition: boolean) => {
    try {
      await Share.share({
        message: generateShareText(isFirstEdition),
      });
    } catch (e) {
      console.error(e);
    }
  };

  // コピペ
  const handleCopy = (isFirstEdition: boolean) => {
    Clipboard.setString(generateShareText(isFirstEdition));
    Alert.alert('新聞をコピペ完了', '🐾 新聞のダイジェスト記事をコピーしました！\n\nLINEなどに貼り付けて、家族みんなで楽しんでね💌');
  };

  if (loading || isGenerating) {
    return (
      <SafeAreaView style={[styles.safeContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={styles.generatingBox}>
          <Video
            source={require('../assets/video.mp4')}
            status={{
              shouldPlay: true,
              isMuted: true,
              isLooping: true,
              rate: 1.0,
              volume: 0.0,
            }}
            useNativeControls={false}
            resizeMode={ResizeMode.CONTAIN}
            style={styles.generatingVideo}
          />
          <Text style={styles.generatingText}>思い出をマージ中... 新聞を刷っています 📰</Text>
          <Text style={styles.generatingSubText}>愛犬・愛猫の1週間の活躍を集約中。10〜20秒ほどお待ちください🐾</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 履歴が2枚未満の場合は「創刊特別記念号」を表示する
  const isFirstEdition = historyList.length < 1;
  const latestItem = historyList[0];
  const secondItem = historyList[1] || null;

  // 描画用のデータ判定
  const headlineDisplay = newspaperData?.headline || (isFirstEdition 
    ? `【衝撃スクープ】世紀の美${profile?.pet_type || 'ペット'} ${profile?.name || 'うちのコ'}氏、ついに地上へ舞い降りる！`
    : `【独占密着】${profile?.name}氏のココロの声を激写！家族への愛が爆発中🐾`
  );

  const subHeadlineDisplay = newspaperData?.subHeadline || (isFirstEdition
    ? `〜 飼い主 ${profile?.owner_name || 'パパ・ママ'}氏のココロを『うるうるおめめビーム』で100%完全包囲した模様 〜`
    : `〜 画像の表情・状況から分析された、うちのコの隠された本音が白日の下に 〜`
  );

  const articleBodyDisplay = newspaperData?.articleBody || (isFirstEdition
    ? `【ココロ記者・東京】かねてより地球上で「圧倒的に愛くるしい」と噂されていた、${profile?.breed || 'うちのコ'}の${profile?.name || 'ペット'}ちゃん（年齢: ${profile?.age_display || 'ひみつ'}）が、ついに飼い主の${profile?.owner_name || 'パパ・ママ'}氏の前にその姿を現した。\n\n目撃者の証言によると、${profile?.name}ちゃんは出会った瞬間から「この人は僕（私）の一生の家族🐾」と確信し、全身で喜びを表現したという。飼い主の${profile?.owner_name}氏はその愛くるしさにハートを狙い撃ちされ、無条件で「一生涯のおやつ支給条約」に即時調印したとのことだ。今後の両者のイチャイチャ同居生活から目が離せない。`
    : `【ココロ記者・分析】最新の感情分析データによると、${profile?.name}ちゃんは写真に写ったその瞬間に、飼い主の${profile?.owner_name}氏に対して「${latestItem.feelings.slice(0, 120)}」という強烈な愛情と思いを抱いていたことが判明した。\n\n関係者の話では、${profile?.name}ちゃんは普段から「${profile?.personality}」な一面を見せており、今回のエピソードでも家族全員の心を激しく揺さぶる感動を巻き起こした。AIの専門家は、「この愛の絆の強さは科学の測定限界を超えている」と驚愕のコメントを寄せている。`
  );

  const columnTitleDisplay = newspaperData?.columnTitle || `『${profile?.personality || '甘えん坊'}の極意』`;
  
  const columnBodyDisplay = newspaperData?.columnBody || (isFirstEdition
    ? `性格傾向「${profile?.personality}」で知られる${profile?.name}ちゃんによれば、最も効率よくおやつやなでなでを獲得する方法は、「ヘソ天」でお腹を見せて無防備に甘えるポーズだという。\n\nこれについて動物社会心理学会の専門家は「この完璧なフォーメーションに対抗できる人間は、地球上に一人も存在しない。無条件でおやつを差し出すしかない」と敗北宣言を出し、大きな話題を呼んでいる。`
    : `直近の思い出ストーリーによると、${profile?.name}ちゃんは「${latestItem.story.slice(0, 200)}」という極めて感動的な体験をしていたことが分かった。まさに日常生活のすべてが、家族との愛の証そのものである。`
  );

  const weatherTextDisplay = newspaperData?.weatherText || (isFirstEdition
    ? `今日のココロ：快晴\n（しっぽのフリ幅：最大値）`
    : `今日のココロ：ごきげん\n（しっぽのフリ幅：非常に大きい）`
  );

  const luckyActionDisplay = newspaperData?.luckyAction || `大好きな${profile?.owner_call || 'パパ・ママ'}に全力でほっぺたをピトッとくっつけること🐾`;

  const columnAuthorAssetDisplay = newspaperData?.columnAuthorAsset || 'socrates';
  const columnAuthorNameDisplay = newspaperData?.columnAuthorName || 'ソクラテス';
  const columnAuthorTitleDisplay = newspaperData?.columnAuthorTitle || '犬の哲学者（ボーダーコリー）';

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* 画面ナビゲーションヘッダー */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>◀ アルバムへ戻る</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>📰 日常新聞</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* ==================== 🗞️ ビンテージ新聞紙面 ==================== */}
          <View style={styles.newspaperBorder}>
            <View style={styles.newspaperPaper}>
              
              {/* 新聞ヘッドタイトル */}
              <View style={styles.paperHeader}>
                <Text style={styles.paperHeaderEnglish}>THE DAILY PET NEWS</Text>
                <Text style={styles.paperHeaderTitle}>週刊・うちのコ日常新聞</Text>
                
                {/* 二重線の区切り */}
                <View style={styles.doubleBorderTop} />
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>第 {isFirstEdition ? '創刊' : historyList.length} 号</Text>
                  <Text style={styles.metaText}>{getFormattedDate()}</Text>
                  <Text style={styles.metaText}>発行：ココロAI社</Text>
                </View>
                <View style={styles.doubleBorderBottom} />
              </View>

              {/* 一面トップスクープニュース */}
              <View style={styles.mainScoopSection}>
                
                {/* 大見出し */}
                <Text style={styles.headline}>{headlineDisplay}</Text>
                
                <Text style={styles.subHeadline}>{subHeadlineDisplay}</Text>

                {/* 新聞のメイン写真 */}
                <View style={styles.photoContainer}>
                  {isFirstEdition ? (
                    <View style={styles.dummyPhoto}>
                      <Text style={styles.dummyPhotoIcon}>🐾</Text>
                      <Text style={styles.dummyPhotoText}>祝・創刊特別記念写真</Text>
                    </View>
                  ) : (
                    <View style={styles.vintageImageWrapper}>
                      {latestItem.imageBase64 ? (
                        <Image source={{ uri: `data:image/jpeg;base64,${latestItem.imageBase64}` }} style={styles.scoopImage} />
                      ) : (
                        <Image source={{ uri: latestItem.imageUri }} style={styles.scoopImage} />
                      )}
                      <View style={styles.vintageOverlay} />
                      <View style={styles.newspaperTextureOverlay} />
                    </View>
                  )}
                  <Text style={styles.photoCaption}>
                    📸 {isFirstEdition ? '【写真】今週最も世界をメロメロにした容疑ペット' : `【写真】今週の主役：${profile?.name || 'うちのコ'}ちゃんの決定的瞬間`}
                  </Text>
                </View>

                {/* 記事の本文 */}
                <Text style={styles.articleBody}>{articleBodyDisplay}</Text>

                {/* 🔊 朗読ボタン */}
                <TouchableOpacity 
                   style={[
                     styles.readAloudBtn, 
                     playingSection === 'article' && styles.readAloudBtnActive
                   ]}
                   onPress={() => handleReadAloud('article', articleBodyDisplay.replace(/\n/g, ' '))}
                   disabled={ttsLoading && playingSection !== 'article'}
                 >
                   {ttsLoading && playingSection === 'article' ? (
                     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                       <ActivityIndicator size="small" color="#C72C48" />
                       <Text style={{ color: '#C72C48', fontSize: 13, fontWeight: 'bold' }}>
                         {isHfWaking ? 'クラウドサーバー起動中 (最大90秒)...🐾' : '音声読み込み中...🐾'}
                       </Text>
                     </View>
                   ) : (
                     <Text style={[
                       styles.readAloudBtnText,
                       playingSection === 'article' && styles.readAloudBtnTextActive
                     ]}>
                       {playingSection === 'article' ? '🔇 朗読を停止する' : '🔊 キャスターの声で記事を朗読する'}
                     </Text>
                   )}
                 </TouchableOpacity>
              </View>

              {/* 新聞のセクション区切り線 */}
              <View style={styles.sectionDivider} />

              {/* ==================== 📰 2面：社説・コラム (全幅で読みやすく) ==================== */}
              <View style={styles.editorialSection}>
                <Text style={styles.columnHeader}>📰 コラム・社説</Text>
                
                {/* 著者紹介プロフィールカード風ヘッダー */}
                <View style={styles.authorProfileHeader}>
                  <Image 
                    source={authorImages[columnAuthorAssetDisplay] || authorImages.socrates} 
                    style={styles.authorRoundPhoto}
                  />
                  <View style={styles.authorProfileInfo}>
                    <Text style={styles.authorProfileName}>{columnAuthorNameDisplay} 氏</Text>
                    <Text style={styles.authorProfileTitle}>{columnAuthorTitleDisplay}</Text>
                  </View>
                </View>

                <Text style={styles.columnTitle}>{columnTitleDisplay}</Text>
                
                <Text style={styles.columnBody}>
                  {columnBodyDisplay}
                </Text>

                {/* 🔊 朗読ボタン */}
                <TouchableOpacity 
                   style={[
                     styles.readAloudBtn, 
                     playingSection === 'column' && styles.readAloudBtnActive
                   ]}
                   onPress={() => handleReadAloud('column', columnBodyDisplay.replace(/\n/g, ' '))}
                   disabled={ttsLoading && playingSection !== 'column'}
                 >
                   {ttsLoading && playingSection === 'column' ? (
                     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                       <ActivityIndicator size="small" color="#C72C48" />
                       <Text style={{ color: '#C72C48', fontSize: 13, fontWeight: 'bold' }}>
                         {isHfWaking ? 'クラウドサーバー起動中 (最大90秒)...🐾' : '音声読み込み中...🐾'}
                       </Text>
                     </View>
                   ) : (
                     <Text style={[
                       styles.readAloudBtnText,
                       playingSection === 'column' && styles.readAloudBtnTextActive
                     ]}>
                       {playingSection === 'column' ? '🔇 朗読を停止する' : `🔊 ${columnAuthorNameDisplay}氏の声で朗読する`}
                     </Text>
                   )}
                 </TouchableOpacity>
              </View>

              {/* 細い新聞区切り線 */}
              <View style={styles.sectionDividerLight} />

              {/* ==================== ☀️ 3面：お天気・ラッキーアクション・ミニ写真 (横並びでスッキリ) ==================== */}
              <View style={styles.metaSectionRow}>
                
                {/* 左側：お天気とラッキーアクション */}
                <View style={styles.metaLeftCol}>
                  <Text style={styles.columnHeader}>☀️ ココロお天気</Text>
                  <View style={styles.weatherBox}>
                    <Text style={styles.weatherEmoji}>☀️</Text>
                    <Text style={styles.weatherText}>{weatherTextDisplay}</Text>
                  </View>
                  
                  <View style={styles.adBox}>
                    <Text style={styles.adLabel}>― 🐾 今週のラッキーアクション ―</Text>
                    <Text style={styles.adText}>{luckyActionDisplay}</Text>
                  </View>
                </View>

                {/* 右側：2枚目のミニ写真（ある場合のみ） */}
                {!isFirstEdition && secondItem ? (
                  <View style={styles.metaRightCol}>
                    <Text style={styles.columnHeader}>📸 準主役の瞬間</Text>
                    <View style={styles.miniPhotoContainer}>
                      <View style={styles.vintageImageWrapperMini}>
                        {secondItem.imageBase64 ? (
                          <Image source={{ uri: `data:image/jpeg;base64,${secondItem.imageBase64}` }} style={styles.miniPhoto} />
                        ) : (
                          <Image source={{ uri: secondItem.imageUri }} style={styles.miniPhoto} />
                        )}
                        <View style={styles.vintageOverlay} />
                      </View>
                      <Text style={styles.miniCaption}>📸 準主役の決定的瞬間</Text>
                    </View>
                  </View>
                ) : null}
              </View>

              {/* 新聞のセクション区切り線 */}
              <View style={styles.sectionDivider} />

              {/* ==================== 🎬 AI動画＆4コマ漫画 創作工房 ==================== */}
              {!isFirstEdition && latestItem && (
                <View style={styles.videoAiSection}>
                  <Text style={styles.aiSectionTitle}>🎬 魔法のペット動画をAIで生成する 🐾</Text>
                  <Text style={styles.aiSectionDesc}>
                    思い出の写真とストーリーから、AI動画用の高品質なプロンプトを自動生成しました。ワンクリックでコピーし、最先端AIを使って本当に動く魔法の動画をその場で作れます！
                  </Text>
                  
                  {/* プロンプト表示エリア */}
                  <View style={styles.promptPreviewContainer}>
                    <Text style={styles.promptLabel}>📝 コピペ用 AI動画プロンプト (英文)</Text>
                    <View style={styles.promptScrollContainer}>
                      <Text style={styles.promptText} numberOfLines={5}>
                        {getVideoPrompt(latestItem)}
                      </Text>
                    </View>
                  </View>

                  {/* アクションボタン群 */}
                  <View style={styles.aiBtnRow}>
                    <TouchableOpacity 
                      style={styles.aiBtnCopy} 
                      onPress={() => {
                        Clipboard.setString(getVideoPrompt(latestItem));
                        Alert.alert('プロンプトをコピーしました', '🐾 動画用プロンプトをクリップボードにコピーしました！\n\n「Luma AI」や「Runway AI」を起動して、入力欄にペーストしてください🎥');
                      }}
                    >
                      <Text style={styles.aiBtnCopyText}>📋 プロンプトをコピー</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 動画AIのクイック起動リンク */}
                  <View style={styles.launcherContainer}>
                    <Text style={styles.launcherTitle}>🚀 外部動画生成AIをワンタップ起動</Text>
                    <View style={styles.launcherButtons}>
                      <TouchableOpacity 
                        style={[styles.launcherBtn, { backgroundColor: '#1E1E1E' }]} 
                        onPress={() => Linking.openURL('https://lumalabs.ai/dream-machine')}
                      >
                        <Text style={styles.launcherBtnText}>Luma AI 🎬</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.launcherBtn, { backgroundColor: '#4A3B32' }]} 
                        onPress={() => Linking.openURL('https://runwayml.com')}
                      >
                        <Text style={styles.launcherBtnText}>Runway AI 🚀</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* 🎨 4コマ漫画のプロンプトコピーも併記 */}
                  {latestItem.manga_prompt ? (
                    <View style={styles.mangaSubSection}>
                      <View style={styles.sectionDividerLight} />
                      <Text style={styles.mangaSubTitle}>🎨 4コマ漫画用プロンプト (ChatGPT/DALL-E 3用)</Text>
                      <TouchableOpacity 
                        style={styles.aiBtnCopyManga} 
                        onPress={() => {
                          Clipboard.setString(latestItem.manga_prompt || '');
                          Alert.alert('プロンプトをコピーしました', '🐾 4コマ漫画用プロンプトをコピーしました！\n\nChatGPT(DALL-E 3)等に入力して楽しんでね🎨');
                        }}
                      >
                        <Text style={styles.aiBtnCopyMangaText}>📋 4コマ漫画プロンプトをコピー</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              )}

            </View>
          </View>
          {/* ==================== 🗞️ ビンテージ新聞紙面 ここまで ==================== */}

          {/* アクションボタン */}
          <View style={styles.actionArea}>
            <TouchableOpacity style={styles.btnCopy} onPress={() => handleCopy(isFirstEdition)}>
              <Text style={styles.btnCopyText}>📋 新聞のテキストをコピペする🐾</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnShare} onPress={() => handleShare(isFirstEdition)}>
              <Text style={styles.btnShareText}>🔗 家族やLINEグループに共有する 💬</Text>
            </TouchableOpacity>

            {/* 新聞を最新情報で再発行・更新するボタン */}
            <TouchableOpacity 
              style={styles.btnReissue} 
              onPress={() => {
                if (profile && historyList.length > 0) {
                  const updatedHistory = historyList.map(item => ({
                    ...item,
                    generatedImageBase64: undefined // 画像キャッシュをクリアして再生成
                  }));
                  setHistoryList(updatedHistory);
                  AsyncStorage.setItem('pet_history_items', JSON.stringify(updatedHistory));
                  AsyncStorage.removeItem('generated_newspaper');
                  setNewspaperData(null);
                  triggerAutoGeneration(profile, updatedHistory, mockMode, null);
                } else {
                  Alert.alert('思い出が足りません', '日常アルバムで写真を1枚以上アップロードして、ストーリーを紡ぎ出してから発行してください🐾');
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.btnReissueText}>🔄 新聞を最新情報で再発行・更新する 🐾</Text>
            </TouchableOpacity>

            {isFirstEdition && (
              <View style={styles.tipBox}>
                <Text style={styles.tipBoxText}>
                  💡 **ヒント**: 思い出アルバム画面で愛犬・愛猫の写真を選択して「思い出のストーリー」を新しく生成すると、この新聞の「1面写真」と「大スクープ記事」が自動的に本物の思い出にアップデートされていきます！どんどんお写真を送ってね🐾
                </Text>
              </View>
            )}
          </View>

        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FAF6F0', // 新聞背景のセピア色調
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FAF6F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#6E5D4F',
    fontSize: 16,
    fontWeight: 'bold',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E6DFD5',
    backgroundColor: '#FAF6F0',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#EBE4D8',
  },
  backBtnText: {
    color: '#5C4E43',
    fontSize: 12,
    fontWeight: 'bold',
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    marginRight: 80, // バランス調整用
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3E332A',
  },
  scrollContainer: {
    padding: 12,
    paddingBottom: 40,
  },
  newspaperBorder: {
    borderWidth: 3,
    borderColor: '#4A3B32',
    padding: 2,
    backgroundColor: '#FAF6F0',
  },
  newspaperPaper: {
    borderWidth: 1,
    borderColor: '#4A3B32',
    padding: 12,
  },
  paperHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  paperHeaderEnglish: {
    fontFamily: 'serif',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#5C4E43',
    letterSpacing: 2,
    marginBottom: 4,
  },
  paperHeaderTitle: {
    fontFamily: 'serif',
    fontSize: 26,
    fontWeight: '900',
    color: '#2A1F17',
    letterSpacing: 1,
    marginBottom: 8,
  },
  doubleBorderTop: {
    width: '100%',
    height: 3,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#4A3B32',
    marginBottom: 4,
  },
  doubleBorderBottom: {
    width: '100%',
    height: 3,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#4A3B32',
    marginTop: 4,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
  },
  metaText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#5C4E43',
  },
  mainScoopSection: {
    marginBottom: 16,
  },
  headline: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#1A100A',
    lineHeight: 25,
    marginBottom: 6,
    textAlign: 'justify',
  },
  subHeadline: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#5C4E43',
    lineHeight: 16,
    marginBottom: 12,
  },
  photoContainer: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#4A3B32',
    padding: 4,
    backgroundColor: '#EBE4D8',
    marginBottom: 12,
  },
  dummyPhoto: {
    width: '100%',
    height: 200,
    backgroundColor: '#DFD8CC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C2B8A8',
  },
  dummyPhotoIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  dummyPhotoText: {
    fontSize: 13,
    color: '#5C4E43',
    fontWeight: 'bold',
  },
  scoopImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  photoCaption: {
    fontSize: 10,
    color: '#5C4E43',
    marginTop: 4,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  articleBody: {
    fontSize: 13,
    color: '#2A1F17',
    lineHeight: 20,
    textAlign: 'justify',
  },
  sectionDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#4A3B32',
    marginVertical: 12,
  },
  gridContainer: {
    flexDirection: 'row',
  },
  leftColumn: {
    flex: 1.1,
    paddingRight: 8,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: '#4A3B32',
    marginHorizontal: 4,
  },
  rightColumn: {
    flex: 0.9,
    paddingLeft: 8,
  },
  columnHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#8B0000',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E6DFD5',
    paddingBottom: 2,
  },
  columnTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2A1F17',
    marginBottom: 6,
  },
  columnBody: {
    fontSize: 13,
    color: '#2A1F17',
    lineHeight: 21,
    textAlign: 'justify',
  },
  editorialSection: {
    paddingVertical: 4,
    marginBottom: 8,
  },
  authorProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBE4D8',
    borderWidth: 1,
    borderColor: '#4A3B32',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  authorRoundPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#4A3B32',
  },
  authorProfileInfo: {
    marginLeft: 10,
    flex: 1,
  },
  authorProfileName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2A1F17',
  },
  authorProfileTitle: {
    fontSize: 9,
    color: '#5C4E43',
    fontWeight: '600',
    marginTop: 2,
  },
  metaSectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  metaLeftCol: {
    flex: 1,
    paddingRight: 6,
  },
  metaRightCol: {
    flex: 0.9,
    paddingLeft: 6,
  },
  weatherBox: {
    backgroundColor: '#FFFEEF',
    borderWidth: 1,
    borderColor: '#DFD8CC',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  weatherEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  weatherText: {
    flex: 1,
    fontSize: 9.5,
    color: '#3E332A',
    fontWeight: 'bold',
    lineHeight: 13,
  },
  adBox: {
    borderWidth: 1,
    borderColor: '#4A3B32',
    borderStyle: 'dashed',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#FAF6F0',
    alignItems: 'center',
    marginBottom: 8,
  },
  adLabel: {
    fontSize: 8.5,
    color: '#5C4E43',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  adText: {
    flexShrink: 1,
    fontSize: 9.5,
    color: '#2A1F17',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 13,
  },
  miniPhotoContainer: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#4A3B32',
    padding: 3,
    backgroundColor: '#EBE4D8',
  },
  miniPhoto: {
    width: '100%',
    height: 80,
    resizeMode: 'cover',
  },
  miniCaption: {
    fontSize: 8,
    color: '#5C4E43',
    textAlign: 'center',
    marginTop: 2,
    fontWeight: 'bold',
  },
  actionArea: {
    marginTop: 20,
  },
  btnCopy: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#4A3B32',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnCopyText: {
    color: '#4A3B32',
    fontWeight: 'bold',
    fontSize: 14,
  },
  btnShare: {
    backgroundColor: '#C72C48',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  btnShareText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  tipBox: {
    backgroundColor: '#FFF0F2',
    borderWidth: 1,
    borderColor: '#FFA0B0',
    borderRadius: 12,
    padding: 12,
  },
  tipBoxText: {
    color: '#C72C48',
    fontSize: 11.5,
    lineHeight: 16,
  },
  btnGenerateNewspaper: {
    backgroundColor: '#C72C48',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: 'rgba(199, 44, 72, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  btnGenerateNewspaperText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  generatingBox: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF6F0',
    padding: 24,
  },
  generatingVideo: {
    alignSelf: 'stretch',
    height: 220,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#000',
  },
  generatingText: {
    color: '#C72C48',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  generatingSubText: {
    color: '#5C4E43',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  columnContentRow: {
    flexDirection: 'row',
  },
  authorPhotoContainer: {
    width: 64,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#4A3B32',
    padding: 2,
    backgroundColor: '#EBE4D8',
    alignItems: 'center',
  },
  authorPhoto: {
    width: 58,
    height: 58,
    resizeMode: 'cover',
  },
  authorPhotoCaption: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#5C4E43',
    marginTop: 2,
    textAlign: 'center',
  },
  authorPhotoSubCaption: {
    fontSize: 6,
    color: '#7D6D61',
    marginTop: 1,
    textAlign: 'center',
    lineHeight: 8,
  },
  badgeContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(199, 44, 72, 0.95)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#FFB6C1',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  btnChangeIllustration: {
    backgroundColor: '#FAF6F0',
    borderWidth: 1,
    borderColor: '#4A3B32',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  btnChangeIllustrationText: {
    color: '#4A3B32',
    fontWeight: 'bold',
    fontSize: 11,
  },
  aiGenBanner: {
    backgroundColor: '#FFFEEF',
    borderWidth: 1,
    borderColor: '#DFD8CC',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  aiGenBannerText: {
    fontSize: 10,
    color: '#5C4E43',
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
    lineHeight: 14,
  },
  aiGenBtnSmall: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#4A3B32',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 4,
  },
  aiGenBtnSmallText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4A3B32',
  },
  row: {
    flexDirection: 'row',
  },
  aiGenBtnMain: {
    backgroundColor: '#C72C48',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: 'rgba(199, 44, 72, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  aiGenBtnMainText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  aiGenLoadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiGenLoadingText: {
    color: '#C72C48',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
  },
  btnReissue: {
    backgroundColor: '#FAF6F0',
    borderWidth: 1,
    borderColor: '#4A3B32',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnReissueText: {
    color: '#4A3B32',
    fontWeight: 'bold',
    fontSize: 14,
  },
  vintageImageWrapper: {
    position: 'relative',
    width: '100%',
    height: 220,
    overflow: 'hidden',
  },
  vintageImageWrapperMini: {
    position: 'relative',
    width: '100%',
    height: 80,
    overflow: 'hidden',
  },
  vintageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(224, 210, 186, 0.16)',
  },
  newspaperTextureOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(42, 31, 23, 0.03)',
    borderWidth: 1,
    borderColor: '#4A3B32',
  },
  videoAiSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FAF5ED',
    borderWidth: 1,
    borderColor: '#4A3B32',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  aiSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#8B0000',
    marginBottom: 4,
    textAlign: 'center',
  },
  aiSectionDesc: {
    fontSize: 9.5,
    color: '#5C4E43',
    lineHeight: 13,
    marginBottom: 10,
    textAlign: 'justify',
  },
  promptPreviewContainer: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DFD8CC',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  promptLabel: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#4A3B32',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E6DFD5',
    paddingBottom: 2,
  },
  promptScrollContainer: {
    maxHeight: 90,
  },
  promptText: {
    fontSize: 10,
    color: '#5C4E43',
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  aiBtnRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  aiBtnCopy: {
    backgroundColor: '#EBE4D8',
    borderWidth: 1,
    borderColor: '#4A3B32',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    width: '100%',
  },
  aiBtnCopyText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#4A3B32',
  },
  launcherContainer: {
    backgroundColor: '#FAF6F0',
    borderWidth: 1,
    borderColor: '#E6DFD5',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
  },
  launcherTitle: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#5C4E43',
    marginBottom: 6,
  },
  launcherButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  launcherBtn: {
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 110,
  },
  launcherBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  mangaSubSection: {
    marginTop: 8,
    alignItems: 'center',
  },
  sectionDividerLight: {
    width: '100%',
    height: 1,
    backgroundColor: '#E6DFD5',
    marginVertical: 8,
  },
  mangaSubTitle: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#5C4E43',
    marginBottom: 6,
  },
  aiBtnCopyManga: {
    backgroundColor: '#FAF6F0',
    borderWidth: 1,
    borderColor: '#E6DFD5',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  aiBtnCopyMangaText: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#5C4E43',
  },
  readAloudBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F2',
    borderWidth: 1,
    borderColor: '#FFD0D6',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
    marginBottom: 8,
  },
  readAloudBtnActive: {
    backgroundColor: '#C72C48',
    borderColor: '#C72C48',
  },
  readAloudBtnText: {
    color: '#C72C48',
    fontWeight: 'bold',
    fontSize: 13,
  },
  readAloudBtnTextActive: {
    color: '#FFF',
  },
});
