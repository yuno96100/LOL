/**
 * [main.js] v4.0.0
 * 관리자 통합 제어 시스템 (유저 관리, 백업, 전역 에러 트래킹)
 */

// ㅡㅡㅡㅡㅡㅡㅡ [1. 모듈: 설정 및 상수] ㅡㅡㅡㅡㅡㅡㅡ
var Config = {
    Prefix: ".",
    AdminHash: "2056407147",
    AdminRoom: "관리자 전용방", // 실제 관리자방 이름과 일치시켜주세요
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
    renderMenu: function(roomType) {
        if (roomType === "ADMIN") {
            return this.make("관리자 센터", "1. 시스템 상태\n2. 유저 목록 조회\n3. 전체 데이터 백업", "관리 번호를 입력하세요.");
        } 
        return this.make("메인 메뉴", "1. 회원가입\n2. 로그인", "번호 입력 또는 '취소'");
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [3. 모듈: 데이터베이스 엔진] ㅡㅡㅡㅡㅡㅡㅡ
var Database = {
    data: {},
    load: function() {
        var file = new java.io.File(Config.DB_PATH);
        if (!file.exists()) return {};
        try { return JSON.parse(FileStream.read(Config.DB_PATH)); }
        catch(e) { return {}; }
    },
    save: function(data) {
        this.data = data;
        new java.lang.Thread(function() {
            try {
                var content = JSON.stringify(data, null, 4);
                FileStream.write(Config.DB_PATH, content);
                FileStream.copy(Config.DB_PATH, Config.BACKUP_PATH);
            } catch (e) { Log.error("DB 저장 실패: " + e); }
        }).start();
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [4. 모듈: 관리자 액션 매니저] ㅡㅡㅡㅡㅡㅡㅡ
var AdminManager = {
    // 유저 상세 관리 핸들러
    handleUserControl: function(msg, session, replier) {
        var targetId = session.targetUser;
        if (!Database.data[targetId]) return replier.reply(UI.make("에러", "존재하지 않는 유저입니다.", "목록으로 돌아가려면 '취소'"));

        if (msg === "1") { // 정보 조회
            var u = Database.data[targetId];
            var info = "🆔 아이디: " + targetId + "\n🔐 비번: " + u.pw + "\n🎖 레벨: " + u.level + "\n💰 골드: " + u.gold;
            return replier.reply(UI.make("유저 정보", info, "1.조회 2.초기화 3.삭제"));
        }
        if (msg === "2") { // 초기화
            Database.data[targetId].level = 1;
            Database.data[targetId].gold = 1000;
            Database.save(Database.data);
            return replier.reply(UI.make("관리", targetId + " 유저 초기화 완료", "데이터가 기본값으로 변경됨"));
        }
        if (msg === "3") { // 삭제
            delete Database.data[targetId];
            Database.save(Database.data);
            session.waitAction = "관리자_유저목록";
            return replier.reply(UI.make("관리", targetId + " 유저 삭제 완료", "유저 데이터가 파기되었습니다."));
        }
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [5. 전역 초기화 및 에러 트래커] ㅡㅡㅡㅡㅡㅡㅡ
if (!global.sessions) global.sessions = {};
Database.data = Database.load();

function reportError(e, room, sender) {
    var errorMsg = "[🚨 에러 리포트]\n📍 위치: " + room + "\n👤 발신: " + sender + "\n📝 내용: " + e.message + "\n🔢 라인: " + e.lineNumber;
    // 관리자방으로 에러 전송 (Api.replyTo 혹은 특정 전송 로직 필요)
    Api.replyTo(Config.AdminRoom, UI.make("시스템 에러", errorMsg, "즉시 점검이 필요합니다."));
}

// ㅡㅡㅡㅡㅡㅡㅡ [6. 메인 응답 함수] ㅡㅡㅡㅡㅡㅡㅡ
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (!msg) return;
    msg = msg.trim();
    var hash = String(imageDB.getProfileHash());
    var sessionKey = sender + "@" + room;
    
    if (!global.sessions[sessionKey]) {
        var type = (room === Config.AdminRoom && hash === Config.AdminHash) ? "ADMIN" : (isGroupChat ? "GROUP" : "DIRECT");
        global.sessions[sessionKey] = { isMenuOpen: false, data: null, waitAction: null, type: type };
    }
    var session = global.sessions[sessionKey];

    try {
        if (msg === "취소") {
            session.isMenuOpen = false; session.waitAction = null; session.targetUser = null;
            return replier.reply(UI.make("시스템", "❌ 작업이 중단되었습니다.", ".메뉴 입력"));
        }

        // ㅡㅡㅡㅡㅡㅡㅡ [관리자 전용 로직] ㅡㅡㅡㅡㅡㅡㅡ
        if (session.type === "ADMIN") {
            if (msg === Config.Prefix + "메뉴") {
                session.isMenuOpen = true;
                return replier.reply(UI.renderMenu("ADMIN"));
            }

            if (session.isMenuOpen || session.waitAction) {
                // 1. 유저 목록 출력 및 선택 대기
                if (msg === "2" || session.waitAction === "관리자_유저목록") {
                    var list = Object.keys(Database.data);
                    var content = list.length > 0 ? list.map(function(id, idx){ return (idx+1) + ". " + id; }).join("\n") : "유저가 없습니다.";
                    session.waitAction = "관리자_유저선택";
                    return replier.reply(UI.make("유저 목록", content, "관리할 유저의 [아이디]를 입력하세요."));
                }
                
                // 2. 특정 유저 선택됨 -> 하위 메뉴 진입
                if (session.waitAction === "관리자_유저선택") {
                    if (Database.data[msg]) {
                        session.targetUser = msg;
                        session.waitAction = "관리자_유저제어";
                        return replier.reply(UI.make("유저 관리: " + msg, "1. 정보조회\n2. 데이터 초기화\n3. 계정 삭제", "번호를 입력하세요."));
                    }
                }

                // 3. 유저 제어 액션 실행
                if (session.waitAction === "관리자_유저제어") {
                    return AdminManager.handleUserControl(msg, session, replier);
                }

                // 시스템 상태 및 백업
                if (msg === "1") return replier.reply(UI.make("시스템 상태", "⚙️ 엔진: v4.0.0\n📂 DB 크기: " + JSON.stringify(Database.data).length + " bytes\n🌐 세션: " + Object.keys(global.sessions).length, "정상 가동 중"));
                if (msg === "3") { Database.save(Database.data); return replier.reply(UI.make("시스템", "📦 전체 데이터 백업 완료", "경로: " + Config.BACKUP_PATH)); }
            }
        }

        // ㅡㅡㅡㅡㅡㅡㅡ [일반 유저 로직 (이전과 동일)] ㅡㅡㅡㅡㅡㅡㅡ
        if (msg === Config.Prefix + "메뉴") {
            session.isMenuOpen = true;
            return replier.reply(UI.renderMenu(session.type));
        }
        // ... (회원가입/로그인 로직 생략 없이 기존 엔진 활용 가능)

    } catch (e) {
        reportError(e, room, sender); // 에러 발생 시 관리자방 보고
        replier.reply(UI.make("시스템 에러", "🚨 처리 중 오류가 발생했습니다.", "관리자에게 에러 로그가 전송되었습니다."));
    }
}
