// ━━━━━━━━ [1. 설정 및 시스템 데이터] ━━━━━━━━
var Config = {
    Prefix: ".", 
    AdminHash: "2056407147", 
    AdminRoom: "소환사의협곡관리", 
    GroupRoom: "소환사의협곡",
    BotName: "소환사의 협곡", 
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "/sdcard/msgbot/Bots/main/sessions.json",
    LINE_CHAR: "━", 
    WRAP_LIMIT: 18, 
    DIVIDER_LINE: 14,
    NAV_LEFT: "  ", 
    NAV_RIGHT: " ", 
    NAV_ITEMS: ["⬅️이전", "❌취소", "🏠메뉴"]
};

var MAX_LEVEL = 30; 

var UnitSpecs = {
    "알리스타": { hp: 650, mp: 350, atk: 55, def: 47, range: 125, spd: 330, as: 0.62 },
    "가렌": { hp: 620, mp: 0, atk: 60, def: 38, range: 175, spd: 340, as: 0.63 },
    "제드": { hp: 580, mp: 200, atk: 63, def: 32, range: 125, spd: 345, as: 0.65 },
    "애쉬": { hp: 540, mp: 280, atk: 59, def: 26, range: 600, spd: 325, as: 0.65 },
    "럭스": { hp: 490, mp: 480, atk: 52, def: 22, range: 550, spd: 330, as: 0.61 }
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

// ━━━━━━━━ [2. 유틸리티 및 UI 엔진] ━━━━━━━━
var Utils = {
    getFixedDivider: function() { return Array(Config.DIVIDER_LINE + 1).join(Config.LINE_CHAR); },
    getNav: function() { return Config.NAV_LEFT + Config.NAV_ITEMS.join("    ") + Config.NAV_RIGHT; },
    wrapText: function(str) {
        if (!str) return "";
        var lines = str.split('\n'), result = [], limit = Config.WRAP_LIMIT;
        for (var i = 0; i < lines.length; i++) {
            var words = lines[i].split(' '), currentLine = "";
            for (var j = 0; j < words.length; j++) {
                var word = words[j];
                if (word.length > limit) {
                    if (currentLine.length > 0) { result.push(currentLine.trim()); currentLine = ""; }
                    var start = 0;
                    while (start < word.length) { result.push(word.substring(start, start + limit)); start += limit; }
                    continue;
                }
                if ((currentLine + word).length > limit) { result.push(currentLine.trim()); currentLine = word + " "; }
                else { currentLine += word + " "; }
            }
            if (currentLine.trim().length > 0) result.push(currentLine.trim());
        }
        return result.join('\n');
    }
};

function getTierInfo(lp) {
    lp = lp || 0;
    for (var i = 0; i < TierData.length; i++) {
        if (lp >= TierData[i].minLp) return { name: TierData[i].name, icon: TierData[i].icon };
    }
    return { name: "아이언", icon: "⚫" };
}

var UI = {
    make: function(title, content, help, isRoot) {
        var div = Utils.getFixedDivider();
        var res = "『 " + title + " 』\n" + div + "\n" + Utils.wrapText(content) + "\n" + div + "\n";
        if (help) res += "💡 " + Utils.wrapText(help);
        if (!isRoot) res += "\n" + div + "\n" + Utils.getNav();
        return res;
    },

    renderProfile: function(id, data, help, content, isRoot, session) {
        if (!data) return "데이터 로드 오류";
        var lp = data.lp || 0, tier = getTierInfo(lp);
        var win = data.win || 0, lose = data.lose || 0, total = win + lose;
        var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
        var st = data.stats || { acc: 50, ref: 50, com: 50, int: 50 };
        var lv = data.level || 1, exp = data.exp || 0, maxExp = lv * 100;
        var div = Utils.getFixedDivider();
        var lvLabel = (lv >= MAX_LEVEL) ? "Lv." + MAX_LEVEL + " [Max]" : "Lv." + lv;
        var expBar = (lv >= MAX_LEVEL) ? "Max / Max" : exp + " / " + maxExp;

        var s1 = "👤 계정: " + id + "\n🏅 칭호: [" + (data.title || "뉴비") + "]";
        var s2 = "🏆 티어: " + tier.icon + " " + tier.name + " (" + lp + " LP)\n🆙 레벨: " + lvLabel + "\n📊 경험: " + expBar + " EXP\n💰 골드: " + (data.gold || 0).toLocaleString() + " G";
        var s3 = "⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)\n" + div + "\n🎯 정확: " + st.acc + " | ⚡ 반응: " + st.ref + "\n🧘 침착: " + st.com + " | 🧠 직관: " + st.int + "\n✨ 포인트: " + (data.point || 0) + " P";
        var res = "『 " + id + " 』\n" + div + "\n" + s1 + "\n" + div + "\n" + s2 + "\n" + div + "\n" + s3 + "\n" + div + "\n";
        
        if (session && (session.screen === "ADMIN_USER_DETAIL" || session.screen === "PROFILE_VIEW")) {
            if (session.type === "ADMIN") res += "1. 정보 수정\n2. 답변 하기\n3. 데이터 초기화\n4. 계정 삭제\n" + div + "\n";
            else res += "1. 능력치 강화\n2. 능력치 초기화\n" + div + "\n";
        } else if (session && (session.screen === "STAT_UP_MENU" || session.screen === "STAT_UP_INPUT")) {
            res += "1. 정확 강화\n2. 반응 강화\n3. 침착 강화\n4. 직관 강화\n" + div + "\n";
        }
        
        if (content) res += Utils.wrapText(content.trim()) + "\n" + div + "\n"; 
        if (help) res += "💡 " + Utils.wrapText(help);
        if (!isRoot) res += "\n" + div + "\n" + Utils.getNav();
        return res;
    },

    go: function(session, screen, title, content, help, skipHistory) {
        var rootScreens = ["USER_MAIN", "ADMIN_MAIN", "GUEST_MAIN", "GROUP_MAIN"];
        var isRoot = (rootScreens.indexOf(screen) !== -1);
        
        if (session.tempId && Database.data[session.tempId]) session.data = Database.data[session.tempId];
        
        if (!skipHistory && session.screen && session.screen !== "IDLE" && session.screen !== screen) {
            if (!session.history) session.history = [];
            session.history.push({ screen: session.screen, title: session.lastTitle, content: session.lastContent, help: session.lastHelp });
        }
        
        session.screen = screen; 
        session.lastTitle = title;
        session.lastContent = content || ""; 
        session.lastHelp = help || "";
        
        // 프로필 관련 화면이거나 유저 관리 화면일 때 전용 렌더러 호출
        if (screen.indexOf("PROFILE") !== -1 || screen.indexOf("STAT") !== -1 || screen === "ADMIN_USER_DETAIL") {
            var tid = session.targetUser || session.tempId;
            return UI.renderProfile(tid, Database.data[tid], help, content, isRoot, session);
        }
        
        return this.make(title, content, help, isRoot);
    },

    renderMenu: function(session) {
        session.history = []; 
        
        // [수정] 관리자 메뉴에 3. 데이터 복구 추가
        if (session.type === "ADMIN") {
            var adminMenu = "1. 시스템 정보\n2. 유저 관리\n3. 데이터 복구";
            return this.go(session, "ADMIN_MAIN", "관리자 메뉴", adminMenu, "번호를 입력하세요.");
        }
        
        if (session.type === "GROUP") return this.go(session, "GROUP_MAIN", "단톡방 메뉴", "1. 내 정보 확인\n2. 티어 랭킹", "번호 입력");
        
        if (!session.data) return this.go(session, "GUEST_MAIN", "환영합니다", "1. 회원가입\n2. 로그인\n3. 문의하기", "번호 선택");
        
        return this.go(session, "USER_MAIN", "메인 메뉴", "1. 프로필\n2. 컬렉션\n3. 대전\n4. 상점\n5. 문의하기\n6. 로그아웃", "번호 입력");
    }
};

// ━━━━━━━━ [3. DB 및 세션 관리 - 백업/복구 통합본] ━━━━━━━━
var Database = {
    data: {},
    // 파일 경로 설정 (기존 Config 활용)
    BACKUP_PATH: Config.DB_PATH + ".bak",

    load: function() { 
        try { 
            var content = FileStream.read(Config.DB_PATH);
            if (!content) throw new Error("파일 비어있음");
            return JSON.parse(content); 
        } catch(e) { 
            // 메인 파일 로드 실패 시 백업본 로드 시도
            return this.restore(); 
        } 
    },

    save: function(d) { 
        this.data = d; 
        var jsonStr = JSON.stringify(d, null, 4);
        
        // [자동 백업] 현재 정상 데이터를 저장하기 전, 기존 파일을 백업본으로 복사
        try {
            var currentFile = FileStream.read(Config.DB_PATH);
            if (currentFile && currentFile.length > 10) { // 최소한의 데이터가 있을 때만 백업
                FileStream.write(this.BACKUP_PATH, currentFile);
            }
        } catch(e) {}

        FileStream.write(Config.DB_PATH, jsonStr); 
    },

    // [복구 기능] 백업 파일로부터 데이터를 강제로 덮어씌움
    restore: function() {
        try {
            var backupContent = FileStream.read(this.BACKUP_PATH);
            if (backupContent) {
                this.data = JSON.parse(backupContent);
                // 백업본을 다시 메인 DB 파일로 물리적 복구
                FileStream.write(Config.DB_PATH, backupContent);
                return this.data;
            }
        } catch(e) {}
        return {}; // 백업조차 없으면 빈 객체 반환
    },

    getInitData: function(pw) { 
        return { pw: pw, gold: 1000, level: 1, exp: 0, lp: 0, win: 0, lose: 0, title: "뉴비", point: 0, stats: { acc: 50, ref: 50, com: 50, int: 50 }, inventory: { "RESET_TICKET": 0 }, collection: { titles: ["뉴비"], characters: ["가렌"] } }; 
    },

    addExp: function(userId, amount) {
        var d = this.data[userId];
        if (!d || d.level >= MAX_LEVEL) return;
        d.exp += amount;
        while (d.exp >= d.level * 100 && d.level < MAX_LEVEL) {
            d.exp -= (d.level * 100);
            d.level++; d.point += 5;
            if (d.level >= MAX_LEVEL) { d.exp = 0; break; }
        }
        this.save(this.data);
    }
};

var SessionManager = {
    sessions: {},
    load: function() { try { this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH)); } catch(e) { this.sessions = {}; } },
    save: function() { FileStream.write(Config.SESSION_PATH, JSON.stringify(this.sessions)); },
    get: function(r, h, g) {
        if (!this.sessions[h]) this.sessions[h] = { data: null, screen: "IDLE", history: [], lastTitle: "메뉴", lastContent: "", lastHelp: "", tempId: "비회원", userListCache: [], targetUser: null, editType: null, room: r, isDirect: !g, battle: null };
        var s = this.sessions[h]; s.room = r;
        if (r === Config.AdminRoom) s.type = "ADMIN";
        else if (g && r === Config.GroupRoom) s.type = "GROUP";
        else { s.type = "DIRECT"; s.isDirect = true; }
        return s;
    },
    reset: function(session) { 
        session.screen = "IDLE"; session.history = []; session.userListCache = []; 
        session.targetUser = null; session.editType = null; session.battle = null;
    },
    forceLogout: function(userId) {
        for (var key in this.sessions) { if (this.sessions[key].tempId === userId) { this.sessions[key].data = null; this.sessions[key].tempId = "비회원"; this.reset(this.sessions[key]); } }
        this.save();
    }
};

