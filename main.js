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
        const command = args[0].slice(libConst.Prefix.length);
        const params = args.slice(1);

        let userSession = sessions[sender];
        let isLoggedIn = !!userSession;

        if (command === "메뉴") {
            let category = params[0];
            // 입력값이 번호일 경우 카테고리 이름으로 치환
            let mappedCategory = Helper.getCategoryByNum(room, isGroupChat, category);
            if (mappedCategory) category = mappedCategory;
            
            return replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, category, userSession, DB));
        }

        if (command === "도움말") {
            return replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, "도움말", userSession, DB));
        }

        if (command === "정보") {
            let note = "🧪 LOL봇 버전: " + libConst.Version + "\n📝 닉네임 연동 및 메뉴 번호 이동 기능 추가";
            replier.reply(note);
            return;
        }

        if (!isGroupChat) {
            switch (command) {
                case "가입":
                    if (params.length < 2) return replier.reply("⚠️ .가입 [닉네임] [PW]");
                    var regRes = Login.tryRegister(params[0], params[1], params[0], DB, Obj);
                    replier.reply(regRes.msg);
                    break;
                case "로그인":
                    if (params.length < 2) return replier.reply("⚠️ .로그인 [닉네임] [PW]");
                    var logRes = Login.tryLogin(params[0], params[1], DB);
                    if (logRes.success) sessions[sender] = logRes.data;
                    replier.reply(logRes.msg);
                    break;
                case "로그아웃":
                    delete sessions[sender];
                    replier.reply("🚪 로그아웃 완료");
                    break;
                case "내정보":
                    if (isLoggedIn) replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, "내정보", userSession, DB));
                    break;
            }
        }
    } catch (e) {
        Api.replyRoom(libConst.ErrorLogRoom, "🚨 에러: " + e.message);
    }
}
