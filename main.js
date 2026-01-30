/* ============================================================
   [SECTION 1] 라이브러리 로드 (절대 경로 직접 참조)
   ============================================================ */
var _C = Bridge.getScopeOf("Const.js").bridge();
var _D = Bridge.getScopeOf("DataBase.js").bridge();
var _O = Bridge.getScopeOf("Object.js").bridge();
var _L = Bridge.getScopeOf("LoginManager.js").bridge();
var _H = Bridge.getScopeOf("Helper.js").bridge();

// 세션 저장소 (기존 데이터 유지하되 없으면 생성)
if (!global.SESSIONS_V4) global.SESSIONS_V4 = {};
if (!global.ADMIN_QUEUE_V4) global.ADMIN_QUEUE_V4 = {};

/* ============================================================
   [SECTION 2] 메인 엔진
   ============================================================ */
function response(room, msg, sender, isGroupChat, replier) {
    if (!msg) return;
    var input = msg.trim();
    
    // 유저 세션 초기화
    if (!global.SESSIONS_V4[sender]) {
        global.SESSIONS_V4[sender] = { isMenuOpen: false, data: null, waitAction: null, currentView: "메인" };
    }
    var session = global.SESSIONS_V4[sender];

    // 기본 판별값
    var isAdminRoom = (room === _C.ErrorLogRoom);
    var isMainRoom = (room === _C.MainRoomName);
    var isCancel = (input === "취소");
    var isMenuCmd = (input === ".메뉴");
    var isNumber = !isNaN(input);

    try {
        /* [2-1] 최우선 제어 : 취소 */
        if (isCancel) {
            session.isMenuOpen = false;
            session.waitAction = null;
            session.currentView = "메인";
            global.ADMIN_QUEUE_V4[sender] = null;
            return replier.reply("❌ 작업을 중단합니다.");
        }

        /* [2-2] 메뉴 호출 처리 (가장 먼저 체크) */
        if (isMenuCmd) {
            session.isMenuOpen = true;
            session.currentView = "메인";
            session.waitAction = null; // 메뉴 열 때 대기상태 초기화
            var menuMsg = _H.getMenu(room, isMainRoom, isAdminRoom, !!session.data, "메인", session.data, _D);
            return replier.reply(menuMsg);
        }

        /* [2-3] 상태별 분기 로직 */

        // A. 관리자 2차 확인 중일 때
        if (isAdminRoom && global.ADMIN_QUEUE_V4[sender]) {
            adminActionHandler(sender, input, replier);
            return;
        }

        // B. 가입/로그인 등 입력 대기 중일 때
        if (session.waitAction) {
            inputWaitHandler(sender, input, replier, session, isAdminRoom);
            return;
        }

        // C. 메뉴가 열려있고 숫자를 입력했을 때
        if (session.isMenuOpen && isNumber) {
            selectionHandler(input, sender, session, replier, room, isMainRoom, isAdminRoom);
            return;
        }

        // D. 그 외 일반 채팅은 봇이 무시함 (에러 방지)

    } catch (e) {
        Api.replyRoom(_C.ErrorLogRoom, "🚨 [v2.3.9] 에러\n내용: " + e.message + "\n라인: " + e.lineNumber);
    }
}

/* ============================================================
   [SECTION 3] 핸들러 함수 (가독성 분류)
   ============================================================ */

/**
 * 카테고리 내 번호 선택 핸들러
 */
function selectionHandler(num, sender, session, replier, room, isMain, isAdmin) {
    // 1. 유저조회(목록) 컨텍스트일 때
    if (session.currentView === "유저조회") {
        if (!isAdmin) return; // 관리자 아니면 무시
        var idx = parseInt(num) - 1;
        if (global.tempUserList && global.tempUserList[idx]) {
            var u = _D.readUser(global.tempUserList[idx]);
            if (u) replier.reply("👤 [" + u.info.name + "] 상세\n• LV: " + u.status.level + "\n• GOLD: " + u.status.money + "G");
        }
        return;
    }

    // 2. 메인 메뉴 컨텍스트일 때 (메뉴 이동)
    var cmd = _H.getRootCmdByNum(isAdmin, isMain, !!session.data, num);
    if (!cmd) return; // 해당 번호에 명령어가 없으면 무시

    session.currentView = cmd; // 현재 위치 변경

    if (cmd === "유저조회" || cmd === "상점" || cmd === "내정보") {
        // 즉시 출력되는 카테고리
        var res = _H.getMenu(room, isMain, isAdmin, !!session.data, cmd, session.data, _D);
        if (res) replier.reply(res);
    } else if (cmd === "로그아웃") {
        session.data = null;
        session.isMenuOpen = false;
        replier.reply("🚪 로그아웃되었습니다.");
    } else {
        // 입력을 받아야 하는 카테고리 (가입, 삭제 등)
        var prompts = { "가입": "📝 닉네임", "로그인": "🔑 닉네임", "삭제": "🛠️ 삭제대상", "초기화": "🛠️ 초기화대상" };
        if (prompts[cmd]) {
            replier.reply("💬 " + prompts[cmd] + "을(를) 입력해주세요.");
            session.waitAction = cmd;
        }
    }
}

/**
 * 텍스트 입력 대기 핸들러
 */
function inputWaitHandler(sender, msg, replier, session, isAdminRoom) {
    var act = session.waitAction;
    if (act === "가입") {
        replier.reply(_L.tryRegister(sender, msg, _D, _O).msg);
    } else if (act === "로그인") {
        var res = _L.tryLogin(msg, _D);
        if (res.success) {
            session.data = res.data;
            replier.reply("✅ [" + res.data.info.name + "]님 로그인되었습니다.");
        } else replier.reply("🚫 " + res.msg);
    } else if (isAdminRoom && (act === "삭제" || act === "초기화")) {
        global.ADMIN_QUEUE_V4[sender] = { type: act, target: msg };
        replier.reply("⚠️ [" + msg + "] " + act + "하시겠습니까? ('확인' 입력 시 실행)");
    }
    session.waitAction = null; // 입력 처리 후 대기 해제
}

/**
 * 관리자 최종 확인 핸들러
 */
function adminActionHandler(sender, msg, replier) {
    var q = global.ADMIN_QUEUE_V4[sender];
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
    delete global.ADMIN_QUEUE_V4[sender];
}
