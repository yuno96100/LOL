/**
 * [main.js] v6.5.2
 * 1. UI 명칭 변경: 상점 내 '캐릭터 카테고리' -> '캐릭터 구매'
 * 2. 로직 수정: 상점 메뉴 진입 시 프로필이 출력되던 세션 간섭 버그 해결
 * 3. 통합 유지: 관리자, 유저, 칭호, 상점 시스템 전체 포함
 */

// ━━━━━━━━ [1. 설정 및 상수] ━━━━━━━━
var Config = {
    Prefix: ".",
    AdminHash: "2056407147",      
    AdminRoom: "소환사의협곡관리",   
    GroupRoom: "소환사의협곡",     
    BotName: "소환사의 협곡",
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",
    LINE: "━━━━━━━━━━━━━━━━",
    CHAR_PRICE: 500 
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

var AllCharacters = [];
for (var r in SystemData.roles) {
    SystemData.roles[r].units.forEach(function(u) {
        AllCharacters.push({ name: u, role: r, icon: SystemData.roles[r].icon });
    });
}

function getCharacterInfo(charName) {
    for (var role in SystemData.roles) {
        if (SystemData.roles[role].units.indexOf(charName) !== -1) {
            return { role: role, icon: SystemData.roles[role].icon };
        }
    }
    return { role: "미분류", icon: "❓" };
}

function calculateWinRate(win, lose) {
    var total = win + lose;
    return total === 0 ? "0.0" : ((win / total) * 100).toFixed(1);
}

// ━━━━━━━━ [2. 모듈: UI 엔진] ━━━━━━━━
var UI = {
    make: function(title, content, help) {
        var base = "『 " + title + " 』\n" + Config.LINE + "\n" + content + "\n" + Config.LINE;
        if (help) base += "\n" + help;
        return base;
    },
    renderMenu: function(session) {
        if (session.type === "ADMIN") return this.make("관리자 메뉴", "1. 시스템 상세 상태\n2. 유저 목록 관리\n3. 데이터 백업", "💡 번호를 입력하세요.");
        if (session.type === "DIRECT") {
            if (!session.data) return this.make("메인 메뉴", "1. 회원가입\n2. 로그인\n3. 1:1 문의하기", "💡 인증 후 이용 가능합니다.");
            return this.make("메인 메뉴", "1. 내 정보\n2. 컬렉션\n3. 상점\n4. 로그아웃\n5. 1:1 문의하기", "💡 항목을 선택하세요.");
        }
        return this.make("알림", "권한이 없습니다.");
    }
};

// ━━━━━━━━ [3. 데이터베이스 및 세션] ━━━━━━━━
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
        if (!this.sessions[hash]) this.sessions[hash] = { data: null, waitAction: null, tempId: null, userListCache: [], targetUser: null, lastMenu: null };
        var s = this.sessions[hash];
        if (room === Config.AdminRoom) s.type = "ADMIN";
        else if (isGroupChat && room === Config.GroupRoom) s.type = "GROUP";
        else if (!isGroupChat) s.type = "DIRECT";
        else s.type = "OTHER";
        return s;
    }
};

