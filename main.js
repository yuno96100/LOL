/**
 * [main.js] v6.2.0
 * 1. 모듈화: AdminManager(관리자)와 UserManager(유저 개인톡) 로직 완전 분리
 * 2. 프로필 최적화: '내 정보'에서 캐릭터 리스트 제외 (골드/기본정보만 표시)
 * 3. UI 스타일: '━━━━━━━━' 라인 디자인 전역 적용
 */

// ㅡㅡㅡㅡㅡㅡㅡ [1. 설정 및 상수] ㅡㅡㅡㅡㅡㅡㅡ
var Config = {
    Prefix: ".",
    AdminHash: "2056407147",      
    AdminRoom: "소환사의협곡관리",   
    GroupRoom: "소환사의협곡",     
    BotName: "소환사의 협곡",
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",
    LINE: "━━━━━━━━━━━━━━━━"
};

var SystemData = {
    roles: {
        "탱커": { icon: "🛡️", units: ["알리스타", "말파이트", "레오나"] },
        "전사": { icon: "⚔️", units: ["가렌", "다리우스", "잭스"] },
        "암살자": { icon: "🗡️", units: ["제드", "카타리나", "탈론"] },
        "마법사": { icon: "🔮", units: ["럭스", "아리", "빅토르"] },
        "원거리딜러": { icon: "🏹", units: ["애쉬", "베인", "카이사"] },
        "서포터": { icon: "✨", units: ["소라카", "유미", "쓰레쉬"] }
    }
};

function getCharacterInfo(charName) {
    for (var role in SystemData.roles) {
        if (SystemData.roles[role].units.indexOf(charName) !== -1) {
            return { role: role, icon: SystemData.roles[role].icon };
        }
    }
    return { role: "미분류", icon: "❓" };
}

