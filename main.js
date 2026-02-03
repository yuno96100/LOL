/**
 * [main.js] v3.4.0
 * 파일 시스템 직접 검증 버전
 */

var C = null, D = null, O = null, LoginM = null, LoginL = null;
var diag = "";

function loadModule(path) {
    try {
        // 1. 실제 파일이 물리적으로 존재하는지 먼저 확인
        var file = new java.io.File("/sdcard/msgbot/Bots/main/" + path);
        if (!file.exists()) return { status: "❌ 물리적 파일 없음", scope: null };

        // 2. Bridge 시도
        var scope = Bridge.getScopeOf(path);
        if (!scope) return { status: "❌ Bridge 로드 실패 (null)", scope: null };

        return { status: "✅ 성공", scope: scope };
    } catch (e) {
        return { status: "🚨 오류: " + e.message, scope: null };
    }
}

// 모듈 로드 실행
var resC = loadModule("modules/Const.js");
if (resC.scope) C = resC.scope.bridge();

var resD = loadModule("modules/common/database.js");
if (resD.scope) D = resD.scope.bridge();

var resO = loadModule("modules/common/object.js");
if (resO.scope) O = resO.scope.bridge();

var resM = loadModule("modules/common/login/menu.js");
if (resM.scope) LoginM = resM.scope.bridge();

var resL = loadModule("modules/common/login/logic.js");
if (resL.scope) {
    LoginL = resL.scope.bridge();
}

// 진단 결과 로그 생성
diag = "C: " + resC.status + "\nD: " + resD.status + "\nO: " + resO.status + "\nM: " + resM.status + "\nL: " + resL.status;

if (!global.sessions) global.sessions = {};

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (!msg) return;
    msg = msg.trim();

    if (!global.sessions[sender]) {
        global.sessions[sender] = { isMenuOpen: false, data: null, waitAction: null, id: sender };
    }
    var session = global.sessions[sender];

    // 테스트 명령어
    var prefix = (C && C.Prefix) ? C.Prefix : ".";
    if (msg === prefix + "테스트") {
        var report = "🔍 [v3.4.0 물리적 경로 진단]\n" + "━".repeat(12) + "\n" + diag;
        if (LoginL) report += "\n" + "━".repeat(12) + "\n✨ 전 시스템 가동 준비 완료!";
        return replier.reply(report);
    }

    try {
        if (msg === "취소") {
            session.isMenuOpen = false; session.waitAction = null;
            return replier.reply("❌ 취소되었습니다.");
        }

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
        replier.reply("🚨 에러: " + e.message);
    }
}
