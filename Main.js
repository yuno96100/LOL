const libConst = Bridge.getScopeOf("Const.js");
const helper = Bridge.getScopeOf("Helper.js");
const login_Manager = Bridge.getScopeOf("LoginManager.js").LoginManager();

function response(room, msg, sender, isGroupChat, replier) {
    // 1. 명령어 접두사 확인
    if (!msg.startsWith(libConst.Prefix)) return;

    // 2. 도움말 및 안내문 분기 (Helper 실행)
    if (helper.Directions(room, msg, replier)) return;

    // 3. 명령어 파싱
    let cmdLine = msg.substring(libConst.Prefix.length);
    let args = cmdLine.split(" ");
    let cmd = args[0];

    // 4. 방에 따른 기능 분기
    if (room === libConst.MainRoomNmae) {
        if (cmd === "ID확인") {
            let id = args[1];
            if (!id) return replier.reply("💡 사용법: .ID확인 [아이디]");
            if (login_Manager.isExist(id)) replier.reply("❌ 이미 사용 중인 ID입니다.");
            else replier.reply("✅ [" + id + "]는 사용 가능합니다.\n1:1 대화로 .등록을 해주세요.");
        }
    } else {
        if (cmd === "등록") {
            if (args.length < 3) return replier.reply("💡 사용법: .등록 [ID] [PW]");
            replier.reply(login_Manager.register(room, args[1], args[2]));
        } 
        else if (cmd === "로그인") {
            if (args.length < 3) return replier.reply("💡 사용법: .로그인 [ID] [PW]");
            replier.reply(login_Manager.login(room, args[1], args[2]));
        }
    }
}
