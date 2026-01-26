const libConst = Bridge.getScopeOf("Const.js");

function mkpath(_p_path)
{
    return libConst.rootPath + _p_path;
}
function read(_p_path)
{
    var fullpath = mkpath(_p_path);
    var rtnObj = null;

    try {
        rtnObj = JSON.parse(FileStream.read(mkpath(_p_path)));
    } catch(e) {
        log_e("read()", e.Message());
    }

    return rtnObj;
}
function write(_p_path, _obj)
{
    var fullpath = mkpath(_p_path);

    try {
        FileStream.write(mkpath(_p_path), JSON.stringify(_obj));

    } catch(e) {
        log_e("write()", e.Message());
    }
}
function Rand(_start, _end){
    return (_start + Math.floor(Math.random() * (_end - _start + 1)));
}

function replyID(_id, _msg) {
    Api.replyRoom(_id, _msg);
}

function log_i(_funcName, _data)
{
    if(libConst.def_Log)
      Log.i(_funcName + " func --- " + _data);
}
function log_e(_funcName, _data)
{
    if(libConst.def_Log)
      Log.e(_funcName + " func --- " + _data);
}

