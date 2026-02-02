function bridge() {
    return {
        render: function(isLoggedIn) {
            var body = isLoggedIn 
                ? " 1. 🚪 로그아웃\n 2. 🔙 이전으로" 
                : " 1. 🔓 로그인하기\n 2. 📝 여행자 가입";

            return "『 🔐 인증 시스템 』\n" +
                   "━".repeat(12) + "\n" +
                   body + "\n" +
                   "━".repeat(12) + "\n" +
                   "💬 신원을 확인해 주십시오.";
        }
    };
}
