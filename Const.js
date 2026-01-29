// Const.js
const Prefix = "."; 
const MainRoomName = "LOL실험실"; 
const ErrorLogRoom = "게임봇"; 
const Version = "1.2.1"; // 가입 로직 지연 로딩(Lazy Load) 적용

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
