function bridge() {
    var C = Bridge.getScopeOf("Const.js").bridge();
    
    return {
        handleWait: function(msg, session, DB, Obj) {
            var action = session.waitAction;
            session.waitAction = null;

            if (action === "가입") {
                // 1. 계정 존재 여부 확인 (AccountPath 사용)
                if (DB.exists(C.AccountPath + msg + ".json")) return "❌ 이미 존재하는 유저입니다.";

                // 2. 계정 파일과 프로필 파일 각각 생성
                var acc = Obj.getNewAccount(session.id, msg);
                var prof = Obj.getNewProfile(msg);

                DB.write(C.AccountPath + msg + ".json", acc);
                DB.write(C.ProfilePath + msg + ".json", prof);
                
                return "✅ [" + msg + "]님 가입 완료! (데이터 분리 저장)";
            }

            if (action === "로그인") {
                var acc = DB.read(C.AccountPath + msg + ".json");
                if (!acc) return "❌ 계정을 찾을 수 없습니다.";
                if (acc.isBanned) return "🚫 정지된 계정입니다.";

                // 계정 확인 후 실제 게임 데이터 로드
                var profile = DB.read(C.ProfilePath + msg + ".json");
                session.data = profile; // 세션에는 게임 데이터만 주입
                
                return "🔓 [" + msg + "]님 접속 성공!";
            }
        }
    };
}
