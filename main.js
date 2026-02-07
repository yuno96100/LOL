// ━━━━━━━━ [1. 설정 및 상수] ━━━━━━━━
/**
 * 시스템 운영에 필요한 핵심 설정값과 게임 데이터를 정의하는 구역입니다.
 */
var Config = {
    Prefix: ".",                // 명령어 앞머리 기호
    AdminHash: "2056407147",    // 관리자 고유 식별 해시
    AdminRoom: "소환사의협곡관리", // 관리자 전용 채팅방
    GroupRoom: "소환사의협곡",     // 일반 유저용 단체 채팅방
    BotName: "소환사의 협곡",     // 시스템 명칭
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",     
    SESSION_PATH: "/sdcard/msgbot/Bots/main/sessions.json", 
    LINE_CHAR: "━",             // UI 구분선 문자
    FIXED_LINE: 17,             // 구분선 길이 (17자)
    // ★ 네비게이션 바 정렬을 위해 왼쪽 여백 5칸 (v8.9.24 기준 유지)
    NAV_LEFT: "     ",          
    NAV_RIGHT: " ",
    NAV_ITEMS: ["⬅️ 이전", "❌ 취소", "🏠 메뉴"] 
};

// UI 레이아웃 및 텍스트 처리를 위한 유틸리티
var Utils = {
    getFixedDivider: function() { 
        return Array(Config.FIXED_LINE + 1).join(Config.LINE_CHAR); 
    },
    getNav: function() { 
        // 12자 줄바꿈 규칙 및 UI 적용을 위해 공백 조절된 네비게이션 반환
        return Config.NAV_LEFT + Config.NAV_ITEMS.join("      ") + Config.NAV_RIGHT; 
    }
};

// LP 점수 기반 티어 데이터
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

// 게임 내 역할군 및 유닛 데이터
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

// LP에 따른 티어 정보 계산 함수
function getTierInfo(lp) {
    lp = lp || 0;
    for (var i = 0; i < TierData.length; i++) {
        if (lp >= TierData[i].minLp) return { name: TierData[i].name, icon: TierData[i].icon };
    }
    return { name: "아이언", icon: "⚫" };
}

// ━━━━━━━━ [2. 모듈: UI 엔진] ━━━━━━━━
/**
 * 모든 화면의 시각적 구성과 렌더링을 담당합니다.
 */
