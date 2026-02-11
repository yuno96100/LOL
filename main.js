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

// ━━━━━━━━ [2. 유틸리티 및 통합 UI 엔진] ━━━━━━━━
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
    layout: function(title, header, content, help, isRoot) {
        var div = Utils.getFixedDivider();
        var res = "『 " + title + " 』\n" + div + "\n";
        if (header) res += header + "\n" + div + "\n";
        res += Utils.wrapText(content) + "\n" + div + "\n";
        if (help) res += "💡 " + Utils.wrapText(help);
        if (!isRoot) res += "\n" + div + "\n" + Utils.getNav();
        return res;
    },

    render: function(session, screen, title, content, help) {
        var d = session.data;
        var header = "";
        var isRoot = ["USER_MAIN", "GUEST_MAIN", "ADMIN_MAIN", "GROUP_MAIN"].indexOf(screen) !== -1;

        if (screen.indexOf("SHOP") !== -1) {
            header = "💰 보유 골드: " + (d ? d.gold.toLocaleString() : 0) + " G\n📦 보유 유닛: " + (d ? d.collection.characters.length : 0) + "종";
        } else if (screen.indexOf("BATTLE_DRAFT") !== -1) {
            var b = session.battle || {};
            header = "🛡️ 역할: [" + (b.selectedRole || "미선택") + "]\n👤 유닛: [" + (b.playerUnit || "미선택") + "]";
        } else if (screen.indexOf("COL_") !== -1) {
            var count = d ? d.collection.characters.length : 0;
            header = "🏆 수집률: " + Math.floor((count / 30) * 100) + "% (" + count + " / 30)";
        } else if (screen.indexOf("PROFILE") !== -1 || screen.indexOf("STAT") !== -1 || screen === "ADMIN_USER_DETAIL") {
            var targetId = session.targetUser || session.tempId;
            var targetData = Database.data[targetId] || d;
            if (targetData) {
                var lp = targetData.lp || 0;
                var tier = getTierInfo(lp);
                header = "🏅 티어: " + tier.icon + " " + tier.name + " (" + lp + "LP)\n✨ 포인트: " + (targetData.point || 0) + " P";
            }
        }

        return this.layout(title, header, content, help, isRoot);
    },

    go: function(session, screen, title, content, help, skipHistory) {
        if (!skipHistory && session.screen && session.screen !== "IDLE" && session.screen !== screen) {
            if (!session.history) session.history = [];
            session.history.push({ screen: session.screen, title: session.lastTitle, content: session.lastContent, help: session.lastHelp });
        }
        session.screen = screen; session.lastTitle = title; session.lastContent = content || ""; session.lastHelp = help || "";
        return this.render(session, screen, title, content, help);
    },

    renderMenu: function(session) {
        session.history = [];
        if (session.type === "ADMIN") return this.go(session, "ADMIN_MAIN", "관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "번호 입력");
        if (session.type === "GROUP") return this.go(session, "GROUP_MAIN", "단톡방 메뉴", "1. 내 정보 확인\n2. 티어 랭킹", "번호 입력");
        if (!session.data) return this.go(session, "GUEST_MAIN", "환영합니다", "1. 회원가입\n2. 로그인\n3. 문의하기", "번호 선택");
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
        session.screen = "IDLE"; session.history = []; session.targetUser = null; session.battle = null;
    },
    forceLogout: function(userId) {
        for (var key in this.sessions) { if (this.sessions[key].tempId === userId) { this.sessions[key].data = null; this.sessions[key].tempId = "비회원"; this.reset(this.sessions[key]); } }
        this.save();
    }
};

