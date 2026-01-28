// Const.js
const Prefix = "."; 
const MainRoomName = "LOL실험실"; 
const AdminName = "시스템"; 
const Version = "1.1.2"; // 시스템 체계 정보 추가 버전

const RootPath = "sdcard/LOL/";      
const DBPath = RootPath + "DB/";     

function bridge() {
    return {
        Prefix: Prefix,
        MainRoomName: MainRoomName,
        AdminName: AdminName,
        RootPath: RootPath,
        DBPath: DBPath,
        UserPath: DBPath + "Users/",
        Version: Version
    };
}