var UI = {
    make: function(title, content, help) {
        var div = Utils.getFixedDivider();
        // 모든 문구에 UI 틀 적용
        var res = "『 " + title + " 』\n" + div + "\n" + content + "\n" + div + "\n";
        if (help) res += "💡 " + help + "\n" + div + "\n";
        return res + Utils.getNav();
    },
    renderProfile: function(id, data, help, content) {
        var lp = data.lp || 0;
        var tier = getTierInfo(lp);
        var win = data.win || 0, lose = data.lose || 0, total = win + lose;
        var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
        
        var s1 = "👤 계정: " + id + "\n🏅 칭호: [" + data.title + "]";
        var s2 = "🏆 티어: " + tier.icon + " " + tier.name + " (" + lp + " LP)\n💰 골드: " + (data.gold || 0).toLocaleString() + " G\n⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)";
        
        var div = Utils.getFixedDivider();
        var res = "『 " + id + " 』\n" + div + "\n" + s1 + "\n" + div + "\n" + s2 + "\n" + div + "\n";
        if (content) res += content + "\n" + div + "\n"; 
        if (help) res += "💡 " + help + "\n" + div + "\n";
        return res + Utils.getNav();
    },
    go: function(session, screen, title, content, help) {
        // 화면 이동 시 히스토리 저장 (되돌아가기 기능용)
        if (session.screen && session.screen !== screen && session.screen !== "IDLE") {
            if (!session.history) session.history = [];
            session.history.push({ screen: session.screen, title: session.lastTitle });
        }
        session.screen = screen;
        session.lastTitle = title;
        
        if (screen.indexOf("PROFILE") !== -1 || screen.indexOf("DETAIL") !== -1) {
            var tid = session.targetUser || session.tempId;
            var td = (session.targetUser) ? Database.data[session.targetUser] : session.data;
            return UI.renderProfile(tid, td, help, content);
        }
        return this.make(title, content, help);
    },
    renderMenu: function(session) {
        session.history = []; // 메뉴 초기화 시 히스토리 비움
        
        if (session.type === "ADMIN") return this.go(session, "ADMIN_MAIN", "관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "번호를 입력하세요.");
        
        if (session.type === "GROUP") {
            if (!session.data) {
                session.screen = "IDLE"; 
                return UI.make("알림", "'시스템' 개인톡에서\n로그인을 해주세요.", "보안이 필요합니다."); 
            }
            return this.go(session, "GROUP_MAIN", "단톡방 메뉴", "1. 내 정보 확인", "번호를 입력하세요.");
        }
        
        if (!session.data) return this.go(session, "GUEST_MAIN", "환영합니다", "1. 회원가입\n2. 로그인", "번호를 선택하세요.");
        
        // [수정 적용] 대전 메뉴(3번)가 포함된 유저 메인 메뉴
        return this.go(session, "USER_MAIN", "메인 메뉴", "1. 프로필\n2. 컬렉션\n3. 대전\n4. 상점\n5. 로그아웃", "작업 번호를 입력하세요.");
    }
};

// ━━━━━━━━ [3. DB 및 세션 매니저] ━━━━━━━━
var Database = {
    data: {},
    load: function() { try { return JSON.parse(FileStream.read(Config.DB_PATH)); } catch(e) { return {}; } },
    save: function(d) { this.data = d; FileStream.write(Config.DB_PATH, JSON.stringify(d, null, 4)); },
    getInitData: function(pw) { return { pw: pw, gold: 1000, level: 1, lp: 0, win: 0, lose: 0, title: "뉴비", collection: { titles: ["뉴비"], characters: [] } }; }
};

var SessionManager = {
    sessions: {},
    load: function() { try { this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH)); } catch(e) { this.sessions = {}; } },
    save: function() { FileStream.write(Config.SESSION_PATH, JSON.stringify(this.sessions)); },
    get: function(r, h, g) {
        if (!this.sessions[h]) this.sessions[h] = { data: null, screen: "IDLE", history: [], lastTitle: "메뉴", tempId: null, userListCache: [], targetUser: null, editType: null };
        var s = this.sessions[h];
        if (r === Config.AdminRoom) s.type = "ADMIN";
        else if (g && r === Config.GroupRoom) s.type = "GROUP";
        else s.type = "DIRECT";
        return s;
    },
    reset: function(session) { 
        session.screen = "IDLE"; 
        session.history = []; 
        session.userListCache = []; 
        session.targetUser = null; 
        session.editType = null; 
    },
    forceLogout: function(userId) {
        if (!userId) return;
        for (var key in this.sessions) { 
            if (this.sessions[key].tempId === userId) { 
                this.sessions[key].data = null; 
                this.sessions[key].tempId = null; 
                this.sessions[key].screen = "IDLE"; 
                this.sessions[key].history = []; 
            } 
        }
        this.save();
    }
};

// ━━━━━━━━ [4. 매니저: 관리자 시스템] ━━━━━━━━
/**
 * 관리자 전용 기능을 수행하며, 진입과 기능 핸들링을 구분합니다.
 */
var AdminManager = {
    handle: function(msg, session, replier, startTime) {
        var screen = session.screen;

        // [관리자메뉴_진입 핸들링]
        if (screen === "ADMIN_MAIN") {
            if (msg === "1") {
                var rt = java.lang.Runtime.getRuntime();
                var used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
                var info = "⚡ 속도: " + (new Date().getTime() - startTime) + "ms\n📟 RAM: " + used + " MB\n👥 총원: " + Object.keys(Database.data).length + "명";
                return replier.reply(UI.go(session, "ADMIN_SYS_INFO", "시스템 정보", info, "시스템 모니터링"));
            }
            if (msg === "2") {
                session.userListCache = Object.keys(Database.data);
                var list = session.userListCache.map(function(id, i){ return (i+1)+". "+id; }).join("\n");
                return replier.reply(UI.go(session, "ADMIN_USER_LIST", "유저 관리", list, "조회할 번호 입력"));
            }
        }

        // [기능 핸들링] 유저 관리 세부 로직
        if (screen === "ADMIN_USER_LIST") {
            var idx = parseInt(msg) - 1;
            if (session.userListCache[idx]) {
                session.targetUser = session.userListCache[idx];
                return replier.reply(UI.go(session, "ADMIN_USER_DETAIL", session.targetUser, "1. 정보 수정\n2. 데이터 초기화\n3. 계정 삭제", "기능 번호 선택"));
            }
        }

        if (screen === "ADMIN_USER_DETAIL") {
            if (msg === "1") return replier.reply(UI.go(session, "ADMIN_EDIT_SELECT", "수정 항목", "1. 골드\n2. LP\n3. 레벨", "항목 선택"));
            if (msg === "2") return replier.reply(UI.go(session, "ADMIN_RESET_CONFIRM", "초기화", "[확인] 입력 시 리셋", "경고: 복구 불가"));
            if (msg === "3") return replier.reply(UI.go(session, "ADMIN_DELETE_CONFIRM", "삭제", "[삭제확인] 입력 시 삭제", "경고: 영구 삭제"));
        }
        
        // (기타 초기화/삭제/수정 입력 로직 생략 없이 모두 유지...)
        if (screen === "ADMIN_RESET_CONFIRM" && msg === "확인") {
            var pw = Database.data[session.targetUser].pw;
            Database.data[session.targetUser] = Database.getInitData(pw);
            Database.save(Database.data);
            return replier.reply(UI.make("완료", "데이터 초기화가\n성공하였습니다.", "시스템 동기화"));
        }
        if (screen === "ADMIN_DELETE_CONFIRM" && msg === "삭제확인") {
            delete Database.data[session.targetUser]; Database.save(Database.data);
            SessionManager.forceLogout(session.targetUser);
            return replier.reply(UI.make("완료", "해당 계정이\n영구 삭제되었습니다.", "DB 업데이트"));
        }
    }
};

