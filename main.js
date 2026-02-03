/**
 * [main.js] v3.4.7
 * 경로 유연성 강화 버전
 */
var C = null, D = null, O = null, L = null;
var errorLog = "";

// ⭐️ 똑똑한 모듈 로더 함수
function smartLoad(path) {
    // 1. 기본 경로 시도 (modules/Login.js)
    var sc = Bridge.getScopeOf(path);
    // 2. 실패 시 앞에 슬래시 붙여서 시도 (/modules/Login.js)
    if (!sc) sc = Bridge.getScopeOf("/" + path);
    // 3. 실패 시 modules 폴더 없이 시도
    if (!sc) sc = Bridge.getScopeOf(path.replace("modules/", ""));
    
    if (sc) return sc.bridge();
    return null;
}

try {
    C = smartLoad("modules/Const.js");
    D = smartLoad("modules/common/database.js");
    O = smartLoad("modules/common/object.js");
    L = smartLoad("modules/Login.js");

    if (!C) errorLog += "Const.js 미발견\n";
    if (!D) errorLog += "database.js 미발견\n";
    if (!O) errorLog += "object.js 미발견\n";
    if (!L) errorLog += "Login.js 미발견\n";

} catch (e) {
    errorLog = "🚨 로드 에러: " + e.message;
}

if (!global.sessions) global.sessions = {};

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (!msg) return;
    msg = msg.trim();

    if (!global.sessions[sender]) {
        global.sessions[sender] = { isMenuOpen: false, data: null, waitAction: null, id: sender };
    }
    var session = global.sessions[sender];

    try {
        var prefix = (C && C.Prefix) ? C.Prefix : ".";

        if (msg === "취소") {
            session.isMenuOpen = false; session.waitAction = null;
            return replier.reply("❌ 취소되었습니다.");
        }

        if (msg === prefix + "테스트") {
            if (errorLog) return replier.reply("⚠️ [로드 실패 목록]\n" + errorLog + "\n💡 업데이트 봇의 BASE_ROOT와 봇 폴더명이 일치하는지 확인하세요.");
            return replier.reply("✅ [v3.4.7] 모든 모듈 로드 성공!");
        }

        if (L && C) {
            if (!session.data && msg === C.Prefix + "메뉴") {
                if (isGroupChat) return replier.reply("개인톡에서 이용해 주세요.");
                session.isMenuOpen = true;
                return replier.reply(L.render(false));
            }

            if (!session.data && !isGroupChat && (session.isMenuOpen || session.waitAction)) {
                if (session.waitAction) return replier.reply(L.handleWait(msg, session, D, O));
                if (!isNaN(msg)) {
                    var res = L.execute(msg, session);
                    if (res && res.msg) replier.reply(res.msg);
                }
            }
        }
    } catch (e) {
        replier.reply("🚨 에러: " + e.message);
    }
}
