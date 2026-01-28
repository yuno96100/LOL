const libConst = Bridge.getScopeOf("Const.js").bridge();
// const Login = Api.makeBundle("LoginManager"); // 나중에 활성화

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (!msg.startsWith(libConst.Prefix)) return; // 접두사로 시작하지 않으면 무시

    const command = msg.split(" ")[0].slice(libConst.Prefix.length); // 접두사 제외 명령어 추출

    // 1. 단체톡방 (LOL실험실) 로직
    if (room === libConst.MainRoomName) {
        if (command === "등록") {
            replier.reply(
                sender + "님, 등록을 위해 아래 링크나 방장(" + libConst.AdminName + ")에게 1:1 메시지를 보내주세요!\n" +
                "그곳에서 '.가입' 명령어를 입력하시면 됩니다."
            );
        }
        return;
    }

    // 2. 개인톡방 (1:1 대화) 로직
    if (!isGroupChat) {
        if (command === "가입") {
            // 여기에 LoginManager를 연결하여 가입 처리 예정
            replier.reply("가입 절차를 시작합니다. 사용하실 비밀번호를 입력해주세요.");
        }
        
        if (command === "로그인") {
            replier.reply("로그인을 시도합니다.");
        }
        return;
    }
}
