// DataBase.js (v1.1.5)
const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    // 폴더 생성 로직
    var folder = new java.io.File(libConst.UserPath);
    if (!folder.exists()) folder.mkdirs(); 

    return {
        saveUser: function(_id, _data) {
            try {
                FileStream.write(libConst.UserPath + _id + ".json", JSON.stringify(_data, null, 4));
                return true;
            } catch (e) { 
                Log.e("Save Error: " + e.message);
                return false; 
            }
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