// ━━━━━━━━ [4. 모듈: 관리자 로직] ━━━━━━━━
var AdminManager = {
    handle: function(msg, session, replier) {
        if (!session.waitAction) {
            if (msg === "1") return replier.reply(UI.make("시스템 정보", "📡 서버: ACTIVE\n👥 유저: " + Object.keys(Database.data).length + "명"));
            if (msg === "2") {
                var list = Object.keys(Database.data);
                if (list.length === 0) return replier.reply(UI.make("유저 목록", "⚠️ 등록된 유저가 없습니다."));
                session.userListCache = list;
                session.waitAction = "관리_유저선택";
                return replier.reply(UI.make("유저 목록 관리", list.map(function(id, idx) { return (idx + 1) + ". " + id; }).join("\n")));
            }
        }
        if (session.waitAction === "관리_유저선택") {
            var idx = parseInt(msg) - 1;
            if (session.userListCache[idx]) {
                session.targetUser = session.userListCache[idx];
                var d = Database.data[session.targetUser];
                session.waitAction = "관리_유저제어";
                var profile = "👤 대상: " + session.targetUser + "\n🏅 칭호: [" + d.title + "]\n" + Config.LINE + "\n⭐ 레벨: Lv." + d.level + "\n⚔️ 전적: " + d.win + "승 " + d.lose + "패 (" + calculateWinRate(d.win, d.lose) + "%)\n💰 골드: " + d.gold.toLocaleString() + " G";
                return replier.reply(UI.make("유저 관제", profile, "1. 골드 초기화\n2. 계정 삭제\n🔙 돌아가기: '취소'"));
            }
        }
        if (msg === "네") {
            if (session.waitAction === "확인_초기화") { Database.data[session.targetUser].gold = 0; Database.save(Database.data); session.waitAction = null; return replier.reply(UI.make("완료", "초기화 성공")); }
            if (session.waitAction === "확인_삭제") { delete Database.data[session.targetUser]; Database.save(Database.data); session.waitAction = null; return replier.reply(UI.make("완료", "삭제 성공")); }
        }
    }
};