// ━━━━━━━━ [4. 배틀 매니저 - 역할군 제거 완결본] ━━━━━━━━
var MatchingManager = {
    renderDraftUI: function(session, content, help) {
        var div = Utils.getFixedDivider();
        var selectedName = (session.battle && session.battle.playerUnit) ? session.battle.playerUnit : "선택 안함";
        var header = "전투를 준비하세요.\n상대방이 당신의 선택을 기다리고 있습니다.\n선택 캐릭터: [" + selectedName + "]\n" + div + "\n";
        session.lastTitle = "전투 준비";
        session.lastContent = content; 
        session.lastHelp = help;
        return UI.make("전투 준비", header + content, help, false);
    },

    initDraft: function(session, replier) {
        var d = Database.data[session.tempId];
        var myUnits = d.collection.characters || [];
        
        // 배틀 데이터 초기화 (역할군 관련 변수 삭제)
        session.battle = { playerUnit: null, aiUnit: null };
        session.history = []; 
        
        if (myUnits.length === 0) {
            return replier.reply(UI.make("알림", "⚠️ 보유한 캐릭터가 없습니다.\n상점에서 먼저 구매해주세요."));
        }

        // 역할군 선택 단계를 건너뛰고 바로 캐릭터 선택 화면으로 설정
        session.screen = "BATTLE_DRAFT_UNIT";
        var content = "📢 출전할 캐릭터를 선택하세요.\n" + myUnits.map(function(u, i){ 
            var s = UnitSpecs[u] || {hp:'-', atk:'-'};
            return (i+1)+". "+u+" (HP:"+s.hp+"/ATK:"+s.atk+")"; 
        }).join("\n");

        return replier.reply(this.renderDraftUI(session, content, "번호 입력 또는 '준비완료'"));
    },

    handleDraft: function(msg, session, replier) {
        // 취소/이전 시 메인 메뉴로 리셋
        if (msg === "취소" || msg === "이전") {
            SessionManager.reset(session);
            return replier.reply(UI.renderMenu(session));
        }

        var d = Database.data[session.tempId];
        var myUnits = d.collection.characters || [];

        // 게임 시작 로직
        if (msg === "준비완료") {
            if (!session.battle.playerUnit) return replier.reply(UI.make("알림", "⚠️ 캐릭터를 선택하지 않았습니다."));
            return LoadingManager.start(session, replier);
        }
        
        // 캐릭터 선택 처리
        if (session.screen === "BATTLE_DRAFT_UNIT") {
            var idx = parseInt(msg) - 1;
            if (myUnits[idx]) {
                session.battle.playerUnit = myUnits[idx];
                var content = "✅ [" + myUnits[idx] + "] 선택 완료!\n\n다른 번호를 입력하면 변경됩니다.\n준비가 끝났다면 '준비완료'를 입력하세요.";
                return replier.reply(this.renderDraftUI(session, content, "'준비완료' 입력 시 시작"));
            } else {
                return replier.reply(UI.make("알림", "올바른 번호를 입력해주세요."));
            }
        }
    }
};

