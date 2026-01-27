const libConst = Bridge.getScopeOf("Const.js");

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {

    if (msg === "!방확인") {
        // Const.js에서 MainRoomNmae -> MainRoomName으로 수정했다고 가정합니다.
        var targetRoom = libConst.MainRoomName; 
        
        var checkMessage = "[ 방 이름 유효성 체크 ]\n\n";
        checkMessage += "● 현재 접속 중인 방: [" + room + "]\n";
        checkMessage += "● 설정된 게임방: [" + targetRoom + "]\n\n";

        if (room === targetRoom) {
            checkMessage += "✅ 결과: 일치합니다!\n이 방에서 모든 게임 기능을 사용할 수 있습니다.";
        } else {
            checkMessage += "❌ 결과: 불일치합니다.\n\n";
            checkMessage += "👉 해결 방법:\n";
            checkMessage += "1. Const.js 파일에서 'MainRoomName'을 찾습니다.\n";
            checkMessage += "2. 값을 \"" + room + "\"으로 수정하고 저장하세요.";
        }

        replier.reply(checkMessage);
    }
}
