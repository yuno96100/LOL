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

        let userSession = sessions[sender];
        let isLoggedIn = !!userSession;

        // [번호 명령어 변환 로직]
        // 만약 command가 숫자라면(1, 2, 3...) 대응하는 텍스트 명령어로 치환
        let mappedCmd = Helper.getCommandByNum(room, isGroupChat, isLoggedIn, command);
        if (mappedCmd) command = mappedCmd;

        // [메뉴 출력 로직]
        if (command === "메뉴") {
            let cat = params[0];
            let mappedCat = Helper.getCommandByNum(room, isGroupChat, isLoggedIn, cat);
            if (mappedCat) cat = mappedCat;
            return replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, cat, userSession, DB));
        }

        // [명령어 분기]
        switch (command) {
            case "도움말":
                return replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, "도움말", userSession, DB));
            
            case "정보":
                let note = "🧪 LOL봇 v" + libConst.Version + "\n📝 번호 명령어(.1, .2) 지원 업데이트";
                replier.reply(note);
                if (room.trim() === libConst.ErrorLogRoom.trim()) Api.replyRoom(libConst.MainRoomName, note);
                return;

            case "가입":
                if (isGroupChat) return replier.reply("❌ 가입은 개인톡에서 해주세요.");
                if (params.length < 2) return replier.reply("⚠️ " + libConst.Prefix + "1 [닉네임] [PW]");
                replier.reply(Login.tryRegister(params[0], params[1], params[0], DB, Obj).msg);
                break;

            case "로그인":
                if (isGroupChat) return replier.reply("❌ 로그인은 개인톡에서 해주세요.");
                if (params.length < 2) return replier.reply("⚠️ " + libConst.Prefix + "2 [닉네임] [PW]");
                var res = Login.tryLogin(params[0], params[1], DB);
                if (res.success) sessions[sender] = res.data;
                replier.reply(res.msg);
                break;

            case "로그아웃":
                delete sessions[sender];
                replier.reply("🚪 로그아웃 완료");
                break;

            case "내정보":
                replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, "내정보", userSession, DB));
                break;
                
            case "데이터": // 관리자 전용
                if (room.trim() === libConst.ErrorLogRoom.trim()) replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, "데이터", userSession, DB));
                break;
        }

    } catch (e) {
        Api.replyRoom(libConst.ErrorLogRoom, "🚨 에러: " + e.message);
    }
}
