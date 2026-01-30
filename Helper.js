var libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        /* [SECTION 1] 메뉴 UI 렌더링 */
        getMenu: function(room, isMain, isAdmin, isLoggedIn, cmd, userData, DB) {
            // A. 하위 정보 페이지 (목록/내정보/상점)
            if (cmd === "유저조회") return this._renderUserList(DB);
            if (cmd === "내정보") return this._renderMyInfo(userData);
            if (cmd === "상점") return "🛒 [ 상점 ]\n" + "━".repeat(12) + "\n🚧 현재 준비 중인 페이지입니다.\n" + "━".repeat(12);

            // B. 메인 메뉴판 구성
            var title = isAdmin ? "🛠️ 관리자" : (isMain ? "🏰 메인" : "👤 개인설정");
            var list = this._getMenuOptions(isMain, isAdmin, isLoggedIn);
            
            return "┏ " + title + " ┓\n" + "━".repeat(12) + "\n" + list + "\n" + "━".repeat(12) + "\n💬 번호 입력 ('취소' 시 종료)";
        },

        /* [SECTION 2] 내부 서브 함수 */
        _getMenuOptions: function(isMain, isAdmin, isLoggedIn) {
            if (isAdmin) return "1.유저목록\n2.삭제\n3.초기화\n4.복구";
            if (!isMain) return isLoggedIn ? "1.내정보\n2.로그아웃" : "1.가입\n2.로그인";
            return isLoggedIn ? "1.내정보\n2.상점\n3.유저조회" : "🔔 개인톡에서 가입/로그인 후 이용 가능";
        },

        _renderUserList: function(DB) {
            var ids = DB.getAllUserIds();
            if (ids.length === 0) return "👤 등록된 유저가 없습니다.";
            
            var msg = "👥 [유저 목록]\n" + "━".repeat(12) + "\n";
            global.tempUserList = ids; // 번호 선택을 위해 전역 저장
            
            for (var i = 0; i < ids.length; i++) {
                // 세션 데이터를 확인하여 온라인 여부 표시
                var isOn = !!(global.SESSIONS_V4 && global.SESSIONS_V4[ids[i]] && global.SESSIONS_V4[ids[i]].data);
                msg += (i + 1) + ". " + (isOn ? "🟢" : "⚪") + " " + ids[i] + "\n";
            }
            return msg + "━".repeat(12) + "\n🔍 상세 정보를 볼 유저 번호를 입력하세요.\n(종료하려면 '취소' 입력)";
        },

        _renderMyInfo: function(userData) {
            if (!userData) return "❌ 로그인 정보가 없습니다.";
            return "👤 [ 내 정보 ]\n" + "━".repeat(12) + "\n• 이름: " + userData.info.name + "\n• 레벨: " + userData.status.level + "\n• 보유금: " + userData.status.money + "G\n" + "━".repeat(12);
        },

        /* [SECTION 3] 번호 매핑 */
        getRootCmdByNum: function(isAdmin, isMain, isLoggedIn, num) {
            if (isAdmin) return { "1": "유저조회", "2": "삭제", "3": "초기화", "4": "복구" }[num] || null;
            if (!isMain) return isLoggedIn ? { "1": "내정보", "2": "로그아웃" }[num] : { "1": "가입", "2": "로그인" }[num];
            return isLoggedIn ? { "1": "내정보", "2": "상점", "3": "유저조회" }[num] : null;
        }
    };
}
