// Const.js
const Prefix = "."; 
const MainRoomName = "LOL실험실"; 
const ErrorLogRoom = "게임봇"; 
const Version = "1.2.4"; // 모듈 간 독립성 강화를 위한 DI 패턴 완성

const RootPath = "sdcard/LOL/";      
const DBPath = RootPath + "DB/";     

function bridge() {
    return {
        Prefix: Prefix,
        MainRoomName: MainRoomName,
        ErrorLogRoom: ErrorLogRoom,
        RootPath: RootPath,
        DBPath: DBPath,
        UserPath: DBPath + "Users/",
        AdminPath: DBPath + "Admins.json",
        Version: Version
    };
}
