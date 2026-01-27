function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    
    // [설정값 불러오기]
    var configMainRoom = libConst.MainRoomName;

    // [메인방 판정 로직]
    // 1. 방 이름이 설정값과 같거나
    // 2. 방 이름에 설정값이 포함되어 있거나
    // 3. 엔진이 단체톡(isGroupChat)으로 인식할 때
    var isMain = (room === configMainRoom) || (room.indexOf(configMainRoom) !== -1) || isGroupChat;

    // 테스트용 정보 출력
    if (msg === ".정보") {
        var info = "현재방: " + room + "\n";
        info += "판정: " + (isMain ? "메인방(공용)" : "유저방(개인)");
        replier.reply(info);
        return;
    }

    // [명령어 분기]
    if (isMain) {
        MainCmd(room, msg, sender, replier);
    } else {
        // 방 이름이 닉네임으로 나오는 경우 보통 이쪽으로 들어옵니다.
        UserCmd(room, msg, sender, replier, imageDB);
    }
}
