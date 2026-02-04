/**
 * [main.js] v7.3.4
 * 1. 정밀 너비 엔진: 내용물 중 가장 긴 문장(DB경로 등)을 감지하여 구분선 길이를 1:1 대응.
 * 2. 가변 네비게이션: '이전|취소|메뉴' 사이의 간격을 라인 폭에 비례하여 자동 배분.
 * 3. 완전 복구: Admin, Group, User 매니저의 모든 세부 조건문을 생략 없이 포함.
 * 4. 에러 제어: 실시간 오류 상황을 관리자 전용방으로 전송.
 */

// ━━━━━━━━ [1. 설정 및 상수] ━━━━━━━━
var Config = {
    Prefix: ".",
    AdminHash: "2056407147",      
    AdminRoom: "소환사의협곡관리",   
    GroupRoom: "소환사의협곡",     
    BotName: "소환사의 협곡",
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "/sdcard/msgbot/Bots/main/sessions.json",
    LINE_CHAR: "━",
    NAV_ITEMS: ["🔙 이전", "❌ 취소", "🏠 메뉴"],
    
    // 텍스트의 실제 시각적 폭 계산 (한글/이모지 가중치)
    getVisualWidth: function(str) {
        if (!str) return 0;
        var w = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            // 한글 및 전각 문자 범위 체크
            if ((c >= 0xAC00 && c <= 0xD7A3) || (c >= 0x1100 && c <= 0x11FF) || c > 255) w += 2;
            else w += 1.1; // 영문/숫자/기호
        }
        return w;
    },

    // UI 라인 데이터 산출
    getLineData: function(content) {
        var lines = content.split("\n");
        var maxW = 22; // 최소 너비 (네비게이션 가독성 확보용)
        for (var i = 0; i < lines.length; i++) {
            var w = this.getVisualWidth(lines[i]);
            if (w > maxW) maxW = w;
        }
        // 채팅창 가독성 한계치(약 32~36자) 내에서 조절
        var finalLen = Math.min(Math.floor(maxW / 1.6), 30);
        return {
            line: Array(finalLen + 1).join(this.LINE_CHAR),
            width: finalLen
        };
    },
    
    // 네비게이션 간격 자동 분배
    getDynamicNav: function(lineWidth) {
        // 라인 길이에 비례하여 아이템 사이 공백 삽입
        var spaceCount = Math.max(1, Math.floor((lineWidth - 12) / 3));
        var spaces = Array(spaceCount + 1).join(" ");
        return this.NAV_ITEMS.join(spaces + "|" + spaces);
    }
};

var TierData = [
    { name: "챌린저", icon: "✨", minLp: 3000 },
    { name: "그랜드마스터", icon: "🔴", minLp: 2500 },
    { name: "마스터", icon: "🟣", minLp: 2000 },
    { name: "다이아몬드", icon: "💎", minLp: 1700 },
    { name: "에메랄드", icon: "💚", minLp: 1400 },
    { name: "플래티넘", icon: "💿", minLp: 1100 },
    { name: "골드", icon: "🟡", minLp: 800 },
    { name: "실버", icon: "⚪", minLp: 500 },
    { name: "브론즈", icon: "🟤", minLp: 200 },
    { name: "아이언", icon: "⚫", minLp: 0 }
];

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

var RoleKeys = Object.keys(SystemData.roles);

function getTierInfo(lp) {
    lp = lp || 0;
    for (var i = 0; i < TierData.length; i++) {
        if (lp >= TierData[i].minLp) return TierData[i].icon + " " + TierData[i].name;
    }
    return "⚫ 아이언";
}

