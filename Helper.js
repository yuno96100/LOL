const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        getRootCmdByNum: function(room, isMainRoom, isLoggedIn, num) {
            var n = String(num).trim();
            if (room.trim() === libConst.ErrorLogRoom.trim()) {
                return { "1": "유저조회", "2": "유저제어", "3": "정보", "4": "도움말" }[n];
            } else if (isMainRoom) {
                return { "1": "가이드", "2": "랭킹", "3": "정보", "4": "도움말" }[n];
            } else {
                return isLoggedIn ? { "1": "내정보", "2": "인벤토리", "3": "로그아웃", "4": "도움말" }[n]
                                  : { "1": "가입", "2": "로그인", "3": "도움말" }[n];
            }
        },

        getMenu: function(room, isMainRoom, isLoggedIn, category, userSession, DB) {
            var res = "━━━━━━━━━━━━━━━\n";
            var p = libConst.Prefix;
            var isAdmin = (room.trim() === libConst.ErrorLogRoom.trim());

            if (isAdmin && category === "유저조회") {
                res += "👥 [ 전체 가입 유저 목록 ]\n━━━━━━━━━━━━━━━\n";
                var userIds = DB.getUserList();
                if (userIds.length === 0) res += "가입된 유저가 없습니다.";
                else {
                    userIds.forEach(function(id, i) {
                        var ud = DB.readUser(id);
                        if (ud) res += (i + 1) + ". " + ud.info.name + " (" + id + ")\n";
                    });
                    res += "\n🔍 상세 정보 확인:\n" + p + "유저조회 [ID]";
                }
                res += "\n🔙 " + p + "메뉴";
            } else if (isAdmin && category === "유저제어") {
                res += "🛠️ [ 유저 제어 시스템 ]\n━━━━━━━━━━━━━━━\n";
                res += "1. " + p + "삭제 [ID]\n2. " + p + "초기화 [ID]\n3. " + p + "복구 [ID]\n";
                res += "━━━━━━━━━━━━━━━\n🔙 " + p + "메뉴";
            } else if (category === "도움말") {
                res += "❓ [ 이용 주의사항 ]\n━━━━━━━━━━━━━━━\n1️⃣ 개인톡/그룹톡 닉네임 일치 필수\n2️⃣ 닉네임 변경 시 재로그인 필요\n3️⃣ 문의는 관리자에게 연락바랍니다.\n\n🔙 " + p + "메뉴";
            } else if (!category) {
                if (isAdmin) res += "🛡️ 관리자 메인 메뉴\n━━━━━━━━━━━━━━━\n1. 유저 조회\n2. 유저 제어\n3. 정보\n4. 도움말";
                else if (isMainRoom) res += "🧪 [소환사의협곡] 메뉴\n━━━━━━━━━━━━━━━\n1. 가이드\n2. 랭킹\n3. 정보\n4. 도움말";
                else if (!isLoggedIn) res += "🔓 비회원 메뉴\n━━━━━━━━━━━━━━━\n1. 가입\n2. 로그인\n3. 도움말";
                else res += "🏠 [" + userSession.info.name + "] 메뉴\n━━━━━━━━━━━━━━━\n1. 내정보\n2. 인벤토리\n3. 로그아웃\n4. 도움말";
                res += "\n\n💡 번호만 입력하여 이동 가능";
            } else {
                res += "📍 [" + category + "] 메뉴 상세\n\n🔙 " + p + "메뉴";
            }
            res += "\n━━━━━━━━━━━━━━━";
            return res;
        }
    };
}
