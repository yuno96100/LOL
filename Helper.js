var libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        /* [SECTION 1] 메뉴 UI 렌더링 */
        getMenu: function(room, isMain, isAdmin, isLoggedIn, cmd, userData, DB) {
            // A. 하위 정보 페이지 (관리자 전용 유저조회 포함)
            if (cmd === "유저조회" && isAdmin) return this._renderUserList(DB); 
            if (cmd === "내정보") return this._renderMyInfo(userData);
            if (cmd === "상점") return "🛒 [ 상점 ]\n" + "━".repeat(12) + "\n🚧 현재 준비 중인 페이지입니다.\n" + "━".repeat(12);

            // B. 메인 메뉴판 구성
            var title = isAdmin ? "🛠️ 관리자 시스템" : (isMain ? "🏰 메인" : "👤 개인설정");
            var list = this._getMenuOptions(isMain, isAdmin, isLoggedIn);
            
            return "┏ " + title + " ┓\n" + "━".repeat(12) + "\n" + list + "\n" + "━".repeat(12) + "\n💬 번호 입력 ('취소' 시 종료)";
        },

        /* [SECTION 2] 내부 서브 함수 - 메뉴 옵션 필터링 */
        _getMenuOptions: function(isMain, isAdmin, isLoggedIn) {
            // 관리자 전용 메뉴
            if (isAdmin) return "1.유저목록\n2.유저삭제\n3.데이터초기화\n4.데이터복구";
            
            // 일반 유저 - 메인룸(그룹톡)
            if (isMain) {
                return isLoggedIn ? "1.내정보\n2.상점" : "🔔 개인톡에서 가입/로그인 후 이용 가능";
            }
            
            // 일반 유저 - 개인톡 (유저조회 삭제됨)
            return isLoggedIn ? "1.내정보\n2.로그아웃" : "1.가입\n2.로그인";
        },

        _renderUserList: function(DB) {
            var ids = DB.getAllUserIds();
            if (ids.length === 0) return "👤 등록된 유저가 없습니다.";
            
            var msg = "👥 [관리자 전용: 유저 목록]\n" + "━".repeat(12) + "\n";
            global.tempUserList = ids;
            
            for (var i = 0; i < ids.length; i++) {
                var isOn = !!(global.SESSIONS_V4 && global.SESSIONS_V4[ids[i]] && global.SESSIONS_V4[ids[i]].data);
                msg += (i + 1) + ". " + (isOn ? "🟢" : "⚪") + " " + ids[i] + "\n";
            }
            return msg + "━".repeat(12) + "\n🔍 번호 선택 시 상세 정보 출력";
        },

        _renderMyInfo: function(userData) {
            if (!userData) return "❌ 로그인 정보가 없습니다.";
            return "👤 [ 내 정보 ]\n" + "━".repeat(12) + "\n• 이름: " + userData.info.name + "\n• 레벨: " + userData.status.level + "\n• 보유금: " + userData.status.money + "G";
        },

        /* [SECTION 3] 번호 매핑 수정 (관리자/일반 철저 분리) */
        getRootCmdByNum: function(isAdmin, isMain, isLoggedIn, num) {
            // 관리자 방인 경우
            if (isAdmin) {
                return { "1": "유저조회", "2": "삭제", "3": "초기화", "4": "복구" }[num] || null;
            }
            
            // 메인 룸(그룹톡)인 경우
            if (isMain) {
                if (isLoggedIn) return { "1": "내정보", "2": "상점" }[num] || null;
                return null;
            }
            
            // 개인 톡방인 경우
            if (isLoggedIn) return { "1": "내정보", "2": "로그아웃" }[num] || null;
            return { "1": "가입", "2": "로그인" }[num] || null;
        }
    };
}
