const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        /* 섹션 1: 유저 인터페이스 (UI) 생성 */
        getMenu: function(room, isMain, isAdmin, isLoggedIn, cmd, userData, DB) {
            // A. 하위 페이지 분기
            if (cmd === "유저조회") return this._renderUserList(DB);
            if (cmd === "상점") return "🛒 [ 상점 ]\n" + "━".repeat(12) + "\n🚧 준비 중입니다.\n" + "━".repeat(12);
            if (cmd === "내정보") return this._renderMyInfo(userData);

            // B. 메인 메뉴판 구성
            let title = isAdmin ? "🛠️ 관리자" : (isMain ? "🏰 메인" : "👤 개인설정");
            let list = this._getMenuOptions(isMain, isAdmin, isLoggedIn);
            
            return "┏ " + title + " ┓\n" + "━".repeat(12) + "\n" + list + "\n" + "━".repeat(12) + "\n💬 번호 입력 ('취소' 시 종료)";
        },

        /* 섹션 2: 내부 렌더링 함수 (Private-like) */
        _getMenuOptions: function(isMain, isAdmin, isLoggedIn) {
            if (isAdmin) return "1.유저목록\n2.삭제\n3.초기화\n4.복구";
            if (!isMain) return isLoggedIn ? "1.내정보\n2.로그아웃" : "1.가입\n2.로그인";
            return isLoggedIn ? "1.내정보\n2.상점\n3.유저조회" : "🔔 개인톡에서 로그인 후 이용 가능";
        },

        _renderUserList: function(DB) {
            let ids = DB.getAllUserIds();
            if (ids.length === 0) return "👤 유저가 없습니다.";
            let msg = "👥 [유저 목록]\n";
            global.tempUserList = ids;
            for (let i = 0; i < ids.length; i++) {
                let isOn = !!(global.sessions[ids[i]]?.data);
                msg += (i + 1) + ". " + (isOn ? "🟢" : "⚪") + " " + ids[i] + "\n";
            }
            return msg + "🔍 번호 입력 ('취소' 시 종료)";
        },

        _renderMyInfo: function(userData) {
            if (!userData) return "❌ 로그인 정보 없음.";
            return "👤 [내 정보]\n• 이름: " + userData.info.name + "\n• 소지금: " + userData.status.money + "G";
        },

        /* 섹션 3: 커맨드 매핑 */
        getRootCmdByNum: function(isAdmin, isMain, isLoggedIn, num) {
            if (isAdmin) return { "1": "유저조회", "2": "삭제", "3": "초기화", "4": "복구" }[num] || null;
            if (!isMain) return isLoggedIn ? { "1": "내정보", "2": "로그아웃" }[num] : { "1": "가입", "2": "로그인" }[num];
            return isLoggedIn ? { "1": "내정보", "2": "상점", "3": "유저조회" }[num] : null;
        }
    };
}
