/**
 * [main.js] v15.6.5
 * - UI: 보유 캐릭터 없는 창도 픽창 헤더 유지
 * - FLOW: 모든 단계에서 '이전' 시 초기화 방지 및 완벽 복구
 * - TEXT: 캐릭터 선택 시 역할군 이름만 출력
 * - FULL: AdminManager, UserManager 포함 모든 기능 생략 없음
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
        if (session.tempId && Database.data[session.tempId]) session.data = Database.data[session.tempId];
        
        if (!skipHistory && session.screen && session.screen !== "IDLE" && session.screen !== screen) {
            if (!session.history) session.history = [];
            session.history.push({ screen: session.screen, title: session.lastTitle, content: session.lastContent, help: session.lastHelp });
        }
        
        session.screen = screen; 
        session.lastTitle = title;
        session.lastContent = content || ""; 
        session.lastHelp = help || "";
        
        if (screen.indexOf("PROFILE") !== -1 || screen.indexOf("STAT") !== -1 || screen === "ADMIN_USER_DETAIL") {
            var tid = session.targetUser || session.tempId;
            return UI.renderProfile(tid, Database.data[tid], help, content, isRoot, session);
        }
        return this.make(title, content, help, isRoot);
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
        session.screen = "IDLE"; session.history = []; session.userListCache = []; 
        session.targetUser = null; session.editType = null; session.battle = null;
    },
    forceLogout: function(userId) {
        for (var key in this.sessions) { if (this.sessions[key].tempId === userId) { this.sessions[key].data = null; this.sessions[key].tempId = "비회원"; this.reset(this.sessions[key]); } }
        this.save();
    }
};

// ━━━━━━━━ [4. 배틀 매니저 (픽창)] ━━━━━━━━
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
        session.battle = { playerUnit: null, aiUnit: null, selectedRole: null };
        session.history = []; 
        session.screen = "BATTLE_DRAFT_CAT";
        return replier.reply(this.renderDraftUI(session, "1. 보유 캐릭터", "'준비완료' 입력 시 게임을 시작합니다."));
    },

    handleDraft: function(msg, session, replier) {
        if (msg === "취소" || msg === "이전") {
            if (session.history && session.history.length > 0) {
                var prev = session.history.pop();
                session.screen = prev.screen;
                return replier.reply(this.renderDraftUI(session, prev.content, prev.help));
            } else {
                return showCancelConfirm(session, replier);
            }
        }

        var d = Database.data[session.tempId];
        var helpText = "'준비완료' 입력 시 게임을 시작합니다.";

        if (msg === "준비완료") {
            if (!session.battle.playerUnit) return replier.reply(UI.make("알림", "⚠️ 캐릭터를 선택하지 않았습니다."));
            return LoadingManager.start(session, replier);
        }
        
        if (session.screen === "BATTLE_DRAFT_CAT" && msg === "1") {
            session.history.push({ screen: "BATTLE_DRAFT_CAT", content: "1. 보유 캐릭터", help: helpText });
            session.screen = "BATTLE_DRAFT_ROLE";
            var content = "📢 역할군을 선택하세요.\n" + RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n");
            return replier.reply(this.renderDraftUI(session, content, "역할군 번호를 입력하세요."));
        }
        
        if (session.screen === "BATTLE_DRAFT_ROLE") {
            var idx = parseInt(msg) - 1;
            if (RoleKeys[idx]) {
                var roleName = RoleKeys[idx];
                var myUnits = SystemData.roles[roleName].units.filter(function(u){ return d.collection.characters.indexOf(u) !== -1; });
                
                if (myUnits.length === 0) {
                    return replier.reply(this.renderDraftUI(session, "⚠️ [" + roleName + "] 보유 캐릭터가 없습니다.", "다른 역할군을 선택하세요."));
                }
                
                session.history.push({ screen: "BATTLE_DRAFT_ROLE", content: session.lastContent, help: session.lastHelp });
                session.battle.selectedRole = roleName;
                session.screen = "BATTLE_DRAFT_UNIT";
                var content = "**" + roleName + "**\n" + myUnits.map(function(u, i){ return (i+1)+". "+u; }).join("\n");
                return replier.reply(this.renderDraftUI(session, content, "캐릭터 번호를 입력하세요."));
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

// ━━━━━━━━ [5. 로딩 매니저] ━━━━━━━━
var LoadingManager = {
    start: function(session, replier) {
        session.screen = "BATTLE_LOADING";
        var aiUnits = ["가렌", "애쉬", "럭스", "다리우스", "제드"];
        session.battle.aiUnit = aiUnits[Math.floor(Math.random() * aiUnits.length)];
        
        var res = "⚔️ 전투가 시작됩니다!\n\n" +
                  "[플레이어] " + session.battle.playerUnit + "\n" +
                  "      VS      \n" +
                  "[인공지능] " + session.battle.aiUnit + "\n\n" +
                  "전장 데이터 동기화 중...";
                  
        replier.reply(UI.make("진입 중", res, "잠시만 기다려주세요", true));
        java.lang.Thread.sleep(2000);
        return replier.reply(UI.make("전장 도착", "🚩 전투가 시작되었습니다!\n(로직에 따라 전투 결과가 곧 출력됩니다)", "메뉴를 입력하여 종료", true));
    }
};

// ━━━━━━━━ [6. 관리자 매니저 (완전복구)] ━━━━━━━━
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
            if (msg === "2") return replier.reply(UI.go(session, "ADMIN_ANSWER_INPUT", "답변 하기", "["+session.targetUser+"] 답변 내용을 입력하세요.", "내용 입력"));
            if (msg === "3") return replier.reply(UI.go(session, "ADMIN_RESET_CONFIRM", "데이터 초기화", "[" + session.targetUser + "] 유저의 데이터를 초기화하시겠습니까?", "'확인' 입력"));
            if (msg === "4") return replier.reply(UI.go(session, "ADMIN_DELETE_CONFIRM", "계정 삭제", "[" + session.targetUser + "] 계정을 영구 삭제하시겠습니까?", "'삭제확인' 입력"));
        }
        if (screen === "ADMIN_ANSWER_INPUT") {
            Api.replyRoom(session.targetUser, UI.make("운영진 답변", msg, "시스템 메시지", true));
            SessionManager.reset(session); return replier.reply(UI.make("성공", "유저에게 답변이 전송되었습니다.", "대기", true));
        }
        if (screen === "ADMIN_EDIT_MENU") {
            var types = ["gold", "lp", "level"];
            var choice = parseInt(msg)-1;
            if (types[choice]) { 
                session.editType = types[choice]; 
                return replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "수치 입력", "변경할 새로운 값을 입력하세요.", "숫자 입력")); 
            }
        }
        if (screen === "ADMIN_EDIT_INPUT") {
            var val = parseInt(msg); 
            if (isNaN(val)) return replier.reply(UI.make("오류", "올바른 숫자를 입력하세요."));
            Database.data[session.targetUser][session.editType] = val; Database.save(Database.data);
            SessionManager.reset(session); return replier.reply(UI.make("성공", "값이 정상적으로 수정되었습니다.", "대기", true));
        }
        if (screen === "ADMIN_RESET_CONFIRM" && msg === "확인") {
            Database.data[session.targetUser] = Database.getInitData("1234"); Database.save(Database.data);
            SessionManager.reset(session); return replier.reply(UI.make("완료", "해당 유저가 초기화되었습니다.", "대기", true));
        }
        if (screen === "ADMIN_DELETE_CONFIRM" && msg === "삭제확인") {
            delete Database.data[session.targetUser]; Database.save(Database.data);
            SessionManager.reset(session); return replier.reply(UI.make("완료", "해당 계정이 삭제되었습니다.", "대기", true));
        }
    }
};

// ━━━━━━━━ [7. 유저 매니저 (완전복구)] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier) {
        if (session.tempId && Database.data[session.tempId]) session.data = Database.data[session.tempId];
        var d = session.data;

        if (!d) {
            if (session.screen === "GUEST_MAIN") {
                if (msg === "1") return replier.reply(UI.go(session, "JOIN_ID", "회원가입", "아이디(10자 이내)", "아이디 입력"));
                if (msg === "2") return replier.reply(UI.go(session, "LOGIN_ID", "인증", "아이디", "아이디 입력"));
                if (msg === "3") return replier.reply(UI.go(session, "GUEST_INQUIRY", "문의", "문의 내용을 입력하세요.", "내용 입력"));
            }
            if (session.screen === "JOIN_ID") {
                if (msg.length > 10 || Database.data[msg]) return replier.reply(UI.make("오류", "사용 중이거나 너무 긴 ID입니다."));
                session.tempId = msg; return replier.reply(UI.go(session, "JOIN_PW", "회원가입", "비밀번호를 입력하세요.", "비번 입력"));
            }
            if (session.screen === "JOIN_PW") {
                Database.data[session.tempId] = Database.getInitData(msg); Database.save(Database.data);
                session.data = Database.data[session.tempId]; SessionManager.reset(session);
                return replier.reply(UI.make("환영합니다", "가입이 완료되었습니다.", "메뉴 입력", true));
            }
            if (session.screen === "LOGIN_ID") { session.tempId = msg; return replier.reply(UI.go(session, "LOGIN_PW", "인증", "비밀번호를 입력하세요.", "비번 입력")); }
            if (session.screen === "LOGIN_PW") {
                if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) {
                    session.data = Database.data[session.tempId]; SessionManager.reset(session);
                    return replier.reply(UI.make("성공", "정상적으로 로그인되었습니다.", "메뉴 입력", true));
                }
                return replier.reply(UI.make("실패", "계정 정보가 일치하지 않습니다."));
            }
            if (session.screen === "GUEST_INQUIRY" || session.screen === "USER_INQUIRY") {
                if (Config.AdminRoom) Api.replyRoom(Config.AdminRoom, UI.make("📩 문의", "아이디: " + session.tempId + "\n내용: " + msg, "회신 바람", true));
                SessionManager.reset(session); return replier.reply(UI.make("성공", "문의가 운영진에게 전달되었습니다.", "대기", true));
            }
            return;
        }

        if (session.screen === "USER_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "PROFILE_VIEW", session.tempId, "", "상세 정보"));
            if (msg === "2") return replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1. 보유 칭호\n2. 보유 캐릭터", "조회 선택"));
            if (msg === "3") return replier.reply(UI.go(session, "BATTLE_MAIN", "대전", "1. AI 대결", "전투 선택"));
            if (msg === "4") return replier.reply(UI.go(session, "SHOP_MAIN", "상점", "1. 챔피언 상점\n2. 소모품 상점", "쇼핑 선택"));
            if (msg === "5") return replier.reply(UI.go(session, "USER_INQUIRY", "문의하기", "문의할 내용을 적어주세요.", "전송"));
            if (msg === "6") { SessionManager.forceLogout(session.tempId); return replier.reply(UI.make("알림", "로그아웃 되었습니다.", "종료", true)); }
        }

        if (session.screen === "COL_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "COL_TITLES", "보유 칭호", (d.collection.titles.join("\n")), "목록"));
            if (msg === "2") return replier.reply(UI.go(session, "COL_CHARS", "보유 캐릭터", (d.collection.characters.length === 0 ? "보유 캐릭터 없음" : d.collection.characters.join("\n")), "목록"));
        }

        if (session.screen === "BATTLE_MAIN" && msg === "1") { MatchingManager.initDraft(session, replier); return; }

        if (session.screen === "PROFILE_VIEW") {
            if (msg === "1") return replier.reply(UI.go(session, "STAT_UP_MENU", "능력치 강화", "강화할 스탯 번호를 입력하세요.", "보유 포인트: " + (d.point || 0)));
            if (msg === "2") {
                var c = (d.inventory && d.inventory["RESET_TICKET"]) || 0;
                return replier.reply(UI.go(session, "STAT_RESET_CONFIRM", "초기화", "능력치 초기화권을 사용하시겠습니까?\n보유수량: " + c + "개", "'사용' 입력 시 초기화"));
            }
        }
        if (session.screen === "STAT_RESET_CONFIRM" && msg === "사용") {
            if (d.inventory["RESET_TICKET"] > 0) {
                d.inventory["RESET_TICKET"]--; d.stats = { acc: 50, ref: 50, com: 50, int: 50 };
                Database.save(Database.data); SessionManager.reset(session);
                return replier.reply(UI.make("완료", "모든 능력치가 50으로 초기화되었습니다.", "대기", true));
            }
            return replier.reply(UI.make("실패", "초기화권이 부족합니다. 상점에서 구매하세요."));
        }
        if (session.screen === "STAT_UP_MENU") {
            var keys = ["acc", "ref", "com", "int"], names = ["정확", "반응", "침착", "직관"];
            var idx = parseInt(msg) - 1;
            if (keys[idx]) {
                session.selectedStat = keys[idx]; session.selectedStatName = names[idx];
                return replier.reply(UI.go(session, "STAT_UP_INPUT", names[idx] + " 강화", "강화할 양을 입력하세요. (남은: " + (d.point || 0) + "P)", "수치 입력"));
            }
        }
        if (session.screen === "STAT_UP_INPUT") {
            var amt = parseInt(msg);
            if (isNaN(amt) || amt <= 0) return replier.reply(UI.make("오류", "1 이상의 수치를 입력하세요."));
            if (amt > (d.point || 0)) return replier.reply(UI.make("실패", "포인트가 부족합니다."));
            d.stats[session.selectedStat] += amt; d.point -= amt; Database.save(Database.data);
            replier.reply(UI.make("강화 성공", session.selectedStatName + " +" + amt, "성공", true));
            session.history = [{ screen: "USER_MAIN", title: "메인 메뉴", content: "1. 프로필\n2. 컬렉션\n3. 대전\n4. 상점\n5. 문의하기\n6. 로그아웃", help: "번호 입력" }];
            return replier.reply(UI.go(session, "PROFILE_VIEW", session.tempId, "", "조회", true));
        }

        if (session.screen === "SHOP_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "SHOP_ROLES", "챔피언 상점", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), "역할군 선택"));
            if (msg === "2") return replier.reply(UI.go(session, "SHOP_ITEM_LIST", "아이템 상점", "1. 능력치 초기화권 (10,000G)", "구매 번호"));
        }
        if (session.screen === "SHOP_ITEM_LIST" && msg === "1") {
            if (d.gold < 10000) return replier.reply(UI.make("실패", "골드가 부족합니다. (10,000G 필요)"));
            d.gold -= 10000; d.inventory["RESET_TICKET"] = (d.inventory["RESET_TICKET"] || 0) + 1; Database.save(Database.data);
            return replier.reply(UI.make("구매 완료", "아이템을 구매했습니다.\n잔액: " + d.gold + "G", "대기", true));
        }
        if (session.screen === "SHOP_ROLES") {
            var rI = parseInt(msg) - 1;
            if (RoleKeys[rI]) {
                session.selectedRole = RoleKeys[rI];
                var uL = SystemData.roles[session.selectedRole].units.map(function(u, i){
                    var has = d.collection.characters.indexOf(u) !== -1;
                    return (i+1)+". "+u+(has?" [보유]":" (500G)");
                }).join("\n");
                return replier.reply(UI.go(session, "SHOP_BUY_ACTION", session.selectedRole, uL, "구매 번호 입력"));
            }
        }
        if (session.screen === "SHOP_BUY_ACTION") {
            var uI = parseInt(msg) - 1; var us = SystemData.roles[session.selectedRole].units;
            if (us[uI]) {
                if (d.collection.characters.indexOf(us[uI]) !== -1) return replier.reply(UI.make("알림", "이미 보유 중입니다."));
                if (d.gold < 500) return replier.reply(UI.make("실패", "골드가 부족합니다. (500G 필요)"));
                d.gold -= 500; d.collection.characters.push(us[uI]); Database.save(Database.data);
                SessionManager.reset(session); return replier.reply(UI.make("구매 성공", "[" + us[uI] + "] 영입 완료!", "메뉴 복귀", true));
            }
        }
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
                return replier.reply(UI.go(session, "GROUP_RANKING", "티어 랭킹 TOP 10", txt, "실시간 집계"));
            }
        }
    }
};

// ━━━━━━━━ [9. 메인 핸들러] ━━━━━━━━
Database.data = Database.load();
SessionManager.load();

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    var hash = String(imageDB.getProfileHash()); 
    var session = SessionManager.get(room, hash, isGroupChat); 
    
    try {
        if (!msg || msg.indexOf(".업데이트") !== -1) return;
        msg = msg.trim(); 

        if (session.screen === "CANCEL_CONFIRM") return handleCancelConfirm(msg, session, replier);

        if (msg === "메뉴") {
            if (session.screen === "IDLE") return replier.reply(UI.renderMenu(session));
            return showCancelConfirm(session, replier);
        }

        if (session.screen && session.screen.indexOf("BATTLE_DRAFT") !== -1) {
            return MatchingManager.handleDraft(msg, session, replier);
        } else {
            return handleGeneralMenu(msg, session, sender, replier);
        }

    } catch (e) {
        reportError(e, msg, session, sender, replier);
    }
}

function handleGeneralMenu(msg, session, sender, replier) {
    if (msg === "취소" || msg === "이전") {
        if (session.history && session.history.length > 0) {
            var prev = session.history.pop();
            session.screen = prev.screen;
            if (session.screen.indexOf("PROFILE") !== -1 || session.screen.indexOf("STAT") !== -1) {
                return replier.reply(UI.go(session, session.screen, prev.title, prev.content, prev.help, true));
            }
            return replier.reply(UI.make(prev.title, prev.content, prev.help, false));
        }
        return replier.reply(UI.renderMenu(session));
    }

    if (session.screen === "IDLE" || session.screen === "BATTLE_LOADING") return;

    if (session.type === "ADMIN") AdminManager.handle(msg, session, replier);
    else if (session.type === "GROUP") GroupManager.handle(msg, session, replier);
    else UserManager.handle(msg, session, replier);
    
    SessionManager.save();
}

function showCancelConfirm(session, replier) {
    session.preCancelScreen = session.screen;
    session.preCancelTitle = session.lastTitle;
    session.preCancelContent = session.lastContent;
    session.preCancelHelp = session.lastHelp;
    var isBattle = session.screen.indexOf("BATTLE") !== -1;
    return replier.reply(UI.go(session, "CANCEL_CONFIRM", isBattle ? "⚠️ 탈주 확인" : "중단 확인", isBattle ? "전장을 이탈하시겠습니까?\n매칭이 취소됩니다." : "현재 작업을 중단하시겠습니까?", "'예'/'아니오' 입력", true));
}

function handleCancelConfirm(msg, session, replier) {
    if (msg === "예" || msg === "확인") { SessionManager.reset(session); return replier.reply(UI.renderMenu(session)); }
    else if (msg === "아니오") {
        session.screen = session.preCancelScreen;
        if (session.screen.indexOf("BATTLE_DRAFT") !== -1) return replier.reply(MatchingManager.renderDraftUI(session, session.preCancelContent, session.preCancelHelp));
        return replier.reply(UI.make(session.preCancelTitle, session.preCancelContent, session.preCancelHelp, false));
    }
}

function reportError(e, msg, session, sender, replier) {
    replier.reply(UI.make("알림", "처리 중 오류 발생.\n메뉴로 복귀합니다.", "Error: " + e.message, true));
    SessionManager.reset(session);
}
