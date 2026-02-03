/**
 * [modules/Login.js] v3.4.5
 * 메뉴 출력과 로직을 하나로 통합
 */
function bridge() {
    return {
        render: render,
        execute: execute,
        handleWait: handleWait
    };
}

function render(isLogged) {
    if (isLogged) return "✅ 이미 로그인된 상태입니다.";
    var menu = "『 🏰 소환사의 협곡 』\n";
    menu += "━".repeat(12) + "\n";
    menu += "1. 회원가입\n";
    menu += "2. 로그인\n";
    menu += "━".repeat(12) + "\n";
    menu += "💬 번호를 입력해주세요.";
    return menu;
}

function execute(msg, session) {
    if (msg === "1") {
        session.waitAction = "가입_아이디";
        return { msg: "📝 가입하실 [아이디]를 입력해주세요." };
    }
    if (msg === "2") {
        session.waitAction = "로그인_아이디";
        return { msg: "🔑 [아이디]를 입력해주세요." };
    }
    return { msg: "❌ 1번 또는 2번을 입력해주세요." };
}

function handleWait(msg, session, D, O) {
    if (session.waitAction === "가입_아이디") {
        session.tempId = msg;
        session.waitAction = "가입_비밀번호";
        return "✅ 아이디: " + msg + "\n🔐 사용할 [비밀번호]를 입력하세요.";
    }
    session.waitAction = null;
    return "입력 완료: " + msg;
}
