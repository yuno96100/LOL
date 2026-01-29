// Const.js
const Prefix = "."; 
const MainRoomName = "LOL실험실"; 
const ErrorLogRoom = "게임봇"; 
const Version = "1.2.3"; // Bridge 참조 오류 완전 해결 버전

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
