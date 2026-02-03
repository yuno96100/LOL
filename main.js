/**
 * [main.js] v6.1.0
 * 1. UI 고도화: 모든 출력 문구에 '━━━━━━━━' 경계선 적용
 * 2. 관리자 특권: 유저 상세 프로필 조회, 골드 초기화, 계정 삭제 (재확인 문구 포함)
 * 3. 보상: 첫 로그인 1,000골드 자동 지급
 * 4. 도감: 역할군(탱/전/암/마/원/서) 중심 캐릭터 관리 시스템
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
    LINE: "━━━━━━━━━━━━━━━━", // 요청하신 라인 스타일
    SecurityLevel: "S-Class",
    ShieldType: "Anti-Injection Mirror"
};

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
        var base = title + "\n" + Config.LINE + "\n" + content + "\n" + Config.LINE;
        if (help) base += "\n" + help;
        return base;
    },
    renderMenu: function(session) {
        if (session.type === "ADMIN") {
            return this.make("『 관리자 메뉴 』", "1. 시스템 상세 상태\n2. 유저 목록 관리\n3. 데이터 백업", "💡 번호를 입력하여 제어하세요.");
        }
        if (session.type === "DIRECT") {
            if (!session.data) return this.make("『 메인 메뉴 』", "1. 회원가입\n2. 로그인\n3. 1:1 문의하기", "💡 인증 후 이용 가능합니다.");
            return this.make("『 메인 메뉴 』", "1. 내 정보\n2. 컬렉션\n3. 로그아웃\n4. 1:1 문의하기", "💡 무엇을 도와드릴까요?");
        }
        return this.make("『 알림 』", "접근 권한이 없습니다.", "💡 개인톡 혹은 관리자 방을 이용하세요.");
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
            this.sessions[hash] = { data: null, waitAction: null, tempId: null, lastRoom: room, userListCache: [], targetUser: null };
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
                return replier.reply(UI.make("『 시스템 정보 』", statusMsg, "💡 돌아가기: 메뉴"));
            }
            if (msg === "2") {
                var list = Object.keys(Database.data);
                session.userListCache = list;
                var content = list.length > 0 ? list.map(function(id, idx) { return (idx + 1) + ". " + id; }).join("\n") : "등록된 유저가 없습니다.";
                session.waitAction = "관리_유저선택";
                return replier.reply(UI.make("『 유저 목록 』", content, "💡 조회를 위해 번호를 입력하세요."));
            }
            if (msg === "3") {
                FileStream.copy(Config.DB_PATH, Config.BACKUP_PATH);
                return replier.reply(UI.make("『 백업 완료 』", "데이터베이스 백업이 생성되었습니다.", "💡 돌아가기: 메뉴"));
            }
        }

        if (session.waitAction === "관리_유저선택") {
            var idx = parseInt(msg) - 1;
            if (!isNaN(idx) && session.userListCache[idx]) {
                var tid = session.userListCache[idx];
                session.targetUser = tid;
                var d = Database.data[tid];
                var profile = "👤 대상: " + tid + "\n💰 골드: " + d.gold.toLocaleString() + " G\n⭐ 레벨: Lv." + d.level + "\n🏅 칭호: [" + d.title + "]\n📦 캐릭터: " + d.collection.characters.length + "개 보유";
                session.waitAction = "관리_유저제어";
                return replier.reply(UI.make("『 유저 상세 프로필 』", profile, "1. 골드 초기화\n2. 계정 삭제\n🔙 취소: '취소' 입력"));
            }
        }

        if (session.waitAction === "관리_유저제어") {
            if (msg === "1") {
                session.waitAction = "확인_초기화";
                return replier.reply(UI.make("『 ⚠️ 최종 확인 』", "[" + session.targetUser + "] 유저의 골드를 초기화하시겠습니까?", "💡 승인: '네' / 거절: '아니오'"));
            }
            if (msg === "2") {
                session.waitAction = "확인_삭제";
                return replier.reply(UI.make("『 ⚠️ 최종 확인 』", "[" + session.targetUser + "] 유저를 영구 삭제하시겠습니까?", "💡 승인: '네' / 거절: '아니오'"));
            }
        }

        if (session.waitAction === "확인_초기화") {
            if (msg === "네") {
                Database.data[session.targetUser].gold = 0;
                Database.save(Database.data); session.waitAction = null;
                return replier.reply(UI.make("『 제어 완료 』", session.targetUser + "의 골드가 초기화되었습니다."));
            }
            session.waitAction = "관리_유저제어";
            return replier.reply(UI.make("『 취소 알림 』", "초기화 작업을 취소했습니다."));
        }

        if (session.waitAction === "확인_삭제") {
            if (msg === "네") {
                delete Database.data[session.targetUser];
                Database.save(Database.data); session.waitAction = null;
                return replier.reply(UI.make("『 제어 완료 』", session.targetUser + "의 데이터가 삭제되었습니다."));
            }
            session.waitAction = "관리_유저제어";
            return replier.reply(UI.make("『 취소 알림 』", "삭제 작업을 취소했습니다."));
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
            if (session.waitAction === "관리_유저제어") session.waitAction = "관리_유저선택";
            else session.waitAction = null;
            return replier.reply(UI.make("『 알림 』", "이전 단계로 돌아갑니다."));
        }

        if (session.type === "ADMIN") return AdminManager.handle(msg, session, replier);

        if (session.type === "DIRECT") {
            if (!session.data) {
                if (session.waitAction === "가입_ID") {
                    if (Database.data[msg]) return replier.reply(UI.make("『 가입 실패 』", "이미 존재하는 ID입니다."));
                    session.tempId = msg; session.waitAction = "가입_PW";
                    return replier.reply(UI.make("『 회원가입 』", "ID: " + msg + "\n사용할 비밀번호를 입력하세요."));
                }
                if (session.waitAction === "가입_PW") {
                    Database.data[session.tempId] = { 
                        pw: msg, gold: 0, level: 1, exp: 0, win: 0, lose: 0, title: "없음",
                        collection: { titles: [], characters: [], loot: [] }, firstLogin: true 
                    };
                    Database.save(Database.data); session.waitAction = null;
                    return replier.reply(UI.make("『 가입 성공 』", session.tempId + "님, 환영합니다!"));
                }
                if (session.waitAction === "로그인_ID") {
                    if (!Database.data[msg]) return replier.reply(UI.make("『 오류 』", "존재하지 않는 ID입니다."));
                    session.tempId = msg; session.waitAction = "로그인_PW";
                    return replier.reply(UI.make("『 로그인 』", "ID: " + msg + "\n비밀번호를 입력하세요."));
                }
                if (session.waitAction === "로그인_PW") {
                    var user = Database.data[session.tempId];
                    if (user.pw === msg) {
                        session.data = user; session.waitAction = null;
                        if (user.firstLogin) {
                            user.gold += 1000; user.firstLogin = false; Database.save(Database.data);
                            replier.reply(UI.make("『 첫 로그인 보상 』", "🎁 정착 지원금 1,000골드가 지급되었습니다."));
                        }
                        return replier.reply(UI.renderMenu(session));
                    }
                    return replier.reply(UI.make("『 오류 』", "비밀번호가 일치하지 않습니다."));
                }
                if (msg === "1") { session.waitAction = "가입_ID"; return replier.reply(UI.make("『 가입 』", "아이디를 입력하세요.")); }
                if (msg === "2") { session.waitAction = "로그인_ID"; return replier.reply(UI.make("『 로그인 』", "아이디를 입력하세요.")); }
            } else {
                if (session.waitAction === "컬렉션_확인") {
                    var col = session.data.collection;
                    if (msg === "1") return replier.reply(UI.make("『 보유 칭호 』", col.titles.length > 0 ? "🏆 " + col.titles.join("\n🏆 ") : "없음"));
                    if (msg === "2") {
                        var cList = col.characters.map(function(n) { var i = getCharacterInfo(n); return i.icon + " " + n + " [" + i.role + "]"; });
                        return replier.reply(UI.make("『 보유 캐릭터 』", cList.length > 0 ? cList.join("\n") : "없음"));
                    }
                }
                if (msg === "1") return replier.reply(UI.make("『 내 정보 』", "👤 닉네임: " + session.tempId + "\n💰 보유 골드: " + session.data.gold.toLocaleString() + " G"));
                if (msg === "2") { session.waitAction = "컬렉션_확인"; return replier.reply(UI.make("『 컬렉션 』", "1. 칭호\n2. 캐릭터\n3. 전리품")); }
                if (msg === "3") { session.data = null; return replier.reply(UI.make("『 알림 』", "로그아웃 되었습니다.")); }
            }
            return replier.reply(UI.renderMenu(session));
        }

        if (session.type === "GROUP") {
            if (!session.data) return replier.reply(UI.make("『 알림 』", "개인톡에서 로그인이 필요합니다."));
            if (msg === "1") return replier.reply(UI.make("『 " + session.tempId + " 정보 』", "💰 골드: " + session.data.gold.toLocaleString() + " G"));
        }
    } catch (e) { replier.reply(UI.make("『 에러 』", e.message)); }
}
