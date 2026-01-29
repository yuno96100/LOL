const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        readUser: function(id) {
            var path = libConst.UserPath + id + ".json";
            try {
                var content = File.read(path);
                if (content == null) return null;
                return JSON.parse(content);
            } catch (e) { return null; }
        },
        writeUser: function(id, data) {
            var path = libConst.UserPath + id + ".json";
            try {
                File.write(path, JSON.stringify(data, null, 4));
                return true;
            } catch (e) { return false; }
        },
        isExisted: function(id) {
            return File.exists(libConst.UserPath + id + ".json");
        },
        getUserList: function() {
            var folder = new java.io.File(libConst.UserPath);
            var files = folder.listFiles();
            var list = [];
            if (files != null) {
                for (var i = 0; i < files.length; i++) {
                    if (files[i].isFile() && files[i].getName().endsWith(".json")) {
                        list.push(files[i].getName().replace(".json", ""));
                    }
                }
            }
            return list;
        },
        deleteUser: function(id) {
            var backupFolder = new java.io.File(libConst.BackupPath);
            if (!backupFolder.exists()) backupFolder.mkdirs();
            return File.move(libConst.UserPath + id + ".json", libConst.BackupPath + id + ".json");
        },
        restoreUser: function(id) {
            return File.move(libConst.BackupPath + id + ".json", libConst.UserPath + id + ".json");
        }
    };
}
