/**
 * [main.js] v3.3.8
 * 괄호 구조 및 모듈 로드 정밀 교정본
 */

var C = null, D = null, O = null, LoginM = null, LoginL = null;
var errorLog = "";

try {
    // 1. 기초 모듈 로드
    var scC = Bridge.getScopeOf("modules/Const.js");
    var scD = Bridge.getScopeOf("modules/common/database.js");
    var scO = Bridge.getScopeOf("modules/common/object.js");
    var scLM = Bridge.getScopeOf("modules/common/login/menu.js");
    var scLL = Bridge.getScopeOf("modules/common/login/logic.js");

    if (scC) C = scC.bridge();
    if (scD) D = scD.bridge();
    if (scO) O = scO.bridge();
    if (scLM) LoginM = scLM.bridge();
    
    // 2. Logic 모듈 정밀 로드
    if (scLL) {
        LoginL = scLL.bridge();
        if (!LoginL) errorLog = "❌ logic.js의 bridge() 리턴값이 없습니다.";
    } else {
        errorLog = "❌ logic.js 파일을 찾을 수 없습니다.";
    }
} catch (e) {
    errorLog = "🚨 초기화 오류: " + e.message + " (L:" + e.lineNumber + ")";
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
        // [공통] 취소 로직
        if (msg === "취소") {
            session.isMenuOpen = false;
            session.waitAction = null;
            return replier.reply("❌ 취소되었습니다.");
        }

        // [점검] 테스트 로직
        var prefix = (C && C.Prefix) ? C.Prefix : ".";
        if (msg === prefix + "테스트") {
            if (errorLog) return replier.reply("⚠️ 진단 결과:\n" + errorLog);
            return replier.reply("✅ [v3.3.8] 시스템 정상 가동 중!");
        }

        // [비로그인] 메뉴 호출
        if (C && !session.data && msg === C.Prefix + "메뉴") {
            if (isGroupChat) return replier.reply("개인톡에서 이용해 주세요.");
            if (LoginM) {
                session.isMenuOpen = true;
                return replier.reply(LoginM.render(false));
            }
        }

        // [입력 처리]
        if (!session.data && !isGroupChat && (session.isMenuOpen || session.waitAction)) {
            if (!LoginL) return replier.reply("❌ 로직 모듈 로드 실패 상태입니다.");
            
            if (session.waitAction) {
                return replier.reply(LoginL.handleWait(msg, session, D, O));
            }
            
            if (!isNaN(msg)) {
                var res = LoginL.execute(msg, session);
                if (res && res.msg) replier.reply(res.msg);
            }
        }
    } catch (e) {
        replier.reply("🚨 실행 에러: " + e.message + " (L:" + e.lineNumber + ")");
    }
}
