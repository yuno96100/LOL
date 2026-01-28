// Object.js
function bridge() {
    return {
        getNewUser: function(_id, _pw, _name) {
            return {
                info: { 
                    id: _id, 
                    pw: _pw, 
                    name: _name, 
                    joinedDate: new Date().toLocaleDateString() 
                },
                status: { level: 1, rp: 0, exp: 0 },
                inventory: []
            };
        }
    };
}
