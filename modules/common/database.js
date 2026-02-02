/* ============================================================
   [SECTION] 데이터베이스 관리 (Const.UserPath 사용)
   ============================================================ */
var C = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    var checkFolder = function(path) {
        var folder = new java.io.File(path);
        if (!folder.exists()) folder.mkdirs();
    };

    return {
        readUser: function(name) {
            try { 
                return JSON.parse(FileStream.read(C.UserPath + name + ".json")); 
            } catch(e) { return null; }
        },
        writeUser: function(name, data) {
            checkFolder(C.UserPath);
            FileStream.write(C.UserPath + name + ".json", JSON.stringify(data, null, 4));
        },
        getAllUserIds: function() {
            checkFolder(C.UserPath);
            var files = new java.io.File(C.UserPath).listFiles();
            var list = [];
            for (var i in files) {
                if (files[i].isFile() && files[i].getName().endsWith(".json")) {
                    list.push(files[i].getName().replace(".json", ""));
                }
            }
            return list;
        }
    };
}
