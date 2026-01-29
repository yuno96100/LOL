const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        // 번호를 실제 명령어(카테고리)로 변환
        getCommandByNum: function(room, isGroupChat, isLoggedIn, num) {
            if (room.trim() === libConst.ErrorLogRoom.trim()) {
                const adminMap = { "1": "데이터", "2": "유저제어", "3": "정보", "4": "도움말" };
                return adminMap[num];
            } else if (isGroupChat) {
                const groupMap = { "1": "가이드", "2": "랭킹", "3": "정보", "4": "도움말" };
                return groupMap[num];
            } else {
                if (!isLoggedIn) {
                    const guestMap = { "1": "가입", "2": "로그인", "3": "도움말" };
                    return guestMap[num];
                } else {
                    const userMap = { "1": "내정보", "2": "인벤토리", "3": "로그아웃", "4": "도움말" };
                    return userMap[num];
                }
            }
        },

        getMenu: function(room, isGroupChat, isLoggedIn, category, userSession, DB) {
            var res = "━━━━━━━━━━━━━━━\n";
            var p = libConst.Prefix;

            if (room.trim() === libConst.ErrorLogRoom.trim()) {
                switch(category) {
                    case "데이터": res += "📊 [관리자 > 데이터]\n━━━━━━━━━━━━━━━\n• 유저: " + DB.getUserList().length + "명\n\n🔙 " + p + "메뉴"; break;
                    case "유저제어": res += "⚙️ [관리자 > 제어]\n━━━━━━━━━━━━━━━\n• " + p + "유저삭제 [닉]\n• " + p + "유저초기화 [닉]\n\n🔙 " + p + "메뉴"; break;
                    case "도움말": res += "🛡️ [관리자 > 도움말]\n━━━━━━━━━━━━━━━\n• ." + "1 ~ ." + "4 번호로 즉시 실행 가능\n• " + p + "정보: 공용방 패치 알림\n\n🔙 " + p + "메뉴"; break;
                    default: res += "🛡️ 관리자 메인 메뉴\n━━━━━━━━━━━━━━━\n1. 데이터 조회\n2. 유저 제어\n3. 정보\n4. 도움말";
                }
            } else if (isGroupChat) {
                switch(category) {
                    case "가이드": res += "📖 [실험실 > 가이드]\n━━━━━━━━━━━━━━━\n• 봇 개인톡에서 가입/로그인 하세요.\n\n🔙 " + p + "메뉴"; break;
                    case "도움말": res += "❓ [실험실 > 도움말]\n━━━━━━━━━━━━━━━\n• ." + "1 ~ ." + "4 번호로 메뉴 이동\n• 플레이는 개인톡에서!\n\n🔙 " + p + "메뉴"; break;
                    default: res += "🧪 메인 메뉴\n━━━━━━━━━━━━━━━\n1. 가이드\n2. 랭킹\n3. 정보\n4. 도움말";
                }
            } else {
                if (!isLoggedIn) {
                    switch(category) {
                        case "도움말": res += "❓ [비회원 > 도움말]\n━━━━━━━━━━━━━━━\n• ." + "1 [닉] [비번]: 가입\n• ." + "2 [닉] [비번]: 로그인\n\n🔙 " + p + "메뉴"; break;
                        default: res += "🔓 비회원 메뉴\n━━━━━━━━━━━━━━━\n1. 가입\n2. 로그인\n3. 도움말";
                    }
                } else {
                    let userName = userSession.info.name;
                    switch(category) {
                        case "내정보": res += "👤 [" + userName + " 정보]\n━━━━━━━━━━━━━━━\n• 레벨: " + userSession.status.level + "\n• 골드: " + userSession.status.money + "\n\n🔙 " + p + "메뉴"; break;
                        case "도움말": res += "❓ [" + userName + " 도움말]\n━━━━━━━━━━━━━━━\n• ." + "1 ~ ." + "4 번호로 명령 실행\n• ." + "3: 즉시 로그아웃\n\n🔙 " + p + "메뉴"; break;
                        default: res += "🏠 [" + userName + "] 메인 메뉴\n━━━━━━━━━━━━━━━\n1. 내정보\n2. 인벤토리\n3. 로그아웃\n4. 도움말";
                    }
                }
            }
            res += "\n━━━━━━━━━━━━━━━";
            return res;
        }
    };
}