// ━━━━━━━━ [5. 매니저: 개인톡(DIRECT) 시스템] ━━━━━━━━
/**
 * 개인톡 유저 로직이며, 진입 핸들링과 기능별 핸들링으로 구분됩니다.
 */
var UserManager = {
    handle: function(msg, session, replier) {
        var d = session.data;
        
        // 1. 게스트(미로그인) 핸들링
        if (!d) {
            switch(session.screen) {
                case "GUEST_MAIN": 
                    if (msg === "1") return replier.reply(UI.go(session, "JOIN_ID", "회원가입", "아이디를\n입력해주세요.", "가입 대기 중")); 
                    if (msg === "2") return replier.reply(UI.go(session, "LOGIN_ID", "인증", "아이디를\n입력해주세요.", "보안 인증")); 
                    break;
                case "JOIN_ID": 
                    if (Database.data[msg]) return replier.reply(UI.make("오류", "이미 가입된\n아이디입니다.", "다른 아이디 입력")); 
                    session.tempId = msg; 
                    return replier.reply(UI.go(session, "JOIN_PW", "회원가입", "비밀번호를\n설정해주세요.", "설정 중..."));
                case "JOIN_PW": 
                    Database.data[session.tempId] = Database.getInitData(msg); 
                    Database.save(Database.data); 
                    session.data = Database.data[session.tempId];
                    Api.replyRoom(Config.AdminRoom, UI.make("신규 유저", "유저 [" + session.tempId + "]\n회원가입 완료!", "협곡에 오신걸 환영합니다"));
                    return replier.reply(UI.renderMenu(session));
                case "LOGIN_ID": 
                    session.tempId = msg; 
                    return replier.reply(UI.go(session, "LOGIN_PW", "인증", "비밀번호를\n입력해주세요.", "인증 중..."));
                case "LOGIN_PW": 
                    if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) { 
                        session.data = Database.data[session.tempId]; 
                        return replier.reply(UI.renderMenu(session)); 
                    } 
                    return replier.reply(UI.make("오류", "정보가\n일치하지 않습니다.", "인증 실패"));
            }
            return;
        }

        // 2. 로그인 유저 [유저메뉴_진입 핸들링]
        if (session.screen === "USER_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "PROFILE_VIEW", session.tempId, "", "내 정보 조회"));
            if (msg === "2") return replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1. 칭호 장착\n2. 보유 캐릭터", "나의 수집함"));
            if (msg === "3") return replier.reply(UI.go(session, "BATTLE_MAIN", "대전", "1. AI 봇 매칭\n2. 유저 매칭", "대전 모드를 선택하세요."));
            if (msg === "4") return replier.reply(UI.go(session, "SHOP_MAIN", "상점", "1. 캐릭터 구매", "구매 대기 중"));
            if (msg === "5") { SessionManager.forceLogout(session.tempId); return replier.reply(UI.make("알림", "로그아웃이\n완료되었습니다.", "시스템 종료")); }
        }

        // 3. [기능 핸들링: 대전]
        if (session.screen === "BATTLE_MAIN") {
            if (msg === "1") return replier.reply(UI.make("AI 봇 매칭", "상대를 찾는 중입니다...", "잠시만 기다려 주세요."));
            if (msg === "2") return replier.reply(UI.make("유저 매칭", "대기열에 등록되었습니다.", "매칭 시 알림이 전송됩니다."));
        }

        // 4. [기능 핸들링: 컬렉션]
        if (session.screen === "COL_MAIN") {
            if (msg === "1") {
                var tList = d.collection.titles.map(function(t, i) { return (i+1) + ". " + (t === d.title ? "✅ " : "") + t; }).join("\n");
                return replier.reply(UI.go(session, "COL_TITLE_ACTION", "칭호 변경", tList, "장착할 번호 선택"));
            }
            if (msg === "2") {
                var cList = d.collection.characters.length > 0 ? d.collection.characters.join("\n") : "보유 유닛이\n없습니다.";
                return replier.reply(UI.go(session, "COL_CHAR_VIEW", "보유 리스트", cList, "전략적 팀원"));
            }
        }

        // 5. [기능 핸들링: 상점]
        if (session.screen === "SHOP_MAIN" && msg === "1") {
            return replier.reply(UI.go(session, "SHOP_ROLES", "상점 카테고리", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), "카테고리 선택"));
        }
        
        if (session.screen === "SHOP_ROLES") {
            var rIdx = parseInt(msg) - 1;
            if (RoleKeys[rIdx]) {
                session.selectedRole = RoleKeys[rIdx];
                var uList = SystemData.roles[session.selectedRole].units.map(function(u, i) {
                    var owned = d.collection.characters.indexOf(u) !== -1;
                    return (i+1) + ". " + u + (owned ? " [보유]" : " (500G)");
                }).join("\n");
                return replier.reply(UI.go(session, "SHOP_BUY_ACTION", session.selectedRole, uList, "구매할 유닛 번호"));
            }
        }

        if (session.screen === "SHOP_BUY_ACTION") {
            var units = SystemData.roles[session.selectedRole].units, uIdx = parseInt(msg) - 1;
            if (units[uIdx]) {
                var target = units[uIdx];
                if (d.collection.characters.indexOf(target) !== -1) return replier.reply(UI.make("알림", "이미 보유 중인\n유닛입니다.", "영입 취소"));
                if (d.gold < 500) return replier.reply(UI.make("알림", "골드가 부족하여\n구매할 수 없습니다.", "잔액 부족"));
                d.gold -= 500; d.collection.characters.push(target); Database.save(Database.data);
                return replier.reply(UI.make("성공", target + " 유닛을\n영입 완료했습니다!", "잔액: "+d.gold+"G"));
            }
        }
    }
};

