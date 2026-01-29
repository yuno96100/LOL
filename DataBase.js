const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        // 유저 데이터 읽기 (JSON 파싱 포함)
        readUser: function(id) {
            var path = libConst.UserPath + id + ".json";
            try {
                var content = File.read(path);
                if (content == null) return null;
                return JSON.parse(content);
            } catch (e) {
                return null;
            }
        },

        // 유저 데이터 쓰기
        writeUser: function(id, data) {
            var path = libConst.UserPath + id + ".json";
            try {
                File.write(path, JSON.stringify(data, null, 4));
                return true;
            } catch (e) {
                return false;
            }
        },

        // 유저 존재 여부 확인
        isExisted: function(id) {
            return File.exists(libConst.UserPath + id + ".json");
        },

        // 전체 유저 리스트 가져오기 (파일명 목록)
        getUserList: function() {
            var folder = new java.io.File(libConst.UserPath);
            var files = folder.listFiles();
            var list = [];
            if (files != null) {
                for (var i = 0; i < files.length; i++) {
                    if (files[i].isFile() && files[i].getName().endsWith(".json")) {
                        list.push(files[i].getName());
                    }
                }
            }
            return list;
        },

        // 유저 삭제 (백업 폴더로 이동)
        deleteUser: function(id) {
            var fromPath = libConst.UserPath + id + ".json";
            var toPath = libConst.BackupPath + id + ".json";
            
            // 백업 폴더가 없으면 생성
            var backupFolder = new java.io.File(libConst.BackupPath);
            if (!backupFolder.exists()) backupFolder.mkdirs();
            
            return File.move(fromPath, toPath);
        },

        // 유저 복구 (백업에서 복원)
        restoreUser: function(id) {
            var fromPath = libConst.BackupPath + id + ".json";
            var toPath = libConst.UserPath + id + ".json";
            return File.move(fromPath, toPath);
        }
    };
}
