/**
 * [main.js] v4.6.1
 * 로직별 모듈 분리 및 객체 지향 레이아웃
 */

// ㅡㅡㅡㅡㅡㅡㅡ [STEP 1. 환경 설정 영역] ㅡㅡㅡㅡㅡㅡㅡ
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

// ㅡㅡㅡㅡㅡㅡㅡ [STEP 2. 시스템 엔진 모듈] ㅡㅡㅡㅡㅡㅡㅡ
var System = {
    UI: {
        make: function(title, content, help) {
            var base = "『 " + title + " 』\n" + Config.LINE + "\n" + content + "\n" + Config.LINE;
            if (help) base += "\n💬 " + help;
            return base;
        },
        render: function(session) {
            if (session.type === "ADMIN") return this.make("관리자 센터", "1. 시스템 상태\n2. 유저 목록 조회\n3. 전체 데이터 백업", "번호를 입력하세요.");
            if (session.type === "GROUP") return this.make(Config.BotName, "📍 [" + Config.GroupRoom + "] 광장\n개인톡에서 로그인을 진행해주세요.", "봇에게 개인 메시지 전송");
            if (!session.data) return this.make(Config.BotName, "1. 회원가입\n2. 로그인", "가입 또는 로그인을 선택하세요.");
            return this.make("메인 메뉴", "👤 [" + session.tempId + "]\n1. 내 정보 보기\n2. 상점 이용\n3. 모험 떠나기\n4. 로그아웃", "번호를 선택하세요.");
        }
    },
    DB: {
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
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [STEP 3. 비즈니스 로직 모듈] ㅡㅡㅡㅡㅡㅡㅡ

// [3-1. 관리자 로직]
var AdminLogic = {
    handle: function(msg, session, replier) {
        if (!session.waitAction) {
            if (msg === "1") return replier.reply(System.UI.make("시스템 상태", "⚙️ v4.6.1\n📂 유저: " + Object.keys(System.DB.data).length + "명", "취소 입력 시 메뉴로"));
            if (msg === "2") {
                var list = Object.keys(System.DB.data);
                var content = list.length > 0 ? list.map(function(id, i){ return (i+1) + ". " + id; }).join("\n") : "유저 없음";
                session.waitAction = "관리_유저선택";
                return replier.reply(System.UI.make("유저 목록", content, "아이디 입력 (취소: 돌아가기)"));
            }
            if (msg === "3") { FileStream.copy(Config.DB_PATH, Config.BACKUP_PATH); return replier.reply(System.UI.make("시스템", "📦 백업 완료", "안전하게 저장됨")); }
        }
        if (session.waitAction === "관리_유저선택") {
            if (System.DB.data[msg]) {
                session.targetUser = msg; session.waitAction = "관리_유저제어";
                return replier.reply(System.UI.make("제어: " + msg, "1. 정보조회\n2. 초기화\n3. 삭제", "번호 선택 (취소: 목록으로)"));
            }
        }
        if (session.waitAction === "관리_유저제어") {
            var tid = session.targetUser;
            if (msg === "1") return replier.reply(System.UI.make("정보: " + tid, JSON.stringify(System.DB.data[tid], null, 2), "1.조회 2.초기화 3.삭제"));
            if (msg === "2") { System.DB.data[tid].gold = 1000; System.DB.save(System.DB.data); return replier.reply(System.UI.make("관리", tid + " 초기화 완료")); }
            if (msg === "3") { delete System.DB.data[tid]; System.DB.save(System.DB.data); session.waitAction = "관리_유저선택"; return replier.reply(System.UI.make("관리", tid + " 삭제 완료")); }
        }
    }
};

// [3-2. 인증 로직]
var AuthLogic = {
    handle: function(msg, session, replier) {
        if (session.waitAction === "가입_ID") {
            if (System.DB.data[msg]) return replier.reply(System.UI.make("회원가입", "⚠️ 중복 아이디", "다른 아이디 입력"));
            session.tempId = msg; session.waitAction = "가입_PW";
            return replier.reply(System.UI.make("회원가입", "🔐 [" + msg + "] 비번 설정", "비밀번호 입력"));
        }
        if (session.waitAction === "가입_PW") {
            System.DB.data[session.tempId] = { pw: msg, level: 1, gold: 1000 };
            System.DB.save(System.DB.data); session.waitAction = null;
            return replier.reply(System.UI.make("회원가입", "✨ 완료", "2번 눌러 로그인"));
        }
        if (session.waitAction === "로그인_ID") {
            if (!System.DB.data[msg]) return replier.reply(System.UI.make("로그인", "❌ 없는 ID", "아이디 확인"));
            session.tempId = msg; session.waitAction = "로그인_PW";
            return replier.reply(System.UI.make("로그인", "🔑 [" + msg + "] 비번 입력", "비밀번호 입력"));
        }
        if (session.waitAction === "로그인_PW") {
            if (System.DB.data[session.tempId].pw === msg) {
                session.data = System.DB.data[session.tempId]; session.waitAction = null;
                return replier.reply(System.UI.render(session));
            }
            return replier.reply(System.UI.make("로그인", "❌ 비번 틀림", "다시 입력 또는 취소"));
        }
    }
};

// [3-3. 게임/메뉴 로직]
var GameLogic = {
    handle: function(msg, session, replier) {
        if (msg === "1") return replier.reply(System.UI.make("내 정보", "👤 " + session.tempId + "\n💰 " + session.data.gold + "G", "돌아가기 입력 시 메뉴로"));
        if (msg === "4") { session.data = null; return replier.reply(System.UI.make("로그아웃", "✅ 완료")); }
        // 🆕 상점(2), 모험(3) 로직이 추가될 자리
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [STEP 4. 메인 컨트롤러] ㅡㅡㅡㅡㅡㅡㅡ
if (!global.sessions) global.sessions = {};
System.DB.data = System.DB.load();

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    if (!msg) return;
    msg = msg.trim();
    var hash = String(imageDB.getProfileHash());
    var sessionKey = sender + "@" + room;
    
    if (!global.sessions[sessionKey]) {
        var type = "DIRECT";
        if (room === Config.AdminRoom && hash === Config.AdminHash) type = "ADMIN";
        else if (isGroupChat && room === Config.GroupRoom) type = "GROUP";
        global.sessions[sessionKey] = { data: null, waitAction: null, type: type, tempId: null, targetUser: null };
    }
    var session = global.sessions[sessionKey];

    try {
        if (msg === Config.Prefix + "정보조회") return replier.reply(System.UI.make("디버그", "방: " + room + "\n해시: " + hash));
        if (msg === "취소" || msg === "돌아가기") {
            if (session.waitAction === "관리_유저제어") session.waitAction = "관리_유저선택";
            else session.waitAction = null;
            return replier.reply(System.UI.render(session));
        }
        if (msg === Config.Prefix + "메뉴") { session.waitAction = null; return replier.reply(System.UI.render(session)); }

        // 로직 배분
        if (session.type === "ADMIN") return AdminLogic.handle(msg, session, replier);
        if (session.type === "DIRECT") {
            if (!session.data) return AuthLogic.handle(msg, session, replier);
            return GameLogic.handle(msg, session, replier);
        }
    } catch (e) {
        var errInfo = "[🚨 에러] " + room + " | " + e.message + " (L:" + e.lineNumber + ")";
        Api.replyTo(Config.AdminRoom, System.UI.make("시스템 에러", errInfo));
        replier.reply(System.UI.make("에러", "🚨 오류 발생. 관리자에게 로그가 전송되었습니다."));
    }
}
