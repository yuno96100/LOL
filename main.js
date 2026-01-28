function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    


if (sender === "내카톡이름" && msg === ".리로드") {
    Api.reload();
    replier.reply("시스템을 재시작했습니다.");
}

    // 테스트용: 어떤 방에서든 작동해야 함
    if (msg === ".테스트") {
        replier.reply("봇이 살아있습니다!\n방 이름: " + room);
        return;
    }

    // 기존 구조를 활용한 로직
    if (msg === ".방정보") {
        try {
            const libConst = Bridge.getScopeOf("Const.js");
            // 오타 안전장치: Name이 없으면 Nmae을 사용
            var targetRoom = libConst.MainRoomName || libConst.MainRoomNmae; 
            
            var isMain = (room === targetRoom);
            replier.reply("방 이름: " + room + "\n메인룸 여부: " + isMain);
        } catch (e) {
            replier.reply("에러 발생: " + e.message);
        }
        return;
    }
    
    // ... 나머지 기존 코드
}