// ━━━━━━━━ [4. 매칭매니저] ━━━━━━━━
var MatchingManager = {
    initDraft: function(session, replier) {
        session.battle = { playerUnit: null, selectedRole: null };
        return replier.reply(UI.go(session, "BATTLE_DRAFT_CAT", "대전 준비", "1. 캐릭터 선택", "'준비완료' 입력 시 시작"));
    },
    handleDraft: function(msg, session, replier) {
        var d = session.data;
        // 준비 완료 시 게임 시작 로직
        if (msg === "준비완료") {
            if (!session.battle || !session.battle.playerUnit) {
                return replier.reply(UI.layout("알림", null, "⚠️ 캐릭터를 선택하지 않았습니다.", "도움말", false));
            }
            return LoadingManager.start(session, replier);
        }
        // 카테고리 선택 (캐릭터 선택 진입)
        if (session.screen === "BATTLE_DRAFT_CAT" && msg === "1") {
            var content = RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n");
            return replier.reply(UI.go(session, "BATTLE_DRAFT_ROLE", "역할군 선택", content, "번호 입력"));
        }
        // 역할군 선택 시 해당 유닛 목록 출력
        if (session.screen === "BATTLE_DRAFT_ROLE") {
            var idx = parseInt(msg) - 1;
            if (RoleKeys[idx]) {
                session.battle.selectedRole = RoleKeys[idx];
                var units = SystemData.roles[session.battle.selectedRole].units.filter(function(u){ 
                    return d.collection.characters.indexOf(u) !== -1; 
                });
                if (units.length === 0) {
                    return replier.reply(UI.layout("알림", null, "["+session.battle.selectedRole+"] 보유 유닛이 없습니다.", "도움말", false));
                }
                var content = units.map(function(u, i){ return (i+1)+". "+u; }).join("\n");
                return replier.reply(UI.go(session, "BATTLE_DRAFT_UNIT", "유닛 확정", content, "번호 입력"));
            }
        }
        // 최종 유닛 확정
        if (session.screen === "BATTLE_DRAFT_UNIT") {
            var units = SystemData.roles[session.battle.selectedRole].units.filter(function(u){ 
                return d.collection.characters.indexOf(u) !== -1; 
            });
            var idx = parseInt(msg) - 1;
            if (units[idx]) {
                session.battle.playerUnit = units[idx];
                return replier.reply(UI.go(session, "BATTLE_DRAFT_CAT", "준비 완료", "✅ [" + units[idx] + "] 선택 완료\n\n'준비완료'를 입력하여 전장으로 진입하세요.", "전장 진입"));
            }
        }
    }
};

// ━━━━━━━━ [5. 로딩매니저] ━━━━━━━━
var LoadingManager = {
    start: function(session, replier) {
        session.screen = "BATTLE_LOADING";
        // AI 유닛 랜덤 배정
        var aiPool = ["가렌", "애쉬", "럭스", "제드", "알리스타"];
        session.battle.aiUnit = aiPool[Math.floor(Math.random() * aiPool.length)];
        
        var loadingMsg = "⚔️ 전투가 곧 시작됩니다!\n\n" + 
                         "[나] " + session.battle.playerUnit + "\n" +
                         "      VS      \n" +
                         "[적] " + session.battle.aiUnit + "\n\n" +
                         "데이터 동기화 중...";
                         
        replier.reply(UI.layout("진입 중", null, loadingMsg, "잠시만 기다려주세요", true));
        
        // 1.5초 후 전장 도착 연출 (실제 게임 엔진 호출부로 연결 가능)
        java.lang.Thread.sleep(1500);
        return replier.reply(UI.layout("전장 도착", null, "🚩 전투가 시작되었습니다!\n명령어를 대기 중입니다.", "메뉴 입력 시 종료", true));
    }
};

