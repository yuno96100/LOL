const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    var userFolder = new java.io.File(libConst.UserPath);
    var backupFolder = new java.io.File(libConst.BackupPath);
    if (!userFolder.exists()) userFolder.mkdirs(); 
    if (!backupFolder.exists()) backupFolder.mkdirs(); 

    return {
        getAdmins: function() {
            try {
                let content = FileStream.read(libConst.AdminPath);
                return content ? JSON.parse(content) : [];
            } catch (e) { return []; }
        },
        saveAdmins: function(_list) {
            try {
                FileStream.write(libConst.AdminPath, JSON.stringify(_list, null, 4));
                return true;
            } catch (e) { return false; }
        },
        saveUser: function(_id, _data) {
            try {
                FileStream.write(libConst.UserPath + _id + ".json", JSON.stringify(_data, null, 4));
                return true;
            } catch (e) { return false; }
        },
        loadUser: function(_id) {
            try {
                let content = FileStream.read(libConst.UserPath + _id + ".json");
                return content ? JSON.parse(content) : null;
            } catch (e) { return null; }
        },
        isExisted: function(_id) {
            var file = new java.io.File(libConst.UserPath + _id + ".json");
            return file.exists();
        },
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
