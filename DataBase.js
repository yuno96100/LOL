// DataBase.js
const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    java.io.File(libConst.UserPath).mkdirs(); 

    return {
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
            return java.io.File(libConst.UserPath + _id + ".json").exists();
        }
    };
}
