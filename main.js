// Main.js
const libConst = Bridge.getScopeOf("Const.js").bridge();
const Login = Bridge.getScopeOf("LoginManager.js").bridge();
const Helper = Bridge.getScopeOf("Helper.js").bridge();

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (!msg.startsWith(libConst.Prefix)) return;

    const args = msg.split(" ");
    const command = args[0].slice(libConst.Prefix.length);
    const params = args.slice(1);

    // [1] 단체톡방 분기 (LOL실험실)
    if (room === libConst.MainRoomName) {
        switch (command) {
            case "도움말":
            case "명령어":
                replier.reply(Helper.getMainHelp());
                break;
            case "등록":
                replier.reply(sender + "님, 방장(" + libConst.AdminName + ")에게 1:1 메시지로 '.가입 [아이디] [비번]'을 보내주세요.");
                break;
        }
        return;
    }

    // [2] 개인톡방 분기
    if (!isGroupChat) {
        // 나중에 세션 매니저가 완성되면 실제 로그인 여부를 체크하게 됩니다.
        let isLoggedIn = false; 

        switch (command) {
            case "가입":
                if (params.length < 2) return replier.reply("⚠️ 사용법: .가입 [ID] [PW]");
                replier.reply(Login.tryRegister(params[0], params[1], sender).msg);
                break;
            case "로그인":
                if (params.length < 2) return replier.reply("⚠️ 사용법: .로그인 [ID] [PW]");
                let res = Login.tryLogin(params[0], params[1]);
                replier.reply(res.msg);
                break;
            case "도움말":
            case "명령어":
                replier.reply(Helper.getPrivateHelp(isLoggedIn));
                break;
        }
        return;
    }
}
