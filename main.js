function response(room, msg, sender, isGroupChat, replier, imageDB, packageName, threadId, isOldChat, data) {
    
    // [보정 로직] 방 이름이 제대로 안 잡힐 경우를 대비해 data(또는 sbn) 객체에서 직접 추출
    // 메신저봇R 기준: data 객체의 실시간 알림 정보를 사용합니다.
    try {
        var realRoom = data.getNotification().extras.getString("android.subText");
        if (realRoom != null) {
            room = realRoom; // 'android.subText'에 담긴 실제 오픈채팅방 이름으로 치환
        }
    } catch (e) {
        // 오류 시 기존 room 변수 유지
    }

    // [설정값 불러오기]
    var configMainRoom = libConst.MainRoomName;

    // [메인방 판정 로직 수정]
    // 방 이름이 설정값과 일치하는지 확인 (isGroupChat에만 의존하지 않도록 보정)
    var isMain = (room === configMainRoom) || (room.indexOf(configMainRoom) !== -1);

    // 테스트용 정보 출력
    if (msg === ".정보") {
        var info = "[디버그 정보]\n";
        info += "인식된 방: " + room + "\n";
        info += "발신자: " + sender + "\n";
        info += "그룹톡여부: " + isGroupChat + "\n";
        info += "최종판정: " + (isMain ? "메인방" : "유저방");
        replier.reply(info);
        return;
    }

    // [명령어 분기]
    if (isMain) {
        MainCmd(room, msg, sender, replier);
    } else {
        UserCmd(room, msg, sender, replier, imageDB);
    }
}
