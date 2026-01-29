const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        // 기존 writeUser 함수
        writeUser: function(id, data) {
            try {
                var folder = new java.io.File(libConst.UserPath);
                if (!folder.exists()) folder.mkdirs();
                
                var path = libConst.UserPath + id + ".json";
                // 환경에 따라 FileStream 혹은 java 연산 사용
                return FileStream.write(path, JSON.stringify(data, null, 4));
            } catch (e) { return false; }
        },

        // 🚨 [추가] LoginManager와의 호환성을 위한 별칭
        saveUser: function(id, data) {
            return this.writeUser(id, data);
        },

        readUser: function(id) {
            var path = libConst.UserPath + id + ".json";
            try {
                var file = new java.io.File(path);
                if (!file.exists()) return null;
                return JSON.parse(FileStream.read(path));
            } catch (e) { return null; }
        },

        isExisted: function(id) {
            return new java.io.File(libConst.UserPath + id + ".json").exists();
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
            try {
                var fromFile = new java.io.File(libConst.UserPath + id + ".json");
                var toFile = new java.io.File(libConst.BackupPath + id + ".json");
                var backupFolder = new java.io.File(libConst.BackupPath);
                if (!backupFolder.exists()) backupFolder.mkdirs();
                return fromFile.renameTo(toFile);
            } catch (e) { return false; }
        },

        restoreUser: function(id) {
            try {
                var fromFile = new java.io.File(libConst.BackupPath + id + ".json");
                var toFile = new java.io.File(libConst.UserPath + id + ".json");
                return fromFile.renameTo(toFile);
            } catch (e) { return false; }
        }
    };
}
