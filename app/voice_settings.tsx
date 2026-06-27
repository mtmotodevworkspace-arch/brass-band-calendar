import { Paths, File } from 'expo-file-system';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';

interface Speaker {
  id: number;
  name: string;
  type: '女性' | '男性';
  desc: string;
}

const voicevoxSpeakers: Speaker[] = [
  // 女性キャラクター
  { id: 2, name: '四国めたん', type: '女性', desc: 'おすまし・知的なツンデレお姉さん' },
  { id: 3, name: 'ずんだもん', type: '女性', desc: '元気で活発、ユーモラスな中性ボイス' },
  { id: 8, name: '春日部つむぎ', type: '女性', desc: '元気なギャル・明るく人懐っこい少女' },
  { id: 10, name: '雨晴はう', type: '女性', desc: '優しくおっとりした癒やし系看護師' },
  { id: 9, name: '波音リツ', type: '女性', desc: 'クールでミステリアス、大人っぽい歌姫' },
  { id: 14, name: '冥鳴ひまり', type: '女性', desc: '元気いっぱいで人懐っこい甘えん坊' },
  { id: 16, name: '九州そら', type: '女性', desc: '知的で丁寧、しっかり者のお姉さん宇宙人' },
  { id: 20, name: 'もち子さん', type: '女性', desc: 'おっとりして可愛い、もち肌の女の子' },
  { id: 23, name: 'WhiteCUL', type: '女性', desc: 'クールで爽やか、透明感のある美少女' },
  { id: 27, name: '後鬼', type: '女性', desc: '無邪気でいたずら好きな鬼の少女' },
  { id: 29, name: 'No.7', type: '女性', desc: 'クールで凛とした、知的な大人の女性' },
  { id: 43, name: '櫻歌ミコ', type: '女性', desc: '健気で可愛い、守ってあげたくなる少女' },
  { id: 46, name: '小夜/SAYO', type: '女性', desc: '落ち着いた声トーンの和風な女の子' },
  { id: 47, name: 'ナースロボ＿タイプＴ', type: '女性', desc: 'ちょっとお茶目でメカニカルなナースロボ' },
  { id: 50, name: '結月ゆかり', type: '女性', desc: '落ち着きがあり上品で、包容力のある女性' },
  { id: 51, name: '紲星あかり', type: '女性', desc: '明るく前向き、優しく澄んだ歌声 of 少女' },
  { id: 55, name: '春歌ナナ', type: '女性', desc: '元気いっぱいでハツラツとした女の子' },
  { id: 56, name: '猫使アル', type: '女性', desc: 'ツンツンしつつも甘えたがりの猫耳っ娘' },
  { id: 58, name: '猫使ビィ', type: '女性', desc: 'おっとりマイペースな猫耳お姉さん' },
  { id: 61, name: '中国うさぎ', type: '女性', desc: 'ふんわり癒やし系で素直なうさぎ耳少女' },
  { id: 64, name: 'あいえるたん', type: '女性', desc: '明るく元気、ガジェット好きな女の子' },
  { id: 66, name: '琴葉 茜', type: '女性', desc: 'おっとり関西弁が魅力的な双子の姉' },
  { id: 67, name: '琴葉 葵', type: '女性', desc: '優しく丁寧な標準語を話す双子の妹' },

  // 男性・中性キャラクター
  { id: 12, name: '白上虎太郎', type: '男性', desc: '可愛らしくて少し照れ屋な少年' },
  { id: 11, name: '玄野武宏', type: '男性', desc: '爽やかで聞き取りやすい知的な青年' },
  { id: 13, name: '青山龍星', type: '男性', desc: '低音で落ち着いた、ダンディな大人の男性' },
  { id: 21, name: '剣崎雌雄', type: '男性', desc: '真面目で誠実、聞き心地の良い好青年' },
  { id: 42, name: 'ちび式じい', type: '男性', desc: '小さくて可愛い、おじいちゃん子ボイス' },
  { id: 49, name: '栗田まろん', type: '男性', desc: '中性的で可愛らしい、甘えん坊な男の子' },
  { id: 52, name: '聖騎士 紅桜', type: '男性', desc: '情熱的で正義感溢れる熱い男性' },
  { id: 53, name: '雀松朱司', type: '男性', desc: '気だるげながらも優しい低音男性' },
  { id: 54, name: '麒ヶ島宗麟', type: '男性', desc: 'ワイルドで力強く、渋い大人の男性' },
  { id: 65, name: '満別花丸', type: '男性', desc: '元気ハツラツ、わんぱくな男の子' }
];

