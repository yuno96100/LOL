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

            if (isAdmin && category === "유저조회") {
                res += "👥 [ 전체 유저 목록 ]\n";
                var list = DB.getUserList();
                if (list.length === 0) res += "가입된 유저가 없습니다.";
                else list.forEach((id, i) => { res += (i+1) + ". " + id + "\n"; });
            } else if (!category) {
                if (isAdmin) res += "🛡️ 관리자 메뉴\n1. 유저조회\n2. 삭제\n3. 초기화\n4. 복구\n5. 정보";
                else if (!isLoggedIn) res += "🔓 비회원 메뉴\n1. 가입하기\n2. 로그인하기\n3. 도움말";
                else res += "🏠 [" + userSession.info.name + "]님 메뉴\n1. 내정보\n2. 인벤토리\n3. 로그아웃\n4. 도움말";
            } else if (category === "내정보") {
                // ID 정보를 명시적으로 노출하여 유저의 혼란 방지
                res += "👤 [ 내 정보 ]\n• 닉네임(표시용): " + userSession.info.name + "\n• 로그인 ID: " + userSession.info.id + "\n• 보유금: " + userSession.status.money + "G";
            } else {
                res += "📍 [" + category + "] 정보를 확인 중입니다.";
            }
            res += "\n━━━━━━━━━━━━━━━";
            return res;
        }
    };
}
