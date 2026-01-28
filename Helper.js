// Helper.js
const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        // 단체톡방용 도움말
        getMainHelp: function() {
            return "🧪 [LOL실험실 메인 메뉴]\n" +
                   "━━━━━━━━━━━━━━━\n" +
                   libConst.Prefix + "등록 : 게임 참여 방법 안내\n" +
                   libConst.Prefix + "정보 : 실험실 정보 확인\n" +
                   "━━━━━━━━━━━━━━━\n" +
                   "※ 모든 게임 플레이는 방장과의 1:1 채팅에서 진행됩니다.";
        },

        // 개인톡방용 도움말 (가입 전/후로 나누면 더 좋습니다)
        getPrivateHelp: function(_isLoggedIn) {
            let msg = "📜 [LOL실험실 개인톡 메뉴]\n" +
                      "━━━━━━━━━━━━━━━\n";
            
            if (!_isLoggedIn) {
                msg += libConst.Prefix + "가입 [ID] [PW] : 신규 계정 생성\n" +
                       libConst.Prefix + "로그인 [ID] [PW] : 게임 접속\n";
            } else {
                msg += libConst.Prefix + "내정보 : 내 상태 확인\n" +
                       libConst.Prefix + "상점 : 아이템 구매\n" +
                       libConst.Prefix + "로그아웃 : 접속 종료\n";
            }
            
            msg += "━━━━━━━━━━━━━━━";
            return msg;
        }
    };
}
