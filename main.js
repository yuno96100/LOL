function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {

    // [1] 정보 확인용 (에러 방지를 위해 변수 존재 여부 체크)
    if (msg === ".정보") {
        var res = "[ 봇 실시간 인식 정보 ]\n\n";
        res += "● 인식된 방 이름: " + room + "\n";
        res += "● 보낸 사람: " + sender + "\n";
        res += "● 단체톡 여부(isGroupChat): " + isGroupChat + "\n";
        replier.reply(res);
        return;
    }

    // [2] 명령어 분기 처리 (가장 확실한 방법)
    // 방 이름에 "LOL" 또는 "실험실"이 포함되어 있거나, 설정된 이름과 같으면 메인방으로 인식
    var isMainRoom = (room === "LOL 실험실") || (room.indexOf("LOL 실험실") !== -1);

    if (isMainRoom) {
        // 단체톡방에서 실행될 명령어
        MainCmd(room, msg, sender, replier);
    } else {
        // 그 외(개인톡 등)에서 실행될 명령어 (.등록, .로그인 등)
        UserCmd(room, msg, sender, replier, imageDB);
    }
}