// Const.js
const Prefix = "."; 
const MainRoomName = "LOL실험실"; 
const AdminName = "방장닉네임"; 
const Version = "1.1.1"; // 런타임 에러 방지 적용 버전

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
