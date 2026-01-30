/* ============================================================
   [SECTION 1] 라이브러리 직접 로드 및 전역 객체 신규 생성
   ============================================================ */
// 구버전 변수들과 충돌을 피하기 위해 새 이름 사용
var _C = Bridge.getScopeOf("Const.js").bridge();
var _D = Bridge.getScopeOf("DataBase.js").bridge();
var _O = Bridge.getScopeOf("Object.js").bridge();
var _L = Bridge.getScopeOf("LoginManager.js").bridge();
var _H = Bridge.getScopeOf("Helper.js").bridge();

// global.sessions 대신 global.USER_SESSION 으로 이름 변경 (잔상 제거)
if (!global.USER_SESSION) global.USER_SESSION = {};
if (!global.ADMIN_QUEUE) global.ADMIN_QUEUE = {};

/* ============================================================
   [SECTION 2] 메인 응답 엔진
   ============================================================ */
function response(room, msg, sender, isGroupChat, replier) {
    if (!msg) return;
    var input = msg.trim();
    
    // [보안] 새 이름의 세션 생성
    if (!global.USER_SESSION[sender]) {
        global.USER_SESSION[sender] = { isMenuOpen: false, data: null, waitAction: null, currentView: "메인" };
    }
    var session = global.USER_SESSION[sender];

    /* [2-1] 필터링 섹션 (Line 32 부근)
       - 속성 참조를 최소화하여 Undefined 에러를 원천 차단합니다. */
    var prefix = "."; // Const 호출 없이 직접 지정하여 에러 방지
    if (input === "취소") { /* 패스 */ }
    else if (session.waitAction) { /* 패스 */ }
    else if (input.startsWith(prefix) || !isNaN(input)) { /* 패스 */ }
    else { return; } // 관련 없는 메시지 즉시 종료

    try {
        /* [2-2] 공통 제어: 취소 */
        if (input === "취소") {
            session.isMenuOpen = false;
            session.waitAction = null;
            global.ADMIN_QUEUE[sender] = null;
            return replier.reply("❌ 취소되었습니다.");
        }

        var isAdminRoom = (room === _C.ErrorLogRoom);
        var isMainRoom = (room === _C.MainRoomName);

        /* [2-3] 상태별 로직 분기 */
        
        // A. 관리자 2차 확인 (삭제/초기화)
        if (isAdminRoom && global.ADMIN_QUEUE[sender]) {
            adminConfirmLogic(sender, input, replier);
            return;
        }

        // B. 입력값 대기 (가입/로그인 등)
        if (session.waitAction) {
            waitInputLogic(sender, input, replier, session, isAdminRoom);
            return;
        }

        // C. 메뉴판 호출
        if (input === prefix + "메뉴") {
            session.isMenuOpen = true;
            session.currentView = "메인";
            replier.reply(_H.getMenu(room, isMainRoom, isAdminRoom, !!session.data, "메인", session.data, _D));
            return;
        }

        // D. 숫자 선택
        if (session.isMenuOpen && !isNaN(input)) {
            menuSelectLogic(input, sender, session, replier, room, isMainRoom, isAdminRoom);
        }

    } catch (e) {
        // 에러 발생 시 어느 객체에서 났는지 명확히 추적
        var errorMsg = "🚨 [v2.3.3] " + e.message + " (L:" + e.lineNumber + ")";
        Api.replyRoom(_C.ErrorLogRoom, errorMsg);
    }
}

/* ============================================================
   [SECTION 3] 세부 로직 함수 섹션
   ============================================================ */

function menuSelectLogic(num, sender, session, replier, room, isMain, isAdmin) {
    if (session.currentView === "유저조회") {
        var idx = parseInt(num) - 1;
        if (global.tempUserList && global.tempUserList[idx]) {
            var u = _D.readUser(global.tempUserList[idx]);
            if (u) replier.reply("👤 [" + u.info.name + "]\n• LV: " + u.status.level + "\n• GOLD: " + u.status.money + "G");
            return;
        }
    }
    
    var cmd = _H.getRootCmdByNum(isAdmin, isMain, !!session.data, num);
    if (cmd) {
        session.currentView = cmd;
        if (cmd === "로그아웃") {
            session.data = null; session.isMenuOpen = false;
            replier.reply("🚪 로그아웃되었습니다.");
        } else if (["가입", "로그인", "삭제", "초기화", "복구"].indexOf(cmd) >= 0) {
            replier.reply("💬 " + cmd + "할 내용을 입력해주세요. (취소: '취소')");
            session.waitAction = cmd;
        } else {
            var res = _H.getMenu(room, isMain, isAdmin, !!session.data, cmd, session.data, _D);
            if (res) replier.reply(res);
            if (cmd !== "유저조회" && cmd !== "상점" && cmd !== "내정보") session.isMenuOpen = false;
        }
    }
}

function waitInputLogic(sender, msg, replier, session, isAdminRoom) {
    var act = session.waitAction;
    if (act === "가입") replier.reply(_L.tryRegister(sender, msg, _D, _O).msg);
    else if (act === "로그인") {
        var res = _L.tryLogin(msg, _D);
        if (res.success) { session.data = res.data; replier.reply("✅ 로그인 성공!"); }
        else replier.reply("🚫 " + res.msg);
    } else if (isAdminRoom && (act === "삭제" || act === "초기화")) {
        global.ADMIN_QUEUE[sender] = { type: act, target: msg };
        replier.reply("⚠️ [" + msg + "] " + act + " 진행? (확인/취소)");
    } else if (isAdminRoom && act === "복구") {
        replier.reply(_D.restoreUser(msg) ? "✅ 복구 성공" : "❌ 실패");
    }
    session.waitAction = null;
}

function adminConfirmLogic(sender, msg, replier) {
    var q = global.ADMIN_QUEUE[sender];
    if (msg === "확인") {
        if (q.type === "삭제") _D.deleteUser(q.target);
        else if (q.type === "초기화") {
            var u = _D.readUser(q.target);
            if (u) _D.writeUser(q.target, _O.getNewUser(u.info.id, "0",
