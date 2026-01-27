function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {

    /* =========================
       [1] 정보 확인용 명령어
    ========================= */
    if (msg === ".정보") {
        var res = "[ 봇 실시간 인식 정보 ]\n\n";
        res += "● 방 이름: " + room + "\n";
        res += "● 보낸 사람: " + sender + "\n";
        res += "● isGroupChat 값: " + isGroupChat + "\n";
        res += "● room === sender 여부: " + (room === sender) + "\n";
        replier.reply(res);
        return;
    }

    /* =========================
       [2] 채팅 타입 판별
       ※ 오픈채팅 대응 핵심
    ========================= */

    // 개인톡 vs 단톡 (오픈채팅 포함)
    var isGroup = (room !== sender);

    // 메인 단톡방 판별 (이름 포함 방식)
    var isMainRoom = isGroup && room.indexOf("LOL 실험실") !== -1;

    /* =========================
       [3] 명령어 분기
    ========================= */

    if (isMainRoom) {
        // 메인 단체톡 (오픈채팅 포함)
        MainCmd(room, msg, sender, replier);

    } else if (isGroup) {
        // 그 외 단체톡 (서브방, 테스트방 등)
        GroupCmd(room, msg, sender, replier);

    } else {
        // 개인톡
        UserCmd(room, msg, sender, replier, imageDB);
    }
}
