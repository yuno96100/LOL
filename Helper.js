const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        getMenu: function(room, isMainRoom, isAdminRoom, isLoggedIn, cmd, userData, DB) {
            if (cmd === "유저조회") return this.getUserListWithStatus(DB);
            if (cmd === "상점") return "🛒 [ 상점 ]\n" + "━".repeat(12) + "\n🚧 현재 준비 중인 미구현 페이지입니다.\n" + "━".repeat(12);
            if (cmd === "내정보") {
                if (!userData) return "❌ 로그인 정보가 없습니다.";
                return "👤 [ 내 정보 ]\n" + "━".repeat(12) + "\n• 닉네임: " + userData.info.name + "\n• 레벨: " + userData.status.level + "\n• 보유금: " + userData.status.money + "G\n" + "━".repeat(12);
            }

            let title = isAdminRoom ? "🛠️ 관리자 시스템" : (isMainRoom ? "🏰 " + libConst.MainRoomName : "👤 개인 설정");
            let content = "━".repeat(12) + "\n";
            if (isAdminRoom) {
                content += "1. 유저목록\n2. 유저삭제\n3. 데이터초기화\n4. 데이터복구";
            } else if (!isMainRoom) {
                content += !isLoggedIn ? "1. 가입하기\n2. 로그인" : "1. 내정보\n2. 로그아웃";
            } else {
                content += !isLoggedIn ? "🔔 로그인 후 이용 가능" : "1. 내정보\n2. 상점\n3. 유저조회";
            }
            return "┏ " + title + " ┓\n" + content + "\n" + "━".repeat(12) + "\n💬 번호 입력 ('취소' 시 종료)";
        },

        getUserListWithStatus: function(DB) {
            let ids = DB.getAllUserIds();
            if (ids.length === 0) return "👤 등록된 유저가 없습니다.";
            let msg = "👥 [유저 목록]\n" + "━".repeat(12) + "\n";
            global.tempUserList = ids;
            for (let i = 0; i < ids.length; i++) {
                let isOnline = !!(global.sessions[ids[i]] && global.sessions[ids[i]].data);
                msg += (i + 1) + ". " + (isOnline ? "🟢" : "⚪") + " " + ids[i] + "\n";
            }
            msg += "━".repeat(12) + "\n🔍 상세 정보: '번호' 입력 ('취소'로 종료)";
            return msg;
        },

        getRootCmdByNum: function(isAdminRoom, isMainRoom, isLoggedIn, num) {
            if (isAdminRoom) return { "1": "유저조회", "2": "삭제", "3": "초기화", "4": "복구" }[num] || null;
            if (!isMainRoom) {
                if (!isLoggedIn) return { "1": "가입", "2": "로그인" }[num] || null;
                return { "1": "내정보", "2": "로그아웃" }[num] || null;
            }
            if (isLoggedIn) return { "1": "내정보", "2": "상점", "3": "유저조회" }[num] || null;
            return null;
        }
    };
}
