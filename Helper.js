const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        getRootCmdByNum: function(room, isAdminRoom, isMainRoom, isLoggedIn, num) {
            var n = String(num).trim();
            if (isAdminRoom) {
                return { "1": "유저조회", "2": "삭제", "3": "초기화", "4": "복구", "5": "정보" }[n];
            } else if (isMainRoom) {
                return { "1": "가이드", "2": "랭킹", "3": "정보", "4": "도움말" }[n];
            } else {
                return isLoggedIn ? { "1": "내정보", "2": "인벤토리", "3": "로그아웃", "4": "도움말" }[n]
                                  : { "1": "가입", "2": "로그인", "3": "도움말" }[n];
            }
        },

        getMenu: function(room, isMainRoom, isLoggedIn, category, userSession, DB) {
            var res = "━━━━━━━━━━━━━━━\n";
            var isAdmin = (room.trim() === libConst.ErrorLogRoom.trim());

            if (isAdmin && category === "유저조회") {
                res += "👥 [ 전체 유저 목록 ]\n";
                var list = DB.getUserList();
                list.forEach((id, i) => { res += (i+1) + ". " + id + "\n"; });
            } else if (!category) {
                if (isAdmin) {
                    res += "🛡️ 관리자 컨트롤 센터\n━━━━━━━━━━━━━━━\n1. 유저 상세조회\n2. 유저 삭제\n3. 유저 초기화\n4. 유저 복구\n5. 시스템 정보";
                } else if (!isLoggedIn) {
                    res += "🔓 비회원 메뉴\n━━━━━━━━━━━━━━━\n1. 가입하기\n2. 로그인하기\n3. 도움말";
                } else {
                    res += "🏠 [" + userSession.info.name + "]님 메뉴\n━━━━━━━━━━━━━━━\n1. 내정보\n2. 인벤토리\n3. 로그아웃\n4. 도움말";
                }
            } else {
                res += "📍 [" + category + "] 메뉴\n메뉴를 다시 보려면 '" + libConst.Prefix + "메뉴'";
            }
            res += "\n━━━━━━━━━━━━━━━";
            return res;
        }
    };
}