// ━━━━━━━━ [6. 관리자 매니저] ━━━━━━━━
var AdminManager = {
    handle: function(msg, session, replier) {
        var screen = session.screen;
        
        // 메인 메뉴
        if (screen === "ADMIN_MAIN") {
            if (msg === "1") {
                var rt = java.lang.Runtime.getRuntime();
                var used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
                var info = "📟 RAM: " + used + " MB\n👥 총 유저: " + Object.keys(Database.data).length + "명\n⚙️ 버전: 15.6.1";
                return replier.reply(UI.go(session, "ADMIN_SYS_INFO", "시스템 정보", info, "조회 완료"));
            }
            if (msg === "2") {
                session.userListCache = Object.keys(Database.data);
                var list = session.userListCache.map(function(id, i){ return (i+1)+". "+id; }).join("\n");
                return replier.reply(UI.go(session, "ADMIN_USER_LIST", "유저 관리", list, "번호 입력"));
            }
        }

        // 유저 목록에서 선택
        if (screen === "ADMIN_USER_LIST") {
            var idx = parseInt(msg) - 1;
            if (session.userListCache[idx]) {
                session.targetUser = session.userListCache[idx];
                return replier.reply(UI.go(session, "ADMIN_USER_DETAIL", session.targetUser, "1. 수치 수정\n2. 답변 하기\n3. 초기화\n4. 계정 삭제", "관리 항목 선택"));
            }
        }

        // 유저 상세 관리 메뉴
        if (screen === "ADMIN_USER_DETAIL") {
            if (msg === "1") return replier.reply(UI.go(session, "ADMIN_EDIT_MENU", "정보 수정", "1. 골드 수정\n2. LP 수정\n3. 포인트 수정", "항목 선택"));
            if (msg === "2") return replier.reply(UI.go(session, "ADMIN_ANSWER_INPUT", "답변 하기", "["+session.targetUser+"] 유저에게 보낼 메시지 입력", "내용 입력"));
            if (msg === "3") return replier.reply(UI.go(session, "ADMIN_RESET_CONFIRM", "초기화", "데이터를 초기 상태로 되돌릴까요?", "'확인' 입력"));
            if (msg === "4") return replier.reply(UI.go(session, "ADMIN_DELETE_CONFIRM", "계정 삭제", "계정을 영구 삭제하시겠습니까?", "'삭제확인' 입력"));
        }

        // 수치 수정 항목 선택
        if (screen === "ADMIN_EDIT_MENU") {
            var types = { "1": "gold", "2": "lp", "3": "point" };
            if (types[msg]) {
                session.editType = types[msg];
                return replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "값 입력", "새로운 수치를 숫자로 입력하세요.", "숫자 입력"));
            }
        }

        // 실제 수치 변경 처리
        if (screen === "ADMIN_EDIT_INPUT") {
            var val = parseInt(msg);
            if (isNaN(val)) return replier.reply(UI.layout("오류", null, "숫자만 입력 가능합니다.", "재입력", false));
            Database.data[session.targetUser][session.editType] = val;
            Database.save(Database.data);
            SessionManager.reset(session);
            return replier.reply(UI.layout("성공", null, "정보가 업데이트되었습니다.", "메뉴로 복귀", true));
        }

        // 문의 답변 전송
        if (screen === "ADMIN_ANSWER_INPUT") {
            Api.replyRoom(session.targetUser, UI.layout("운영진 답변", null, msg, "시스템 메시지", true));
            SessionManager.reset(session);
            return replier.reply(UI.layout("전송 완료", null, "답변이 전달되었습니다.", "완료", true));
        }

        // 초기화 및 삭제 확정
        if (screen === "ADMIN_RESET_CONFIRM" && msg === "확인") {
            Database.data[session.targetUser] = Database.getInitData("1234");
            Database.save(Database.data);
            SessionManager.reset(session);
            return replier.reply(UI.layout("초기화 완료", null, "기본 데이터로 리셋되었습니다.", "완료", true));
        }
        if (screen === "ADMIN_DELETE_CONFIRM" && msg === "삭제확인") {
            delete Database.data[session.targetUser];
            Database.save(Database.data);
            SessionManager.reset(session);
            return replier.reply(UI.layout("삭제 완료", null, "데이터가 영구 삭제되었습니다.", "완료", true));
        }
    }
};

