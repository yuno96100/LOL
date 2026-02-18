/*
 * 🏰 소환사의 협곡 Bot - FINAL VERSION (v1.2.2)
 * - 오류 수정: 'Unterminated string literal' 원천 차단 (긴 텍스트 배열화)
 * - 기능 포함: 로그인/가입, 상점(아이템/챔피언), 강화, 컬렉션, 관리자, 자동복귀
 * - UI: 모든 화면 프레임 통일 및 하단 도움말 적용
 */

// ━━━━━━━━ [1. 설정 및 인프라] ━━━━━━━━
var Config = {
    Version: "v1.2.2 FinalFix",
    AdminRoom: "소환사의협곡관리", 
    BotName: "소환사의 협곡",
    DB_PATH: "sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "sdcard/msgbot/Bots/main/sessions.json",
    LINE_CHAR: "━",
    FIXED_LINE: 14,
    WRAP_LIMIT: 20, 
    TIMEOUT_MS: 300000 // 5분
};

var MAX_LEVEL = 30;

var Utils = {
    getFixedDivider: function() { 
        return Array(Config.FIXED_LINE + 1).join(Config.LINE_CHAR); 
    },
    
    wrapText: function(str) {
        if (!str) return "";
        var lines = str.split("\n"), result = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.length <= Config.WRAP_LIMIT) { 
                result.push(line);
            } else { 
                var currentLine = "";
                for (var j = 0; j < line.length; j++) {
                    currentLine += line[j];
                    if (currentLine.length >= Config.WRAP_LIMIT) {
                        result.push(currentLine);
                        currentLine = "";
                    }
                }
                if (currentLine) result.push(currentLine);
            }
        }
        return result.join("\n");
    },

    getTierInfo: function(lp) {
        if (lp >= 3000) return { name: "챌린저", icon: "💎" };
        if (lp >= 2500) return { name: "그랜드마스터", icon: "👑" };
        if (lp >= 2000) return { name: "마스터", icon: "🔮" };
        if (lp >= 1700) return { name: "다이아몬드", icon: "💠" };
        if (lp >= 1400) return { name: "에메럴드", icon: "💚" };
        if (lp >= 1100) return { name: "플래티넘", icon: "💿" };
        if (lp >= 800) return { name: "골드", icon: "🥇" };
        if (lp >= 500) return { name: "실버", icon: "🥈" };
        if (lp >= 200) return { name: "브론즈", icon: "🥉" };
        return { name: "아이언", icon: "⚫" };
    }
};

// ━━━━━━━━ [2. 데이터베이스] ━━━━━━━━
var Database = {
    data: {},
    inquiries: [],
    
    load: function() {
        var content = FileStream.read(Config.DB_PATH);
        if (content) {
            try {
                var d = JSON.parse(content);
                this.data = d.users || {};
                this.inquiries = d.inquiries || [];
            } catch (e) {
                this.data = {}; this.inquiries = [];
            }
        } else {
            this.data = {}; this.inquiries = [];
        }
    },
    
    save: function() {
        var saveData = { users: this.data, inquiries: this.inquiries };
        FileStream.write(Config.DB_PATH, JSON.stringify(saveData, null, 4));
    },

    createUser: function(sender, pw) {
        this.data[sender] = {
            pw: pw, 
            name: sender,
            title: "뉴비",
            lp: 0, win: 0, lose: 0,
            level: 1, exp: 0,
            gold: 1000, point: 0,
            stats: { acc: 50, ref: 50, com: 50, int: 50 }, 
            inventory: { titles: ["뉴비"], champions: [] },
            banned: false
        };
        this.save();
    }
};

var SessionManager = {
    sessions: {},
    get: function(sender) {
        if (!this.sessions[sender]) {
            this.sessions[sender] = { screen: "IDLE", temp: {}, lastTime: Date.now() };
        }
        var s = this.sessions[sender];
        
        var now = Date.now();
        if (s.screen !== "IDLE" && (now - s.lastTime > Config.TIMEOUT_MS)) {
            this.reset(sender);
            return { screen: "TIMEOUT", temp: {} }; 
        }
        s.lastTime = now;
        return s;
    },
    reset: function(sender) {
        if (!this.sessions[sender]) {
            this.sessions[sender] = { screen: "IDLE", temp: {}, lastTime: Date.now() };
        } else {
            var s = this.sessions[sender];
            s.screen = "IDLE";
            s.temp = {};
            s.lastTime = Date.now();
        }
    }
};

