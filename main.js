/* ============================================================
   [SECTION 1] 라이브러리 로드 및 전역 객체 선언
   ============================================================ */
var C = Bridge.getScopeOf("Const.js").bridge();
var D = Bridge.getScopeOf("DataBase.js").bridge();
var O = Bridge.getScopeOf("Object.js").bridge();
var Log = Bridge.getScopeOf("LoginManager.js").bridge();
var H = Bridge.getScopeOf("Helper.js").bridge();

if (!global.sessions) global.sessions = {};
if (!global.adminWait) global.adminWait = {};

/* ============================================================
   [SECTION 2] 메인 응답 엔진 (Response Entry)
   ============================================================ */
function response(room, msg, sender, isGroupChat, replier) {
    if (!msg) return;
    var input = msg.trim();
    
    // 1. 세션 방어막 (객체 누락으로 인한 봇 멈춤 방지)
    if (!global.sessions[sender]) {
        global.sessions[sender] = { isMenuOpen: false, data: null, waitAction: null, currentView: "메인" };
    }
    var session = global.sessions[sender];

    // 2. 필터링 로직 (봇 활성화를 결정하는 가장 중요한 구간)
    var isCommand = input.startsWith(C.Prefix);
    var isNumber = !isNaN(input);
    var isWaiting = !!session.waitAction;
    var isCancel = (input === "취소");

    if (!isCommand && !isNumber && !isWaiting && !isCancel) return;

    try {
        // [3] 공통 제어 : 취소
        if (isCancel) {
            session.isMenuOpen = false;
            session.waitAction = null;
            global.adminWait[sender] = null;
            return replier.reply("❌ 모든 작업을 중단하고 메인으로 돌아갑니다.");
        }

        var isAdminRoom = (room === C.ErrorLogRoom);
        var isMainRoom = (room === C.MainRoomName);

        // [4] 상태별 로직 분기
        
        // A. 관리자 확인 대기 (삭제/초기화 '확인' 입력 시)
        if (isAdminRoom && global.adminWait[sender]) {
            processAdminAction(sender, input, replier);
            return;
        }

        // B. 입력값 대기 (가입/로그인 등 텍스트 입력 단계)
        if (session.waitAction) {
            processWaitInput(sender, input, replier, session, isAdminRoom);
            return;
        }

        // C. 메뉴판 호출 (.메뉴)
        if (input === C.Prefix + "메뉴") {
            session.isMenuOpen = true;
            session.currentView = "메인";
            replier.reply(H.getMenu(room, isMainRoom, isAdminRoom, !!session.data, "메인", session.data, D));
            return;
        }

        // D. 숫자 선택 처리
        if (session.isMenuOpen && isNumber) {
            processSelection(input, sender, session, replier, room, isMainRoom, isAdminRoom);
        }

    } catch (e) {
        // 에러 발생 시 봇 비활성화를 막기 위한 catch 리포팅
        Api.replyRoom(C.ErrorLogRoom, "🚨 [v2.4.2 에러]\n- 위치: Line " + e.lineNumber + "\n- 내용: " + e.message);
    }
}

/* ============================================================
   [SECTION 3] 세부 로직 핸들러 (Handlers)
   ============================================================ */

/** 메뉴 번호 선택 처리 */
function processSelection(num, sender, session, replier, room, isMain, isAdmin) {
    if (session.currentView === "유저조회") {
        var idx = parseInt(num) - 1;
        if (global.tempUserList && global.tempUserList[idx]) {
            var u = D.readUser(global.tempUserList[idx]);
            if (u) {
                var detail = "👤 [" + u.info.name + "] 정보\n" + "━".repeat(10) + "\n• 레벨: " + u.status.level + "\n• 골드: " + u.status.money + "G";
                replier.reply(detail);
            }
            return;
        }
    }
    
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

/** 가입/로그인 등 입력 대기값 처리 */
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
        replier.reply("⚠️ [" + msg + "] 정말 " + act + "하시겠습니까?\n'확인' 입력 시 실행됩니다.");
    } else if (isAdminRoom && act === "복구") {
        replier.reply(D.restoreUser(msg) ? "✅ 복구 성공" : "❌ 복구 실패");
    }
    session.waitAction = null;
}

/** 관리자 액션 최종 승인 처리 */
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