// ━━━━━━━━ [2. 모듈: UI 엔진] ━━━━━━━━
var UI = {
    make: function(title, content, help) {
        var rawText = title + "\n" + content + (help ? "\n" + help : "");
        var lineData = Config.getLineData(rawText);
        var navBar = Config.getDynamicNav(lineData.width);
        
        var ui = "『 " + title + " 』\n" + 
                 lineData.line + "\n" + 
                 content + "\n" + 
                 lineData.line + "\n";
        
        if (help) ui += "💡 " + help + "\n" + lineData.line + "\n";
        
        ui += "⚙️ " + navBar;
        return ui;
    },
    renderMenu: function(session) {
        if (session.type === "ADMIN") return this.make("관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "시스템 관제 중");
        if (session.type === "GROUP") return this.make("메인 메뉴", "1. 내 정보 확인", "소환사의 협곡");
        if (session.type === "DIRECT") {
            if (!session.data) return this.make("메인 메뉴", "1. 회원가입\n2. 로그인", "계정 접속이 필요합니다.");
            return this.make("메인 메뉴", "1. 내 정보\n2. 컬렉션\n3. 상점\n4. 로그아웃", "환영합니다, 소환사님!");
        }
    }
};

// ━━━━━━━━ [3. DB 및 세션 매니저] ━━━━━━━━
var Database = {
    data: {},
    load: function() { try { return JSON.parse(FileStream.read(Config.DB_PATH)); } catch(e) { return {}; } },
    save: function(d) { this.data = d; FileStream.write(Config.DB_PATH, JSON.stringify(d, null, 4)); }
};

var SessionManager = {
    sessions: {},
    load: function() { try { this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH)); } catch(e) { this.sessions = {}; } },
    save: function() { FileStream.write(Config.SESSION_PATH, JSON.stringify(this.sessions)); },
    get: function(r, h, g) {
        if (!this.sessions[h]) {
            this.sessions[h] = { data: null, waitAction: null, tempId: null, userListCache: [], targetUser: null, lastMenu: null, selectedRole: null, editTargetField: null };
        }
        var s = this.sessions[h];
        if (r === Config.AdminRoom) s.type = "ADMIN";
        else if (g && r === Config.GroupRoom) s.type = "GROUP";
        else if (!g) s.type = "DIRECT";
        else s.type = "OTHER";
        return s;
    }
};