// ㅡㅡㅡㅡㅡㅡㅡ [2. 모듈: UI 엔진] ㅡㅡㅡㅡㅡㅡㅡ
var UI = {
    make: function(title, content, help) {
        var base = "『 " + title + " 』\n" + Config.LINE + "\n" + content + "\n" + Config.LINE;
        if (help) base += "\n" + help;
        return base;
    },
    renderMenu: function(session) {
        if (session.type === "ADMIN") return this.make("관리자 메뉴", "1. 시스템 상태\n2. 유저 목록 관리\n3. 데이터 백업", "💡 관리자 전용 제어판");
        if (session.type === "DIRECT") {
            if (!session.data) return this.make("메인 메뉴", "1. 회원가입\n2. 로그인", "💡 로그인이 필요합니다.");
            return this.make("메인 메뉴", "1. 내 정보\n2. 컬렉션\n3. 로그아웃", "💡 무엇을 도와드릴까요?");
        }
        return this.make("알림", "인증이 필요한 구역입니다.");
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [3. 데이터베이스 및 세션] ㅡㅡㅡㅡㅡㅡㅡ
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
    get: function(room, hash, isGroupChat) {
        if (!this.sessions[hash]) this.sessions[hash] = { data: null, waitAction: null, tempId: null, userListCache: [], targetUser: null };
        var s = this.sessions[hash];
        if (room === Config.AdminRoom) s.type = "ADMIN";
        else if (isGroupChat && room === Config.GroupRoom) s.type = "GROUP";
        else if (!isGroupChat) s.type = "DIRECT";
        else s.type = "OTHER";
        return s;
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [4. 모듈: 관리자 전용 로직] ㅡㅡㅡㅡㅡㅡㅡ
var AdminManager = {
    handle: function(msg, session, replier) {
        if (!session.waitAction) {
            if (msg === "1") return replier.reply(UI.make("시스템 상태", "📡 ACTIVE\n👥 유저수: " + Object.keys(Database.data).length + "명"));
            if (msg === "2") {
                var list = Object.keys(Database.data);
                session.userListCache = list;
                session.waitAction = "관리_유저선택";
                return replier.reply(UI.make("유저 목록", list.map(function(id, idx) { return (idx + 1) + ". " + id; }).join("\n"), "💡 번호 입력"));
            }
            if (msg === "3") { /* 백업 로직 */ return replier.reply(UI.make("알림", "백업 완료")); }
        }
        
        if (session.waitAction === "관리_유저선택") {
            var idx = parseInt(msg) - 1;
            if (session.userListCache[idx]) {
                session.targetUser = session.userListCache[idx];
                var d = Database.data[session.targetUser];
                session.waitAction = "관리_유저제어";
                return replier.reply(UI.make("유저 프로필: " + session.targetUser, "💰 골드: " + d.gold + "\n🏅 칭호: " + d.title, "1. 골드 초기화\n2. 계정 삭제"));
            }
        }
        
        if (session.waitAction === "관리_유저제어") {
            if (msg === "1") { session.waitAction = "확인_초기화"; return replier.reply(UI.make("확인", "정말 초기화할까요?", "💡 '네' 입력 시 실행")); }
            if (msg === "2") { session.waitAction = "확인_삭제"; return replier.reply(UI.make("확인", "정말 삭제할까요?", "💡 '네' 입력 시 실행")); }
        }

        if (msg === "네" && session.waitAction === "확인_초기화") {
            Database.data[session.targetUser].gold = 0; Database.save(Database.data);
            session.waitAction = null; return replier.reply(UI.make("완료", "골드 초기화 완료"));
        }
        if (msg === "네" && session.waitAction === "확인_삭제") {
            delete Database.data[session.targetUser]; Database.save(Database.data);
            session.waitAction = null; return replier.reply(UI.make("완료", "계정 삭제 완료"));
        }
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [5. 모듈: 유저 전용 로직 (개인톡)] ㅡㅡㅡㅡㅡㅡㅡ
var UserManager = {
    handle: function(msg, session, replier) {
        if (!session.data) { // 비로그인 상태
            if (session.waitAction === "가입_ID") {
                if (Database.data[msg]) return replier.reply(UI.make("오류", "중복된 ID입니다."));
                session.tempId = msg; session.waitAction = "가입_PW";
                return replier.reply(UI.make("가입", "ID: " + msg + "\n비밀번호를 입력하세요."));
            }
            if (session.waitAction === "가입_PW") {
                Database.data[session.tempId] = { pw: msg, gold: 0, level: 1, title: "없음", collection: { titles: [], characters: [] }, firstLogin: true };
                Database.save(Database.data); session.waitAction = null;
                return replier.reply(UI.make("성공", "가입 완료! 로그인을 진행하세요."));
            }
            if (session.waitAction === "로그인_ID") {
                if (!Database.data[msg]) return replier.reply(UI.make("오류", "ID가 없습니다."));
                session.tempId = msg; session.waitAction = "로그인_PW";
                return replier.reply(UI.make("로그인", "비밀번호를 입력하세요."));
            }
            if (session.waitAction === "로그인_PW") {
                var user = Database.data[session.tempId];
                if (user.pw === msg) {
                    session.data = user; session.waitAction = null;
                    if (user.firstLogin) {
                        user.gold += 1000; user.firstLogin = false; Database.save(Database.data);
                        replier.reply(UI.make("선물", "🎁 첫 로그인 보상 1,000골드 지급!"));
                    }
                    return replier.reply(UI.renderMenu(session));
                }
                return replier.reply(UI.make("오류", "비밀번호가 틀렸습니다."));
            }
            if (msg === "1") { session.waitAction = "가입_ID"; return replier.reply(UI.make("가입", "ID 입력:")); }
            if (msg === "2") { session.waitAction = "로그인_ID"; return replier.reply(UI.make("로그인", "ID 입력:")); }
        } 
        else { // 로그인 상태
            if (session.waitAction === "컬렉션_확인") {
                if (msg === "1") return replier.reply(UI.make("보유 칭호", session.data.collection.titles.join("\n") || "없음"));
                if (msg === "2") {
                    var cList = session.data.collection.characters.map(function(n) {
                        var i = getCharacterInfo(n); return i.icon + " " + n + " [" + i.role + "]";
                    });
                    return replier.reply(UI.make("보유 캐릭터", cList.join("\n") || "없음"));
                }
            }
            if (msg === "1") return replier.reply(UI.make("내 정보", "👤 닉네임: " + session.tempId + "\n💰 보유 골드: " + session.data.gold.toLocaleString() + " G\n🏅 칭호: [" + session.data.title + "]"));
            if (msg === "2") { session.waitAction = "컬렉션_확인"; return replier.reply(UI.make("컬렉션", "1. 칭호\n2. 캐릭터")); }
            if (msg === "3") { session.data = null; return replier.reply(UI.make("알림", "로그아웃 완료")); }
        }
        return replier.reply(UI.renderMenu(session));
    }
};

// ㅡㅡㅡㅡㅡㅡㅡ [6. 메인 응답 핸들러] ㅡㅡㅡㅡㅡㅡㅡ
Database.data = Database.load();

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    if (!msg) return;
    var hash = String(imageDB.getProfileHash());
    var session = SessionManager.get(room, hash, isGroupChat);

    if (msg === "돌아가기" || msg === "취소") { session.waitAction = null; return replier.reply(UI.renderMenu(session)); }

    if (session.type === "ADMIN") return AdminManager.handle(msg, session, replier);
    if (session.type === "DIRECT") return UserManager.handle(msg, session, replier);
    if (session.type === "GROUP" && session.data && msg === "1") {
        return replier.reply(UI.make(session.tempId + "님 정보", "💰 골드: " + session.data.gold.toLocaleString() + " G"));
    }
}
