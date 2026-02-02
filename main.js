/**
 * [main.js] v3.2.7
 * 세션 기반 메인 컨트롤러 (Bridge 패턴)
 */

// 1. 모듈 로드 (경로: modules/ 폴더 기준)
var C = Bridge.getScopeOf("modules/Const.js").bridge();
var D = Bridge.getScopeOf("modules/common/database.js").bridge();
var O = Bridge.getScopeOf("modules/common/object.js").bridge();
var LoginM = Bridge.getScopeOf("modules/common/login/menu.js").bridge();
var LoginL = Bridge.getScopeOf("modules/common/login/logic.js").bridge();

// 전역 세션 관리 (봇 재시작 시 초기화 방지를 위해 존재 여부 확인)
if (!global.sessions) global.sessions = {};

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (!msg) return;
    msg = msg.trim();

    // 세션 초기화 및 생성
    if (!global.sessions[sender]) {
        global.sessions[sender] = { 
            isMenuOpen: false, 
            data: null, 
            waitAction: null, 
            id: sender 
        };
    }
    var session = global.sessions[sender];

    try {
        // [공통 명령어] 취소 - 모든 상태 초기화
        if (msg === "취소") {
            session.isMenuOpen = false; 
            session.waitAction = null;
            return replier.reply("❌ 모든 작업이 취소되었습니다.");
        }

        // [시스템 점검] 테스트 응답
        if (msg === C.Prefix + "테스트") {
            var status = "✅ [시스템 연결 테스트]\n";
            status += "━".repeat(12) + "\n";
            status += "📡 응답 상태: 정상 (Auto-Compile)\n";
            status += "📦 현재 버전: " + (C.VERSION || "v3.2.7") + "\n";
            status += "━".repeat(12);
            return replier.reply(status);
        }

        // [인증 체크] 로그인이 안 된 사용자
        if (!session.data) {
            // 접두사 + 메뉴 확인 (예: .메뉴)
            if (msg === C.Prefix + "메뉴") {
                if (isGroupChat) {
                    return replier.reply("『 🏰 소환사의 협곡 』\n" + "━".repeat(12) + "\n신원 확인이 필요합니다.\n\n💬 개인톡에서 '" + C.Prefix + "메뉴'를 입력해\n가입 및 로그인을 진행해 주세요!\n" + "━".repeat(12));
                } else {
                    session.isMenuOpen = true;
                    return replier.reply(LoginM.render(false));
                }
            }

            // 로그인/가입 입력 처리
            if (!isGroupChat && (session.waitAction || session.isMenuOpen)) {
                // 텍스트 입력 대기 (ID/PW 등)
                if (session.waitAction) {
                    return replier.reply(LoginL.handleWait(msg, session, D, O));
                }
                // 메뉴 번호 선택
                if (!isNaN(msg)) {
                    var res = LoginL.execute(msg, session);
                    if (res && res.msg) replier.reply(res.msg);
                }
            }
            return;
        }

        // [인증 완료] 로그인 사용자 로직
        if (msg === C.Prefix + "메뉴") {
            session.isMenuOpen = true;
            var path = isGroupChat ? "modules/group/" : "modules/user/";
            
            // 관리자방 체크
            if (room === C.ErrorLogRoom) path = "modules/admin/";
            
            var M = Bridge.getScopeOf(path + "menu.js").bridge();
            return replier.reply(M.render(session.data));
        }

        // 로그인 유저의 숫자 메뉴 조작 (개인톡)
        if (session.isMenuOpen && !isNaN(msg) && !isGroupChat) {
            var UserL = Bridge.getScopeOf("modules/user/logic.js").bridge();
            var res = UserL.execute(msg, session, D, O);
            if (res && res.msg) replier.reply(res.msg);
        }

    } catch (e) {
        // 에러 발생 시 로그방 또는 현재방에 알림
        var errorMsg = "🚨 [main] 런타임 에러\n사유: " + e.message + "\n라인: " + e.lineNumber;
        if (C && C.ErrorLogRoom) {
            Api.replyRoom(C.ErrorLogRoom, errorMsg);
        } else {
            replier.reply(errorMsg);
        }
    }
}
