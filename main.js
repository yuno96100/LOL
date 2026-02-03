/**
 * [main.js] v5.2.0
 * 최상위 카테고리(메인 메뉴) 통일 및 하위 단계 제어 강화
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
        // [1] 관리자 메뉴
        if (session.type === "ADMIN") {
            return this.make("관리자 메뉴", "1. 시스템 상태\n2. 유저 목록 관리\n3. 데이터 백업", "원하는 번호를 입력하세요.");
        }
        // [2] 단체톡방 메인 메뉴
        if (session.type === "GROUP") {
            if (!session.data) return this.make(Config.BotName, "개인톡에서 로그인을 먼저 해주세요.", "개인톡: " + Config.BotName);
            return this.make("메인 메뉴", "1. 내 정보\n2. 상점 이용\n3. 모험 떠나기\n4. 랭킹 확인", "단체 활동 공간입니다.");
        }
        // [3] 개인톡방 메인 메뉴
        if (session.type === "DIRECT") {
            if (!session.data) return this.make("메인 메뉴", "1. 회원가입\n2. 로그인\n3. 1:1 문의하기", "개인 용무를 처리하는 공간입니다.");
            return this.make("메인 메뉴", "1. 내 정보\n2. 비밀번호 변경\n3. 로그아웃\n4. 1:1 문의하기", "계정 및 개인 설정을 관리합니다.");
        }
        return "사용할 수 없는 공간입니다.";
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [3. 모듈: 데이터베이스 및 세션] ㅡㅡㅡㅡㅡㅡㅡ
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

var SessionManager = {
    sessions: {},
    idToHash: {}, 
    get: function(room, hash, isGroupChat) {
        if (!this.sessions[hash]) {
            this.sessions[hash] = { data: null, waitAction: null, tempId: null, targetUser: null, lastRoom: room, userListCache: [] };
        }
        var s = this.sessions[hash];
        s.lastRoom = room; 
        if (room === Config.AdminRoom) s.type = "ADMIN";
        else if (isGroupChat && room === Config.GroupRoom) s.type = "GROUP";
        else if (!isGroupChat) s.type = "DIRECT";
        else s.type = "OTHER";
        return s;
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [4. 모듈: 비즈니스 로직 (관리자)] ㅡㅡㅡㅡㅡㅡㅡ
var AdminManager = {
    handle: function(msg, session, replier) {
        if (!session.waitAction) {
            if (msg === "1") return replier.reply(UI.make("시스템 상태", "⚙️ v5.2.0\n📂 유저수: " + Object.keys(Database.data).length));
            if (msg === "2") {
                var list = Object.keys(Database.data);
                session.userListCache = list;
                var content = list.map(function(id, idx) { return (idx + 1) + ". " + id; }).join("\n");
                session.waitAction = "관리_유저선택";
                return replier.reply(UI.make("유저 목록", content, "[번호] 입력\n(취소: 이전 / 돌아가기: 메인)"));
            }
            if (msg === "3") {
                FileStream.copy(Config.DB_PATH, Config.BACKUP_PATH);
                return replier.reply(UI.make("데이터 백업", "📦 백업이 완료되었습니다."));
            }
            return;
        }
        
        if (session.waitAction === "관리_유저선택") {
            var idx = parseInt(msg) - 1;
            if (!isNaN(idx) && session.userListCache[idx]) {
                session.targetUser = session.userListCache[idx];
                session.waitAction = "관리_유저제어";
                return replier.reply(UI.make("유저 제어: " + session.targetUser, "1. 정보조회\n2. 골드초기화\n3. 계정삭제\n4. 문의 답변 작성", "취소 시 목록으로 돌아갑니다."));
            }
        }

        if (session.waitAction === "관리_유저제어") {
            var tid = session.targetUser;
            if (msg === "1") return replier.reply(UI.make("유저 정보", JSON.stringify(Database.data[tid], null, 2)));
            if (msg === "2") {
                Database.data[tid].gold = 1000; Database.save(Database.data);
                return replier.reply(UI.make("제어 완료", tid + " 골드 초기화 완료"));
            }
            if (msg === "3") {
                delete Database.data[tid]; Database.save(Database.data);
                session.waitAction = "관리_유저선택";
                return replier.reply(UI.make("제어 완료", tid + " 계정 삭제 완료"));
            }
            if (msg === "4") {
                session.waitAction = "문의_답변작성";
                return replier.reply(UI.make("답변 작성", "대상: " + tid, "전달할 내용을 입력하세요."));
            }
        }

        if (session.waitAction === "문의_답변작성") {
            var targetHash = SessionManager.idToHash[session.targetUser];
            if (targetHash && SessionManager.sessions[targetHash]) {
                Api.replyTo(SessionManager.sessions[targetHash].lastRoom, UI.make("📩 관리자 답변", msg, "문의해주셔서 감사합니다."));
                session.waitAction = "관리_유저제어";
                return replier.reply(UI.make("발송 완료", session.targetUser + "에게 전달했습니다."));
            }
        }
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [5. 메인 응답 핸들러] ㅡㅡㅡㅡㅡㅡㅡ
Database.data = Database.load();

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    if (!msg) return;
    msg = msg.trim();
    var hash = String(imageDB.getProfileHash());
    var session = SessionManager.get(room, hash, isGroupChat);

    try {
        // [최우선 제어: 돌아가기/메뉴] - 어디서든 메인 메뉴로
        if (msg === "돌아가기" || msg === Config.Prefix + "메뉴") {
            session.waitAction = null;
            return replier.reply(UI.renderMenu(session));
        }

        // [최우선 제어: 취소] - 현재 단계만 탈출
        if (msg === "취소") {
            if (session.waitAction === "관리_유저제어") session.waitAction = "관리_유저선택";
            else if (session.waitAction === "문의_답변작성") session.waitAction = "관리_유저제어";
            else session.waitAction = null;
            
            if (session.waitAction === null) return replier.reply(UI.renderMenu(session));
            return replier.reply(UI.make("알림", "작업이 취소되었습니다. 이전 단계로 돌아갑니다."));
        }

        // [분기] 권한별 실행
        if (session.type === "ADMIN") return AdminManager.handle(msg, session, replier);

        // 단체톡방 로직
        if (session.type === "GROUP") {
            if (!session.data) return;
            if (msg === "1") return replier.reply(UI.make("내 정보", "👤 " + session.tempId + "\n💰 " + (session.data.gold || 0).toLocaleString() + "G"));
            return;
        }

        // 개인톡방 로직 (하위 카테고리 포함)
        if (session.type === "DIRECT") {
            if (session.waitAction === "문의_내용작성") {
                SessionManager.idToHash[session.data ? session.tempId : sender] = hash;
                Api.replyTo(Config.AdminRoom, UI.make("관리자 알림", "📩 신규 문의 접수\n발신: " + sender + "\n내용: " + msg));
                session.waitAction = null;
                return replier.reply(UI.make("접수 완료", "관리자에게 문의가 전달되었습니다."));
            }

            if (!session.data) { // 비로그인
                if (session.waitAction === "가입_ID") {
                    if (Database.data[msg]) return replier.reply("⚠️ 이미 존재하는 ID입니다.");
                    session.tempId = msg; session.waitAction = "가입_PW"; 
                    return replier.reply(UI.make("가입 단계", "[" + msg + "] 님의 비번 입력:", "[취소] 입력 시 아이디 재설정"));
                }
                if (session.waitAction === "가입_PW") {
                    Database.data[session.tempId] = {pw:msg, gold:1000, level:1}; Database.save(Database.data);
                    session.waitAction = null; return replier.reply(UI.make("성공", "회원가입 완료! 로그인해 주세요."));
                }
                if (session.waitAction === "로그인_ID") {
                    if (!Database.data[msg]) return replier.reply("❌ 가입되지 않은 ID입니다.");
                    session.tempId = msg; session.waitAction = "로그인_PW";
                    return replier.reply(UI.make("로그인 단계", "[" + msg + "] 님의 비번 입력:"));
                }
                if (session.waitAction === "로그인_PW") {
                    if (Database.data[session.tempId].pw === msg) {
                        session.data = Database.data[session.tempId]; session.waitAction = null;
                        SessionManager.idToHash[session.tempId] = hash;
                        return replier.reply(UI.renderMenu(session));
                    }
                    return replier.reply("⚠️ 비밀번호가 틀렸습니다.");
                }

                if (msg === "1") { session.waitAction = "가입_ID"; return replier.reply(UI.make("회원가입", "아이디를 입력하세요.")); }
                if (msg === "2") { session.waitAction = "로그인_ID"; return replier.reply(UI.make("로그인", "아이디를 입력하세요.")); }
                if (msg === "3") { session.waitAction = "문의_내용작성"; return replier.reply(UI.make("문의하기", "내용을 입력하세요.")); }
            } else { // 로그인 상태
                if (msg === "3") { session.data = null; return replier.reply(UI.make("로그아웃", "정상적으로 로그아웃되었습니다.")); }
                if (msg === "4") { session.waitAction = "문의_내용작성"; return replier.reply(UI.make("문의하기", "내용을 입력하세요.")); }
            }
            return replier.reply(UI.renderMenu(session));
        }

    } catch (e) { replier.reply("시스템 오류: " + e.message); }
}
