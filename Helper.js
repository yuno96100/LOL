const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        // 번호를 명령어로 변환하는 핵심 함수
        getRootCmdByNum: function(room, isGroupChat, isLoggedIn, num) {
            var n = String(num);
            if (room.trim() === libConst.ErrorLogRoom.trim()) {
                return { "1": "데이터", "2": "유저제어", "3": "정보", "4": "도움말" }[n];
            } else if (isGroupChat) {
                return { "1": "가이드", "2": "랭킹", "3": "정보", "4": "도움말" }[n];
            } else {
                if (!isLoggedIn) return { "1": "가입", "2": "로그인", "3": "도움말" }[n];
                else return { "1": "내정보", "2": "인벤토리", "3": "로그아웃", "4": "도움말" }[n];
            }
        },

        getMenu: function(room, isGroupChat, isLoggedIn, category, userSession, DB) {
            var res = "━━━━━━━━━━━━━━━\n";
            var p = libConst.Prefix;
            var isAdminRoom = (room.trim() === libConst.ErrorLogRoom.trim());

            if (isAdminRoom) {
                switch(category) {
                    case "데이터": res += "📊 [관리자 > 데이터]\n━━━━━━━━━━━━━━━\n• 유저: " + DB.getUserList().length + "명\n\n🔙 " + p + "메뉴"; break;
                    case "유저제어": res += "⚙️ [관리자 > 제어]\n━━━━━━━━━━━━━━━\n• " + p + "유저삭제 [닉]\n• " + p + "유저초기화 [닉]\n\n🔙 " + p + "메뉴"; break;
                    case "도움말": res += "🛡️ [관리자 > 도움말]\n━━━━━━━━━━━━━━━\n• 메뉴 열린 상태에서 번호 입력\n• " + p + "정보: 공용방 알림\n\n🔙 " + p + "메뉴"; break;
                    default: res += "🛡️ 관리자 메인 메뉴\n━━━━━━━━━━━━━━━\n1. 데이터 조회\n2. 유저 제어\n3. 정보\n4. 도움말";
                }
            } else if (isGroupChat) {
                switch(category) {
                    case "가이드": res += "📖 [실험실 > 가이드]\n━━━━━━━━━━━━━━━\n• 봇 개인톡에서 가입하세요.\n\n🔙 " + p + "메뉴"; break;
                    case "도움말": res += "❓ [실험실 > 도움말]\n━━━━━━━━━━━━━━━\n• 메뉴 활성화 시 번호 입력 가능\n\n🔙 " + p + "메뉴"; break;
                    default: res += "🧪 메인 메뉴\n━━━━━━━━━━━━━━━\n1. 가이드\n2. 랭킹\n3. 정보\n4. 도움말";
                }
            } else {
                if (!isLoggedIn) {
                    switch(category) {
                        case "도움말": res += "❓ [비회원 > 도움말]\n━━━━━━━━━━━━━━━\n• .1 [ID] [PW] : 가입\n• .2 [ID] [PW] : 로그인\n\n🔙 " + p + "메뉴"; break;
                        default: res += "🔓 비회원 메인 메뉴\n━━━━━━━━━━━━━━━\n1. 가입\n2. 로그인\n3. 도움말";
                    }
                } else {
                    let userName = userSession.info.name;
                    switch(category) {
                        case "내정보": res += "👤 [" + userName + " 정보]\n━━━━━━━━━━━━━━━\n• 레벨: " + userSession.status.level + "\n• 골드: " + userSession.status.money + "\n\n🔙 " + p + "메뉴"; break;
                        case "도움말": res += "❓ [" + userName + " 도움말]\n━━━━━━━━━━━━━━━\n• 메뉴 중 번호로 이동\n• .3 : 로그아웃\n\n🔙 " + p + "메뉴"; break;
                        default: res += "🏠 [" + userName + "] 메인 메뉴\n━━━━━━━━━━━━━━━\n1. 내정보\n2. 인벤토리\n3. 로그아웃\n4. 도움말";
                    }
                }
            }
            res += "\n━━━━━━━━━━━━━━━";
            return res;
        }
    };
}
