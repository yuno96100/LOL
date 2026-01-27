const libConst = Bridge.getScopeOf("Const.js");
const helper = Bridge.getScopeOf("Helper.js");
var login_Manager;

try {
    login_Manager = Bridge.getScopeOf("LoginManager.js").LoginManager();
} catch(e) {
    Log.e("LoginManager 로드 실패: " + e);
}

function response(room, msg, sender, isGroupChat, replier) {
    try {
        // 1. 테스트용 (작동 확인)
        if (msg === ".테스트") return replier.reply("봇이 정상 작동 중입니다!");

        // 2. 접두사 체크
        if (!msg.startsWith(libConst.Prefix)) return;

        // 3. 도움말 디자인 출력
        if (helper.Directions(room, msg, replier)) return;

        let cmdLine = msg.substring(libConst.Prefix.length);
        let args = cmdLine.split(" ");
        let cmd = args[0];

        // 4. 방 분기
        if (room === libConst.MainRoomNmae) {
            if (cmd === "ID확인") {
                let id = args[1];
                if (!id) return replier.reply("💡 사용법: .ID확인 [ID]");
                if (login_Manager.isExist(id)) replier.reply("❌ 이미 사용 중인 ID입니다.");
                else replier.reply("✅ [" + id + "]는 사용 가능합니다.");
            }
        } else {
            if (cmd === "등록") {
                if (args.length < 3) return replier.reply("💡 사용법: .등록 [ID] [PW]");
                replier.reply(login_Manager.register(room, args[1], args[2]));
            } else if (cmd === "로그인") {
                if (args.length < 3) return replier.reply("💡 사용법: .로그인 [ID] [PW]");
                replier.reply(login_Manager.login(room, args[1], args[2]));
            }
        }
    } catch (e) {
        replier.reply("⚠️ 에러: " + e.message + "\n라인: " + e.lineNumber);
    }
}
