/**
 * GOGOCARE 集氣平台 - API 呼叫層
 * 部署 Apps Script Web App 後，把網址貼到 API_BASE_URL。
 */
(function (global) {
  var API_BASE_URL = 'https://script.google.com/macros/s/AKfycbzkXVNiRteXl7NafcOH-CMqMnHxRkBXZbWZvL2EM0DUXfeM_NAKelQirsLNbwke0N8r/exec';

  function buildUrl(action) {
    return API_BASE_URL + '?action=' + encodeURIComponent(action);
  }

  async function fetchStatus() {
    var res = await fetch(buildUrl('status'), { method: 'GET' });
    if (!res.ok) {
      throw new Error('Network error: ' + res.status);
    }
    return res.json();
  }

  async function submitCheer(name, email, courseId) {
    // Content-Type 使用 text/plain 以避免瀏覽器對 Apps Script 觸發 CORS 預檢請求
    var res = await fetch(buildUrl('cheer'), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        name: name,
        email: email,
        courseId: courseId,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      }),
    });
    if (!res.ok) {
      throw new Error('Network error: ' + res.status);
    }
    return res.json();
  }

  var CheerAPI = {
    fetchStatus: fetchStatus,
    submitCheer: submitCheer,
    API_BASE_URL: API_BASE_URL,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CheerAPI;
  } else {
    global.CheerAPI = CheerAPI;
  }
})(typeof window !== 'undefined' ? window : globalThis);
