/**
 * [main.js] v16.2.0
 * - COMPLETE: v16.1.0의 모든 유저/관리자/매칭 로직 포함
 * - NEW: BattleManager(실제 전투 로직) 엔진 통합
 * - UPDATE: 전투 승패에 따른 DB 보상(LP, Gold, EXP) 연동 및 레벨업 시스템
 */

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

// ━━━━━━━━ [2. 유틸리티 및 UI 엔진] ━━━━━━━━
var Utils = {
    getFixedDivider: function() { return Array(Config.DIVIDER_LINE + 1).join(Config.LINE_CHAR); },
    getNav: function() { return Config.NAV_LEFT + Config.NAV_ITEMS.join("    ") + Config.NAV_RIGHT; },
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
        if (!skipHistory && session.screen && session.screen !== "IDLE" && session.screen !== screen) {
            if (!session.history) session.history = [];
            session.history.push({ screen: session.screen, title: session.lastTitle, content: session.lastContent, help: session.lastHelp });
        }
        session.screen = screen; session.lastTitle = title;
        session.lastContent = content || ""; session.lastHelp = help || "";
        if (screen.indexOf("PROFILE") !== -1 || screen.indexOf("STAT") !== -1 || screen === "ADMIN_USER_DETAIL") {
            var tid = session.targetUser || session.tempId;
            return this.renderProfile(tid, Database.data[tid], help, content, isRoot, session);
        }
        return this.make(title, content, help, isRoot);
    },
    renderMenu: function(session) {
        session.history = []; 
        if (session.type === "ADMIN") return this.go(session, "ADMIN_MAIN", "관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "번호 입력");
        if (session.type === "GROUP") return this.go(session, "GROUP_MAIN", "단톡방 메뉴", "1. 내 정보 확인\n2. 티어 랭킹", "번호 입력");
        if (!session.tempId || session.tempId === "비회원") return this.go(session, "GUEST_MAIN", "환영합니다", "1. 회원가입\n2. 로그인\n3. 문의하기", "번호 선택");
        return this.go(session, "USER_MAIN", "메인 메뉴", "1. 프로필\n2. 컬렉션\n3. 대전\n4. 상점\n5. 문의하기\n6. 로그아웃", "번호 입력");
    }
};

// ━━━━━━━━ [3. DB 및 세션 관리] ━━━━━━━━
var Database = {
    data: {},
    load: function() { try { return JSON.parse(FileStream.read(Config.DB_PATH)); } catch(e) { return {}; } },
    save: function(d) { this.data = d; FileStream.write(Config.DB_PATH, JSON.stringify(d, null, 4)); },
    getInitData: function(pw) { 
        return { pw: pw, gold: 1000, level: 1, exp: 0, lp: 0, win: 0, lose: 0, title: "뉴비", point: 0, stats: { acc: 50, ref: 50, com: 50, int: 50 }, inventory: { "RESET_TICKET": 0 }, collection: { titles: ["뉴비"], characters: [] } }; 
    }
};

var SessionManager = {
    sessions: {},
    get: function(r, h, g) {
        if (!this.sessions[h]) this.sessions[h] = { screen: "IDLE", history: [], tempId: "비회원", room: r, isDirect: !g, battle: null };
        var s = this.sessions[h]; s.room = r;
        if (r === Config.AdminRoom) s.type = "ADMIN";
        else if (g && r === Config.GroupRoom) s.type = "GROUP";
        else { s.type = "DIRECT"; s.isDirect = true; }
        return s;
    },
    reset: function(session) { 
        session.screen = "IDLE"; session.history = []; session.battle = null; session.targetUser = null; session.editType = null;
    }
};

