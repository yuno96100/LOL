/* ============================================================
   [SECTION 2] 응답 엔진 (Response Engine)
   ============================================================ */
function response(room, msg, sender, isGroupChat, replier) {
    if (!msg) return;
    var input = msg.trim();
    
    if (!global.SESSIONS_V4[sender]) {
        global.SESSIONS_V4[sender] = { isMenuOpen: false, data: null, waitAction: null, currentView: "메인" };
    }
    var session = global.SESSIONS_V4[sender];

    var isCancel = (input === "취소");
    var isCommand = input.startsWith(".");
    var isNumber = !isNaN(input);
    var isWaiting = !!session.waitAction;

    // [중요] 메뉴가 닫혀있고, 입력 대기도 아니고, 명령어도 아니면 즉시 차단
    if (!isCancel && !isCommand && !isNumber && !isWaiting) return;

    try {
        if (isCancel) {
            session.isMenuOpen = false; session.waitAction = null; session.currentView = "메인";
            global.ADMIN_QUEUE_V4[sender] = null;
            return replier.reply("❌ 모든 작업을 중단하고 메인으로 돌아갑니다.");
        }

        var isAdminRoom = (room === _C.ErrorLogRoom);
        var isMainRoom = (room === _C.MainRoomName);

        /* [SECTION 2-1] 상태별 명령어 제한 로직 (Context Control) */

        // 1. 관리자 2차 확인 (관리자 컨텍스트 필수)
        if (isAdminRoom && global.ADMIN_QUEUE_V4[sender]) {
            adminActionHandler(sender, input, replier);
            return;
        }

        // 2. 입력 대기 처리 (가입/로그인 등 특정 액션 대기 중)
        if (session.waitAction) {
            inputWaitHandler(sender, input, replier, session, isAdminRoom);
            return;
        }

        // 3. 메뉴 호출 (.메뉴)
        if (input === ".메뉴") {
            session.isMenuOpen = true; 
            session.currentView = "메인"; // 메뉴 호출 시 항상 메인 컨텍스트로 리셋
            replier.reply(_H.getMenu(room, isMainRoom, isAdminRoom, !!session.data, "메인", session.data, _D));
            return;
        }

        // 4. 숫자 선택 및 기능 실행 (메뉴가 열린 상태에서만)
        if (session.isMenuOpen && isNumber) {
            // [핵심] 여기서 현재 session.currentView를 기반으로 명령 허용 여부를 결정합니다.
            selectionHandler(input, sender, session, replier, room, isMainRoom, isAdminRoom);
        } else if (session.isMenuOpen && !isNumber) {
             // 메뉴가 열려있는데 숫자가 아닌 다른 채팅을 치면 무시하거나 안내
             // (이 섹션이 있으면 메뉴 외 채팅이 차단되는 효과가 있습니다)
        }

    } catch (e) {
        Api.replyRoom(_C.ErrorLogRoom, "🚨 [v2.3.8] 에러: " + e.message + " (L:" + e.lineNumber + ")");
    }
}

/* ============================================================
   [SECTION 3] 세부 로직 (Selection & Validation)
   ============================================================ */

function selectionHandler(num, sender, session, replier, room, isMain, isAdmin) {
    /**
     * [컨텍스트 1] 유저조회(목록) 상태
     * 이 상태에서는 '숫자' 입력이 '상세보기'로만 작동합니다.
     */
    if (session.currentView === "유저조회") {
        if (!isAdmin) return (session.currentView = "메인");
        
        var idx = parseInt(num) - 1;
        if (global.tempUserList && global.tempUserList[idx]) {
            showUserDetail(global.tempUserList[idx], replier);
        } else {
            replier.reply("❌ 잘못된 번호입니다. (목록에 있는 번호 입력)");
        }
        return;
    }

    /**
     * [컨텍스트 2] 상점 상태 (추후 확장용)
     * 이 상태에서는 '숫자' 입력이 '아이템 구매'로만 작동하게 됩니다.
     */
    if (session.currentView === "상점") {
        replier.reply("🛒 상점 기능은 현재 개발 중입니다. (번호: " + num + ")");
        return;
    }

    /**
     * [컨텍스트 3] 메인 메뉴 상태
     * 가장 기본적인 메뉴 이동 로직입니다.
     */
    var cmd = _H.getRootCmdByNum(isAdmin, isMain, !!session.data, num);
    if (cmd) {
        // [보안] 권한 없는 명령어가 숫자로 들어올 경우 원천 차단
        if (cmd === "유저조회" && !isAdmin) return;

        session.currentView = cmd; // 카테고리 진입 (컨텍스트 변경)

        if (cmd === "유저조회" || cmd === "상점" || cmd === "내정보") {
            var res = _H.getMenu(room, isMain, isAdmin, !!session.data, cmd, session.data, _D);
            if (res) replier.reply(res);
        } else {
            // 입력 유도 로직 (가입, 삭제 등)
            var prompts = { "가입": "📝 닉네임", "로그인": "🔑 닉네임", "삭제": "🛠️ 삭제대상", "초기화": "🛠️ 초기화대상" };
            if (prompts[cmd]) {
                replier.reply("💬 " + prompts[cmd] + "을(를) 입력해주세요.");
                session.waitAction = cmd;
            }
        }
    }
}
