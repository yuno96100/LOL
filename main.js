const libConst = Bridge.getScopeOf("Const.js").bridge();
const DB = Bridge.getScopeOf("DataBase.js").bridge();
const Obj = Bridge.getScopeOf("Object.js").bridge();
const Login = Bridge.getScopeOf("LoginManager.js").bridge();
const Helper = Bridge.getScopeOf("Helper.js").bridge();

let sessions = {}; 

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    try {
        if (!sessions[sender]) sessions[sender] = { isMenuOpen: false, data: null };
        let userSession = sessions[sender].data;
        let isLoggedIn = !!userSession;
        let isPrefix = msg.startsWith(libConst.Prefix);
        
        let command = "";
        let params = [];

        // 명령어 분석
        if (isPrefix) {
            let args = msg.split(" ");
            command = args[0].slice(libConst.Prefix.length);
            params = args.slice(1);
        } else if (!isNaN(msg) && sessions[sender].isMenuOpen) {
            command = msg.trim();
        } else {
            return; // 일반 채팅 무시
        }

        // 번호 명령어 변환 (모든 메뉴 공통)
        if (!isNaN(command)) {
            if (sessions[sender].isMenuOpen) {
                let mapped = Helper.getRootCmdByNum(room, isGroupChat, isLoggedIn, command);
                if (mapped) command = mapped;
            } else {
                if (!isPrefix) return;
                return replier.reply("💡 메뉴 창을 먼저 열어주세요. (" + libConst.Prefix + "메뉴)");
            }
        }

        // 실행 로직
        switch (command) {
            case "메뉴":
                sessions[sender].isMenuOpen = true;
                replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, null, userSession, DB));
                break;

            case "가입":
                if (isGroupChat) return replier.reply("❌ 가입은 개인톡에서 진행해주세요.");
                if (params.length < 2) {
                    let guide = "📝 [ 회원가입 안내 ]\n━━━━━━━━━━━━━━━\n📍 입력법: " + libConst.Prefix + "가입 [닉네임] [비밀번호]\n📍 예시: " + libConst.Prefix + "가입 페이커 1234";
                    return replier.reply(guide);
                }
                replier.reply(Login.tryRegister(params[0], params[1], params[0], DB, Obj).msg);
                sessions[sender].isMenuOpen = false;
                break;

            case "로그인":
                if (isGroupChat) return replier.reply("❌ 로그인은 개인톡에서 진행해주세요.");
                if (params.length < 2) return replier.reply("🔓 [ 로그인 ]\n입력법: " + libConst.Prefix + "로그인 [닉네임] [비밀번호]");
                var logRes = Login.tryLogin(params[0], params[1], DB);
                if (logRes.success) sessions[sender].data = logRes.data;
                replier.reply(logRes.msg);
                sessions[sender].isMenuOpen = false;
                break;

            case "내정보":
            case "인벤토리":
            case "가이드":
            case "랭킹":
            case "데이터":
            case "유저제어":
                replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, command, userSession, DB));
                break;

            case "도움말":
                replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, "도움말", userSession, DB));
                break;

            case "로그아웃":
                sessions[sender].data = null;
                sessions[sender].isMenuOpen = false;
                replier.reply("🚪 로그아웃 완료");
                break;

            case "정보":
                replier.reply("🧪 LOL봇 v" + libConst.Version + "\n📝 전 메뉴 무접두사 번호 이동 통합 적용");
                break;
        }

    } catch (e) {
        Api.replyRoom(libConst.ErrorLogRoom, "🚨 에러: " + e.message + " (L:" + e.lineNumber + ")");
    }
}