// ━━━━━━━━ [4. 매칭 매니저 (MatchingManager)] ━━━━━━━━
var MatchingManager = {
    renderDraftUI: function(session, content, help) {
        var div = Utils.getFixedDivider();
        var selectedName = (session.battle && session.battle.playerUnit) ? session.battle.playerUnit : "선택 안함";
        var header = "전투를 준비하세요.\n상대방이 당신의 선택을 기다리고 있습니다.\n선택 캐릭터: [" + selectedName + "]\n" + div + "\n";
        return UI.go(session, session.screen, "전투 준비", header + content, help, true);
    },

    initDraft: function(session, replier) {
        replier.reply(UI.make("배틀 알림", "🔔 대전 매칭에 성공했습니다!\n잠시 후 전투 준비 화면으로 이동합니다.", "잠시만 기다려주세요", true));
        java.lang.Thread.sleep(1500); 
        session.battle = { playerUnit: null, selectedRole: null };
        session.screen = "BATTLE_DRAFT_CAT";
        session.history = []; 
        return replier.reply(this.renderDraftUI(session, "1. 보유 캐릭터", "'준비완료' 입력 시 게임을 시작합니다."));
    },
    
    handleDraft: function(msg, session, replier) {
        var d = Database.data[session.tempId];
        var helpText = "'준비완료' 입력 시 게임을 시작합니다.";

        if (msg === "준비완료") {
            if (!session.battle.playerUnit) return replier.reply(UI.make("알림", "⚠️ 캐릭터를 선택하지 않았습니다."));
            return LoadingManager.start(session, replier);
        }
        
        if (session.screen === "BATTLE_DRAFT_CAT" && msg === "1") {
            session.screen = "BATTLE_DRAFT_ROLE";
            var content = "📢 역할군을 선택하세요.\n" + RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n");
            return replier.reply(this.renderDraftUI(session, content, helpText));
        }
        
        if (session.screen === "BATTLE_DRAFT_ROLE") {
            var idx = parseInt(msg) - 1;
            if (RoleKeys[idx]) {
                var roleName = RoleKeys[idx];
                var myUnits = SystemData.roles[roleName].units.filter(function(u){ return d.collection.characters.indexOf(u) !== -1; });
                if (myUnits.length === 0) return replier.reply(UI.make("알림", "[" + roleName + "] 보유 캐릭터가 없습니다."));
                session.battle.selectedRole = roleName;
                session.screen = "BATTLE_DRAFT_UNIT";
                var content = "📢 [" + roleName + "] 캐릭터를 선택하세요.\n" + myUnits.map(function(u, i){ return (i+1)+". "+u; }).join("\n");
                return replier.reply(this.renderDraftUI(session, content, helpText));
            }
        }
        
        if (session.screen === "BATTLE_DRAFT_UNIT") {
            var roleName = session.battle.selectedRole;
            var myUnits = SystemData.roles[roleName].units.filter(function(u){ return d.collection.characters.indexOf(u) !== -1; });
            var idx = parseInt(msg) - 1;
            if (myUnits[idx]) {
                session.battle.playerUnit = myUnits[idx];
                session.screen = "BATTLE_DRAFT_CAT";
                return replier.reply(this.renderDraftUI(session, "✅ [" + myUnits[idx] + "] 선택 완료!\n\n1. 보유 캐릭터 (다시 선택)", helpText));
            }
        }
    }
};

// ━━━━━━━━ [5. 로딩 매니저 (LoadingManager)] ━━━━━━━━
var LoadingManager = {
    start: function(session, replier) {
        session.screen = "BATTLE_LOADING";
        var aiUnits = ["가렌", "애쉬", "럭스", "다리우스", "제드"];
        session.battle.aiUnit = aiUnits[Math.floor(Math.random() * aiUnits.length)];
        
        var res = "⚔️ 전투가 시작됩니다!\n\n[플레이어] " + session.battle.playerUnit + "\n      VS      \n[인공지능] " + session.battle.aiUnit + "\n\n전장 데이터 동기화 중...";
        replier.reply(UI.make("진입 중", res, "잠시만 기다려주세요", true));
        
        java.lang.Thread.sleep(2000);
        return BattleManager.run(session, replier);
    }
};

