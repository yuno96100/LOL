const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        // 모든 상황에서의 번호 -> 명령어 매핑
        getRootCmdByNum: function(room, isGroupChat, isLoggedIn, num) {
            var n = String(num).trim();
            // 1. 관리자 방 (게임봇)
            if (room.trim() === libConst.ErrorLogRoom.trim()) {
                return { "1": "데이터", "2": "유저제어", "3": "정보", "4": "도움말" }[n];
            } 
            // 2. 공용 방 (LOL실험실)
            else if (isGroupChat) {
                return { "1": "가이드", "2": "랭킹", "3": "정보", "4": "도움말" }[n];
            } 
            // 3. 개인톡
            else {
                if (!isLoggedIn) return { "1": "가입", "2": "로그인", "3": "도움말" }[n];
                else return { "1": "내정보", "2": "인벤토리", "3": "로그아웃", "4": "도움말" }[n];
            }
        },

        getMenu: function(room, isGroupChat, isLoggedIn, category, userSession, DB) {
            var res = "━━━━━━━━━━━━━━━\n";
            var p = libConst.Prefix;
            var isAdmin = (room.trim() === libConst.ErrorLogRoom.trim());

            if (category) {
                // [상세 카테고리 화면]
                res += "📍 [" + category + "]\n";
                if (category === "데이터") res += "• 등록 유저: " + DB.getUserList().length + "명";
                else if (category === "가이드") res += "• 개인톡에서 '" + p + "가입'을 입력하세요.";
                else if (category === "도움말") res += "• 번호만 입력하여 메뉴 이동이 가능합니다.";
                else res += "• 세부 내용은 구현 중입니다.";
                
                res += "\n\n🔙 " + p + "메뉴 (돌아가기)";
            } else {
                // [메인 메뉴 화면]
                if (isAdmin) {
                    res += "🛡️ 관리자 메인 메뉴\n━━━━━━━━━━━━━━━\n1. 데이터 조회\n2. 유저 제어\n3. 정보\n4. 도움말";
                } else if (isGroupChat) {
                    res += "🧪 메인 메뉴\n━━━━━━━━━━━━━━━\n1. 가이드\n2. 랭킹\n3. 정보\n4. 도움말";
                } else {
                    if (!isLoggedIn) {
                        res += "🔓 비회원 메인 메뉴\n━━━━━━━━━━━━━━━\n1. 가입\n2. 로그인\n3. 도움말";
                    } else {
                        res += "🏠 [" + userSession.info.name + "] 메인 메뉴\n━━━━━━━━━━━━━━━\n1. 내정보\n2. 인벤토리\n3. 로그아웃\n4. 도움말";
                    }
                }
                res += "\n\n💡 번호만 입력해서 이동 가능";
            }
            res += "\n━━━━━━━━━━━━━━━";
            return res;
        }
    };
}
