const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        // 파일 읽기
        readUser: function(id) {
            var path = libConst.UserPath + id + ".json";
            try {
                var file = new java.io.File(path);
                if (!file.exists()) return null;
                var content = FileStream.read(path); // 또는 앱 환경에 따라 java 연산 사용
                return JSON.parse(content);
            } catch (e) { return null; }
        },

        // 파일 쓰기
        writeUser: function(id, data) {
            try {
                var folder = new java.io.File(libConst.UserPath);
                if (!folder.exists()) folder.mkdirs();
                
                var path = libConst.UserPath + id + ".json";
                return FileStream.write(path, JSON.stringify(data, null, 4));
            } catch (e) { return false; }
        },

        // 존재 확인
        isExisted: function(id) {
            return new java.io.File(libConst.UserPath + id + ".json").exists();
        },

        // 유저 목록 가져오기
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

        // 유저 삭제 (파일 이동)
        deleteUser: function(id) {
            try {
                var fromPath = libConst.UserPath + id + ".json";
                var toPath = libConst.BackupPath + id + ".json";
                
                var backupFolder = new java.io.File(libConst.BackupPath);
                if (!backupFolder.exists()) backupFolder.mkdirs();
                
                var fromFile = new java.io.File(fromPath);
                var toFile = new java.io.File(toPath);
                return fromFile.renameTo(toFile); // 파일 이동
            } catch (e) { return false; }
        },

        // 유저 복구 (파일 이동)
        restoreUser: function(id) {
            try {
                var fromPath = libConst.BackupPath + id + ".json";
                var toPath = libConst.UserPath + id + ".json";
                
                var fromFile = new java.io.File(fromPath);
                var toFile = new java.io.File(toPath);
                return fromFile.renameTo(toFile);
            } catch (e) { return false; }
        }
    };
}
