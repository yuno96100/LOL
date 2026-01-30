function bridge() {
    return {
        tryRegister: function(id, nick, DB, Obj) {
            if (DB.isExisted(id)) return { success: false, msg: "❌ 이미 가입된 계정입니다." };
            var newUser = Obj.getNewUser(id, "0", nick);
            if (DB.writeUser(id, newUser)) return { success: true, msg: "✅ 가입 성공! [" + nick + "]님 환영합니다." };
            return { success: false, msg: "❌ 가입 처리 중 오류 발생." };
        },
        tryLogin: function(id, DB) {
            var data = DB.readUser(id);
            if (!data) return { success: false, msg: "해당 닉네임의 가입 정보를 찾을 수 없습니다." };
            return { success: true, data: data };
        }
    };
}
