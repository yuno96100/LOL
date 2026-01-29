const Prefix = "."; 
const MainRoomName = "LOL실험실"; 
const ErrorLogRoom = "게임봇"; 
const Version = "1.5.2"; 

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
        BackupPath: DBPath + "Backup/",
        AdminPath: DBPath + "Admins.json",
        Version: Version
    };
}
