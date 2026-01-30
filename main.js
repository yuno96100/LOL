/* ============================================================
   [SECTION 1] 구버전 메모리 강제 소거 (에러 귀신 퇴치)
   ============================================================ */
delete global.libs;
delete global.L;
delete global.sessions;

// 전용 라이브러리 로드 함수 (필요할 때만 호출하여 Undefined 방지)
function getLib(name) {
    try {
        return Bridge.getScopeOf(name).bridge();
    } catch (e) {
        return null;
    }
}

// 새로운 세션 저장소 (기존과 이름 겹치지 않게)
if (!global.USER_SESSIONS_FINAL) global.USER_SESSIONS_FINAL = {};
if (!global.ADMIN_QUEUE_FINAL) global.ADMIN_QUEUE_FINAL = {};

/* ============================================================
   [SECTION 2] 응답 엔진 (Response Engine)
   ============================================================ */
function response(room, msg, sender, isGroupChat, replier) {
    if (!msg) return;
    var input = msg.trim();
    
    // 세션 초기화
    if (!global.USER_SESSIONS_FINAL[sender]) {
        global.USER_SESSIONS_FINAL[sender] = { isMenuOpen: false, data: null, waitAction: null, currentView: "메인" };
    }
    var session = global.USER_SESSIONS_FINAL[sender];

    /* [2-1] 필터링 (에러 발생 가능성 0% 지점) */
    var isCancel = (input === "취소");
    var isMenuCmd = (input === ".메뉴"); // Prefix 직접 지정
    var isNumber = !isNaN(input);
    var isWaiting = !!session.waitAction;

    // 위 조건 중 아무것도 해당 안 되면 즉시 종료
    if (!isCancel && !isMenuCmd && !isNumber && !isWaiting) return;

    try {
        /* [2-2] 라이브러리 로드 (사용 직전 로드하여 안전성 확보) */
        var _C = getLib("Const.js");
        var _D = getLib("DataBase.js");
        var _H = getLib("Helper.js");

        if (!_C || !_D || !_H) return; // 라이브러리 로드 실패 시 중단

        /* [2-3] 공통 제어 : 취소 */
        if (isCancel) {
            session.isMenuOpen = false;
            session.waitAction = null;
            global.ADMIN_QUEUE_FINAL[sender] = null;
            return replier.reply("❌ 모든 작업을 중단합니다.");
        }

        var isAdminRoom = (room === _C.ErrorLogRoom);
        var isMainRoom = (room === _C.MainRoomName);

        /* [2-4] 로직 분기 */

        // A. 관리자 2차 확인 대기
        if (isAdminRoom && global.ADMIN_QUEUE_FINAL[sender]) {
            handleAdminAction(sender, input, replier, _D);
            return;
        }

        // B. 유저 입력 대기
        if (session.waitAction) {
            handleWaitInput(sender, input, replier, session, isAdminRoom, _D);
            return;
        }

        // C. 메뉴판 열기
        if (isMenuCmd) {
            session.isMenuOpen = true;
            session.currentView = "메인";
            var menuMsg = _H.getMenu(room, isMainRoom, isAdminRoom, !!session.data, "메인", session.data, _D);
            replier.reply(menuMsg);
            return;
        }

        // D. 숫자 선택
        if (session.isMenuOpen && isNumber) {
            handleSelection(input, sender, session, replier, room, isMainRoom, isAdminRoom, _D, _H);
        }

    } catch (e) {
        // 에러 방어
        var _C_Err = getLib("Const.js");
        if (_C_Err) Api.replyRoom(_C_Err.ErrorLogRoom, "🚨 [v2.3.5 에러]\n- " + e.message + "\n- L: " + e.lineNumber);
    }
}

/* ============================================================
   [SECTION 3] 핸들러 함수 (Handlers)
   ============================================================ */

function handleSelection(num, sender, session, replier, room, isMain, isAdmin, _D, _H) {
    if (session.currentView === "유저조회") {
        var idx = parseInt(num) - 1;
        if (global.tempUserList && global.tempUserList[idx]) {
            var u = _D.readUser(global.tempUserList[idx]);
            if (u) replier.reply("👤 [" + u.info.name + "] 정보\n• LV: " + u.status.level + "\n• GOLD: " + u.status.money + "G");
            return;
        }
    }
    
    var cmd = _H.getRootCmdByNum(isAdmin, isMain, !!session.data, num);
    if (cmd) {
        session.currentView = cmd;
        if (cmd === "로그아웃") {
            session.data = null; session.isMenuOpen = false;
            replier.reply("🚪 로그아웃되었습니다.");
        } else if (["가입", "로그인", "삭제", "초기화", "복구"].indexOf(cmd) !== -1) {
            replier.reply("💬 " + cmd + "할 내용을 입력해주세요. (취소: '취소')");
            session.waitAction = cmd;
        } else {
            var res = _H.getMenu(room, isMain, isAdmin, !!session.data, cmd, session.data, _D);
            if (res) replier.reply(res);
            if (cmd !== "유저조회" && cmd !== "상점" && cmd !== "내정보") session.isMenuOpen = false;
        }
    }
}

function handleWaitInput(sender, msg, replier, session, isAdminRoom, _D) {
    var _L = getLib("LoginManager.js");
    var _O = getLib("Object.js");
    var act = session.waitAction;

    if (act === "가입") {
        replier.reply(_L.tryRegister(sender, msg, _D, _O).msg);
    } else if (act === "로그인") {
        var res = _L.tryLogin(msg, _D);
        if (res.success) {
            session.data = res.data;
            replier.reply("✅ [" + res.data.info.name + "]님 로그인!");
        } else replier.reply("🚫 " + res.msg);
    } else if (isAdminRoom && (act === "삭제" || act === "초기화")) {
        global.ADMIN_QUEUE_FINAL[sender] = { type: act, target: msg };
        replier.reply("⚠️ [" + msg + "] 정말 " + act + "할까요? ('확인' 입력 시 실행)");
    } else if (isAdminRoom && act === "복구") {
        replier.reply(_D.restoreUser(msg) ? "✅ 복구 성공" : "❌ 실패");
    }
    session.waitAction = null;
}

function handleAdminAction(sender, msg, replier, _D) {
    var q = global.ADMIN_QUEUE_FINAL[sender];
    var _O = getLib("Object.js");
    if (msg === "확인") {
        if (q.type === "삭제") _D.deleteUser(q.target);
        else if (q.type === "초기화") {
            var u = _D.readUser(q.target);
            if (u) _D.writeUser(q.target, _O.getNewUser(u.info.id, "0", u.info.name));
        }
        replier.reply("✅ 완료되었습니다.");
    } else {
        replier.reply("❌ 취소되었습니다.");
    }
    delete global.ADMIN_QUEUE_FINAL[sender];
}