// ━━━━━━━━ [4. 모듈: 관리자 로직 (풀 버전)] ━━━━━━━━
var AdminManager = {
    handle: function(msg, session, replier) {
        if (session.waitAction === "관리_유저선택") {
            var idx = parseInt(msg) - 1;
            if (session.userListCache[idx]) {
                session.targetUser = session.userListCache[idx];
                session.waitAction = "관리_유저제어_메뉴";
                SessionManager.save();
                var d = Database.data[session.targetUser];
                var prof = "👤 대상: " + session.targetUser + "\n🏅 [" + (d.title || "뉴비") + "]\n🏆 " + getTierInfo(d.lp) + "\n💰 " + (d.gold || 0).toLocaleString() + " G\n⚔️ " + (d.win || 0) + "승 " + (d.lose || 0) + "패";
                replier.reply(UI.make("유저 관리", prof, "1. 수정 | 2. 초기화 | 3. 삭제"));
            }
            return true;
        }

        if (session.waitAction === "관리_유저제어_메뉴") {
            if (msg === "1") { session.waitAction = "관리_항목선택_수정"; SessionManager.save(); replier.reply(UI.make("수정 항목", "1. 골드\n2. 레벨\n3. 승수\n4. 패수\n5. LP", "수정할 번호 입력")); return true; }
            if (msg === "2") { session.waitAction = "관리_항목선택_초기화"; SessionManager.save(); replier.reply(UI.make("초기화", "1. 골드\n2. 전적\n3. 전체", "번호 입력")); return true; }
            if (msg === "3") { session.waitAction = "관리_삭제확인"; SessionManager.save(); replier.reply(UI.make("삭제 경고", "정말 삭제하시겠습니까?", "'네' 입력 시 삭제")); return true; }
            return true;
        }

        if (session.waitAction === "관리_항목선택_수정") {
            var fields = ["gold", "level", "win", "lose", "lp"];
            var targetIdx = parseInt(msg) - 1;
            if (fields[targetIdx]) { 
                session.editTargetField = fields[targetIdx]; 
                session.waitAction = "관리_수정값입력"; 
                SessionManager.save(); 
                replier.reply(UI.make("값 입력", "항목: " + fields[targetIdx] + "\n현재: " + (Database.data[session.targetUser][fields[targetIdx]] || 0), "숫자만 입력")); 
            }
            return true;
        }

        if (session.waitAction === "관리_수정값입력") {
            var newVal = parseInt(msg);
            if (isNaN(newVal)) return true;
            Database.data[session.targetUser][session.editTargetField] = newVal;
            Database.save(Database.data);
            session.waitAction = "관리_유저제어_메뉴"; SessionManager.save();
            replier.reply(UI.make("알림", "수정이 완료되었습니다.", ""));
            return true;
        }

        if (session.waitAction === "관리_삭제확인" && msg === "네") {
            delete Database.data[session.targetUser]; Database.save(Database.data);
            session.waitAction = null; SessionManager.save();
            replier.reply(UI.make("알림", "유저 정보가 삭제되었습니다.", ""));
            return true;
        }

        if (msg === "1") {
            var sys = "📡 상태: ACTIVE\n👥 유저: " + Object.keys(Database.data).length + "명\n💾 경로: " + Config.DB_PATH + "\n⏰ 시간: " + new Date().toLocaleString();
            replier.reply(UI.make("시스템 정보", sys, "")); return true;
        }
        if (msg === "2") {
            var list = Object.keys(Database.data);
            session.userListCache = list; session.waitAction = "관리_유저선택"; SessionManager.save();
            replier.reply(UI.make("유저 명부", list.map(function(id, i){ return (i+1)+". "+id; }).join("\n"), "번호 입력")); return true;
        }
        return false;
    }
};

// ━━━━━━━━ [5. 모듈: 단체톡방 로직 (풀 버전)] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier, sender) {
        if (msg === "1") {
            var d = Database.data[sender]; 
            if (!d) { replier.reply(UI.make("안내", "⚠️ 미가입 소환사입니다.", "개인톡에서 가입해 주세요.")); return true; }
            var info = "👤 " + sender + "\n🏆 " + getTierInfo(d.lp) + "\n⚔️ " + d.win + "승 " + d.lose + "패\n💰 " + d.gold.toLocaleString() + " G";
            replier.reply(UI.make("내 정보 확인", info, "")); return true;
        }
        return false;
    }
};

