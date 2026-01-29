/**
 * main.js (v1.4.3)
 */
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

        // [통합 메뉴 시스템]
        if (command === "메뉴") {
            return replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, params[0], userSession, DB));
        }

        // [정보 및 업데이트 알림]
        if (command === "정보") {
            let note = "🧪 LOL봇 버전: " + libConst.Version + "\n";
            note += "📝 패치내용: 닉네임-데이터 동기화 및 생략 없는 코드 정리\n";
            note += "상태: 모든 시스템 정상";
            
            replier.reply(note);
            
            if (room.trim() === libConst.ErrorLogRoom.trim()) {
                Api.replyRoom(libConst.MainRoomName, "📢 [업데이트 알림]\n" + note);
            }
            return;
        }

        // [1] 관리자 전용 기능 (게임봇 방)
        if (room.trim() === libConst.ErrorLogRoom.trim()) {
            switch (command) {
                case "유저조회":
                    let userList = DB.getUserList();
                    replier.reply("📋 전체 유저: " + userList.join(", "));
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

        // [2] 유저 전용 기능 (개인톡)
        if (!isGroupChat) {
            switch (command) {
                case "가입":
                    if (params.length < 2) {
                        return replier.reply("⚠️ 사용법: " + libConst.Prefix + "가입 [닉네임] [PW]\n(아이디가 닉네임이 됩니다)");
                    }
                    var regRes = Login.tryRegister(params[0], params[1], params[0], DB, Obj);
                    replier.reply(regRes.msg);
                    if (regRes.success) Api.replyRoom(libConst.ErrorLogRoom, "🔔 가입알림: " + params[0]);
                    break;
                case "로그인":
                    if (params.length < 2) return replier.reply("⚠️ 사용법: " + libConst.Prefix + "로그인 [닉네임] [PW]");
                    var logRes = Login.tryLogin(params[0], params[1], DB);
                    if (logRes.success) sessions[sender] = logRes.data;
                    replier.reply(logRes.msg);
                    break;
                case "내정보":
                    if (isLoggedIn) replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn, "내정보", userSession, DB));
                    else replier.reply("❌ 로그인이 필요한 기능입니다.");
                    break;
                case "로그아웃":
                    delete sessions[sender];
                    replier.reply("🚪 로그아웃 완료");
                    break;
            }
        }
    } catch (e) {
        Api.replyRoom(libConst.ErrorLogRoom, "🚨 에러 발생\n내용: " + e.message + "\n라인: " + e.lineNumber);
    }
}
