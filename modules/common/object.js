function bridge() {
    return {
        getNewUser: function(id, name) {
            return {
                info: {
                    id: id,
                    name: name,
                    joinDate: new Date().getTime()
                },
                status: {
                    level: 1,
                    money: 1000,
                    exp: 0,
                    hp: 100,
                    maxHp: 100
                },
                inventory: []
            };
        }
    };
}
