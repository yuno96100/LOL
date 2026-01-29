const Prefix = "."; 
const Version = "1.7.1"; 

function bridge() {
    return {
        Prefix: Prefix,
        MainRoomName: "LOL실험실",
        ErrorLogRoom: "게임봇",
        RootPath: "sdcard/LOL/",
        DBPath: "sdcard/LOL/DB/",
        UserPath: "sdcard/LOL/DB/Users/",
        BackupPath: "sdcard/LOL/DB/Backup/", // 삭제 직전의 상태가 저장되는 곳
        Version: Version
    };
}
