function bridge() {
    return {
        getNewUser: function(id, pw, nick) {
            return {
                info: {
                    id: id,
                    pw: "0", // 비밀번호 미사용
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
