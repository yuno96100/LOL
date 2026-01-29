function bridge() {
    return {
        getNewUser: function(id, pw, nick) {
            return {
                info: {
                    id: id,
                    pw: pw,
                    name: nick,
                    originalNickname: nick, // 가입 시 카톡 닉네임 영구 기록
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
