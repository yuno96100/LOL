// [모듈 로드] Const.js 위치 변경에 따른 경로 수정
var C = Bridge.getScopeOf("modules/Const.js").bridge();
var D = Bridge.getScopeOf("modules/common/database.js").bridge();
var O = Bridge.getScopeOf("modules/common/object.js").bridge();
var LoginM = Bridge.getScopeOf("modules/common/login/menu.js").bridge();
var LoginL = Bridge.getScopeOf("modules/common/login/logic.js").bridge();

if (!global.sessions) global.sessions = {};

function response(room, msg, sender, isGroupChat, replier) {
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

        // [인증 체크] 로그인이 안 된 경우
        if (!session.data) {
            if (msg === C.Prefix + "메뉴") {
                if (isGroupChat) {
                    return replier.reply("『 🏰 소환사의 협곡 』\n" + "━".repeat(12) + "\n신원 확인이 필요합니다.\n\n💬 개인톡에서 '.메뉴'를 입력해\n가입 및 로그인을 진행해 주세요!\n" + "━".repeat(12));
                } else {
                    session.isMenuOpen = true;
                    return replier.reply(LoginM.render(false));
                }
            }
            if (!isGroupChat && (session.waitAction || session.isMenuOpen)) {
                if (session.waitAction) return replier.reply(LoginL.handleWait(msg, session, D, O));
                if (!isNaN(msg)) {
                    var res = LoginL.execute(msg, session);
                    if (res.msg) replier.reply(res.msg);
                }
            }
            return;
        }

        // [로그인 유저] 방별 메뉴 출력
        if (msg === C.Prefix + "메뉴") {
            session.isMenuOpen = true;
            var path = isGroupChat ? "modules/group/" : "modules/user/";
            if (room === C.ErrorLogRoom) path = "modules/admin/";
            
            var M = Bridge.getScopeOf(path + "menu.js").bridge();
            return replier.reply(M.render(session.data));
        }

        // 번호 조작 (개인톡에서만 활성화 예시)
        if (session.isMenuOpen && !isNaN(msg) && !isGroupChat) {
            var UserL = Bridge.getScopeOf("modules/user/logic.js").bridge();
            var res = UserL.execute(msg, session, D, O);
            if (res.msg) replier.reply(res.msg);
        }

    } catch (e) {
        // C.ErrorLogRoom이 정상 로드되어야 작동합니다.
        Api.replyRoom(C.ErrorLogRoom, "🚨 에러: " + e.message);
    }
}
