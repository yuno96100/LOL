const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        writeUser: function(id, data) {
            try {
                var folder = new java.io.File(libConst.UserPath);
                if (!folder.exists()) folder.mkdirs();
                return FileStream.write(libConst.UserPath + id + ".json", JSON.stringify(data, null, 4));
            } catch (e) { return false; }
        },
        saveUser: function(id, data) { return this.writeUser(id, data); },
        readUser: function(id) {
            try {
                var path = libConst.UserPath + id + ".json";
                if (!new java.io.File(path).exists()) return null;
                return JSON.parse(FileStream.read(path));
            } catch (e) { return null; }
        },
        // 🚨 혹시 모를 참조 에러 대비 이중 정의
        loadUser: function(id) {
            return this.readUser(id);
        },
        isExisted: function(id) {
            if (!id) return false;
            return new java.io.File(libConst.UserPath + id + ".json").exists();
        },
        getUserList: function() {
            var files = new java.io.File(libConst.UserPath).listFiles();
            var list = [];
            if (files) {
                for (var i = 0; i < files.length; i++) {
                    if (files[i].isFile() && files[i].getName().endsWith(".json")) {
                        list.push(files[i].getName().replace(".json", ""));
                    }
                }
            }
            return list;
        },
        deleteUser: function(id) {
            try {
                var from = new java.io.File(libConst.UserPath + id + ".json");
                return from.renameTo(new java.io.File(libConst.BackupPath + id + ".json"));
            } catch (e) { return false; }
        },
        restoreUser: function(id) {
            try {
                var from = new java.io.File(libConst.BackupPath + id + ".json");
                return from.renameTo(new java.io.File(libConst.UserPath + id + ".json"));
            } catch (e) { return false; }
        }
    };
}
