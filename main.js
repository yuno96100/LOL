/**
 * [main.js] v3.4.6
 */
var C = null, D = null, O = null, L = null;
var errorLog = "";

try {
    // 하나씩 안전하게 로드
    var scC = Bridge.getScopeOf("modules/Const.js");
    if (scC) C = scC.bridge(); else errorLog += "Const.js 미발견\n";

    var scD = Bridge.getScopeOf("modules/common/database.js");
    if (scD) D = scD.bridge(); else errorLog += "database.js 미발견\n";

    var scO = Bridge.getScopeOf("modules/common/object.js");
    if (scO) O = scO.bridge(); else errorLog += "object.js 미발견\n";

    // 통합된 Login.js 로드
    var scL = Bridge.getScopeOf("modules/Login.js");
    if (scL) L = scL.bridge(); else errorLog += "Login.js 미발견\n";

} catch (e) {
    errorLog = "🚨 로드 에러: " + e.message;
}

if (!global.sessions) global.sessions = {};

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (!msg) return;
    msg = msg.trim();

    if (!global.sessions[sender]) {
        global.sessions[sender] = { isMenuOpen: false, data: null, waitAction: null, id: sender };
    }
    var session = global.sessions[sender];

    try {
        if (msg === "취소") {
            session.isMenuOpen = false; session.waitAction = null;
            return replier.reply("❌ 취소되었습니다.");
        }

        // 테스트 명령어 (에러가 있다면 여기서 다 보여줍니다)
        if (msg === (C ? C.Prefix : ".") + "테스트") {
            if (errorLog) return replier.reply("⚠️ [로드 실패 목록]\n" + errorLog + "\n💡 위 파일들이 modules 폴더에 있는지 확인하세요.");
            return replier.reply("✅ [v3.4.6] 모든 모듈 로드 성공!");
        }

        // 로직 실행 (L이 정상 로드되었을 때만)
        if (L && C) {
            if (!session.data && msg === C.Prefix + "메뉴") {
                if (isGroupChat) return replier.reply("개인톡에서 이용해 주세요.");
                session.isMenuOpen = true;
                return replier.reply(L.render(false));
            }

            if (!session.data && !isGroupChat && (session.isMenuOpen || session.waitAction)) {
                if (session.waitAction) return replier.reply(L.handleWait(msg, session, D, O));
                if (!isNaN(msg)) {
                    var res = L.execute(msg, session);
                    if (res && res.msg) replier.reply(res.msg);
                }
            }
        } else if (msg.startsWith(C ? C.Prefix : ".")) {
            replier.reply("🚨 모듈 로드 실패 상태입니다. '.테스트'를 입력해 원인을 확인하세요.");
        }
        
    } catch (e) {
        replier.reply("🚨 실행 에러: " + e.message);
    }
}
