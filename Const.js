// Const.js
const Prefix = "."; 
const MainRoomName = "LOL실험실"; 
const AdminName = "방장닉네임"; 
const Version = "1.1.0"; // 화폐 시스템 제거 버전

// 경로 설정
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
