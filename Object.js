function bridge() {
    return {
        getNewUser: function(id, pw, nick) {
            return {
                info: {
                    id: id,
                    pw: "0", // 비밀번호 기능 제거로 인한 기본값 고정
                    name: nick,
                    joinDate: new Date().getTime()
                },
                status: {
                    level: 1,
                    exp: 0,
                    money: 1000,
                    hp: 100,
                    maxHp: 100
                },
                inventory: []
            };
        }
    };
}
