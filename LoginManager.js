// LoginManager.js
const libConst = Bridge.getScopeOf("Const.js").bridge();
const DB = Bridge.getScopeOf("DataBase.js").bridge();
const Obj = Bridge.getScopeOf("Object.js").bridge();

function bridge() {
    return {
        // 가입 시도 처리
        tryRegister: function(_id, _pw, _sender) {
            // 1. ID 중복 체크
            if (DB.isExisted(_id)) {
                return { success: false, msg: "이미 사용 중인 ID입니다." };
            }

            // 2. 유저 객체 생성 (Object.js 이용)
            let newUser = Obj.getNewUser(_id, _pw, _sender);

            // 3. DB에 저장
            if (DB.saveUser(_id, newUser)) {
                return { success: true, msg: "가입이 완료되었습니다!\n이제 '.로그인 " + _id + " " + _pw + "'를 입력해주세요." };
            } else {
                return { success: false, msg: "저장 중 오류가 발생했습니다." };
            }
        },

        // 로그인 체크
        tryLogin: function(_id, _pw) {
            let user = DB.loadUser(_id);
            if (!user) return { success: false, msg: "존재하지 않는 ID입니다." };
            if (user.info.pw !== _pw) return { success: false, msg: "비밀번호가 일치하지 않습니다." };
            
            return { success: true, msg: user.info.name + "님, 환영합니다!", data: user };
        }
    };
}
