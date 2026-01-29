function bridge() {
    return {
        tryRegister: function(id, pw, nick, DB, Obj) {
            if (DB.isExisted(id)) return { success: false, msg: "❌ 이미 가입된 카카오톡 닉네임입니다." };
            var newUser = Obj.getNewUser(id, pw.trim(), nick);
            if (DB.saveUser(id, newUser)) {
                return { success: true, msg: "✅ 가입 성공! [" + nick + "]님 환영합니다." };
            }
            return { success: false, msg: "❌ 가입 처리 중 오류 발생." };
        },
        tryLogin: function(id, pw, DB) {
            // 🚨 loadUser 대신 가장 확실한 readUser를 호출하도록 변경
            var userData = DB.readUser(id); 
            if (!userData) return { success: false, msg: "가입 정보가 없는 닉네임입니다." };
            
            if (String(userData.info.pw).trim() === String(pw).trim()) {
                return { success: true, msg: "성공", data: userData };
            }
            return { success: false, msg: "비밀번호가 일치하지 않습니다." };
        }
    };
}