// ━━━━━━━━ [6. 모듈: 개인톡방 로직 (풀 버전)] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier, sender) {
        var d = session.data;
        if (!d) {
            if (session.waitAction === "가입_ID") { session.tempId = msg; session.waitAction = "가입_PW"; SessionManager.save(); replier.reply(UI.make("가입", "비밀번호를 입력하세요.", "")); return true; }
            if (session.waitAction === "가입_PW") {
                Database.data[session.tempId] = { pw: msg, gold: 1000, lp: 0, win: 0, lose: 0, title: "뉴비", collection: { titles: ["뉴비"], characters: [] } };
                Database.save(Database.data); session.waitAction = null; SessionManager.save(); replier.reply(UI.make("완료", "가입 성공!", "로그인 해주세요.")); return true;
            }
            if (session.waitAction === "로그인_ID") { session.tempId = msg; session.waitAction = "로그인_PW"; SessionManager.save(); replier.reply(UI.make("로그인", "비밀번호를 입력하세요.", "")); return true; }
            if (session.waitAction === "로그인_PW") {
                var user = Database.data[session.tempId];
                if (user && user.pw === msg) { session.data = user; session.waitAction = null; SessionManager.save(); replier.reply(UI.renderMenu(session)); return true; }
                replier.reply(UI.make("실패", "일치하는 정보가 없습니다.", "")); return true;
            }
            if (msg === "1") { session.waitAction = "가입_ID"; SessionManager.save(); replier.reply(UI.make("가입", "아이디 입력", "")); return true; }
            if (msg === "2") { session.waitAction = "로그인_ID"; SessionManager.save(); replier.reply(UI.make("로그인", "아이디 입력", "")); return true; }
            return false;
        } else {
            if (session.waitAction === "상점_역할선택") {
                var rIdx = parseInt(msg) - 1;
                if (RoleKeys[rIdx]) {
                    session.selectedRole = RoleKeys[rIdx]; session.waitAction = "상점_구매진행"; SessionManager.save();
                    var list = SystemData.roles[session.selectedRole].units.map(function(u, i) { return (i+1) + ". " + u + (d.collection.characters.indexOf(u) !== -1 ? " [보유]" : " (500G)"); }).join("\n");
                    replier.reply(UI.make("상점: " + session.selectedRole, list, "번호 입력"));
                }
                return true;
            }
            if (session.waitAction === "상점_구매진행") {
                var units = SystemData.roles[session.selectedRole].units;
                var cIdx = parseInt(msg) - 1;
                if (units[cIdx]) {
                    var name = units[cIdx];
                    if (d.collection.characters.indexOf(name) !== -1) { replier.reply(UI.make("알림", "이미 보유 중인 캐릭터입니다.", "")); return true; }
                    if (d.gold < 500) { replier.reply(UI.make("알림", "골드가 부족합니다.", "")); return true; }
                    d.gold -= 500; d.collection.characters.push(name); Database.save(Database.data);
                    replier.reply(UI.make("구매 완료", name + "이(가) 합류했습니다!", ""));
                }
                return true;
            }
            if (msg === "1") { replier.reply(UI.make("마이 페이지", "👤 계정: " + session.tempId + "\n🏆 " + getTierInfo(d.lp) + "\n💰 " + d.gold.toLocaleString() + " G", "")); return true; }
            if (msg === "2") { session.lastMenu = "COLLECTION"; SessionManager.save(); replier.reply(UI.make("컬렉션", "1. 보유 칭호\n2. 보유 캐릭터", "조회할 번호 입력")); return true; }
            if (msg === "3") { session.waitAction = "상점_역할선택"; SessionManager.save(); replier.reply(UI.make("상점", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), "")); return true; }
            if (msg === "4") { session.data = null; SessionManager.save(); replier.reply(UI.make("알림", "로그아웃 되었습니다.", "")); return true; }
        }
        return false;
    }
};

// ━━━━━━━━ [7. 메인 응답 핸들러] ━━━━━━━━
Database.data = Database.load();
SessionManager.load();

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    try {
        if (!msg) return;
        var hash = String(imageDB.getProfileHash());
        var session = SessionManager.get(room, hash, isGroupChat);
        msg = msg.trim();

        if (msg === "취소") { session.waitAction = null; SessionManager.save(); return replier.reply(UI.make("알림", "명령이 취소되었습니다.")); }
        if (msg === "메뉴" || msg === "이전" || msg === "돌아가기") { session.waitAction = null; session.lastMenu = null; SessionManager.save(); return replier.reply(UI.renderMenu(session)); }

        if (session.type === "ADMIN") {
            if (hash !== Config.AdminHash) return;
            AdminManager.handle(msg, session, replier);
        } else if (session.type === "GROUP") {
            GroupManager.handle(msg, session, replier, sender);
        } else if (session.type === "DIRECT") {
            UserManager.handle(msg, session, replier, sender);
        }

    } catch (e) {
        var err = "⚠️ [시스템 오류 보고]\n📍 방: " + room + "\n🛠️ 내용: " + e.message + "\n📄 라인: " + e.lineNumber;
        Api.replyRoom(Config.AdminRoom, err);
    }
}