// ━━━━━━━━ [8. 유저 매니저] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier) {
        // 세션 데이터 동기화 (DB 데이터 로드)
        if (session.tempId && Database.data[session.tempId]) {
            session.data = Database.data[session.tempId];
        }
        var d = session.data;

        // 로그인 데이터가 없으면 로그인매니저로 위임
        if (!d) {
            return LoginManager.handle(msg, session, replier);
        }

        // ------------------------------------------------
        // 1. 유저 메인 메뉴 (USER_MAIN)
        // ------------------------------------------------
        if (session.screen === "USER_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "PROFILE_VIEW", "내 정보", "나의 능력치와 전적을 확인합니다.\n\n1. 능력치 강화\n2. 초기화권 사용", "조회"));
            if (msg === "2") return replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "보유한 자산을 확인합니다.\n\n1. 보유 챔피언\n2. 보유 칭호", "수집 정보"));
            if (msg === "3") return MatchingManager.initDraft(session, replier);
            if (msg === "4") return replier.reply(UI.go(session, "SHOP_MAIN", "상점", "필요한 물건을 구매하세요.\n\n1. 챔피언 상점\n2. 소모품 상점", "골드 소비"));
            if (msg === "5") return replier.reply(UI.go(session, "USER_INQUIRY", "문의하기", "관리자에게 보낼 내용을 입력하세요.", "문의 접수"));
            if (msg === "6") { 
                SessionManager.forceLogout(session.tempId); 
                return replier.reply(UI.layout("알림", null, "정상적으로 로그아웃 되었습니다.", "종료", true)); 
            }
        }

        // ------------------------------------------------
        // 2. 프로필 및 스탯 강화 로직
        // ------------------------------------------------
        if (session.screen === "PROFILE_VIEW") {
            if (msg === "1") {
                var statsContent = "강화할 항목을 선택하세요.\n\n1. 정확 (Acc)\n2. 반응 (Ref)\n3. 침착 (Com)\n4. 직관 (Int)";
                return replier.reply(UI.go(session, "STAT_UP_MENU", "능력치 강화", statsContent, "번호 선택"));
            }
            if (msg === "2") {
                var ticketCount = (d.inventory && d.inventory["RESET_TICKET"]) || 0;
                var resetContent = "모든 스탯을 초기화하고 포인트를 돌려받으시겠습니까?\n\n보유 수량: " + ticketCount + "개";
                return replier.reply(UI.go(session, "STAT_RESET_CONFIRM", "초기화 확인", resetContent, "'사용' 입력 시 확정"));
            }
        }

        // 스탯 항목 선택 후 수치 입력 단계
        if (session.screen === "STAT_UP_MENU") {
            var statMap = { "1": ["acc", "정확"], "2": ["ref", "반응"], "3": ["com", "침착"], "4": ["int", "직관"] };
            if (statMap[msg]) {
                session.selectedStat = statMap[msg][0];
                session.selectedStatName = statMap[msg][1];
                return replier.reply(UI.go(session, "STAT_UP_INPUT", session.selectedStatName + " 강화", "강화할 수치를 숫자로 입력하세요.", "숫자 입력"));
            }
        }

        // 스탯 수치 반영 로직
        if (session.screen === "STAT_UP_INPUT") {
            var amount = parseInt(msg);
            if (isNaN(amount) || amount <= 0) return replier.reply(UI.layout("오류", null, "1 이상의 숫자만 입력 가능합니다.", "재입력", false));
            if (amount > (d.point || 0)) return replier.reply(UI.layout("실패", null, "보유 포인트가 부족합니다.", "재입력", false));
            
            d.stats[session.selectedStat] += amount;
            d.point -= amount;
            Database.save(Database.data);
            
            // 강화 성공 후 프로필로 복귀 (히스토리 정리)
            session.history = []; 
            replier.reply(UI.layout("✨ 강화 성공", null, session.selectedStatName + " 수치가 " + amount + " 증가했습니다.", "확인", true));
            return replier.reply(UI.go(session, "PROFILE_VIEW", "내 정보", "나의 능력치와 전적을 확인합니다.\n\n1. 능력치 강화\n2. 초기화권 사용", "조회"));
        }

        // ------------------------------------------------
        // 3. 상점 (구매 프로세스 전체)
        // ------------------------------------------------
        if (session.screen === "SHOP_MAIN") {
            if (msg === "1") {
                var rolesList = RoleKeys.map(function(r, i){ return (i+1) + ". " + r; }).join("\n");
                return replier.reply(UI.go(session, "SHOP_ROLES", "챔피언 영입", rolesList, "역할군 선택"));
            }
            if (msg === "2") {
                return replier.reply(UI.go(session, "SHOP_ITEM_BUY", "소모품 상점", "1. 능력치 초기화권 (10,000G)", "구매 번호 입력"));
            }
        }

        // 챔피언 상점: 유닛 목록
        if (session.screen === "SHOP_ROLES") {
            var rIdx = parseInt(msg) - 1;
            if (RoleKeys[rIdx]) {
                session.selectedRole = RoleKeys[rIdx];
                var units = SystemData.roles[session.selectedRole].units;
                var unitList = units.map(function(u, i){
                    var isOwned = d.collection.characters.indexOf(u) !== -1;
                    return (i+1) + ". " + u + (isOwned ? " [보유중]" : " (500G)");
                }).join("\n");
                return replier.reply(UI.go(session, "SHOP_BUY_ACTION", session.selectedRole, unitList, "구매할 유닛 번호 입력"));
            }
        }

        // 챔피언 구매 확정 로직
        if (session.screen === "SHOP_BUY_ACTION") {
            var uIdx = parseInt(msg) - 1;
            var units = SystemData.roles[session.selectedRole].units;
            if (units[uIdx]) {
                var targetUnit = units[uIdx];
                if (d.collection.characters.indexOf(targetUnit) !== -1) return replier.reply(UI.layout("알림", null, "이미 보유한 챔피언입니다.", "도움말", false));
                if (d.gold < 500) return replier.reply(UI.layout("실패", null, "골드가 부족합니다.", "도움말", false));
                
                d.gold -= 500;
                d.collection.characters.push(targetUnit);
                Database.save(Database.data);
                return replier.reply(UI.layout("구매 성공", null, "🎉 [" + targetUnit + "]을 영입했습니다!", "확인", true));
            }
        }

        // 소모품 구매 로직
        if (session.screen === "SHOP_ITEM_BUY") {
            if (msg === "1") {
                if (d.gold < 10000) return replier.reply(UI.layout("실패", null, "골드가 부족합니다.", "도움말", false));
                d.gold -= 10000;
                if (!d.inventory["RESET_TICKET"]) d.inventory["RESET_TICKET"] = 0;
                d.inventory["RESET_TICKET"]++;
                Database.save(Database.data);
                return replier.reply(UI.layout("구매 완료", null, "능력치 초기화권을 구매했습니다.", "확인", true));
            }
        }

        // ------------------------------------------------
        // 4. 컬렉션 조회 로직
        // ------------------------------------------------
        if (session.screen === "COL_MAIN") {
            if (msg === "1") {
                var myUnits = d.collection.characters.length > 0 ? d.collection.characters.join("\n• ") : "보유 챔피언이 없습니다.";
                return replier.reply(UI.go(session, "COL_UNITS", "보유 챔피언", "• " + myUnits, "조회 완료"));
            }
            if (msg === "2") {
                var myTitles = d.collection.titles.join("\n• ");
                return replier.reply(UI.go(session, "COL_TITLES", "보유 칭호", "• " + myTitles, "조회 완료"));
            }
        }

        // ------------------------------------------------
        // 5. 기타 유저 행동
        // ------------------------------------------------
        if (session.screen === "USER_INQUIRY") {
            var report = "📩 [신규 유저 문의]\n유저: " + session.tempId + "\n내용: " + msg;
            if (Config.AdminRoom) Api.replyRoom(Config.AdminRoom, UI.layout("문의 알림", null, report, "운영진 확인용", true));
            SessionManager.reset(session);
            return replier.reply(UI.layout("전송 완료", null, "문의가 정상적으로 접수되었습니다.\n관리자 확인 후 답변 드리겠습니다.", "감사합니다", true));
        }

        // 대전/드래프트 위임
        if (session.screen.indexOf("BATTLE_DRAFT") !== -1) {
            return MatchingManager.handleDraft(msg, session, replier);
        }
    }
};

