const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        // 방 성격과 로그인 상태에 따른 번호 매핑
        getRootCmdByNum: function(room, isGroupChat, isLoggedIn, num) {
            var n = String(num).trim();
            if (room.trim() === libConst.ErrorLogRoom.trim()) {
                return { "1": "데이터", "2": "유저제어", "3": "정보", "4": "도움말" }[n];
            } else if (isGroupChat) {
                return { "1": "가이드", "2": "랭킹", "3": "정보", "4": "도움말" }[n];
            } else {
                return isLoggedIn ? { "1": "내정보", "2": "인벤토리", "3": "로그아웃", "4": "도움말" }[n]
                                  : { "1": "가입", "2": "로그인", "3": "도움말" }[n];
            }
        },

        getMenu: function(room, isGroupChat, isLoggedIn, category, userSession, DB) {
            var res = "━━━━━━━━━━━━━━━\n";
            var p = libConst.Prefix;
            
            if (category) {
                res += "📍 [" + category + "]\n• 상세 메뉴가 활성화되었습니다.\n\n🔙 " + p + "메뉴";
            } else {
                if (room.trim() === libConst.ErrorLogRoom.trim()) {
                    res += "🛡️ 관리자 메인 메뉴\n━━━━━━━━━━━━━━━\n1. 데이터 조회\n2. 유저 제어\n3. 정보\n4. 도움말";
                } else if (isGroupChat) {
                    res += "🧪 실험실 메인 메뉴\n━━━━━━━━━━━━━━━\n1. 가이드\n2. 랭킹\n3. 정보\n4. 도움말";
                } else if (!isLoggedIn) {
                    res += "🔓 비회원 메인 메뉴\n━━━━━━━━━━━━━━━\n1. 가입\n2. 로그인\n3. 도움말";
                } else {
                    // 유저 가입 시 닉네임 반영
                    res += "🏠 [" + userSession.info.name + "] 메인 메뉴\n━━━━━━━━━━━━━━━\n1. 내정보\n2. 인벤토리\n3. 로그아웃\n4. 도움말";
                }
                res += "\n\n💡 번호(숫자)만 입력하여 이동 가능";
            }
            res += "\n━━━━━━━━━━━━━━━";
            return res;
        }
    };
}
