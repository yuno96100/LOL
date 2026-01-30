/* ============================================================
   [SECTION 1] 엔진 초기화 및 메모리 세척
   ============================================================ */
// 모든 전역 변수를 초기화하여 구버전 에러(두유노)의 뿌리를 뽑습니다.
(function cleanMemory() {
    var keys = ["libs", "L", "sessions", "USER_SESSIONS_FINAL", "USER_SESSIONS_V4"];
    for (var i = 0; i < keys.length; i++) {
        delete global[keys[i]];
    }
})();

// 새 저장소 선언
if (!global.SESSIONS_FIX) global.SESSIONS_FIX = {};

/* ============================================================
   [SECTION 2] 메인 응답 엔진
   ============================================================ */
function response(room, msg, sender, isGroupChat, replier) {
    if (!msg) return;
    var input = msg.trim();
    
    // [보안] 세션 생성
    if (!global.SESSIONS_FIX[sender]) {
        global.SESSIONS_FIX[sender] = { isMenuOpen: false, data: null, waitAction: null };
    }
    var session = global.SESSIONS_FIX[sender];

    // [2-1] 필터링 (라이브러리 참조 없이 직접 처리)
    if (input === ".메뉴") {
        try {
            // 라이브러리 로드 시도
            var _C = Bridge.getScopeOf("Const.js").bridge();
            var _D = Bridge.getScopeOf("DataBase.js").bridge();
            var _H = Bridge.getScopeOf("Helper.js").bridge();

            session.isMenuOpen = true;
            
            // Helper가 정상일 경우 메뉴 출력
            if (_H && _H.getMenu) {
                var menu = _H.getMenu(room, (room === _C.MainRoomName), (room === _C.ErrorLogRoom), !!session.data, "메인", session.data, _D);
                replier.reply(menu);
            } else {
                // Helper가 에러일 경우 자체 기본 메뉴 출력 (비상용)
                replier.reply("🏰 [비상 메뉴판]\n" + "━".repeat(12) + "\n시스템 복구 중입니다.\n1. 가입하기\n2. 로그인\n" + "━".repeat(12));
            }
        } catch (e) {
            replier.reply("⚠️ 라이브러리 로드 실패. 스크립트를 새로고침 해주세요.\n에러: " + e.message);
        }
        return;
    }

    // [2-2] 숫자 입력 처리 (메뉴가 열려 있을 때)
    if (session.isMenuOpen && !isNaN(input)) {
        handleBasicSelection(input, sender, session, replier, room);
    }

    // [2-3] 취소 로직
    if (input === "취소") {
        session.isMenuOpen = false;
        session.waitAction = null;
        replier.reply("❌ 모든 작업이 취소되었습니다.");
    }
}

/* ============================================================
   [SECTION 3] 기초 핸들러 (의존성 최소화)
   ============================================================ */
function handleBasicSelection(num, sender, session, replier, room) {
    try {
        var _C = Bridge.getScopeOf("Const.js").bridge();
        var _D = Bridge.getScopeOf("DataBase.js").bridge();
        var _H = Bridge.getScopeOf("Helper.js").bridge();
        
        var isAdmin = (room === _C.ErrorLogRoom);
        var isMain = (room === _C.MainRoomName);
        var cmd = _H.getRootCmdByNum(isAdmin, isMain, !!session.data, num);
        
        if (cmd) {
            if (cmd === "가입" || cmd === "로그인") {
                replier.reply("💬 " + cmd + "하실 닉네임을 입력해주세요.");
                session.waitAction = cmd;
                session.isMenuOpen = false;
            } else {
                var res = _H.getMenu(room, isMain, isAdmin, !!session.data, cmd, session.data, _D);
                if (res) replier.reply(res);
            }
        }
    } catch (e) {
        replier.reply("🚨 선택 처리 중 에러: " + e.message);
    }
}
