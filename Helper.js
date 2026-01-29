const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        getRootCmdByNum: function(room, isGroupChat, isLoggedIn, num) {
            var n = String(num).trim();
            if (room.trim() === libConst.ErrorLogRoom.trim()) return { "1": "데이터", "2": "유저제어", "3": "정보", "4": "도움말" }[n];
            if (isGroupChat) return { "1": "가이드", "2": "랭킹", "3": "정보", "4": "도움말" }[n];
            return isLoggedIn ? { "1": "내정보", "2": "인벤토리", "3": "로그아웃", "4": "도움말" }[n]
                              : { "1": "가입", "2": "로그인", "3": "도움말" }[n];
        },

        getMenu: function(room, isGroupChat, isLoggedIn, category, userSession, DB) {
            var res = "━━━━━━━━━━━━━━━\n";
            var p = libConst.Prefix;
            
            if (category === "도움말") {
                res += "❓ [ 이용 주의사항 ]\n━━━━━━━━━━━━━━━\n";
                res += "1️⃣ 개인톡/그룹톡 닉네임이 같아야 데이터가 연동됩니다.\n";
                res += "2️⃣ 닉네임 변경 시 반드시 로그아웃 후 다시 진행하세요.\n";
                res += "3️⃣ 문의사항은 관리자에게 문의바랍니다.\n\n🔙 " + p + "메뉴";
            } else if (!category) {
                if (isGroupChat) res += "🧪 실험실 메인 메뉴\n━━━━━━━━━━━━━━━\n1. 가이드\n2. 랭킹\n3. 정보\n4. 도움말";
                else if (!isLoggedIn) res += "🔓 비회원 메인 메뉴\n━━━━━━━━━━━━━━━\n1. 가입\n2. 로그인\n3. 도움말";
                else res += "🏠 [" + userSession.info.name + "] 메인 메뉴\n━━━━━━━━━━━━━━━\n1. 내정보\n2. 인벤토리\n3. 로그아웃\n4. 도움말";
                
                res += "\n\n📢 **닉네임 불일치 시 로그인 불가**";
            } else {
                res += "📍 [" + category + "] 메뉴\n\n🔙 " + p + "메뉴";
            }
            res += "\n━━━━━━━━━━━━━━━";
            return res;
        }
    };
}
