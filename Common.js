const libConst = Bridge.getScopeOf("Const.js");

function mkpath(_p_path) {
    return libConst.rootPath + _p_path;
}

function read(_p_path) {
    var fullpath = mkpath(_p_path);
    try {
        var content = FileStream.read(fullpath);
        if (content == null) return null;
        return JSON.parse(content);
    } catch(e) {
        return null;
    }
}

function write(_p_path, _obj) {
    var fullpath = mkpath(_p_path);
    try {
        var content = JSON.stringify(_obj);
        FileStream.write(fullpath, content);
    } catch(e) {
        Log.e("파일 저장 실패: " + e);
    }
}

exports.read = read;
exports.write = write;
