const libConst = Bridge.getScopeOf("Const.js");

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (msg === "!방확인") {
        var logMsg = "[ 메신저봇 데이터 디버깅 ]\n";
        logMsg += "------------------------\n";
        logMsg += "● Room (방이름): [" + room + "]\n";
        logMsg += "● Sender (보낸이): [" + sender + "]\n";
        logMsg += "● isGroupChat (단체방여부): " + isGroupChat + "\n";
        logMsg += "● Const 설정값: [" + libConst.MainRoomName + "]\n";
        logMsg += "------------------------\n";

        if (room === libConst.MainRoomName) {
            logMsg += "✅ 현재 정상 인식 중입니다.";
        } else {
            logMsg += "❌ 방 이름이 일치하지 않습니다.\n";
            logMsg += "💡 만약 Room과 Sender가 같다면,\n";
            logMsg += "봇이 단톡방 이름을 읽지 못하는 상태입니다.";
        }

        replier.reply(logMsg);
    }
}
