/**
 * [main.js] v4.3.1
 * 관리자 제어(보안강화) + 개인톡 메인메뉴 + 단톡방 안내 + 에러 트래킹
 */

// ㅡㅡㅡㅡㅡㅡㅡ [1. 모듈: 설정 및 상수] ㅡㅡㅡㅡㅡㅡㅡ
var Config = {
    Prefix: ".",
    AdminHash: "2056407147", // 관리자 프로필 해시
    AdminName: "데미갓",       // ⭐️ 직접 지정할 관리자 이름
    AdminRoom: "관리자 전용방", // 관리자 전용 채팅방 이름
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
        
        if (session.type === "GROUP") {
            return this.make(Config.BotName, "📍 단톡방은 랭킹/알림 전용 공간입니다.\n\n개인톡에서 로그인을 하시면 상점, 모험 등 모든 기능을 이용하실 수 있습니다.", "봇에게 개인 메시지를 보내보세요!");
        }

        if (!session.data) {
            return this.make(Config.BotName, "1. 회원가입\n2. 로그인", "가입 또는 로그인을 선택해주세요.");
        } else {
            var menu = "👤 [" + session.tempId + "] 소환사님\n" +
                       Config.LINE + "\n" +
                       "1. 내 정보 보기\n" +
                       "2. 상점 이용 (준비중)\n" +
                       "3. 모험 떠나기 (준비중)\n" +
                       "4. 로그아웃";
            return this.make("메인 메뉴", menu, "이용할 기능의 번호를 입력하세요.");
        }
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [3. 모듈: 데이터베이스 엔진] ㅡㅡㅡㅡㅡㅡㅡ
var Database = {
    data: {},
    load: function() {
        var file = new java.io.File(Config.DB_PATH);
        if (!file.exists()) return {};
        try {
            var content = FileStream.read(Config.DB_PATH);
            return JSON.parse(content);
        } catch(e) {
            var bak = new java.io.File(Config.BACKUP_PATH);
            if (bak.exists()) return JSON.parse(FileStream.read(Config.BACKUP_PATH));
            return {};
        }
    },
    save: function(data) {
        this.data = data;
        new java.lang.Thread(function() {
            try {
                var content = JSON.stringify(data, null, 4);
                var finalFile = new java.io.File(Config.DB_PATH);
                var parentDir = finalFile.getParentFile();
                if (!parentDir.exists()) parentDir.mkdirs();
                FileStream.write(Config.DB_PATH, content);
            } catch (e) {
                Log.error("DB 저장 실패: " + e);
            }
        }).start();
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [4. 모듈: 관리자 액션 매니저] ㅡㅡㅡㅡㅡㅡㅡ
var AdminManager = {
    handle: function(msg, session, replier) {
        // 1. 시스템 상태 조회
        if (msg === "1") {
            var status = "⚙️ 버전: v4.3.1\n" +
                         "👤 관리자: " + Config.AdminName + "\n" +
                         "📂 유저수: " + Object.keys(Database.data).length + "명\n" +
                         "🌐 세션수: " + Object.keys(global.sessions).length;
            return replier.reply(UI.make("시스템 상태", status, "정상 가동 중"));
        }

        // 2. 유저 목록 조회
        if (msg === "2" || session.waitAction === "관리_유저목록") {
            var list = Object.keys(Database.data);
            var content = list.length > 0 ? list.map(function(id, idx){ return (idx+1) + ". " + id; }).join("\n") : "가입된 유저가 없습니다.";
            session.waitAction = "관리_유저선택";
            return replier.reply(UI.make("유저 목록", content, "관리할 유저의 [아이디]를 입력하세요."));
        }

        // 3. 특정 유저 관리 메뉴 진입
        if (session.waitAction === "관리_유저선택") {
            if (Database.data[msg]) {
                session.targetUser = msg;
                session.waitAction = "관리_유저제어";
                return replier.reply(UI.make("유저 제어: " + msg, "1. 가입정보 조회\n2. 데이터 초기화\n3. 계정 삭제", "번호를 입력하세요."));
            }
        }

        // 4. 유저 상세 제어 실행
        if (session.waitAction === "관리_유저제어") {
            var tid = session.targetUser;
            if (msg === "1") {
                var u = Database.data[tid];
                var info = "🆔 ID: " + tid + "\n🔐 PW: " + u.pw + "\n🎖 LV: " + u.level + "\n💰 GOLD: " + u.gold;
                return replier.reply(UI.make("상세 정보", info, "1.조회 2.초기화 3.삭제"));
            }
            if (msg === "2") {
                Database.data[tid].level = 1;
                Database.data[tid].gold = 1000;
                Database.save(Database.data);
                return replier.reply(UI.make("관리", tid + " 유저를 초기화했습니다.", "골드와 레벨이 기본값으로 변경됨"));
            }
            if (msg === "3") {
                delete Database.data[tid];
                Database.save(Database.data);
                session.waitAction = "관리_유저목록";
                return replier.reply(UI.make("관리", tid + " 유저를 삭제했습니다.", "목록으로 돌아갑니다."));
            }
        }

        // 5. 전체 데이터 백업
        if (msg === "3") {
            try {
                FileStream.copy(Config.DB_PATH, Config.BACKUP_PATH);
                return replier.reply(UI.make("시스템", "📦 데이터 백업 완료", "경로: " + Config.BACKUP_PATH));
            } catch(e) {
                return replier.reply(UI.make("에러", "백업 중 오류 발생", e.message));
            }
        }
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [5. 모듈: 인증 매니저] ㅡㅡㅡㅡㅡㅡㅡ
var AuthManager = {
    handle: function(msg, session, replier) {
        if (session.waitAction === "가입_ID") {
            if (Database.data[msg]) return replier.reply(UI.make("회원가입", "⚠️ 이미 존재하는 아이디입니다.", "다른 아이디를 입력해주세요."));
            session.tempId = msg; session.waitAction = "가입_PW";
            return replier.reply(UI.make("회원가입", "📝 아이디: " + msg + "\n🔐 사용할 비밀번호를 입력해주세요.", "비밀번호를 입력하세요."));
        }
        if (session.waitAction === "가입_PW") {
            Database.data[session.tempId] = { pw: msg, level: 1, gold: 1000, items: [] };
            Database.save(Database.data);
            session.waitAction = null;
            return replier.reply(UI.make("회원가입", "✨ 가입이 완료되었습니다!", "2번을 눌러 로그인해주세요."));
        }
        if (session.waitAction === "로그인_ID") {
            if (!Database.data[msg]) return replier.reply(UI.make("로그인", "❌ 등록되지 않은 아이디입니다.", "아이디를 확인하세요."));
            session.tempId = msg; session.waitAction = "로그인_PW";
            return replier.reply(UI.make("로그인", "🔑 아이디: " + msg + "\n비밀번호를 입력해주세요.", "비밀번호를 입력하세요."));
        }
        if (session.waitAction === "로그인_PW") {
            if (Database.data[session.tempId].pw === msg) {
                session.data = Database.data[session.tempId];
                session.waitAction = null;
                return replier.reply(UI.renderMenu(session));
            }
            return replier.reply(UI.make("로그인", "❌ 비밀번호가 틀렸습니다.", "다시 입력하거나 '취소' 입력"));
        }
    }
};

// 전역 초기화
if (!global.sessions) global.sessions = {};
Database.data = Database.load();

// ㅡㅡㅡㅡㅡㅡㅡ [6. 메인 응답 함수] ㅡㅡㅡㅡㅡㅡㅡ
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (!msg) return;
    msg = msg.trim();
    var hash = String(imageDB.getProfileHash());
    var sessionKey = sender + "@" + room;
    
    if (!global.sessions[sessionKey]) {
        var type = "DIRECT";
        if (isGroupChat) type = "GROUP";
        // 관리자 권한 부여 (방 이름 + 해시 일치 필수)
        if (room === Config.AdminRoom && hash === Config.AdminHash) type = "ADMIN";
        
        global.sessions[sessionKey] = { isMenuOpen: false, data: null, waitAction: null, type: type, tempId: null, targetUser: null };
    }
    var session = global.sessions[sessionKey];

    try {
        // [공통: 취소]
        if (msg === "취소") {
            session.waitAction = null; session.targetUser = null;
            return replier.reply(UI.make("시스템", "❌ 작업이 취소되었습니다.", ".메뉴 입력 시 메인으로 이동"));
        }

        // [공통: 메뉴 호출]
        if (msg === Config.Prefix + "메뉴") {
            return replier.reply(UI.renderMenu(session));
        }

        // 🛡️ [분기 1: 관리자 전용]
        if (session.type === "ADMIN") {
            return AdminManager.handle(msg, session, replier);
        }

        // [분기 2: 개인톡 전용]
        if (session.type === "DIRECT") {
            // 로그인 전 단계
            if (!session.data) {
                if (session.waitAction) return AuthManager.handle(msg, session, replier);
                if (msg === "1") { session.waitAction = "가입_ID"; return replier.reply(UI.make("회원가입", "📝 가입하실 아이디를 입력해주세요.", "아이디 입력")); }
                if (msg === "2") { session.waitAction = "로그인_ID"; return replier.reply(UI.make("로그인", "🔑 로그인 아이디를 입력해주세요.", "아이디 입력")); }
            } 
            // 로그인 후 메인메뉴 단계
            else {
                if (msg === "1") {
                    var info = "👤 소환사: " + session.tempId + "\n🎖 레벨: " + session.data.level + "\n💰 골드: " + session.data.gold;
                    return replier.reply(UI.make("내 정보", info, "돌아가려면 '취소' 또는 '.메뉴'"));
                }
                if (msg === "4") {
                    session.data = null; session.tempId = null;
                    return replier.reply(UI.make("로그아웃", "✅ 로그아웃 되었습니다.", ".메뉴 입력 시 다시 접속 가능"));
                }
            }
        }

    } catch (e) {
        // 에러 발생 시 관리자방 보고
        var errInfo = "[🚨 에러]\n방: " + room + "\n내용: " + e.message + "\n줄: " + e.lineNumber;
        Api.replyTo(Config.AdminRoom, UI.make("시스템 에러", errInfo, "관리자 확인 필요"));
        replier.reply(UI.make("시스템 에러", "🚨 처리 중 오류가 발생했습니다.", "관리자에게 에러 로그가 전송되었습니다."));
    }
}
