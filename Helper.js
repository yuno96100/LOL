const libConst = Bridge.getScopeOf("Const.js"); // const 변수들 Lib
function Directions(_room, _msg, _replier) {
   if (_room === libConst.MainRoomNmae) {
      if (_msg === "!명령어") {
         _replier.reply("[명령어 목록]\n" +
            "   !ID확인"
         );
         return true;
      }
      else if (_msg === "!ID확인") {
         _replier.reply("사용법 : !ID확인 [내가 사용할 ID]");
         return true;
      }
   }
   else {
       switch(_msg) {
          case "!명령어":
              _replier.reply(
                 "[계정 관리 명령어]\n" +
                 "   !등록\n" +
                 "   !PW변경\n" +
                 "   !로그인\n" +
                 "   !로그아웃\n" +
                 "   !계정정보\n\n" +
                 "[캐릭터 생성 명령어]\n" +
                 "   !캐릭생성\n" +
                 "   !종족정보\n" +
                 "   !종족선택\n" +
                 "   !랜덤스텟\n" +
                 "   !스텟확정\n" +
                 "   !게임메뉴\n\n" +
                 "[친구 명령어]\n" +
                 "   !친구추가\n" +
                 "   !친구삭제\n" +
                 "   !친구\n" +
                 "   /(ID)\n"
              );
              return true;
          case "!등록":
              _replier.reply("사용법 : !등록 [내가 사용할 Password]");
              return true;
          case "!PW변경":
              _replier.reply("사용법 : !PW변경 [기존PW] [새로운PW]");
              return true;
          case "!로그인":
              _replier.reply("사용법 : !로그인 [Password]");
              return true;
          case "!종족정보":
              _replier.reply("사용법 : !종족정보 [종족명]");
              return true;
          case "!종족선택":
              _replier.reply("사용법 : !종족선택 [종족명]");
              return true;
          case "!친구추가":
              _replier.reply("사용법 : !종족추가 [친구ID]");
              return true;
          case "!친구삭제":
              _replier.reply("사용법 : !신구삭제 [친구ID]");
              return true;
          case "/":
              _replier.reply("사용법 : /친구ID [할말]");
              return true;
       }
   }
   return false;
}
function PlayDirection(_room, _msg, _replier) {
    switch(_msg) {
       case "!게임메뉴":
       case "!게임명령어":
           _replier.reply(
             "[기본 메뉴]\n" +
              "   !가이드\n" +
              "   !가방\n" +
              "   !스킬\n" +
              "   !스텟\n" +
              "   !특성\n" +
              "   !장착\n" +
              "   !룬\n" +
              "   !포션사용\n" +
              "   !재료\n" +
              "   !도감\n" +
              "\n" +
              "[행동 메뉴]\n" +
              "   !이동\n" +
              "   !떠나기\n" +
              "   !사냥\n" +
              "   !보스소환\n" +
              "   !숙박하기\n" +
              "   !식사하기\n" +
              "   !구매하기\n" +
              "   !구매\n" +
              "   !판매하기\n" +
              "   !판매\n" +
              "   !스킬배우기\n" +
              "   !배우기\n" +
              "   !제조하기\n" +
              "   !제조\n" +
              "   !장비제작\n" +
              "   !제작\n" +
              "   !채굴하기\n" +
              "   !채굴종료\n" +
              "   !룰렛\n" +
              "   !배팅\n" +
              "\n" +
              "[설정 메뉴]\n" +
              "   !스킬설정\n" +
              "   !스킬설정1\n" +
              "   !스킬설정2\n" +
              "   !스킬설정3\n" +
              "   !포션설정\n" +
              "   !hp포션설정\n" +
              "   !mp포션설정\n" +
              "   !sp포션설정\n"
           );
           return true;
       case "!이동":
           _replier.reply("사용법 : !이동 [이동 가능한 지역]");
           return true;
       case "!사냥":
           _replier.reply("사용법 : !사냥 [사냥할 횟수]");
           return true;
       case "!구매":
           _replier.reply("사용법 : !구매 [갯수] [아이템명]");
           return true;
       case "!판매":
           _replier.reply("사용법 : !판매 [갯수] [아이템명]");
           return true;
       case "!장착":
           _replier.reply("사용법 : !장착 [아이템명]");
           return true;
       case "!재료":
           _replier.reply("사용법 : !재료 [아이템명]");
           return true;
       case "!제조":
           _replier.reply("사용법 : !제조 [갯수] [아이템명]");
           return true;
       case "!제작":
           _replier.reply("사용법 : !제작 [아이템명]");
           return true;
       case "!도감":
           _replier.reply("사용법 : !도감 [검색명]");
           return true;
       case "!룰렛":
           _replier.reply(
              "[룰렛 하기]\n\n" +
              "  - (흑/적, 상/중/하, 1~9) 배팅이 가능합니다.\n" +
              "  - (배팅 배율) : 흑/적 -> 2배, 상/중/하 -> 3배, 1~9 -> 9배\n" +
              "  - (명령어 사용법) : !배팅 [배팅할 금액] [배팅 위치]\n\n" +
              "  - 사용 예 ex1> !배팅 1000 흑\n" +
              "  - 사용 예 ex2> !배팅 5000 상\n" +
              "  - 사용 예 ex3> !배팅 800 6\n\n" +
              " >> 예1은 1000 룬을 흑에 배팅한다는 의미입니다.\n" +
              " >> 예2는 5000 룬을 7~9에 배팅한다는 의미입니다.\n" +
              " >> 예3은 800 룬을 6에 배팅한다는 의미입니다.\n\n" +
              "[2개 조건으로 배팅가능]\n\n" +
              "  - 흑/적 조건과 다른 조건을 조합해서 배팅 가능합니다.\n" +
              "  - 배율은 두조건의 배율을 곱한 값입니다.\n" +
              "  - 사용 예 ex4> !배팅 2000 적7\n" +
              "  - 사용 예 ex5> !배팅 3000 적하\n" +
              " >> 예4는 2000 룬을 적색 7에 배팅한다는 의미입니다. 배율은 2 x 9 = 18배\n" +
              " >> 예5는 3000 룬을 흑색 1~3에 배팅한다는 의미입니다. 배율은 2 x 3 = 6배\n"
           );
           return true;
       case "!포션사용":
           _replier.reply("사용법 : !포션사용 [아이템명]");
           return true;
       case "!스킬설정1":
           _replier.reply("사용법 : !스킬설정1 [스킬명]");
           return true;
       case "!스킬설정2":
           _replier.reply("사용법 : !스킬설정2 [스킬명]");
          return true;
       case "!스킬설정3":
           _replier.reply("사용법 : !스킬설정3 [스킬명]");
           return true;
       case "!hp포션설정":
           _replier.reply("사용법 : !hp포션설정 [남은HP%] [아이템명]");
           return true;
       case "!mp포션설정":
           _replier.reply("사용법 : !mp포션설정 [남은MP%] [아이템명]");
          return true;
       case "!sp포션설정":
           _replier.reply("사용법 : !sp포션설정 [남은SP%] [아이템명]");
           return true;
    }
    return false;
}

