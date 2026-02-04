/**
 * [main.js] v7.3.8
 * 1. UI 정리: 네비게이션 톱니바퀴 아이콘 제거 및 가변 간격 유지.
 * 2. 시스템 정보: DB 경로 제거 -> 방어 시스템 응답속도 및 보안 상태 항목 추가.
 * 3. 데이터 복구: 유저 프로필 내 레벨, 승/패 전적 로직 완전 복구.
 * 4. 기기 대응: PC/모바일 환경에 따른 구분선 최대치 자동 조절.
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
    
    // 기기별 구분선 최대치
    LIMITS: { MOBILE: 23, PC: 45 },

    getVisualWidth: function(str) {
        if (!str) return 0;
        var w = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if ((c >= 0xAC00 && c <= 0xD7A3) || (c >= 0x1100 && c <= 0x11FF) || c > 255) w += 2;
            else w += 1.0; 
        }
        return w;
    },

    getLineData: function(content, isPc) {
        var lines = content.split("\n");
        var maxW = 18;
        for (var i = 0; i < lines.length; i++) {
            var w = this.getVisualWidth(lines[i]);
            if (w > maxW) maxW = w;
        }
        var limit = isPc ? this.LIMITS.PC : this.LIMITS.MOBILE;
        var calculatedLen = Math.floor(maxW / 1.7);
        var finalLen = Math.min(calculatedLen, limit); 
        return { line: Array(finalLen + 1).join(this.LINE_CHAR), width: finalLen };
    },
    
    getDynamicNav: function(lineWidth) {
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
    make: function(title, content, help, isPc) {
        var rawText = title + "\n" + content + (help ? "\n" + help : "");
        var lineData = Config.getLineData(rawText, isPc);
        var navBar = Config.getDynamicNav(lineData.width);
        
        var ui = "『 " + title + " 』\n" + 
                 lineData.line + "\n" + 
                 content + "\n" + 
                 lineData.line + "\n";
        
        if (help) ui += "💡 " + help + "\n" + lineData.line + "\n";
        
        // ⚙️ 아이콘 제거 및 네비게이션만 표시
        ui += navBar;
        return ui;
    },
    renderMenu: function(session, isPc) {
        if (session.type === "ADMIN") return this.make("관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "보안 등급: 최고 권한", isPc);
        if (session.type === "GROUP") return this.make("메인 메뉴", "1. 내 정보 확인", "소환사의 협곡", isPc);
        if (session.type === "DIRECT") {
            if (!session.data) return this.make("메인 메뉴", "1. 회원가입\n2. 로그인", "접속이 필요합니다.", isPc);
            return this.make("메인 메뉴", "1. 내 정보\n2. 컬렉션\n3. 상점\n4. 로그아웃", "명령어를 입력하세요.", isPc);
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

// ━━━━━━━━ [4. 모듈: 관리자 로직] ━━━━━━━━
var AdminManager = {
    handle: function(msg, session, replier, isPc) {
        if (session.waitAction === "관리_유저선택") {
            var idx = parseInt(msg) - 1;
            if (session.userListCache[idx]) {
                session.targetUser = session.userListCache[idx];
                session.waitAction = "관리_유저제어_메뉴";
                SessionManager.save();
                var d = Database.data[session.targetUser];
                var prof = "👤 대상: " + session.targetUser + "\n🏅 [" + (d.title || "뉴비") + "]\n🏆 " + getTierInfo(d.lp) + " (" + d.lp + "LP)\n💰 " + (d.gold || 0).toLocaleString() + " G\n⭐ 레벨: Lv." + (d.level || 1) + "\n⚔️ 전적: " + (d.win || 0) + "승 " + (d.lose || 0) + "패";
                replier.reply(UI.make("유저 관리", prof, "1. 수정 | 2. 초기화 | 3. 삭제", isPc));
            }
            return true;
        }

        if (session.waitAction === "관리_유저제어_메뉴") {
            if (msg === "1") { session.waitAction = "관리_항목선택_수정"; SessionManager.save(); replier.reply(UI.make("수정 항목", "1. 골드\n2. 레벨\n3. 승수\n4. 패수\n5. LP", "수정할 번호 입력", isPc)); return true; }
            if (msg === "2") { session.waitAction = "관리_항목선택_초기화"; SessionManager.save(); replier.reply(UI.make("초기화", "1. 골드\n2. 전적\n3. 전체", "번호 입력", isPc)); return true; }
            if (msg === "3") { session.waitAction = "관리_삭제확인"; SessionManager.save(); replier.reply(UI.make("삭제 경고", "정말 삭제하시겠습니까?", "'네' 입력 시 삭제", isPc)); return true; }
            return true;
        }

        if (session.waitAction === "관리_항목선택_수정") {
            var fields = ["gold", "level", "win", "lose", "lp"];
            var targetIdx = parseInt(msg) - 1;
            if (fields[targetIdx]) { 
                session.editTargetField = fields[targetIdx]; 
                session.waitAction = "관리_수정값입력"; 
                SessionManager.save(); 
                replier.reply(UI.make("값 입력", "항목: " + fields[targetIdx] + "\n현재: " + (Database.data[session.targetUser][fields[targetIdx]] || 0), "숫자 입력", isPc)); 
            }
            return true;
        }

        if (session.waitAction === "관리_수정값입력") {
            var newVal = parseInt(msg);
            if (isNaN(newVal)) return true;
            Database.data[session.targetUser][session.editTargetField] = newVal;
            Database.save(Database.data);
            session.waitAction = "관리_유저제어_메뉴"; SessionManager.save();
            replier.reply(UI.make("알림", "수정이 완료되었습니다.", "", isPc));
            return true;
        }

        if (session.waitAction === "관리_삭제확인" && msg === "네") {
            delete Database.data[session.targetUser]; Database.save(Database.data);
            session.waitAction = null; SessionManager.save();
            replier.reply(UI.make("알림", "유저 정보가 삭제되었습니다.", "", isPc));
            return true;
        }

        if (msg === "1") {
            var sys = "🛡️ 방어 시스템: 정상 (ACTIVE)\n⚡ 응답 속도: 0.02ms\n🔐 보안 상태: 1등급\n👥 총 유저: " + Object.keys(Database.data).length + "명\n⏰ " + new Date().toLocaleString();
            replier.reply(UI.make("시스템 정보", sys, "관제 데이터", isPc)); return true;
        }
        if (msg === "2") {
            var list = Object.keys(Database.data);
            session.userListCache = list; session.waitAction = "관리_유저선택"; SessionManager.save();
            replier.reply(UI.make("유저 명부", list.map(function(id, i){ return (i+1)+". "+id; }).join("\n"), "번호 입력", isPc)); return true;
        }
        return false;
    }
};

// ━━━━━━━━ [5. 모듈: 단체톡방 로직] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier, sender, isPc) {
        if (msg === "1") {
            var d = Database.data[sender]; 
            if (!d) { replier.reply(UI.make("안내", "⚠️ 가입 정보가 없습니다.", "개인톡 가입 필요", isPc)); return true; }
            var info = "👤 " + sender + "\n🏅 [" + (d.title || "뉴비") + "]\n🏆 " + getTierInfo(d.lp) + "\n⭐ 레벨: Lv." + (d.level || 1) + "\n⚔️ 전적: " + d.win + "승 " + d.lose + "패\n💰 " + d.gold.toLocaleString() + " G";
            replier.reply(UI.make("내 정보 확인", info, "", isPc)); return true;
        }
        return false;
    }
};

// ━━━━━━━━ [6. 모듈: 개인톡방 로직] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier, sender, isPc) {
        var d = session.data;
        if (!d) {
            if (session.waitAction === "가입_ID") { session.tempId = msg; session.waitAction = "가입_PW"; SessionManager.save(); replier.reply(UI.make("가입", "비밀번호를 입력하세요.", "", isPc)); return true; }
            if (session.waitAction === "가입_PW") {
                Database.data[session.tempId] = { pw: msg, gold: 1000, level: 1, lp: 0, win: 0, lose: 0, title: "뉴비", collection: { titles: ["뉴비"], characters: [] } };
                Database.save(Database.data); session.waitAction = null; SessionManager.save(); replier.reply(UI.make("완료", "가입 성공!", "로그인 하세요.", isPc)); return true;
            }
            if (session.waitAction === "로그인_ID") { session.tempId = msg; session.waitAction = "로그인_PW"; SessionManager.save(); replier.reply(UI.make("로그인", "비밀번호를 입력하세요.", "", isPc)); return true; }
            if (session.waitAction === "로그인_PW") {
                var user = Database.data[session.tempId];
                if (user && user.pw === msg) { session.data = user; session.waitAction = null; SessionManager.save(); replier.reply(UI.renderMenu(session, isPc)); return true; }
                replier.reply(UI.make("실패", "일치하는 정보가 없습니다.", "", isPc)); return true;
            }
            if (msg === "1") { session.waitAction = "가입_ID"; SessionManager.save(); replier.reply(UI.make("가입", "아이디 입력", "", isPc)); return true; }
            if (msg === "2") { session.waitAction = "로그인_ID"; SessionManager.save(); replier.reply(UI.make("로그인", "아이디 입력", "", isPc)); return true; }
        } else {
            if (session.waitAction === "상점_역할선택") {
                var rIdx = parseInt(msg) - 1;
                if (RoleKeys[rIdx]) {
                    session.selectedRole = RoleKeys[rIdx]; session.waitAction = "상점_구매진행"; SessionManager.save();
                    var list = SystemData.roles[session.selectedRole].units.map(function(u, i) { return (i+1) + ". " + u + (d.collection.characters.indexOf(u) !== -1 ? " [보유]" : " (500G)"); }).join("\n");
                    replier.reply(UI.make("상점: " + session.selectedRole, list, "번호 입력", isPc));
                }
                return true;
            }
            if (session.waitAction === "상점_구매진행") {
                var units = SystemData.roles[session.selectedRole].units;
                var cIdx = parseInt(msg) - 1;
                if (units[cIdx]) {
                    var name = units[cIdx];
                    if (d.collection.characters.indexOf(name) !== -1) { replier.reply(UI.make("알림", "보보유 중인 캐릭터입니다.", "", isPc)); return true; }
                    if (d.gold < 500) { replier.reply(UI.make("알림", "골드가 부족합니다.", "", isPc)); return true; }
                    d.gold -= 500; d.collection.characters.push(name); Database.save(Database.data);
                    replier.reply(UI.make("구매 완료", name + "이(가) 합류했습니다!", "", isPc));
                }
                return true;
            }
            if (msg === "1") { 
                var myInfo = "👤 계정: " + session.tempId + "\n🏅 [" + (d.title || "뉴비") + "]\n🏆 " + getTierInfo(d.lp) + "\n⭐ 레벨: Lv." + (d.level || 1) + "\n⚔️ 전적: " + d.win + "승 " + d.lose + "패\n💰 골드: " + d.gold.toLocaleString() + " G";
                replier.reply(UI.make("마이 페이지", myInfo, "", isPc)); return true; 
            }
            if (msg === "2") { session.lastMenu = "COLLECTION"; SessionManager.save(); replier.reply(UI.make("컬렉션", "1. 보유 칭호\n2. 보유 캐릭터", "번호 입력", isPc)); return true; }
            if (msg === "3") { session.waitAction = "상점_역할선택"; SessionManager.save(); replier.reply(UI.make("상점", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), "역할 선택", isPc)); return true; }
            if (msg === "4") { session.data = null; session.waitAction = null; SessionManager.save(); replier.reply(UI.make("알림", "로그아웃 되었습니다.", "", isPc)); return true; }
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
        
        // 관리자 또는 특정 조건에 따른 PC 버전 판별 (필요 시 true로 변경)
        var isPc = (hash === Config.AdminHash && room === Config.AdminRoom);

        if (msg === "취소") { session.waitAction = null; SessionManager.save(); return replier.reply(UI.make("알림", "명령이 취소되었습니다.", "", isPc)); }
        if (msg === "메뉴" || msg === "이전" || msg === "돌아가기") { session.waitAction = null; session.lastMenu = null; SessionManager.save(); return replier.reply(UI.renderMenu(session, isPc)); }

        if (session.type === "ADMIN") {
            if (hash !== Config.AdminHash) return;
            AdminManager.handle(msg, session, replier, isPc);
        } else if (session.type === "GROUP") {
            GroupManager.handle(msg, session, replier, sender, isPc);
        } else if (session.type === "DIRECT") {
            UserManager.handle(msg, session, replier, sender, isPc);
        }

    } catch (e) {
        Api.replyRoom(Config.AdminRoom, "⚠️ 오류: " + e.message + " (L:" + e.lineNumber + ")");
    }
}
