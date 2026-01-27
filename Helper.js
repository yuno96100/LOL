const libConst = Bridge.getScopeOf("Const.js");

function Directions(_room, _msg, _replier) {
    const P = libConst.Prefix;

    if (_room === libConst.MainRoomNmae) {
        if (_msg === P + "명령어") {
            var helpMain = "┏━━━━━━━┓\n" +
                           "┃   📢 메인룸 명령어   ┃\n" +
                           "┗━━━━━━━┛\n" +
                           "◈ " + P + "ID확인 [아이디]\n" +
                           "────────────────\n" +
                           "💡 가입 및 게임 플레이는\n" +
                           "     1:1 채팅방에서 가능합니다.";
            _replier.reply(helpMain);
            return true;
        }
    } else {
        if (_msg === P + "명령어") {
            var helpUser = "┏━━━━━━━━━━━━━━━┓\n" +
                           "   🎮  GAME COMMANDS  \n" +
                           "┗━━━━━━━━━━━━━━━┛\n" +
                           "  [ 👤 계정 관리 ]\n" +
                           "  ㆍ " + P + "등록 [ID] [PW]\n" +
                           "  ㆍ " + P + "로그인 [ID] [PW]\n" +
                           "  ㆍ " + P + "로그아웃\n\n" +
                           "  [ ⚔️ 게임 시작 ]\n" +
                           "  ㆍ " + P + "캐릭생성\n" +
                           "────────────────\n" +
                           "👉 모든 명령어는 [ " + P + " ]로 시작합니다.";
            _replier.reply(helpUser + "\u200b".repeat(500)); 
            return true;
        }
    }
    return false;
}

exports.Directions = Directions;
