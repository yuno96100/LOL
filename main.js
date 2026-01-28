// Const.js와 Common.js의 설정을 가져옵니다.
const libConst = Bridge.getScopeOf("Const.js"); 

function checkRoomStatus(room, replier) {
    // 1. 현재 내가 있는 방의 이름을 변수에 저장
    var currentRoomName = room;
    
    // 2. 해당 방이 Const.js에 정의된 메인 게임방(그룹방)인지 확인
    var isGroupRoom = (currentRoomName === libConst.MainRoomName);
    
    // 3. 결과 출력
    var resultMsg = "[방 정보 확인]\n";
    resultMsg += "  - 현재 방 이름: " + currentRoomName + "\n";
    resultMsg += "  - 그룹방 여부: " + (isGroupRoom ? "예 (게임 메인룸)" : "아니오 (개인룸/기타)");
    
    replier.reply(resultMsg);
    
    return isGroupRoom;
}
