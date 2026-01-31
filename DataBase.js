/* ============================================================
   [SECTION] 데이터 입출력 (File I/O)
   ============================================================ */
function bridge() {
    var C = Bridge.getScopeOf("Const.js").bridge();
    
    // 폴더 체크 및 생성 함수
    var checkFolder = function(path) {
        var folder = new java.io.File(path);
        if (!folder.exists()) folder.mkdirs();
    };

    return {
        readUser: function(name) {
            try { return JSON.parse(FileStream.read(C.DataPath + name + ".json")); }
            catch(e) { return null; }
        },
        writeUser: function(name, data) {
            checkFolder(C.DataPath);
            FileStream.write(C.DataPath + name + ".json", JSON.stringify(data, null, 4));
        },
        deleteUser: function(name) {
            return FileStream.remove(C.DataPath + name + ".json");
        },
        getAllUserIds: function() {
            checkFolder(C.DataPath);
            var files = new java.io.File(C.DataPath).listFiles();
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
