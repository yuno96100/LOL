/* ============================================================
   [SECTION 1] 라이브러리 안전 로드 (Safe Loading)
   ============================================================ */
var _C, _D, _O, _L, _H;

try {
    _C = Bridge.getScopeOf("Const.js").bridge();
    _D = Bridge.getScopeOf("DataBase.js").bridge();
    _O = Bridge.getScopeOf("Object.js").bridge();
    _L = Bridge.getScopeOf("LoginManager.js").bridge();
    _H = Bridge.getScopeOf("Helper.js").bridge();
} catch (e) {
    // 라이브러리 로드 실패 시 로그 출력 (어떤 파일이 문제인지 확인용)
    Api.replyRoom("소환사의협곡관리", "🚨 라이브러리 로드 실패: " + e.message);
}

// 세션 초기화
if (!global.SESSIONS_V4) global.SESSIONS_V4 = {};
if (!global.ADMIN_QUEUE_V4) global.ADMIN_QUEUE_V4 = {};

/* ============================================================
   [SECTION 2] 메인 엔진 (Response Engine)
   ============================================================ */
function response(room, msg, sender, isGroupChat, replier) {
    if (!msg) return;
    var input = msg.trim();
    
    // 1. 세션 보장
    if (!global.SESSIONS_V4[sender]) {
        global.SESSIONS_V4[sender] = { isMenuOpen: false, data: null, waitAction: null, currentView: "메인" };
    }
    var session = global.SESSIONS_V4[sender];

    // 2. 관리자/방 설정 (라이브러리 로드 실패 대비 방어)
    var errorLogRoom = _C ? _C.ErrorLogRoom : "소환사의협곡관리";
    var mainRoom = _C ? _C.MainRoomName : "소환사의협곡";
    var isAdminRoom = (room === errorLogRoom);
    var isMainRoom = (room === mainRoom);

    try {
        /* [핵심] 메뉴 호출 (.메뉴) - 모든 필터링보다 최우선 */
        if (input === ".메뉴") {
            if (!_H) return replier.reply("🚨 Helper.js 로드 실패로 메뉴를 열 수 없습니다.");
            
            session.isMenuOpen = true;
            session.currentView = "메인";
            session.waitAction = null;
            
            var menuMsg = _H.getMenu(room, isMainRoom, isAdminRoom, !!session.data, "메인", session.data, _D);
            replier.reply(menuMsg);
            return;
        }

        /* 취소 로직 */
        if (input === "취소") {
            session.isMenuOpen = false;
            session.waitAction = null;
            session.currentView = "메인";
            return replier.reply("❌ 모든 작업을 중단합니다.");
        }

        /* 카테고리/숫자 선택 로직 */
        if (session.isMenuOpen && !isNaN(input)) {
            selectionHandler(input, sender, session, replier, room, isMainRoom, isAdminRoom);
            return;
        }

        /* 입력 대기 로직 (가입/로그인 등) */
        if (session.waitAction) {
            inputWaitHandler(sender, input, replier, session, isAdminRoom);
            return;
        }

        /* 관리자 확인 로직 */
        if (isAdminRoom && global.ADMIN_QUEUE_V4[sender]) {
            adminActionHandler(sender, input, replier);
            return;
        }

    } catch (e) {
        Api.replyRoom(errorLogRoom, "🚨 [v2.4.0] 런타임 에러: " + e.message + " (L:" + e.lineNumber + ")");
    }
}

/* ============================================================
   [SECTION 3] 핸들러 함수
   ============================================================ */

function selectionHandler(num, sender, session, replier, room, isMain, isAdmin) {
    if (session.currentView === "유저조회" && isAdmin) {
        var idx = parseInt(num) - 1;
        if (global.tempUserList && global.tempUserList[idx]) {
            var u = _D.readUser(global.tempUserList[idx]);
            if (u) replier.reply("👤 [" + u.info.name + "] 상세\n• LV: " + u.status.level + "\n• GOLD: " + u.status.money + "G");
        }
        return;
    }

    var cmd = _H.getRootCmdByNum(isAdmin, isMain, !!session.data, num);
    if (!cmd) return;

    session.currentView = cmd;

    if (cmd === "유저조회" || cmd === "상점" || cmd === "내정보") {
        var res = _H.getMenu(room, isMain, isAdmin, !!session.data, cmd, session.data, _D);
        if (res) replier.reply(res);
    } else if (cmd === "로그아웃") {
        session.data = null; session.isMenuOpen = false;
        replier.reply("🚪 로그아웃되었습니다.");
    } else {
        var prompts = { "가입": "📝 닉네임", "로그인": "🔑 닉네임", "삭제": "🛠️ 삭제대상", "초기화": "🛠️ 초기화대상" };
        if (prompts[cmd]) {
            replier.reply("💬 " + prompts[cmd] + "을(를) 입력해주세요.");
            session.waitAction = cmd;
        }
    }
}

function inputWaitHandler(sender, msg, replier, session, isAdminRoom) {
    var act = session.waitAction;
    try {
        if (act === "가입") replier.reply(_L.tryRegister(sender, msg, _D, _O).msg);
        else if (act === "로그인") {
            var res = _L.tryLogin(msg, _D);
            if (res.success) { session.data = res.data; replier.reply("✅ [" + res.data.info.name + "]님 로그인."); }
            else replier.reply("🚫 " + res.msg);
        } else if (isAdminRoom && (act === "삭제" || act === "초기화")) {
            global.ADMIN_QUEUE_V4[sender] = { type: act, target: msg };
            replier.reply("⚠️ [" + msg + "] " + act + "하시겠습니까? ('확인' 입력 시 실행)");
        }
    } catch (e) { replier.reply("❌ 처리 중 오류 발생"); }
    session.waitAction = null;
}

function adminActionHandler(sender, msg, replier) {
    var q = global.ADMIN_QUEUE_V4[sender];
    if (msg === "확인") {
        if (q.type === "삭제") _D.deleteUser(q.target);
        else if (q.type === "초기화") {
            var u = _D.readUser(q.target);
            if (u) _D.writeUser(q.target, _O.getNewUser(u.info.id, "0", u.info.name));
        }
        replier.reply("✅ 완료되었습니다.");
    } else replier.reply("❌ 취소되었습니다.");
    delete global.ADMIN_QUEUE_V4[sender];
}
