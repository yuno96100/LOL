/**
 * [modules/common/login/logic.js]
 */
function bridge() {
    return {
        execute: execute,
        handleWait: handleWait
    };
}

function execute(msg, session) {
    if (msg === "1") {
        session.waitAction = "가입_아이디";
        return { msg: "📝 가입하실 [아이디]를 입력해주세요." };
    }
    return { msg: "❌ 번호를 확인해주세요 (1. 가입)" };
}

function handleWait(msg, session, D, O) {
    return "입력 확인: " + msg;
}
