// DataBase.js
const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    // 자동 폴더 생성 로직
    var userFolder = new java.io.File(libConst.UserPath);
    var backupFolder = new java.io.File(libConst.BackupPath);
    if (!userFolder.exists()) userFolder.mkdirs(); 
    if (!backupFolder.exists()) backupFolder.mkdirs(); 

    return {
        // 관리자 명단 가져오기
        getAdmins: function() {
            try {
                let content = FileStream.read(libConst.AdminPath);
                return content ? JSON.parse(content) : [];
            } catch (e) { return []; }
        },

        // 관리자 명단 저장하기
        saveAdmins: function(_list) {
            try {
                FileStream.write(libConst.AdminPath, JSON.stringify(_list, null, 4));
                return true;
            } catch (e) { return false; }
        },

        // 유저 데이터 저장
        saveUser: function(_id, _data) {
            try {
                FileStream.write(libConst.UserPath + _id + ".json", JSON.stringify(_data, null, 4));
                return true;
            } catch (e) { return false; }
        },

        // 유저 데이터 로드
        loadUser: function(_id) {
            try {
                let content = FileStream.read(libConst.UserPath + _id + ".json");
                return content ? JSON.parse(content) : null;
            } catch (e) { return null; }
        },

        // 유저 존재 여부 확인
        isExisted: function(_id) {
            var file = new java.io.File(libConst.UserPath + _id + ".json");
            return file.exists();
        },

        /**
         * [핵심] 유저 목록 가져오기 (main 72라인 에러 해결)
         */
        getUserList: function() {
            try {
                let folder = new java.io.File(libConst.UserPath);
                let files = folder.listFiles();
                let list = [];
                if (files != null) {
                    for (let i = 0; i < files.length; i++) {
                        if (files[i].isFile() && files[i].getName().endsWith(".json")) {
                            list.push(files[i].getName().replace(".json", ""));
                        }
                    }
                }
                return list;
            } catch (e) { return []; }
        },

        // 유저 삭제 (삭제 전 자동 백업)
        deleteUser: function(_id) {
            try {
                let userData = this.loadUser(_id);
                if (userData) {
                    FileStream.write(libConst.BackupPath + _id + "_bk.json", JSON.stringify(userData, null, 4));
                    var file = new java.io.File(libConst.UserPath + _id + ".json");
                    return file.delete();
                }
                return false;
            } catch (e) { return false; }
        },

        // 유저 롤백
        rollbackUser: function(_id) {
            try {
                let content = FileStream.read(libConst.BackupPath + _id + "_bk.json");
                if (content) {
                    FileStream.write(libConst.UserPath + _id + ".json", content);
                    return true;
                }
                return false;
            } catch (e) { return false; }
        }
    };
}
