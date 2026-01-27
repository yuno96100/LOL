// 상단 참조 부분 (레거시 API는 이 로드가 중요합니다)
var libConst = Bridge.getScopeOf("Const.js");
var helper = Bridge.getScopeOf("Helper.js");

function response(room, msg, sender, isGroupChat, replier) {
   
    
    if (msg === ".정보확인") {
        var info = " [ 봇 설정 정보 확인 ]\n\n";
        info += "● 현재 방 이름: " + room + "\n";
        info += "● 메인 방 설정: " + libConst.MainRoomNmae + "\n";
        info += "● 일치 여부: " + (room === libConst.MainRoomNmae ? "일치(MainCmd)" : "불일치(UserCmd)") + "\n";
        info += "● 데이터 경로: " + libConst.rootPath + "\n";
        info += "● 사용자 파일: " + libConst.rootPath + libConst.fileNameList["UserList"];
        
        replier.reply(info);
        return; // 테스트 명령어 실행 시 하단 로직 무시
    }
    
    
    
    // 1. 봇이 방 이름을 어떻게 읽고 있는지 확인하기 위한 로그
    if (msg === ".정보") {
        replier.reply("현재 방 이름: [" + room + "]\n설정된 메인방: [" + libConst.MainRoomNmae + "]");
        return;
    }

    // 2. 접두사 점검
    if (!msg.startsWith(".")) return;

    // 3. 방 이름이 'LOL 실험실'인지 체크 (Const.js 기준)
    if (room === libConst.MainRoomNmae) {
        // 메인룸 전용 명령어 (ID확인 등)
        if (msg === ".명령어") {
            helper.Directions(room, msg, replier);
        }
    } else {
        // 1:1 대화방 명령어 (등록, 로그인 등)
        // 여기는 방 이름이 MainRoomNmae과 다를 때 실행됩니다.
        if (msg.startsWith(".등록") || msg.startsWith(".로그인")) {
            // 여기에 로그인 로직 실행
            replier.reply("1:1 대화방 기능을 실행합니다.");
        }
    }
}