// ━━━━━━━━ [NEW: 6. 전투 매니저 (BattleManager)] ━━━━━━━━
var BattleManager = {
    run: function(session, replier) {
        var d = Database.data[session.tempId];
        var st = d.stats;
        
        // 간단한 전투력 계산 로직 (정확+반응+침착+직관 총합 기반 확률)
        var playerPower = st.acc + st.ref + st.com + st.int + Math.floor(Math.random() * 50);
        var aiPower = 200 + Math.floor(Math.random() * 100); // AI 기본 전투력 약 200~300
        
        var isWin = playerPower >= aiPower;
        var log = "[전투 기록]\n";
        log += "⚔️ " + session.battle.playerUnit + "이(가) 공격을 시도합니다.\n";
        
        if (isWin) {
            log += "💥 치명적인 타격! 적을 처치했습니다.\n\n";
            log += "🚩 RESULT: VICTORY";
            this.giveReward(session, d, true, replier, log);
        } else {
            log += "🛡️ 적의 반격에 쓰러졌습니다...\n\n";
            log += "🚩 RESULT: DEFEAT";
            this.giveReward(session, d, false, replier, log);
        }
    },
    
    giveReward: function(session, data, isWin, replier, log) {
        var rewardGold = isWin ? 200 : 50;
        var rewardExp = isWin ? 50 : 20;
        var lpChange = isWin ? 25 : -15;
        
        data.gold += rewardGold;
        data.exp += rewardExp;
        data.lp = Math.max(0, data.lp + lpChange);
        
        if (isWin) data.win++; else data.lose++;
        
        // 레벨업 체크
        var lvUpMsg = "";
        if (data.level < MAX_LEVEL && data.exp >= (data.level * 100)) {
            data.exp -= (data.level * 100);
            data.level++;
            data.point += 5; // 레벨업 시 포인트 지급
            lvUpMsg = "\n🎊 LEVEL UP! (Lv." + data.level + " / +5P)";
        }
        
        Database.save(Database.data);
        
        var resultMsg = log + "\n\n💰 +" + rewardGold + "G  📊 +" + rewardExp + "EXP\n🏆 LP " + (lpChange > 0 ? "+" : "") + lpChange + lvUpMsg;
        
        SessionManager.reset(session);
        return replier.reply(UI.make("전투 종료", resultMsg, "메뉴를 입력하여 복귀", true));
    }
};

// ━━━━━━━━ [7. 관리자 매니저 (Full)] ━━━━━━━━
var AdminManager = {
    handle: function(msg, session, replier) {
        var screen = session.screen;
        if (screen === "ADMIN_MAIN") {
            if (msg === "1") {
                var rt = java.lang.Runtime.getRuntime();
                var used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
                return replier.reply(UI.go(session, "ADMIN_SYS_INFO", "시스템 정보", "📟 RAM: " + used + " MB\n👥 총원: " + Object.keys(Database.data).length + "명", "조회 완료"));
            }
            if (msg === "2") {
                session.userListCache = Object.keys(Database.data);
                var list = session.userListCache.map(function(id, i){ return (i+1)+". "+id; }).join("\n");
                return replier.reply(UI.go(session, "ADMIN_USER_LIST", "유저 관리", list, "번호 입력"));
            }
        }
        if (screen === "ADMIN_USER_LIST") {
            var idx = parseInt(msg) - 1;
            if (session.userListCache[idx]) {
                session.targetUser = session.userListCache[idx];
                return replier.reply(UI.go(session, "ADMIN_USER_DETAIL", session.targetUser, "기능을 선택하세요.", "조회 중"));
            }
        }
        if (screen === "ADMIN_USER_DETAIL") {
            if (msg === "1") return replier.reply(UI.go(session, "ADMIN_EDIT_MENU", "정보 수정", "1. 골드 수정\n2. LP 수정\n3. 레벨 수정", "항목 선택"));
            if (msg === "2") return replier.reply(UI.go(session, "ADMIN_ANSWER_INPUT", "답변 하기", "["+session.targetUser+"] 답변 입력", "내용 입력"));
            if (msg === "3") return replier.reply(UI.go(session, "ADMIN_RESET_CONFIRM", "초기화", "[" + session.targetUser + "] 초기화 하시겠습니까?", "'확인' 입력"));
            if (msg === "4") return replier.reply(UI.go(session, "ADMIN_DELETE_CONFIRM", "계정 삭제", "[" + session.targetUser + "] 삭제 하시겠습니까?", "'삭제확인' 입력"));
        }
        if (screen === "ADMIN_ANSWER_INPUT") {
            Api.replyRoom(session.targetUser, UI.make("운영진 답변", msg, "시스템 메시지", true));
            SessionManager.reset(session); return replier.reply(UI.make("성공", "전송완료", "대기", true));
        }
        if (screen === "ADMIN_EDIT_MENU") {
            var types = ["gold", "lp", "level"];
            if (types[parseInt(msg)-1]) { session.editType = types[parseInt(msg)-1]; return replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "값 수정", "새로운 수치를 입력하세요.", "숫자 입력")); }
        }
        if (screen === "ADMIN_EDIT_INPUT") {
            var val = parseInt(msg); if (isNaN(val) || val < 1) return replier.reply(UI.make("오류", "1 이상의 숫자"));
            Database.data[session.targetUser][session.editType] = val; Database.save(Database.data);
            SessionManager.reset(session); return replier.reply(UI.make("수정 완료", "정보가 업데이트되었습니다.", "대기", true));
        }
        if (screen === "ADMIN_RESET_CONFIRM" && msg === "확인") {
            Database.data[session.targetUser] = Database.getInitData("1234"); Database.save(Database.data);
            SessionManager.reset(session); return replier.reply(UI.make("초기화 완료", "리셋되었습니다.", "대기", true));
        }
        if (screen === "ADMIN_DELETE_CONFIRM" && msg === "삭제확인") {
            delete Database.data[session.targetUser]; Database.save(Database.data);
            SessionManager.reset(session); return replier.reply(UI.make("삭제 완료", "계정이 삭제되었습니다.", "대기", true));
        }
    }
};

