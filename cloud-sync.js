/**
 * 吹奏楽専用カレンダー 真のクラウドリアルタイム自動同期エンジン (Central Cloud Store)
 */

export async function fetchCentralCloudData() {
  try {
    const res = await fetch('data.json?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    console.log('Cloud data fetch notice:', e);
  }
  return null;
}

export async function pushCentralCloudData(practices, repertoire) {
  const token = localStorage.getItem('brass_band_gh_token');
  if (!token) return false;

  try {
    const GITHUB_REPO = 'mtmotodevworkspace-arch/brass-band-calendar';
    const getRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data.json`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github+json'
      }
    });

    let sha = '';
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha || '';
    }

    const payload = {
      practices,
      repertoire,
      version: 'v20',
      updatedAt: new Date().toISOString()
    };

    const contentStr = JSON.stringify(payload, null, 2);
    const encodedContent = btoa(unescape(encodeURIComponent(contentStr)));

    const bodyData = {
      message: 'cloud(sync): Auto-sync practice schedule data from web app',
      content: encodedContent
    };
    if (sha) bodyData.sha = sha;

    const putRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/data.json`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyData)
    });

    if (putRes.ok) {
      console.log('✅ Central Cloud Storage updated successfully!');
      return true;
    }
  } catch (e) {
    console.error('Failed to push central cloud data:', e);
  }
  return false;
}
