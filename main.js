// 상단에 라이브러리 참조가 되어있는지 확인하세요.
const libConst = Bridge.getScopeOf("Const.js");

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    
    // [명령어: !방정보] 현재 방의 이름과 그룹방 여부를 출력합니다.
    if (msg === ".방정보") { // 사용자의 설정에 따라 '.' 접두사 사용
        var currentRoom = room; // 현재 접속 중인 방 이름
        var mainRoom = libConst.MainRoomNmae; // Const.js에 설정된 메인룸 이름 ("GameRoom")
        
        // 그룹방 여부 판별 (현재 방 이름과 설정된 메인룸 이름 비교)
        var isMainRoom = (currentRoom === mainRoom);
        
        var result = "『 채팅방 정보 확인 』\n\n";
        result += "📍 현재 방: " + currentRoom + "\n";
        result += "👥 그룹방 여부: " + (isMainRoom ? "O (메인 게임룸)" : "X (개인룸/기타)");
        
        if (isMainRoom) {
            result += "\n\n* 이 곳은 공식 게임방이므로 모든 명령어가 활성화됩니다.";
        } else {
            result += "\n\n* 이 곳은 개인 공간입니다.";
        }
        
        replier.reply(result);
        return; // 로직 종료
    }

    // --- 이후 기존 Main.js의 로직 (MainCmd, UserCmd 등)이 이어짐 ---
}
