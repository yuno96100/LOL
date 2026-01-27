function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {

    // [수정된 테스트 로직]
    if (msg === ".정보") {
        var res = "[ 봇 실시간 인식 정보 ]\n\n";
        res += "● 인식된 방 이름: " + room + "\n";
        res += "● 단체톡 여부: " + (isGroupChat ? "단체톡(Group)" : "개인톡(1:1)") + "\n";
        res += "● 보낸 사람: " + sender + "\n";
        
        // 만약 단체톡인데 방이름이 닉네임으로 나온다면, 
        // 아래 '판정' 부분을 참고해서 Const.js를 수정해야 합니다.
        res += "● 판정: " + (room === "현재나오는닉네임" ? "이 닉네임이 현재 방이름임" : "불일치");
        
        replier.reply(res);
        return;
    }

    // [분기 로직 개선]
    // 방 이름이 자꾸 닉네임으로 나온다면, Const.js의 MainRoomName을 
    // .정보 쳤을 때 나오는 그 '닉네임'과 똑같이 적어주어야 메인방으로 인식합니다.
    if (room === libConst.MainRoomName) {
        MainCmd(room, msg, sender, replier);
    } else {
        UserCmd(room, msg, sender, replier, imageDB);
    }
}
