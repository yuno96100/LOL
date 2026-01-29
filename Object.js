function bridge() {
    return {
        getNewUser: function(_id, _pw, _name) {
            return {
                info: {
                    id: _id,
                    pw: _pw,
                    name: _name, // 사용자가 입력한 닉네임이 여기 저장됩니다.
                    title: "브론즈",
                    joinDate: new Date().toLocaleString()
                },
                status: {
                    level: 1,
                    exp: 0,
                    money: 1000,
                    win: 0,
                    loss: 0
                },
                inventory: []
            };
        }
    };
}
