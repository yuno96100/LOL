function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {

    // .정보 입력 시 즉시 실행 (설정값 참조 안 함)
    if (msg === ".정보") {
        var res = "[ 봇 연결 상태 확인 ]\n\n";
        res += "● 현재 방 이름: " + room + "\n";
        res += "● 보낸 사람: " + sender + "\n";
        res += "● 그룹 채팅 여부: " + (isGroupChat ? "예" : "아니오") + "\n";
        res += "● 패키지명: " + packageName;
        
        replier.reply(res);
        return; 
    }
    
    // 이 아래부터는 기존 로직을 실행하되, 
    // Const.js의 변수가 없으면 에러가 날 수 있으니 체크가 필요합니다.
}
