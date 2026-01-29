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
            return replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, params[0], userSession, DB));
        }

        if (command === "도움말") {
            return replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, "도움말", userSession, DB));
        }

        if (command === "정보") {
            let note = "🧪 LOL봇 버전: " + libConst.Version + "\n";
            note += "📝 패치내용: 도움말 항목 최하단 배치 고정 로직 적용\n";
            replier.reply(note);
            if (room.trim() === libConst.ErrorLogRoom.trim()) {
                Api.replyRoom(libConst.MainRoomName, "📢 [업데이트 알림]\n" + note);
            }
            return;
        }

        if (room.trim() === libConst.ErrorLogRoom.trim()) {
            switch (command) {
                case "유저조회":
                    replier.reply("📋 목록: " + DB.getUserList().join(", "));
                    break;
                case "유저초기화":
                    if (params.length < 1) return;
                    let targetInit = DB.loadUser(params[0]);
                    if (targetInit) {
                        DB.deleteUser(params[0]);
                        DB.saveUser(params[0], Obj.getNewUser(targetInit.info.id, targetInit.info.pw, targetInit.info.name));
                        replier.reply("🧹 " + params[0] + " 초기화 완료");
                    }
                    break;
                case "유저삭제":
                    if (params.length < 1) return;
                    if (DB.deleteUser(params[0])) replier.reply("🗑️ " + params[0] + " 삭제됨");
                    break;
                case "유저롤백":
                    if (params.length < 1) return;
                    if (DB.rollbackUser(params[0])) replier.reply("⏪ " + params[0] + " 복구됨");
                    break;
            }
            return;
        }

        if (!isGroupChat) {
            switch (command) {
                case "가입":
                    if (params.length < 2) return replier.reply("⚠️ " + libConst.Prefix + "가입 [닉네임] [PW]");
                    var regRes = Login.tryRegister(params[0], params[1], params[0], DB, Obj);
                    replier.reply(regRes.msg);
                    if (regRes.success) Api.replyRoom(libConst.ErrorLogRoom, "🔔 가입: " + params[0]);
                    break;
                case "로그인":
                    if (params.length < 2) return replier.reply("⚠️ " + libConst.Prefix + "로그인 [닉네임] [PW]");
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
                    else replier.reply("❌ 로그인이 필요합니다.");
                    break;
            }
        }
    } catch (e) {
        Api.replyRoom(libConst.ErrorLogRoom, "🚨 에러: " + e.message + " (L:" + e.lineNumber + ")");
    }
}
