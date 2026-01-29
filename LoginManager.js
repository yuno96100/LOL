function bridge() {
    return {
        tryRegister: function(_id, _pw, _nickname, DB, Obj) {
            if (!DB) return { success: false, msg: "❌ DB 연결 실패" };
            if (DB.isExisted(_id)) return { success: false, msg: "❌ 이미 사용 중인 닉네임입니다." };
            
            let newUser = Obj.getNewUser(_id, _pw, _nickname);
            if (DB.saveUser(_id, newUser)) {
                return { success: true, msg: "✅ 가입 완료!\n닉네임: " + _nickname + "\n이제 로그인을 진행해주세요." };
            }
            return { success: false, msg: "❌ 저장 중 오류가 발생했습니다." };
        },
        tryLogin: function(_id, _pw, DB) {
            if (!DB) return { success: false, msg: "❌ DB 연결 실패" };
            let user = DB.loadUser(_id);
            if (!user) return { success: false, msg: "❌ 존재하지 않는 닉네임입니다." };
            if (user.info.pw !== _pw) return { success: false, msg: "❌ 비밀번호가 틀렸습니다." };
            return { success: true, msg: "🔓 " + user.info.name + "님, 환영합니다!", data: user };
        }
    };
}
