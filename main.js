/**
 * [main.js]
 * 세션 기반 메인 컨트롤러 (Bridge 패턴)
 */

// 1. 모듈 로드 (Const.js 경로: modules/Const.js)
var C = Bridge.getScopeOf("modules/Const.js").bridge();
var D = Bridge.getScopeOf("modules/common/database.js").bridge();
var O = Bridge.getScopeOf("modules/common/object.js").bridge();
var LoginM = Bridge.getScopeOf("modules/common/login/menu.js").bridge();
var LoginL = Bridge.getScopeOf("modules/common/login/logic.js").bridge();

// 전역 세션 관리
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
        // [공통 명령어] 취소 - 세션 초기화용
        if (msg === "취소") {
            session.isMenuOpen = false; 
            session.waitAction = null;
            return replier.reply("❌ 모든 작업이 취소되었습니다.");
        }

        // [인증 체크] 로그인이 안 된 경우 (session.data가 없는 경우)
        if (!session.data) {
            // 접두사 + 메뉴 확인 (예: .메뉴)
            if (msg === C.Prefix + "메뉴") {
                if (isGroupChat) {
                    return replier.reply("『 🏰 소환사의 협곡 』\n" + "━".repeat(12) + "\n신원 확인이 필요합니다.\n\n💬 개인톡에서 '" + C.Prefix + "메뉴'를 입력해\n가입 및 로그인을 진행해 주세요!\n" + "━".repeat(12));
                } else {
                    session.isMenuOpen = true;
                    var loginMenu = LoginM.render(false);
                    return replier.reply(loginMenu);
                }
            }

            // 로그인/가입 진행 중 입력 처리
            if (!isGroupChat && (session.waitAction || session.isMenuOpen)) {
                // 아이디/비번 등 텍스트 입력 대기 상태
                if (session.waitAction) {
                    return replier.reply(LoginL.handleWait(msg, session, D, O));
                }
                // 메뉴 번호 선택 (숫자)
                if (!isNaN(msg)) {
                    var res = LoginL.execute(msg, session);
                    if (res && res.msg) replier.reply(res.msg);
                }
            }
            return;
        }

        // [로그인 완료 사용자 로직]
        if (msg === C.Prefix + "메뉴") {
            session.isMenuOpen = true;
            var path = isGroupChat ? "modules/group/" : "modules/user/";
            
            // 관리자 전용 방 체크
            if (room === C.ErrorLogRoom) path = "modules/admin/";
            
            var M = Bridge.getScopeOf(path + "menu.js").bridge();
            return replier.reply(M.render(session.data));
        }

        // 로그인 유저의 숫자 메뉴 조작 (개인톡 전용)
        if (session.isMenuOpen && !isNaN(msg) && !isGroupChat) {
            var UserL = Bridge.getScopeOf("modules/user/logic.js").bridge();
            var res = UserL.execute(msg, session, D, O);
            if (res && res.msg) replier.reply(res.msg);
        }

    } catch (e) {
        // 에러 로그 출력
        var errorMsg = "🚨 [main] 에러 발생\n사유: " + e.message + "\n라인: " + e.lineNumber;
        if (C && C.ErrorLogRoom) {
            Api.replyRoom(C.ErrorLogRoom, errorMsg);
        } else {
            replier.reply(errorMsg);
        }
    }
}
