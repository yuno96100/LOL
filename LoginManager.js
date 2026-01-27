const libConst = Bridge.getScopeOf("Const.js");
const libCommon = Bridge.getScopeOf("Common.js");
const libObject = Bridge.getScopeOf("Object.js");

function LoginManager() {
    var m_UserList = [];
    var m_LoginSessions = {};

    function _LoadData() {
        var data = libCommon.read(libConst.fileNameList.UserList);
        if (data) m_UserList = data.map(u => libObject.clsUserInfo(u));
    }
    _LoadData();

    function _Save() {
        var saveArray = m_UserList.map(u => u.toJson());
        libCommon.write(libConst.fileNameList.UserList, saveArray);
    }

    return {
        isExist: function(_id) { return m_UserList.some(u => u.getID() === _id); },
        
        register: function(_room, _id, _pw) {
            if (this.isExist(_id)) return "⚠️ [중복 알림]\n이미 존재하는 ID입니다.";
            var newUser = libObject.clsUserInfo({id: _id, pwd: _pw, key: _room});
            m_UserList.push(newUser);
            _Save();
            return "✅ [가입 완료]\n" + _id + "님, 가입을 환영합니다!\n이제 로그인을 해주세요.";
        },

        login: function(_room, _id, _pw) {
            var user = m_UserList.find(u => u.getID() === _id && u.getPW() === _pw);
            if (user) {
                m_LoginSessions[_room] = _id;
                return "🔓 [로그인 성공]\n" + _id + "님, 접속되었습니다.\n오늘도 즐거운 모험 되세요!";
            }
            return "❌ [로그인 실패]\n아이디 또는 비번이 올바르지 않습니다.";
        },

        isLogin: function(_room) { return m_LoginSessions.hasOwnProperty(_room); }
    };
}

exports.LoginManager = LoginManager;