// ━━━━━━━━ [9. 단체방 매니저] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier) {
        if (session.screen === "GROUP_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "GROUP_PROFILE", "내 정보 요약", "단체방용 간편 프로필입니다.", "조회"));
            if (msg === "2") {
                var users = Object.keys(Database.data);
                var rank = users.map(function(id){ 
                    return { id: id, lp: Database.data[id].lp || 0 }; 
                }).sort(function(a, b){ return b.lp - a.lp; });
                var txt = rank.slice(0, 10).map(function(u, i){ 
                    var t = getTierInfo(u.lp);
                    return (i+1) + ". " + u.id + " (" + t.icon + " " + u.lp + "LP)"; 
                }).join("\n");
                return replier.reply(UI.go(session, "GROUP_RANKING", "티어 랭킹 TOP 10", txt, "실시간 집계"));
            }
        }
    }
};

// ━━━━━━━━ [10. 메인 핸들러] ━━━━━━━━
Database.data = Database.load(); 
if (typeof SessionManager.load === "function") SessionManager.load();

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    var hash = String(imageDB.getProfileHash());
    var session = SessionManager.get(room, hash, isGroupChat);
    
    try {
        if (!msg || msg.indexOf(".업데이트") !== -1) return;
        msg = msg.trim();

        // 1. 공통 취소 확인 프로세스
        if (session.screen === "CANCEL_CONFIRM") return handleCancelConfirm(msg, session, replier);
        
        if (msg === "메뉴") {
            if (session.screen === "IDLE") return replier.reply(UI.renderMenu(session));
            return showCancelConfirm(session, replier);
        }

        // 2. 뒤로가기/이전 처리
        if (msg === "취소" || msg === "이전") {
            if (session.history && session.history.length > 0) {
                var prev = session.history.pop();
                session.screen = prev.screen;
                return replier.reply(UI.render(session, prev.screen, prev.title, prev.content, prev.help));
            }
            return replier.reply(UI.renderMenu(session));
        }

        // 3. 상태별 매니저 호출
        if (session.screen === "IDLE" || session.screen === "BATTLE_LOADING") return;

        if (session.type === "ADMIN") AdminManager.handle(msg, session, replier);
        else if (session.type === "GROUP") GroupManager.handle(msg, session, replier);
        else UserManager.handle(msg, session, replier);
        
        SessionManager.save();

    } catch (e) {
        replier.reply("🚨 [시스템 에러]\nLine: " + e.lineNumber + "\n" + e.message);
    }
}

// 중단 확인 로직
function showCancelConfirm(session, replier) {
    session.preCancel = { s: session.screen, t: session.lastTitle, c: session.lastContent, h: session.lastHelp };
    var isBattle = session.screen.indexOf("BATTLE") !== -1;
    var body = isBattle ? "⚠️ 전투 매칭을 취소하고 나갈까요?" : "현재 진행 중인 작업을 중단할까요?";
    return replier.reply(UI.go(session, "CANCEL_CONFIRM", "알림", body, "'예'/'아니오' 입력", true));
}

function handleCancelConfirm(msg, session, replier) {
    if (msg === "예" || msg === "1" || msg === "확인") { 
        SessionManager.reset(session); 
        return replier.reply(UI.renderMenu(session)); 
    }
    var p = session.preCancel;
    return replier.reply(UI.go(session, p.s, p.t, p.c, p.h, true));
}
