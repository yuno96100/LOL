// LoginManager.js
const DB = Bridge.getScopeOf("DataBase.js").bridge();
const Obj = Bridge.getScopeOf("Object.js").bridge();

function bridge() {
    return {
        tryRegister: function(_id, _pw, _sender) {
            // 7라인 에러 발생 지점 수정: DB객체가 정상인지 확인
            if (!DB) return { success: false, msg: "❌ 데이터베이스 모듈을 찾을 수 없습니다." };
            
            if (DB.isExisted(_id)) return { success: false, msg: "❌ 이미 사용 중인 ID입니다." };
            
            let newUser = Obj.getNewUser(_id, _pw, _sender);
            if (DB.saveUser(_id, newUser)) {
                return { success: true, msg: "✅ 가입 완료!\n'.로그인 " + _id + " " + _pw + "'를 입력하세요." };
            }
            return { success: false, msg: "❌ 데이터 저장 중 오류가 발생했습니다." };
        },
        tryLogin: function(_id, _pw) {
            if (!DB) return { success: false, msg: "❌ 데이터베이스 모듈을 찾을 수 없습니다." };
            
            let user = DB.loadUser(_id);
            if (!user) return { success: false, msg: "❌ 존재하지 않는 ID입니다." };
            if (user.info.pw !== _pw) return { success: false, msg: "❌ 비밀번호가 틀렸습니다." };
            return { success: true, msg: "🔓 " + user.info.name + "님, 로그인 성공!", data: user };
        }
    };
}
