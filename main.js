/**
 * [main.js] v4.4.0
 * 방 이름/해시 조회 기능 및 방별 환경 설정 통합본
 */

// ㅡㅡㅡㅡㅡㅡㅡ [1. 모듈: 설정 및 상수] ㅡㅡㅡㅡㅡㅡㅡ
var Config = {
    Prefix: ".",
    AdminHash: "2056407147", // 여기에 조회한 해시를 넣으세요
    AdminName: "데미갓", 
    AdminRoom: "관리자 전용방", // 여기에 조회한 관리자방 이름을 넣으세요
    GroupRoom: "메인 단톡방",   // 여기에 조회한 단톡방 이름을 넣으세요
    BotName: "소환사의 협곡",
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",
    BACKUP_PATH: "/sdcard/msgbot/Bots/main/database.bak",
    LINE: "━━━━━━━━━━━━━━"
};

// ㅡㅡㅡㅡㅡㅡㅡ [2. 모듈: UI 엔진] ㅡㅡㅡㅡㅡㅡㅡ
var UI = {
    make: function(title, content, help) {
        var base = "『 " + title + " 』\n" + Config.LINE + "\n" + content + "\n" + Config.LINE;
        if (help) base += "\n💬 " + help;
        return base;
    },
    
    renderMenu: function(session) {
        if (session.type === "ADMIN") {
            return this.make("관리자 센터", "접속 관리자: " + Config.AdminName + "\n\n1. 시스템 상태\n2. 유저 목록 조회\n3. 전체 데이터 백업", "번호를 입력하세요.");
        }
        
        // 지정된 단톡방인 경우
        if (session.type === "GROUP") {
            return this.make(Config.BotName, "📍 [" + Config.GroupRoom + "] 전용 광장\n\n개인톡에서 로그인을 하시면 상점, 모험 등 모든 기능을 이용하실 수 있습니다.", "봇에게 개인 메시지를 보내보세요!");
        }

        // 개인톡(DIRECT) 환경
        if (!session.data) {
            return this.make(Config.BotName, "1. 회원가입\n2. 로그인", "가입 또는 로그인을 선택해주세요.");
        } else {
            var menu = "👤 [" + session.tempId + "] 소환사님\n" +
                       Config.LINE + "\n" +
                       "1. 내 정보 보기\n" +
                       "2. 상점 이용 (준비중)\n" +
                       "3. 모험 떠나기 (준비중)\n" +
                       "4. 로그아웃";
            return this.make("메인 메뉴", menu, "번호를 입력하세요.");
        }
    }
};

// (중략: Database, AdminManager, AuthManager 모듈은 이전 v4.3.1과 동일하므로 논리 구조 유지)
// ㅡㅡㅡㅡㅡㅡㅡ [3. 모듈: 데이터베이스/관리자/인증 (생략 없이 통합 시 내부 포함)] ㅡㅡㅡㅡㅡㅡㅡ
var Database = {
    data: {},
    load: function() {
        var file = new java.io.File(Config.DB_PATH);
        if (!file.exists()) return {};
        try { return JSON.parse(FileStream.read(Config.DB_PATH)); } catch(e) { return {}; }
    },
    save: function(data) {
        this.data = data;
        new java.lang.Thread(function() {
            try { FileStream.write(Config.DB_PATH, JSON.stringify(data, null, 4)); } catch (e) {}
        }).start();
    }
};

var AdminManager = {
    handle: function(msg, session, replier) {
        if (msg === "1") {
            var status = "⚙️ 버전: v4.4.0\n👤 관리자: " + Config.AdminName + "\n📂 유저수: " + Object.keys(Database.data).length + "명";
            return replier.reply(UI.make("시스템 상태", status, "정상 가동 중"));
        }
        if (msg === "2" || session.waitAction === "관리_유저목록") {
            var list = Object.keys(Database.data);
            var content = list.length > 0 ? list.map(function(id, idx){ return (idx+1) + ". " + id; }).join("\n") : "유저 없음";
            session.waitAction = "관리_유저선택";
            return replier.reply(UI.make("유저 목록", content, "아이디를 입력하세요."));
        }
        if (session.waitAction === "관리_유저선택") {
            if (Database.data[msg]) { session.targetUser = msg; session.waitAction = "관리_유저제어";
                return replier.reply(UI.make("유저 제어: " + msg, "1. 정보조회\n2. 초기화\n3. 삭제", "번호 선택"));
            }
        }
        if (session.waitAction === "관리_유저제어") {
            var tid = session.targetUser;
            if (msg === "1") return replier.reply(UI.make("정보 조회", JSON.stringify(Database.data[tid], null, 2)));
            if (msg === "2") { Database.data[tid].gold = 1000; Database.save(Database.data); return replier.reply(UI.make("관리", tid + " 초기화 완료")); }
            if (msg === "3") { delete Database.data[tid]; Database.save(Database.data); session.waitAction = "관리_유저목록"; return replier.reply(UI.make("관리", tid + " 삭제 완료")); }
        }
        if (msg === "3") { FileStream.copy(Config.DB_PATH, Config.BACKUP_PATH); return replier.reply(UI.make("시스템", "📦 백업 완료")); }
    }
};

