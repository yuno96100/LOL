/* ============================================================
   [SECTION 1] 라이브러리 및 전역 객체
   ============================================================ */
var C = Bridge.getScopeOf("Const.js").bridge();
var D = Bridge.getScopeOf("DataBase.js").bridge();
var O = Bridge.getScopeOf("Object.js").bridge();
var Log = Bridge.getScopeOf("LoginManager.js").bridge();
var H = Bridge.getScopeOf("Helper.js").bridge();

if (!global.sessions) global.sessions = {};
if (!global.adminWait) global.adminWait = {};

/* ============================================================
   [SECTION 2] 메인 응답 엔진 (Response)
   ============================================================ */
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    // 1. 기본 방어막: 메시지가 없으면 즉시 종료
    if (!msg) return;
    msg = msg.trim(); // 공백 제거

    // 2. 세션 방어막: 세션 객체 보장
    if (!global.sessions[sender]) {
        global.sessions[sender] = { isMenuOpen: false, data: null, waitAction: null, currentView: "메인" };
    }
    var session = global.sessions[sender];

    // 3. 상시 방어막: 불필요한 호출 차단
    var isCommand = msg.startsWith(C.Prefix || ".");
    var isNumber = !isNaN(msg);
    var isWaiting = !!session.waitAction;
    var isCancel = (msg === "취소");

    if (!isCommand && !isNumber && !isWaiting && !isCancel) return;

    try {
        // [A] 공통 제어 : 취소
        if (isCancel) {
            session.isMenuOpen = false;
            session.waitAction = null;
            global.adminWait[sender] = null;
            return replier.reply("❌ 모든 작업을 중단합니다.");
        }

        var isAdminRoom = (room === C.ErrorLogRoom);
        var isMainRoom = (room === C.MainRoomName);

        // [B] 상태별 로직 분기 (msg 변수 직접 사용)
        
        // B-1. 관리자 확인 대기
        if (isAdminRoom && global.adminWait[sender]) {
            processAdminAction(sender, msg, replier);
            return;
        }

        // B-2. 입력값 대기 (가입/로그인 등)
        if (session.waitAction) {
            processWaitInput(sender, msg, replier, session, isAdminRoom);
            return;
        }

        // B-3. 메뉴 호출
        if (msg === (C.Prefix || ".") + "메뉴") {
            session.isMenuOpen = true;
            session.currentView = "메인";
            replier.reply(H.getMenu(room, isMainRoom, isAdminRoom, !!session.data, "메인", session.data, D));
            return;
        }

        // B-4. 메뉴 선택 (숫자)
        if (session.isMenuOpen && isNumber) {
            processSelection(msg, sender, session, replier, room, isMainRoom, isAdminRoom);
        }

    } catch (e) {
        Api.replyRoom(C.ErrorLogRoom, "🚨 [v2.4.7 에러] " + e.message + " (L:" + e.lineNumber + ")");
    }
}

/* ============================================================
   [SECTION 3] 세부 로직 핸들러
   ============================================================ */

function processSelection(msg, sender, session, replier, room, isMain, isAdmin) {
    var cmd = H.getRootCmdByNum(isAdmin, isMain, !!session.data, msg);
    if (!cmd) return;

    session.currentView = cmd;
    if (cmd === "로그아웃") {
        session.data = null; session.isMenuOpen = false;
        replier.reply("🚪 로그아웃되었습니다.");
    } else if (["가입", "로그인", "삭제", "초기화", "복구"].indexOf(cmd) !== -1) {
        replier.reply("💬 " + cmd + "할 내용을 입력해주세요. (취소: '취소')");
        session.waitAction = cmd;
    } else {
        var res = H.getMenu(room, isMain, isAdmin, !!session.data, cmd, session.data, D);
        if (res) replier.reply(res);
        if (cmd !== "유저조회" && cmd !== "상점" && cmd !== "내정보") session.isMenuOpen = false;
    }
}

function processWaitInput(sender, msg, replier, session, isAdminRoom) {
    var act = session.waitAction;
    if (act === "가입") {
        replier.reply(Log.tryRegister(sender, msg, D, O).msg);
    } else if (act === "로그인") {
        var res = Log.tryLogin(msg, D);
        if (res.success) {
            session.data = res.data;
            replier.reply("✅ [" + res.data.info.name + "]님 환영합니다!");
        } else replier.reply("🚫 " + res.msg);
    } else if (isAdminRoom && (act === "삭제" || act === "초기화")) {
        global.adminWait[sender] = { type: act, target: msg };
        replier.reply("⚠️ [" + msg + "] 정말 " + act + "하시겠습니까? ('확인' 입력 시 실행)");
    }
    session.waitAction = null;
}

function processAdminAction(sender, msg, replier) {
    var q = global.adminWait[sender];
    if (msg === "확인") {
        if (q.type === "삭제") D.deleteUser(q.target);
        else if (q.type === "초기화") {
            var u = D.readUser(q.target);
            if (u) D.writeUser(q.target, O.getNewUser(u.info.id, q.target));
        }
        replier.reply("✅ 완료되었습니다.");
    } else {
        replier.reply("❌ 취소되었습니다.");
    }
    delete global.adminWait[sender];
}
