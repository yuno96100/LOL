// =======섹터번호 1=======
// (파일 최상단)
//=== 수정 시작 ===
/**
 * [mybot 비서 봇] v2.1.0 (접두사 제거 및 도움말 적용)
 */

var MYBOT_HASH = "1249612734"; 

var CONFIG = {
    GEMINI_KEY: "여기에_제미나이_API_키를_넣으세요",
    GH_TOKEN: "ghp_여기에_새로_발급받은_토큰을_넣어주세요", // 🚨 절대 노출 주의!
    GH_OWNER: "yuno96100",
    GH_REPO: "LOL",
    BACKUP_DIR: "backup/" 
};

var STATE_TARGET = "sdcard/msgbot/Bots/mybot/state_target.txt";
var STATE_CODE = "sdcard/msgbot/Bots/mybot/state_code.txt";

var UI = {
    LINE_CHAR: "━", FIXED_LINE: 17,
    getDivider: function() { return Array(this.FIXED_LINE + 1).join(this.LINE_CHAR); },
    render: function(title, content, footer) {
        var res = "『 " + title + " 』\n" + this.getDivider() + "\n" + content;
        if (footer) res += "\n" + this.getDivider() + "\n💡 " + footer;
        return res;
    }
};

function askGemini(prompt) {
    try {
        var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=" + CONFIG.GEMINI_KEY;
        var payload = JSON.stringify({ "contents": [{"parts": [{"text": prompt}]}] });
        var res = org.jsoup.Jsoup.connect(url).header("Content-Type", "application/json").requestBody(payload).ignoreContentType(true).method(org.jsoup.Connection.Method.POST).execute().body();
        return JSON.parse(res).candidates[0].content.parts[0].text;
    } catch(e) { return "🧠 제미나이 응답 오류: " + e.message; }
}

function askGeminiForCode(prompt) {
    try {
        var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=" + CONFIG.GEMINI_KEY;
        var payload = JSON.stringify({ "contents": [{"parts": [{"text": prompt + "\n\n(반드시 마크다운 ```javascript 안이나 텍스트로 완성된 전체 코드만 답변해. 다른 설명은 일절 생략해.)"}]}] });
        var res = org.jsoup.Jsoup.connect(url).header("Content-Type", "application/json").requestBody(payload).ignoreContentType(true).method(org.jsoup.Connection.Method.POST).execute().body();
        var text = JSON.parse(res).candidates[0].content.parts[0].text;
        var match = text.match(/
http://googleusercontent.com/immersive_entry_chip/0

### 📋 누락 로직 보고 및 최종 점검
* **접두사 완벽 제거:** `.업데이트` 단 1개를 제외한 15개 이상의 모든 명령어(도움말, 비서호출, 백업, 복원, 코딩 등)에서 느낌표(`!`)나 마침표(`.`)를 완전히 지웠습니다. 이제 카톡 하듯 자연스럽게 말만 하시면 됩니다.
* **해시확인 삭제:** 불필요해진 `.해시확인` 로직을 update 봇에서 완전히 날려버렸습니다.
* **로직 충돌 방지:** `비서코딩 ` 명령어가 `비서 ` 명령어보다 먼저 조건문을 타도록 설계하여 "비서"라는 글자가 겹쳐서 생기는 꼬임을 완벽하게 차단했습니다.

이제 이 3개의 코드를 순서대로 덮어씌우시고, 카톡방에 `다운봇도움말`, `업로드도움말`, `비서도움말`을 쳐서 메뉴얼이 뜨는지 확인해 보세요!
