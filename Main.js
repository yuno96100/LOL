function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    
    // 1. 봇 동작 여부 확인 (가장 기초)
    if (msg === ".체크") {
        var log = ["==== 🤖 시스템 정밀 점검 ===="];
        
        // 현재 방 이름 확인
        log.push("📍 현재 방 이름: [" + room + "]");
        
        // 파일 읽기/쓰기 권한 확인
        try {
            var path = "sdcard/Kmjbot/test_log.txt";
            FileStream.write(path, "OK");
            var read = FileStream.read(path);
            log.push(read === "OK" ? "✅ 저장소 권한: 정상" : "❌ 저장소 권한: 읽기 실패");
        } catch(e) {
            log.push("❌ 저장소 권한: 없음 (" + e.message + ")");
        }

        // Bridge(파일 연결) 기능 확인
        try {
            var testConst = Bridge.getScopeOf("Const.js");
            if (testConst) {
                log.push("✅ Const.js 연결: 성공");
                log.push("✅ 설정된 메인룸: [" + testConst.MainRoomNmae + "]");
            } else {
                log.push("❌ Const.js 연결: 실패 (파일이 없거나 컴파일 에러)");
            }
        } catch(e) {
            log.push("❌ Bridge 에러: " + e.message);
        }

        replier.reply(log.join("\n"));
    }
}
