// Const.js
const Prefix = "."; 
const MainRoomName = "LOL실험실"; 
const ErrorLogRoom = "게임봇"; 
const AdminName = "시스템"; 
const Version = "1.1.5"; // LoginManager 모듈 로드 오류 수정

const RootPath = "sdcard/LOL/";      
const DBPath = RootPath + "DB/";     

function bridge() {
    return {
        Prefix: Prefix,
        MainRoomName: MainRoomName,
        ErrorLogRoom: ErrorLogRoom,
        AdminName: AdminName,
        RootPath: RootPath,
        DBPath: DBPath,
        UserPath: DBPath + "Users/",
        Version: Version
    };
}