// ━━━━━━━━ [3. 콘텐츠 매니저 (배열 방식 적용)] ━━━━━━━━
var ContentManager = {
    menus: {
        guest: ["1. 회원가입", "2. 로그인", "3. 운영진 문의"],
        main: [
            "1. 프로필 조회", 
            "2. 컬렉션 확인", 
            "3. 대전 모드", 
            "4. 상점 이용", 
            "5. 운영진 문의", 
            "6. 로그아웃"
        ],
        stats: ["1. 정확", "2. 반응", "3. 침착", "4. 직관"],
        shopMain: ["1. 아이템 상점", "2. 챔피언 상점"],
        shopItems: ["1. 닉네임 변경권 (500G)", "2. 스탯 초기화권 (1500G)"],
        adminMain: ["1. 시스템 정보", "2. 전체 유저", "3. 문의 관리"],
        adminUser: ["1. 정보 수정", "2. 데이터 초기화", "3. 계정 삭제", "4. 차단/해제"],
        adminEdit: ["1. 골드 수정", "2. LP 수정", "3. 레벨 수정"]
    },
    msg: {
        welcome: [
            "소환사의 협곡에 오신 것을 환영합니다.", 
            "원하시는 기능을 선택해 주세요."
        ].join("\n"),
        
        inputID_Join: "사용하실 아이디를 입력해 주세요. (최대 10자)",
        inputID_Login: "로그인할 아이디를 입력해 주세요.",
        inputPW: "비밀번호를 입력해 주세요.",
        
        registerComplete: [
            "가입이 완료되었습니다!", 
            "자동으로 로그인됩니다."
        ].join("\n"),
        
        loginFail: "정보가 일치하지 않습니다.",
        notEnoughGold: "골드가 부족합니다.",
        onlyNumber: "숫자만 입력해 주세요.",
        banned: "🚫 관리자에 의해 이용이 제한된 계정입니다.",
        battlePrep: "⚔️ 대전 모드는 현재 준비 중입니다.",
        adminSelectUser: "관리할 유저의 번호를 입력하세요."
    },
    // 긴 목록은 줄바꿈 에러 방지를 위해 여러 줄로 작성
    champions: [
        "알리스타", "말파이트", "레오나", "가렌", "다리우스", 
        "잭스", "제드", "카타리나", "탈론", "럭스", 
        "아리", "빅토르", "애쉬", "베인", "카이사", 
        "소라카", "유미", "쓰레쉬"
    ]
};

// ━━━━━━━━ [4. 레이아웃 매니저] ━━━━━━━━
var LayoutManager = {
    renderFrame: function(title, content, showNav, footer) {
        var div = Utils.getFixedDivider();
        var res = "『 " + title + " 』\n" + div + "\n" + Utils.wrapText(content);

        if (showNav === true) {
            res += "\n" + div + "\n[ ◀이전 | ✖취소 | 🏠메뉴 ]";
        } else if (Array.isArray(showNav)) {
            res += "\n" + div + "\n[ " + showNav.join(" | ") + " ]";
        }

        if (footer) {
            res += "\n" + div + "\n💡 " + footer;
        }

        return res;
    },

    renderAlert: function(title, content) {
        return this.renderFrame(title, content, false, "잠시만 기다려주세요...");
    },

    renderProfileHead: function(data, targetName) {
        var div = Utils.getFixedDivider();
        var tier = Utils.getTierInfo(data.lp);
        var win = data.win || 0, lose = data.lose || 0, total = win + lose;
        var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
        var st = data.stats;
        var expDisplay = (data.level >= MAX_LEVEL) ? "MAX" : data.exp + "/" + (data.level * 100);
        var banStatus = data.banned ? " [🚫차단]" : "";

        var lines = [];
        lines.push("👤 대상: " + targetName + banStatus);
        lines.push("🏅 칭호: [" + data.title + "]");
        lines.push(div);
        lines.push("🏅 티어: " + tier.icon + tier.name + " (" + data.lp + ")");
        lines.push("💰 골드: " + (data.gold || 0).toLocaleString() + " G");
        lines.push("⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)");
        lines.push("🆙 레벨: Lv." + data.level);
        lines.push("🔷 경험: (" + expDisplay + ")");
        lines.push(div);
        lines.push(" [ 상세 능력치 ]");
        lines.push("🎯 정확: " + st.acc);
        lines.push("⚡ 반응: " + st.ref);
        lines.push("🧘 침착: " + st.com);
        lines.push("🧠 직관: " + st.int);
        lines.push(div);
        lines.push("✨ 포인트: " + (data.point || 0) + " P");
        
        return lines.join("\n");
    },

    templates: {
        menuList: function(subtitle, items) {
            if (!subtitle) return " " + items.join("\n ");
            return " [ " + subtitle + " ]\n " + items.join("\n "); 
        },
        inputRequest: function(subtitle, currentVal, info) {
            return " [ " + subtitle + " ]\n\n 현재 상태 : " + currentVal + "\n " + info + "\n\n 값을 입력하세요.";
        },
        result: function(subtitle, text) {
            return " [ " + subtitle + " ]\n\n " + text;
        },
        list: function(subtitle, listArray) {
            var content = (listArray && listArray.length > 0) ? listArray.join(", ") : "없음";
            return " [ " + subtitle + " ]\n\n " + content;
        }
    }
};

