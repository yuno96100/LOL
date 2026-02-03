/**
 * [main.js] v3.4.3
 * 중괄호 구조 교정 및 롤백 버전
 */

// 모듈 로드
var C = Bridge.getScopeOf("modules/Const.js").bridge();
var D = Bridge.getScopeOf("modules/common/database.js").bridge();
var O = Bridge.getScopeOf("modules/common/object.js").bridge();
var LoginM = Bridge.getScopeOf("modules/common/login/menu.js").bridge();
var LoginL = Bridge.getScopeOf("modules/common/login/logic.js").bridge();

if (!global.sessions) global.sessions = {};

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (!msg) return;
    msg = msg.trim();

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
        // [1] 취소 로직
        if (msg === "취소") {
            session.isMenuOpen = false;
            session.waitAction = null;
            return replier.reply("❌ 취소되었습니다.");
        }

        // [2] 테스트 로직
        if (msg === C.Prefix + "테스트") {
            return replier.reply("✅ [v3.4.3] 시스템 정상 복구 완료!");
        }

        // [3] 비로그인 메뉴 호출
        if (!session.data && msg === C.Prefix + "메뉴") {
            if (isGroupChat) return replier.reply("개인톡에서 이용해 주세요.");
            session.isMenuOpen = true;
            return replier.reply(LoginM.render(false));
        }

        // [4] 세션 기반 입력 처리
        if (!session.data && !isGroupChat && (session.isMenuOpen || session.waitAction)) {
            // 텍스트 입력 대기 중일 때
            if (session.waitAction) {
                return replier.reply(LoginL.handleWait(msg, session, D, O));
            }
            
            // 메뉴 번호 선택 중일 때
            if (!isNaN(msg)) {
                var res = LoginL.execute(msg, session);
                if (res && res.msg) replier.reply(res.msg);
            }
        } // <--- 여기가 56라인 근처, 괄호 닫힘 확인

    } catch (e) {
        replier.reply("🚨 실행 에러: " + e.message + " (Line: " + e.lineNumber + ")");
    }
}
