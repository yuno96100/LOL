const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        getMenu: function(room, isMainRoom, isLoggedIn, cmd, userData, DB) {
            // 기본 메뉴 로직 생략 (기존 구조 유지)
            if (cmd === "유저조회") {
                return this.getUserListWithStatus(DB);
            }
            // ... (기타 메뉴 로직)
            return "메뉴 예시"; 
        },

        // 유저 목록 및 상태 표시 로직
        getUserListWithStatus: function(DB) {
            var ids = DB.getAllUserIds();
            if (ids.length === 0) return "👤 등록된 유저가 없습니다.";

            var msg = "👥 [유저 목록 및 상태]\n" + "━".repeat(12) + "\n";
            global.tempUserList = ids; // 선택을 위해 전역에 저장

            for (var i = 0; i < ids.length; i++) {
                var u = DB.readUser(ids[i]);
                if (!u) continue;

                // 접속 여부 확인 (세션에 데이터가 있는지)
                var isOnline = false;
                for (var s in global.sessions) {
                    if (global.sessions[s].data && global.sessions[s].data.info.id === ids[i]) {
                        isOnline = true;
                        break;
                    }
                }

                var statusIcon = isOnline ? "🟢" : "⚪";
                var statusText = isOnline ? "접속중" : "오프라인";
                
                msg += (i + 1) + ". " + statusIcon + " [" + u.info.name + "]\n";
                msg += "   ㄴ Lv." + u.status.level + " | " + u.status.money + "G | " + statusText + "\n";
            }
            msg += "━".repeat(12) + "\n🔍 상세 정보를 보려면 '번호'를 입력하세요.";
            return msg;
        },

        getRootCmdByNum: function(room, isAdminRoom, isMainRoom, isLoggedIn, num) {
            // 기존 숫자 매핑 로직 (생략)
            return "유저조회"; // 예시
        }
    };
}
