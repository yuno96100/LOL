/* ==========================================
   1. 라이브러리 및 전역 세션 관리 (Global Setup)
   ========================================== */
function L() {
    if (!global.libs) {
        global.libs = {
            C: Bridge.getScopeOf("Const.js").bridge(),
            D: Bridge.getScopeOf("DataBase.js").bridge(),
            O: Bridge.getScopeOf("Object.js").bridge(),
            Log: Bridge.getScopeOf("LoginManager.js").bridge(),
            H: Bridge.getScopeOf("Helper.js").bridge()
        };
    }
    return global.libs;
}

if (!global.sessions) global.sessions = {};
if (!global.adminAction) global.adminAction = {};

/* ==========================================
   2. 메인 응답 엔진 (Response Engine)
   ========================================== */
function response(room, msg, sender, isGroupChat, replier) {
    const lib = L();
    const input = msg ? msg.trim() : "";
    
    // [세션 초기화]
    if (!global.sessions[sender]) {
        global.sessions[sender] = { isMenuOpen: false, data: null, waitAction: null, currentView: "메인" };
    }
    const session = global.sessions[sender];

    // [섹션 A: 필터링] 무관한 메시지 즉시 차단
    if (!input.startsWith(lib.C.Prefix) && isNaN(input) && !session.waitAction && input !== "취소") return;

    try {
        /* [섹션 B: 공통 제어] 취소 로직 */
        if (input === "취소") {
            session.isMenuOpen = false; session.waitAction = null;
            global.adminAction[sender] = null;
            return replier.reply("❌ 모든 작업을 중단하고 메인으로 돌아갑니다.");
        }

        const isAdminRoom = (room === lib.C.ErrorLogRoom);
        const isMainRoom = (room === lib.C.MainRoomName);

        /* [섹션 C: 상태별 분기] 관리자 확인 / 입력 대기 / 메뉴 호출 */
        // C-1. 관리자 확인 단계
        if (isAdminRoom && global.adminAction[sender]) {
            handleAdminAction(sender, input, replier, lib);
            return;
        }

        // C-2. 가입/로그인 등 입력 대기 단계
        if (session.waitAction) {
            handleInputWait(sender, input, replier, session, isAdminRoom, lib);
            return;
        }

        // C-3. 명령어 호출 (.메뉴)
        if (input === lib.C.Prefix + "메뉴") {
            session.isMenuOpen = true; session.currentView = "메인";
            replier.reply(lib.H.getMenu(room, isMainRoom, isAdminRoom, !!session.data, "메인", session.data, lib.D));
            return;
        }

        // C-4. 메뉴 열림 상태에서 숫자 선택
        if (session.isMenuOpen && !isNaN(input)) {
            handleMenuSelection(input, sender, session, replier, room, isMainRoom, isAdminRoom, lib);
        }

    } catch (e) { 
        Api.replyRoom(lib.C.ErrorLogRoom, "🚨 [v2.3.0] 에러 발생: " + e.message + " (L:" + e.lineNumber + ")"); 
    }
}

/* ==========================================
   3. 세부 액션 처리부 (Action Handlers)
   ========================================== */

// [메뉴 숫자 선택 처리]
function handleMenuSelection(num, sender, session, replier, room, isMain, isAdmin, lib) {
    if (session.currentView === "유저조회") {
        let idx = parseInt(num) - 1;
        if (global.tempUserList && global.tempUserList[idx]) {
            return showUserDetail(global.tempUserList[idx], replier, lib);
        }
    }
    
    let cmd = lib.H.getRootCmdByNum(isAdmin, isMain, !!session.data, num);
    if (cmd) {
        session.currentView = cmd;
        executeFinalCommand(cmd, sender, session, replier, room, isMain, isAdmin, lib);
    }
}

// [최종 명령어 실행]
function executeFinalCommand(cmd, sender, session, replier, room, isMain, isAdmin, lib) {
    const inputMaps = { "가입": "📝 닉네임", "로그인": "🔑 닉네임", "삭제": "🛠️ 삭제대상", "초기화": "🛠️ 초기화대상", "복구": "🛠️ 복구대상" };
    
    if (inputMaps[cmd]) {
        replier.reply(inputMaps[cmd] + "을(를) 입력해주세요.\n(중단하려면 '취소' 입력)");
        session.waitAction = cmd;
    } else if (cmd === "로그아웃") {
        session.data = null; session.isMenuOpen = false;
        replier.reply("🚪 안전하게 로그아웃되었습니다.");
    } else {
        let menuMsg = lib.H.getMenu(room, isMain, isAdmin, !!session.data, cmd, session.data, lib.D);
        if (menuMsg) replier.reply(menuMsg);
        // 정보성 메뉴가 아니면 메뉴 상태 자동 닫기
        if (cmd !== "유저조회" && cmd !== "상점" && cmd !== "내정보") session.isMenuOpen = false;
    }
}

// [입력 대기 처리]
function handleInputWait(sender, msg, replier, session, isAdmin, lib) {
    let act = session.waitAction;
    if (act === "가입") replier.reply(lib.Log.tryRegister(sender, msg, lib.D, lib.O).msg);
    else if (act === "로그인") {
        let res = lib.Log.tryLogin(msg, lib.D);
        if (res.success) { session.data = res.data; replier.reply("✅ [" + res.data.info.name + "]님으로 로그인되었습니다."); }
        else replier.reply("🚫 " + res.msg);
    } else if (isAdmin && (act === "삭제" || act === "초기화")) {
        global.adminAction[sender] = { type: act, target: msg };
        replier.reply("⚠️ [" + msg + "] " + act + "을(를) 진행하시겠습니까? (확인/취소)");
    } else if (isAdmin && act === "복구") {
        replier.reply(lib.D.restoreUser(msg) ? "✅ 성공적으로 복구되었습니다." : "❌ 복구 실패 (파일 없음)");
    }
    session.waitAction = null; session.isMenuOpen = false;
}

// [관리자 확인 처리]
function handleAdminAction(sender, msg, replier, lib) {
    let a = global.adminAction[sender];
    if (msg === "확인") {
        if (a.type === "삭제") lib.D.deleteUser(a.target);
        else if (a.type === "초기화") {
            let u = lib.D.readUser(a.target);
            if (u) lib.D.writeUser(a.target, lib.O.getNewUser(u.info.id, "0", u.info.name));
        }
        replier.reply("✅ 요청하신 작업이 완료되었습니다.");
    } else replier.reply("❌ 작업을 취소했습니다.");
    delete global.adminAction[sender];
}

// [상세 정보 표시]
function showUserDetail(id, replier, lib) {
    let u = lib.D.readUser(id);
    if (!u) return replier.reply("❌ 유저 정보를 불러올 수 없습니다.");
    replier.reply("👤 [" + u.info.name + "] 상세 정보\n" + "━".repeat(12) + "\n• 레벨: " + u.status.level + "\n• 골드: " + u.status.money + "G\n• 가입: " + new Date(u.info.joinDate).toLocaleDateString());
}
