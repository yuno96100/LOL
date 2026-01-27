function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {

    // 1. 단순 텍스트 일치 확인 테스트
    if (msg === ".정보") {
        var res = "[ 봇 연결 상태 확인 ]\n";
        res += "- 현재 방 이름: " + room + "\n";
        res += "- 설정된 메인방: " + libConst.MainRoomName + "\n";
        res += "- 저장 경로: " + libConst.rootPath + "\n";
        res += "- 판정: " + (room === libConst.MainRoomName ? "메인방(MainCmd)" : "유저방(UserCmd)");
        
        replier.reply(res);
        return; 
    }
