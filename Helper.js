const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        getMenu: function(room, isMainRoom, isLoggedIn, cmd, userData, DB) {
            if (cmd === "유저조회") {
                return this.getUserListWithStatus(DB);
            }
            
            var m = "🎮 [ " + libConst.MainRoomName + " 시스템 ]\n";
            m += "━".repeat(12) + "\n";
            if (!isLoggedIn) {
                m += "1. 가입하기\n2. 로그인\n3. 유저조회";
            } else {
                m += "1. 내정보\n2. 상점\n3. 유저조회\n4. 로그아웃";
            }
            m += "\n" + "━".repeat(12) + "\n💬 번호를 입력해주세요.";
            return m;
        },

        getUserListWithStatus: function(DB) {
            var ids = DB.getAllUserIds();
            if (ids.length === 0) return "👤 등록된 유저가 없습니다.";

            var msg = "👥 [유저 목록 및 상태]\n" + "━".repeat(12) + "\n";
            global.tempUserList = ids; // 번호 선택 매칭을 위해 캐시 저장

            for (var i = 0; i < ids.length; i++) {
                var u = DB.readUser(ids[i]);
                if (!u) continue;

                var isOnline = false;
                for (var s in global.sessions) {
                    if (global.sessions[s].data && global.sessions[s].data.info.id === ids[i]) {
                        isOnline = true;
                        break;
                    }
                }

                var icon = isOnline ? "🟢" : "⚪";
                msg += (i + 1) + ". " + icon + " [" + u.info.name + "]\n";
                msg += "   ㄴ Lv." + u.status.level + " | " + u.status.money + "G\n";
            }
            msg += "━".repeat(12) + "\n🔍 상세 정보를 보려면 '번호'를 입력하세요.";
            return msg;
        },

        getRootCmdByNum: function(room, isAdminRoom, isMainRoom, isLoggedIn, num) {
            if (!isLoggedIn) {
                if (num == "1") return "가입";
                if (num == "2") return "로그인";
                if (num == "3") return "유저조회";
            } else {
                if (num == "1") return "내정보";
                if (num == "2") return "상점";
                if (num == "3") return "유저조회";
                if (num == "4") return "로그아웃";
            }
            return null;
        }
    };
}
