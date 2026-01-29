const Prefix = "."; 
const MainRoomName = "LOL실험실"; 
const ErrorLogRoom = "게임봇"; 
const Version = "1.5.4"; 

function bridge() {
    return {
        Prefix: Prefix,
        MainRoomName: MainRoomName,
        ErrorLogRoom: ErrorLogRoom,
        RootPath: "sdcard/LOL/",
        DBPath: "sdcard/LOL/DB/",
        UserPath: "sdcard/LOL/DB/Users/",
        BackupPath: "sdcard/LOL/DB/Backup/",
        AdminPath: "sdcard/LOL/DB/Admins.json",
        Version: Version
    };
}
