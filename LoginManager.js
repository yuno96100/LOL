// LoginManager.js
const DB = Bridge.getScopeOf("DataBase.js").bridge();
const Obj = Bridge.getScopeOf("Object.js").bridge();

function bridge() {
    return {
        tryRegister: function(_id, _pw, _sender) {
            if (DB.isExisted(_id)) return { success: false, msg: "❌ 이미 사용 중인 ID입니다." };
            let newUser = Obj.getNewUser(_id, _pw, _sender);
            if (DB.saveUser(_id, newUser)) {
                return { success: true, msg: "✅ 가입 완료!\n이제 '.로그인 " + _id + " " + _pw + "'를 입력하세요." };
            }
            return { success: false, msg: "❌ 데이터 저장 중 오류가 발생했습니다." };
        },
        tryLogin: function(_id, _pw) {
            let user = DB.loadUser(_id);
            if (!user) return { success: false, msg: "❌ 존재하지 않는 ID입니다." };
            if (user.info.pw !== _pw) return { success: false, msg: "❌ 비밀번호가 틀렸습니다." };
            return { success: true, msg: "🔓 " + user.info.name + "님, 로그인 성공!", data: user };
        }
    };
}
