/**
 * [main.js] v3.3.1
 */
var C, D, O, LoginM, LoginL;

try {
    // 각 모듈의 로드 상태를 개별적으로 확인
    C = Bridge.getScopeOf("modules/Const.js").bridge();
    D = Bridge.getScopeOf("modules/common/database.js").bridge();
    O = Bridge.getScopeOf("modules/common/object.js").bridge();
    LoginM = Bridge.getScopeOf("modules/common/login/menu.js").bridge();
    
    // ⭐️ 문제의 7번 라인: 파일이 없으면 여기서 에러가 발생합니다.
    var scopeLoginL = Bridge.getScopeOf("modules/common/login/logic.js");
    if (!scopeLoginL) throw new Error("modules/common/login/logic.js 파일이 없습니다!");
    LoginL = scopeLoginL.bridge();

} catch (e) {
    // 초기 로드 실패 시 응답기능을 에러 알림으로 대체
    function response(room, msg, sender, isGroupChat, replier) {
        if (msg.includes("테스트") || msg.includes("메뉴")) {
            replier.reply("🚨 [시스템 초기화 에러]\n사유: " + e.message + "\n\n파일 경로를 확인해주세요.");
        }
    }
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

        if (C && msg === C.Prefix + "테스트") {
            return replier.reply("✅ [v3.3.1] 정상 작동 중");
        }

        if (C && !session.data && msg === C.Prefix + "메뉴") {
            if (isGroupChat) return replier.reply("개인톡에서 이용해 주세요.");
            session.isMenuOpen = true;
            return replier.reply(LoginM.render(false));
        }

        if (!session.data && !isGroupChat && (session.isMenuOpen || session.waitAction)) {
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
