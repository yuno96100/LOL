const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        // 유저 데이터 쓰기
        writeUser: function(id, data) {
            try {
                var folder = new java.io.File(libConst.UserPath);
                if (!folder.exists()) folder.mkdirs();
                var path = libConst.UserPath + id + ".json";
                return FileStream.write(path, JSON.stringify(data, null, 4));
            } catch (e) { return false; }
        },

        // LoginManager 호환용 별칭
        saveUser: function(id, data) {
            return this.writeUser(id, data);
        },

        // 유저 데이터 읽기
        readUser: function(id) {
            var path = libConst.UserPath + id + ".json";
            try {
                var file = new java.io.File(path);
                if (!file.exists()) return null;
                return JSON.parse(FileStream.read(path));
            } catch (e) { return null; }
        },

        // 파일 존재 여부 확인
        isExisted: function(id) {
            if (!id) return false;
            return new java.io.File(libConst.UserPath + id + ".json").exists();
        },

        // 전체 유저 ID 목록 (파일명에서 추출)
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

        // 유저 삭제 (Backup 폴더로 이동)
        deleteUser: function(id) {
            try {
                var fromFile = new java.io.File(libConst.UserPath + id + ".json");
                var toFile = new java.io.File(libConst.BackupPath + id + ".json");
                var backupFolder = new java.io.File(libConst.BackupPath);
                if (!backupFolder.exists()) backupFolder.mkdirs();
                
                if (fromFile.exists()) {
                    return fromFile.renameTo(toFile);
                }
                return false;
            } catch (e) { return false; }
        },

        // 유저 복구 (Backup에서 Users로 이동)
        restoreUser: function(id) {
            try {
                var fromFile = new java.io.File(libConst.BackupPath + id + ".json");
                var toFile = new java.io.File(libConst.UserPath + id + ".json");
                if (fromFile.exists()) {
                    return fromFile.renameTo(toFile);
                }
                return false;
            } catch (e) { return false; }
        }
    };
}
