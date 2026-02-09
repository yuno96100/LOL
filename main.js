/**
 * [main.js] v14.3.0
 * 1. 기존 복구: 비회원 문의, 계정 삭제, 데이터 초기화, 취소 확인 절차 등 v10 무생략
 * 2. 신규 시스템: 
 * - 스탯 강화: 포인트 소모하여 4종 능력치 강화
 * - 스탯 초기화: 상점에서 초기화권 구매 후 사용 시 투자 포인트 전액 환급
 * - 소모품 상점: 캐릭터 외 소모성 아이템 판매 카테고리 추가
 * 3. 단체방 확장: 티어 랭킹(LP TOP 10) 기능 유지
 */

// ━━━━━━━━ [1. 설정 및 상수] ━━━━━━━━
var Config = {
    Prefix: ".", AdminHash: "2056407147",
    AdminRoom: "소환사의협곡관리", GroupRoom: "소환사의협곡",
    BotName: "소환사의 협곡", DB_PATH: "/sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "/sdcard/msgbot/Bots/main/sessions.json",
    LINE_CHAR: "━", WRAP_LIMIT: 17, DIVIDER_LINE: 14,
    NAV_LEFT: "  ", NAV_RIGHT: " ", NAV_ITEMS: ["⬅️이전", "❌취소", "🏠메뉴"]
};

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

var TierData = [
    { name: "챌린저", icon: "✨", minLp: 3000 }, { name: "그랜드마스터", icon: "🔴", minLp: 2500 },
    { name: "마스터", icon: "🟣", minLp: 2000 }, { name: "다이아몬드", icon: "💎", minLp: 1700 },
    { name: "에메랄드", icon: "💚", minLp: 1400 }, { name: "플래티넘", icon: "💿", minLp: 1100 },
    { name: "골드", icon: "🟡", minLp: 800 }, { name: "실버", icon: "⚪", minLp: 500 },
    { name: "브론즈", icon: "🟤", minLp: 200 }, { name: "아이언", icon: "⚫", minLp: 0 }
];

var SystemData = {
    roles: {
        "탱커": { icon: "🛡️", units: ["알리스타", "말파이트", "레오나"] },
        "전사": { icon: "⚔️", units: ["가렌", "다리우스", "잭스"] },
        "암살자": { icon: "🗡️", units: ["제드", "카타리나", "탈론"] },
        "마법사": { icon: "🔮", units: ["럭스", "아리", "빅토르"] },
        "원거리딜러": { icon: "🏹", units: ["애쉬", "베인", "카이사"] },
        "서포터": { icon: "✨", units: ["소라카", "유미", "쓰레쉬"] }
    },
    items: {
        "소모품": [
            { id: "RESET_TICKET", name: "능력치 초기화권", price: 10000, desc: "투자한 모든 포인트를 되돌려받습니다." }
        ]
    }
};

var RoleKeys = Object.keys(SystemData.roles);

function getTierInfo(lp) {
    lp = lp || 0;
    for (var i = 0; i < TierData.length; i++) {
        if (lp >= TierData[i].minLp) return { name: TierData[i].name, icon: TierData[i].icon };
    }
    return { name: "아이언", icon: "⚫" };
}

