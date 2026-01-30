/* ============================================================
   SECTION 1: 라이브러리 로드 및 전역 설정
   (스크립트 시작 시 단 한 번 로드하여 안정성 확보)
   ============================================================ */
var Const = Bridge.getScopeOf("Const.js").bridge();
var DB = Bridge.getScopeOf("DataBase.js").bridge();
var Obj = Bridge.getScopeOf("Object.js").bridge();
var Login = Bridge.getScopeOf("LoginManager.js").bridge();
var Helper = Bridge.getScopeOf("Helper.js").bridge();

if (!global.sessions) global.sessions = {};
if (!global.adminAction) global.adminAction = {};

/* ============================================================
   SECTION 2: 메인 응답 엔진 (Response Entry)
   ============================================================ */
function response(room, msg, sender, isGroupChat, replier) {
    if (!msg) return;
    var input = msg.trim();
    
    // [보안] 세션 자동 생성
    if (!global.sessions[sender]) {
        global.sessions[sender] = { isMenuOpen: false, data: null, waitAction: null, currentView: "메인" };
    }
    var session = global.sessions[sender];

    /* [2-1] 필터링 섹션: 봇과 무관한 메시지 즉시 차단 */
    var prefix = (Const && Const.Prefix) ? Const.Prefix : ".";
    if (!input.startsWith(prefix) && isNaN(input) && !session.waitAction && input !== "취소") return;

    try {
        /* [2-2] 공통 제어: 취소 로직 */
        if (input === "취소") {
            session.isMenuOpen = false;
            session.waitAction = null;
            global.adminAction[sender] = null;
            return replier.reply("❌ 모든 작업을 중단합니다.");
        }

        var isAdminRoom = (room === Const.ErrorLogRoom);
        var isMainRoom = (room === Const.MainRoomName);

        /* [2-3] 상태 분기 섹션 */
        
        // A. 관리자 2차 확인 대기 상태 (삭제/초기화 확인 버튼 처리)
        if (isAdminRoom && global.adminAction[sender]) {
            processAdminConfirm(sender, input, replier);
            return;
        }

        // B. 입력값 대기 상태 (가입 닉네임 입력 등)
        if (session.waitAction) {
            processWaitInput(sender, input, replier, session, isAdminRoom);
            return;
        }

        // C. 메뉴 호출 (.메뉴)
        if (input === prefix + "메뉴") {
            session.isMenuOpen = true;
            session.currentView = "메인";
            replier.reply(Helper.getMenu(room, isMainRoom, isAdminRoom, !!session.data, "메인", session.data, DB));
            return;
        }

        // D. 숫자 선택 처리 (메뉴가 열려있을 때)
        if (session.isMenuOpen && !isNaN(input)) {
            processMenuSelection(input, sender, session, replier, room, isMainRoom, isAdminRoom);
        }

    } catch (e) {
        // [Line 32 에러 방어] 상세 에러 리포팅
        Api.replyRoom(Const.ErrorLogRoom, "🚨 [v2.3.2] 시스템 에러\n내용: " + e.message + "\n위치: Line " + e.lineNumber);
    }
}

/* ============================================================
   SECTION 3: 하위 로직 처리부 (Logic Handlers)
   ============================================================ */

/**
 * 메뉴 숫자 선택 처리
 */
function processMenuSelection(num, sender, session, replier, room, isMain, isAdmin) {
    if (session.currentView === "유저조회") {
        var idx = parseInt(num) - 1;
        if (global.tempUserList && global.tempUserList[idx]) {
            return showUserDetail(global.tempUserList[idx], replier);
        }
    }
    
    var cmd = Helper.getRootCmdByNum(isAdmin, isMain, !!session.data, num);
    if (cmd) {
        session.currentView = cmd;
        handleFinalAction(cmd, sender, session, replier, room, isMain, isAdmin);
    }
}

/**
 * 최종 액션 실행 및 입력 유도
 */
