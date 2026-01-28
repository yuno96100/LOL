// DataBase.js
const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    // 앱 시작 시 필요한 폴더 생성 (sdcard/LOL/DB/Users/)
    java.io.File(libConst.UserPath).mkdirs();

    return {
        saveUser: function(_id, _data) {
            try {
                // 저장 경로는 sdcard/LOL/DB/Users/아이디.json
                FileStream.write(libConst.UserPath + _id + ".json", JSON.stringify(_data, null, 4));
                return true;
            } catch (e) {
                return false;
            }
        },
        loadUser: function(_id) {
            try {
                let content = FileStream.read(libConst.UserPath + _id + ".json");
                return content ? JSON.parse(content) : null;
            } catch (e) {
                return null;
            }
        },
        isExisted: function(_id) {
            return java.io.File(libConst.UserPath + _id + ".json").exists();
        }
    };
}
