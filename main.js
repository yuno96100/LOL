// 상단 라이브러리 참조
const libConst = Bridge.getScopeOf("Const.js");

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {

    // [명령어: .방정보]
    if (msg === ".방정보") {
        // 1. 현재 방 이름 가져오기
        var currentRoom = room;
        
        // 2. Const.js에서 설정된 메인룸 이름 가져오기 (오타 수정됨)
        // 만약 Const.js를 아직 안 고치셨다면 libConst.MainRoomNmae 로 유지해야 작동합니다.
        var mainRoomSetting = libConst.MainRoomName; 
        
        // 3. 그룹방 여부 판별
        var isMainRoom = (currentRoom === mainRoomSetting);
        
        // 4. 결과 출력 메시지 구성
        var infoMsg = "『 채팅방 상태 정보 』\n\n";
        infoMsg += "▪️ 현재 방 이름 : " + currentRoom + "\n";
        infoMsg += "▪️ 그룹방 판정 : " + (isMainRoom ? "✅ 일치 (메인룸)" : "❌ 불일치 (개인룸/기타)") + "\n";
        infoMsg += "──────────────────\n";
        
        if (isMainRoom) {
            infoMsg += "ℹ️ 이 방은 시스템에 등록된 '공식 게임룸'입니다. 모든 명령어가 제한 없이 작동합니다.";
        } else {
            infoMsg += "ℹ️ 등록되지 않은 방입니다. 개인 메시지 처리 로직이 적용됩니다.";
        }

        replier.reply(infoMsg);
        return; // 정보를 알려준 후 로직 종료
    }

    // --- 이후 기존의 MainCmd(room, ...) 또는 UserCmd(room, ...) 흐름으로 이어짐 ---
}
