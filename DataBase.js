const libConst = Bridge.getScopeOf("Const.js").bridge();
// 🚀 저장 전용 백그라운드 일꾼 (SingleThread로 순서 보장)
const SaveExecutor = java.util.concurrent.Executors.newSingleThreadExecutor();

function bridge() {
    return {
        isExisted: function(id) {
            if (!id) return false;
            return new java.io.File(libConst.UserPath + id + ".json").exists();
        },
        writeUser: function(id, data) {
            // 데이터 무결성을 위해 현재 시점의 데이터를 복사하여 비동기로 넘김
            let copyData = JSON.parse(JSON.stringify(data));
            SaveExecutor.execute(function() {
                try {
                    var folder = new java.io.File(libConst.UserPath);
                    if (!folder.exists()) folder.mkdirs();
                    FileStream.write(libConst.UserPath + id + ".json", JSON.stringify(copyData, null, 4));
                } catch (e) {
                    // 에러 발생 시 로그 룸으로 전송 로직 추가 가능
                }
            });
            return true; // 요청 즉시 성공 반환 (유저 대기 시간 0)
        },
        saveUser: function(id, data) { 
            return this.writeUser(id, data); 
        },
        readUser: function(id) {
            try {
                var path = libConst.UserPath + id + ".json";
                if (!new java.io.File(path).exists()) return null;
                return JSON.parse(FileStream.read(path));
            } catch (e) { return null; }
        },
        getUserList: function() {
            var folder = new java.io.File(libConst.UserPath);
            if (!folder.exists()) folder.mkdirs();
            var files = folder.listFiles();
            return files ? files.length : 0;
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
