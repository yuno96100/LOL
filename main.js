/**
 * [main.js] v3.5.2
 * All-in-One 통합 버전
 */

// [1] 설정값 직접 정의
var Config = {
    Prefix: ".",
    AdminHash: "2056407147"
};

if (!global.sessions) global.sessions = {};

// [2] 로그인 시스템 로직 통합
var LoginSystem = {
    render: function(isLogged) {
        if (isLogged) return "✅ 이미 로그인된 상태입니다.";
        return "『 🏰 소환사의 협곡 』\n" + 
               "━━━━━━━━━━━━━━\n" + 
               "1. 회원가입\n" + 
               "2. 로그인\n" + 
               "━━━━━━━━━━━━━━\n" + 
               "💬 번호를 입력해주세요.";
    },
    
    execute: function(msg, session) {
        if (msg === "1") {
            session.waitAction = "가입_아이디";
            return "📝 가입하실 [아이디]를 입력해주세요.";
        }
        if (msg === "2") {
            session.waitAction = "로그인_아이디";
            return "🔑 [아이디]를 입력해주세요.";
        }
        return "❌ 1번 또는 2번을 선택해주세요.";
    },
    
    handleWait: function(msg, session) {
        if (session.waitAction === "가입_아이디") {
            session.tempId = msg;
            session.waitAction = "가입_비밀번호";
            return "✅ 아이디: " + msg + "\n🔐 사용할 [비밀번호]를 입력하세요.";
        }
        if (session.waitAction === "가입_비밀번호") {
            session.waitAction = null;
            return "✨ 회원가입 신청 완료!\n아이디: " + session.tempId;
        }
        session.waitAction = null;
        return "입력 확인: " + msg;
    }
};

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (!msg) return;
    msg = msg.trim();

    if (!global.sessions[sender]) {
        global.sessions[sender] = { isMenuOpen: false, data: null, waitAction: null, id: sender };
    }
    var session = global.sessions[sender];

    try {
        if (msg === "취소") {
            session.isMenuOpen = false;
            session.waitAction = null;
            return replier.reply("❌ 취소되었습니다.");
        }

        if (msg === Config.Prefix + "테스트") {
            return replier.reply("✅ [v3.5.2] 통합 버전 정상 가동 중!");
        }

        if (!session.data && msg === Config.Prefix + "메뉴") {
            if (isGroupChat) return replier.reply("⚠️ 개인톡 전용입니다.");
            session.isMenuOpen = true;
            return replier.reply(LoginSystem.render(false));
        }

        if (!session.data && !isGroupChat && (session.isMenuOpen || session.waitAction)) {
            if (session.waitAction) return replier.reply(LoginSystem.handleWait(msg, session));
            if (!isNaN(msg)) return replier.reply(LoginSystem.execute(msg, session));
        }

    } catch (e) {
        replier.reply("🚨 에러: " + e.message + " (L:" + e.lineNumber + ")");
    }
}