// ━━━━━━━━ [5. 모듈: 유저 로직] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier, sender) {
        var d = session.data;

        if (!d) { // 비로그인
            if (session.waitAction === "가입_ID") { session.tempId = msg; session.waitAction = "가입_PW"; return replier.reply(UI.make("가입", "비밀번호 입력:")); }
            if (session.waitAction === "가입_PW") {
                Database.data[session.tempId] = { pw: msg, gold: 0, level: 1, exp: 0, win: 0, lose: 0, title: "없음", collection: { titles: [], characters: [] }, firstLogin: true };
                Database.save(Database.data); session.waitAction = null; return replier.reply(UI.make("성공", "가입 완료! 로그인하세요."));
            }
            if (session.waitAction === "로그인_ID") { session.tempId = msg; session.waitAction = "로그인_PW"; return replier.reply(UI.make("로그인", "비밀번호 입력:")); }
            if (session.waitAction === "로그인_PW") {
                var user = Database.data[session.tempId];
                if (user && user.pw === msg) {
                    session.data = user; session.waitAction = null;
                    if (user.firstLogin) {
                        user.gold += 1000; user.title = "뉴비"; user.collection.titles.push("뉴비");
                        user.firstLogin = false; Database.save(Database.data);
                        replier.reply(UI.make("선물", "🎁 1,000G와 [뉴비] 칭호 지급!"));
                    }
                    return replier.reply(UI.renderMenu(session));
                }
                return replier.reply(UI.make("오류", "정보가 틀립니다."));
            }
            if (msg === "1") { session.waitAction = "가입_ID"; return replier.reply(UI.make("가입", "아이디 입력:")); }
            if (msg === "2") { session.waitAction = "로그인_ID"; return replier.reply(UI.make("로그인", "아이디 입력:")); }
        } else { // 로그인 상태
            
            // 액션 대기 로직 (간섭 방지를 위해 waitAction 우선 처리)
            if (session.waitAction === "상점_구매진행") {
                var cIdx = parseInt(msg) - 1;
                if (AllCharacters[cIdx]) {
                    var target = AllCharacters[cIdx];
                    if (d.collection.characters.indexOf(target.name) !== -1) return replier.reply(UI.make("오류", "이미 보유 중입니다."));
                    if (d.gold < Config.CHAR_PRICE) return replier.reply(UI.make("오류", "골드 부족!"));
                    d.gold -= Config.CHAR_PRICE; d.collection.characters.push(target.name); Database.save(Database.data);
                    return replier.reply(UI.make("구매 완료", target.icon + " [" + target.name + "] 영입 완료!", "💰 남은 골드: " + d.gold.toLocaleString() + " G"));
                }
            }
            if (session.waitAction === "칭호_장착진행") {
                var tidx = parseInt(msg) - 1;
                if (d.collection.titles[tidx]) { d.title = d.collection.titles[tidx]; Database.save(Database.data); session.waitAction = null; return replier.reply(UI.make("변경", "칭호 장착 완료")); }
            }

            // 메인 메뉴 선택 (번호 기반)
            if (msg === "1") { // 내 정보
                var wr = calculateWinRate(d.win, d.lose);
                var prof = "👤 닉네임: " + session.tempId + "\n🏅 칭호: [" + d.title + "]\n" + Config.LINE + "\n⭐ 레벨: Lv." + d.level + " (" + d.exp + "exp)\n⚔️ 전적: " + d.win + "승 " + d.lose + "패 (" + wr + "%)\n💰 골드: " + d.gold.toLocaleString() + " G";
                session.lastMenu = "MAIN";
                return replier.reply(UI.make("내 정보 상세", prof, "🔙 돌아가기: '메뉴'"));
            }
            if (msg === "2") { // 컬렉션
                session.lastMenu = "COLLECTION";
                return replier.reply(UI.make("컬렉션", "1. 보유 칭호 (장착)\n2. 보유 캐릭터 명단", "🔙 돌아가기: '메뉴'"));
            }
            if (msg === "3") { // 상점
                session.lastMenu = "SHOP";
                return replier.reply(UI.make("상점", "1. 캐릭터 구매", "🔙 돌아가기: '메뉴'"));
            }

            // 하위 메뉴 선택 로직 (lastMenu 기반으로 완전 분리)
            if (session.lastMenu === "COLLECTION") {
                if (msg === "1") {
                    session.waitAction = "칭호_장착진행";
                    var tList = d.collection.titles.map(function(t, i) { return (i+1) + ". " + (t === d.title ? "✅ " : "") + "["+t+"]"; }).join("\n");
                    return replier.reply(UI.make("칭호 장착", tList, "💡 번호 입력"));
                }
                if (msg === "2") {
                    var cList = d.collection.characters.map(function(n) { var i = getCharacterInfo(n); return i.icon + " " + n + " ["+i.role+"]"; }).join("\n");
                    return replier.reply(UI.make("보유 캐릭터", cList || "없음", "🔙 돌아가기: '메뉴'"));
                }
            }

            if (session.lastMenu === "SHOP") {
                if (msg === "1") {
                    session.waitAction = "상점_구매진행";
                    var sList = AllCharacters.map(function(c, i) { return (i+1) + ". " + c.icon + " " + c.name + (d.collection.characters.indexOf(c.name) !== -1 ? " [보유]" : " ("+Config.CHAR_PRICE+"G)"); }).join("\n");
                    return replier.reply(UI.make("캐릭터 구매", sList, "💡 구매할 캐릭터 번호 입력"));
                }
            }

            if (msg === "4") { session.data = null; session.lastMenu = null; return replier.reply(UI.make("알림", "로그아웃 되었습니다.")); }
        }
        return replier.reply(UI.renderMenu(session));
    }
};

// ━━━━━━━━ [6. 메인 응답 핸들러] ━━━━━━━━
Database.data = Database.load();
function response(room, msg, sender, isGroupChat, replier, imageDB) {
    if (!msg) return;
    var hash = String(imageDB.getProfileHash());
    var session = SessionManager.get(room, hash, isGroupChat);
    msg = msg.trim();

    if (msg === "돌아가기" || msg === "메뉴" || msg === "취소") { 
        session.waitAction = null; 
        session.lastMenu = null; 
        return replier.reply(UI.renderMenu(session)); 
    }

    if (session.type === "ADMIN") return AdminManager.handle(msg, session, replier);
    if (session.type === "DIRECT") return UserManager.handle(msg, session, replier, sender);
}