// ━━━━━━━━ [5. 시스템 액션 (자동 복귀)] ━━━━━━━━
var SystemAction = {
    go: function(replier, title, msg, nextFunc) {
        replier.reply(LayoutManager.renderAlert(title, msg));
        java.lang.Thread.sleep(1200); 
        if (nextFunc) nextFunc();
    }
};

// ━━━━━━━━ [6. 컨트롤러] ━━━━━━━━

// 6-1. 인증 컨트롤러
var AuthController = {
    handle: function(msg, session, sender, replier) {
        if (session.screen === "IDLE" || session.screen === "GUEST_MAIN") {
            session.screen = "GUEST_MAIN";
            if (msg === "1") { 
                session.screen = "JOIN_ID";
                return replier.reply(LayoutManager.renderFrame("회원가입", ContentManager.msg.inputID_Join, ["취소"], "아이디 입력"));
            }
            if (msg === "2") { 
                session.screen = "LOGIN_ID";
                return replier.reply(LayoutManager.renderFrame("로그인", ContentManager.msg.inputID_Login, ["취소"], "아이디 입력"));
            }
            if (msg === "3") { 
                session.screen = "GUEST_INQUIRY";
                return replier.reply(LayoutManager.renderFrame("문의 접수", "운영진에게 보낼 내용을 입력하세요.", ["취소"], "내용 입력"));
            }
            var body = LayoutManager.templates.menuList("환영합니다", ContentManager.menus.guest);
            return replier.reply(LayoutManager.renderFrame("게스트 모드", body, false, "번호를 선택하세요.")); 
        }

        if (session.screen === "JOIN_ID") {
            if (msg.length > 10) return SystemAction.go(replier, "오류", "아이디는 10자 이내여야 합니다."); 
            if (Database.data[msg]) return SystemAction.go(replier, "오류", "이미 존재하는 아이디입니다.");
            session.temp.id = msg;
            session.screen = "JOIN_PW";
            return replier.reply(LayoutManager.renderFrame("비밀번호 설정", ContentManager.msg.inputPW, ["취소"], "비밀번호 입력"));
        }
        if (session.screen === "JOIN_PW") {
            Database.createUser(session.temp.id, msg);
            Database.load(); 
            
            session.data = Database.data[session.temp.id]; 
            session.tempId = session.temp.id; 
            session.screen = "MAIN"; 
            
            return SystemAction.go(replier, "가입 완료", ContentManager.msg.registerComplete, function() {
                var body = LayoutManager.templates.menuList(null, ContentManager.menus.main);
                replier.reply(LayoutManager.renderFrame("메인 로비", body, false, "번호를 선택하세요."));
            });
        }

        if (session.screen === "LOGIN_ID") {
            if (!Database.data[msg]) return SystemAction.go(replier, "오류", "존재하지 않는 아이디입니다.");
            session.temp.id = msg;
            session.screen = "LOGIN_PW";
            return replier.reply(LayoutManager.renderFrame("로그인", ContentManager.msg.inputPW, ["취소"], "비밀번호 입력"));
        }
        if (session.screen === "LOGIN_PW") {
            var userData = Database.data[session.temp.id];
            if (userData && userData.pw === msg) {
                session.data = userData;
                session.tempId = session.temp.id;
                return SystemAction.go(replier, "로그인 성공", session.tempId + "님 환영합니다!", function() {
                    UserController.handle("메뉴", session, sender, replier);
                });
            } else {
                return SystemAction.go(replier, "실패", ContentManager.msg.loginFail);
            }
        }
        
        if (session.screen === "GUEST_INQUIRY") {
            Database.inquiries.push({ sender: "비회원", content: msg, time: new Date().toLocaleString(), read: false });
            Database.save();
            SessionManager.reset(sender);
            return SystemAction.go(replier, "접수 완료", "문의가 접수되었습니다.");
        }
    }
};