// ━━━━━━━━ [2. 모듈: UI 엔진] ━━━━━━━━
var UI = {
    make: function(title, content, help, isRoot) {
        var div = Utils.getFixedDivider();
        var res = "『 " + title + " 』\n" + div + "\n" + Utils.wrapText(content) + "\n" + div + "\n";
        if (help) res += "💡 " + Utils.wrapText(help);
        if (!isRoot) res += "\n" + div + "\n" + Utils.getNav();
        return res;
    },
    renderProfile: function(id, data, help, content, isRoot, session) {
        var lp = data.lp || 0, tier = getTierInfo(lp);
        var win = data.win || 0, lose = data.lose || 0, total = win + lose;
        var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
        var st = data.stats || { acc: 50, ref: 50, com: 50, int: 50 };
        var div = Utils.getFixedDivider();
        
        var s1 = "👤 계정: " + id + "\n🏅 칭호: [" + data.title + "]";
        var s2 = "🏆 티어: " + tier.icon + " " + tier.name + " (" + lp + " LP)\n💰 골드: " + (data.gold || 0).toLocaleString() + " G\n⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)";
        var s3 = "🎯 정확: " + st.acc + " | ⚡ 반응: " + st.ref + "\n🧘 침착: " + st.com + " | 🧠 직관: " + st.int + "\n✨ 포인트: " + (data.point || 0) + " P";
        
        var res = "『 " + id + " 』\n" + div + "\n" + s1 + "\n" + div + "\n" + s2 + "\n" + div + "\n" + s3 + "\n" + div + "\n";
        
        // 본인 프로필일 때만 스탯 메뉴 노출
        if (session && id === session.tempId) {
            res += "1. 능력치 강화\n2. 능력치 초기화\n" + div + "\n";
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
        if (screen.indexOf("PROFILE") !== -1 || screen.indexOf("DETAIL") !== -1) {
            var tid = session.targetUser || session.tempId;
            var td = (session.targetUser) ? Database.data[session.targetUser] : session.data;
            return UI.renderProfile(tid, td, help, content, isRoot, session);
        }
        return this.make(title, content, help, isRoot);
    },
    renderMenu: function(session) {
        session.history = []; 
        if (session.type === "ADMIN") return this.go(session, "ADMIN_MAIN", "관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "번호를 입력하세요.");
        if (session.type === "GROUP") {
            if (!session.data) { session.screen = "IDLE"; return UI.make("알림", "'시스템' 개인톡에서 로그인을 해주세요.", "보안이 필요합니다.", true); }
            return this.go(session, "GROUP_MAIN", "단톡방 메뉴", "1. 내 정보 확인\n2. 티어 랭킹", "번호를 입력하세요.");
        }
        if (!session.data) return this.go(session, "GUEST_MAIN", "환영합니다", "1. 회원가입\n2. 로그인\n3. 문의하기", "번호를 선택하세요.");
        return this.go(session, "USER_MAIN", "메인 메뉴", "1. 프로필\n2. 컬렉션\n3. 대전\n4. 상점\n5. 문의하기\n6. 로그아웃", "작업 번호를 입력하세요.");
    }
};

// ━━━━━━━━ [3. DB 및 세션 매니저] ━━━━━━━━
var Database = {
    data: {},
    load: function() { try { return JSON.parse(FileStream.read(Config.DB_PATH)); } catch(e) { return {}; } },
    save: function(d) { this.data = d; FileStream.write(Config.DB_PATH, JSON.stringify(d, null, 4)); },
    getInitData: function(pw) { 
        return { 
            pw: pw, gold: 1000, level: 1, lp: 0, win: 0, lose: 0, title: "뉴비", 
            point: 0, stats: { acc: 50, ref: 50, com: 50, int: 50 },
            inventory: { "RESET_TICKET": 0 },
            collection: { titles: ["뉴비"], characters: [] } 
        }; 
    }
};

var SessionManager = {
    sessions: {},
    load: function() { try { this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH)); } catch(e) { this.sessions = {}; } },
    save: function() { FileStream.write(Config.SESSION_PATH, JSON.stringify(this.sessions)); },
    get: function(r, h, g) {
        if (!this.sessions[h]) this.sessions[h] = { data: null, screen: "IDLE", history: [], lastTitle: "메뉴", lastContent: "", lastHelp: "", tempId: "비회원", userListCache: [], targetUser: null, editType: null, room: r, isDirect: !g };
        var s = this.sessions[h]; s.room = r;
        if (r === Config.AdminRoom) s.type = "ADMIN";
        else if (g && r === Config.GroupRoom) s.type = "GROUP";
        else { s.type = "DIRECT"; s.isDirect = true; }
        return s;
    },
    reset: function(session) { 
        session.screen = "IDLE"; session.history = []; session.userListCache = []; 
        session.targetUser = null; session.editType = null;
        session.lastContent = ""; session.lastHelp = "";
    },
    findUserDirectRoom: function(userId) {
        for (var key in this.sessions) { if (this.sessions[key].tempId === userId && this.sessions[key].isDirect) return this.sessions[key].room; }
        return userId;
    },
    forceLogout: function(userId) {
        for (var key in this.sessions) { if (this.sessions[key].tempId === userId) { this.sessions[key].data = null; this.sessions[key].tempId = "비회원"; this.reset(this.sessions[key]); } }
        this.save();
    }
};

