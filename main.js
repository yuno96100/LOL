/**
 * [main.js] v3.5.6
 * 채팅방별 분기 처리 (Multi-Room Session)
 */

// ㅡㅡㅡㅡㅡㅡㅡ [1. 설정 및 상수] ㅡㅡㅡㅡㅡㅡㅡ
var Config = {
    Prefix: ".",
    AdminHash: "2056407147",
    BotName: "소환사의 협곡",
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json"
};

// ㅡㅡㅡㅡㅡㅡㅡ [2. 데이터베이스 로직] ㅡㅡㅡㅡㅡㅡㅡ
var Database = {
    save: function(data) {
        FileStream.write(Config.DB_PATH, JSON.stringify(data, null, 4));
    },
    load: function() {
        var file = new java.io.File(Config.DB_PATH);
        if (!file.exists()) return {};
        try {
            return JSON.parse(FileStream.read(Config.DB_PATH));
        } catch(e) { return {}; }
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [3. 전역 세션 및 데이터] ㅡㅡㅡㅡㅡㅡㅡ
if (!global.sessions) global.sessions = {};
var UserData = Database.load();

// ㅡㅡㅡㅡㅡㅡㅡ [4. 로그인 시스템 로직] ㅡㅡㅡㅡㅡㅡㅡ
var LoginSystem = {
    render: function(roomName) {
        var menu = "『 🏰 " + Config.BotName + " 』\n";
        menu += "📍 접속 위치: " + roomName + "\n"; // 분기점 확인용
        menu += "ㅡㅡㅡㅡㅡㅡㅡ\n";
        menu += "1. 회원가입\n";
        menu += "2. 로그인\n";
        menu += "ㅡㅡㅡㅡㅡㅡㅡ\n";
        menu += "💬 번호를 선택하거나 '취소'를 입력하세요.";
        return menu;
    },
    
    // (execute 및 handleWait 로직은 이전과 동일하되 세션 데이터만 활용)
    execute: function(msg, session) {
        if (msg === "1") {
            session.waitAction = "가입_아이디";
            return "📝 가입하실 [아이디]를 입력해주세요.";
        }
        if (msg === "2") {
            session.waitAction = "로그인_아이디";
            return "🔑 [아이디]를 입력해주세요.";
        }
        return "❌ 1번 또는 2번을 선택해주세요.";
    },

    handleWait: function(msg, session) {
        if (session.waitAction === "가입_아이디") {
            if (UserData[msg]) return "⚠️ 이미 존재하는 아이디입니다.";
            session.tempId = msg;
            session.waitAction = "가입_비밀번호";
            return "✅ 아이디: " + msg + "\n🔐 사용할 [비밀번호]를 입력하세요.";
        }
        if (session.waitAction === "가입_비밀번호") {
            UserData[session.tempId] = { pw: msg, level: 1, gold: 1000 };
            Database.save(UserData);
            session.waitAction = null;
            session.isMenuOpen = false;
            return "✨ 회원가입 완료! 로그인을 시도해주세요.";
        }
        if (session.waitAction === "로그인_아이디") {
            if (!UserData[msg]) return "❌ 등록되지 않은 아이디입니다.";
            session.tempId = msg;
            session.waitAction = "로그인_비밀번호";
            return "🔑 비밀번호를 입력해주세요.";
        }
        if (session.waitAction === "로그인_비밀번호") {
            if (UserData[session.tempId].pw === msg) {
                session.data = UserData[session.tempId];
                session.waitAction = null;
                session.isMenuOpen = false;
                return "✅ 로그인 성공! [" + session.tempId + "]님 환영합니다.";
            }
            return "❌ 비밀번호가 틀렸습니다.";
        }
        return "알 수 없는 진행 상태입니다.";
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [5. 메인 응답 함수] ㅡㅡㅡㅡㅡㅡㅡ
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (!msg) return;
    msg = msg.trim();

    // ⭐️ 핵심: 채팅방별 분기를 위한 고유 키 생성 (유저명 + 방이름)
    var sessionKey = sender + "@" + room;
    
    if (!global.sessions[sessionKey]) {
        global.sessions[sessionKey] = { 
            isMenuOpen: false, 
            data: null, 
            waitAction: null, 
            id: sender,
            room: room 
        };
    }
    var session = global.sessions[sessionKey];

    try {
        // [공통 명령어]
        if (msg === "취소") {
            session.isMenuOpen = false;
            session.waitAction = null;
            return replier.reply("❌ [" + room + "]에서의 진행이 취소되었습니다.");
        }

        if (msg === Config.Prefix + "테스트") {
            return replier.reply("✅ [v3.5.6] 세션 분리 완료\n📍 현재 방: " + room);
        }

        // [메뉴 및 입력 로직]
        if (!session.data && msg === Config.Prefix + "메뉴") {
            // 개인톡 뿐만 아니라 단톡방 분기 테스트를 위해 조건 완화 (필요시 조정)
            session.isMenuOpen = true;
            return replier.reply(LoginSystem.render(room));
        }

        // 입력 대기 상태 처리
        if (!session.data && (session.isMenuOpen || session.waitAction)) {
            if (session.waitAction) {
                return replier.reply(LoginSystem.handleWait(msg, session));
            }
            if (!isNaN(msg)) {
                return replier.reply(LoginSystem.execute(msg, session));
            }
        }

    } catch (e) {
        replier.reply("🚨 에러: " + e.message);
    }
}
