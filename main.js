/**
 * [main.js] v5.9.1
 * 1. 데이터 구조: 역할군(Role)별 캐릭터 리스트 관리 체계
 * 2. 신규 유저: 칭호/캐릭터/전리품 없이 시작
 * 3. 보상 시스템: 가입 후 최초 1회 로그인 시 1,000골드 자동 지급
 * 4. UI: 컬렉션 내 보유 캐릭터 출력 시 역할군 및 아이콘 매칭
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

// 역할군 중심의 시스템 데이터 (관리자님이 여기서 캐릭터를 추가/수정하시면 됩니다)
var SystemData = {
    roles: {
        "탱커": { icon: "🛡️", units: ["알리스타", "말파이트", "레오나", "노틸러스"] },
        "전사": { icon: "⚔️", units: ["가렌", "다리우스", "리 신", "잭스"] },
        "암살자": { icon: "🗡️", units: ["제드", "카타리나", "탈론", "아칼리"] },
        "마법사": { icon: "🔮", units: ["럭스", "아리", "빅토르", "오리아나"] },
        "원거리딜러": { icon: "🏹", units: ["애쉬", "베인", "카이사", "이즈리얼"] },
        "서포터": { icon: "✨", units: ["소라카", "유미", "쓰레쉬", "룰루"] }
    },
    titles: ["협곡의 선구자", "수집광", "전투의 화신"],
    items: ["체력 물약", "도란의 검", "와드"]
};

// 캐릭터 명칭으로 역할군 정보를 찾아주는 헬퍼 함수
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
            return this.make("관리자 메뉴", "1. 시스템 상세 상태\n2. 유저 목록 관리\n3. 데이터 백업", "💡 관리 전용 메뉴입니다.");
        }
        if (session.type === "GROUP") {
            if (!session.data) return this.make(Config.BotName, "인증되지 않은 모험가입니다.", "🔑 개인톡에서 로그인 후 이용 가능");
            return this.make("메인 메뉴", "1. 내 정보\n2. 상점 이용\n3. 모험 떠나기\n4. 랭킹 확인", "💡 함께 즐기는 광장입니다.");
        }
        if (session.type === "DIRECT") {
            if (!session.data) return this.make("메인 메뉴", "1. 회원가입\n2. 로그인\n3. 1:1 문의하기", "💡 서비스 이용을 위해 인증이 필요합니다.");
            return this.make("메인 메뉴", "1. 내 정보\n2. 컬렉션\n3. 로그아웃\n4. 1:1 문의하기", "💡 수집한 기록들을 확인합니다.");
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
            this.sessions[hash] = { data: null, waitAction: null, tempId: null, lastRoom: room };
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

// ㅡㅡㅡㅡㅡㅡㅡ [4. 메인 응답 핸들러] ㅡㅡㅡㅡㅡㅡㅡ
Database.data = Database.load();

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    if (!msg) return;
    msg = msg.trim();
    var hash = String(imageDB.getProfileHash());
    var session = SessionManager.get(room, hash, isGroupChat);

    try {
        // 공통 커맨드
        if (msg === "돌아가기" || msg === Config.Prefix + "메뉴") {
            session.waitAction = null;
            return replier.reply(UI.renderMenu(session));
        }

        if (msg === "취소") {
            session.waitAction = null;
            return replier.reply(UI.renderMenu(session));
        }

        // [개인톡방 로직]
        if (session.type === "DIRECT") {
            if (!session.data) { // 비로그인 상태
                if (session.waitAction === "가입_ID") {
                    if (Database.data[msg]) return replier.reply("이미 존재하는 ID입니다.");
                    session.tempId = msg; session.waitAction = "가입_PW";
                    return replier.reply(UI.make("회원가입", "ID: " + msg + "\n사용할 비밀번호를 입력하세요.", "💡 이전 단계로 가려면 '취소' 입력"));
                }
                if (session.waitAction === "가입_PW") {
                    Database.data[session.tempId] = { 
                        pw: msg, gold: 0, level: 1, exp: 0, win: 0, lose: 0, title: "없음",
                        collection: { titles: [], characters: [], loot: [] },
                        firstLogin: true // 첫 로그인 여부 체크 플래그
                    };
                    Database.save(Database.data);
                    session.waitAction = null;
                    return replier.reply(UI.make("가입 완료", session.tempId + "님, 환영합니다!\n이제 로그인을 진행해주세요.", "💡 '2'를 입력하여 로그인"));
                }
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
                        
                        // 첫 로그인 보상 지급 로직
                        if (user.firstLogin) {
                            user.gold += 1000;
                            user.firstLogin = false;
                            Database.save(Database.data);
                            replier.reply(UI.make("첫 로그인 보상", "🎁 협곡에 오신 것을 환영합니다!\n정착 지원금 1,000골드가 지급되었습니다."));
                        }
                        return replier.reply(UI.renderMenu(session));
                    }
                    return replier.reply("비밀번호가 일치하지 않습니다.");
                }

                if (msg === "1") { session.waitAction = "가입_ID"; return replier.reply("회원가입을 위해 사용할 ID를 입력하세요."); }
                if (msg === "2") { session.waitAction = "로그인_ID"; return replier.reply("로그인을 위해 ID를 입력하세요."); }
                if (msg === "3") { session.waitAction = "문의_대기"; return replier.reply("문의 내용을 입력하세요."); }
            } 
            else { // 로그인 완료 상태
                if (session.waitAction === "컬렉션_확인") {
                    var col = session.data.collection;
                    if (msg === "1") {
                        var tList = col.titles.length > 0 ? "🏆 " + col.titles.join("\n🏆 ") : "보유 중인 칭호가 없습니다.";
                        return replier.reply(UI.make("보유 칭호", tList, "🔙 돌아가기"));
                    }
                    if (msg === "2") {
                        var charList = col.characters.map(function(name) {
                            var info = getCharacterInfo(name);
                            return info.icon + " " + name + " [" + info.role + "]";
                        });
                        var cResult = charList.length > 0 ? charList.join("\n") : "보유 중인 캐릭터가 없습니다.";
                        return replier.reply(UI.make("보유 캐릭터", cResult, "🔙 돌아가기"));
                    }
                    if (msg === "3") {
                        var lList = col.loot.length > 0 ? "🎁 " + col.loot.join("\n🎁 ") : "보유 중인 전리품이 없습니다.";
                        return replier.reply(UI.make("전리품 목록", lList, "🔙 돌아가기"));
                    }
                }

                if (msg === "1") {
                    var d = session.data;
                    var profile = "👤 닉네임: " + session.tempId + "\n🏅 대표 칭호: [" + d.title + "]\n" + Config.LINE + "\n💰 보유 골드: " + d.gold.toLocaleString() + " G";
                    return replier.reply(UI.make("내 정보 상세", profile, "🔙 돌아가기: 메뉴"));
                }
                if (msg === "2") {
                    session.waitAction = "컬렉션_확인";
                    return replier.reply(UI.make("컬렉션", "1. 보유 칭호\n2. 보유 캐릭터\n3. 전리품 목록", "💡 확인하고 싶은 항목의 번호를 입력하세요."));
                }
                if (msg === "3") { session.data = null; return replier.reply("정상적으로 로그아웃되었습니다."); }
            }
            return replier.reply(UI.renderMenu(session));
        }

        // [단체톡방 로직]
        if (session.type === "GROUP") {
            if (!session.data) return replier.reply(UI.renderMenu(session));
            if (msg === "1") {
                var d = session.data;
                return replier.reply(UI.make(session.tempId + "님의 정보", "🏅 칭호: [" + d.title + "]\n⭐ 레벨: Lv." + d.level + "\n💰 골드: " + d.gold.toLocaleString() + " G"));
            }
        }
        
    } catch (e) { replier.reply("시스템 오류: " + e.message); }
}
