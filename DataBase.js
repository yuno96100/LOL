// DataBase.js
const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    // 필요한 폴더들 생성
    [libConst.UserPath, libConst.BackupPath].forEach(path => {
        var folder = new java.io.File(path);
        if (!folder.exists()) folder.mkdirs();
    });

    return {
        // ... (기존 getAdmins, saveAdmins, saveUser, loadUser, isExisted, getUserList 동일)

        // [신규] 유저 데이터 삭제 (삭제 전 자동 백업)
        deleteUser: function(_id) {
            try {
                let userData = this.loadUser(_id);
                if (userData) {
                    // 삭제 전 백업 폴더에 저장
                    FileStream.write(libConst.BackupPath + _id + "_bk.json", JSON.stringify(userData, null, 4));
                    var file = new java.io.File(libConst.UserPath + _id + ".json");
                    return file.delete();
                }
                return false;
            } catch (e) { return false; }
        },

        // [신규] 유저 데이터 롤백 (백업 파일에서 복구)
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
