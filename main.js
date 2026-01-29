const libConst = Bridge.getScopeOf("Const.js").bridge();
const DB = Bridge.getScopeOf("DataBase.js").bridge();
const Obj = Bridge.getScopeOf("Object.js").bridge();
const Login = Bridge.getScopeOf("LoginManager.js").bridge();
const Helper = Bridge.getScopeOf("Helper.js").bridge();

if (!global.sessions) global.sessions = {}; 

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    try {
        if (!global.sessions[sender]) global.sessions[sender] = { isMenuOpen: false, data: null };
        let userSession = global.sessions[sender].data;
        let isLoggedIn = !!userSession;

        // [필독 공지 문구]
        const NicknameSyncWarning = "\n\n⚠️ **중요: 닉네임 일치 안내**\n개인톡과 그룹톡의 카카오톡 닉네임이 **100% 일치**해야 데이터가 연동됩니다. (띄어쓰기/특수문자 주의)";

        // [1] 미로그인 접근 제어
        if (!isLoggedIn && room.trim() !== libConst.ErrorLogRoom.trim()) {
            const isAuthCmd = msg === libConst.Prefix + "메뉴" || 
                             msg.startsWith(libConst.Prefix + "가입") || 
                             msg.startsWith(libConst.Prefix + "로그인") ||
                             (global.sessions[sender].isMenuOpen && (msg === "1" || msg === "2"));

            if (!isAuthCmd) {
                if (isGroupChat) {
                    if (msg.startsWith(libConst.Prefix) || !isNaN(msg)) {
                        return replier.reply("⚠️ [" + sender + "]님, 로그인이 필요합니다.\n개인톡에서 로그인을 먼저 해주세요!" + NicknameSyncWarning);
                    }
                    return;
                } else {
                    global.sessions[sender].isMenuOpen = true;
                    return replier.reply("👋 로그인 후 이용 가능합니다!\n" + Helper.getMenu(room, isGroupChat, false, null, null, DB) + NicknameSyncWarning);
                }
            }
        }

        // [2] 명령어/번호 분석
        let isPrefix = msg.startsWith(libConst.Prefix);
        let command = "";
        let params = [];
        if (isPrefix) {
            let args = msg.split(" ");
            command = args[0].slice(libConst.Prefix.length);
            params = args.slice(1);
        } else if (!isNaN(msg) && global.sessions[sender].isMenuOpen) {
            command = msg.trim();
        } else {
            return; 
        }

        // [3] 메뉴 오픈 여부 체크
        if (command !== "메뉴" && !global.sessions[sender].isMenuOpen) {
            return replier.reply("⚠️ 먼저 '" + libConst.Prefix + "메뉴'를 입력해 주세요.");
        }

        // [4] 번호 -> 명령어 변환
        if (!isNaN(command)) {
            let mapped = Helper.getRootCmdByNum(room, isGroupChat, isLoggedIn, command);
            if (mapped) command = mapped;
        }

        // [5] 실행 로직
        switch (command) {
            case "메뉴":
                global.sessions[sender].isMenuOpen = true;
                replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, null, userSession, DB));
                break;

            case "가입":
                if (isGroupChat) return replier.reply("❌ 가입은 개인톡에서 진행해주세요.");
                if (params.length < 1) {
                    return replier.reply("📝 [가입 가이드]\n" + libConst.Prefix + "가입 [비밀번호]" + NicknameSyncWarning);
                }
                replier.reply(Login.tryRegister(sender, params[0], sender, DB, Obj).msg);
                global.sessions[sender].isMenuOpen = false;
                break;

            case "로그인":
                if (isGroupChat) return replier.reply("❌ 로그인은 개인톡에서 진행해주세요.");
                if (params.length < 1) {
                    return replier.reply("🔓 [로그인 가이드]\n" + libConst.Prefix + "로그인 [비밀번호]" + NicknameSyncWarning);
                }
                var res = Login.tryLogin(sender, params[0], DB);
                if (res.success) global.sessions[sender].data = res.data;
                replier.reply(res.msg);
                global.sessions[sender].isMenuOpen = false;
                break;

            case "내정보":
            case "도움말":
            case "정보":
                replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, command, userSession, DB));
                break;

            case "로그아웃":
                global.sessions[sender].data = null;
                global.sessions[sender].isMenuOpen = false;
                replier.reply("🚪 로그아웃 되었습니다.\n(닉네임을 변경하시려면 지금 변경 후 다시 로그인하세요!)");
                break;
        }
    } catch (e) {
        Api.replyRoom(libConst.ErrorLogRoom, "🚨 에러: " + e.message + " (L:" + e.lineNumber + ")");
    }
}