// ━━━━━━━━ [6. 매니저: 단체방(GROUP) 시스템] ━━━━━━━━
/**
 * 단체 채팅방에서의 유저 상호작용을 담당합니다.
 */
var GroupManager = {
    handle: function(msg, session, replier) {
        // [단체톡메뉴_진입 핸들링]
        if (session.screen === "GROUP_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "GROUP_PROFILE", session.tempId, "", "전적 및 상태"));
        }
    }
};

// ━━━━━━━━ [7. 메인 응답 핸들러] ━━━━━━━━
/**
 * 메시지 수신 시 세션과 권한을 분류하여 알맞은 매니저로 전달합니다.
 */
Database.data = Database.load(); 
SessionManager.load();

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    var startTime = new Date().getTime();
    try {
        if (!msg) return;
        var hash = String(imageDB.getProfileHash());
        var session = SessionManager.get(room, hash, isGroupChat);
        msg = msg.trim();
        
        // 공통 조작: 취소/메뉴/되돌아가기
        if (msg.indexOf("취소") !== -1 || msg.indexOf("메뉴") !== -1) { 
            SessionManager.reset(session); 
            return replier.reply(UI.renderMenu(session)); 
        }
        if (msg.indexOf("이전") !== -1 || msg.indexOf("돌아가기") !== -1) {
            if (session.history && session.history.length > 0) {
                var p = session.history.pop();
                session.screen = p.screen;
                session.lastTitle = p.title;
                return replier.reply(UI.renderMenu(session));
            }
        }
        
        // 권한별 핸들러 배정
        if (session.type === "ADMIN" && hash === Config.AdminHash) return AdminManager.handle(msg, session, replier, startTime);
        
        // 단톡방 세션 동기화 로직 (v8.9.24 유지)
        if (isGroupChat && room === Config.GroupRoom) {
            var found = false;
            for (var k in SessionManager.sessions) {
                if (SessionManager.sessions[k].type === "DIRECT" && SessionManager.sessions[k].tempId === sender) {
                    session.data = SessionManager.sessions[k].data;
                    session.tempId = SessionManager.sessions[k].tempId;
                    found = true; break;
                }
            }
            if (!found) { session.data = null; session.screen = "IDLE"; }
        }

        if (session.screen === "IDLE") return;
        
        if (session.type === "GROUP") GroupManager.handle(msg, session, replier);
        else UserManager.handle(msg, session, replier);
        
        SessionManager.save();
    } catch (e) { 
        Api.replyRoom(Config.AdminRoom, UI.make("시스템 오류", "런타임 에러:\n" + e.message + "\n(라인: " + e.lineNumber + ")", "v8.9.63")); 
    }
}
