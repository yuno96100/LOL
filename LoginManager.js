function bridge() {
    return {
        tryRegister: function(id, nick, DB, Obj) {
            // DB.isExisted 호출
            if (DB.isExisted(id)) return { success: false, msg: "❌ 이미 가입된 유저입니다." };
            
            var newUser = Obj.getNewUser(id, "0", nick);
            if (DB.saveUser(id, newUser)) {
                return { success: true, msg: "✅ 가입 성공! [" + nick + "]님 환영합니다." };
            }
            return { success: false, msg: "❌ 가입 처리 중 오류 발생." };
        },
        tryLogin: function(id, DB) {
            var userData = DB.readUser(id); 
            if (!userData) return { success: false, msg: "가입 정보가 없습니다." };
            return { success: true, msg: "성공", data: userData };
        }
    };
}
