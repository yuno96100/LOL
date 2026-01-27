const libConst = Bridge.getScopeOf("Const.js"); // const 변수들 Lib
const libCommon = Bridge.getScopeOf("Common.js"); // 일반 function Lib
const libObject = Bridge.getScopeOf("Object.js"); // Object Lib

function LoginManager() {
    var m_userList = []; //Object.clsUserInfo 객체를 가지는 배열

    var _LoadData, _Contain, _MakeKey, _MakeJson, _ConfirmKey;

    _LoadData = function() {
        var tmpList = libCommon.read(libConst.fileNameList["UserList"]);
        for(var idx = 0; idx < tmpList.length; ++idx) {
            m_userList.push(libObject.clsUserInfo(tmpList[idx]));
        }
    }();

    _Contain = function(_id) {
       for (var i = 0; i < m_userList.length; ++i) {
          if (m_userList[i].id === _id) {
             return i;
          }
       }
       return -1;
    };
    _MakeKey = function(_sender, _img) {
        var tempstr = _sender + _img;
        return tempstr.substring(0, 32);
    };
    _MakeJson = function() {
        var jsonArray = [];
        for(var i = 0; i < m_userList.length; ++i) {
            jsonArray.push(m_userList[i].getJson());
        }

        return jsonArray;
    };
    _ConfirmKey = function(_idx, _sender, _img) {
       var user = m_userList[_idx];
       return user.equalKey(_MakeKey(_sender, _img));
    };


    return {
        contain: function(_id) {
            return _Contain(_id);
        },
        insert: function(_id, _pw, _sender, _image) {
           if (_Contain(_id) === -1) {
                var obj = {};
                obj.id = _id;
                obj.pwd = _pw;
                obj.key = _MakeKey(_sender, _image);

                m_userList.push(libObject.clsUserInfo(obj));
                libCommon.write(libConst.fileNameList["UserList"], _MakeJson());

                return true;
           } else
                return false;

        },
        changepw: function(_id, _pw, _newpw, _sender, _image) {
           var index = _Contain(_id);
           if (index === -1) {
              return 1;
           }
           else {
              if (!m_userList[index].equal({id:_id,pwd:_pw})) {
                 return 2;
              }
              else if(!_ConfirmKey(index, _sender, _image)) {
                 return 3;
              }
              else {
                 m_userList[index].changePwd(_newpw);
                 libCommon.write(libConst.fileNameList["UserList"], _MakeJson());
                 return 0;
              }
           }
        },
        login:function(_id, _pw, _sender, _image) {
            var index = _Contain(_id);
            if (index === -1) {
                return false;
            }
            else {
                if (!m_userList[index].equal({id:_id,pwd:_pw})) {
                   return false;
                }
                else if(!_ConfirmKey(index, _sender, _image)) {
                   return false;
                }
                else {
                   m_userList[index].setState(true);
                   return true;
                }
            }
        },
        logout:function(_id, _sender, _image) {
            var index = _Contain(_id);
            if (index === -1) {
                return false;
            }
            else {
                if(!_ConfirmKey(index, _sender, _image)) {
                   return false;
                }
                else {
                   m_userList[index].setState(false);
                   return true;
                }
            }
        },
        loginfo:function(_id) {
            var index = _Contain(_id);
            var rtnstr = "";
            if (index === -1) {
                rtnstr = "생성된 계정이 없습니다.";
            }
            else {
                var user = m_userList[index];

                rtnstr += "id : " + user.id + "\n";
                rtnstr += "login 상태 : " + (user.loginstate()?"접속 중":"미접속");
            }
            return rtnstr;
        },
        islogin:function(_id) {
            var index = _Contain(_id);
            var rtnstr = "";
            if (index === -1) {
                return false;
            }
            return m_userList[index].loginstate();
        }
    };
}