// ━━━━━━━━ [5. 로딩 매니저] ━━━━━━━━
var LoadingManager = {
    start: function(session, replier) {
        session.screen = "BATTLE_LOADING";
        var aiUnits = ["가렌", "애쉬", "럭스", "다리우스", "제드"];
        session.battle.aiUnit = aiUnits[Math.floor(Math.random() * aiUnits.length)];
        
        var res = "⚔️ 전투가 시작됩니다!\n\n" +
                  "[플레이어] " + session.battle.playerUnit + "\n" +
                  "      VS      \n" +
                  "[인공지능] " + session.battle.aiUnit + "\n\n" +
                  "전장 데이터 동기화 중...";
                  
        replier.reply(UI.make("진입 중", res, "잠시만 기다려주세요", true));
        java.lang.Thread.sleep(2000);
        return replier.reply(UI.make("전장 도착", "🚩 전투가 시작되었습니다!\n(BattleManager를 통해 결과가 산출됩니다)", "메뉴를 입력하여 종료", true));
    }
};

/**
 * [8. 관리자 매니저]
 * 시스템 관리, 유저 데이터 제어 및 데이터 복구를 담당합니다.
 */
var AdminManager = {
    /**
     * 관리자 메뉴 핸들링 메인
     */
    handle: function(msg, session, replier) {
        // [ADMIN_MAIN] 관리자 최상위 메뉴
        if (session.screen === "ADMIN_MAIN") {
            if (msg === "1" || msg === "시스템 정보") {
                return replier.reply(UI.go(session, "ADMIN_INFO", "시스템 정보", this.getSystemInfo(), "이전 화면으로 돌아가려면 '이전' 입력"));
            }
            if (msg === "2" || msg === "유저 관리") {
                return replier.reply(UI.go(session, "ADMIN_USER_LIST", "유저 관리", this.getUserList(), "상세보기: 해당 유저의 ID 입력"));
            }
            if (msg === "3" || msg === "데이터 복구") {
                // 데이터 복구 진입 확인창
                var content = "⚠️ [주의] 현재 데이터를 최신 백업본(.bak)으로 덮어씌웁니다.\n복구된 데이터는 되돌릴 수 없습니다.\n\n1. 즉시 복구 실행\n2. 취소 (메뉴로)";
                return replier.reply(UI.go(session, "ADMIN_RESTORE", "데이터 복구", content, "진행하려면 '1'을 입력하세요."));
            }
        }

        // [ADMIN_RESTORE] 데이터 복구 실행 로직
        if (session.screen === "ADMIN_RESTORE") {
            if (msg === "1" || msg === "복구" || msg === "즉시 복구 실행") {
                var success = Database.restore(); // Database 객체에 정의된 restore 함수 호출
                if (success) {
                    SessionManager.reset(session); // 데이터가 바뀌었으므로 세션 초기화
                    return replier.reply(UI.make("알림", "✅ 데이터 복구가 성공적으로 완료되었습니다.", "안전한 적용을 위해 메인 메뉴로 이동합니다.", true));
                } else {
                    return replier.reply(UI.make("알림", "❌ 복구 실패: 백업 파일(.bak)이 존재하지 않거나 읽을 수 없습니다.", "이전 화면으로 가려면 '이전' 입력", true));
                }
            }
            if (msg === "2" || msg === "취소") {
                return replier.reply(UI.renderMenu(session));
            }
        }

        // [ADMIN_USER_LIST] 유저 상세 보기 진입 처리
        if (session.screen === "ADMIN_USER_LIST") {
            if (Database.data[msg]) {
                var userData = Database.data[msg];
                var detail = "🆔 ID: " + msg + "\n" +
                             "🏅 칭호: " + (userData.title || "없음") + "\n" +
                             "💰 보유 골드: " + (userData.gold || 0).toLocaleString() + "G\n" +
                             "🏆 전적: " + (userData.win || 0) + "승 " + (userData.lose || 0) + "패";
                return replier.reply(UI.go(session, "ADMIN_USER_DETAIL", "유저 상세정보", detail, "이전: '이전' 입력"));
            }
        }

        // 기타 하위 메뉴 처리 (확장성)
        this.handleSub(msg, session, replier);
    },

    /**
     * 시스템 상태 정보 생성
     */
    getSystemInfo: function() {
        var runtime = java.lang.Runtime.getRuntime();
        var totalMem = runtime.totalMemory() / 1024 / 1024;
        var freeMem = runtime.freeMemory() / 1024 / 1024;
        var usedMem = totalMem - freeMem;
        
        var res = "⚙️ 엔진 상태: 정상 (Stable)\n";
        res += "💾 메모리 사용: " + usedMem.toFixed(2) + " / " + totalMem.toFixed(2) + " MB\n";
        res += "👥 등록된 유저수: " + Object.keys(Database.data).length + "명\n";
        res += "📅 서버 시간: " + new Date().toLocaleString();
        return res;
    },

    /**
     * 전체 유저 리스트 생성
     */
    getUserList: function() {
        var userIds = Object.keys(Database.data);
        if (userIds.length === 0) return "현재 가입된 유저가 없습니다.";
        
        return userIds.map(function(id, idx) {
            var user = Database.data[id];
            return (idx + 1) + ". " + id + " (Lv." + (user.level || 1) + ")";
        }).join("\n");
    },

    /**
     * 추가 관리 기능 (확장용)
     */
    handleSub: function(msg, session, replier) {
        // 유저 삭제, 골드 지급 등 세부 기능이 필요할 때 여기에 추가합니다.
    }
};

