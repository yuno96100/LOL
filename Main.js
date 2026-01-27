function response(room, msg, sender, isGroupChat, replier) {
    if (msg === ".체크") {
        var libConst = Bridge.getScopeOf("Const.js");
        var res = "=== 🔍 LOL 실험실 환경 점검 ===\n";
        
        res += "📍 봇이 인식한 현재 방 이름: [" + room + "]\n";
        res += "⚙️ 설정 파일의 메인 방 이름: [" + libConst.MainRoomName + "]\n";
        
        if (room === libConst.MainRoomName) {
            res += "✅ 결과: 메인방 일치! (정상 작동 가능)\n";
        } else {
            res += "❌ 결과: 방 이름 불일치! (명령어 무시됨)\n";
            res += "💡 해결: Const.js의 MainRoomName를 [" + room + "]로 수정하세요.\n";
        }

        // 경로 권한 체크
        try {
            var path = libConst.rootPath + "test.txt";
            FileStream.write(path, "test");
            res += "📁 경로 권한: ✅ 정상 (" + libConst.rootPath + ")";
        } catch(e) {
            res += "📁 경로 권한: ❌ 에러 (" + e.message + ")\n💡 폴더가 없거나 권한이 없습니다.";
        }

        replier.reply(res);
    }
}