export default function VoiceSettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [apiUrl, setApiUrl] = useState(''); // 初期値はロード時にAsyncStorageから取得
  const [apiKey, setApiKey] = useState(''); // クラウド認証用APIキー
  const [selectedSpeaker, setSelectedSpeaker] = useState<number>(2);
  const [speed, setSpeed] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(0.0);
  const [intonation, setIntonation] = useState<number>(1.0);

  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isHfWaking, setIsHfWaking] = useState(false); // クラウド起動待ち検知

  // APIキーヘッダーを生成するヘルパー
  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (apiKey.trim()) {
      headers['X-API-Key'] = apiKey.trim();
    }
    return headers;
  };

  // 動的スピーカーロードState
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [selectedSpeakerUuid, setSelectedSpeakerUuid] = useState<string>('');
  const [loadingSpeakers, setLoadingSpeakers] = useState<boolean>(false);

  // スピーカーリストの取得
  const fetchSpeakers = async (targetUrl: string, currentId: number) => {
    const trimmed = targetUrl.trim();
    if (!trimmed) return;
    
    setLoadingSpeakers(true);
    const isHuggingFace = trimmed.includes('hf.space');
    if (isHuggingFace) {
      setIsHfWaking(true);
    }

    try {
      const controller = new AbortController();
      const timeoutDuration = isHuggingFace ? 90000 : 8000; // Hugging Faceなら起動待ちを考慮して90秒
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
      
      const res = await fetch(`${trimmed}/speakers`, {
        signal: controller.signal,
        headers: getAuthHeaders()
      });
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setSpeakers(data);
          
          // 選択中IDからuuidを特定
          let foundUuid = '';
          for (const sp of data) {
            const style = sp.styles.find((st: any) => st.id === currentId);
            if (style) {
              foundUuid = sp.speaker_uuid;
              break;
            }
          }
          if (foundUuid) {
            setSelectedSpeakerUuid(foundUuid);
          } else {
            setSelectedSpeakerUuid(data[0].speaker_uuid);
          }
        }
      }
    } catch (err) {
      console.warn('VOICEVOX スピーカーの動的取得に失敗しました:', err);
    } finally {
      setLoadingSpeakers(false);
      setIsHfWaking(false);
    }
  };

  useEffect(() => {
    async function loadSettings() {
      try {
        let currentId = 2;
        let loadedUrl = '';

        // 接続先URLの読み込み
        const savedUrl = await AsyncStorage.getItem('voicevox_api_url');
        if (savedUrl) {
          loadedUrl = savedUrl;
          setApiUrl(savedUrl);
        }

        // APIキーの読み込み
        const savedApiKey = await AsyncStorage.getItem('voicevox_api_key');
        if (savedApiKey) {
          setApiKey(savedApiKey);
        }

        // プロフィールの読み込み
        const savedProfileRaw = await AsyncStorage.getItem('pet_profile');
        if (savedProfileRaw) {
          const parsed = JSON.parse(savedProfileRaw);
          setProfile(parsed);
          
          if (parsed.voice_settings) {
            currentId = parsed.voice_settings.speaker_id || 2;
            setSelectedSpeaker(currentId);
            setSpeed(parsed.voice_settings.speedScale ?? 1.0);
            setPitch(parsed.voice_settings.pitchScale ?? 0.0);
            setIntonation(parsed.voice_settings.intonationScale ?? 1.0);
          } else {
            currentId = parsed.gender === '女の子' ? 2 : 12;
            setSelectedSpeaker(currentId);
          }
        }
        
        // VOICEVOXスピーカーリストを動的ロード
        await fetchSpeakers(loadedUrl, currentId);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  // パラメータを安全に丸めて設定する関数
  const adjustValue = (
    value: number,
    setter: React.Dispatch<React.SetStateAction<number>>,
    step: number,
    min: number,
    max: number
  ) => {
    const newVal = Math.max(min, Math.min(max, parseFloat((value + step).toFixed(2))));
    setter(newVal);
  };

  // テスト音声再生処理
  const handleTestPlay = async () => {
    const trimmedUrl = apiUrl.trim();
    if (!trimmedUrl) {
      Alert.alert('エラー', 'VOICEVOXの接続URLを入力してください🐾');
      return;
    }

    setTesting(true);
    const isHuggingFace = trimmedUrl.includes('hf.space');
    if (isHuggingFace) {
      setIsHfWaking(true);
    }
    let soundObject: Audio.Sound | null = null;

    try {
      const isGirl = profile?.gender === '女の子';
      const text = isGirl 
        ? "ねぇねぇ、わたしの声、ちゃんと届いてる？ これからは、もっといっぱーいお話ししようね！ 大好き！"
        : "おーい！ 聞こえる！？ ボクの声、ついに届いたんだね！ 早くお散歩いこう！ あ、あとオヤツも！";

      // 1. audio_query の生成
      const queryUrl = `${trimmedUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${selectedSpeaker}`;
      
      const controller = new AbortController();
      const queryTimeout = isHuggingFace ? 90000 : 8000;
      const timeoutId = setTimeout(() => controller.abort(), queryTimeout); // 90秒または8秒

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

      // スライダー（ボタン）の設定値を上書き
      queryJson.speedScale = speed;
      queryJson.pitchScale = pitch;
      queryJson.intonationScale = intonation;

      const synthesisUrl = `${trimmedUrl}/synthesis?speaker=${selectedSpeaker}`;
      
      const synthController = new AbortController();
      const synthTimeout = isHuggingFace ? 90000 : 15000;
      const synthTimeoutId = setTimeout(() => synthController.abort(), synthTimeout);

      const synthRes = await fetch(synthesisUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
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
        reader.onloadend = () => {
          const resultStr = reader.result as string;
          const base64 = resultStr.split(',')[1];
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('音声データのエンコードに失敗しました。'));
        reader.readAsDataURL(blob);
      });

      // Androidでの再生エラーを回避するため、一時ファイルに保存して再生 (expo-file-system v19 API)
      const tempFile = new File(Paths.cache, 'temp-voice.wav');
      tempFile.write(base64Data, { encoding: 'base64' });

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: tempFile.uri },
        { shouldPlay: true }
      );
      soundObject = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });

    } catch (err: any) {
      console.warn(err);
      const msg = err.name === 'AbortError' 
        ? '接続がタイムアウトしました。クラウドサーバーの起動中か、PCのVOICEVOXが起動しているか確認してください🐾'
        : (err.message || '再生に失敗しました🐾');
      Alert.alert('テスト再生エラー', msg);
    } finally {
      setTesting(false);
      setIsHfWaking(false);
    }
  };

  const handleSave = async () => {
    if (!profile) {
      Alert.alert('エラー', 'ペット情報が見つかりません🐾');
      return;
    }

    setSaving(true);
    try {
      let speakerName = '四国めたん';
      if (speakers.length > 0) {
        const foundSp = speakers.find(s => s.speaker_uuid === selectedSpeakerUuid);
        const foundStyle = foundSp?.styles.find((st: any) => st.id === selectedSpeaker);
        if (foundSp && foundStyle) {
          speakerName = `${foundSp.name} (${foundStyle.name})`;
        }
      } else {
        const selectedSpeakerObj = voicevoxSpeakers.find(s => s.id === selectedSpeaker);
        speakerName = selectedSpeakerObj ? selectedSpeakerObj.name : '四国めたん';
      }

      const updatedProfile = {
        ...profile,
        voice_settings: {
          speaker_id: selectedSpeaker,
          speaker_uuid: selectedSpeakerUuid || undefined,
          speaker_name: speakerName,
          speedScale: speed,
          pitchScale: pitch,
          intonationScale: intonation,
        }
      };

      // 1. ローカルに保存
      await AsyncStorage.setItem('pet_profile', JSON.stringify(updatedProfile));

      // 2. クラウド（スプレッドシートDB）にも自動で同期
      try {
        const savedUserId = await AsyncStorage.getItem('pet_user_id');
        if (savedUserId) {
          const proxyUrl = "https://script.google.com/macros/s/AKfycby_yneEPDfmGGpGrZwCgEWt3KIQxZ_5V5LgX_8z9ItloS_Pg0p-SxsAqBW0OFdWa_WFog/exec";
          const syncRes = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'save_profile',
              user_id: savedUserId,
              profile: updatedProfile
            })
          });
          if (!syncRes.ok) {
            console.warn('クラウドDBとの同期に失敗しました（ステータス異常）');
          }
        }
      } catch (cloudErr) {
        console.warn('クラウドDBへの同期中に例外が発生しました:', cloudErr);
      }

      setProfile(updatedProfile);
      Alert.alert('成功', '音声設定を保存しました🐾');
      router.back();
    } catch (err) {
      console.error(err);
      Alert.alert('エラー', '設定の保存に失敗しました🐾');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#C72C48" />
        <Text style={styles.loadingText}>読み込み中...🐾</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>☁️ VOICEVOX 接続ステータス</Text>
          <Text style={styles.helpText}>
            現在、管理アプリ側で設定されたクラウド（Hugging Face Spaces）またはPCの音声合成サーバーに自動接続しています🐾
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF0F2', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FFD0D6' }}>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#5D4F4F', flex: 1, marginRight: 8 }} numberOfLines={1}>
              📡 {apiUrl ? apiUrl.replace(/https?:\/\//, '') : '未接続（管理画面で設定してください）'}
            </Text>
            <TouchableOpacity 
              style={styles.btnReloadSpeakers} 
              onPress={() => fetchSpeakers(apiUrl, selectedSpeaker)}
              disabled={loadingSpeakers}
            >
              {loadingSpeakers ? (
                <ActivityIndicator color="#C72C48" size="small" />
              ) : (
                <Text style={styles.btnReloadSpeakersText}>🔄 更新</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🗣️ 声のキャラクター選択</Text>
          {loadingSpeakers ? (
            <View style={{ alignItems: 'center', marginVertical: 20 }}>
              <ActivityIndicator color="#C72C48" />
              {isHfWaking && (
                <Text style={[styles.helpText, { color: '#C72C48', marginTop: 8, textAlign: 'center', fontWeight: 'bold' }]}>
                  ☁️ クラウド音声サーバーを起動しています...🐾{"\n"}
                  初回接続（スリープからの復旧）には1分〜1分半ほどかかります。画面を閉じずにお待ちください。
                </Text>
              )}
            </View>
          ) : speakers.length > 0 ? (
            <View>
              <Text style={styles.helpText}>VOICEVOXから動的取得した全キャラ・全スタイルです🐾</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.speakerScroll}
              >
                {speakers.map(sp => {
                  const isSelected = selectedSpeakerUuid === sp.speaker_uuid;
                  return (
                    <TouchableOpacity
                      key={sp.speaker_uuid}
                      style={[styles.speakerChip, isSelected && styles.speakerChipActive]}
                      onPress={() => {
                        setSelectedSpeakerUuid(sp.speaker_uuid);
                        if (sp.styles && sp.styles.length > 0) {
                          setSelectedSpeaker(sp.styles[0].id);
                        }
                      }}
                    >
                      <Text style={[styles.speakerChipText, isSelected && styles.speakerChipTextActive]}>
                        {sp.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {(() => {
                const currentSpeaker = speakers.find(s => s.speaker_uuid === selectedSpeakerUuid);
                const currentStyles = currentSpeaker?.styles || [];
                if (currentStyles.length === 0) return null;
                return (
                  <View style={{ marginTop: 16 }}>
                    <Text style={styles.groupLabel}>✨ 声のスタイル (感情・トーン)</Text>
                    <View style={styles.styleGrid}>
                      {currentStyles.map((st: any) => {
                        const isStyleSelected = selectedSpeaker === st.id;
                        return (
                          <TouchableOpacity
                            key={st.id}
                            style={[styles.styleBtn, isStyleSelected && styles.styleBtnActive]}
                            onPress={() => setSelectedSpeaker(st.id)}
                          >
                            <Text style={[styles.styleBtnText, isStyleSelected && styles.styleBtnTextActive]}>
                              {st.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })()}
            </View>
          ) : (
            <View>
              <Text style={[styles.helpText, { color: '#C72C48', fontWeight: 'bold' }]}>
                ⚠️ VOICEVOX接続エラーのため、標準キャラクターのみを表示しています。
              </Text>
              <Text style={styles.groupLabel}>🌸 女の子向け（女性）</Text>
              <View style={styles.speakerGrid}>
                {voicevoxSpeakers.filter(s => s.type === '女性').map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.speakerBtn, selectedSpeaker === s.id && styles.speakerBtnActive]}
                    onPress={() => setSelectedSpeaker(s.id)}
                  >
                    <Text style={[styles.speakerName, selectedSpeaker === s.id && styles.speakerTextActive]}>
                      {s.name}
                    </Text>
                    <Text style={[styles.speakerDesc, selectedSpeaker === s.id && styles.speakerDescActive]}>
                      {s.desc.slice(0, 12)}...
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.groupLabel, { marginTop: 16 }]}>💎 男の子向け（男性・中性）</Text>
              <View style={styles.speakerGrid}>
                {voicevoxSpeakers.filter(s => s.type === '男性' || s.id === 3).map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.speakerBtn, selectedSpeaker === s.id && styles.speakerBtnActive]}
                    onPress={() => setSelectedSpeaker(s.id)}
                  >
                    <Text style={[styles.speakerName, selectedSpeaker === s.id && styles.speakerTextActive]}>
                      {s.name}
                    </Text>
                    <Text style={[styles.speakerDesc, selectedSpeaker === s.id && styles.speakerDescActive]}>
                      {s.desc.slice(0, 12)}...
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🎛️ 音声パラメータ微調整</Text>
          <View style={styles.paramRow}>
            <View style={styles.paramInfo}>
              <Text style={styles.paramLabel}>話速 (スピード)</Text>
              <Text style={styles.paramValue}>{speed.toFixed(2)} 倍</Text>
            </View>
            <View style={styles.controlRow}>
              <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustValue(speed, setSpeed, -0.05, 0.50, 2.00)}>
                <Text style={styles.adjustBtnText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustValue(speed, setSpeed, 0.05, 0.50, 2.00)}>
                <Text style={styles.adjustBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.paramRow}>
            <View style={styles.paramInfo}>
              <Text style={styles.paramLabel}>音高 (ピッチ)</Text>
              <Text style={styles.paramValue}>{pitch > 0 ? `+${pitch.toFixed(2)}` : pitch.toFixed(2)}</Text>
            </View>
            <View style={styles.controlRow}>
              <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustValue(pitch, setPitch, -0.01, -0.15, 0.15)}>
                <Text style={styles.adjustBtnText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustValue(pitch, setPitch, 0.01, -0.15, 0.15)}>
                <Text style={styles.adjustBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* 抑揚 (intonationScale) */}
          <View style={styles.paramRow}>
            <View style={styles.paramInfo}>
              <Text style={styles.paramLabel}>抑揚 (イントネーション)</Text>
              <Text style={styles.paramValue}>{intonation.toFixed(2)}</Text>
            </View>
            <View style={styles.controlRow}>
              <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustValue(intonation, setIntonation, -0.05, 0.00, 2.00)}>
                <Text style={styles.adjustBtnText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustValue(intonation, setIntonation, 0.05, 0.00, 2.00)}>
                <Text style={styles.adjustBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* プレビュー・保存セクション */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={[styles.btnTestPlay, testing && { opacity: 0.6 }]} 
            onPress={testing ? undefined : handleTestPlay}
          >
            {testing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <ActivityIndicator color="#C72C48" />
                <Text style={{ color: '#C72C48', fontWeight: 'bold' }}>
                  {isHfWaking ? 'サーバー起動中 (最大90秒)...🐾' : '音声合成中...🐾'}
                </Text>
              </View>
            ) : (
              <Text style={styles.btnTestPlayText}>🔊 この声でテスト再生する</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.btnSave, saving && { opacity: 0.6 }]} 
            onPress={saving ? undefined : handleSave}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnSaveText}>💾 設定を保存する</Text>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFBFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFBFB',
  },
  loadingText: {
    marginTop: 12,
    color: '#7D6363',
    fontSize: 14,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFBFB',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 182, 193, 0.4)',
    padding: 16,
    marginBottom: 16,
    shadowColor: 'rgba(255, 128, 150, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 2,
  },
  sectionTitle: {
    color: '#C72C48',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#7D6363',
    lineHeight: 16,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FFD0D6',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: '#3D2D2D',
    fontSize: 14,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#C72C48',
    marginVertical: 8,
  },
  speakerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  speakerBtn: {
    width: '48%',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FFD0D6',
    borderRadius: 12,
    padding: 10,
    justifyContent: 'center',
  },
  speakerBtnActive: {
    backgroundColor: '#C72C48',
    borderColor: '#C72C48',
  },
  speakerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3D2D2D',
  },
  speakerTextActive: {
    color: '#FFF',
  },
  speakerDesc: {
    fontSize: 10,
    color: '#7D6363',
    marginTop: 2,
  },
  speakerDescActive: {
    color: '#FFEAEA',
  },
  paramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FFF0F2',
  },
  paramInfo: {
    flex: 1,
  },
  paramLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3D2D2D',
  },
  paramValue: {
    fontSize: 13,
    color: '#C72C48',
    fontWeight: 'bold',
    marginTop: 2,
  },
  controlRow: {
    flexDirection: 'row',
    gap: 12,
  },
  adjustBtn: {
    width: 44,
    height: 38,
    backgroundColor: '#FFF0F2',
    borderWidth: 1,
    borderColor: '#FFD0D6',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustBtnText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#C72C48',
  },
  actionContainer: {
    marginTop: 8,
    gap: 12,
  },
  btnTestPlay: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#C72C48',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnTestPlayText: {
    color: '#C72C48',
    fontWeight: 'bold',
    fontSize: 15,
  },
  btnSave: {
    backgroundColor: '#C72C48',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: 'rgba(199, 44, 72, 0.3)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  btnSaveText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  btnReloadSpeakers: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FFD0D6',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnReloadSpeakersText: {
    color: '#C72C48',
    fontWeight: 'bold',
    fontSize: 13,
  },
  speakerScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
    marginBottom: 8,
  },
  speakerChip: {
    backgroundColor: '#FFF0F2',
    borderWidth: 1,
    borderColor: '#FFD0D6',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakerChipActive: {
    backgroundColor: '#C72C48',
    borderColor: '#C72C48',
  },
  speakerChipText: {
    color: '#3D2D2D',
    fontSize: 13,
    fontWeight: 'bold',
  },
  speakerChipTextActive: {
    color: '#FFF',
  },
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  styleBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FFD0D6',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleBtnActive: {
    backgroundColor: '#C72C48',
    borderColor: '#C72C48',
  },
  styleBtnText: {
    color: '#3D2D2D',
    fontSize: 12,
    fontWeight: 'bold',
  },
  styleBtnTextActive: {
    color: '#FFF',
  },
});
