function bridge() {
    return {
        tryRegister: function(id, pw, nick, DB, Obj) {
            if (DB.isExisted(id)) return { success: false, msg: "❌ 이미 가입된 계정입니다." };
            var newUser = Obj.getNewUser(id, pw, nick);
            if (DB.saveUser(id, newUser)) {
                return { success: true, msg: "✅ 가입 성공! [" + nick + "]님 환영합니다." };
            }
            return { success: false, msg: "❌ 가입 처리 중 오류가 발생했습니다." };
        },
        tryLogin: function(id, pw, DB) {
            var userData = DB.loadUser(id);
            if (!userData) return { success: false, msg: "존재하지 않는 아이디입니다." };
            if (userData.info.pw !== pw) return { success: false, msg: "비밀번호가 일치하지 않습니다." };
            return { success: true, msg: "성공", data: userData };
        }
    };
}
