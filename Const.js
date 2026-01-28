// Const.js
const Prefix = "."; // 명령어 접두사
const MainRoomName = "LOL실험실"; // 게임이 작동할 메인 단체톡방 이름
const AdminName = "방장닉네임"; // 1:1 대화를 유도할 관리자/시스템 닉네임

function bridge() {
    return {
        Prefix: Prefix,
        MainRoomName: MainRoomName,
        AdminName: AdminName,
        // 나중에 확장될 명칭들
        Currency: "RP",
        Version: "1.0.0"
    };
}
