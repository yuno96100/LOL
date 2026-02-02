/**
 * [main.js] v3.3.2
 */
var C, D, O, LoginM, LoginL;
var errorLog = "";

try {
    // 파일 경로 변수화 (디버깅 용도)
    var path_C = "modules/Const.js";
    var path_Logic = "modules/common/login/logic.js";

    C = Bridge.getScopeOf(path_C).bridge();
    D = Bridge.getScopeOf("modules/common/database.js").bridge();
    O = Bridge.getScopeOf("modules/common/object.js").bridge();
    LoginM = Bridge.getScopeOf("modules/common/login/menu.js").bridge();
    
    // ⭐️ 문제의 logic.js 로드 시도
    var scopeL = Bridge.getScopeOf(path_Logic);
    if (!scopeL) {
        errorLog = "❌ 파일을 찾을 수 없음: " + path_Logic;
    } else {
        LoginL = scopeL.bridge();
    }
} catch (e) {
    errorLog = "🚨 로드 중 오류: " + e.message;
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
        if (msg === "취소") {
            session.isMenuOpen = false;
            session.waitAction = null;
            return replier.reply("❌ 취소되었습니다.");
        }

        // ⭐️ [디버깅] 테스트 입력 시 상태 보고
        if (msg === (C ? C.Prefix : ".") + "테스트") {
            if (errorLog) {
                return replier.reply("⚠️ [로드 실패 알림]\n" + errorLog + "\n\n💡 해결법: 깃허브의 version.json 경로가 " + path_Logic + "와 일치하는지 확인하세요.");
            }
            return replier.reply("✅ [v3.3.2] 모든 모듈 로드 성공!\nPrefix: " + C.Prefix);
        }

        // 정상 로직 (LoginL이 있을 때만 실행)
        if (C && !session.data && msg === C.Prefix + "메뉴") {
            if (isGroupChat) return replier.reply("개인톡에서 이용해 주세요.");
            session.isMenuOpen = true;
            return replier.reply(LoginM.render(false));
        }

        if (LoginL && !session.data && !isGroupChat && (session.isMenuOpen || session.waitAction)) {
            if (session.waitAction) return replier.reply(LoginL.handleWait(msg, session, D, O));
            if (!isNaN(msg)) {
                var res = LoginL.execute(msg, session);
                if (res && res.msg) replier.reply(res.msg);
            }
        }

    } catch (e) {
        replier.reply("🚨 실행 에러: " + e.message);
    }
}
