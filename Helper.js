const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        getRootCmdByNum: function(room, isMainRoom, isLoggedIn, num) {
            var n = String(num).trim();
            if (room.trim() === libConst.ErrorLogRoom.trim()) {
                return { "1": "데이터", "2": "유저제어", "3": "정보", "4": "도움말" }[n];
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

            if (isAdmin && category === "데이터") {
                res += "📊 [ 관리자 > 데이터 조회 ]\n━━━━━━━━━━━━━━━\n";
                var userList = DB.getUserList(); // 이제 정상 작동함
                if (userList.length === 0) res += "등록된 유저가 없습니다.";
                else {
                    userList.forEach(function(f, i) {
                        var id = f.replace(".json", "");
                        var ud = DB.readUser(id); // 이제 에러 안 남
                        if (ud) {
                            res += (i + 1) + ". " + ud.info.name + "\n";
                            res += "   - ID: " + id + "\n";
                            res += "   - 가입닉넴: " + (ud.info.originalNickname || "기록없음") + "\n";
                            res += "   - 보유골드: " + ud.status.money + "G\n";
                        }
                    });
                }
                res += "\n🔙 " + p + "메뉴";
            } else if (isAdmin && category === "유저제어") {
                res += "🛠️ [ 유저 제어 시스템 ]\n━━━━━━━━━━━━━━━\n";
                res += "1. " + p + "삭제 [ID]\n2. " + p + "초기화 [ID]\n3. " + p + "복구 [ID]\n";
                res += "━━━━━━━━━━━━━━━\n🔙 " + p + "메뉴";
            } else if (!category) {
                if (isAdmin) res += "🛡️ 관리자 전용 메뉴\n━━━━━━━━━━━━━━━\n1. 데이터 조회\n2. 유저 제어\n3. 정보\n4. 도움말";
                else if (isMainRoom) res += "🧪 [소환사의협곡] 메뉴\n━━━━━━━━━━━━━━━\n1. 가이드\n2. 랭킹\n3. 정보\n4. 도움말";
                else if (!isLoggedIn) res += "🔓 비회원 메뉴\n━━━━━━━━━━━━━━━\n1. 가입\n2. 로그인\n3. 도움말";
                else res += "🏠 [" + userSession.info.name + "] 메뉴\n━━━━━━━━━━━━━━━\n1. 내정보\n2. 인벤토리\n3. 로그아웃\n4. 도움말";
            } else {
                res += "📍 [" + category + "] 메뉴\n\n🔙 " + p + "메뉴";
            }
            res += "\n━━━━━━━━━━━━━━━";
            return res;
        }
    };
}
