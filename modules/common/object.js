function bridge() {
    return {
        // 계정 전용 객체
        getNewAccount: function(id, name) {
            return {
                id: id,      // 고유 식별자
                name: name,  // 닉네임
                isBanned: false
            };
        },
        // 게임 데이터 전용 객체
        getNewProfile: function(name) {
            return {
                name: name,
                status: { level: 1, money: 1000, exp: 0, hp: 100 },
                inventory: []
            };
        }
    };
}
