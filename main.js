function response(room, msg, sender, isGroupChat, replier) {
    /* [테스트 로직] 라이브러리 없이 무조건 동작 */
    if (msg === "확인") {
        replier.reply("✅ 봇이 살아있습니다!\n방 이름: " + room + "\n상태: 정상");
        return; // 테스트 성공 시 아래 복잡한 로직은 실행하지 않음
    }
/* ============================================================
   [SECTION 1] 라이브러리 및 전역 설정
   ============================================================ */
var C, D, O, Log, H;

function loadLibraries() {
    try {
        C = Bridge.getScopeOf("Const.js").bridge();
        D = Bridge.getScopeOf("DataBase.js").bridge();
        O = Bridge.getScopeOf("Object.js").bridge();
        Log = Bridge.getScopeOf("LoginManager.js").bridge();
        H = Bridge.getScopeOf("Helper.js").bridge();
    } catch (e) {
        // 라이브러리 로드 실패 시 로그만 남기고 봇 꺼짐 방지
    }
}

if (!global.sessions) global.sessions = {};
if (!global.adminWait) global.adminWait = {};

/* ============================================================
   [SECTION 2] 메인 응답 엔진
   ============================================================ */
function response(room, msg, sender, isGroupChat, replier) {
    if (!msg) return;
    var input = msg.trim();
    
    // 1. 라이브러리 상태 체크 및 재로드 (방어막)
    if (!C || !H) loadLibraries();

    // 2. 세션 자동 생성
    if (!global.sessions[sender]) {
        global.sessions[sender] = { isMenuOpen: false, data: null, waitAction: null, currentView: "메인" };
    }
    var session = global.sessions[sender];

    // 3. 핵심 필터링 (Prefix 참조 실패 대비 기본값 "." 사용)
    var prefix = (C && C.Prefix) ? C.Prefix : ".";
    var isCommand = input.startsWith(prefix);
    var isNumber = !isNaN(input);
    var isWaiting = !!session.waitAction;
    var isCancel = (input === "취소");

    // 방어막: 허용된 입력이 아니면 즉시 종료
    if (!isCommand && !isNumber && !isWaiting && !isCancel) return;

    try {
        // [A] 공통 제어 : 취소
        if (isCancel) {
            session.isMenuOpen = false; session.waitAction = null;
            global.adminWait[sender] = null;
            return replier.reply("❌ 작업을 중단합니다.");
        }

        var isAdminRoom = (C && room === C.ErrorLogRoom);
        var isMainRoom = (C && room === C.MainRoomName);

        // [B] 상태별 분기
        if (isAdminRoom && global.adminWait[sender]) {
            processAdminAction(sender, input, replier);
        } 
        else if (session.waitAction) {
            processWaitInput(sender, input, replier, session, isAdminRoom);
        } 
        else if (input === prefix + "메뉴") {
            session.isMenuOpen = true;
            session.currentView = "메인";
            
            // Helper 호출 방어막
            if (H && H.getMenu) {
                var menuText = H.getMenu(room, isMainRoom, isAdminRoom, !!session.data, "메인", session.data, D);
                replier.reply(menuText);
            } else {
                replier.reply("⚠️ 시스템 메뉴를 불러오는 중 오류가 발생했습니다.\n다시 시도하거나 관리자에게 문의하세요.");
            }
        } 
        else if (session.isMenuOpen && isNumber) {
            processSelection(input, sender, session, replier, room, isMainRoom, isAdminRoom);
        }

    } catch (e) {
        if (C) Api.replyRoom(C.ErrorLogRoom, "🚨 [v2.4.3 에러] " + e.message + " (L:" + e.lineNumber + ")");
    }
}

/* ============================================================
   [SECTION 3] 로직 핸들러 (동일 유지)
   ============================================================ */
function processSelection(num, sender, session, replier, room, isMain, isAdmin) {
    if (!H) return;
    var cmd = H.getRootCmdByNum(isAdmin, isMain, !!session.data, num);
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
    if (act === "가입" && Log) replier.reply(Log.tryRegister(sender, msg, D, O).msg);
    else if (act === "로그인" && Log) {
        var res = Log.tryLogin(msg, D);
        if (res.success) { session.data = res.data; replier.reply("✅ [" + res.data.info.name + "]님 환영합니다!"); }
        else replier.reply("🚫 " + res.msg);
    } else if (isAdminRoom && (act === "삭제" || act === "초기화")) {
        global.adminWait[sender] = { type: act, target: msg };
        replier.reply("⚠️ [" + msg + "] " + act + "을(를) 진행하시겠습니까? ('확인' 입력)");
    }
    session.waitAction = null;
}

function processAdminAction(sender, msg, replier) {
    var q = global.adminWait[sender];
    if (msg === "확인") {
        if (q.type === "삭제" && D) D.deleteUser(q.target);
        else if (q.type === "초기화" && D) {
            var u = D.readUser(q.target);
            if (u) D.writeUser(q.target, O.getNewUser(u.info.id, "0", u.info.name));
        }
        replier.reply("✅ 완료되었습니다.");
    } else replier.reply("❌ 취소됨.");
    delete global.adminWait[sender];
}

// 초기 실행 시 라이브러리 로드
loadLibraries();
