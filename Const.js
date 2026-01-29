const Prefix = "."; 
const Version = "1.7.2"; 

function bridge() {
    return {
        Prefix: Prefix,
        MainRoomName: "소환사의협곡",        // 그룹톡 이름 변경
        ErrorLogRoom: "소환사의협곡관리",    // 관리자 방 이름 변경
        RootPath: "sdcard/LOL/",
        DBPath: "sdcard/LOL/DB/",
        UserPath: "sdcard/LOL/DB/Users/",
        BackupPath: "sdcard/LOL/DB/Backup/",
        Version: Version
    };
}
