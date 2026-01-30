/* ============================================================
   [SECTION 1] 라이브러리 및 메모리 관리
   ============================================================ */
delete global.libs;
delete global.L;

var _C = Bridge.getScopeOf("Const.js").bridge();
var _D = Bridge.getScopeOf("DataBase.js").bridge();
var _O = Bridge.getScopeOf("Object.js").bridge();
var _L = Bridge.getScopeOf("LoginManager.js").bridge();
var _H = Bridge.getScopeOf("Helper.js").bridge();

if (!global.SESSIONS_V4) global.SESSIONS_V4 = {};
if (!global.ADMIN_QUEUE_V4) global.ADMIN_QUEUE_V4 = {};

/* ============================================================
   [SECTION 2] 응답 엔진
   ============================================================ */
function response(room, msg, sender, isGroupChat, replier) {
    if (!msg) return;
    var input = msg.trim();
    
    if (!global.SESSIONS_V4[sender]) {
        global.SESSIONS_V4[sender] = { isMenuOpen: false, data: null, waitAction: null, currentView: "메인" };
    }
    var session = global.SESSIONS_V4[sender];

    // 필터링
    var isCancel = (input === "취소");
    var isCommand = input.startsWith(".");
    var isNumber = !isNaN(input);
    if (!isCancel && !isCommand && !isNumber && !session.waitAction) return;

    try {
        if (isCancel) {
            session.isMenuOpen = false; session.waitAction = null;
            global.ADMIN_QUEUE_V4[sender] = null;
            return replier.reply("❌ 취소되었습니다.");
        }

        var isAdminRoom = (room === _C.ErrorLogRoom);
        var isMainRoom = (room === _C.MainRoomName);

        // A. 관리자 2차 확인
        if (isAdminRoom && global.ADMIN_QUEUE_V4[sender]) {
            adminActionHandler(sender, input, replier);
            return;
        }

        // B. 입력 대기 처리
        if (session.waitAction) {
            inputWaitHandler(sender, input, replier, session, isAdminRoom);
            return;
        }

        // C. 메뉴 오픈
        if (input === ".메뉴") {
            session.isMenuOpen = true; session.currentView = "메인";
            replier.reply(_H.getMenu(room, isMainRoom, isAdminRoom, !!session.data, "메인", session.data, _D));
            return;
        }

        // D. 번호 선택
        if (session.isMenuOpen && isNumber) {
            selectionHandler(input, sender, session, replier, room, isMainRoom, isAdminRoom);
        }

    } catch (e) {
        Api.replyRoom(_C.ErrorLogRoom, "🚨 [v2.3.5] 에러: " + e.message + " (L:" + e.lineNumber + ")");
    }
}

/* ============================================================
   [SECTION 3] 세부 로직
   ============================================================ */

function selectionHandler(num, sender, session, replier, room, isMain, isAdmin) {
    // 유저조회 목록 안에서 번호를 눌렀을 때 (상세보기)
    if (session.currentView === "유저조회") {
        var idx = parseInt(num) - 1;
        if (global.tempUserList && global.tempUserList[idx]) {
            var u = _D.readUser(global.tempUserList[idx]);
            if (u) {
                var detail = "👤 [" + u.info.name + "] 정보\n• LV: " + u.status.level + "\n• GOLD: " + u.status.money + "G";
                replier.reply(detail);
            }
            return;
        }
    }
    
    // 메인 메뉴에서 번호를 눌렀을 때
    var cmd = _H.getRootCmdByNum(isAdmin, isMain, !!session.data, num);
    if (cmd) {
        session.currentView = cmd;
        
        // [수정] 유저조회, 상점, 내정보는 입력을 기다리지 않고 바로 출력
        if (cmd === "유저조회" || cmd === "상점" || cmd === "내정보") {
            var res = _H.getMenu(room, isMain, isAdmin, !!session.data, cmd, session.data, _D);
            if (res) replier.reply(res);
        } else if (cmd === "로그아웃") {
            session.data = null; session.isMenuOpen = false;
            replier.reply("🚪 로그아웃되었습니다.");
        } else {
            // 가입, 로그인, 삭제, 초기화 등은 텍스트 입력을 유도
            var prompts = { "가입": "📝 닉네임", "로그인": "🔑 닉네임", "삭제": "🛠️ 삭제대상", "초기화": "🛠️ 초기화대상", "복구": "🛠️ 복구대상" };
            replier.reply("💬 " + prompts[cmd] + "을(를) 입력해주세요. (취소: '취소')");
            session.waitAction = cmd;
        }
    }
}

function inputWaitHandler(sender, msg, replier, session, isAdminRoom) {
    var act = session.waitAction;
    if (act === "가입") replier.reply(_L.tryRegister(sender, msg, _D, _O).msg);
    else if (act === "로그인") {
        var res = _L.tryLogin(msg, _D);
        if (res.success) { session.data = res.data; replier.reply("✅ [" + res.data.info.name + "]님 로그인."); }
        else replier.reply("🚫 " + res.msg);
    } else if (isAdminRoom && (act === "삭제" || act === "초기화")) {
        global.ADMIN_QUEUE_V4[sender] = { type: act, target: msg };
        replier.reply("⚠️ [" + msg + "] " + act + " 진행하시겠습니까? ('확인' 입력 시 실행)");
    } else if (isAdminRoom && act === "복구") {
        replier.reply(_D.restoreUser(msg) ? "✅ 복구 성공" : "❌ 실패");
    }
    session.waitAction = null;
}

function adminActionHandler(sender, msg, replier) {
    var q = global.ADMIN_QUEUE_V4[sender];
    if (msg === "확인") {
        if (q.type === "삭제") replier.reply(_D.deleteUser(q.target) ? "✅ 삭제완료" : "❌ 유저없음");
        else if (q.type === "초기화") {
            var u = _D.readUser(q.target);
            if (u) { _D.writeUser(q.target, _O.getNewUser(u.info.id, "0", u.info.name)); replier.reply("✅ 초기화완료"); }
        }
    } else replier.reply("❌ 취소되었습니다.");
    delete global.ADMIN_QUEUE_V4[sender];
}
