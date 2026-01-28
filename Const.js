// Const.js
const Prefix = "."; 
const MainRoomName = "LOL실험실"; 
const AdminName = "시스템"; // "방장닉네임"에서 "시스템"으로 변경
const Version = "1.1.1"; 

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