function handleFinalAction(cmd, sender, session, replier, room, isMain, isAdmin) {
    var inputPrompts = { 
        "가입": "📝 가입하실 닉네임", 
        "로그인": "🔑 로그인할 닉네임", 
        "삭제": "🛠️ 삭제할 유저의 닉네임", 
        "초기화": "🛠️ 초기화할 유저의 닉네임", 
        "복구": "🛠️ 복구할 유저의 닉네임" 
    };
    
    if (inputPrompts[cmd]) {
        replier.reply(inputPrompts[cmd] + "을(를) 입력해주세요.\n(중단하려면 '취소' 입력)");
        session.waitAction = cmd;
    } else if (cmd === "로그아웃") {
        session.data = null; 
        session.isMenuOpen = false;
        replier.reply("🚪 로그아웃되었습니다.");
    } else {
        var res = Helper.getMenu(room, isMain, isAdmin, !!session.data, cmd, session.data, DB);
        if (res) replier.reply(res);
        if (cmd !== "유저조회" && cmd !== "상점" && cmd !== "내정보") session.isMenuOpen = false;
    }
}

/**
 * 가입/로그인 등 입력 대기값 처리
 */
function processWaitInput(sender, msg, replier, session, isAdminRoom) {
    var action = session.waitAction;
    
    if (action === "가입") {
        replier.reply(Login.tryRegister(sender, msg, DB, Obj).msg);
    } else if (action === "로그인") {
        var loginRes = Login.tryLogin(msg, DB);
        if (loginRes.success) {
            session.data = loginRes.data;
            replier.reply("✅ [" + loginRes.data.info.name + "]님 환영합니다!");
        } else replier.reply("🚫 " + loginRes.msg);
    } else if (isAdminRoom && (action === "삭제" || action === "초기화")) {
        // [수정 포인트] 관리자 액션 객체 생성
        global.adminAction[sender] = { type: action, target: msg };
        replier.reply("⚠️ [" + msg + "] 유저를 정말로 " + action + "하시겠습니까?\n'확인'을 입력하면 실행됩니다. (취소: '취소')");
    } else if (isAdminRoom && action === "복구") {
        replier.reply(DB.restoreUser(msg) ? "✅ 복구 성공" : "❌ 복구 실패");
    }
    
    session.waitAction = null;
    // 정보성 창이 아닐 수 있으므로 메뉴 상태 해제 (상황에 따라 조절)
}

/**
 * 관리자 2차 확인(확인/취소) 처리
 * (유저 삭제가 안 되던 문제를 이 함수에서 해결)
 */
function processAdminConfirm(sender, msg, replier) {
    var actionObj = global.adminAction[sender];
    if (!actionObj) return;

    if (msg === "확인") {
        if (actionObj.type === "삭제") {
            var delRes = DB.deleteUser(actionObj.target);
            replier.reply(delRes ? "✅ 유저 데이터가 삭제(백업)되었습니다." : "❌ 삭제 실패 (유저 없음)");
        } else if (actionObj.type === "초기화") {
            var user = DB.readUser(actionObj.target);
            if (user) {
                var resetUser = Obj.getNewUser(user.info.id, "0", user.info.name);
                DB.writeUser(actionObj.target, resetUser);
                replier.reply("✅ 유저의 모든 스테이터스가 초기화되었습니다.");
            } else {
                replier.reply("❌ 해당 유저를 찾을 수 없습니다.");
            }
        }
    } else {
        replier.reply("❌ 작업이 취소되었습니다.");
    }
    // 확인이든 취소든 작업 후 데이터 제거
    delete global.adminAction[sender];
}

/**
 * 유저 상세 정보 출력
 */
function showUserDetail(userId, replier) {
    var user = DB.readUser(userId);
    if (!user) return replier.reply("❌ 데이터를 찾을 수 없습니다.");
    var msg = "👤 [" + user.info.name + "] 상세\n" + "━".repeat(12) + "\n• 레벨: " + user.status.level + "\n• 소지금: " + user.status.money + "G";
    replier.reply(msg);
}
