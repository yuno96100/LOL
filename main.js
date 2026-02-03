/**
 * [main.js] v5.4.3
 * 1. 최상위 카테고리: 메인 메뉴 (또는 관리자 메뉴)
 * 2. 전 단계 하위 카테고리: 돌아가기(메인), 취소(이전) 가이드 적용
 * 3. 단체톡방: 비로그인 유저 채팅 시 로그인 유도 UI 무한 출력
 * 4. 보안 상태: 상세 리포트 기능 포함
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
    LINE: "━━━━━━━━━━━━━━",
    SecurityLevel: "S-Class",
    ShieldType: "Anti-Injection Mirror"
};

// ㅡㅡㅡㅡㅡㅡㅡ [2. 모듈: UI 엔진] ㅡㅡㅡㅡㅡㅡㅡ
var UI = {
    make: function(title, content, help) {
        var base = "『 " + title + " 』\n" + Config.LINE + "\n" + content + "\n" + Config.LINE;
        if (help) base += "\n" + help;
        return base;
    },
    renderMenu: function(session) {
        if (session.type === "ADMIN") {
            return this.make("관리자 메뉴", "1. 시스템 상세 상태\n2. 유저 목록 관리\n3. 데이터 백업", "💡 번호를 입력하여 시스템을 제어하세요.");
        }
        if (session.type === "GROUP") {
            if (!session.data) return this.make(Config.BotName, "개인톡에서 로그인을 먼저 해주세요.", "💡 명령어: .메뉴 (개인톡 인증 필수)");
            return this.make("메인 메뉴", "1. 내 정보\n2. 상점 이용\n3. 모험 떠나기\n4. 랭킹 확인", "💡 함께 즐기는 광장입니다.");
        }
        if (session.type === "DIRECT") {
            if (!session.data) return this.make("메인 메뉴", "1. 회원가입\n2. 로그인\n3. 1:1 문의하기", "💡 서비스 이용을 위해 인증이 필요합니다.");
            return this.make("메인 메뉴", "1. 내 정보\n2. 비밀번호 변경\n3. 로그아웃\n4. 1:1 문의하기", "💡 개인 설정 및 문의를 관리합니다.");
        }
        return "사용 불가 영역입니다.";
    }
};

// [호환성 전송 함수]
function sendToRoom(roomName, message) {
    try {
        if (typeof Api !== 'undefined' && Api.replyRoom) Api.replyRoom(roomName, message);
        else if (typeof Api !== 'undefined' && Api.reply) Api.reply(roomName, message);
    } catch (e) { Log.error(e); }
}

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
            if (msg === "1") {
                var userCount = Object.keys(Database.data).length;
                var dbSize = new java.io.File(Config.DB_PATH).length();
                var statusMsg = "🛡️ 보안 등급: " + Config.SecurityLevel + "\n📡 방어 체계: " + Config.ShieldType + "\n📁 데이터베이스: " + (dbSize / 1024).toFixed(2) + " KB\n👥 등록 유저: " + userCount + "명\n⏱️ 상태: ACTIVE";
                return replier.reply(UI.make("시스템 상세 상태", statusMsg, "💡 돌아가기: 메인 메뉴"));
            }
            if (msg === "2") {
                var list = Object.keys(Database.data);
                session.userListCache = list;
                var content = list.map(function(id, idx) { return (idx + 1) + ". " + id; }).join("\n");
                session.waitAction = "관리_유저선택";
                return replier.reply(UI.make("유저 목록", content, "💡 번호 입력\n🔙 돌아가기: 메인 / ❌ 취소: 이전"));
            }
            if (msg === "3") {
                FileStream.copy(Config.DB_PATH, Config.BACKUP_PATH);
                return replier.reply(UI.make("데이터 백업", "📦 전체 데이터 백업이 완료되었습니다.", "💡 돌아가기: 메인 메뉴"));
            }
            return;
        }
        
        if (session.waitAction === "관리_유저선택") {
            var idx = parseInt(msg) - 1;
            if (!isNaN(idx) && session.userListCache[idx]) {
                session.targetUser = session.userListCache[idx];
                session.waitAction = "관리_유저제어";
                return replier.reply(UI.make("유저 제어: " + session.targetUser, "1. 정보조회\n2. 골드초기화\n3. 계정삭제\n4. 답변 작성", "💡 돌아가기: 메인 / ❌ 취소: 유저목록"));
            }
        }

        if (session.waitAction === "관리_유저제어") {
            var tid = session.targetUser;
            if (msg === "1") return replier.reply(UI.make("유저 정보", JSON.stringify(Database.data[tid], null, 2), "💡 돌아가기: 메인 / ❌ 취소: 이전"));
            if (msg === "2") {
                Database.data[tid].gold = 1000; Database.save(Database.data);
                return replier.reply(UI.make("제어 완료", tid + " 골드 초기화 완료", "💡 돌아가기: 메인 / ❌ 취소: 이전"));
            }
            if (msg === "3") {
                delete Database.data[tid]; Database.save(Database.data);
                session.waitAction = "관리_유저선택";
                return replier.reply(UI.make("제어 완료", tid + " 계정 삭제 완료", "💡 [자동이동] 유저 목록"));
            }
            if (msg === "4") {
                session.waitAction = "문의_답변작성";
                return replier.reply(UI.make("답변 작성", "대상: " + tid + "\n전달할 내용을 입력하세요.", "💡 돌아가기: 메인 / ❌ 취소: 이전"));
            }
        }

        if (session.waitAction === "문의_답변작성") {
            var targetHash = SessionManager.idToHash[session.targetUser];
            if (targetHash && SessionManager.sessions[targetHash]) {
                sendToRoom(SessionManager.sessions[targetHash].lastRoom, UI.make("📩 관리자 답변", msg, "💡 추가 문의는 개인톡 1:1 문의 메뉴 이용"));
                session.waitAction = "관리_유저제어";
                return replier.reply(UI.make("발송 완료", session.targetUser + "에게 전달되었습니다.", "💡 돌아가기: 메인 / ❌ 취소: 이전"));
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
        // [공통 제어] 돌아가기 & 취소
        if (msg === "돌아가기" || msg === Config.Prefix + "메뉴") {
            session.waitAction = null;
            return replier.reply(UI.renderMenu(session));
        }

        if (msg === "취소") {
            if (session.waitAction === "관리_유저제어") session.waitAction = "관리_유저선택";
            else if (session.waitAction === "문의_답변작성") session.waitAction = "관리_유저제어";
            else if (session.waitAction === "가입_PW") session.waitAction = "가입_ID";
            else if (session.waitAction === "로그인_PW") session.waitAction = "로그인_ID";
            else session.waitAction = null;
            
            if (session.waitAction === null) return replier.reply(UI.renderMenu(session));
            return replier.reply(UI.make("알림", "이전 단계로 돌아갑니다.", "💡 돌아가기: 메인 / ❌ 취소: 한번 더"));
        }

        // [분기 1] 관리자 권한
        if (session.type === "ADMIN") return AdminManager.handle(msg, session, replier);

        // [분기 2] 단체톡방 (비로그인 차단 강화)
        if (session.type === "GROUP") {
            if (!session.data) {
                var loginGuide = "아직 인증되지 않은 모험가입니다.\n채팅을 하시려면 개인톡에서 로그인을 완료해주세요.";
                return replier.reply(UI.make("인증 필요", loginGuide, "💡 개인톡 검색: " + Config.BotName + "\n🔑 가입/로그인 후 이용 가능"));
            }
            if (msg === "1") return replier.reply(UI.make("내 정보", "👤 ID: " + session.tempId + "\n💰 골드: " + (session.data.gold || 0).toLocaleString() + "G", "💡 돌아가기: 메인 메뉴"));
            
            // ㅡㅡㅡㅡㅡㅡㅡ [NEW LOGIC: 단체톡 기능] ㅡㅡㅡㅡㅡㅡㅡ
            return;
        }

        // [분기 3] 개인톡방
        if (session.type === "DIRECT") {
            if (session.waitAction === "문의_내용작성") {
                SessionManager.idToHash[session.data ? session.tempId : sender] = hash;
                sendToRoom(Config.AdminRoom, UI.make("📩 신규 문의 접수", "발신: " + sender + "\n내용: " + msg, "💡 관리자 메뉴 2번에서 답변 가능"));
                session.waitAction = null;
                return replier.reply(UI.make("접수 완료", "관리자에게 문의가 전달되었습니다.", "💡 돌아가기: 메인 메뉴"));
            }

            if (!session.data) { // 비로그인 상태
                if (session.waitAction === "가입_ID") {
                    if (Database.data[msg]) return replier.reply(UI.make("가입 실패", "이미 존재하는 ID입니다.", "❌ 취소: ID 재입력"));
                    session.tempId = msg; session.waitAction = "가입_PW"; 
                    return replier.reply(UI.make("회원가입", "ID: " + msg + "\n사용하실 비밀번호를 입력하세요.", "🔙 돌아가기: 메인 / ❌ 취소: ID 재설정"));
                }
                if (session.waitAction === "가입_PW") {
                    Database.data[session.tempId] = {pw:msg, gold:1000, level:1}; Database.save(Database.data);
                    session.waitAction = null; return replier.reply(UI.make("회원가입 완료", session.tempId + "님 환영합니다!", "💡 이제 로그인을 진행해주세요."));
                }
                if (session.waitAction === "로그인_ID") {
                    if (!Database.data[msg]) return replier.reply(UI.make("로그인 실패", "존재하지 않는 ID입니다."));
                    session.tempId = msg; session.waitAction = "로그인_PW";
                    return replier.reply(UI.make("로그인", "ID: " + msg + "\n비밀번호를 입력하세요.", "🔙 돌아가기: 메인 / ❌ 취소: ID 재입력"));
                }
                if (session.waitAction === "로그인_PW") { 
                    if (Database.data[session.tempId].pw === msg) {
                        session.data = Database.data[session.tempId]; session.waitAction = null;
                        SessionManager.idToHash[session.tempId] = hash; return replier.reply(UI.renderMenu(session));
                    }
                    return replier.reply(UI.make("로그인 실패", "비밀번호가 틀렸습니다.", "❌ 취소: ID 재입력"));
                }
                if (msg === "1") { session.waitAction = "가입_ID"; return replier.reply(UI.make("회원가입", "사용할 ID를 입력하세요.", "🔙 돌아가기: 메인 메뉴")); }
                if (msg === "2") { session.waitAction = "로그인_ID"; return replier.reply(UI.make("로그인", "ID를 입력하세요.", "🔙 돌아가기: 메인 메뉴")); }
                if (msg === "3") { session.waitAction = "문의_내용작성"; return replier.reply(UI.make("1:1 문의", "내용을 입력하세요.", "🔙 돌아가기: 메인 메뉴")); }
            } else { // 로그인 상태
                if (msg === "3") { session.data = null; return replier.reply(UI.make("로그아웃", "정상적으로 로그아웃되었습니다.", "💡 다시 이용하려면 로그인하세요.")); }
                if (msg === "4") { session.waitAction = "문의_내용작성"; return replier.reply(UI.make("1:1 문의", "내용을 입력하세요.", "🔙 돌아가기: 메인 메뉴")); }
                
                // ㅡㅡㅡㅡㅡㅡㅡ [NEW LOGIC: 개인톡 로그인 기능] ㅡㅡㅡㅡㅡㅡㅡ
            }
            return replier.reply(UI.renderMenu(session));
        }
    } catch (e) { replier.reply("시스템 에러: " + e.message); }
}
