function bridge() {
    return {
        getNewUser: function(id, pw, nick) {
            return {
                info: {
                    id: id,
                    pw: pw,
                    name: nick,
                    originalNickname: nick,
                    joinDate: new Date().toLocaleString()
                },
                status: {
                    level: 1,
                    exp: 0,
                    money: 1000
                },
                inventory: []
            };
        }
    };
}
