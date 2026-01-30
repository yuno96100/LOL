/* ============================================================
   [SECTION 1] 메모리 강제 세척 및 라이브러리 초기화
   ============================================================ */
// 구버전 에러의 원인인 global.libs와 global.L을 강제 삭제하여 충돌 방지
delete global.libs;
delete global.L;

// 새로운 접두사(_)를 사용하여 라이브러리 직접 로드 (가장 안정적임)
var _C = Bridge.getScopeOf("Const.js").bridge();
var _D = Bridge.getScopeOf("DataBase.js").bridge();
var _O = Bridge.getScopeOf("Object.js").bridge();
var _L = Bridge.getScopeOf("LoginManager.js").bridge();
var _H = Bridge.getScopeOf("Helper.js").bridge();

// 충돌 방지를 위해 전역 저장소 이름 변경
if (!global.SESSIONS_V4) global.SESSIONS_V4 = {};
if (!global.ADMIN_QUEUE_V4) global.ADMIN_QUEUE_V4 = {};

/* ============================================================
   [SECTION 2] 응답 엔진 (Response Engine)
   ============================================================ */
function response(room, msg, sender, isGroupChat, replier) {
    if (!msg) return;
    var input = msg.trim();
    
    // [보안] 신규 세션 생성
    if (!global.SESSIONS_V4[sender]) {
        global.SESSIONS_V4[sender] = { isMenuOpen: false, data: null, waitAction: null, currentView: "메인" };
    }
    var session = global.SESSIONS_V4[sender];

    /* [2-1] 필터링 (Line 32 방어)
       객체 참조를 완전히 배제한 순수 문자열 비교로 렉과 에러 방지 */
    var isCancel = (input === "취소");
    var isCommand = input.startsWith("."); // Prefix 직접 지정
    var isNumber = !isNaN(input);
    var isWaiting = !!session.waitAction;

    if (!isCancel && !isCommand && !isNumber && !isWaiting) return;

    try {
        /* [2-2] 공통 제어 : 취소 처리 */
        if (isCancel) {
            session.isMenuOpen = false;
            session.waitAction = null;
            global.ADMIN_QUEUE_V4[sender] = null;
            return replier.reply("❌ 모든 작업을 중단합니다.");
        }

        var isAdminRoom = (room === _C.ErrorLogRoom);
        var isMainRoom = (room === _C.MainRoomName);

        /* [2-3] 로직 분기 (가독성 섹션화) */

        // A. 관리자 2차 확인 (확인/취소 입력 대기)
        if (isAdminRoom && global.ADMIN_QUEUE_V4[sender]) {
            adminActionHandler(sender, input, replier);
            return;
        }

        // B. 유저 입력 대기 (닉네임 등 텍스트 입력)
        if (session.waitAction) {
            inputWaitHandler(sender, input, replier, session, isAdminRoom);
            return;
        }

        // C. 메뉴판 열기
        if (input === ".메뉴") {
            session.isMenuOpen = true;
            session.currentView = "메인";
            var menuMsg = _H.getMenu(room, isMainRoom, isAdminRoom, !!session.data, "메인", session.data, _D);
            replier.reply(menuMsg);
            return;
        }

        // D. 숫자 선택 처리
        if (session.isMenuOpen && isNumber) {
            selectionHandler(input, sender, session, replier, room, isMainRoom, isAdminRoom);
        }

    } catch (e) {
        // 에러 발생 시 관리자방에 상세 보고
        var errReport = "🚨 [v2.3.4 에러]\n- 내용: " + e.message + "\n- 위치: Line " + e.lineNumber;
        Api.replyRoom(_C.ErrorLogRoom, errReport);
    }
}

/* ============================================================
   [SECTION 3] 세부 기능 로직 (Logic Handlers)
   ============================================================ */

/**
 * [가독성] 숫자 선택에 따른 명령 실행
 */
function selectionHandler(num, sender, session, replier, room, isMain, isAdmin) {
    // 유저조회 상세 보기 모드인 경우
    if (session.currentView === "유저조회") {
        var idx = parseInt(num) - 1;
        if (global.tempUserList && global.tempUserList[idx]) {
            var u = _D.readUser(global.tempUserList[idx]);
            if (u) {
                var detail = "👤 [" + u.info.name + "] 정보\n" + "━".repeat(10) + "\n• LV: " + u.status.level + "\n• GOLD: " + u.status.money + "G";
                replier.reply(detail);
            }
            return;
        }
    }
    
    // 일반 메뉴 번호 이동
    var cmd = _H.getRootCmdByNum(isAdmin, isMain, !!session.data, num);
    if (cmd) {
        session.currentView = cmd;
        if (cmd === "로그아웃") {
            session.data = null; session.isMenuOpen = false;
            replier.reply("🚪 로그아웃되었습니다.");
        } else if (["가입", "로그인", "삭제", "초기화", "복구"].indexOf(cmd) >= -1) {
            // 입력이 필요한 커맨드들
            var prompt = "💬 " + cmd + "할 대상을 입력해주세요. (취소: '취소')";
            replier.reply(prompt);
            session.waitAction = cmd;
        } else {
            // 일반 메뉴 출력 (상점, 내정보 등)
            var res = _H.getMenu(room, isMain, isAdmin, !!session.data, cmd, session.data, _D);
            if (res) replier.reply(res);
            if (cmd !== "유저조회" && cmd !== "상점" && cmd !== "내정보") session.isMenuOpen = false;
        }
    }
}

/**
 * [가입/로그인] 텍스트 입력 처리
 */
function inputWaitHandler(sender, msg, replier, session, isAdminRoom) {
    var act = session.waitAction;
    if (act === "가입") {
        replier.reply(_L.tryRegister(sender, msg, _D, _O).msg);
    } else if (act === "로그인") {
        var res = _L.tryLogin(msg, _D);
        if (res.success) {
            session.data = res.data;
            replier.reply("✅ [" + res.data.info.name + "]님 로그인 성공!");
        } else replier.reply("🚫 " + res.msg);
    } else if (isAdminRoom && (act === "삭제" || act === "초기화")) {
        global.ADMIN_QUEUE_V4[sender] = { type: act, target: msg };
        replier.reply("⚠️ [" + msg + "] 유저를 " + act + "하시겠습니까? ('확인' 입력 시 실행)");
    } else if (isAdminRoom && act === "복구") {
        replier.reply(_D.restoreUser(msg) ? "✅ 복구 성공" : "❌ 복구 실패");
    }
    session.waitAction = null;
}

/**
 * [관리자] 삭제/초기화 최종 확인 처리
 */
function adminActionHandler(sender, msg, replier) {
    var q = global.ADMIN_QUEUE_V4[sender];
    if (msg === "확인") {
        if (q.type === "삭제") {
            var success = _D.deleteUser(q.target);
            replier.reply(success ? "✅ 유저 삭제(백업) 완료." : "❌ 해당 유저가 없습니다.");
        } else if (q.type === "초기화") {
            var u = _D.readUser(q.target);
            if (u) {
                _D.writeUser(q.target, _O.getNewUser(u.info.id, "0", u.info.name));
                replier.reply("✅ 유저 정보가 초기화되었습니다.");
            }
        }
    } else {
        replier.reply("❌ 작업이 취소되었습니다.");
    }
    delete global.ADMIN_QUEUE_V4[sender];
}
