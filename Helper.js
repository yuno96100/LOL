const libConst = Bridge.getScopeOf("Const.js"); // const 변수들 Lib
function Directions(_room, _msg, _replier) {
   if (_room === libConst.MainRoomName) {
      if (_msg === ".명령어") {
         _replier.reply("[명령어 목록]\n" +
            "   .ID확인"
         );
         return true;
      }
      else if (_msg === ".ID확인") {
         _replier.reply("사용법 : !ID확인 [내가 사용할 ID]");
         return true;
      }
   }
   else {
       switch(_msg) {
          case ".명령어":
              _replier.reply(
                 "[계정 관리 명령어]\n" +
                 "   .등록\n" +
                 "   .PW변경\n" +
                 "   .로그인\n" +
                 "   .로그아웃\n" +
                 "   .계정정보\n\n" 
              );
              return true;
          case ".등록":
              _replier.reply("사용법 : .등록 [내가 사용할 Password]");
              return true;
          case ".PW변경":
              _replier.reply("사용법 : .PW변경 [기존PW] [새로운PW]");
              return true;
          case ".로그인":
              _replier.reply("사용법 : .로그인 [Password]");
              return true;
       }
   }
   return false;
}
