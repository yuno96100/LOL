const libConst = Bridge.getScopeOf("Const.js"); // const 변수들 Lib
const helper = Bridge.getScopeOf("Helper.js"); // 도움말 객체
const libObject = Bridge.getScopeOf("Object.js"); // object 객체
const libCommon = Bridge.getScopeOf("Common.js"); // 일반 function Lib

var login_Manager = Bridge.getScopeOf("LoginManager.js").LoginManager(); // 로그인 담당 객체
var charactor_Manager = Bridge.getScopeOf("CharactorManager.js").CharactorManager(); // 캐릭터 담당 객체
var relation_Manager = Bridge.getScopeOf("RelationManager.js").RelationManager(); // 친구추가 및 삭제 담당 객체
var db_Manager = Bridge.getScopeOf("DataBase.js").DBManager(); // 데이터 담당 객체

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (helper.Directions(room, msg, replier)) return;

    if (room === libConst.MainRoomNmae)
       MainCmd(room, msg, sender, replier);
    else
       UserCmd(room, msg, sender, replier, imageDB.getProfileBase64());
}
function MainCmd(_room, _msg, _sender, _replier) {
    if (_msg.indexOf("!ID확인") === 0) {
        if (login_Manager.contain(_msg.split(" ")[1]) !== -1)
            _replier.reply("이미 등록된 ID입니다.");
        else {
            _replier.reply("사용가능한 ID입니다.\n해당 아이디로 1:1채팅방을 열어주시기 바랍니다.\n\n실수로 다른 ID로 등록시 삭제 요청은 운영자에게 메시지 부탁드립니다.");
        }
    }
}
function UserCmd(_room, _msg, _sender, _replier, _image) {
    var result, obj, array, rtnStr, splitMsg, friend, i;
    if (_msg.indexOf("!등록") === 0) {
        if(_msg.split(" ")[1] === undefined || _msg.split(" ")[1] === null || _msg.split(" ")[1] === "") {
            _replier.reply("패스워드 값이 없습니다.");
            return;
        }
        if (login_Manager.insert(_room, _msg.split(" ")[1], _sender, _image)) {
            _replier.reply("등록이 완료되었습니다.");
            libCommon.replyID(libConst.MainRoomNmae, "[" + _room + "] 님이 회원 가입을 완료 하였습니다.");
        } else {
            _replier.reply("이미 등록이된 ID입니다.");
        }
    }
    else if (_msg.indexOf("!PW변경") === 0) {
        result = login_Manager.changepw(_room, _msg.split(" ")[1], _msg.split(" ")[2], _sender, _image);
        if (result === 0) {
            _replier.reply("변경이 완료되었습니다.");
        } else if (result === 1) {
            _replier.reply("미등록 ID입니다.");
        } else if (result === 2) {
            _replier.reply("기존 PW가 동일하지 않습니다.");
        } else if (result === 3) {
            _replier.reply("초기 등록된 보안 key값이 다릅니다. 최초 등록된 카톡명과 이미지로 변경하시기 바랍니다.");
        }
    }
    else if(_msg.indexOf("!로그인") === 0) {
        if(login_Manager.login(_room, _msg.split(" ")[1], _sender, _image)) {
            _replier.reply("로그인이 완료 되었습니다.");
        } else {
            _replier.reply("로그인에 실패하였습니다.");
        }
    }
    else if(_msg.indexOf("!로그아웃") === 0) {
        if(login_Manager.logout(_room, _sender, _image)) {
            _replier.reply("로그아웃이 완료 되었습니다.");
        } else {
            _replier.reply("로그아웃에 실패하였습니다.");
        }
    }
    else if(_msg.indexOf("!계정정보") === 0) {
        _replier.reply(login_Manager.loginfo(_room));
        _replier.reply(charactor_Manager.Charinfo(_room));
    }
    else if(_msg.indexOf("!캐릭생성") === 0){
        if(!checkLogin(_room, _replier))return;

        if(!charactor_Manager.makeCharactor(_room))
        {
            _replier.reply("이미 생성된 캐릭터가 존재 합니다.");
            return;
        }
