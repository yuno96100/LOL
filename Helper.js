const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        getRootCmdByNum: function(room, isAdminRoom, isMainRoom, isLoggedIn, num) {
            var n = String(num).trim();
            if (isAdminRoom) return { "1": "유저조회", "2": "삭제", "3": "초기화", "4": "복구", "5": "정보" }[n];
            if (isMainRoom) return { "1": "가이드", "2": "랭킹", "3": "정보", "4": "도움말" }[n];
            return isLoggedIn ? { "1": "내정보", "2": "인벤토리", "3": "로그아웃", "4": "도움말" }[n]
                              : { "1": "가입", "2": "로그인", "3": "도움말" }[n];
        },
        getMenu: function(room, isMainRoom, isLoggedIn, category, userSession, DB) {
            var res = "━━━━━━━━━━━━━━━\n";
            var isAdmin = (room.trim() === libConst.ErrorLogRoom.trim());
            const GlobalWarning = "⚠️ 개인톡과 단체톡의 카카오톡 닉네임이 같아야 같은 유저로 인식합니다.";
            const NameUsage = "💡 가입 시 닉네임은 내 정보에 출력되는 닉네임입니다.";

            if (!category) {
                if (isAdmin) res += "🛡️ 관리자 메뉴\n1. 유저조회\n2. 삭제\n3. 초기화\n4. 복구\n5. 정보";
                else if (!isLoggedIn) res += "🔓 비회원 메뉴\n1. 가입하기\n2. 로그인하기\n3. 도움말\n\n" + GlobalWarning;
                else res += "🏠 [" + userSession.info.name + "]님 메뉴\n1. 내정보\n2. 인벤토리\n3. 로그아웃\n4. 도움말";
            } else if (category === "도움말") {
                res += "❓ [ 도움말 ]\n1️⃣ " + GlobalWarning + "\n2️⃣ " + NameUsage;
            } else if (category === "내정보") {
                res += "👤 [ 내 정보 ]\n• 닉네임: " + userSession.info.name + "\n• 레벨: " + userSession.status.level + "\n• 보유자금: " + userSession.status.money + "G";
            } else { res += "📍 [" + category + "] 메뉴입니다."; }
            res += "\n━━━━━━━━━━━━━━━";
            return res;
        }
    };
}