// 6-2. 유저 컨트롤러
var UserController = {
    handle: function(msg, session, sender, replier) {
        var data = session.data; 
        if (!data) return AuthController.handle(msg, session, sender, replier);
        if (data.banned) return replier.reply(LayoutManager.renderAlert("알림", ContentManager.msg.banned));

        if (session.screen === "MAIN" || msg === "메뉴") {
            if (msg === "메뉴" || session.screen !== "MAIN") {
                session.screen = "MAIN";
                var body = LayoutManager.templates.menuList(null, ContentManager.menus.main);
                return replier.reply(LayoutManager.renderFrame("메인 로비", body, false, "번호를 선택하세요."));
            }
            if (["1","2","3","4","5","6"].indexOf(msg) === -1) return;
        }

        // [1] 프로필 & 강화
        if (session.screen === "MAIN" && msg === "1") {
            session.screen = "STAT_SELECT";
            var head = LayoutManager.renderProfileHead(data, session.tempId);
            var body = LayoutManager.templates.menuList("강화할 능력치 선택", ContentManager.menus.stats);
            return replier.reply(LayoutManager.renderFrame("내 정보", head + "\n" + Utils.getFixedDivider() + "\n" + body, true, "강화할 번호 입력"));
        }
        if (session.screen === "STAT_SELECT") {
            var statMap = { "1": "acc", "2": "ref", "3": "com", "4": "int" };
            var nameMap = { "1": "정확", "2": "반응", "3": "침착", "4": "직관" };
            if (statMap[msg]) {
                session.temp.statKey = statMap[msg];
                session.temp.statName = nameMap[msg];
                session.screen = "STAT_INPUT";
                var body = LayoutManager.templates.inputRequest(session.temp.statName + " 강화", data.stats[session.temp.statKey], "보유 포인트: " + data.point + " P");
                return replier.reply(LayoutManager.renderFrame("강화 진행", body, true, "투자할 포인트 입력"));
            }
        }
        if (session.screen === "STAT_INPUT") {
            var amount = parseInt(msg);
            if (isNaN(amount) || amount <= 0) return SystemAction.go(replier, "오류", ContentManager.msg.onlyNumber);
            if (data.point < amount) return SystemAction.go(replier, "실패", "포인트가 부족합니다.");
            
            data.point -= amount;
            data.stats[session.temp.statKey] += amount;
            Database.save();

            var resultMsg = session.temp.statName + " 수치가 " + amount + " 상승했습니다.\n 현재 수치: " + data.stats[session.temp.statKey];
            session.screen = "STAT_SELECT"; 
            
            return SystemAction.go(replier, "강화 성공", resultMsg, function() {
                var head = LayoutManager.renderProfileHead(data, session.tempId);
                var body = LayoutManager.templates.menuList("강화할 능력치 선택", ContentManager.menus.stats);
                replier.reply(LayoutManager.renderFrame("내 정보", head + "\n" + Utils.getFixedDivider() + "\n" + body, true, "강화할 번호 입력"));
            });
        }

        // [2] 컬렉션
        if (session.screen === "MAIN" && msg === "2") {
            session.screen = "COLLECTION_MAIN";
            if (!data.inventory.champions) data.inventory.champions = [];
            var myChamps = data.inventory.champions.length;
            var stats = ["👑 현재 칭호: [" + data.title + "]", "📊 챔피언 수집: " + myChamps + "명"].join("\n");
            var body = LayoutManager.templates.menuList("컬렉션", ["1. 보유 칭호", "2. 보유 챔피언"]);
            return replier.reply(LayoutManager.renderFrame("컬렉션", stats + "\n\n" + body, true, "번호 선택"));
        }
        if (session.screen === "COLLECTION_MAIN") {
             if (msg === "1") {
                 session.screen = "TITLE_EQUIP";
                 var list = data.inventory.titles.map(function(t, i) { return (i+1) + ". " + t + (t === data.title ? " [장착중]" : ""); }).join("\n");
                 return replier.reply(LayoutManager.renderFrame("칭호 관리", LayoutManager.templates.list("보유 목록", [list]) + "\n\n장착할 칭호 이름을 정확히 입력하세요.", true, "칭호 입력"));
             }
             if (msg === "2") {
                 if (!data.inventory.champions) data.inventory.champions = [];
                 var list = (data.inventory.champions.length > 0) ? data.inventory.champions.join("\n") : "보유한 챔피언이 없습니다.";
                 return replier.reply(LayoutManager.renderFrame("챔피언 관리", LayoutManager.templates.list("보유 목록", [list]), true, "목록 확인"));
             }
        }
        if (session.screen === "TITLE_EQUIP") {
            if (data.inventory.titles.indexOf(msg) === -1) return SystemAction.go(replier, "오류", "보유하지 않은 칭호입니다.");
            data.title = msg; Database.save();
            return SystemAction.go(replier, "완료", "칭호가 변경되었습니다.", function() { UserController.handle("2", session, sender, replier); });
        }

        // [3] 대전 모드
        if (session.screen === "MAIN" && msg === "3") {
            return replier.reply(LayoutManager.renderFrame("대전 모드", ContentManager.msg.battlePrep, true, "준비 중입니다."));
        }

        // [4] 상점
        if (session.screen === "MAIN" && msg === "4") {
            session.screen = "SHOP_MAIN";
            var body = LayoutManager.templates.menuList("상점 카테고리", ContentManager.menus.shopMain);
            return replier.reply(LayoutManager.renderFrame("상점", body, true, "상점 선택"));
        }
        
        if (session.screen === "SHOP_MAIN") {
            if (msg === "1") { 
                session.screen = "SHOP_ITEMS";
                var body = LayoutManager.templates.menuList("판매 아이템", ContentManager.menus.shopItems);
                return replier.reply(LayoutManager.renderFrame("아이템 상점", body + "\n\n구매할 번호를 입력하세요.", true, "번호 선택"));
            }
            if (msg === "2") { 
                session.screen = "SHOP_CHAMPS";
                if (!data.inventory.champions) data.inventory.champions = [];
                var cList = ContentManager.champions.map(function(c, i){ return (i+1) + ". " + c + (data.inventory.champions.indexOf(c)!==-1?" [보유]":""); }).join("\n");
                return replier.reply(LayoutManager.renderFrame("챔피언 상점 (500G)", cList + "\n\n영입할 번호 입력", true, "번호 선택"));
            }
        }

        if (session.screen === "SHOP_ITEMS") {
            var price = 0, name = "", action = "";
            if (msg === "1") { price = 500; name = "닉네임 변경권"; action = "name"; }
            else if (msg === "2") { price = 1500; name = "스탯 초기화권"; action = "reset_stat"; }
            
            if (price > 0) {
                if (data.gold < price) return SystemAction.go(replier, "실패", ContentManager.msg.notEnoughGold);
                data.gold -= price;
                var resText = name + " 구매 완료!";
                if (action === "name") { data.gold += price; resText = "관리자 문의 필요 (골드 반환)"; }
                else if (action === "reset_stat") { data.stats = { acc: 10, ref: 10, com: 10, int: 10 }; resText += "\n(스탯 초기화)"; }
                Database.save();
                return SystemAction.go(replier, "구매 성공", resText + "\n남은 골드: " + data.gold + " G", function() { UserController.handle("4", session, sender, replier); });
            }
        }

        if (session.screen === "SHOP_CHAMPS") {
            var idx = parseInt(msg) - 1;
            if (ContentManager.champions[idx]) {
                var target = ContentManager.champions[idx];
                if (!data.inventory.champions) data.inventory.champions = [];
                if (data.inventory.champions.indexOf(target) !== -1) return SystemAction.go(replier, "알림", "이미 보유중인 챔피언입니다.");
                if (data.gold < 500) return SystemAction.go(replier, "실패", ContentManager.msg.notEnoughGold);
                data.gold -= 500; data.inventory.champions.push(target); Database.save();
                return SystemAction.go(replier, "영입 성공", target + " 합류!", function(){ UserController.handle("4", session, sender, replier); });
            }
        }

        // [5] 문의
        if (session.screen === "MAIN" && msg === "5") {
            session.screen = "USER_INQUIRY";
            return replier.reply(LayoutManager.renderFrame("문의 접수", "내용을 입력하세요.", true, "내용 입력"));
        }
        if (session.screen === "USER_INQUIRY") {
            Database.inquiries.push({ sender: session.tempId, content: msg, time: new Date().toLocaleString(), read: false });
            Database.save();
            session.screen = "MAIN";
            return SystemAction.go(replier, "완료", "문의가 접수되었습니다.", function() { UserController.handle("메뉴", session, sender, replier); });
        }
        
        // [6] 로그아웃
        if (session.screen === "MAIN" && msg === "6") {
            SessionManager.reset(sender);
            return replier.reply(LayoutManager.renderAlert("알림", "로그아웃 되었습니다."));
        }
    }
};

