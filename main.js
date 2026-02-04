/**
 * [main.js] v7.4.0
 * 1. 실시간 모니터링: RAM 사용량(MB), DB 파일 크기(KB), 응답 지연(ms) 실측 반영.
 * 2. UI 최적화: 톱니 아이콘 제거, 네비게이션 간격 자동 분배, 기기별 구분선 상한선 적용.
 * 3. 데이터 무결성: 유저 프로필(레벨, 전적, 재화) 및 관리자 제어 로직 완전 포함.
 * 4. 세션 관리: 개인/단체/관리자 세션 분리 및 상태 유지.
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
    
    // 기기별 구분선 최대치 (모바일: 23, PC: 45)
    LIMITS: { MOBILE: 23, PC: 45 },

    // 시각적 너비 계산 (한글 2.0, 영문/기호 1.0)
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

    // UI 구분선 데이터 산출
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
    
    // 네비게이션 바 생성 (공백 자동 분배)
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
        
        // 네비게이션만 표시 (톱니 제거)
        ui += navBar;
        return ui;
    },
    renderMenu: function(session, isPc) {
        if (session.type === "ADMIN") return this.make("관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "보안 등급: 최고 권한", isPc);
        if (session.type === "GROUP") return this.make("메인 메뉴", "1. 내 정보 확인", "소환사의 협곡", isPc);
        if (session.type === "DIRECT") {
            if (!session.data) return this.make("메인 메뉴", "1. 회원가입\n2. 로그인", "계정 접속이 필요합니다.", isPc);
            return this.make("메인 메뉴", "1. 내 정보\n2. 컬렉션\n3. 상점\n4. 로그아웃", "환영합니다, 소환사님!", isPc);
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
    handle: function(msg, session, replier, isPc, startTime) {
        // 유저 선택 단계
        if (session.waitAction === "관리_유저선택") {
            var idx = parseInt(msg) - 1;
            if (session.userListCache[idx]) {
                session.targetUser = session.userListCache[idx];
                session.waitAction = "관리_유저제어_메뉴";
                SessionManager.save();
                var d = Database.data[session.targetUser];
                var prof = "👤 대상: " + session.targetUser + "\n🏅 [" + (d.title || "뉴비") + "]\n🏆 " + getTierInfo(d.lp) + "\n⭐ 레벨: Lv." + (d.level || 1) + "\n⚔️ 전적: " + (d.win || 0) + "승 " + (d.lose || 0) + "패\n💰 " + (d.gold || 0).toLocaleString() + " G";
                replier.reply(UI.make("유저 상세 관리", prof, "1. 수정 | 2. 초기화 | 3. 삭제", isPc));
            }
            return true;
        }

        // 제어 메뉴 단계
        if (session.waitAction === "관리_유저제어_메뉴") {
            if (msg === "1") { session.waitAction = "관리_항목선택_수정"; SessionManager.save(); replier.reply(UI.make("수정 항목 선택", "1. 골드\n2. 레벨\n3. 승수\n4. 패수\n5. LP", "수정할 번호 입력", isPc)); return true; }
            if (msg === "2") { session.waitAction = "관리_항목선택_초기화"; SessionManager.save(); replier.reply(UI.make("초기화 항목", "1. 골드\n2. 전적\n3. 전체", "번호 입력", isPc)); return true; }
            if (msg === "3") { session.waitAction = "관리_삭제확인"; SessionManager.save(); replier.reply(UI.make("삭제 경고", "해당 계정을 삭제하시겠습니까?", "'네' 입력 시 삭제", isPc)); return true; }
            return true;
        }

        // 수정 항목 선택 단계
        if (session.waitAction === "관리_항목선택_수정") {
            var fields = ["gold", "level", "win", "lose", "lp"];
            var targetIdx = parseInt(msg) - 1;
            if (fields[targetIdx]) { 
                session.editTargetField = fields[targetIdx]; 
                session.waitAction = "관리_수정값입력"; 
                SessionManager.save(); 
                replier.reply(UI.make("값 수정", "항목: " + fields[targetIdx] + "\n현재: " + (Database.data[session.targetUser][fields[targetIdx]] || 0), "새로운 숫자 입력", isPc)); 
            }
            return true;
        }

        // 값 입력 및 적용 단계
        if (session.waitAction === "관리_수정값입력") {
            var newVal = parseInt(msg);
            if (isNaN(newVal)) return true;
            Database.data[session.targetUser][session.editTargetField] = newVal;
            Database.save(Database.data);
            session.waitAction = "관리_유저제어_메뉴"; SessionManager.save();
            replier.reply(UI.make("완료", "데이터 수정이 적용되었습니다.", "", isPc));
            return true;
        }

        // 삭제 확인 단계
        if (session.waitAction === "관리_삭제확인" && msg === "네") {
            delete Database.data[session.targetUser]; Database.save(Database.data);
            session.waitAction = null; SessionManager.save();
            replier.reply(UI.make("성공", "계정 정보가 영구 삭제되었습니다.", "", isPc));
            return true;
        }

        // 초기 메뉴: 1. 시스템 정보
        if (msg === "1") {
            // [실시간 리소스 실측]
            var runtime = java.lang.Runtime.getRuntime();
            var usedMem = Math.floor((runtime.totalMemory() - runtime.freeMemory()) / 1024 / 1024); // MB
            var totalMem = Math.floor(runtime.maxMemory() / 1024 / 1024); // MB
            var latency = (new Date().getTime() - startTime); // ms
            var dbFile = new java.io.File(Config.DB_PATH);
            var dbSize = (dbFile.length() / 1024).toFixed(2); // KB

            var sys = "🛡️ 방어 시스템: ACTIVE\n" +
                      "⚡ 응답 속도: " + latency + "ms\n" +
                      "💾 DB 용량: " + dbSize + " KB\n" +
                      "📟 RAM 점유: " + usedMem + " / " + totalMem + " MB\n" +
                      "👥 총 유저: " + Object.keys(Database.data).length + "명\n" +
                      "⏰ " + new Date().toLocaleString();
            
            replier.reply(UI.make("시스템 정보", sys, "실시간 관제 데이터", isPc));
            return true;
        }
        
        // 초기 메뉴: 2. 유저 관리
        if (msg === "2") {
            var list = Object.keys(Database.data);
            session.userListCache = list; session.waitAction = "관리_유저선택"; SessionManager.save();
            replier.reply(UI.make("소환사 명부", list.map(function(id, i){ return (i+1)+". "+id; }).join("\n"), "조회할 번호 입력", isPc)); return true;
        }
        return false;
    }
};

// ━━━━━━━━ [5. 모듈: 단체톡방 로직] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier, sender, isPc) {
        if (msg === "1") {
            var d = Database.data[sender]; 
            if (!d) { replier.reply(UI.make("경고", "⚠️ 등록되지 않은 사용자입니다.", "개인톡에서 가입해 주세요.", isPc)); return true; }
            var info = "👤 " + sender + "\n🏅 [" + (d.title || "뉴비") + "]\n🏆 " + getTierInfo(d.lp) + "\n⭐ 레벨: Lv." + (d.level || 1) + "\n⚔️ 전적: " + d.win + "승 " + d.lose + "패\n💰 재화: " + d.gold.toLocaleString() + " G";
            replier.reply(UI.make("내 정보 확인", info, "전투 준비 완료", isPc)); return true;
        }
        return false;
    }
};

// ━━━━━━━━ [6. 모듈: 개인톡방 로직] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier, sender, isPc) {
        var d = session.data;
        if (!d) {
            // 미접속 상태
            if (session.waitAction === "가입_ID") { session.tempId = msg; session.waitAction = "가입_PW"; SessionManager.save(); replier.reply(UI.make("가입", "비밀번호를 설정하세요.", "", isPc)); return true; }
            if (session.waitAction === "가입_PW") {
                Database.data[session.tempId] = { pw: msg, gold: 1000, level: 1, lp: 0, win: 0, lose: 0, title: "뉴비", collection: { titles: ["뉴비"], characters: [] } };
                Database.save(Database.data); session.waitAction = null; SessionManager.save(); replier.reply(UI.make("성공", "계정이 생성되었습니다.", "로그인 해주세요.", isPc)); return true;
            }
            if (session.waitAction === "로그인_ID") { session.tempId = msg; session.waitAction = "로그인_PW"; SessionManager.save(); replier.reply(UI.make("로그인", "비밀번호를 입력하세요.", "", isPc)); return true; }
            if (session.waitAction === "로그인_PW") {
                var user = Database.data[session.tempId];
                if (user && user.pw === msg) { session.data = user; session.waitAction = null; SessionManager.save(); replier.reply(UI.renderMenu(session, isPc)); return true; }
                replier.reply(UI.make("실패", "인증 정보가 올바르지 않습니다.", "", isPc)); return true;
            }
            if (msg === "1") { session.waitAction = "가입_ID"; SessionManager.save(); replier.reply(UI.make("가입", "아이디를 입력하세요.", "", isPc)); return true; }
            if (msg === "2") { session.waitAction = "로그인_ID"; SessionManager.save(); replier.reply(UI.make("로그인", "아이디를 입력하세요.", "", isPc)); return true; }
        } else {
            // 접속 상태
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
                    if (d.collection.characters.indexOf(name) !== -1) { replier.reply(UI.make("알림", "이미 보유 중인 캐릭터입니다.", "", isPc)); return true; }
                    if (d.gold < 500) { replier.reply(UI.make("알림", "골드가 부족합니다.", "", isPc)); return true; }
                    d.gold -= 500; d.collection.characters.push(name); Database.save(Database.data);
                    replier.reply(UI.make("구매 완료", name + "을(를) 획득했습니다!", "", isPc));
                }
                return true;
            }
            if (msg === "1") { 
                var myInfo = "👤 계정: " + session.tempId + "\n🏅 [" + (d.title || "뉴비") + "]\n🏆 " + getTierInfo(d.lp) + "\n⭐ 레벨: Lv." + (d.level || 1) + "\n⚔️ 전적: " + d.win + "승 " + d.lose + "패\n💰 골드: " + d.gold.toLocaleString() + " G";
                replier.reply(UI.make("마이 페이지", myInfo, "정보 조회 성공", isPc)); return true; 
            }
            if (msg === "2") { session.lastMenu = "COLLECTION"; SessionManager.save(); replier.reply(UI.make("컬렉션", "1. 보유 칭호\n2. 보유 캐릭터", "번호 선택", isPc)); return true; }
            if (msg === "3") { session.waitAction = "상점_역할선택"; SessionManager.save(); replier.reply(UI.make("상점", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), "역할 선택", isPc)); return true; }
            if (msg === "4") { session.data = null; session.waitAction = null; SessionManager.save(); replier.reply(UI.make("알림", "로그아웃 되었습니다.", "이용해 주셔서 감사합니다.", isPc)); return true; }
        }
        return false;
    }
};

// ━━━━━━━━ [7. 메인 응답 핸들러] ━━━━━━━━
Database.data = Database.load();
SessionManager.load();

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    // 실시간 응답 속도 측정을 위한 시작 시각 기록
    var startTime = new Date().getTime();

    try {
        if (!msg) return;
        var hash = String(imageDB.getProfileHash());
        var session = SessionManager.get(room, hash, isGroupChat);
        msg = msg.trim();
        
        // 관리자 전용 방에서의 PC 카톡 판별 (해시 및 방 이름 검증)
        var isPc = (hash === Config.AdminHash && room === Config.AdminRoom);

        // 공통 명령어 처리
        if (msg === "취소") { session.waitAction = null; SessionManager.save(); return replier.reply(UI.make("알림", "작업이 취소되었습니다.", "", isPc)); }
        if (msg === "메뉴" || msg === "이전" || msg === "돌아가기") { session.waitAction = null; session.lastMenu = null; SessionManager.save(); return replier.reply(UI.renderMenu(session, isPc)); }

        // 세션 타입별 매니저 호출
        if (session.type === "ADMIN") {
            if (hash !== Config.AdminHash) return; // 관리자 권한 최종 확인
            AdminManager.handle(msg, session, replier, isPc, startTime);
        } else if (session.type === "GROUP") {
            GroupManager.handle(msg, session, replier, sender, isPc);
        } else if (session.type === "DIRECT") {
            UserManager.handle(msg, session, replier, sender, isPc);
        }

    } catch (e) {
        // 치명적 에러 발생 시 관리자 방으로 즉시 보고
        var errorMsg = "⚠️ [시스템 장애 보고]\n📍 위치: " + room + "\n🛠️ 오류: " + e.message + "\n📄 라인: " + e.lineNumber;
        Api.replyRoom(Config.AdminRoom, errorMsg);
    }
}
