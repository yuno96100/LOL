function response(room, msg, sender, isGroupChat, replier) {
    
    // 점검 명령어
    if (msg === ".체크") {
        var report = ["🔍 [시스템 환경 점검 리포트]"];
        
        try {
            // 1. Const.js 로드 확인
            var libConst = Bridge.getScopeOf("Const.js");
            if (!libConst) {
                report.push("❌ Const.js : 로드 실패 (파일명을 확인하세요)");
            } else {
                report.push("✅ Const.js : 로드 성공");
                report.push("   - 설정된 메인룸: " + libConst.MainRoomNmae);
                report.push("   - 설정된 경로: " + libConst.rootPath);
                
                // 2. 방 이름 일치 확인
                if (room === libConst.MainRoomNmae) {
                    report.push("✅ 현재 방 인식: 메인룸(GameRoom) 일치");
                } else {
                    report.push("ℹ️ 현재 방 인식: 개인톡 또는 다른 방 (" + room + ")");
                }
            }

            // 3. 파일 시스템 및 폴더 권한 확인
            var testPath = libConst.rootPath + "test.txt";
            try {
                FileStream.write(testPath, "test");
                var readTest = FileStream.read(testPath);
                if (readTest === "test") {
                    report.push("✅ 파일 시스템: 읽기/쓰기 가능");
                } else {
                    report.push("❌ 파일 시스템: 쓰기 성공했으나 읽기 실패");
                }
            } catch (e) {
                report.push("❌ 파일 시스템: 권한 없음 또는 폴더 없음 (" + e.message + ")");
            }

            // 4. Bridge 정상 작동 확인 (다른 모듈 로드)
            try {
                var libCommon = Bridge.getScopeOf("Common.js");
                report.push(libCommon ? "✅ Common.js : 연결됨" : "❌ Common.js : 연결 실패");
            } catch(e) {
                report.push("❌ 모듈 브릿지 에러: " + e.message);
            }

        } catch (e) {
            report.push("⚠️ 치명적 오류: " + e.message);
        }

        replier.reply(report.join("\n"));
    }
}
