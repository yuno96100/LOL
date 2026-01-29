// Helper.js
const libConst = Bridge.getScopeOf("Const.js").bridge();
const DB = Bridge.getScopeOf("DataBase.js").bridge();

function bridge() {
    return {
        // [LOL실험실 방 도움말]
        getMainHelp: function() {
            let admins = DB.getAdmins();
            let adminStr = admins.length > 0 ? admins.join(", ") : "없음";

            return "🧪 [ 도움말 ]\n" +
                   "━━━━━━━━━━━━━━━\n" +
                   "모든 명령어 앞에는 [" + libConst.Prefix + "]를 붙여주세요.\n\n" +
                   "💡 " + libConst.Prefix + "등록 : 가입 방법 안내\n" +
                   "💡 " + libConst.Prefix + "정보 : 서버 및 방 정보 확인\n" +
                   "💡 " + libConst.Prefix + "도움말 : 현재 메뉴 출력\n" +
                   "━━━━━━━━━━━━━━━\n" +
                   "📢 문의는 '관리자'를 태그하여 메시지를 남겨주세요.\n" +
                   "👑 현재 관리자: (" + adminStr + ")";
        },

        // [개인톡 도움말]
        getPrivateHelp: function(_isLoggedIn) {
            let msg = "📜 [ 도움말 ]\n" +
                      "━━━━━━━━━━━━━━━\n";
            if (!_isLoggedIn) {
                msg += "❗ 현재 로그인이 필요한 상태입니다.\n\n" +
                       "🔑 " + libConst.Prefix + "가입 [ID] [PW]\n" +
                       "🔓 " + libConst.Prefix + "로그인 [ID] [PW]\n";
            } else {
                msg += "✅ 로그인 상태입니다.\n\n" +
                       "👤 " + libConst.Prefix + "내정보 : 내 스탯 확인\n" +
                       "🚪 " + libConst.Prefix + "로그아웃 : 접속 종료\n";
            }
            msg += "━━━━━━━━━━━━━━━";
            return msg;
        },

        // [게임봇 방 도움말 - 신규]
        getAdminHelp: function() {
            return "⚙️ [ 도움말 ]\n" +
                   "━━━━━━━━━━━━━━━\n" +
                   "관리자 전용 제어 센터입니다.\n\n" +
                   "⭐ " + libConst.Prefix + "관리자임명 [닉네임]\n" +
                   "ㄴ 유저를 관리자로 등록하고 공지합니다.\n" +
                   "⭐ " + libConst.Prefix + "관리자해임 [닉네임]\n" +
                   "ㄴ 해당 유저를 관리자 권한에서 삭제합니다.\n" +
                   "⭐ " + libConst.Prefix + "정보 : 시스템 보호막 상태 확인\n" +
                   "━━━━━━━━━━━━━━━";
        }
    };
}
