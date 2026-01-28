// Const.js
const Prefix = "."; 
const MainRoomName = "LOL실험실"; 
const AdminName = "방장닉네임"; 

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
        Currency: "RP",
        Version: "1.0.0"
    };
}