// ━━━━━━━━ [8. 유저 매니저 (Full)] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier) {
        var d = Database.data[session.tempId];

        if (!d) {
            if (session.screen === "GUEST_MAIN") {
                if (msg === "1") return replier.reply(UI.go(session, "JOIN_ID", "회원가입", "아이디(10자)", "가입"));
                if (msg === "2") return replier.reply(UI.go(session, "LOGIN_ID", "인증", "아이디", "로그인"));
            }
            if (session.screen === "JOIN_ID") {
                if (Database.data[msg]) return replier.reply(UI.make("오류", "이미 존재하는 ID"));
                session.tempId = msg; return replier.reply(UI.go(session, "JOIN_PW", "회원가입", "비번 설정", "보안"));
            }
            if (session.screen === "JOIN_PW") {
                Database.data[session.tempId] = Database.getInitData(msg); Database.save(Database.data);
                SessionManager.reset(session); return replier.reply(UI.make("성공", "가입 성공!", "메뉴를 입력하세요.", true));
            }
            if (session.screen === "LOGIN_ID") { session.tempId = msg; return replier.reply(UI.go(session, "LOGIN_PW", "인증", "비번 입력", "인증")); }
            if (session.screen === "LOGIN_PW") {
                if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) {
                    SessionManager.reset(session); return replier.reply(UI.make("성공", "로그인됨", "메뉴를 입력하세요.", true));
                }
                return replier.reply(UI.make("실패", "비번 오류"));
            }
            return;
        }

        if (session.screen === "USER_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "PROFILE_VIEW", session.tempId, "", "조회"));
            if (msg === "2") return replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1. 보유 칭호\n2. 보유 챔피언", "조회"));
            if (msg === "3") return replier.reply(UI.go(session, "BATTLE_MAIN", "대전", "1. AI 대결", "전투"));
            if (msg === "4") return replier.reply(UI.go(session, "SHOP_MAIN", "상점", "1. 챔피언 상점\n2. 소모품 상점", "쇼핑"));
            if (msg === "6") { SessionManager.reset(session); session.tempId = "비회원"; return replier.reply(UI.make("알림", "로그아웃", "종료", true)); }
        }

        // --- 상점 로직 ---
        if (session.screen === "SHOP_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "SHOP_ROLES", "역할군 선택", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), "번호 선택"));
            if (msg === "2") return replier.reply(UI.go(session, "SHOP_ITEM_BUY", "소모품 상점", "1. 능력치 초기화권 (10000G)", "번호 선택"));
        }
        if (session.screen === "SHOP_ROLES") {
            var rI = parseInt(msg)-1;
            if (RoleKeys[rI]) {
                session.selectedRole = RoleKeys[rI];
                var uL = SystemData.roles[session.selectedRole].units.map(function(u, i){
                    var o = d.collection.characters.indexOf(u) !== -1;
                    return (i+1)+". "+u+(o?" [보유]":" (500G)");
                }).join("\n");
                return replier.reply(UI.go(session, "SHOP_BUY_ACTION", session.selectedRole, uL, "구매할 번호 입력"));
            }
        }
        if (session.screen === "SHOP_BUY_ACTION") {
            var uI = parseInt(msg)-1; var us = SystemData.roles[session.selectedRole].units;
            if (us[uI]) {
                if (d.collection.characters.indexOf(us[uI]) !== -1) return replier.reply(UI.make("알림", "이미 보유 중입니다."));
                if (d.gold < 500) return replier.reply(UI.make("실패", "골드 부족"));
                d.gold -= 500; d.collection.characters.push(us[uI]); Database.save(Database.data);
                SessionManager.reset(session); return replier.reply(UI.make("구매 성공", us[uI] + " 영입 완료!", "메뉴 입력", true));
            }
        }

        // --- 대전 및 픽창 ---
        if (session.screen === "BATTLE_MAIN" && msg === "1") return MatchingManager.initDraft(session, replier);
        if (session.screen.indexOf("BATTLE_DRAFT") !== -1) return MatchingManager.handleDraft(msg, session, replier);

        // --- 능력치 강화 ---
        if (session.screen === "PROFILE_VIEW") {
            if (msg === "1") return replier.reply(UI.go(session, "STAT_UP_MENU", "능력치 강화", "항목 번호 입력", "남은 포인트: "+(d.point||0)));
        }
        if (session.screen === "STAT_UP_MENU") {
            var keys = ["acc", "ref", "com", "int"], names = ["정확", "반응", "침착", "직관"];
            var idx = parseInt(msg)-1;
            if (keys[idx]) {
                session.selectedStat = keys[idx]; session.selectedStatName = names[idx];
                return replier.reply(UI.go(session, "STAT_UP_INPUT", names[idx] + " 강화", "수치를 입력하세요.", "숫자 입력"));
            }
        }
        if (session.screen === "STAT_UP_INPUT") {
            var amt = parseInt(msg);
            if (isNaN(amt) || amt > (d.point || 0)) return replier.reply(UI.make("실패", "포인트 부족 또는 잘못된 입력"));
            d.stats[session.selectedStat] += amt; d.point -= amt; Database.save(Database.data);
            SessionManager.reset(session); return replier.reply(UI.make("성공", "강화 완료", "대기", true));
        }
    }
};

