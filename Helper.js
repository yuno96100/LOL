const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        getRootCmdByNum: function(room, isGroupChat, isLoggedIn, num) {
            var n = String(num).trim();
            // 관리자 방 판별
            if (room.trim() === libConst.ErrorLogRoom.trim()) {
                return { "1": "데이터", "2": "유저제어", "3": "정보", "4": "도움말" }[n];
            } 
            // 그룹톡(소환사의협곡) 판별
            else if (room.trim() === libConst.MainRoomName.trim()) {
                return { "1": "가이드", "2": "랭킹", "3": "정보", "4": "도움말" }[n];
            } 
            // 개인톡
            else {
                return isLoggedIn ? { "1": "내정보", "2": "인벤토리", "3": "로그아웃", "4": "도움말" }[n]
                                  : { "1": "가입", "2": "로그인", "3": "도움말" }[n];
            }
        },

        getMenu: function(room, isGroupChat, isLoggedIn, category, userSession, DB) {
            var res = "━━━━━━━━━━━━━━━\n";
            var p = libConst.Prefix;
            var isAdmin = (room.trim() === libConst.ErrorLogRoom.trim());
            var isMainRoom = (room.trim() === libConst.MainRoomName.trim());

            if (category === "도움말") {
                res += "❓ [ 이용 주의사항 ]\n━━━━━━━━━━━━━━━\n";
                res += "1️⃣ 개인톡/그룹톡 닉네임이 같아야 데이터가 연동됩니다.\n";
                res += "2️⃣ 닉네임 변경 시 반드시 로그아웃 후 다시 진행하세요.\n";
                res += "3️⃣ 문의사항은 관리자에게 문의바랍니다.\n\n🔙 " + p + "메뉴";
            } else if (isAdmin && category === "데이터") {
                res += "📊 [ 관리자 > 유저 데이터 조회 ]\n━━━━━━━━━━━━━━━\n";
                var userList = DB.getUserList();
                if (userList.length === 0) res += "등록된 유저가 없습니다.";
                else {
                    userList.forEach(function(f, i) {
                        var ud = DB.readUser(f.replace(".json", ""));
                        res += (i + 1) + ". " + ud.info.name + "\n";
                        res += "   - 가입닉네임: " + (ud.info.originalNickname || "기록없음") + "\n";
                        res += "   - 보유골드: " + ud.status.money + "G\n";
                    });
                }
                res += "\n🔙 " + p + "메뉴";
            } else if (isAdmin && category === "유저제어") {
                res += "🛠️ [ 유저 제어 시스템 ]\n━━━━━━━━━━━━━━━\n";
                res += "1. " + p + "삭제 [ID] : 삭제 직전 상태로 복구 가능\n";
                res += "2. " + p + "초기화 [ID] : 복구 불가능 (완전 초기화)\n";
                res += "3. " + p + "복구 [ID] : 백업 파일 되살리기\n";
                res += "━━━━━━━━━━━━━━━\n🔙 " + p + "메뉴";
            } else if (!category) {
                if (isAdmin) res += "🛡️ 관리자 전용 메뉴\n━━━━━━━━━━━━━━━\n1. 데이터 조회\n2. 유저 제어\n3. 정보\n4. 도움말";
                else if (isMainRoom) res += "🧪 [소환사의협곡] 메뉴\n━━━━━━━━━━━━━━━\n1. 가이드\n2. 랭킹\n3. 정보\n4. 도움말";
                else if (!isLoggedIn) res += "🔓 비회원 메인 메뉴\n━━━━━━━━━━━━━━━\n1. 가입\n2. 로그인\n3. 도움말";
                else res += "🏠 [" + userSession.info.name + "] 메인 메뉴\n━━━━━━━━━━━━━━━\n1. 내정보\n2. 인벤토리\n3. 로그아웃\n4. 도움말";
                res += "\n\n💡 번호(숫자)만 입력하여 이동 가능";
            } else {
                res += "📍 [" + category + "] 메뉴 상세 화면\n\n🔙 " + p + "메뉴";
            }
            res += "\n━━━━━━━━━━━━━━━";
            return res;
        }
    };
}
