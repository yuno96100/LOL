const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        isExisted: function(id) {
            return new java.io.File(libConst.UserPath + id + ".json").exists();
        },
        writeUser: function(id, data) {
            try {
                var folder = new java.io.File(libConst.UserPath);
                if (!folder.exists()) folder.mkdirs();
                FileStream.write(libConst.UserPath + id + ".json", JSON.stringify(data, null, 4));
                return true;
            } catch (e) { return false; }
        },
        readUser: function(id) {
            try {
                var path = libConst.UserPath + id + ".json";
                if (!new java.io.File(path).exists()) return null;
                return JSON.parse(FileStream.read(path));
            } catch (e) { return null; }
        },
        getAllUserIds: function() {
            var folder = new java.io.File(libConst.UserPath);
            if (!folder.exists()) folder.mkdirs();
            var files = folder.list();
            var list = [];
            if (files) {
                for (var i = 0; i < files.length; i++) {
                    if (files[i].endsWith(".json")) list.push(files[i].replace(".json", ""));
                }
            }
            return list;
        },
        deleteUser: function(id) {
            try {
                var from = new java.io.File(libConst.UserPath + id + ".json");
                var toFolder = new java.io.File(libConst.BackupPath);
                if (!toFolder.exists()) toFolder.mkdirs();
                return from.renameTo(new java.io.File(libConst.BackupPath + id + ".json"));
            } catch (e) { return false; }
        }
    };
}