var AuthManager = {
    handle: function(msg, session, replier) {
        if (session.waitAction === "가입_ID") {
            if (Database.data[msg]) return replier.reply(UI.make("회원가입", "⚠️ 중복 아이디"));
            session.tempId = msg; session.waitAction = "가입_PW";
            return replier.reply(UI.make("회원가입", "📝 ID: " + msg + "\n🔐 비번 입력", "비밀번호 입력"));
        }
        if (session.waitAction === "가입_PW") {
            Database.data[session.tempId] = { pw: msg, level: 1, gold: 1000 };
            Database.save(Database.data); session.waitAction = null;
            return replier.reply(UI.make("회원가입", "✨ 가입 완료!", "2번을 눌러 로그인"));
        }
        if (session.waitAction === "로그인_ID") {
            if (!Database.data[msg]) return replier.reply(UI.make("로그인", "❌ 없는 ID"));
            session.tempId = msg; session.waitAction = "로그인_PW";
            return replier.reply(UI.make("로그인", "🔑 ID: " + msg + "\n비번 입력", "비밀번호 입력"));
        }
        if (session.waitAction === "로그인_PW") {
            if (Database.data[session.tempId].pw === msg) {
                session.data = Database.data[session.tempId]; session.waitAction = null;
                return replier.reply(UI.renderMenu(session));
            }
            return replier.reply(UI.make("로그인", "❌ 비번 틀림"));
        }
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [4. 전역 초기화] ㅡㅡㅡㅡㅡㅡㅡ
if (!global.sessions) global.sessions = {};
Database.data = Database.load();

// ㅡㅡㅡㅡㅡㅡㅡ [5. 메인 응답 함수] ㅡㅡㅡㅡㅡㅡㅡ
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (!msg) return;
    msg = msg.trim();
    var hash = String(imageDB.getProfileHash());
    
    // 🔍 [정보 조회 명령어] - 설정 전 해시와 방 이름을 확인하기 위함
    if (msg === Config.Prefix + "정보조회") {
        var info = "📍 방 이름: " + room + "\n" +
                   "👤 내 해시: " + hash + "\n" +
                   "📱 유형: " + (isGroupChat ? "단체톡" : "개인톡");
        return replier.reply(UI.make("디버그 정보", info, "이 정보를 Config에 복사하세요."));
    }

    var sessionKey = sender + "@" + room;
    if (!global.sessions[sessionKey]) {
        var type = "DIRECT";
        if (room === Config.AdminRoom && hash === Config.AdminHash) type = "ADMIN";
        else if (isGroupChat) type = "GROUP";
        
        global.sessions[sessionKey] = { isMenuOpen: false, data: null, waitAction: null, type: type, tempId: null };
    }
    var session = global.sessions[sessionKey];

    try {
        if (msg === "취소") { session.waitAction = null; return replier.reply(UI.make("시스템", "❌ 취소됨")); }
        if (msg === Config.Prefix + "메뉴") return replier.reply(UI.renderMenu(session));

        if (session.type === "ADMIN") return AdminManager.handle(msg, session, replier);

        if (session.type === "DIRECT") {
            if (!session.data) {
                if (session.waitAction) return AuthManager.handle(msg, session, replier);
                if (msg === "1") { session.waitAction = "가입_ID"; return replier.reply(UI.make("회원가입", "📝 ID 입력")); }
                if (msg === "2") { session.waitAction = "로그인_ID"; return replier.reply(UI.make("로그인", "🔑 ID 입력")); }
            } else {
                if (msg === "1") return replier.reply(UI.make("내 정보", "👤 소환사: " + session.tempId + "\n💰 골드: " + session.data.gold));
                if (msg === "4") { session.data = null; return replier.reply(UI.make("로그아웃", "✅ 완료")); }
            }
        }
    } catch (e) {
        replier.reply(UI.make("에러", "🚨 오류: " + e.message));
    }
}
