/**
 * [main.js] v4.5.1
 * 하단 명령어 가이드라인 강화 및 카테고리 격리 버전
 */

// ㅡㅡㅡㅡㅡㅡㅡ [1. 설정 및 상수] ㅡㅡㅡㅡㅡㅡㅡ
var Config = {
    Prefix: ".",
    AdminHash: "2056407147",      
    AdminName: "관리자",           
    AdminRoom: "소환사의협곡관리",   
    GroupRoom: "소환사의협곡",     
    BotName: "소환사의 협곡",
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",
    BACKUP_PATH: "/sdcard/msgbot/Bots/main/database.bak",
    LINE: "━━━━━━━━━━━━━━"
};

// ㅡㅡㅡㅡㅡㅡㅡ [2. 모듈: UI 엔진] ㅡㅡㅡㅡㅡㅡㅡ
var UI = {
    make: function(title, content, help) {
        var base = "『 " + title + " 』\n" + Config.LINE + "\n" + content + "\n" + Config.LINE;
        if (help) base += "\n💬 " + help; // 👈 하단 도움말 영역
        return base;
    },
    renderMenu: function(session) {
        if (session.type === "ADMIN") {
            return this.make("관리자 센터", "1. 시스템 상태\n2. 유저 목록 조회\n3. 전체 데이터 백업", "메뉴 번호를 입력하세요.");
        }
        if (session.type === "GROUP") {
            return this.make(Config.BotName, "📍 [" + Config.GroupRoom + "] 광장\n\n개인톡에서 로그인을 진행하시면 상점, 모험 등 모든 기능을 이용하실 수 있습니다.", "봇에게 개인 메시지를 보내보세요!");
        }
        if (!session.data) {
            return this.make(Config.BotName, "1. 회원가입\n2. 로그인", "번호를 입력하여 진행하세요.");
        } else {
            return this.make("메인 메뉴", "👤 [" + session.tempId + "] 소환사\n" + Config.LINE + "\n1. 내 정보 보기\n2. 상점 이용\n3. 모험 떠나기\n4. 로그아웃", "이동할 기능의 번호를 입력하세요.");
        }
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [3. 모듈: 데이터베이스] ㅡㅡㅡㅡㅡㅡㅡ
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

// ㅡㅡㅡㅡㅡㅡㅡ [4. 모듈: 관리자 엔진] ㅡㅡㅡㅡㅡㅡㅡ
var AdminManager = {
    handle: function(msg, session, replier) {
        // [상세 상태가 없을 때: 관리자 메인]
        if (!session.waitAction) {
            if (msg === "1") return replier.reply(UI.make("시스템 상태", "⚙️ v4.5.1\n📂 유저: " + Object.keys(Database.data).length + "명", "'취소'를 입력하면 메인으로 돌아갑니다."));
            if (msg === "2") {
                var list = Object.keys(Database.data);
                var content = list.length > 0 ? list.map(function(id, idx){ return (idx+1) + ". " + id; }).join("\n") : "가입된 유저가 없습니다.";
                session.waitAction = "관리_유저선택";
                return replier.reply(UI.make("유저 목록", content, "관리할 [아이디]를 입력하세요. (취소: 돌아가기)"));
            }
            if (msg === "3") { 
                FileStream.copy(Config.DB_PATH, Config.BACKUP_PATH); 
                return replier.reply(UI.make("시스템", "📦 데이터 백업 완료", "백업 파일이 생성되었습니다.")); 
            }
        }

        // [상태: 유저 아이디 입력 대기]
        if (session.waitAction === "관리_유저선택") {
            if (Database.data[msg]) {
                session.targetUser = msg;
                session.waitAction = "관리_유저제어";
                return replier.reply(UI.make("제어: " + msg, "1. 가입정보 조회\n2. 데이터 초기화\n3. 계정 삭제", "번호 선택 (취소: 목록으로)"));
            }
            if (msg !== "2") return replier.reply(UI.make("알림", "해당 아이디를 찾을 수 없습니다.", "정확한 아이디를 입력하거나 '취소'하세요."));
        }

        // [상태: 유저 상세 제어]
        if (session.waitAction === "관리_유저제어") {
            var tid = session.targetUser;
            if (msg === "1") return replier.reply(UI.make("조회: " + tid, JSON.stringify(Database.data[tid], null, 2), "1.조회 2.초기화 3.삭제 (취소: 목록)"));
            if (msg === "2") {
                Database.data[tid].gold = 1000; Database.save(Database.data);
                return replier.reply(UI.make("관리", tid + " 초기화 완료", "기본 자산으로 재설정되었습니다."));
            }
            if (msg === "3") {
                delete Database.data[tid]; Database.save(Database.data);
                session.waitAction = "관리_유저선택";
                return replier.reply(UI.make("관리", tid + " 삭제 완료", "유저 목록으로 돌아왔습니다."));
            }
        }
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [5. 모듈: 인증 매니저] ㅡㅡㅡㅡㅡㅡㅡ
var AuthManager = {
    handle: function(msg, session, replier) {
        if (session.waitAction === "가입_ID") {
            if (Database.data[msg]) return replier.reply(UI.make("회원가입", "⚠️ 중복 아이디입니다.", "다른 아이디를 입력하세요."));
            session.tempId = msg; session.waitAction = "가입_PW";
            return replier.reply(UI.make("회원가입", "📝 ID: " + msg + "\n🔐 비밀번호를 설정해주세요.", "비밀번호를 입력하세요."));
        }
        if (session.waitAction === "가입_PW") {
            Database.data[session.tempId] = { pw: msg, level: 1, gold: 1000 };
            Database.save(Database.data); session.waitAction = null;
            return replier.reply(UI.make("회원가입", "✨ 가입 성공!", "2번을 눌러 로그인을 진행하세요."));
        }
        if (session.waitAction === "로그인_ID") {
            if (!Database.data[msg]) return replier.reply(UI.make("로그인", "❌ 존재하지 않는 ID", "아이디를 확인하거나 가입하세요."));
            session.tempId = msg; session.waitAction = "로그인_PW";
            return replier.reply(UI.make("로그인", "🔑 ID: " + msg + "\n비밀번호를 입력하세요.", "비밀번호 입력 대기 중..."));
        }
        if (session.waitAction === "로그인_PW") {
            if (Database.data[session.tempId].pw === msg) {
                session.data = Database.data[session.tempId]; session.waitAction = null;
                return replier.reply(UI.renderMenu(session));
            }
            return replier.reply(UI.make("로그인", "❌ 비밀번호 불일치", "비밀번호를 다시 입력하거나 '취소'하세요."));
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
        if (room === Config.AdminRoom && hash === Config.AdminHash) type = "ADMIN";
        else if (isGroupChat && room === Config.GroupRoom) type = "GROUP";
        global.sessions[sessionKey] = { isMenuOpen: false, data: null, waitAction: null, type: type, tempId: null, targetUser: null };
    }
    var session = global.sessions[sessionKey];

    try {
        // [정보 조회]
        if (msg === Config.Prefix + "정보조회") {
            return replier.reply(UI.make("디버그", "방: " + room + "\n해시: " + hash, "관리자 설정용 정보입니다."));
        }

        // [취소/돌아가기 공통]
        if (msg === "취소" || msg === "돌아가기") {
            if (session.waitAction === "관리_유저제어") session.waitAction = "관리_유저선택";
            else session.waitAction = null;
            session.targetUser = null;
            return replier.reply(UI.renderMenu(session));
        }

        if (msg === Config.Prefix + "메뉴") {
            session.waitAction = null;
            return replier.reply(UI.renderMenu(session));
        }

        // 카테고리별 핸들링
        if (session.type === "ADMIN") return AdminManager.handle(msg, session, replier);

        if (session.type === "DIRECT") {
            if (!session.data) {
                if (session.waitAction) return AuthManager.handle(msg, session, replier);
                if (msg === "1") { session.waitAction = "가입_ID"; return replier.reply(UI.make("회원가입", "📝 가입할 아이디를 입력하세요.", "취소하려면 '취소' 입력")); }
                if (msg === "2") { session.waitAction = "로그인_ID"; return replier.reply(UI.make("로그인", "🔑 아이디를 입력하세요.", "취소하려면 '취소' 입력")); }
            } else {
                if (msg === "1") return replier.reply(UI.make("내 정보", "👤 " + session.tempId + "\n💰 " + session.data.gold + "G", "'돌아가기'를 입력하면 메뉴로 이동합니다."));
                if (msg === "4") { session.data = null; return replier.reply(UI.make("로그아웃", "✅ 안전하게 로그아웃되었습니다.", ".메뉴를 입력해 다시 접속하세요.")); }
            }
        }
    } catch (e) {
        replier.reply(UI.make("에러", "🚨 오류 발생: " + e.message, "관리자에게 문의 바랍니다."));
    }
}
