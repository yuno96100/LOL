function bridge() {
    return {
        tryRegister: function(id, pw, nick, DB, Obj) {
            if (DB.isExisted(id)) return { success: false, msg: "❌ 이미 가입된 카카오톡 닉네임입니다." };
            var newUser = Obj.getNewUser(id, pw.trim(), nick);
            if (DB.saveUser(id, newUser)) {
                return { success: true, msg: "✅ 가입 성공! [" + nick + "]님 환영합니다." };
            }
            return { success: false, msg: "❌ 가입 처리 중 오류가 발생했습니다." };
        },
        tryLogin: function(id, pw, DB) {
            var userData = DB.loadUser(id);
            if (!userData) return { success: false, msg: "등록되지 않은 유저입니다." };
            
            // 데이터의 비번과 입력받은 비번을 모두 trim 처리하여 대조
            if (String(userData.info.pw).trim() === String(pw).trim()) {
                return { success: true, msg: "성공", data: userData };
            }
            return { success: false, msg: "비밀번호가 일치하지 않습니다." };
        }
    };
}
