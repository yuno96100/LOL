/**
 * [main.js] v7.4.6
 * 1. 명칭 변경: '마이 페이지' -> '프로필'로 수정.
 * 2. 기능 복구: 컬렉션(칭호/캐릭터 조회), 상점(역할 선택 후 캐릭터 구매) 로직 복구.
 * 3. 간섭 방지: waitAction 단계별 조건문을 강화하여 하위 메뉴 입력 시 상위 메뉴 실행 방지.
 * 4. 리소스 실측: RAM, DB, 응답 속도 실시간 측정 로직 유지.
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
        var ui = "『 " + title + " 』\n" + lineData.line + "\n" + content + "\n" + lineData.line + "\n";
        if (help) ui += "💡 " + help + "\n" + lineData.line + "\n";
        ui += navBar;
        return ui;
    },
    renderMenu: function(session, isPc) {
        if (session.type === "ADMIN") return this.make("관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "보안 등급: 최고 권한", isPc);
        if (session.type === "GROUP") return this.make("메인 메뉴", "1. 내 정보 확인", "소환사의 협곡", isPc);
        if (session.type === "DIRECT") {
            if (!session.data) return this.make("메인 메뉴", "1. 회원가입\n2. 로그인", "계정 접속 필요", isPc);
            return this.make("메인 메뉴", "1. 프로필\n2. 컬렉션\n3. 상점\n4. 로그아웃", "환영합니다!", isPc);
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
            this.sessions[h] = { data: null, waitAction: null, tempId: null, userListCache: [], targetUser: null, selectedRole: null, editTargetField: null };
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
    handle: function(msg, session, replier, isPc, startTime) {
        if (session.waitAction) {
            if (session.waitAction === "관리_유저선택") {
                var idx = parseInt(msg) - 1;
                if (session.userListCache[idx]) {
                    session.targetUser = session.userListCache[idx];
                    session.waitAction = "관리_유저제어_메뉴"; SessionManager.save();
                    var d = Database.data[session.targetUser];
                    var prof = "👤 대상: " + session.targetUser + "\n🏅 [" + (d.title || "뉴비") + "]\n🏆 " + getTierInfo(d.lp) + "\n⭐ Lv." + (d.level || 1) + "\n💰 " + (d.gold || 0).toLocaleString() + " G";
                    replier.reply(UI.make("유저 상세 관리", prof, "1. 수정 | 2. 초기화 | 3. 삭제", isPc));
                }
                return true;
            }
            if (session.waitAction === "관리_유저제어_메뉴") {
                if (msg === "1") { session.waitAction = "관리_항목선택_수정"; SessionManager.save(); replier.reply(UI.make("수정 항목", "1. 골드\n2. 레벨\n3. 승수\n4. 패수\n5. LP", "번호 선택", isPc)); return true; }
                if (msg === "3") { session.waitAction = "관리_삭제확인"; SessionManager.save(); replier.reply(UI.make("삭제 확인", "정말 삭제하시겠습니까?", "'네' 입력", isPc)); return true; }
                return true;
            }
        }

        if (msg === "1") {
            var rt = java.lang.Runtime.getRuntime();
            var used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
            var lat = (new Date().getTime() - startTime);
            var dbSz = (new java.io.File(Config.DB_PATH).length() / 1024).toFixed(2);
            var res = "⚡ 속도: " + lat + "ms\n💾 DB: " + dbSz + " KB\n📟 RAM: " + used + " MB\n👥 유저: " + Object.keys(Database.data).length + "명";
            replier.reply(UI.make("시스템 정보", res, "실시간 관제 중", isPc)); return true;
        }
        if (msg === "2") {
            var list = Object.keys(Database.data);
            session.userListCache = list; session.waitAction = "관리_유저선택"; SessionManager.save();
            replier.reply(UI.make("소환사 명부", list.map(function(id, i){ return (i+1)+". "+id; }).join("\n"), "번호 입력", isPc)); return true;
        }
        return false;
    }
};

// ━━━━━━━━ [5. 모듈: 개인톡방 로직 (핵심 복구)] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier, sender, isPc) {
        var d = session.data;
        if (!d) {
            // 가입/로그인 로직
            if (session.waitAction === "가입_ID") { session.tempId = msg; session.waitAction = "가입_PW"; SessionManager.save(); replier.reply(UI.make("가입", "비밀번호 설정", "", isPc)); return true; }
            if (session.waitAction === "가입_PW") {
                Database.data[session.tempId] = { pw: msg, gold: 1000, level: 1, lp: 0, win: 0, lose: 0, title: "뉴비", collection: { titles: ["뉴비"], characters: [] } };
                Database.save(Database.data); session.waitAction = null; SessionManager.save(); replier.reply(UI.make("성공", "가입 완료", "로그인 하세요.", isPc)); return true;
            }
            if (msg === "1") { session.waitAction = "가입_ID"; SessionManager.save(); replier.reply(UI.make("가입", "아이디 입력", "", isPc)); return true; }
            if (msg === "2") { session.waitAction = "로그인_ID"; SessionManager.save(); replier.reply(UI.make("로그인", "아이디 입력", "", isPc)); return true; }
        } else {
            // 로그인 후 메뉴 (간섭 방지용 waitAction 우선 처리)
            if (session.waitAction === "컬렉션_메뉴") {
                if (msg === "1") { replier.reply(UI.make("보유 칭호", d.collection.titles.join(", "), "", isPc)); return true; }
                if (msg === "2") { replier.reply(UI.make("보유 캐릭터", d.collection.characters.length > 0 ? d.collection.characters.join("\n") : "없음", "", isPc)); return true; }
                return true;
            }
            if (session.waitAction === "상점_역할선택") {
                var rIdx = parseInt(msg) - 1;
                if (RoleKeys[rIdx]) {
                    session.selectedRole = RoleKeys[rIdx]; session.waitAction = "상점_구매"; SessionManager.save();
                    var list = SystemData.roles[session.selectedRole].units.map(function(u, i) {
                        var owned = d.collection.characters.indexOf(u) !== -1 ? " [보유]" : " (500G)";
                        return (i+1) + ". " + u + owned;
                    }).join("\n");
                    replier.reply(UI.make("구매: " + session.selectedRole, list, "번호 입력 (취소: '이전')", isPc));
                }
                return true;
            }
            if (session.waitAction === "상점_구매") {
                var units = SystemData.roles[session.selectedRole].units;
                var uIdx = parseInt(msg) - 1;
                if (units[uIdx]) {
                    var target = units[uIdx];
                    if (d.collection.characters.indexOf(target) !== -1) { replier.reply(UI.make("알림", "이미 보유 중입니다.", "", isPc)); return true; }
                    if (d.gold < 500) { replier.reply(UI.make("알림", "골드가 부족합니다.", "", isPc)); return true; }
                    d.gold -= 500; d.collection.characters.push(target); Database.save(Database.data);
                    replier.reply(UI.make("성공", target + " 영입 완료!", "잔액: " + d.gold + "G", isPc));
                }
                return true;
            }

            // 메인 카테고리
            if (msg === "1") { // 프로필 (명칭 변경)
                var my = "👤 " + session.tempId + "\n🏅 [" + d.title + "]\n🏆 " + getTierInfo(d.lp) + "\n⭐ Lv." + d.level + "\n⚔️ " + d.win + "승 " + d.lose + "패\n💰 " + d.gold.toLocaleString() + " G";
                replier.reply(UI.make("프로필", my, "정보 조회 완료", isPc)); return true; 
            }
            if (msg === "2") { // 컬렉션 (복구)
                session.waitAction = "컬렉션_메뉴"; SessionManager.save();
                replier.reply(UI.make("컬렉션", "1. 보유 칭호\n2. 보유 캐릭터", "번호 선택", isPc)); return true;
            }
            if (msg === "3") { // 상점 (복구)
                session.waitAction = "상점_역할선택"; SessionManager.save();
                replier.reply(UI.make("상점", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), "역할 선택", isPc)); return true;
            }
            if (msg === "4") { session.data = null; SessionManager.save(); replier.reply(UI.make("알림", "로그아웃 되었습니다.", "", isPc)); return true; }
        }
        return false;
    }
};

// ━━━━━━━━ [6. 모듈: 단체톡방 로직] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier, sender, isPc) {
        if (msg === "1") {
            var d = Database.data[sender]; 
            if (!d) { replier.reply(UI.make("알림", "가입 정보가 없습니다.", "개인톡에서 가입해 주세요.", isPc)); return true; }
            var info = "👤 " + sender + "\n🏆 " + getTierInfo(d.lp) + "\n⭐ Lv." + d.level + "\n💰 " + d.gold.toLocaleString() + " G";
            replier.reply(UI.make("내 정보", info, "단체방 조회", isPc)); return true;
        }
        return false;
    }
};

// ━━━━━━━━ [7. 메인 응답 핸들러] ━━━━━━━━
Database.data = Database.load();
SessionManager.load();

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    var startTime = new Date().getTime();
    try {
        if (!msg) return;
        var hash = String(imageDB.getProfileHash());
        var session = SessionManager.get(room, hash, isGroupChat);
        msg = msg.trim();
        var isPc = (hash === Config.AdminHash && room === Config.AdminRoom);

        if (msg === "취소") { session.waitAction = null; SessionManager.save(); return replier.reply(UI.make("알림", "명령 취소", "", isPc)); }
        if (msg === "메뉴" || msg === "이전" || msg === "돌아가기") { session.waitAction = null; SessionManager.save(); return replier.reply(UI.renderMenu(session, isPc)); }

        if (session.type === "ADMIN" && hash === Config.AdminHash) {
            AdminManager.handle(msg, session, replier, isPc, startTime);
        } else if (session.type === "GROUP") {
            GroupManager.handle(msg, session, replier, sender, isPc);
        } else if (session.type === "DIRECT") {
            UserManager.handle(msg, session, replier, sender, isPc);
        }
    } catch (e) {
        Api.replyRoom(Config.AdminRoom, "⚠️ 에러: " + e.message + " (L:" + e.lineNumber + ")");
    }
}