// ━━━━━━━━ [7. 유저 매니저 - 상점 로직 완결본] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier) {
        if (session.tempId && Database.data[session.tempId]) session.data = Database.data[session.tempId];
        var d = session.data;

        // 회원가입 및 로그인 로직 (변화 없음)
        if (!d) {
            if (session.screen === "GUEST_MAIN") {
                if (msg === "1") return replier.reply(UI.go(session, "JOIN_ID", "회원가입", "아이디(10자)", "가입"));
                if (msg === "2") return replier.reply(UI.go(session, "LOGIN_ID", "인증", "아이디", "로그인"));
                if (msg === "3") return replier.reply(UI.go(session, "GUEST_INQUIRY", "문의", "문의 내용을 입력해주세요.", "전송"));
            }
            if (session.screen === "JOIN_ID") {
                if (msg.length > 10 || Database.data[msg]) return replier.reply(UI.make("오류", "중복/길이"));
                session.tempId = msg; return replier.reply(UI.go(session, "JOIN_PW", "회원가입", "비번 설정", "보안"));
            }
            if (session.screen === "JOIN_PW") {
                Database.data[session.tempId] = Database.getInitData(msg); Database.save(Database.data);
                session.data = Database.data[session.tempId]; SessionManager.reset(session);
                return replier.reply(UI.make("성공", "가입 성공!", "메뉴를 입력하세요.", true));
            }
            if (session.screen === "LOGIN_ID") { session.tempId = msg; return replier.reply(UI.go(session, "LOGIN_PW", "인증", "비번 입력", "인증")); }
            if (session.screen === "LOGIN_PW") {
                if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) {
                    session.data = Database.data[session.tempId]; SessionManager.reset(session);
                    return replier.reply(UI.make("성공", "로그인됨", "메뉴를 입력하세요.", true));
                }
                return replier.reply(UI.make("실패", "비번 오류"));
            }
            if (session.screen === "GUEST_INQUIRY") {
                if (Config.AdminRoom) Api.replyRoom(Config.AdminRoom, UI.make("📩 게스트 문의", "내용: " + msg, "회신 불가", true));
                SessionManager.reset(session); return replier.reply(UI.make("문의 완료", "전달되었습니다.", "감사합니다.", true));
            }
            return;
        }

        // 메인 메뉴 처리
        if (session.screen === "USER_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "PROFILE_VIEW", session.tempId, "", "조회"));
            if (msg === "2") return replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1. 보유 칭호\n2. 보유 챔피언", "조회"));
            if (msg === "3") return replier.reply(UI.go(session, "BATTLE_MAIN", "대전", "1. AI 대결", "전투"));
            if (msg === "4") return replier.reply(UI.go(session, "SHOP_MAIN", "상점", "1. 챔피언 상점\n2. 소모품 상점", "쇼핑"));
            if (msg === "5") return replier.reply(UI.go(session, "USER_INQUIRY", "문의하기", "문의 내용을 입력해주세요.", "전송"));
            if (msg === "6") { SessionManager.forceLogout(session.tempId); return replier.reply(UI.make("알림", "로그아웃", "종료", true)); }
        }

        // 문의하기 처리
        if (session.screen === "USER_INQUIRY") {
            if (Config.AdminRoom) Api.replyRoom(Config.AdminRoom, UI.make("📩 유저 문의 (" + session.tempId + ")", "내용: " + msg, "유저 관리에서 답변 가능", true));
            SessionManager.reset(session); return replier.reply(UI.make("문의 완료", "전달되었습니다.", "메뉴 입력", true));
        }

        // 컬렉션 처리 (기존 로직 동일)
       if (session.screen === "COL_MAIN") {
    if (msg === "1") {
        var titles = d.collection.titles || ["뉴비"];
        var curTitle = d.title || "뉴비";
        var txt = "📝 보유 칭호 목록\n(현재: " + curTitle + ")\n" + Utils.getFixedDivider() + "\n";
        txt += titles.map(function(t, i){ return (i+1)+". "+t; }).join("\n");
        return replier.reply(UI.go(session, "COL_TITLE_LIST", "칭호 변경", txt, "변경할 번호 입력"));
    }
    if (msg === "2") {
        var chars = d.collection.characters || [];
        var allUnitCount = Object.keys(UnitSpecs).length; // 전체 캐릭터 수 계산
        
        // 보유 현황 표기 수정: (보유캐릭터수/전체캐릭터수)
        var txt = "🛡️ 보유 챔피언: (" + chars.length + "/" + allUnitCount + ")\n" + Utils.getFixedDivider() + "\n";
        
        if (chars.length === 0) {
            txt += "보유 캐릭터가 없습니다.";
        } else {
            // 목록에서 스펙 제거, 이름만 표기
            txt += chars.map(function(c, i){ 
                return (i+1)+". "+c; 
            }).join("\n");
        }
        return replier.reply(UI.go(session, "COL_CHAR_LIST", "챔피언 목록", txt, "보유 현황"));
    }
}

        if (session.screen === "COL_TITLE_LIST") {
            var titles = d.collection.titles || ["뉴비"];
            var idx = parseInt(msg)-1;
            if (titles[idx]) {
                d.title = titles[idx]; Database.save(Database.data); SessionManager.reset(session);
                return replier.reply(UI.make("성공", "칭호 변경 완료!", "메뉴 입력", true));
            }
        }

        // 스탯 강화 처리 (기존 로직 동일)
        if (session.screen === "PROFILE_VIEW") {
            if (msg === "1") return replier.reply(UI.go(session, "STAT_UP_MENU", "능력치 강화", "항목 번호 입력", "포인트: "+(d.point||0)));
        }
        if (session.screen === "STAT_UP_MENU") {
            var keys = ["acc", "ref", "com", "int"], names = ["정확", "반응", "침착", "직관"];
            var idx = parseInt(msg)-1;
            if (keys[idx]) {
                session.selectedStat = keys[idx]; session.selectedStatName = names[idx];
                return replier.reply(UI.go(session, "STAT_UP_INPUT", names[idx] + " 강화", "강화할 수치 입력\n(남은 포인트: " + (d.point||0) + "P)", "숫자 입력"));
            }
        }
        if (session.screen === "STAT_UP_INPUT") {
            var amt = parseInt(msg);
            if (isNaN(amt) || amt <= 0) return replier.reply(UI.make("오류", "1 이상의 숫자"));
            if (amt > (d.point || 0)) return replier.reply(UI.make("실패", "포인트 부족"));
            d.stats[session.selectedStat] += amt; d.point -= amt; Database.save(Database.data);
            replier.reply(UI.make("✨ 강화 성공", session.selectedStatName + " +" + amt, "성공", true));
            return replier.reply(UI.go(session, "PROFILE_VIEW", session.tempId, "", "조회", true));
        }

        // [상점 개선] 역할군 선택 없이 전체 캐릭터 리스트 출력
        if (session.screen === "SHOP_MAIN") {
            if (msg === "1") {
                var allUnits = Object.keys(UnitSpecs);
                var list = "🛒 챔피언 판매 목록\n" + Utils.getFixedDivider() + "\n";
                list += allUnits.map(function(u, i) {
                    var owned = d.collection.characters.indexOf(u) !== -1;
                    return (i+1)+". "+u+(owned ? " [보유]" : " (500G)");
                }).join("\n");
                
                session.shopListCache = allUnits; // 선택을 위해 목록 저장
                return replier.reply(UI.go(session, "SHOP_BUY_ACTION", "챔피언 상점", list, "구매할 번호 입력"));
            }
            if (msg === "2") return replier.reply(UI.make("알림", "소모품 상점은 아직 준비 중입니다."));
        }

        if (session.screen === "SHOP_BUY_ACTION") {
            var units = session.shopListCache;
            var idx = parseInt(msg)-1;
            if (units && units[idx]) {
                var target = units[idx];
                if (d.collection.characters.indexOf(target) !== -1) return replier.reply(UI.make("알림", "이미 보유 중인 캐릭터입니다."));
                if (d.gold < 500) return replier.reply(UI.make("실패", "골드가 부족합니다!"));
                
                d.gold -= 500;
                d.collection.characters.push(target);
                Database.save(Database.data);
                SessionManager.reset(session);
                return replier.reply(UI.make("구매 성공", target + " 영입 완료!", "메뉴를 입력하세요.", true));
            }
        }

        // 대전 진입 처리
        if (session.screen === "BATTLE_MAIN" && msg === "1") { MatchingManager.initDraft(session, replier); return; }
        if (session.screen.indexOf("BATTLE_DRAFT") !== -1) return MatchingManager.handleDraft(msg, session, replier);
    }
};

