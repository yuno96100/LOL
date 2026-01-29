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

        // 세션 초기화 (메뉴 상태값 포함)
        if (!sessions[sender]) sessions[sender] = { isMenuOpen: false, data: null };
        let userSession = sessions[sender].data;
        let isLoggedIn = !!userSession;

        // [메뉴 명령어 처리]
        if (command === "메뉴") {
            let cat = params[0];
            
            // 번호를 입력했으나 메뉴가 닫혀있다면 무시 (단, '.메뉴 1' 처럼 명시적 호출은 허용)
            if (!isNaN(cat) && !sessions[sender].isMenuOpen && params.length > 0) {
                return replier.reply("❌ 메뉴 창을 먼저 열어주세요. (" + libConst.Prefix + "메뉴)");
            }

            // 번호 매핑
            let mappedCat = Helper.getRootCmdByNum(room, isGroupChat, isLoggedIn, cat);
            if (mappedCat) cat = mappedCat;

            // 메뉴 상태 업데이트
            sessions[sender].isMenuOpen = !cat; // 카테고리 없이 '.메뉴'만 치면 오픈 상태
            return replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, cat, userSession, DB));
        }

        // [번호 단독 입력 처리]
        if (!isNaN(command)) {
            if (!sessions[sender].isMenuOpen) {
                // 메뉴가 닫혀있을 때 번호만 입력하면 안내 (단, 가입/로그인은 예외적으로 허용할지 선택 가능)
                // 여기서는 요청대로 '메뉴 활성화 시에만 카테고리 진입' 하도록 제한
                return replier.reply("💡 메뉴 창이 닫혀있습니다. '" + libConst.Prefix + "메뉴'를 먼저 입력하세요.");
            }
            // 메뉴가 열려있다면 해당 번호의 명령어로 치환
            let mapped = Helper.getRootCmdByNum(room, isGroupChat, isLoggedIn, command);
            if (mapped) command = mapped;
        }

        // [기능 로직]
        switch (command) {
            case "도움말":
                replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, "도움말", userSession, DB));
                break;
            case "가입":
                if (params.length < 2) return replier.reply("⚠️ " + libConst.Prefix + "1 [닉네임] [PW]");
                replier.reply(Login.tryRegister(params[0], params[1], params[0], DB, Obj).msg);
                sessions[sender].isMenuOpen = false; // 실행 후 메뉴 닫음
                break;
            case "로그인":
                if (params.length < 2) return replier.reply("⚠️ " + libConst.Prefix + "2 [닉네임] [PW]");
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
                replier.reply("🧪 LOL봇 v" + libConst.Version + "\n📝 메뉴 활성화 상태 체크 시스템 도입");
                break;
        }

    } catch (e) {
        Api.replyRoom(libConst.ErrorLogRoom, "🚨 에러: " + e.message);
    }
}
