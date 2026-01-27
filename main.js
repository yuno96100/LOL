const libConst = Bridge.getScopeOf("Const.js");
const libCommon = Bridge.getScopeOf("Common.js");

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    
    // 1. 시스템 환경 체크 명령어
    if (msg === "!시스템체크") {
        var report = "[ 시스템 환경 점검 리포트 ]\n\n";

        // 방 이름 확인
        report += "1. 현재 방 이름: " + room + "\n";
        report += "   - 설정된 게임방: " + libConst.MainRoomName + "\n";
        report += "   - 일치 여부: " + (room === libConst.MainRoomName ? "✅ 일치" : "❌ 불일치 (Const.js 수정 필요)") + "\n\n";

        // 데이터 저장 경로 확인
        var testPath = libConst.rootPath;
        report += "2. 설정된 루트 경로: " + testPath + "\n";
        
        try {
            // 경로 존재 여부 및 쓰기 권한 테스트 (Common.js의 write 활용)
            // 테스트용 폴더가 없다면 미리 만들어두어야 합니다.
            var testFileName = "test_connection.txt";
            var testData = { time: new Date().toLocaleString(), status: "success" };
            
            libCommon.write("Users/" + testFileName, testData);
            var readData = libCommon.read("Users/" + testFileName);
            
            if (readData && readData.status === "success") {
                report += "3. 파일 시스템: ✅ 정상 (읽기/쓰기 가능)\n";
            } else {
                report += "3. 파일 시스템: ❌ 읽기 실패 (파일은 생성되었으나 읽지 못함)\n";
            }
        } catch (e) {
            report += "3. 파일 시스템: ❌ 에러 발생\n";
            report += "   - 원인: " + e.message + "\n";
            report += "   - 팁: sdcard 내 폴더 존재 여부와 메신저봇의 저장소 권한을 확인하세요.\n";
        }

        // DB 파일 존재 여부 간이 체크
        report += "\n4. 필수 DB 로드 확인:\n";
        var dbCheck = (libCommon.read(libConst.fileNameList["UserList"]) !== null) ? "✅" : "❌";
        report += "   - UserList.txt: " + dbCheck;

        replier.reply(report);
    }
}
