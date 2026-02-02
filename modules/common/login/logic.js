function bridge() {
    var C = Bridge.getScopeOf("Const.js").bridge();
    
    return {
        execute: function(num, session) {
            if (num == "1") {
                session.waitAction = "로그인";
                return { msg: "🔓 로그인할 닉네임을 입력해 주세요." };
            } else if (num == "2") {
                session.waitAction = "가입";
                return { msg: "📝 가입할 닉네임을 입력해 주세요." };
            }
            return { msg: "❌ 번호를 다시 확인해 주세요." };
        },
        handleWait: function(msg, session, DB, Obj) {
            var action = session.waitAction;
            session.waitAction = null;
            
            if (action === "가입") {
                if (DB.readUser(msg)) return "❌ 이미 존재하는 이름입니다.";
                // 계정 및 프로필 분리 생성
                var acc = Obj.getNewAccount(session.id, msg);
                var prof = Obj.getNewProfile(msg);
                DB.writeUser(msg, prof); // 기존 DB 구조 유지 혹은 분리 저장
                return "✅ 가입 완료! 이제 '.메뉴'를 눌러 로그인하세요.";
            }
            if (action === "로그인") {
                var data = DB.readUser(msg);
                if (!data) return "❌ 정보를 찾을 수 없습니다.";
                session.data = data;
                session.isMenuOpen = false;
                return "🔓 [" + msg + "]님 접속 성공!\n개인실 기능을 이용할 수 있습니다.";
            }
        }
    };
}
