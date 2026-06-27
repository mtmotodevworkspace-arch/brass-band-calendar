import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';


export default function RegisterScreen() {
  const router = useRouter();
  const [pageMode, setPageMode] = useState<'register' | 'restore'>('register');

  // 新規登録フォーム用State
  const [ownerName, setOwnerName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [petName, setPetName] = useState('ベル');
  const [petType, setPetType] = useState<'犬' | '猫'>('犬');
  const [breed, setBreed] = useState('ミニチュアダックスフンド');
  const [color, setColor] = useState('レッド');
  const [gender, setGender] = useState<'男の子' | '女の子'>('女の子');
  const [pronoun, setPronoun] = useState('わたし');
  const [birthYear, setBirthYear] = useState('2023');
  const [birthMonth, setBirthMonth] = useState('1');
  const [personality, setPersonality] = useState('元気いっぱいでやんちゃ');
  const [personalityDetail, setPersonalityDetail] = useState('お気に入りのおもちゃをくわえて、得意げに部屋中を走り回っていたこと。');
  const [ownerCall, setOwnerCall] = useState('パパ');
  const [registerLoading, setRegisterLoading] = useState(false);
  
  // 渾身の1枚 (アバター) 用State
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);

  // 画像選択メソッド
  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('写真のアクセス許可', 'プロフィール写真を選択するために写真のアクセス許可が必要です🐾');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      const selectedUri = result.assets[0].uri;
      setAvatarUri(selectedUri);
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          selectedUri,
          [{ resize: { width: 300, height: 300 } }], // アバターサイズに縮小して極めて軽量にする
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        if (manipResult.base64) {
          setAvatarBase64(manipResult.base64);
        }
      } catch (err) {
        console.error('アバター画像圧縮エラー:', err);
        // フォールバックとして元のbase64設定を試みる（もしImagePickerが返していた場合）
        if (result.assets[0].base64) {
          setAvatarBase64(result.assets[0].base64);
        }
      }
    }
  };

  // データ復元用State
  const [restoreName, setRestoreName] = useState('');
  const [restorePin, setRestorePin] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);

  // 新規登録処理
  const handleRegister = async () => {
    const oName = ownerName.trim();
    const pin = pinCode.trim();

    if (!oName) {
      Alert.alert('入力エラー', '⚠️ 飼い主のおなまえを入力してください🐾');
      return;
    }
    if (!pin || pin.length !== 4 || isNaN(Number(pin))) {
      Alert.alert('入力エラー', '⚠️ 暗証番号は4桁の数字を入力してください🐾');
      return;
    }

    try {
      setRegisterLoading(true);

      // VOICEVOX用声設定の自動選定（Gemini API呼び出し）
      let voiceSettings = {
        speaker_id: gender === '女の子' ? 2 : 12,
        speaker_name: gender === '女の子' ? '四国めたん' : '白上虎太郎',
        speedScale: 1.0,
        pitchScale: 0.0,
        intonationScale: 1.0
      };

      try {
        const proxyUrl = 'https://script.google.com/macros/s/AKfycby_yneEPDfmGGpGrZwCgEWt3KIQxZ_5V5LgX_8z9ItloS_Pg0p-SxsAqBW0OFdWa_WFog/exec';
        const aiPrompt = `
          あなたはペットの個性を分析し、最適なVOICEVOXの音声キャラクターと設定値（パラメータ）を決定する専門AIです。
          以下の【ペット情報】を分析し、最もマッチするVOICEVOXのスピーカーID（speaker_id）、スピーカー名（speaker_name）、話速（speedScale: 0.8〜1.5）、音高（pitchScale: -0.1〜0.1）、抑揚（intonationScale: 0.8〜1.5）を選定してください。

          【ペット情報】
          ・名前: ${petName}
          ・性別: ${gender}
          ・種別: ${petType}（品種: ${breed}）
          ・特徴・毛色: ${color}
          ・性格: ${personality}
          ・具体的なエピソード: ${personalityDetail}

          【VOICEVOX 話者リスト】
          ・女の子向け（性別が女の子の場合に優先、ただしキャラクターの性格によって男の子でずんだもん等を選ぶのも可）:
            - 四国めたん (speaker_id: 2, 特徴: おすまし・ツンデレ・知的なお姉さん)
            - ずんだもん (speaker_id: 3, 特徴: 元気・活発・ユーモラスな中性ボイス)
            - 春日部つむぎ (speaker_id: 8, 特徴: 元気なギャル・明るい少女)
            - 雨晴はう (speaker_id: 10, 特徴: 優しくおっとりした看護師・癒やし系)
            - 波音リツ (speaker_id: 9, 特徴: クール・大人っぽいお姉さん)
          ・男の子向け（性別が男の子の場合に優先）:
            - 白上虎太郎 (speaker_id: 12, 特徴: 可愛い少年・甘えん坊)
            - 玄野武宏 (speaker_id: 11, 特徴: 爽やかで知的な青年)
            - 青山龍星 (speaker_id: 13, 特徴: 低音・ダンディで落ち着いた大人の男性)
            - 栗田まろん (speaker_id: 49, 特徴: 中性的で可愛らしい男の子)

          必ず以下のJSONスキーマに従ってJSONテキストのみを出力してください。他の文章や装飾は絶対に出力しないでください。
          {
            "speaker_id": 数値,
            "speaker_name": "スピーカー名",
            "speedScale": 数値（0.8〜1.5の範囲）,
            "pitchScale": 数値（-0.1〜0.1の範囲）,
            "intonationScale": 数値（0.8〜1.5の範囲）
          }
        `;

        const aiResponse = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'generate_text',
            prompt: aiPrompt
          }),
        });

        if (aiResponse.ok) {
          const resData = await aiResponse.json();
          const textResult = resData.candidates?.[0]?.content?.parts?.[0]?.text || 
                             resData.candidates?.[0]?.part?.text || '';
          const jsonMatch = textResult.trim().match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.speaker_id && parsed.speaker_name) {
              voiceSettings = {
                speaker_id: Number(parsed.speaker_id),
                speaker_name: parsed.speaker_name,
                speedScale: Number(parsed.speedScale) || 1.0,
                pitchScale: Number(parsed.pitchScale) || 0.0,
                intonationScale: Number(parsed.intonationScale) || 1.0
              };
            }
          }
        }
      } catch (voiceErr) {
        console.warn('声の自動設定生成に失敗しました。デフォルトを使用します。', voiceErr);
      }

      // 年齢の自動計算
      const currentYear = 2026;
      const currentMonth = 5;
      const totalMonths = (currentYear - Number(birthYear)) * 12 + currentMonth - Number(birthMonth);
      let ageDisplay = '';
      if (totalMonths < 0) ageDisplay = '生後0ヶ月';
      else if (totalMonths < 12) ageDisplay = `子犬/子猫期（生後 ${totalMonths} ヶ月）`;
      else ageDisplay = `成犬/成猫期（ ${Math.floor(totalMonths / 12)} 歳 ${totalMonths % 12} ヶ月）`;

      const profileData = {
        owner_name: oName,
        pin_code: pin,
        name: petName,
        pet_type: petType,
        breed,
        color,
        gender,
        pronoun,
        birth_y: birthYear,
        birth_m: birthMonth,
        personality,
        personality_detail: personalityDetail,
        owner_call: ownerCall,
        age_display: ageDisplay,
        avatarBase64: avatarBase64, // 渾身の1枚をプロフィールDBに保存！
        voice_settings: voiceSettings // 音声設定の保存
      };

      // 安定ハッシュIDの生成
      let hash = 0;
      const str = oName + pin;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      const registeredUserId = 'user_' + Math.abs(hash).toString(36).substring(0, 8);

      // AsyncStorageに保存
      await AsyncStorage.setItem('pet_profile', JSON.stringify(profileData));
      await AsyncStorage.setItem('pet_user_id', registeredUserId);

      // ★ スプレッドシートDBへのプロフィール自動同期 ★
      try {
        const proxyUrl = 'https://script.google.com/macros/s/AKfycby_yneEPDfmGGpGrZwCgEWt3KIQxZ_5V5LgX_8z9ItloS_Pg0p-SxsAqBW0OFdWa_WFog/exec';
        fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'save_profile',
            user_id: registeredUserId,
            profile: profileData
          }),
        }).catch(() => {});
      } catch (err) {
        console.warn('DB同期連携スキップ:', err);
      }

      Alert.alert('登録完了', 'ペットの登録が完了しました🐾', [
        { text: 'OK', onPress: () => router.replace('/album') }
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('エラー', '登録処理中にエラーが発生しました🐾');
    } finally {
      setRegisterLoading(false);
    }
  };

  // 以前のデータ復元処理
  const handleRestore = async () => {
    const oName = restoreName.trim();
    const pin = restorePin.trim();

    if (!oName) {
      Alert.alert('入力エラー', '⚠️ お名前を入力してください🐾');
      return;
    }
    if (!pin || pin.length !== 4) {
      Alert.alert('入力エラー', '⚠️ 暗証番号は4桁の数字を入力してください🐾');
      return;
    }

    try {
      // 登録時と同じIDを生成
      let hash = 0;
      const str = oName + pin;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      const loginUserId = 'user_' + Math.abs(hash).toString(36).substring(0, 8);

      // 1. ローカルのAsyncStorageに保存されたプロフィールと照合
      const savedUserId = await AsyncStorage.getItem('pet_user_id');
      const savedProfileRaw = await AsyncStorage.getItem('pet_profile');

      if (savedUserId === loginUserId && savedProfileRaw) {
        const savedProfile = JSON.parse(savedProfileRaw);
        if (savedProfile.pin_code === pin) {
          Alert.alert('復元完了', '以前のデータを復元しログインしました🐾', [
            { text: 'OK', onPress: () => router.replace('/album') }
          ]);
          return;
        }
      }

      // 2. クラウド（GAS + Google Sheets）からプロフィールデータを復元するフォールバック
      setRestoreLoading(true);
      try {
        const proxyUrl = 'https://script.google.com/macros/s/AKfycby_yneEPDfmGGpGrZwCgEWt3KIQxZ_5V5LgX_8z9ItloS_Pg0p-SxsAqBW0OFdWa_WFog/exec';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        let profileObj: any = null;
        try {
          const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'get_profile',
              user_id: loginUserId
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const text = await response.text();
            try {
              profileObj = JSON.parse(text);
            } catch (parseErr) {
              console.warn('プロフィールJSONのパースに失敗:', parseErr, 'text:', text.slice(0, 200));
            }
          }
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          if (fetchErr.name === 'AbortError') {
            console.warn('クラウドへの接続がタイムアウトしました');
          } else {
            console.warn('クラウドフェッチエラー:', fetchErr);
          }
        }

        if (profileObj && !profileObj.error && profileObj.pin_code === pin) {
          // AsyncStorageにロードして保存
          await AsyncStorage.setItem('pet_profile', JSON.stringify(profileObj));
          await AsyncStorage.setItem('pet_user_id', loginUserId);
          setRestoreLoading(false);
          Alert.alert('復元完了', 'クラウドから以前のデータを復元しログインしました🐾', [
            { text: 'OK', onPress: () => router.replace('/album') }
          ]);
          return;
        }
      } catch (cloudErr) {
        console.warn('クラウドからのデータ復元に失敗しました:', cloudErr);
      } finally {
        setRestoreLoading(false);
      }

      Alert.alert('復元失敗', '⚠️ 指定されたお名前と暗証番号に一致する登録データが見つかりません🐾\n\n※ クラウドおよびデバイスにデータが存在することを確認してください。');
    } catch (e) {
      console.error(e);
      setRestoreLoading(false);
      Alert.alert('エラー', '復元処理中にエラーが発生しました🐾');
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {pageMode === 'restore' ? (
          // --- データ復元 ログイン画面 ---
          <View style={styles.cardContainer}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>🔑 データ復元 ログイン</Text>
              <Text style={styles.cardSubtitle}>以前登録したお名前と暗証番号からデータを完全に復元します🐾</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>👤 飼い主のおなまえ</Text>
              <TextInput
                style={styles.input}
                value={restoreName}
                onChangeText={setRestoreName}
                placeholder="例: 佐藤美咲"
                placeholderTextColor="#A0A0A0"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>🔑 4桁の暗証番号 (PIN)</Text>
              <TextInput
                style={styles.input}
                value={restorePin}
                onChangeText={setRestorePin}
                secureTextEntry
                keyboardType="numeric"
                maxLength={4}
                placeholder="例: 1234"
                placeholderTextColor="#A0A0A0"
              />
            </View>

            <TouchableOpacity style={[styles.btnPrimary, restoreLoading && { opacity: 0.6 }]} onPress={restoreLoading ? undefined : handleRestore}>
              {restoreLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.btnPrimaryText}>🔑 ログインしてデータを復元する</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider} />
            <TouchableOpacity style={styles.btnSecondary} onPress={() => setPageMode('register')}>
              <Text style={styles.btnSecondaryText}>👋 新規登録に戻る</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // --- はじめてのペット登録画面 ---
          <View style={styles.cardContainer}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>🐾 👋 はじめてのペット登録</Text>
              <Text style={styles.cardSubtitle}>愛するうちのコの基本設定を行って、アルバムを開始しましょう🐾</Text>
            </View>

            <Text style={styles.sectionHeader}>👤 1. 飼い主さまとログイン設定 (必須)</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>飼い主のおなまえ</Text>
              <TextInput
                style={styles.input}
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="例: 佐藤美咲"
                placeholderTextColor="#A0A0A0"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>4桁の暗証番号 (例: 1234)</Text>
              <TextInput
                style={styles.input}
                value={pinCode}
                onChangeText={setPinCode}
                secureTextEntry
                keyboardType="numeric"
                maxLength={4}
                placeholder="1234"
                placeholderTextColor="#A0A0A0"
              />
            </View>

            <Text style={styles.sectionHeader}>🐶 2. うちのコの情報</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>ペットの名前</Text>
              <TextInput style={styles.input} value={petName} onChangeText={setPetName} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>動物の種別</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.choiceBtn, petType === '犬' && styles.choiceBtnActive]}
                  onPress={() => setPetType('犬')}
                >
                  <Text style={[styles.choiceText, petType === '犬' && styles.choiceTextActive]}>犬</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.choiceBtn, petType === '猫' && styles.choiceBtnActive]}
                  onPress={() => setPetType('猫')}
                >
                  <Text style={[styles.choiceText, petType === '猫' && styles.choiceTextActive]}>猫</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>犬種・猫種</Text>
              <TextInput style={styles.input} value={breed} onChangeText={setBreed} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>毛色・特徴</Text>
              <TextInput style={styles.input} value={color} onChangeText={setColor} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>性別</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.choiceBtn, gender === '男の子' && styles.choiceBtnActive]}
                  onPress={() => {
                    setGender('男の子');
                    setPronoun('ボク');
                  }}
                >
                  <Text style={[styles.choiceText, gender === '男の子' && styles.choiceTextActive]}>男の子</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.choiceBtn, gender === '女の子' && styles.choiceBtnActive]}
                  onPress={() => {
                    setGender('女の子');
                    setPronoun('わたし');
                  }}
                >
                  <Text style={[styles.choiceText, gender === '女の子' && styles.choiceTextActive]}>女の子</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>うちのコの一人称</Text>
              <TextInput style={styles.input} value={pronoun} onChangeText={setPronoun} placeholder="ボク, わたし, あたし など" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>飼い主さんの呼び方</Text>
              <TextInput style={styles.input} value={ownerCall} onChangeText={setOwnerCall} placeholder="パパ, ママ, お姉ちゃん など" />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>誕生年</Text>
                <TextInput style={styles.input} value={birthYear} onChangeText={setBirthYear} keyboardType="numeric" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>誕生月</Text>
                <TextInput style={styles.input} value={birthMonth} onChangeText={setBirthMonth} keyboardType="numeric" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>性格傾向</Text>
              <TextInput style={styles.input} value={personality} onChangeText={setPersonality} />
            </View>

            <Text style={styles.sectionHeader}>📸 3. ペットの渾身の1枚 (プロフィール写真)</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>アルバムや新聞に常に飾られる、最高のお写真です🐾</Text>
              <TouchableOpacity style={styles.avatarPickerBtn} onPress={pickAvatar}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarPreviewImage} />
                ) : (
                  <View style={styles.avatarPickPlaceholder}>
                    <Text style={styles.avatarPickPlaceholderIcon}>🐶</Text>
                    <Text style={styles.avatarPickPlaceholderText}>渾身の1枚を選択（タップ）🐾</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.btnPrimary, registerLoading && { opacity: 0.6 }]} onPress={registerLoading ? undefined : handleRegister}>
              {registerLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.btnPrimaryText}>💾 この内容で登録する</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider} />
            <Text style={styles.bottomTip}>💡 すでに以前ペットを登録したデータをお持ちですか？</Text>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => setPageMode('restore')}>
              <Text style={styles.btnSecondaryText}>🔑 登録済みデータから復元・ログインする</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFBFB',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  cardContainer: {
    backgroundColor: '#FFFBFB',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 182, 193, 0.4)',
    padding: 20,
    shadowColor: 'rgba(255, 128, 150, 0.08)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 4,
  },
  cardHeader: {
    backgroundColor: '#FFF0F2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 182, 193, 0.4)',
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  cardTitle: {
    color: '#C72C48',
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
  },
  cardSubtitle: {
    color: '#7D6363',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionHeader: {
    color: '#C72C48',
    fontSize: 15,
    fontWeight: 'bold',
    marginVertical: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#555',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FFD0D6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: '#3D2D2D',
    fontSize: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
  },
  choiceBtn: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FFD0D6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  choiceBtnActive: {
    backgroundColor: '#C72C48',
    borderColor: '#C72C48',
  },
  choiceText: {
    color: '#7D6363',
    fontWeight: 'bold',
  },
  choiceTextActive: {
    color: '#FFF',
  },
  btnPrimary: {
    backgroundColor: '#C72C48',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: 'rgba(199, 44, 72, 0.3)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  btnPrimaryText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  btnSecondary: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  btnSecondaryText: {
    color: '#555',
    fontWeight: 'bold',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginVertical: 24,
  },
  bottomTip: {
    color: '#7D6363',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  avatarPickerBtn: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFD0D6',
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFDFD',
  },
  avatarPreviewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarPickPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPickPlaceholderIcon: {
    fontSize: 40,
    marginBottom: 6,
  },
  avatarPickPlaceholderText: {
    color: '#7D6363',
    fontWeight: '600',
    fontSize: 13,
  },
});
