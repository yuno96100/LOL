// Main.js

// 1. 모듈 로드 시도 (에러 추적용)
var libConst, Login, Helper;

try {
    libConst = Bridge.getScopeOf("Const.js").bridge();
    Login = Bridge.getScopeOf("LoginManager.js").bridge();
    Helper = Bridge.getScopeOf("Helper.js").bridge();
} catch (e) {
    // 만약 파일 로드에 실패하면 채팅방에 에러를 띄웁니다.
    // 예: "파일 로드 실패: Const.js를 찾을 수 없습니다."
}

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    
    // [디버그 명령어] 아무 방에서나 '검사'라고 쳐보세요.
    if (msg === "검사") {
        var status = "[ 시스템 진단 ]\n";
        status += "방 이름: " + room + "\n";
        status += "설정된 단톡: " + (libConst ? libConst.MainRoomName : "로드실패") + "\n";
        status += "접두사: " + (libConst ? libConst.Prefix : "로드실패");
        replier.reply(status);
        return;
    }

    // 모듈 로드 실패 시 실행 중단
    if (!libConst) return;

    // 2. 접두사 확인
    if (!msg.startsWith(libConst.Prefix)) return;

    const args = msg.split(" ");
    const command = args[0].slice(libConst.Prefix.length);
    const params = args.slice(1);

    // [3] 단체톡방 분기
    if (room.trim() === libConst.MainRoomName.trim()) {
        if (command === "등록") {
            replier.reply(sender + "님, 방장(" + libConst.AdminName + ")에게 1:1 메시지로 '.가입 [아이디] [비번]'을 보내주세요.");
        }
        if (command === "도움말") replier.reply(Helper.getMainHelp());
        return;
    }

    // [4] 개인톡방 분기
    if (!isGroupChat) {
        switch (command) {
            case "가입":
                if (params.length < 2) return replier.reply("⚠️ 사용법: .가입 [ID] [PW]");
                replier.reply(Login.tryRegister(params[0], params[1], sender).msg);
                break;
            case "로그인":
                if (params.length < 2) return replier.reply("⚠️ 사용법: .로그인 [ID] [PW]");
                replier.reply(Login.tryLogin(params[0], params[1]).msg);
                break;
            case "도움말":
                replier.reply(Helper.getPrivateHelp(false));
                break;
        }
    }
}
