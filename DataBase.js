// DataBase.js
const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    var folder = new java.io.File(libConst.UserPath);
    if (!folder.exists()) folder.mkdirs(); 

    return {
        // [수정] 관리자 명단 읽기
        getAdmins: function() {
            try {
                let content = FileStream.read(libConst.AdminPath);
                return content ? JSON.parse(content) : [];
            } catch (e) { return []; }
        },
        // [수정] 관리자 명단 저장
        saveAdmins: function(_list) {
            try {
                FileStream.write(libConst.AdminPath, JSON.stringify(_list, null, 4));
                return true;
            } catch (e) { return false; }
        },
        // 유저 관련 (기존 로직 유지)
        saveUser: function(_id, _data) {
            try {
                FileStream.write(libConst.UserPath + _id + ".json", JSON.stringify(_data, null, 4));
                return true;
            } catch (e) { return false; }
        },
        loadUser: function(_id) {
            try {
                let content = FileStream.read(libConst.UserPath + _id + ".json");
                return content ? JSON.parse(content) : null;
            } catch (e) { return null; }
        },
        isExisted: function(_id) {
            var file = new java.io.File(libConst.UserPath + _id + ".json");
            return file.exists();
        }
    };
}
