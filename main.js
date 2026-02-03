/**
 * [main.js] v4.9.3
 * 유저 관리 내 문의 답변 통합 및 관리자 인터페이스 개선
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
        if (help) base += "\n💬 " + help;
        return base;
    },
    renderMenu: function(session) {
        if (session.type === "ADMIN") {
            return this.make("관리자 센터", "1. 시스템 상태\n2. 유저 목록 관리\n3. 데이터 백업", "유저를 선택하여 문의 답변을 보낼 수 있습니다.");
        }
        if (!session.data) {
            return this.make(Config.BotName, "1. 회원가입\n2. 로그인\n3. 고객 센터 (문의하기)", "계정 분실 문의는 3번을 이용하세요.");
        } else {
            return this.make("메인 메뉴", "👤 소환사: [" + session.tempId + "]\n" + Config.LINE + "\n1. 내 정보 보기\n2. 상점 이용 (준비중)\n3. 모험 떠나기 (준비중)\n4. 로그아웃\n5. 1:1 문의하기", "기능 번호를 입력하세요.");
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

// ㅡㅡㅡㅡㅡㅡㅡ [4. 모듈: 세션 매니저] ㅡㅡㅡㅡㅡㅡㅡ
var SessionManager = {
    sessions: {},
    get: function(room, hash, isGroupChat) {
        if (!this.sessions[hash]) {
            this.sessions[hash] = { 
                data: null, waitAction: null, tempId: null, 
                targetUser: null, targetHash: null,
                lastRoom: room, userListCache: [], userHashCache: {} 
            };
        }
        var s = this.sessions[hash];
        s.lastRoom = room; 
        if (room === Config.AdminRoom && hash === Config.AdminHash) s.type = "ADMIN";
        else if (isGroupChat && room === Config.GroupRoom) s.type = "GROUP";
        else if (!isGroupChat) s.type = "DIRECT";
        else s.type = "OTHER";
        return s;
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [5. 모듈: 비즈니스 로직] ㅡㅡㅡㅡㅡㅡㅡ

var AdminManager = {
    handle: function(msg, session, replier) {
        if (!session.waitAction) {
            if (msg === "1") return replier.reply(UI.make("시스템 상태", "⚙️ v4.9.3\n📂 등록 유저: " + Object.keys(Database.data).length + "명"));
            if (msg === "2") {
                var list = Object.keys(Database.data);
                if (list.length === 0) return replier.reply(UI.make("유저 관리", "가입된 유저가 없습니다."));
                session.userListCache = list;
                var content = list.map(function(id, idx) { return (idx + 1) + ". " + id; }).join("\n");
                session.waitAction = "관리_유저선택";
                return replier.reply(UI.make("유저 목록", content, "관리할 유저의 번호를 입력하세요."));
            }
            if (msg === "3") {
                FileStream.copy(Config.DB_PATH, Config.BACKUP_PATH);
                return replier.reply(UI.make("데이터 백업", "📦 전체 유저 데이터 백업 완료"));
            }
        }
        
        // 1. 유저 번호 선택
        if (session.waitAction === "관리_유저선택") {
            var idx = parseInt(msg) - 1;
            if (!isNaN(idx) && session.userListCache[idx]) {
                session.targetUser = session.userListCache[idx];
                session.waitAction = "관리_유저제어";
                return replier.reply(UI.make("제어: " + session.targetUser, "1. 정보조회\n2. 골드초기화\n3. 계정삭제\n4. 문의 답변 보내기", "취소 입력 시 목록으로"));
            }
            return replier.reply("올바른 번호를 입력해주세요.");
        }

        // 2. 유저 상세 제어 (조회, 초기화, 삭제, 답변 통합)
        if (session.waitAction === "관리_유저제어") {
            var tid = session.targetUser;
            if (msg === "1") return replier.reply(UI.make("유저 정보", JSON.stringify(Database.data[tid], null, 2)));
            if (msg === "2") {
                Database.data[tid].gold = 1000; Database.save(Database.data);
                return replier.reply(UI.make("완료", tid + " 소지금을 초기화했습니다."));
            }
            if (msg === "3") {
                delete Database.data[tid]; Database.save(Database.data);
                session.waitAction = "관리_유저선택";
                return replier.reply(UI.make("완료", tid + " 계정을 삭제했습니다."));
            }
            if (msg === "4") {
                session.waitAction = "문의_답변작성_해시확인";
                return replier.reply(UI.make("문의 답변", "답변을 전달할 유저의 [해시값]을 입력하세요.", "해시는 문의 알림 메시지에 포함되어 있습니다."));
            }
        }

        // 3. 답변 작성 프로세스
        if (session.waitAction === "문의_답변작성_해시확인") {
            session.targetHash = msg;
            session.waitAction = "문의_답변최종작성";
            return replier.reply(UI.make("답변 작성", "대상: " + session.targetUser + " (" + msg + ")", "전달할 답변 내용을 입력하세요."));
        }
        
        if (session.waitAction === "문의_답변최종작성") {
            var targetSession = SessionManager.sessions[session.targetHash];
            if (targetSession) {
                Api.replyTo(targetSession.lastRoom, UI.make("📩 관리자 문의 답변", msg, "추가 문의는 고객 센터 메뉴를 이용해주세요."));
                session.waitAction = "관리_유저제어"; // 다시 제어 메뉴로 복귀
                return replier.reply(UI.make("발송 완료", "성공적으로 답변이 전달되었습니다.", "계속해서 유저 관리가 가능합니다."));
            } else {
                session.waitAction = "관리_유저제어";
                return replier.reply("해당 해시의 세션을 찾을 수 없어 발송에 실패했습니다.");
            }
        }
    }
};

var AuthManager = {
    handle: function(msg, session, replier) {
        if (session.waitAction === "가입_ID") {
            if (Database.data[msg]) return replier.reply(UI.make("가입", "⚠️ 중복 ID"));
            session.tempId = msg; session.waitAction = "가입_PW";
            return replier.reply(UI.make("가입", "🔐 [" + msg + "] 비번 설정"));
        }
        if (session.waitAction === "가입_PW") {
            Database.data[session.tempId] = { pw: msg, level: 1, gold: 1000 };
            Database.save(Database.data); session.waitAction = null;
            return replier.reply(UI.make("완료", "가입 성공!"));
        }
        if (session.waitAction === "로그인_ID") {
            if (!Database.data[msg]) return replier.reply(UI.make("로그인", "❌ 없는 ID"));
            session.tempId = msg; session.waitAction = "로그인_PW";
            return replier.reply(UI.make("로그인", "🔑 [" + msg + "] 비번 입력"));
        }
        if (session.waitAction === "로그인_PW") {
            if (Database.data[session.tempId].pw === msg) {
                session.data = Database.data[session.tempId]; session.waitAction = null;
                return replier.reply(UI.renderMenu(session));
            }
        }
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [6. 메인 응답 핸들러] ㅡㅡㅡㅡㅡㅡㅡ
Database.data = Database.load();

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    if (!msg) return;
    msg = msg.trim();
    var hash = String(imageDB.getProfileHash());
    var session = SessionManager.get(room, hash, isGroupChat);

    try {
        if (msg === "취소" || msg === "돌아가기") {
            if (session.waitAction === "관리_유저제어") session.waitAction = "관리_유저선택";
            else if (session.waitAction === "문의_답변작성_해시확인" || session.waitAction === "문의_답변최종작성") session.waitAction = "관리_유저제어";
            else session.waitAction = null;
            return replier.reply(UI.renderMenu(session));
        }
        if (msg === Config.Prefix + "메뉴") { session.waitAction = null; return replier.reply(UI.renderMenu(session)); }

        if (session.type === "ADMIN") return AdminManager.handle(msg, session, replier);

        // 문의 작성 처리
        if (session.waitAction === "문의_내용작성") {
            var type = session.data ? "🟢 로그인 유저" : "⚪ 비로그인 유저";
            var senderLabel = session.data ? "ID: " + session.tempId : "닉네임: " + sender;
            var report = "📩 [" + type + " 문의]\n" + Config.LINE + "\n" + senderLabel + "\n발신지: " + room + "\n해시: " + hash + "\n내용: " + msg;
            Api.replyTo(Config.AdminRoom, UI.make("관리자 알림", report, "문의 답변은 [유저 목록 관리]에서 유저 선택 후 가능합니다."));
            session.waitAction = null;
            return replier.reply(UI.make("문의 접수 완료", "관리자에게 문의가 전달되었습니다."));
        }

        // 비로그인
        if (!session.data) {
            if (session.type === "DIRECT") {
                if (session.waitAction) return AuthManager.handle(msg, session, replier);
                if (msg === "1") { session.waitAction = "가입_ID"; return replier.reply(UI.make("가입", "아이디 입력")); }
                if (msg === "2") { session.waitAction = "로그인_ID"; return replier.reply(UI.make("로그인", "아이디 입력")); }
                if (msg === "3") { session.waitAction = "문의_내용작성"; return replier.reply(UI.make("고객 센터", "문의 내용 입력")); }
            }
            return replier.reply(UI.renderMenu(session));
        } 
        // 로그인 완료 유저
        else {
            if (msg === "1") return replier.reply(UI.make("내 정보", "👤 " + session.tempId + "\n💰 " + session.data.gold + "G"));
            if (msg === "4") { session.data = null; return replier.reply(UI.make("로그아웃", "완료")); }
            if (msg === "5") {
                if (session.type !== "DIRECT") return replier.reply(UI.make("알림", "개인톡에서 문의해주세요."));
                session.waitAction = "문의_내용작성";
                return replier.reply(UI.make("1:1 문의", "내용 입력"));
            }
        }
    } catch (e) { replier.reply(UI.make("에러", e.message)); }
}
