/* ============================================================
   [SECTION 1] 모듈 로드
   ============================================================ */
var C = Bridge.getScopeOf("Const.js").bridge();
var D = Bridge.getScopeOf("modules/common/database.js").bridge();
var O = Bridge.getScopeOf("modules/common/object.js").bridge();
var LoginM = Bridge.getScopeOf("modules/common/login/menu.js").bridge();
var LoginL = Bridge.getScopeOf("modules/common/login/logic.js").bridge();

if (!global.sessions) global.sessions = {};

function response(room, msg, sender, isGroupChat, replier) {
    if (!msg) return;
    msg = msg.trim();

    if (!global.sessions[sender]) {
        global.sessions[sender] = { isMenuOpen: false, data: null, waitAction: null, currentView: "MAIN" };
    }
    var session = global.sessions[sender];

    try {
        if (msg === "취소") {
            session.isMenuOpen = false; session.waitAction = null;
            return replier.reply("❌ 취소되었습니다.");
        }

        // 1. 방별 경로 설정
        var path = "";
        if (room === C.ErrorLogRoom) path = "modules/admin/";
        else if (room === C.MainRoomName) path = "modules/group/";
        else if (!isGroupChat) path = "modules/user/";
        else return;

        // 2. 방별 모듈 동적 로드
        var M = Bridge.getScopeOf(path + "menu.js").bridge();
        var L = Bridge.getScopeOf(path + "logic.js").bridge();

        // 3. 입력 대기 우선 처리 (로그인/가입 포함)
        if (session.waitAction) {
            if (["로그인", "가입"].indexOf(session.waitAction) !== -1) {
                replier.reply(LoginL.handleWait(msg, session, D, O));
            } else {
                replier.reply(L.handleWait(msg, session, D, O));
            }
            return;
        }

        // 4. 메뉴 호출
        if (msg === C.Prefix + "메뉴") {
            session.isMenuOpen = true;
            if (!session.data) {
                session.currentView = "LOGIN";
                return replier.reply(LoginM.render(false));
            }
            session.currentView = "ROOM";
            return replier.reply(M.render(session.data));
        }

        // 5. 번호 선택
        if (session.isMenuOpen && !isNaN(msg)) {
            var res = (session.currentView === "LOGIN") ? LoginL.execute(msg, session) : L.execute(msg, session, D, O);
            if (res.msg) replier.reply(res.msg);
            if (res.closeMenu) session.isMenuOpen = false;
        }

    } catch (e) {
        Api.replyRoom(C.ErrorLogRoom, "🚨 에러: " + e.message + " (L:" + e.lineNumber + ")");
    }
}