// 6-3. 관리자 컨트롤러
var AdminController = {
    handle: function(msg, session, sender, replier) {
        if (session.screen === "IDLE" || msg === "메뉴") {
            session.screen = "ADMIN_MAIN";
            var body = LayoutManager.templates.menuList(null, ContentManager.menus.adminMain);
            return replier.reply(LayoutManager.renderFrame("관리 센터", body, false, "관리 메뉴 선택"));
        }

        if (session.screen === "ADMIN_MAIN" && msg === "1") {
            var rt = java.lang.Runtime.getRuntime();
            var used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
            var info = "📟 메모리: " + used + "MB 사용중\n👥 유저 수: " + Object.keys(Database.data).length + "명\n🛡️ 버전: " + Config.Version;
            return replier.reply(LayoutManager.renderFrame("시스템 정보", info, true, "확인 완료"));
        }

        if (session.screen === "ADMIN_MAIN" && msg === "2") {
            var users = Object.keys(Database.data);
            if (users.length === 0) return SystemAction.go(replier, "알림", "등록된 유저가 없습니다.");
            
            session.temp.userList = users;
            session.screen = "ADMIN_USER_SELECT";
            
            var listText = users.map(function(u, i) { return (i+1) + ". " + u; }).join("\n");
            return replier.reply(LayoutManager.renderFrame("유저 목록", listText + "\n\n" + ContentManager.msg.adminSelectUser, true, "번호 선택"));
        }

        if (session.screen === "ADMIN_USER_SELECT") {
            var idx = parseInt(msg) - 1;
            if (session.temp.userList && session.temp.userList[idx]) {
                var selectedUser = session.temp.userList[idx];
                session.temp.targetUser = selectedUser;
                session.screen = "ADMIN_USER_DETAIL";
                
                var targetData = Database.data[selectedUser];
                var head = LayoutManager.renderProfileHead(targetData, selectedUser);
                var body = LayoutManager.templates.menuList(null, ContentManager.menus.adminUser);
                return replier.reply(LayoutManager.renderFrame(selectedUser + " 관리", head + "\n" + Utils.getFixedDivider() + "\n" + body, true, "작업 선택"));
            }
        }

        if (session.screen === "ADMIN_MAIN" && msg === "3") {
            var list = Database.inquiries.map(function(iq, i) { return (i+1) + ". " + iq.sender + ": " + iq.content; }).join("\n");
            return replier.reply(LayoutManager.renderFrame("문의 목록", list || "문의가 없습니다.", true, "목록 확인"));
        }

        if (session.screen === "ADMIN_USER_DETAIL") {
            var tData = Database.data[session.temp.targetUser];
            if (msg === "1") { 
                session.screen = "ADMIN_EDIT_SELECT";
                return replier.reply(LayoutManager.renderFrame("정보 수정", LayoutManager.templates.menuList(null, ContentManager.menus.adminEdit), true, "수정할 항목 선택"));
            }
            if (msg === "2") {
                tData.win = 0; tData.lose = 0; tData.lp = 0;
                Database.save();
                return SystemAction.go(replier, "완료", "데이터가 초기화되었습니다.", function() {
                    AdminController.handle("menu_refresh", session, sender, replier);
                });
            }
            if (msg === "3") {
                delete Database.data[session.temp.targetUser];
                Database.save();
                session.screen = "ADMIN_MAIN";
                return SystemAction.go(replier, "완료", "계정이 삭제되었습니다.", function() {
                    AdminController.handle("메뉴", session, sender, replier);
                });
            }
            if (msg === "4") {
                 tData.banned = !tData.banned;
                 Database.save();
                 return SystemAction.go(replier, "완료", "차단 상태가 변경되었습니다.", function() {
                     var head = LayoutManager.renderProfileHead(Database.data[session.temp.targetUser], session.temp.targetUser);
                     var body = LayoutManager.templates.menuList(null, ContentManager.menus.adminUser);
                     replier.reply(LayoutManager.renderFrame(session.temp.targetUser + " 관리", head + "\n" + Utils.getFixedDivider() + "\n" + body, true, "작업 선택"));
                 });
            }
        }
        
        // 새로고침용 (수정/초기화 후 복귀)
        if (msg === "menu_refresh" && session.screen === "ADMIN_USER_DETAIL") {
             var head = LayoutManager.renderProfileHead(Database.data[session.temp.targetUser], session.temp.targetUser);
             var body = LayoutManager.templates.menuList(null, ContentManager.menus.adminUser);
             return replier.reply(LayoutManager.renderFrame(session.temp.targetUser + " 관리", head + "\n" + Utils.getFixedDivider() + "\n" + body, true, "작업 선택"));
        }

        if (session.screen === "ADMIN_EDIT_SELECT") {
            var typeMap = { "1": "gold", "2": "lp", "3": "level" };
            if (typeMap[msg]) {
                session.temp.editType = typeMap[msg];
                session.screen = "ADMIN_EDIT_INPUT";
                return replier.reply(LayoutManager.renderFrame("값 수정", "새로운 값을 입력하세요.", true, "숫자 입력"));
            }
        }
        if (session.screen === "ADMIN_EDIT_INPUT") {
             var val = parseInt(msg);
             if(!isNaN(val)) {
                 Database.data[session.temp.targetUser][session.temp.editType] = val;
                 Database.save();
                 return SystemAction.go(replier, "완료", "수정되었습니다.", function() {
                     session.screen = "ADMIN_USER_DETAIL";
                     AdminController.handle("menu_refresh", session, sender, replier);
                 });
             }
        }
    }
};

