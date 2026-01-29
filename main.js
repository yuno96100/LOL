const libConst = Bridge.getScopeOf("Const.js").bridge();
const DB = Bridge.getScopeOf("DataBase.js").bridge();
const Obj = Bridge.getScopeOf("Object.js").bridge();
const Login = Bridge.getScopeOf("LoginManager.js").bridge();
const Helper = Bridge.getScopeOf("Helper.js").bridge();

let sessions = {}; 

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    try {
        if (!msg.startsWith(libConst.Prefix)) return;
        const args = msg.split(" ");
        let command = args[0].slice(libConst.Prefix.length);
        const params = args.slice(1);

        if (!sessions[sender]) sessions[sender] = { isMenuOpen: false, data: null };
        let userSession = sessions[sender].data;
        let isLoggedIn = !!userSession;

        // [1] 메뉴 명령어 (.메뉴)
        if (command === "메뉴") {
            let cat = params[0];
            
            // 번호를 입력했는데 메뉴가 닫혀있다면 명시적 '메뉴 1'만 허용 혹은 차단
            if (cat && !isNaN(cat) && !sessions[sender].isMenuOpen) {
                return replier.reply("❌ 메뉴 창을 먼저 열어주세요. (" + libConst.Prefix + "메뉴)");
            }

            // 번호 매핑 (Helper 브릿지 호출)
            let mappedCat = Helper.getRootCmdByNum(room, isGroupChat, isLoggedIn, cat);
            if (mappedCat) command = mappedCat; 
            else {
                sessions[sender].isMenuOpen = true; // 카테고리 없으면 메뉴 오픈
                return replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, null, userSession, DB));
            }
        }

        // [2] 단독 번호 입력 (.1, .2 등)
        if (!isNaN(command)) {
            if (!sessions[sender].isMenuOpen) {
                return replier.reply("💡 메뉴 창이 닫혀있습니다. '" + libConst.Prefix + "메뉴'를 먼저 입력하세요.");
            }
            let mapped = Helper.getRootCmdByNum(room, isGroupChat, isLoggedIn, command);
            if (mapped) command = mapped;
        }

        // [3] 명령어 실행 로직
        switch (command) {
            case "도움말":
                replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, "도움말", userSession, DB));
                break;
            case "가입":
                if (params.length < 2) return replier.reply("⚠️ .1 [ID] [PW]");
                replier.reply(Login.tryRegister(params[0], params[1], params[0], DB, Obj).msg);
                sessions[sender].isMenuOpen = false;
                break;
            case "로그인":
                if (params.length < 2) return replier.reply("⚠️ .2 [ID] [PW]");
                var res = Login.tryLogin(params[0], params[1], DB);
                if (res.success) sessions[sender].data = res.data;
                replier.reply(res.msg);
                sessions[sender].isMenuOpen = false;
                break;
            case "로그아웃":
                sessions[sender].data = null;
                sessions[sender].isMenuOpen = false;
                replier.reply("🚪 로그아웃 완료");
                break;
            case "내정보":
                replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, "내정보", userSession, DB));
                break;
            case "정보":
                replier.reply("🧪 LOL봇 v" + libConst.Version + "\n📝 Helper 참조 에러 수정 완료");
                break;
        }

    } catch (e) {
        // 상세 에러 로그 출력
        Api.replyRoom(libConst.ErrorLogRoom, "🚨 에러: " + e.message + "\n라인: " + e.lineNumber);
    }
}
