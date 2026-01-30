/* ==========================================
   [SECTION 1] 라이브러리 및 전역 설정
   ========================================== */
var Const = Bridge.getScopeOf("Const.js").bridge();
var DB = Bridge.getScopeOf("DataBase.js").bridge();
var Obj = Bridge.getScopeOf("Object.js").bridge();
var Login = Bridge.getScopeOf("LoginManager.js").bridge();
var Helper = Bridge.getScopeOf("Helper.js").bridge();

// 세션 저장소 (충돌 방지를 위해 이름 새로 지정)
if (!global.SESS) global.SESS = {};
if (!global.ADMIN_WAIT) global.ADMIN_WAIT = {};

/* ==========================================
   [SECTION 2] 메인 엔진 (Response)
   ========================================== */
function response(room, msg, sender, isGroupChat, replier) {
    if (!msg) return;
    var input = msg.trim();
    var prefix = (Const && Const.Prefix) ? Const.Prefix : ".";

    // 1. 세션 데이터가 없으면 자동 생성
    if (!global.SESS[sender]) {
        global.SESSIONS[sender] = { isMenuOpen: false, data: null, waitAction: null, currentView: "메인" }; // 예전 이름 백업
        global.SESS[sender] = { isMenuOpen: false, data: null, waitAction: null, currentView: "메인" };
    }
    var session = global.SESS[sender];

    // 2. 필터링 (명령어, 숫자, 대기중, 취소 아니면 무시)
    if (!input.startsWith(prefix) && isNaN(input) && !session.waitAction && input !== "취소") return;

    try {
        /* [섹션 A] 공통 제어 : 취소 */
        if (input === "취소") {
            session.isMenuOpen = false;
            session.waitAction = null;
            global.ADMIN_WAIT[sender] = null;
            return replier.reply("❌ 모든 작업을 중단합니다.");
        }

        var isAdminRoom = (room === Const.ErrorLogRoom);
        var isMainRoom = (room === Const.MainRoomName);

        /* [섹션 B] 상태별 분기 */

        // B-1. 관리자 확인 대기 (삭제/초기화 '확인' 처리)
        if (isAdminRoom && global.ADMIN_WAIT[sender]) {
            handleAdminConfirm(sender, input, replier);
            return;
        }

        // B-2. 입력값 대기 (가입/로그인 등 텍스트 입력)
        if (session.waitAction) {
            handleWaitInput(sender, input, replier, session, isAdminRoom);
            return;
        }

        // B-3. 메뉴판 호출
        if (input === prefix + "메뉴") {
            session.isMenuOpen = true;
            session.currentView = "메인";
            var menu = Helper.getMenu(room, isMainRoom, isAdminRoom, !!session.data, "메인", session.data, DB);
            replier.reply(menu);
            return;
        }

        // B-4. 숫자 선택 처리
        if (session.isMenuOpen && !isNaN(input)) {
            handleMenuSelect(input, sender, session, replier, room, isMainRoom, isAdminRoom);
        }

    } catch (e) {
        // 에러 보고
        Api.replyRoom(Const.ErrorLogRoom, "🚨 [v2.4.0 에러]\n- 내용: " + e.message + "\n- 위치: Line " + e.lineNumber);
    }
}

/* ==========================================
   [SECTION 3] 세부 로직 핸들러
   ========================================== */

// 숫자 선택 핸들러
function handleMenuSelect(num, sender, session, replier, room, isMain, isAdmin) {
    if (session.currentView === "유저조회") {
        var idx = parseInt(num) - 1;
        if (global.tempUserList && global.tempUserList[idx]) {
            var u = DB.readUser(global.tempUserList[idx]);
            if (u) replier.reply("👤 [" + u.info.name + "] 정보\n• LV: " + u.status.level + "\n• GOLD: " + u.status.money + "G");
            return;
        }
    }
    
    var cmd = Helper.getRootCmdByNum(isAdmin, isMain, !!session.data, num);
    if (cmd) {
        session.currentView = cmd;
        if (cmd === "로그아웃") {
            session.data = null; session.isMenuOpen = false;
            replier.reply("🚪 로그아웃되었습니다.");
        } else if (["가입", "로그인", "삭제", "초기화", "복구"].indexOf(cmd) !== -1) {
            replier.reply("💬 " + cmd + "할 내용을 입력해주세요. (취소: '취소')");
            session.waitAction = cmd;
        } else {
            var res = Helper.getMenu(room, isMain, isAdmin, !!session.data, cmd, session.data, DB);
            if (res) replier.reply(res);
            if (cmd !== "유저조회" && cmd !== "상점" && cmd !== "내정보") session.isMenuOpen = false;
        }
    }
}

// 텍스트 입력 핸들러
function handleWaitInput(sender, msg, replier, session, isAdminRoom) {
    var act = session.waitAction;
    if (act === "가입") {
        replier.reply(Login.tryRegister(sender, msg, DB, Obj).msg);
    } else if (act === "로그인") {
        var res = Login.tryLogin(msg, DB);
        if (res.success) {
            session.data = res.data;
            replier.reply("✅ [" + res.data.info.name + "]님 로그인 성공!");
        } else replier.reply("🚫 " + res.msg);
    } else if (isAdminRoom && (act === "삭제" || act === "초기화")) {
        global.ADMIN_WAIT[sender] = { type: act, target: msg };
        replier.reply("⚠️ [" + msg + "] 유저를 " + act + "하시겠습니까? ('확인' 입력 시 실행)");
    } else if (isAdminRoom && act === "복구") {
        replier.reply(DB.restoreUser(msg) ? "✅ 복구 완료" : "❌ 실패");
    }
    session.waitAction = null;
}

// 관리자 최종 승인 핸들러
function handleAdminConfirm(sender, msg, replier) {
    var q = global.ADMIN_WAIT[sender];
    if (msg === "확인") {
        if (q.type === "삭제") DB.deleteUser(q.target);
        else if (q.type === "초기화") {
            var u = DB.readUser(q.target);
            if (u) DB.writeUser(q.target, Obj.getNewUser(u.info.id, "0", u.info.name));
        }
        replier.reply("✅ 작업이 완료되었습니다.");
    } else {
        replier.reply("❌ 취소되었습니다.");
    }
    delete global.ADMIN_WAIT[sender];
}
