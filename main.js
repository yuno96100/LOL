// 상단 참조 부분 (레거시 API는 이 로드가 중요합니다)
var libConst = Bridge.getScopeOf("Const.js");
var helper = Bridge.getScopeOf("Helper.js");
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    
    /* ---- 테스트용 로직 시작 ---- */
    if (msg === ".정보") {
        var testInfo = "==== [ 봇 시스템 체크 ] ====\n\n";
        testInfo += "1. 현재 방 이름 : " + room + "\n";
        testInfo += "2. 메인 방 설정 : " + libConst.MainRoomName + "\n";
        testInfo += "3. 현재 방 성격 : " + (room === libConst.MainRoomName ? "공용(MainRoom)" : "개인(UserRoom)") + "\n";
        testInfo += "4. 데이터 경로 : " + libConst.rootPath + "\n";
        testInfo += "5. 접두사 테스트 : OK (.)\n\n";
        testInfo += "※ 가입 테스트는 '개인(UserRoom)'에서 진행하세요.";
        
        replier.reply(testInfo);
        return; // 테스트 확인 시 아래 로직 실행 방지
    }
    /* ---- 테스트용 로직 끝 ---- */

    // 기존 로직 (도움말 및 명령어 분기)
    if (helper.Directions(room, msg, replier)) return;
    
    if (room === libConst.MainRoomName) {
        MainCmd(room, msg, sender, replier);
    } else {
        UserCmd(room, msg, sender, replier, imageDB);
    }
