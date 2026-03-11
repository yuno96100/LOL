// =======섹터번호 1=======
// (새 파일 최상단)
//=== 수정 시작 ===
/**
 * [mybot 비서 봇] v1.0.0 (Gemini API 전용)
 */

var MYBOT_HASH = "1249612734"; 

// 🔑 제미나이 API 키 (필수)
var GEMINI_KEY = "여기에_제미나이_API_키를_넣으세요";

function askGemini(prompt) {
    try {
        var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=" + GEMINI_KEY;
        var payload = JSON.stringify({
            "contents": [{"parts": [{"text": prompt}]}]
        });
        
       