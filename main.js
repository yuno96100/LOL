/**
 * [main.js] v3.7.6
 * 하단 명령어 가이드 UI 통합 (디자인 완성형)
 */

// ㅡㅡㅡㅡㅡㅡㅡ [1. 설정 및 상수] ㅡㅡㅡㅡㅡㅡㅡ
var Config = {
    Prefix: ".",
    AdminHash: "2056407147",
    BotName: "소환사의 협곡",
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",
    BACKUP_PATH: "/sdcard/msgbot/Bots/main/database.bak",
    INTERCEPT_PATH: "/sdcard/msgbot/intercept.txt",
    LINE: "━━━━━━━━━━━━━━"
};

// ㅡㅡㅡㅡㅡㅡㅡ [2. UI 엔진 (가변 타이틀 + 하단 가이드)] ㅡㅡㅡㅡㅡㅡㅡ
var UI = {
    // title: 제목, content: 본문, help: 하단 도움말
    make: function(title, content, help) {
        var base = "『 " + title + " 』\n" +
                   Config.LINE + "\n" +
                   content + "\n" +
                   Config.LINE;
        if (help) base += "\n💬 " + help;
        return base;
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [3. 시스템 엔진] ㅡㅡㅡㅡㅡㅡㅡ
var Engine = {
    saveData: function(data) {
        new java.lang.Thread(function() {
            try {
                var content = JSON.stringify(data, null, 4);
                var finalFile = new java.io.File(Config.DB_PATH);
                var parentDir = finalFile.getParentFile();
                if (!parentDir.exists()) parentDir.mkdirs();
                var tempFile = new java.io.File(Config.DB_PATH + ".tmp");
                FileStream.write(tempFile.getPath(), content);
                if (finalFile.exists()) FileStream.copy(Config.DB_PATH, Config.BACKUP_PATH);
                tempFile.renameTo(finalFile);
            } catch (e) { Log.error("데이터 저장 실패: " + e); }
        }).start();
    },
    checkExternal: function() {
        var file = new java.io.File(Config.INTERCEPT_PATH);
        if (file.exists()) {
            try {
                var raw = FileStream.read(Config.INTERCEPT_PATH);
                file.delete();
                var p = raw.split("|");
                return { sender: p[0], msg: p[1], room: p[2] };
            } catch (e) { return null; }
        }
        return null;
    }
};

if (!global.sessions) global.sessions = {};
var UserData = (function() {
    var file = new java.io.File(Config.DB_PATH);
    if (!file.exists()) return {};
    try {
        return JSON.parse(FileStream.read(Config.DB_PATH));
    } catch(e) {
        var bak = new java.io.File(Config.BACKUP_PATH);
        return bak.exists() ? JSON.parse(FileStream.read(Config.BACKUP_PATH)) : {};
    }
})();

// ㅡㅡㅡㅡㅡㅡㅡ [4. 메인 응답 로직] ㅡㅡㅡㅡㅡㅡㅡ
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (!msg) return;
    msg = msg.trim();
    
    var sessionKey = sender + "@" + room;
    if (!global.sessions[sessionKey]) {
        global.sessions[sessionKey] = { isMenuOpen: false, data: null, waitAction: null, id: sender };
    }
    var session = global.sessions[sessionKey];

    try {
        var ext = Engine.checkExternal();
        if (ext) { /* 인터셉터 로직 */ }

        if (msg === "취소") {
            session.isMenuOpen = false; session.waitAction = null;
            return replier.reply(UI.make("시스템", "❌ 모든 작업이 취소되었습니다.", "명령어를 보려면 .메뉴 입력"));
        }

        // ㅡㅡㅡㅡㅡㅡㅡ [기능: 메뉴 및 로그인/가입] ㅡㅡㅡㅡㅡㅡㅡ
        if (!session.data && msg === Config.Prefix + "메뉴") {
            session.isMenuOpen = true;
            return replier.reply(UI.make("메인메뉴", "1. 회원가입\n2. 로그인", "번호를 입력하거나 '취소' 입력"));
        }

        if (!session.data && (session.isMenuOpen || session.waitAction)) {
            
            // [회원가입]
            if (session.waitAction === "가입_아이디") {
                if (UserData[msg]) return replier.reply(UI.make("회원가입", "⚠️ 이미 존재하는 아이디입니다.", "다른 아이디를 입력해주세요."));
                session.tempId = msg; session.waitAction = "가입_비밀번호";
                return replier.reply(UI.make("회원가입", "📝 아이디: " + msg + "\n🔐 사용할 비밀번호를 입력해주세요.", "비밀번호를 입력하세요."));
            }
            if (session.waitAction === "가입_비밀번호") {
                UserData[session.tempId] = { pw: msg, level: 1, gold: 1000 };
                Engine.saveData(UserData);
                session.waitAction = null; session.isMenuOpen = false;
                return replier.reply(UI.make("회원가입", "✨ 가입 완료!\n로그인을 진행해주세요.", ".메뉴를 통해 로그인 가능"));
            }

            // [로그인]
            if (session.waitAction === "로그인_아이디") {
                if (!UserData[msg]) return replier.reply(UI.make("로그인", "❌ 등록되지 않은 아이디입니다.", "아이디를 다시 확인하세요."));
                session.tempId = msg; session.waitAction = "로그인_비밀번호";
                return replier.reply(UI.make("로그인", "🔑 아이디: " + msg + "\n비밀번호를 입력해주세요.", "비밀번호를 입력하세요."));
            }
            if (session.waitAction === "로그인_비밀번호") {
                if (UserData[session.tempId].pw === msg) {
                    session.data = UserData[session.tempId];
                    session.waitAction = null; session.isMenuOpen = false;
                    return replier.reply(UI.make("접속완료", "✅ 반갑습니다, " + session.tempId + "님!", ".정보 명령어로 확인 가능"));
                }
                return replier.reply(UI.make("로그인", "❌ 비밀번호가 틀렸습니다.", "비밀번호를 다시 입력하거나 '취소'"));
            }

            if (msg === "1") { session.waitAction = "가입_아이디"; return replier.reply(UI.make("회원가입", "📝 가입하실 아이디를 입력해주세요.", "아이디를 입력하세요.")); }
            if (msg === "2") { session.waitAction = "로그인_아이디"; return replier.reply(UI.make("로그인", "🔑 로그인 아이디를 입력해주세요.", "아이디를 입력하세요.")); }
        }

        // ㅡㅡㅡㅡㅡㅡㅡ [기능: 로그인 유저 전용] ㅡㅡㅡㅡㅡㅡㅡ
        if (session.data && msg === Config.Prefix + "정보") {
            var info = "👤 소환사: " + session.tempId + "\n🎖 레벨: " + session.data.level + "\n💰 골드: " + session.data.gold;
            return replier.reply(UI.make("내 정보", info, ".메뉴(준비중) / 취소"));
        }

    } catch (e) {
        replier.reply(UI.make("에러", "🚨 오류: " + e.message, "증상이 지속되면 관리자에게 문의"));
    }
}