// ━━━━━━━━ [4. 매니저: 관리자 시스템] ━━━━━━━━
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
                return replier.reply(UI.go(session, "ADMIN_USER_DETAIL", session.targetUser, "1. 정보 수정\n2. 답변 하기\n3. 데이터 초기화\n4. 계정 삭제", "기능 선택"));
            }
        }
        if (screen === "ADMIN_USER_DETAIL") {
            if (msg === "1") return replier.reply(UI.go(session, "ADMIN_EDIT_MENU", "정보 수정", "1. 골드 수정\n2. LP 수정\n3. 포인트 지급", "항목 선택"));
            if (msg === "2") return replier.reply(UI.go(session, "ADMIN_ANSWER_INPUT", "답변 하기", "["+session.targetUser+"] 답변 입력", "내용 입력"));
            if (msg === "3") return replier.reply(UI.go(session, "ADMIN_RESET_CONFIRM", "초기화", "[" + session.targetUser + "] 리셋?", "'확인' 입력"));
            if (msg === "4") return replier.reply(UI.go(session, "ADMIN_DELETE_CONFIRM", "계정 삭제", "[" + session.targetUser + "] 삭제?", "'삭제확인' 입력"));
        }
        if (screen === "ADMIN_ANSWER_INPUT") {
            var uDirectRoom = SessionManager.findUserDirectRoom(session.targetUser);
            Api.replyRoom(uDirectRoom, UI.make("운영진 답변", "문의 답변입니다.\n\n" + msg, "알림", true));
            SessionManager.reset(session); return replier.reply(UI.make("성공", "답변 전송됨", "대기 전환", true));
        }
        if (screen === "ADMIN_EDIT_MENU") {
            if (msg === "1") { session.editType = "gold"; return replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "골드 수정", "수정값 입력", "숫자")); }
            if (msg === "2") { session.editType = "lp"; return replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "LP 수정", "수정값 입력", "숫자")); }
            if (msg === "3") { session.editType = "point"; return replier.reply(UI.go(session, "ADMIN_EDIT_INPUT", "포인트 지급", "지급량 입력", "숫자")); }
        }
        if (screen === "ADMIN_EDIT_INPUT") {
            var val = parseInt(msg);
            if (isNaN(val)) return replier.reply(UI.make("오류", "숫자만"));
            Database.data[session.targetUser][session.editType] = val; Database.save(Database.data);
            SessionManager.reset(session); return replier.reply(UI.make("성공", "수정 완료", "대기 전환", true));
        }
        if (screen === "ADMIN_RESET_CONFIRM" && msg === "확인") {
            Database.data[session.targetUser] = Database.getInitData(Database.data[session.targetUser].pw); Database.save(Database.data);
            SessionManager.reset(session); return replier.reply(UI.make("성공", "초기화 완료", "대기 전환", true));
        }
        if (screen === "ADMIN_DELETE_CONFIRM" && msg === "삭제확인") {
            delete Database.data[session.targetUser]; Database.save(Database.data);
            SessionManager.forceLogout(session.targetUser); SessionManager.reset(session);
            return replier.reply(UI.make("성공", "삭제 완료", "대기 전환", true));
        }
    }
};

