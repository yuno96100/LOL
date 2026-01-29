// Helper.js
const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        // [1] 관리자용 도움말 (게임봇 방)
        getAdminHelp: function() {
            var help = "⚙️ [관리자 시스템 도움말]\n";
            help += "━━━━━━━━━━━━━━━\n";
            help += "💎 인원 관리\n";
            help += "• " + libConst.Prefix + "유저조회 : 가입된 전체 ID 목록\n";
            help += "• " + libConst.Prefix + "유저정보 [ID] : 유저 상세 스탯 조회\n";
            help += "• " + libConst.Prefix + "유저초기화 [ID] : 데이터 리셋(백업생성)\n";
            help += "• " + libConst.Prefix + "유저삭제 [ID] : 계정 삭제(백업생성)\n";
            help += "• " + libConst.Prefix + "유저롤백 [ID] : 백업본으로 복구\n\n";
            help += "👑 권한 관리\n";
            help += "• " + libConst.Prefix + "관리자임명 [닉네임]\n";
            help += "• " + libConst.Prefix + "관리자해임 [닉네임]\n\n";
            help += "ℹ️ 기타\n";
            help += "• " + libConst.Prefix + "정보 : 서버 버전 및 세션 확인\n";
            help += "━━━━━━━━━━━━━━━";
            return help;
        },

        // [2] 유저용 공용 도움말 (LOL실험실 방)
        getMainHelp: function() {
            var help = "🧪 [LOL실험실 공용 도움말]\n";
            help += "━━━━━━━━━━━━━━━\n";
            help += "• " + libConst.Prefix + "정보 : 시스템 상태 확인\n";
            help += "• " + libConst.Prefix + "도움말 : 현재 보고 있는 안내\n\n";
            help += "📢 가입 및 로그인은 봇과의\n";
            help += "개인 대화(개인톡)에서 진행해주세요!\n";
            help += "━━━━━━━━━━━━━━━";
            return help;
        },

        // [3] 개인톡 도움말 (로그인 상태에 따라 변함)
        getPrivateHelp: function(isLoggedIn) {
            var help = "👤 [개인 전용 도움말]\n";
            help += "━━━━━━━━━━━━━━━\n";
            if (!isLoggedIn) {
                help += "🔓 로그인 전\n";
                help += "• " + libConst.Prefix + "가입 [ID] [PW]\n";
                help += "• " + libConst.Prefix + "로그인 [ID] [PW]\n";
            } else {
                help += "🔒 로그인 중\n";
                help += "• " + libConst.Prefix + "내정보 : 내 스탯 및 전적 확인\n";
                help += "• " + libConst.Prefix + "로그아웃 : 세션 종료\n";
            }
            help += "━━━━━━━━━━━━━━━";
            return help;
        }
    };
}
