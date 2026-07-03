/**
 * GOGOCARE 集氣平台 - Web App 進入點
 * GET  ?action=status  -> 目前集氣數
 * POST ?action=cheer    -> 送出集氣
 *
 * 前端以 Content-Type: text/plain 送出 JSON 字串以避免瀏覽器 CORS 預檢請求，
 * 因此這裡改用 e.postData.contents 手動解析，而非 e.parameter。
 */
function doGet(e) {
  try {
    var action = e && e.parameter && e.parameter.action;
    if (action === 'status') {
      return jsonOutput_(getStatus());
    }
    return jsonOutput_({ success: false, message: '未知的 action: ' + action });
  } catch (err) {
    return jsonOutput_({ success: false, message: err.message });
  }
}

function doPost(e) {
  try {
    var action = e && e.parameter && e.parameter.action;
    var payload = parseRequestBody_(e);
    if (action === 'cheer') {
      return jsonOutput_(cheer(payload));
    }
    return jsonOutput_({ success: false, message: '未知的 action: ' + action });
  } catch (err) {
    return jsonOutput_({ success: false, message: err.message });
  }
}

function parseRequestBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    return {};
  }
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
