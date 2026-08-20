/**
 * 吹奏楽専用カレンダー Real-time Cloud Synchronization Engine (Firebase Firestore)
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Default Firebase Configuration (Can be updated via UI settings modal)
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBrassBandCalendarOfficialConfig2026",
  authDomain: "brass-band-calendar.firebaseapp.com",
  projectId: "brass-band-calendar",
  storageBucket: "brass-band-calendar.appspot.com",
  messagingSenderId: "102938475610",
  appId: "1:102938475610:web:8f9a0b1c2d3e4f5a6b7c8d"
};

let db = null;
let isCloudSynced = false;

export function initFirebaseSync(onPracticesSync, onRepertoireSync, onStatusChange) {
  try {
    const savedConfigStr = localStorage.getItem('brass_band_firebase_config_v1');
    const activeConfig = savedConfigStr ? JSON.parse(savedConfigStr) : DEFAULT_FIREBASE_CONFIG;

    if (!activeConfig || !activeConfig.projectId) return false;

    const app = initializeApp(activeConfig);
    db = getFirestore(app);

    // Real-time listener for Practices
    onSnapshot(collection(db, 'practices'), (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data());
      });
      if (list.length > 0) {
        onPracticesSync(list);
      }
    }, (err) => {
      console.log('Firebase Firestore live sync notice:', err.message);
      if (onStatusChange) onStatusChange(false, '📁 ローカルストレージ動作中 (Firebase接続待機)');
    });

    // Real-time listener for Repertoire Library
    onSnapshot(collection(db, 'repertoire'), (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data());
      });
      if (list.length > 0) {
        onRepertoireSync(list);
      }
    }, (err) => {
      console.log('Firebase Firestore live sync notice:', err.message);
    });

    isCloudSynced = true;
    if (onStatusChange) onStatusChange(true, '🟢 クラウド自動同期中 (リアルタイム)');
    return true;
  } catch (e) {
    console.log('Firebase sync initialization fallback to local storage:', e.message);
    if (onStatusChange) onStatusChange(false, '📁 ローカルストレージ動作中');
    return false;
  }
}

export async function syncPracticeToCloud(practice) {
  if (!db || !practice || !practice.id) return;
  try {
    await setDoc(doc(db, 'practices', practice.id), {
      ...practice,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to sync practice to cloud:', e);
  }
}

export async function deletePracticeFromCloud(practiceId) {
  if (!db || !practiceId) return;
  try {
    await deleteDoc(doc(db, 'practices', practiceId));
  } catch (e) {
    console.error('Failed to delete practice from cloud:', e);
  }
}

export async function syncRepertoireToCloud(song) {
  if (!db || !song || !song.id) return;
  try {
    await setDoc(doc(db, 'repertoire', song.id), {
      ...song,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to sync repertoire song to cloud:', e);
  }
}

export async function deleteRepertoireFromCloud(songId) {
  if (!db || !songId) return;
  try {
    await deleteDoc(doc(db, 'repertoire', songId));
  } catch (e) {
    console.error('Failed to delete repertoire song from cloud:', e);
  }
}
