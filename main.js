/**
 * [main.js] v3.4.2
 * 캐시 초기화를 위해 버전 숫자를 높여 재배포합니다.
 */

// 모듈 로드 (가장 표준적인 Bridge 방식)
var C = Bridge.getScopeOf("modules/Const.js").bridge();
var D = Bridge.getScopeOf("modules/common/database.js").bridge();
var O = Bridge.getScopeOf("modules/common/object.js").bridge();
var LoginM = Bridge.getScopeOf("modules/common/login/menu.js").bridge();
var LoginL = Bridge.getScopeOf("modules/common/login/logic.js").bridge();

if (!global.sessions) global.sessions = {};

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (!msg) return;
    msg = msg.trim();

    if (!global.sessions[sender]) {
        global.sessions[sender] = { 
            isMenuOpen: false, 
            data: null, 
            waitAction: null, 
            id: sender 
        };
    }
    var session = global.sessions[sender];

    try {
        if (msg === "취소") {
            session.isMenuOpen = false;
            session.waitAction = null;
            return replier.reply("❌ 취소되었습니다.");
        }

        // 테스트 명령어
        if (msg === C.Prefix + "테스트") {
            return replier.reply("✅ [v3.4.2] 캐시 초기화 및 로드 성공!");
        }

        // 로그인 전 메뉴 호출
        if (!session.data && msg === C.Prefix + "메뉴") {
            if (isGroupChat) return replier.reply("개인톡에서 이용해 주세요.");
            session.isMenuOpen = true;
            return replier.reply(LoginM.render(false));
        }

        // 세션 기반 입력 처리
        if (!session.data && !isGroupChat && (session.isMenuOpen || session.waitAction)) {
            if (session.waitAction) {
                return replier.reply(LoginL.handleWait(msg, session, D, O));
            }
            if (!isNaN(msg)) {
                var res = LoginL.execute(msg, session);
                if (res && res.msg) replier.reply(res.msg);
            }
        }

    } catch (e) {
        replier.reply("🚨 실행 에러: " + e.message + " (Line: " + e.lineNumber + ")");
    }
}
