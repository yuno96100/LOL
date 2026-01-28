// Helper.js
const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        // 단체톡방용 도움말
        getMainHelp: function() {
            return "🧪 [LOL실험실 단톡방 메뉴]\n" +
                   "━━━━━━━━━━━━━━━\n" +
                   libConst.Prefix + "등록 : 게임 참여 가이드\n" +
                   libConst.Prefix + "정보 : 서버 정보 확인\n" +
                   "━━━━━━━━━━━━━━━";
        },

        // 개인톡방용 도움말
        getPrivateHelp: function(_isLoggedIn) {
            let msg = "📜 [LOL실험실 개인톡 메뉴]\n" +
                      "━━━━━━━━━━━━━━━\n";
            if (!_isLoggedIn) {
                msg += libConst.Prefix + "가입 [ID] [PW] : 계정 생성\n" +
                       libConst.Prefix + "로그인 [ID] [PW] : 게임 접속\n";
            } else {
                msg += libConst.Prefix + "내정보 : 내 상태 확인\n" +
                       libConst.Prefix + "로그아웃 : 세션 종료\n";
            }
            msg += "━━━━━━━━━━━━━━━";
            return msg;
        }
    };
}
