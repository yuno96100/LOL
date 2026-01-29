// Const.js
const Prefix = "."; 
const MainRoomName = "LOL실험실"; 
const ErrorLogRoom = "게임봇"; 
const Version = "1.2.2"; // Bridge 참조 오류 수정 및 안전성 강화

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