// ━━━━━━━━ [5. 매니저: 개인톡(User) 시스템] ━━━━━━━━
var UserManager = {
    handle: function(msg, session, replier) {
        var d = session.data;
        if (!d) {
            if (session.screen === "GUEST_MAIN") {
                if (msg === "1") return replier.reply(UI.go(session, "JOIN_ID", "회원가입", "아이디 입력(10자)", "가입"));
                if (msg === "2") return replier.reply(UI.go(session, "LOGIN_ID", "인증", "아이디 입력", "로그인"));
                if (msg === "3") return replier.reply(UI.go(session, "GUEST_INQUIRY", "비회원 문의", "내용 입력", "전송"));
            }
            if (session.screen === "GUEST_INQUIRY") {
                Api.replyRoom(Config.AdminRoom, UI.make("비회원 문의", "내용: " + msg, "회신불가", true));
                SessionManager.reset(session); return replier.reply(UI.make("완료", "문의 전송됨", "대기 전환", true));
            }
            if (session.screen === "JOIN_ID") {
                if (msg.length > 10 || Database.data[msg]) return replier.reply(UI.make("오류", "제한 초과 또는 중복"));
                session.tempId = msg; return replier.reply(UI.go(session, "JOIN_PW", "회원가입", "비번 설정", "보안"));
            }
            if (session.screen === "JOIN_PW") {
                Database.data[session.tempId] = Database.getInitData(msg); Database.save(Database.data);
                session.data = Database.data[session.tempId]; SessionManager.reset(session);
                return replier.reply(UI.make("성공", "가입 성공!", "대기 전환", true));
            }
            if (session.screen === "LOGIN_ID") { session.tempId = msg; return replier.reply(UI.go(session, "LOGIN_PW", "인증", "비번 입력", "인증")); }
            if (session.screen === "LOGIN_PW") {
                if (Database.data[session.tempId] && Database.data[session.tempId].pw === msg) {
                    session.data = Database.data[session.tempId]; SessionManager.reset(session);
                    return replier.reply(UI.make("성공", "로그인 성공!", "대기 전환", true));
                }
                return replier.reply(UI.make("실패", "비번 오류"));
            }
            return;
        }

        if (session.screen === "USER_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "PROFILE_VIEW", session.tempId, "", "내 정보 조회"));
            if (msg === "2") return replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1. 보유 칭호\n2. 보유 캐릭터", "조회"));
            if (msg === "3") return replier.reply(UI.go(session, "BATTLE_MAIN", "대전", "1. AI 봇 매칭", "전투"));
            if (msg === "4") return replier.reply(UI.go(session, "SHOP_MAIN", "상점", "1. 캐릭터 상점\n2. 소모품 상점", "카테고리 선택"));
            if (msg === "5") return replier.reply(UI.go(session, "USER_INQUIRY", "문의하기", "내용 입력", "입력"));
            if (msg === "6") { SessionManager.forceLogout(session.tempId); return replier.reply(UI.make("알림", "로그아웃", "종료", true)); }
        }

        // --- 스탯 시스템 ---
        if (session.screen === "PROFILE_VIEW") {
            if (msg === "1") {
                if ((d.point || 0) <= 0) return replier.reply(UI.make("알림", "포인트 부족"));
                var sList = "1. 정확 ("+d.stats.acc+")\n2. 반응 ("+d.stats.ref+")\n3. 침착 ("+d.stats.com+")\n4. 직관 ("+d.stats.int+")";
                return replier.reply(UI.go(session, "STAT_UP_MENU", "능력치 강화", sList, "번호 입력"));
            }
            if (msg === "2") {
                var tCount = d.inventory["RESET_TICKET"] || 0;
                return replier.reply(UI.go(session, "STAT_RESET_CONFIRM", "능력치 초기화", "모든 스탯을 50으로 초기화?\n보유권: "+tCount+"개", "'사용' 입력"));
            }
        }
        if (session.screen === "STAT_UP_MENU") {
            var keys = ["acc", "ref", "com", "int"]; var idx = parseInt(msg)-1;
            if (keys[idx]) {
                if (d.point <= 0) return replier.reply(UI.make("실패", "포인트 부족"));
                d.stats[keys[idx]]++; d.point--; Database.save(Database.data);
                return replier.reply(UI.go(session, "STAT_UP_MENU", "성공", keys[idx]+" +1!", "계속 번호 입력", true));
            }
        }
        if (session.screen === "STAT_RESET_CONFIRM" && msg === "사용") {
            if ((d.inventory["RESET_TICKET"]||0) < 1) return replier.reply(UI.make("실패", "초기화권 없음"));
            var refund = (d.stats.acc + d.stats.ref + d.stats.com + d.stats.int) - 200;
            d.point += refund; d.stats = { acc: 50, ref: 50, com: 50, int: 50 };
            d.inventory["RESET_TICKET"]--; Database.save(Database.data); SessionManager.reset(session);
            return replier.reply(UI.make("성공", "초기화 완료\n환급: "+refund+"P", "대기 전환", true));
        }

        // --- 상점 (소모품 추가) ---
        if (session.screen === "SHOP_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "SHOP_ROLES", "캐릭터 상점", RoleKeys.map(function(r, i){ return (i+1)+". "+r; }).join("\n"), "역할 선택"));
            if (msg === "2") {
                var item = SystemData.items["소모품"][0];
                return replier.reply(UI.go(session, "SHOP_ITEM_BUY", "소모품 상점", "1. "+item.name+" ("+item.price+"G)\n- "+item.desc, "구매 번호"));
            }
        }
        if (session.screen === "SHOP_ITEM_BUY" && msg === "1") {
            var item = SystemData.items["소모품"][0];
            if (d.gold < item.price) return replier.reply(UI.make("실패", "골드 부족"));
            d.gold -= item.price; d.inventory[item.id] = (d.inventory[item.id]||0)+1; Database.save(Database.data);
            return replier.reply(UI.make("성공", item.name+" 구매 완료", "잔액: "+d.gold+"G"));
        }
        if (session.screen === "SHOP_ROLES") {
            var rIdx = parseInt(msg)-1;
            if (RoleKeys[rIdx]) {
                session.selectedRole = RoleKeys[rIdx];
                var uList = SystemData.roles[session.selectedRole].units.map(function(u, i){
                    var owned = d.collection.characters.indexOf(u) !== -1;
                    return (i+1)+". "+u+(owned?" [보유]":" (500G)");
                }).join("\n");
                return replier.reply(UI.go(session, "SHOP_BUY_ACTION", session.selectedRole, uList, "구매 번호"));
            }
        }
        if (session.screen === "SHOP_BUY_ACTION") {
            var uIdx = parseInt(msg)-1; var units = SystemData.roles[session.selectedRole].units;
            if (units[uIdx]) {
                if (d.collection.characters.indexOf(units[uIdx]) !== -1) return replier.reply(UI.make("알림", "보유 중"));
                if (d.gold < 500) return replier.reply(UI.make("실패", "골드 부족"));
                d.gold -= 500; d.collection.characters.push(units[uIdx]); Database.save(Database.data);
                return replier.reply(UI.make("성공", units[uIdx]+" 구매 완료", "잔액: "+d.gold+"G"));
            }
        }

        if (session.screen === "USER_INQUIRY") {
            Api.replyRoom(Config.AdminRoom, UI.make("유저 문의", "ID: "+session.tempId+"\n내용: "+msg, "대기", true));
            SessionManager.reset(session); return replier.reply(UI.make("성공", "문의 전달됨", "대기 전환", true));
        }
    }
};

