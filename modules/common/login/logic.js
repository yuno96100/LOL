/**
 * [modules/common/login/logic.js]
 */

// ⭐️ 메인에서 이 파일을 불러올 때 사용하는 연결 고리
function bridge() {
    return {
        execute: execute,
        handleWait: handleWait
    };
}

/**
 * 메뉴 번호 선택 처리
 */
function execute(msg, session) {
    if (msg === "1") {
        session.waitAction = "가입_아이디";
        return { msg: "📝 가입하실 [아이디]를 입력해주세요.\n(취소하시려면 '취소' 입력)" };
    }
    if (msg === "2") {
        session.waitAction = "로그인_아이디";
        return { msg: "🔑 [아이디]를 입력해주세요." };
    }
    return { msg: "❌ 잘못된 번호입니다. 1번(가입) 또는 2번(로그인)을 선택해주세요." };
}

/**
 * 텍스트 입력 처리 (ID, PW 등)
 */
function handleWait(msg, session, D, O) {
    // 예시: 아이디 입력 단계라면
    if (session.waitAction === "가입_아이디") {
        session.tempId = msg; // 임시 저장
        session.waitAction = "가입_비밀번호";
        return "✅ 아이디가 '" + msg + "'로 설정되었습니다.\n이제 [비밀번호]를 입력해주세요.";
    }
    
    // 상태 초기화 (임시)
    session.waitAction = null;
    return "입력하신 내용: " + msg;
}
