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
        let isPrefix = msg.startsWith(libConst.Prefix);

        // [1] 미로그인 유저 접근 제어 (개인톡 가이드 + 그룹톡 차단)
        if (!isLoggedIn && room.trim() !== libConst.ErrorLogRoom.trim()) {
            const isAuthCmd = msg === libConst.Prefix + "메뉴" || 
                             msg.startsWith(libConst.Prefix + "가입") || 
                             msg.startsWith(libConst.Prefix + "로그인") ||
                             (global.sessions[sender].isMenuOpen && (msg === "1" || msg === "2"));

            if (!isAuthCmd) {
                if (isGroupChat) {
                    if (isPrefix || !isNaN(msg)) {
                        return replier.reply("⚠️ [" + sender + "]님, 개인톡에서 로그인을 먼저 해주세요!");
                    }
                    return;
                } else {
                    global.sessions[sender].isMenuOpen = true;
                    return replier.reply("⚠️ 로그인이 필요합니다.\n" + Helper.getMenu(room, isGroupChat, false, null, null, DB));
                }
            }
        }

        // [2] 명령어/번호 분석
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

        // [5] 명령어 실행
        switch (command) {
            case "메뉴":
                global.sessions[sender].isMenuOpen = true;
                replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, null, userSession, DB));
                break;

            case "가입":
                if (isGroupChat) return replier.reply("❌ 개인톡에서 진행해주세요.");
                if (params.length < 1) return replier.reply("📝 " + libConst.Prefix + "가입 [비밀번호]\n아이디는 '" + sender + "'로 자동 설정됩니다.");
                replier.reply(Login.tryRegister(sender, params[0], sender, DB, Obj).msg);
                global.sessions[sender].isMenuOpen = false;
                break;

            case "로그인":
                if (isGroupChat) return replier.reply("❌ 개인톡에서 진행해주세요.");
                if (params.length < 1) return replier.reply("🔓 " + libConst.Prefix + "로그인 [비밀번호]");
                var res = Login.tryLogin(sender, params[0], DB);
                if (res.success) global.sessions[sender].data = res.data;
                replier.reply(res.msg);
                global.sessions[sender].isMenuOpen = false;
                break;

            case "로그아웃":
                global.sessions[sender].data = null;
                global.sessions[sender].isMenuOpen = false;
                replier.reply("🚪 로그아웃 완료. (그룹톡 이용 제한)");
                break;

            case "내정보":
            case "도움말":
            case "정보":
            case "데이터":
                replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, command, userSession, DB));
                break;
        }

    } catch (e) {
        Api.replyRoom(libConst.ErrorLogRoom, "🚨 에러: " + e.message + " (L:" + e.lineNumber + ")");
    }
}
