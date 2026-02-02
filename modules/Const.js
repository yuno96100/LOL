const Prefix = "."; 
const Version = "2.4.2"; 

function bridge() {
    return {
        Prefix: Prefix,
        MainRoomName: "소환사의협곡",
        ErrorLogRoom: "소환사의협곡관리",
        RootPath: "sdcard/LOL/",
        DBPath: "sdcard/LOL/DB/",
        UserPath: "sdcard/LOL/DB/Users/",
        BackupPath: "sdcard/LOL/DB/Backup/",
        AccountPath: "sdcard/LOL/DB/Users/Accounts/", // 계정 정보 저장소
        ProfilePath: "sdcard/LOL/DB/Users/Profiles/", // 게임 데이터 저장소
        Version: Version
    };
}
