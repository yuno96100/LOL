// Object.js
const libConst = Bridge.getScopeOf("Const.js").bridge();

function bridge() {
    return {
        // 회원가입용 기본 객체 생성
        getNewUser: function(_id, _pw, _name) {
            return {
                info: {
                    id: _id,         // 카톡 고유 식별자 또는 ID
                    pw: _pw,         // 개인톡에서 설정할 비번
                    name: _name,     // 유저 닉네임
                    joinedDate: new Date().toLocaleDateString()
                },
                status: {
                    level: 1,
                    rp: 0,           // 보유 재화
                    exp: 0,
                    point: 0         // 실험실 포인트 등
                },
                profile: {
                    mainChamp: "없음", // 나중에 추가할 요소들
                    tier: "Unranked"
                },
                inventory: []
            };
        }
    };
}
