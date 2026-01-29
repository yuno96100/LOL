/**
 * main.js
 * 버전: v1.2.6
 */

const libConst = Bridge.getScopeOf("Const.js").bridge();
const DB = Bridge.getScopeOf("DataBase.js").bridge();
const Obj = Bridge.getScopeOf("Object.js").bridge();
const Login = Bridge.getScopeOf("LoginManager.js").bridge();
const Helper = Bridge.getScopeOf("Helper.js").bridge();

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    
    try {
        if (!msg.startsWith(libConst.Prefix)) return;

        const args = msg.split(" ");
        const command = args[0].slice(libConst.Prefix.length);
        const params = args.slice(1);

        function replyBox(title, content) {
            var res = "━━━━━━━━━━━━━━━\n🧪 " + title + "\n━━━━━━━━━━━━━━━\n" + content + "\n━━━━━━━━━━━━━━━";
            replier.reply(res);
        }

        // [1] 관리자 전용 (게임봇 방)
        if (room.trim() === libConst.ErrorLogRoom.trim()) {
            if (command === "관리자임명") {
                let admins = DB.getAdmins();
                if (admins.indexOf(params[0]) === -1) {
                    admins.push(params[0]);
                    DB.saveAdmins(admins);
                    replier.reply("✅ " + params[0] + " 임명 완료");
                }
            }
            if (command === "도움말") replier.reply(Helper.getAdminHelp());
            return;
        }

        // [2] 유저 전용 (LOL실험실 방)
        if (room.trim() === libConst.MainRoomName.trim()) {
            if (command === "정보") {
                let admins = DB.getAdmins();
                replyBox("시스템 정보", "• 버전: v" + libConst.Version + "\n• 관리자: (" + admins.join(", ") + ")");
            }
            if (command === "도움말") replier.reply(Helper.getMainHelp());
            return;
        }

        // [3] 개인톡 (가입/로그인)
        if (!isGroupChat) {
            switch (command) {
                case "가입":
                    if (params.length < 2) return replyBox("가입 실패", "⚠️ .가입 [ID] [PW]");
                    // 핵심: DB와 Obj를 '배달'해줍니다.
                    var regRes = Login.tryRegister(params[0], params[1], sender, DB, Obj);
                    replyBox("가입 결과", regRes.msg);
                    break;

                case "로그인":
                    if (params.length < 2) return replyBox("로그인 실패", "⚠️ .로그인 [ID] [PW]");
                    // 핵심: DB를 '배달'해줍니다.
                    var logRes = Login.tryLogin(params[0], params[1], DB);
                    replyBox("로그인 결과", logRes.msg);
                    break;
            }
        }

    } catch (e) {
        var fullPath = e.fileName || "알 수 없는 파일";
        var fileName = fullPath.split("/").pop(); 
        var errorLog = "🚨 [에러 리포트]\n━━━━━━━━━━━━━━━\n• 파일: " + fileName + "\n• 라인: " + e.lineNumber + "\n• 내용: " + e.message + "\n━━━━━━━━━━━━━━━";
        Api.replyRoom(libConst.ErrorLogRoom, errorLog);
    }
}
