// Const.js
const Prefix = "."; 
const MainRoomName = "LOL실험실"; 
const AdminName = "방장닉네임"; 

// 경로 설정
const RootPath = "sdcard/LOL/";      // 모든 리소스의 최상위 경로
const DBPath = RootPath + "DB/";     // 실제 데이터베이스(.json)가 저장될 곳

function bridge() {
    return {
        Prefix: Prefix,
        MainRoomName: MainRoomName,
        AdminName: AdminName,
        RootPath: RootPath,
        DBPath: DBPath,
        UserPath: DBPath + "Users/", // 유저 파일 저장용 세부 경로
        Currency: "RP"
    };
}
