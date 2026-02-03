/**
 * [main.js] v3.4.5
 */
var C = Bridge.getScopeOf("modules/Const.js").bridge();
var D = Bridge.getScopeOf("modules/common/database.js").bridge();
var O = Bridge.getScopeOf("modules/common/object.js").bridge();
// ⭐️ 통합된 Login 모듈 하나만 로드
var L = Bridge.getScopeOf("modules/Login.js").bridge();

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
            session.isMenuOpen = false; session.waitAction = null;
            return replier.reply("❌ 취소되었습니다.");
        }

        if (msg === C.Prefix + "테스트") {
            return replier.reply("✅ [v3.4.5] 통합 모듈 로드 성공!");
        }

        // 로그인 전 메뉴 호출 (통합된 L.render 사용)
        if (!session.data && msg === C.Prefix + "메뉴") {
            if (isGroupChat) return replier.reply("개인톡에서 이용해 주세요.");
            session.isMenuOpen = true;
            return replier.reply(L.render(false));
        }

        // 입력 처리 (통합된 L 사용)
        if (!session.data && !isGroupChat && (session.isMenuOpen || session.waitAction)) {
            if (session.waitAction) return replier.reply(L.handleWait(msg, session, D, O));
            if (!isNaN(msg)) {
                var res = L.execute(msg, session);
                if (res && res.msg) replier.reply(res.msg);
            }
        }
    } catch (e) {
        replier.reply("🚨 에러: " + e.message + " (L:" + e.lineNumber + ")");
    }
}
