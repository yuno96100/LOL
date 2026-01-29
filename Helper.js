// Helper.js
const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        getMenu: function(room, isGroupChat, isLoggedIn) {
            var title = "";
            var body = "";

            if (room.trim() === libConst.ErrorLogRoom.trim()) {
                title = "🛡️ 관리자 컨트롤 센터";
                body = "✨ 유저 관리\n" +
                       "• " + libConst.Prefix + "유저조회 : 가입 ID 목록\n" +
                       "• " + libConst.Prefix + "유저정보 [ID] : 상세 정보\n" +
                       "• " + libConst.Prefix + "유저초기화 [ID] : 데이터 리셋\n" +
                       "• " + libConst.Prefix + "유저삭제 [ID] : 계정 삭제\n" +
                       "• " + libConst.Prefix + "유저롤백 [ID] : 복구\n\n" +
                       "👑 권한 제어\n" +
                       "• " + libConst.Prefix + "관리자임명 [닉네임]\n" +
                       "• " + libConst.Prefix + "관리자해임 [닉네임]\n\n" +
                       "📊 시스템\n" +
                       "• " + libConst.Prefix + "정보 : 서버 상태";
            } else if (room.trim() === libConst.MainRoomName.trim()) {
                title = "🧪 LOL실험실 메인메뉴";
                body = "📢 공용 명령어\n" +
                       "• " + libConst.Prefix + "등록 : 가입 방법\n" +
                       "• " + libConst.Prefix + "정보 : 서버 버전\n" +
                       "• " + libConst.Prefix + "메뉴 : 현재 창 열기\n\n" +
                       "💡 가입/로그인은 개인톡(1:1)에서!";
            } else if (!isGroupChat) {
                title = "👤 개인 전용 메뉴";
                if (!isLoggedIn) {
                    body = "🔓 인증 전\n" +
                           "• " + libConst.Prefix + "가입 [ID] [PW]\n" +
                           "• " + libConst.Prefix + "로그인 [ID] [PW]";
                } else {
                    body = "🔒 인증됨\n" +
                           "• " + libConst.Prefix + "내정보 : 스탯 확인\n" +
                           "• " + libConst.Prefix + "로그아웃 : 접속 종료\n" +
                           "• " + libConst.Prefix + "메뉴 : 메뉴 확인";
                }
            }

            var res = "━━━━━━━━━━━━━━━\n";
            res += "📋 " + title + "\n";
            res += "━━━━━━━━━━━━━━━\n";
            res += body + "\n";
            res += "━━━━━━━━━━━━━━━";
            return res;
        },
        getAdminHelp: function() { return this.getMenu(libConst.ErrorLogRoom, true, true); },
        getMainHelp: function() { return this.getMenu(libConst.MainRoomName, true, false); },
        getPrivateHelp: function(isLoggedIn) { return this.getMenu("", false, isLoggedIn); }
    };
}
