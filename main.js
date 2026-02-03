/**
 * [main.js] v5.9.2
 * - 신규 유저: 칭호/캐릭터/전리품 없음
 * - 보상: 첫 로그인 시 1,000골드 자동 지급
 * - 구조: 역할군 중심 캐릭터 도감 체계
 * - 관리자: 유저 목록 확인 및 시스템 상태 점검 포함
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

// 역할군 중심의 시스템 데이터
var SystemData = {
    roles: {
        "탱커": { icon: "🛡️", units: ["알리스타", "말파이트", "레오나", "노틸러스"] },
        "전사": { icon: "⚔️", units: ["가렌", "다리우스", "리 신", "잭스"] },
        "암살자": { icon: "🗡️", units: ["제드", "카타리나", "탈론", "아칼리"] },
        "마법사": { icon: "🔮", units: ["럭스", "아리", "빅토르", "오리아나"] },
        "원거리딜러": { icon: "🏹", units: ["애쉬", "베인", "카이사", "이즈리얼"] },
        "서포터": { icon: "✨", units: ["소라카", "유미", "쓰레쉬", "룰루"] }
    }
};

// 헬퍼 함수: 캐릭터 정보 조회
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
        if (session.type === "ADMIN") {
            return this.make("관리자 메뉴", "1. 시스템 상세 상태\n2. 유저 목록 관리\n3. 데이터 백업", "💡 관리자 전용 제어판입니다.");
        }
        if (session.type === "GROUP") {
            if (!session.data) return this.make(Config.BotName, "인증되지 않은 모험가입니다.", "🔑 개인톡에서 로그인 후 이용 가능");
            return this.make("메인 메뉴", "1. 내 정보\n2. 상점 이용\n3. 모험 떠나기\n4. 랭킹 확인", "💡 함께 즐기는 광장입니다.");
        }
        if (session.type === "DIRECT") {
            if (!session.data) return this.make("메인 메뉴", "1. 회원가입\n2. 로그인\n3. 1:1 문의하기", "💡 서비스 이용을 위해 인증이 필요합니다.");
            return this.make("메인 메뉴", "1. 내 정보\n2. 컬렉션\n3. 로그아웃\n4. 1:1 문의하기", "💡 당신의 여정을 관리합니다.");
        }
        return "사용 불가 영역입니다.";
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
    get: function(room, hash, isGroupChat) {
        if (!this.sessions[hash]) {
            this.sessions[hash] = { data: null, waitAction: null, tempId: null, lastRoom: room, userListCache: [] };
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

// ㅡㅡㅡㅡㅡㅡㅡ [4. 모듈: 관리자 로직] ㅡㅡㅡㅡㅡㅡㅡ
var AdminManager = {
    handle: function(msg, session, replier) {
        if (!session.waitAction) {
            if (msg === "1") {
                var userCount = Object.keys(Database.data).length;
                var dbSize = new java.io.File(Config.DB_PATH).length();
                var statusMsg = "📡 시스템 상태: ACTIVE\n👥 등록 유저: " + userCount + "명\n📁 DB 용량: " + (dbSize / 1024).toFixed(2) + " KB";
                return replier.reply(UI.make("시스템 정보", statusMsg, "💡 돌아가기: 메뉴"));
            }
            if (msg === "2") {
                var list = Object.keys(Database.data);
                session.userListCache = list;
                var content = list.map(function(id, idx) { return (idx + 1) + ". " + id; }).join("\n");
                session.waitAction = "관리_유저선택";
                return replier.reply(UI.make("유저 목록", content, "💡 유저 번호를 입력해 상세 관리"));
            }
            if (msg === "3") {
                FileStream.copy(Config.DB_PATH, Config.BACKUP_PATH);
                return replier.reply(UI.make("백업 완료", "데이터베이스 백업이 생성되었습니다."));
            }
        }
        if (session.waitAction === "관리_유저선택") {
            var idx = parseInt(msg) - 1;
            if (!isNaN(idx) && session.userListCache[idx]) {
                var tid = session.userListCache[idx];
                return replier.reply(UI.make("유저 상세: " + tid, JSON.stringify(Database.data[tid], null, 2), "💡 돌아가기: 메뉴 / 취소: 이전"));
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
        if (msg === "돌아가기" || msg === Config.Prefix + "메뉴") {
            session.waitAction = null;
            return replier.reply(UI.renderMenu(session));
        }

        if (msg === "취소") {
            session.waitAction = null;
            return replier.reply(UI.renderMenu(session));
        }

        // 1. 관리자 모드
        if (session.type === "ADMIN") return AdminManager.handle(msg, session, replier);

        // 2. 개인톡 모드
        if (session.type === "DIRECT") {
            if (!session.data) {
                // 회원가입
                if (session.waitAction === "가입_ID") {
                    if (Database.data[msg]) return replier.reply("이미 사용 중인 ID입니다.");
                    session.tempId = msg; session.waitAction = "가입_PW";
                    return replier.reply(UI.make("회원가입", "ID: " + msg + "\n사용할 비밀번호를 입력하세요."));
                }
                if (session.waitAction === "가입_PW") {
                    Database.data[session.tempId] = { 
                        pw: msg, gold: 0, level: 1, exp: 0, win: 0, lose: 0, title: "없음",
                        collection: { titles: [], characters: [], loot: [] }, firstLogin: true 
                    };
                    Database.save(Database.data);
                    session.waitAction = null;
                    return replier.reply(UI.make("가입 완료", session.tempId + "님 반갑습니다!\n로그인을 진행해주세요."));
                }
                // 로그인
                if (session.waitAction === "로그인_ID") {
                    if (!Database.data[msg]) return replier.reply("존재하지 않는 ID입니다.");
                    session.tempId = msg; session.waitAction = "로그인_PW";
                    return replier.reply("ID: " + msg + "\n비밀번호를 입력하세요.");
                }
                if (session.waitAction === "로그인_PW") {
                    var user = Database.data[session.tempId];
                    if (user.pw === msg) {
                        session.data = user;
                        session.waitAction = null;
                        if (user.firstLogin) {
                            user.gold += 1000; user.firstLogin = false; Database.save(Database.data);
                            replier.reply(UI.make("첫 로그인 보상", "🎁 환영 선물이 도착했습니다!\n1,000골드가 지급되었습니다."));
                        }
                        return replier.reply(UI.renderMenu(session));
                    }
                    return replier.reply("비밀번호가 틀렸습니다.");
                }

                if (msg === "1") { session.waitAction = "가입_ID"; return replier.reply("ID 입력:"); }
                if (msg === "2") { session.waitAction = "로그인_ID"; return replier.reply("ID 입력:"); }
            } else {
                // 로그인 완료 유저
                if (session.waitAction === "컬렉션_확인") {
                    var col = session.data.collection;
                    if (msg === "1") {
                        var list = col.titles.length > 0 ? "🏆 " + col.titles.join("\n🏆 ") : "보유 중인 칭호가 없습니다.";
                        return replier.reply(UI.make("보유 칭호", list, "🔙 돌아가기"));
                    }
                    if (msg === "2") {
                        var charList = col.characters.map(function(name) {
                            var info = getCharacterInfo(name);
                            return info.icon + " " + name + " [" + info.role + "]";
                        });
                        var result = charList.length > 0 ? charList.join("\n") : "보유 중인 캐릭터가 없습니다.";
                        return replier.reply(UI.make("보유 캐릭터", result, "🔙 돌아가기"));
                    }
                    if (msg === "3") {
                        var list = col.loot.length > 0 ? "🎁 " + col.loot.join("\n🎁 ") : "보유 중인 전리품이 없습니다.";
                        return replier.reply(UI.make("전리품 목록", list, "🔙 돌아가기"));
                    }
                }
                if (msg === "1") return replier.reply(UI.make("내 정보", "👤 닉네임: " + session.tempId + "\n💰 보유 골드: " + session.data.gold.toLocaleString() + " G"));
                if (msg === "2") { session.waitAction = "컬렉션_확인"; return replier.reply(UI.make("컬렉션", "1. 칭호\n2. 캐릭터\n3. 전리품", "💡 번호를 입력하세요.")); }
                if (msg === "3") { session.data = null; return replier.reply("로그아웃 되었습니다."); }
            }
            return replier.reply(UI.renderMenu(session));
        }

        // 3. 단체톡방 모드
        if (session.type === "GROUP") {
            if (!session.data) return replier.reply(UI.renderMenu(session));
            if (msg === "1") return replier.reply(UI.make(session.tempId + "님의 정보", "💰 골드: " + session.data.gold.toLocaleString() + " G"));
        }
        
    } catch (e) { replier.reply("에러: " + e.message); }
}