// ━━━━━━━━ [8. 단체방 매니저] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier) {
        if (session.screen === "GROUP_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "GROUP_PROFILE", session.tempId, "", "내 정보"));
            if (msg === "2") {
                var users = Object.keys(Database.data);
                var rank = users.map(function(id){ return {id:id, lp:Database.data[id].lp||0}; }).sort(function(a,b){return b.lp-a.lp;});
                var txt = "", cnt = Math.min(rank.length, 10);
                for (var i=0; i<cnt; i++) {
                    var u = rank[i], t = getTierInfo(u.lp), m = (i===0)?"🥇":(i===1)?"🥈":(i===2)?"🥉":(i+1)+".";
                    txt += m+" "+u.id+" ("+t.icon+u.lp+" LP)\n";
                }
                return replier.reply(UI.go(session, "GROUP_RANKING", "티어 랭킹", txt, "실시간"));
            }
        }
    }
};

// ━━━━━━━━ [9. 메인 핸들러] ━━━━━━━━

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    try {
        var hash = String(imageDB.getProfileHash());
        
        // 1. 세션 매니저 및 데이터베이스 동기화 로드
        var session = SessionManager.get(room, hash, isGroupChat);
        Database.data = Database.load();

        if (!msg) return;
        msg = msg.trim();

        // 2. [중단 확인창 모드] - '예/아니오' 응답 대기 중일 때 최우선 처리
        if (session.screen === "CANCEL_CONFIRM") {
            return handleCancelConfirm(msg, session, replier);
        }

        // 3. '메뉴' 입력 처리 (IDLE이 아니면 확인창으로 유도)
        if (msg === "메뉴") {
            if (session.screen === "IDLE" || !session.screen) {
                return replier.reply(UI.renderMenu(session));
            }
            return showCancelConfirm(session, replier);
        }

        // 4. '취소' 및 '이전' 입력 처리
        if (msg === "취소") return showCancelConfirm(session, replier);
        
        if (msg === "이전") {
            if (session.history && session.history.length > 0) {
                var prev = session.history.pop();
                return replier.reply(UI.go(session, prev.screen, prev.title, prev.content, prev.help, true));
            }
            SessionManager.reset(session);
            return replier.reply(UI.renderMenu(session));
        }

        // 5. 드래프트(픽창) 등 특수 화면 가로채기
        if (session.screen && session.screen.indexOf("BATTLE_DRAFT") !== -1) {
            return MatchingManager.handleDraft(msg, session, replier);
        }

        // 6. 일반 메뉴 로직 분기 (Admin / Group / User)
        if (session.screen !== "IDLE" && session.screen !== "BATTLE_LOADING") {
            if (session.type === "ADMIN") {
                AdminManager.handle(msg, session, replier);
            } else if (session.type === "GROUP") {
                GroupManager.handle(msg, session, replier);
            } else {
                UserManager.handle(msg, session, replier);
            }
            
            // 데이터 변경사항 및 세션 상태 즉시 저장
            Database.save(Database.data);
            SessionManager.save();
        }

    } catch (e) {
        // 모든 런타임 오류 포착 및 가시화
        reportError(e, msg, session, sender, replier);
    }
}

