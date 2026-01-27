function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {

    // .정보 입력 시 즉시 실행
    if (msg === ".정보") {
        var res = "[ 봇 연결 상태 확인 ]\n\n";
        res += "● 현재 방 이름: " + room + "\n";
        res += "● 보낸 사람: " + sender + "\n";
        
        // Const.js의 값을 가져올 때 에러 방지 처리
        try {
            var configRoom = libConst.MainRoomName || libConst.MainRoomNmae || "설정 없음";
            res += "● 설정된 메인방: " + configRoom + "\n";
            res += "● 데이터 경로: " + (libConst.rootPath || "경로 미설정") + "\n";
            res += "● 판정: " + (room === configRoom ? "메인방" : "유저방");
        } catch (e) {
            res += "\n[!] Const.js 참조 에러: 변수명을 확인하세요.";
        }

        replier.reply(res);
        return; 
    }
    
    // ... 나머지 로직
}
