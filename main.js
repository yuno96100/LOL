/**
 * [main.js] v5.0.0
 * 명령어 카테고리 독립 작동 및 전 기능 통합 버전
 */

// ㅡㅡㅡㅡㅡㅡㅡ [1. 설정 및 상수] ㅡㅡㅡㅡㅡㅡㅡ
var Config = {
    Prefix: ".",
    AdminHash: "2056407147",      
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
            return this.make("관리자 센터", "1. 시스템 상태\n2. 유저 목록 관리\n3. 데이터 백업", "원하는 번호를 입력하세요.");
        }
        if (!session.data) {
            return this.make(Config.BotName, "1. 회원가입\n2. 로그인\n3. 고객 센터 (문의하기)", "로그인 후 이용 가능합니다.");
        } else {
            return this.make("메인 메뉴", "👤 소환사: [" + session.tempId + "]\n" + Config.LINE + "\n1. 내 정보 보기\n2. 상점 이용 (준비중)\n3. 모험 떠나기 (준비중)\n4. 로그아웃\n5. 1:1 문의하기", "기능 번호를 입력하세요.");
        }
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [3. 모듈: 데이터베이스 및 세션] ㅡㅡㅡㅡㅡㅡㅡ
var Database = {
    data: {},
    load: function() {
        var file = new java.io.File(Config.DB_PATH);
        if (!file.exists()) return {};
        try { 
            var content = FileStream.read(Config.DB_PATH);
            return content ? JSON.parse(content) : {}; 
        } catch(e) { return {}; }
    },
    save: function(data) {
        this.data = data;
        new java.lang.Thread(function() {
            try { FileStream.write(Config.DB_PATH, JSON.stringify(data, null, 4)); } catch (e) {}
        }).start();
    }
};

