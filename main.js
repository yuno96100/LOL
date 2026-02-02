/**
 * [main.js]
 * 세션 기반 메인 컨트롤러 (v3.2.0)
 */

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
        global.sessions[sender] = { isMenuOpen: false, data: null, waitAction: null, id: sender };
    }
    var session = global.sessions[sender];

    try {
        // [공통 명령어] 취소
        if (msg === "취소") {
            session.isMenuOpen = false; 
            session.waitAction = null;
            return replier.reply("❌ 모든 작업이 취소되었습니다.");
        }

        // ⭐️ [신규] 테스트 응답 기능
        // Const.js의 Prefix가 '.'이라면 '.테스트'에 반응합니다.
        if (msg === C.Prefix + "테스트") {
            var status = "✅ [시스템 연결 테스트]\n";
            status += "━".repeat(12) + "\n";
            status += "📡 응답 상태: 정상\n";
            status += "🔑 내 해시: " + String(imageDB.getProfileHash()).trim() + "\n";
            status += "📦 현재 버전: " + (C.VERSION || "v3.2.0") + "\n";
            status += "━".repeat(12);
            return replier.reply(status);
        }

        // [인증 체크] 로그인이 안 된 경우
        if (!session.data) {
            if (msg === C.Prefix + "메뉴") {
                if (isGroupChat) {
                    return replier.reply("『 🏰 소환사의 협곡 』\n" + "━".repeat(12) + "\n신원 확인이 필요합니다.\n\n💬 개인톡에서 '" + C.Prefix + "메뉴'를 입력해 가입 및 로그인을 진행해 주세요!\n" + "━".repeat(12));
                } else {
                    session.isMenuOpen = true;
                    return replier.reply(LoginM.render(false));
                }
            }
            if (!isGroupChat && (session.waitAction || session.isMenuOpen)) {
                if (session.waitAction) return replier.reply(LoginL.handleWait(msg, session, D, O));
                if (!isNaN(msg)) {
                    var res = LoginL.execute(msg, session);
                    if (res && res.msg) replier.reply(res.msg);
                }
            }
            return;
        }

        // [로그인 완료 사용자 로직]
        if (msg === C.Prefix + "메뉴") {
            session.isMenuOpen = true;
            var path = isGroupChat ? "modules/group/" : "modules/user/";
            if (room === C.ErrorLogRoom) path = "modules/admin/";
            
            var M = Bridge.getScopeOf(path + "menu.js").bridge();
            return replier.reply(M.render(session.data));
        }

        if (session.isMenuOpen && !isNaN(msg) && !isGroupChat) {
            var UserL = Bridge.getScopeOf("modules/user/logic.js").bridge();
            var res = UserL.execute(msg, session, D, O);
            if (res && res.msg) replier.reply(res.msg);
        }

    } catch (e) {
        var errorMsg = "🚨 [main] 에러 발생\n사유: " + e.message + "\n라인: " + e.lineNumber;
        if (C && C.ErrorLogRoom) Api.replyRoom(C.ErrorLogRoom, errorMsg);
        else replier.reply(errorMsg);
    }
}
