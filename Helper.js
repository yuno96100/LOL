/* ============================================================
   [SECTION] UI 렌더링 및 명령어 매핑
   ============================================================ */
function bridge() {
    return {
        getMenu: function(room, isMain, isAdmin, isLoggedIn, cmd, userData, DB) {
            if (cmd === "유저조회") return this._renderUserList(DB);
            if (cmd === "내정보") return "👤 [내 정보]\n• 이름: " + userData.info.name + "\n• 골드: " + userData.status.money + "G";
            
            var title = isAdmin ? "🛠️ 관리자" : (isMain ? "🏰 마을 메인" : "👤 개인 메뉴");
            var list = "";
            
            if (isAdmin) list = "1.유저조회\n2.삭제\n3.초기화";
            else if (!isMain) list = isLoggedIn ? "1.내정보\n2.로그아웃" : "1.가입\n2.로그인";
            else list = isLoggedIn ? "1.내정보\n2.유저조회" : "🔔 개인톡에서 로그인 후 이용 가능";

            return "┏ " + title + " ┓\n" + "━".repeat(12) + "\n" + list + "\n" + "━".repeat(12) + "\n💬 번호를 입력하세요.";
        },

        _renderUserList: function(DB) {
            if (!DB) return "❌ 데이터베이스 오류";
            var ids = DB.getAllUserIds();
            if (ids.length === 0) return "👤 등록된 유저가 없습니다.";
            global.tempUserList = ids;
            return "👥 [유저 목록]\n" + ids.map(function(v, i){ return (i+1) + ". " + v; }).join("\n") + "\n\n🔍 번호 입력 시 상세 정보 (취소: '취소')";
        },

        getRootCmdByNum: function(isAdmin, isMain, isLoggedIn, num) {
            if (isAdmin) return {"1":"유저조회", "2":"삭제", "3":"초기화"}[num];
            if (!isMain) return isLoggedIn ? {"1":"내정보", "2":"로그아웃"}[num] : {"1":"가입", "2":"로그인"}[num];
            return isLoggedIn ? {"1":"내정보", "2":"유저조회"}[num] : null;
        }
    };
}