// ━━━━━━━━ [9. 메인 핸들러] ━━━━━━━━
Database.data = Database.load();

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    try {
        if (!msg || msg.indexOf(".업데이트") !== -1) return;
        var hash = String(imageDB.getProfileHash()); 
        var session = SessionManager.get(room, hash, isGroupChat); 
        msg = msg.trim(); 

        if (msg === "메뉴" || msg === "취소" || msg === "이전") {
            if (session.screen === "IDLE") return replier.reply(UI.renderMenu(session));

            // [픽창 내부 이전] 탈주 확인 없이 즉시 뒤로가기
            if (msg === "이전" && session.screen.indexOf("BATTLE_DRAFT") !== -1) {
                if (session.history && session.history.length > 0) {
                    var prev = session.history.pop();
                    session.screen = prev.screen;
                    var isDraft = session.screen.indexOf("BATTLE_DRAFT") !== -1;
                    return replier.reply(isDraft ? MatchingManager.renderDraftUI(session, prev.content, prev.help) : UI.make(prev.title, prev.content, prev.help));
                }
                return replier.reply(UI.make("알림", "🚫 초기 화면입니다.\n나가려면 '취소' 또는 '메뉴'를 입력하세요."));
            }

            // [탈주/취소 가드]
            session.preCancel = { screen: session.screen, title: session.lastTitle, content: session.lastContent, help: session.lastHelp };
            var isBattle = session.screen.indexOf("BATTLE") !== -1;
            return replier.reply(UI.go(session, "CANCEL_CONFIRM", isBattle ? "⚠️ 탈주 확인" : "취소 확인", isBattle ? "정말 전장을 이탈하시겠습니까?" : "중단할까요?", "'예'/'아니오' 입력", true));
        }

        if (session.screen === "CANCEL_CONFIRM") {
            if (msg === "예" || msg === "1") { SessionManager.reset(session); return replier.reply(UI.renderMenu(session)); }
            else if (msg === "아니오" || msg === "2") {
                var p = session.preCancel;
                session.screen = p.screen;
                return replier.reply(UI.make(p.title, p.content, p.help));
            }
            return;
        }

        if (session.screen === "IDLE") return;
        if (session.screen === "BATTLE_LOADING") return; // 로딩 중 입력 무시

        if (session.type === "ADMIN") AdminManager.handle(msg, session, replier);
        else UserManager.handle(msg, session, replier);

    } catch (e) { replier.reply("Error: " + e.message); }
}