/**
 * 중단 확인창 표시 (현재 화면 정보 백업 포함)
 */
function showCancelConfirm(session, replier) {
    // 복구를 위해 현재 정보를 세션에 임시 보관
    session.preCancelScreen = session.screen;
    session.preCancelTitle = session.lastTitle;
    session.preCancelContent = session.lastContent;
    session.preCancelHelp = session.lastHelp;
    
    var title = "중단 확인";
    var content = "진행 중인 작업을 중단하고 메뉴로 돌아갈까요?\n\n1. 예 (메뉴로)\n2. 아니오 (돌아가기)";
    return replier.reply(UI.go(session, "CANCEL_CONFIRM", title, content, "'예' 또는 '아니오'를 입력하세요.", true));
}

/**
 * 중단 확인창 응답 처리 (예/아니오 복구 로직)
 */
function handleCancelConfirm(msg, session, replier) {
    if (msg === "예" || msg === "1" || msg === "확인") {
        // 세션 초기화 후 메인 메뉴로 이동
        SessionManager.reset(session);
        return replier.reply(UI.renderMenu(session));
    } else if (msg === "아니오" || msg === "2") {
        // 백업된 정보를 세션에 다시 밀어넣어 복구
        session.screen = session.preCancelScreen;
        return replier.reply(UI.make(session.preCancelTitle, session.preCancelContent, session.preCancelHelp, false));
    } else {
        // 예/아니오 외의 다른 말은 무시하고 다시 가이드
        return replier.reply("⚠️ '예' 또는 '아니오'로만 대답해주세요.");
    }
}

/**
 * 에러 보고 함수
 */
function reportError(e, msg, session, sender, replier) {
    var errPos = (session && session.screen) ? session.screen : "IDLE";
    var log = "📍 위치: " + errPos + "\n🛠 내용: " + e.message + "\n📄 라인: " + e.lineNumber;
    
    // 유저 채팅방 알림
    replier.reply(UI.make("🚨 시스템 오류", "예상치 못한 문제가 발생했습니다.", log, true));
    
    // 관리자 방 보고 (Config 설정이 있을 경우)
    if (typeof Config !== "undefined" && Config.AdminRoom) {
        Api.replyRoom(Config.AdminRoom, "🚨 [에러 로그]\n" + log + "\n💬 입력: " + msg);
    }
}
