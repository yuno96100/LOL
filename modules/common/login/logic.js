/* ============================================================
   [SECTION] 로그인/가입 비즈니스 로직
   ============================================================ */
function bridge() {
    return {
        /**
         * 메뉴 번호 선택 시 실행되는 함수
         */
        execute: function(num, session) {
            if (!session.data) {
                // 비로그인 상태 메뉴 처리
                if (num == "1") {
                    session.waitAction = "로그인";
                    return { msg: "🔓 로그인할 닉네임을 입력해주세요.\n(취소: '취소')" };
                } else if (num == "2") {
                    session.waitAction = "가입";
                    return { msg: "📝 가입하실 닉네임을 입력해주세요.\n(취소: '취소')" };
                }
            } else {
                // 로그인 상태 메뉴 처리
                if (num == "1") {
                    session.data = null;
                    session.currentView = "MAIN";
                    return { msg: "🚪 로그아웃되었습니다.", closeMenu: true };
                } else if (num == "2") {
                    return { msg: "🔙 메인 메뉴로 돌아갑니다.", closeMenu: true };
                }
            }
            return { msg: "❌ 잘못된 번호입니다.", closeMenu: false };
        },

        /**
         * 텍스트 입력 대기(waitAction) 상태일 때 실행되는 함수
         */
        handleWait: function(msg, session, DB, Obj) {
            var action = session.waitAction;
            session.waitAction = null; // 처리 시작 전 대기 상태 해제

            // 1. 회원가입 로직
            if (action === "가입") {
                if (msg.length < 2 || msg.length > 8) return "⚠️ 닉네임은 2~8자 사이로 입력해주세요.";
                if (DB.readUser(msg)) return "❌ 이미 존재하는 닉네임입니다.";

                // 공용 객체(Obj)를 사용하여 새 유저 생성 및 저장
                var newUser = Obj.getNewUser(session.id || "Unknown", msg);
                DB.writeUser(msg, newUser);
                
                return "✅ [" + msg + "]님, 가입을 축하합니다!\n'.메뉴'를 입력해 로그인해주세요.";
            }

            // 2. 로그인 로직
            if (action === "로그인") {
                var userData = DB.readUser(msg);
                if (!userData) return "❌ 해당 닉네임의 정보를 찾을 수 없습니다.";

                session.data = userData; // 세션 데이터 주입
                session.currentView = "ROOM"; // 메뉴 뷰 전환
                
                return "🔓 [" + msg + "]님으로 접속되었습니다!\n즐거운 시간 보내세요.";
            }

            return null;
        }
    };
}
