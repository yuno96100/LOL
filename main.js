/**
 * [main.js] v3.2.1
 * 생존 신고 및 모듈 로드 상태 확인 버전
 */

var C = null, D = null, O = null, LoginM = null, LoginL = null;

// 모듈 로드 상태를 확인하기 위한 변수
var loadStatus = "";

try {
    C = Bridge.getScopeOf("modules/Const.js").bridge();
    loadStatus += "✅ Const 로드 완료\n";
} catch(e) { loadStatus += "❌ Const 로드 실패\n"; }

try {
    D = Bridge.getScopeOf("modules/common/database.js").bridge();
    loadStatus += "✅ Database 로드 완료\n";
} catch(e) { loadStatus += "❌ Database 로드 실패\n"; }

try {
    O = Bridge.getScopeOf("modules/common/object.js").bridge();
    LoginM = Bridge.getScopeOf("modules/common/login/menu.js").bridge();
    LoginL = Bridge.getScopeOf("modules/common/login/logic.js").bridge();
    loadStatus += "✅ 공통 모듈 로드 완료";
} catch(e) { loadStatus += "❌ 일부 공통 모듈 누락"; }

if (!global.sessions) global.sessions = {};

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (!msg) return;
    msg = msg.trim();

    // 1. 최우선 테스트 (Prefix 상관없이 반응)
    if (msg === "핑") {
        return replier.reply("퐁! 🏓\n현재 모듈 로드 상태:\n" + loadStatus);
    }

    // 2. Prefix 테스트
    if (C && msg === C.Prefix + "테스트") {
        return replier.reply("✅ 시스템 응답 정상 (Prefix: " + C.Prefix + ")");
    }

    if (!global.sessions[sender]) {
        global.sessions[sender] = { isMenuOpen: false, data: null, waitAction: null, id: sender };
    }
    var session = global.sessions[sender];

    try {
        if (msg === "취소") {
            session.isMenuOpen = false; session.waitAction = null;
            return replier.reply("❌ 취소되었습니다.");
        }

        // 로그인 전 로직
        if (!session.data && C && msg === C.Prefix + "메뉴") {
            if (isGroupChat) return replier.reply("개인톡으로 와주세요.");
            if (LoginM) {
                session.isMenuOpen = true;
                return replier.reply(LoginM.render(false));
            }
        }
    } catch (e) {
        replier.reply("🚨 에러: " + e.message);
    }
}
