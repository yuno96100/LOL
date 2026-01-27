function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {

    /* [1] 테스트 명령어: 봇이 현재 방을 어떻게 인식하는지 확인 */
    if (msg === ".정보") {
        var res = "[ 봇 실시간 인식 정보 ]\n\n";
        res += "● 인식된 방 이름: " + room + "\n";
        res += "● 단체톡 여부: " + (isGroupChat ? "단체톡(Main)" : "개인톡(User)") + "\n";
        res += "● 보낸 사람: " + sender + "\n";
        replier.reply(res);
        return;
    }

    /* [2] 도움말 처리 (Helper.js) */
    if (helper.Directions(room, msg, replier)) return;

    /* [3] 추천 수정 방식: 방 이름 대신 'isGroupChat'으로 분기 */
    if (isGroupChat) {
        // 단체톡방(오픈채팅방)일 때 실행되는 명령어 (.ID확인 등)
        MainCmd(room, msg, sender, replier);
    } else {
        // 1:1 채팅방일 때 실행되는 명령어 (.등록, .로그인 등)
        UserCmd(room, msg, sender, replier, imageDB);
    }
}