// ━━━━━━━━ [6. 매니저: 단체방 시스템] ━━━━━━━━
var GroupManager = {
    handle: function(msg, session, replier) {
        if (session.screen === "GROUP_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "GROUP_PROFILE", session.tempId, "", "전적 확인"));
            if (msg === "2") {
                var users = Object.keys(Database.data);
                if (users.length === 0) return replier.reply(UI.make("알림", "유저 없음"));
                var ranking = users.map(function(id){ return { id: id, lp: Database.data[id].lp || 0 }; }).sort(function(a,b){ return b.lp-a.lp; });
                var txt = "", cnt = Math.min(ranking.length, 10);
                for (var i=0; i<cnt; i++) {
                    var u = ranking[i], t = getTierInfo(u.lp), m = (i===0)?"🥇":(i===1)?"🥈":(i===2)?"🥉":(i+1)+".";
                    txt += m+" "+u.id+"\n   └ "+t.icon+" "+u.lp+" LP\n";
                }
                return replier.reply(UI.go(session, "GROUP_RANKING", "티어 랭킹 (TOP 10)", txt, "조회 완료"));
            }
        }
    }
};

// ━━━━━━━━ [7. 메인 응답 핸들러] ━━━━━━━━
Database.data = Database.load(); SessionManager.load();         

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    try {
        if (!msg || msg.indexOf(".업데이트") !== -1) return;
        var hash = String(imageDB.getProfileHash()); 
        var session = SessionManager.get(room, hash, isGroupChat); 
        msg = msg.trim(); 
        
        if (msg === "메뉴") return replier.reply(UI.renderMenu(session)); 

        if (msg === "취소") {
            if (session.screen === "IDLE") return replier.reply(UI.make("알림", "작업 없음", "대기 중", true));
            session.preCancelScreen = session.screen; session.preCancelTitle = session.lastTitle;
            session.preCancelContent = session.lastContent; session.preCancelHelp = session.lastHelp;
            return replier.reply(UI.go(session, "CANCEL_CONFIRM", "취소 확인", "작업을 취소?", "'예' 또는 '아니오'", true));
        }

        if (session.screen === "CANCEL_CONFIRM") {
            if (msg === "예" || msg === "1") { SessionManager.reset(session); return replier.reply(UI.make("알림", "취소됨", "메뉴 입력", true)); }
            else if (msg === "아니오" || msg === "2") {
                var s = session.preCancelScreen, t = session.preCancelTitle, c = session.preCancelContent, h = session.preCancelHelp;
                session.screen = s; session.lastTitle = t; session.lastContent = c; session.lastHelp = h;
                var isRoot = (["USER_MAIN","ADMIN_MAIN","GUEST_MAIN","GROUP_MAIN"].indexOf(s) !== -1);
                if (s.indexOf("PROFILE") !== -1) return replier.reply(UI.renderProfile(session.tempId, session.data, h, c, isRoot, session));
                return replier.reply(UI.make(t, c, h, isRoot));
            }
        }

        if (msg === "이전" && session.history && session.history.length > 0) {
            var p = session.history.pop();
            session.screen = p.screen; session.lastTitle = p.title; session.lastContent = p.content; session.lastHelp = p.help;
            var isRoot = (["USER_MAIN","ADMIN_MAIN","GUEST_MAIN","GROUP_MAIN"].indexOf(p.screen) !== -1);
            if (p.screen.indexOf("PROFILE") !== -1) return replier.reply(UI.renderProfile(session.tempId, (session.targetUser?Database.data[session.targetUser]:session.data), p.help, p.content, isRoot, session));
            return replier.reply(UI.make(p.title, p.content, p.help, isRoot));
        }

        if (session.screen === "IDLE") return;
        if (session.type === "ADMIN" && hash === Config.AdminHash) return AdminManager.handle(msg, session, replier);
        if (session.type === "GROUP") GroupManager.handle(msg, session, replier);
        else UserManager.handle(msg, session, replier);
        SessionManager.save();
    } catch (e) { Api.replyRoom(Config.AdminRoom, "오류: " + e.message); }
}
