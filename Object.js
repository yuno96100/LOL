const libConst = Bridge.getScopeOf("Const.js"); // const 변수들 Lib
const libCommon = Bridge.getScopeOf("Common.js"); // 일반 function Lib
var db_Manager = Bridge.getScopeOf("DataBase.js").DBManager(); // 데이터 담당 객체

function clsUserInfo(_info) { // _info는 {id:"id",pwd:"pwd", key:"key"}
    var m_id = _info.id,
        m_pwd = _info.pwd,
        m_key = _info.key,
        m_login_state = false;


    var f_equalID,
        f_equalPWD;

    f_equalID = function(_id) {
        return m_id === _id;
    };
    f_equalPWD = function(_pwd) {
        return m_pwd === _pwd;
    };

    return {
        id:m_id,
        loginstate:function() {
            return m_login_state;
        },
        changePwd:function(_pwd){
            m_pwd = _pwd;
        },
        equal:function(_obj) { // _obj는 clsUserInfo클래스 객체
            return f_equalID(_obj.id) && f_equalPWD(_obj.pwd);
        },
        setState:function(_state) { // true는 로그인상태, false는 비로그인상태
            m_login_state = _state;
        },
        getJson:function() {
            return {id:m_id, pwd:m_pwd, key:m_key};
        },
        equalKey:function(_key) {
            if(_key === m_key)
                return true;
            return false;
        }
    };
}

