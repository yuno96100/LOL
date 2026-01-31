/* ============================================================
   [SECTION 1] 라이브러리 로드 (Direct Reference)
   ============================================================ */
var C = Bridge.getScopeOf("Const.js").bridge();
var D = Bridge.getScopeOf("DataBase.js").bridge();
var O = Bridge.getScopeOf("Object.js").bridge();
var Log = Bridge.getScopeOf("LoginManager.js").bridge();
var H = Bridge.getScopeOf("Helper.js").bridge();

if (!global.sessions) global.sessions = {};
if (!global.adminWait) global.adminWait = {};

/* ============================================================
   [SECTION 2] 메인 엔진 (Response)
   ============================================================ */
function response(room, msg, sender, isGroupChat, replier) {
    if (!msg) return;
    var input = msg.trim();
    
    // [보안/방어] 세션 객체 강제 생성 (봇 멈춤 방지)
    if (!global.sessions[sender]) {
        global.sessions[sender] = { isMenuOpen: false, data: null, waitAction: null };
    }
    var session = global.sessions[sender];

    /* [2-1] 핵심 방어 로직 (Filtering)
       이 조건문에 해당하지 않으면 봇은 아무런 계산도 하지 않고 즉시 종료됩니다. */
    var isCommand = input.startsWith(C.Prefix);
    var isNumber = !isNaN(input);
    var isWaiting = !!session.waitAction;
    var isCancel = (input === "취소");

    if (!isCommand && !isNumber && !isWaiting && !isCancel) return;

    try {
        /* [2-2] 공통 제어 : 취소 */
        if (isCancel) {
            session.isMenuOpen = false;
            session.waitAction = null;
            global.adminWait[sender] = null;
            return replier.reply("❌ 모든 작업이 중단되었습니다.");
        }

        var isAdminRoom = (room === C.ErrorLogRoom);
        var isMainRoom = (room === C.MainRoomName);

        /* [2-3] 상태별 로직 처리 */

        // A. 관리자 확인 대기 (삭제/초기화 '확인' 입력 처리)
        if (isAdminRoom && global.adminWait[sender]) {
            processAdminAction(sender, input, replier);
            return;
        }

        // B. 유저 입력 대기 (가입/로그인 등 텍스트 입력)
        if (session.waitAction) {
            processWaitInput(sender, input, replier, session, isAdminRoom);
            return;
        }

        // C. 메뉴 호출 (.메뉴)
        if (input === C.Prefix + "메뉴") {
            session.isMenuOpen = true;
            var menuMsg = H.getMenu(room, isMainRoom, isAdminRoom, !!session.data, "메인", session.data, D);
            replier.reply(menuMsg);
            return;
        }

        // D. 메뉴 선택 (숫자 입력)
        if (session.isMenuOpen && isNumber) {
            processSelection(input, sender, session, replier, room, isMainRoom, isAdminRoom);
        }

    } catch (e) {
        // 에러 발생 시 봇이 꺼지지 않도록 catch하고 관리자방에 보고
        Api.replyRoom(C.ErrorLogRoom, "🚨 [v2.4.2 에러 보고]\n- 위치: Line " + e.lineNumber + "\n- 내용: " + e.message);
    }
}

/* ============================================================
   [SECTION 3] 세부 로직 함수 (Handlers)
   ============================================================ */

function processSelection(num, sender, session, replier, room, isMain, isAdmin) {
    var cmd = H.getRootCmdByNum(isAdmin, isMain, !!session.data, num);
    if (!cmd) return;

    if (cmd === "로그아웃") {
        session.data = null; session.isMenuOpen = false;
        replier.reply("🚪 로그아웃되었습니다.");
    } else if (["가입", "로그인", "삭제", "초기화", "복구"].indexOf(cmd) !== -1) {
        replier.reply("💬 " + cmd + "할 내용을 입력해주세요. (취소: '취소')");
        session.waitAction = cmd;
    } else {
        var res = H.getMenu(room, isMain, isAdmin, !!session.data, cmd, session.data, D);
        if (res) replier.reply(res);
        // 특정 메뉴가 아니면 메뉴 닫기
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
            replier.reply("✅ [" + res.data.info.name + "]님으로 로그인되었습니다.");
        } else replier.reply("🚫 " + res.msg);
    } else if (isAdminRoom && (act === "삭제" || act === "초기화")) {
        global.adminWait[sender] = { type: act, target: msg };
        replier.reply("⚠️ [" + msg + "] " + act + "을(를) 진행하시겠습니까? ('확인' 입력 시 실행)");
    }
    session.waitAction = null;
}

function processAdminAction(sender, msg, replier) {
    var q = global.adminWait[sender];
    if (msg === "확인") {
        if (q.type === "삭제") D.deleteUser(q.target);
        else if (q.type === "초기화") {
            var u = D.readUser(q.target);
            if (u) D.writeUser(q.target, O.getNewUser(u.info.id, "0", u.info.name));
        }
        replier.reply("✅ 요청하신 작업이 완료되었습니다.");
    } else {
        replier.reply("❌ 취소되었습니다.");
    }
    delete global.adminWait[sender];
}
