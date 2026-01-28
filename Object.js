
// Object.js
function bridge() {
    return {
        // 회원가입 시 생성될 기본 객체
        getNewUser: function(_id, _pw, _name) {
            return {
                id: _id,         // 로그인용 ID
                pw: _pw,         // 비밀번호
                name: _name,     // 카톡 닉네임
                level: 1,
                rp: 0,           // 게임 재화
                joinedDate: new Date().toLocaleDateString(),
                inventory: [],
                stats: {
                    hp: 100,
                    atk: 10
                }
            };
        }
    };
}
