function clsUserInfo(_info) {
    var m_id = _info.id;
    var m_pwd = _info.pwd;
    var m_key = _info.key;

    return {
        getID: function() { return m_id; },
        getPW: function() { return m_pwd; },
        getKey: function() { return m_key; },
        toJson: function() {
            return { id: m_id, pwd: m_pwd, key: m_key };
        }
    };
}

exports.clsUserInfo = clsUserInfo;