// ━━━━━━━━ [7. 메인 라우터] ━━━━━━━━
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    try {
        Database.load(); 
        var realMsg = msg.trim();
        var session = SessionManager.get(sender);

        if (realMsg === "업데이트" || realMsg === ".업데이트") return;

        if (session.screen === "TIMEOUT") {
            replier.reply("⌛ 세션이 만료되었습니다. '메뉴'를 입력해 다시 시작하세요.");
            SessionManager.reset(sender);
            return;
        }

        if (realMsg === "취소" || realMsg === "메뉴") {
            if (session.data) session.screen = "MAIN"; 
            else SessionManager.reset(sender); 
            
            if (room === Config.AdminRoom) return AdminController.handle("메뉴", session, sender, replier);
            if (session.data) return UserController.handle("메뉴", session, sender, replier);
            return AuthController.handle("메뉴", session, sender, replier);
        }
        
        if (realMsg === "이전") {
             if (room === Config.AdminRoom) return AdminController.handle("메뉴", session, sender, replier);
             if (session.data) return UserController.handle("메뉴", session, sender, replier);
             return AuthController.handle("메뉴", session, sender, replier);
        }

        if (room === Config.AdminRoom) return AdminController.handle(realMsg, session, sender, replier);
        
        if (!session.data) return AuthController.handle(realMsg, session, sender, replier);
        return UserController.handle(realMsg, session, sender, replier);

    } catch (e) {
        replier.reply("⛔ 에러: " + e);
    }
}