var SessionManager = {
    sessions: {},
    idToHash: {}, 
    get: function(room, hash, isGroupChat) {
        if (!this.sessions[hash]) {
            this.sessions[hash] = { data: null, waitAction: null, tempId: null, targetUser: null, lastRoom: room, userListCache: [] };
        }
        var s = this.sessions[hash];
        s.lastRoom = room; 
        if (room === Config.AdminRoom || hash === Config.AdminHash) s.type = "ADMIN";
        else if (isGroupChat && room === Config.GroupRoom) s.type = "GROUP";
        else if (!isGroupChat) s.type = "DIRECT";
        else s.type = "OTHER";
        return s;
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [4. 모듈: 비즈니스 로직 (관리자)] ㅡㅡㅡㅡㅡㅡㅡ
var AdminManager = {
    handle: function(msg, session, replier) {
        // [카테고리: 관리자 메인]
        if (!session.waitAction) {
            if (msg === "1") return replier.reply(UI.make("시스템 상태", "⚙️ v5.0.0\n📂 등록 유저: " + Object.keys(Database.data).length + "명"));
            if (msg === "2") {
                var list = Object.keys(Database.data);
                if (list.length === 0) return replier.reply(UI.make("유저 관리", "가입된 유저가 없습니다."));
                session.userListCache = list;
                var content = list.map(function(id, idx) { return (idx + 1) + ". " + id; }).join("\n");
                session.waitAction = "관리_유저선택";
                return replier.reply(UI.make("유저 목록", content, "[번호] 입력 (취소: 단계취소 / 돌아가기: 메뉴)"));
            }
            if (msg === "3") {
                FileStream.copy(Config.DB_PATH, Config.BACKUP_PATH);
                return replier.reply(UI.make("데이터 백업", "📦 백업 완료"));
            }
            return; 
        }
        
        // [카테고리: 유저 선택]
        if (session.waitAction === "관리_유저선택") {
            var idx = parseInt(msg) - 1;
            if (!isNaN(idx) && session.userListCache[idx]) {
                session.targetUser = session.userListCache[idx];
                session.waitAction = "관리_유저제어";
                return replier.reply(UI.make("제어: " + session.targetUser, "1. 정보조회\n2. 골드초기화\n3. 계정삭제\n4. 문의 답변 보내기", "취소 입력 시 목록으로"));
            }
            return replier.reply("목록에 있는 번호를 입력해주세요.");
        }

        // [카테고리: 유저 제어 상세]
        if (session.waitAction === "관리_유저제어") {
            var tid = session.targetUser;
            if (msg === "1") return replier.reply(UI.make("유저 정보", JSON.stringify(Database.data[tid], null, 2)));
            if (msg === "2") {
                Database.data[tid].gold = 1000; Database.save(Database.data);
                return replier.reply(UI.make("완료", tid + " 초기화 완료"));
            }
            if (msg === "3") {
                delete Database.data[tid]; Database.save(Database.data);
                session.waitAction = "관리_유저선택";
                return replier.reply(UI.make("완료", tid + " 삭제 완료"));
            }
            if (msg === "4") {
                session.waitAction = "문의_답변최종작성";
                return replier.reply(UI.make("문의 답변", "대상: " + tid, "답변 내용을 입력하세요."));
            }
            return;
        }

        // [카테고리: 문의 답변 작성]
        if (session.waitAction === "문의_답변최종작성") {
            var targetId = session.targetUser;
            var targetHash = SessionManager.idToHash[targetId];
            var targetSession = targetHash ? SessionManager.sessions[targetHash] : null;
            if (targetSession) {
                Api.replyTo(targetSession.lastRoom, UI.make("📩 관리자 문의 답변", msg, "고객 센터를 이용해 주셔서 감사합니다."));
                session.waitAction = "관리_유저제어";
                return replier.reply(UI.make("발송 완료", targetId + "에게 답변을 보냈습니다."));
            }
            session.waitAction = "관리_유저제어";
            return replier.reply("대상 유저의 세션을 찾을 수 없습니다.");
        }
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [5. 모듈: 비즈니스 로직 (유저 인증)] ㅡㅡㅡㅡㅡㅡㅡ
var AuthManager = {
    handle: function(msg, session, replier, hash) {
        if (session.waitAction === "가입_ID") {
            if (Database.data[msg]) return replier.reply(UI.make("가입 실패", "⚠️ 이미 존재하는 아이디입니다."));
            session.tempId = msg; session.waitAction = "가입_PW";
            return replier.reply(UI.make("가입 진행", "🔐 [" + msg + "] 님의 비밀번호를 설정하세요."));
        }
        if (session.waitAction === "가입_PW") {
            Database.data[session.tempId] = { pw: msg, gold: 1000, level: 1 };
            Database.save(Database.data); session.waitAction = null;
            return replier.reply(UI.make("가입 완료", "✨ 회원가입 성공! 이제 로그인해 주세요."));
        }
        if (session.waitAction === "로그인_ID") {
            if (!Database.data[msg]) return replier.reply(UI.make("로그인 실패", "❌ 존재하지 않는 아이디입니다."));
            session.tempId = msg; session.waitAction = "로그인_PW";
            return replier.reply(UI.make("로그인 진행", "🔑 [" + msg + "] 님의 비밀번호를 입력하세요."));
        }
        if (session.waitAction === "로그인_PW") {
            if (Database.data[session.tempId].pw === msg) {
                session.data = Database.data[session.tempId];
                session.waitAction = null;
                SessionManager.idToHash[session.tempId] = hash;
                return replier.reply(UI.renderMenu(session));
            }
            return replier.reply("비밀번호가 일치하지 않습니다.");
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
        // [공통 명령어: 돌아가기/취소]
        if (msg === "돌아가기" || msg === Config.Prefix + "메뉴" || msg === Config.Prefix + "문의") {
            session.waitAction = null;
            return replier.reply(UI.renderMenu(session));
        }

        if (msg === "취소") {
            if (session.waitAction === "관리_유저제어") session.waitAction = "관리_유저선택";
            else if (session.waitAction === "문의_답변최종작성") session.waitAction = "관리_유저제어";
            else session.waitAction = null;
            return replier.reply(UI.make("알림", "이전 단계로 취소되었습니다."));
        }

        // [카테고리 1: 관리자]
        if (session.type === "ADMIN") return AdminManager.handle(msg, session, replier);

        // [카테고리 2: 비로그인 유저]
        if (!session.data) {
            // 입력 대기 상태(가입/로그인/문의내용)인 경우 해당 로직만 수행
            if (session.waitAction === "문의_내용작성") {
                SessionManager.idToHash[sender] = hash;
                Api.replyTo(Config.AdminRoom, UI.make("관리자 알림", "📩 [비로그인] " + sender + "\n내용: " + msg));
                session.waitAction = null;
                return replier.reply(UI.make("문의 완료", "관리자에게 전달되었습니다."));
            }
            if (session.waitAction) return AuthManager.handle(msg, session, replier, hash);

            // 초기 메뉴 선택
            if (session.type === "DIRECT") {
                if (msg === "1") { session.waitAction = "가입_ID"; return replier.reply(UI.make("회원가입", "생성할 아이디를 입력하세요.")); }
                if (msg === "2") { session.waitAction = "로그인_ID"; return replier.reply(UI.make("로그인", "아이디를 입력하세요.")); }
                if (msg === "3") { session.waitAction = "문의_내용작성"; return replier.reply(UI.make("고객 센터", "문의 내용을 입력하세요.")); }
            }
            return replier.reply(UI.renderMenu(session));
        } 
        
        // [카테고리 3: 로그인 유저]
        else {
            if (session.waitAction === "문의_내용작성") {
                SessionManager.idToHash[session.tempId] = hash;
                Api.replyTo(Config.AdminRoom, UI.make("관리자 알림", "📩 [로그인 유저] " + session.tempId + "\n내용: " + msg));
                session.waitAction = null;
                return replier.reply(UI.make("문의 완료", "관리자에게 전달되었습니다."));
            }

            if (msg === "1") return replier.reply(UI.make("내 정보", "👤 소환사: " + session.tempId + "\n💰 소지금: " + (session.data.gold || 0).toLocaleString() + "G"));
            if (msg === "4") {
                delete SessionManager.idToHash[session.tempId];
                session.data = null; session.tempId = null;
                return replier.reply(UI.make("로그아웃", "정상적으로 로그아웃되었습니다."));
            }
            if (msg === "5") {
                if (session.type !== "DIRECT") return replier.reply(UI.make("알림", "1:1 문의는 개인톡에서만 가능합니다."));
                session.waitAction = "문의_내용작성";
                return replier.reply(UI.make("1:1 문의하기", "문의 내용을 입력하세요."));
            }
            
            // 정의되지 않은 번호 입력 시 메뉴 재출력 (독립성 유지)
            if (msg.match(/^[0-9]$/)) return replier.reply(UI.renderMenu(session));
        }

    } catch (e) {
        replier.reply("오류가 발생했습니다: " + e.message);
    }
}
