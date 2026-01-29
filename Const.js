// Const.js
const Prefix = "."; 
const MainRoomName = "LOL실험실"; 
const ErrorLogRoom = "게임봇"; 
const Version = "1.3.1"; // 백업, 롤백, 초기화 및 삭제 기능 추가

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
        BackupPath: DBPath + "Backup/", // [추가] 백업 폴더 경로
        AdminPath: DBPath + "Admins.json",
        Version: Version
    };
}
