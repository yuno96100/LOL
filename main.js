/*
 * 🏰 소환사의 협곡 Bot - ORIGINAL CONTENT RESTORED
 * - 구조: MVC 패턴 (LayoutManager + ContentManager + Controllers)
 * - 내용: 2.txt 원본 기획 100% 복구 (메뉴, 상점, 프로필 등)
 * - 설정: 접두사 없음, 회원가입 루프 해결
 */

// ━━━━━━━━ [1. 설정 및 인프라] ━━━━━━━━
var Config = {
    Version: "v1.0.3 Original",
    // Prefix 삭제됨 (빈 문자열 처리)
    AdminRoom: "소환사의협곡관리", 
    BotName: "소환사의 협곡",
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",
    LINE_CHAR: "━",
    FIXED_LINE: 14
};

var MAX_LEVEL = 30;

var Utils = {
    getFixedDivider: function() { return Array(Config.FIXED_LINE + 1).join(Config.LINE_CHAR); },
    
    getTierInfo: function(lp) {
        if (lp >= 3000) return { name: "챌린저", icon: "💎" };
        if (lp >= 2500) return { name: "그랜드마스터", icon: "👑" };
        if (lp >= 2000) return { name: "마스터", icon: "🔮" };
        if (lp >= 1500) return { name: "다이아몬드", icon: "💠" };
        if (lp >= 1000) return { name: "플래티넘", icon: "❇️" };
        if (lp >= 500) return { name: "골드", icon: "🥇" };
        if (lp >= 200) return { name: "실버", icon: "🥈" };
        if (lp >= 100) return { name: "브론즈", icon: "🥉" };
        return { name: "언랭크", icon: "🥚" };
    }
};

// ━━━━━━━━ [2. 데이터베이스 및 세션] ━━━━━━━━
var Database = {
    data: {},
    load: function() {
        var file = new java.io.File(Config.DB_PATH);
        if (file.exists()) {
            try {
                this.data = JSON.parse(java.io.File(Config.DB_PATH).read());
            } catch (e) { this.data = {}; }
        }
    },
    save: function() {
        var file = new java.io.File(Config.DB_PATH);
        var writer = new java.io.FileWriter(file);
        writer.write(JSON.stringify(this.data));
        writer.close();
    },
    createUser: function(sender, nickname) {
        this.data[sender] = {
            name: nickname,
            title: "뉴비",
            lp: 0, win: 0, lose: 0,
            level: 1, exp: 0,
            gold: 0, point: 1000, // 초기 자금
            stats: { acc: 10, ref: 10, com: 10, int: 10 }, 
            inventory: { titles: ["뉴비"], characters: [] },
            banned: false
        };
        this.save();
    }
};

var SessionManager = {
    sessions: {},
    get: function(sender) {
        if (!this.sessions[sender]) {
            this.sessions[sender] = { screen: "IDLE", temp: {} };
        }
        return this.sessions[sender];
    },
    reset: function(sender) {
        this.sessions[sender] = { screen: "IDLE", temp: {} };
    }
};

// ━━━━━━━━ [3. 콘텐츠 매니저 (원본 내용 복구)] ━━━━━━━━
var ContentManager = {
    // 2.txt 원본 메뉴 구성 복구
    menus: {
        main: [
            "1. 내 정보 조회",
            "2. 컬렉션", 
            "3. 대전 모드", 
            "4. 포인트 상점", 
            "5. 문의하기", 
            "6. 로그아웃"
        ],
        stats: ["1. 정확", "2. 반응", "3. 침착", "4. 직관"],
        collection: ["1. 보유 칭호", "2. 보유 캐릭터"],
        shop: [
            "1. 티어 승급권 (1000P)", 
            "2. 닉네임 변경권 (500P)",
            "3. 전적 초기화권 (2000P)",
            "4. 스탯 초기화권 (1500P)",
            "5. 랜덤 박스 (300P)"
        ],
        adminMain: ["1. 유저 목록", "2. 공지 사항", "3. 봇 종료"],
        adminUser: ["1. 포인트 수정", "2. 경험치 수정", "3. 칭호 지급", "4. 차단/해제"]
    },
    msg: {
        welcome: "소환사의 협곡에 오신 것을 환영합니다.\n사용하실 닉네임을 입력해 주세요.",
        registerComplete: "가입이 완료되었습니다! '메뉴'를 입력해 주세요.",
        inputPoint: "투자할 포인트 숫자를 입력하세요.",
        notEnoughPoint: "포인트가 부족합니다.",
        onlyNumber: "숫자만 입력해 주세요.",
        itemBought: "구매가 완료되었습니다!",
        equipTitle: "칭호가 변경되었습니다.",
        adminSearch: "조회할 유저의 전체 닉네임(ID)을 입력하세요.",
        banned: "🚫 관리자에 의해 이용이 제한된 계정입니다.",
        noData: "데이터가 존재하지 않습니다.",
        battlePrep: "⚔️ 대전 모드는 현재 준비 중입니다."
    }
};

// ━━━━━━━━ [4. 레이아웃 매니저 (디자인)] ━━━━━━━━
var LayoutManager = {
    renderFrame: function(title, content, navItems) {
        var div = Utils.getFixedDivider();
        var nav = "";
        if (navItems) {
            nav = "\n" + div + "\n[ " + navItems.join(" | ") + " ]";
        }
        return "『 " + title + " 』\n" + div + "\n" + content + nav;
    },

    // [원본] 세로형 상세 프로필 디자인 복구
    renderProfileHead: function(data, targetName) {
        var div = Utils.getFixedDivider();
        var tier = Utils.getTierInfo(data.lp);
        var win = data.win || 0, lose = data.lose || 0, total = win + lose;
        var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
        var st = data.stats;
        var expDisplay = (data.level >= MAX_LEVEL) ? "MAX" : data.exp + "/" + (data.level * 100);
        var banStatus = data.banned ? " [🚫차단]" : "";

        var res = "";
        res += "👤 대상: " + targetName + banStatus + "\n";
        res += "🏅 칭호: [" + data.title + "]\n";
        res += div + "\n";
        res += "🏅 티어: " + tier.icon + tier.name + " (" + data.lp + ")\n";
        res += "💰 골드: " + (data.gold || 0).toLocaleString() + " G\n";
        res += "⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)\n";
        res += "🆙 레벨: Lv." + data.level + "\n";
        res += "🔷 경험: (" + expDisplay + ")\n";
        res += div + "\n";
        res += " [ 상세 능력치 ]\n";
        res += "🎯 정확: " + st.acc + "\n";
        res += "⚡ 반응: " + st.ref + "\n";
        res += "🧘 침착: " + st.com + "\n";
        res += "🧠 직관: " + st.int + "\n";
        res += div + "\n";
        res += "✨ 포인트: " + (data.point || 0) + " P";
        
        return res;
    },

    templates: {
        menuList: function(subtitle, items) {
            return " [ " + subtitle + " ]\n\n " + items.join("\n ");
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

// ━━━━━━━━ [5. 컨트롤러 (로직)] ━━━━━━━━

// 5-1. 인증 컨트롤러
var AuthController = {
    handle: function(msg, session, sender, replier) {
        if (session.screen === "REGISTER") {
            if (!msg || msg.trim().length === 0) return; // 빈 값 방지
            if (Database.data[msg]) return replier.reply("이미 존재하는 닉네임입니다.");
            
            Database.createUser(sender, msg);
            SessionManager.reset(sender);
            return replier.reply(ContentManager.msg.registerComplete);
        }
        session.screen = "REGISTER";
        return replier.reply(LayoutManager.renderFrame("회원가입", ContentManager.msg.welcome));
    }
};

// 5-2. 유저 컨트롤러
var UserController = {
    handle: function(msg, session, sender, replier) {
        var data = Database.data[sender];
        if (data.banned) return replier.reply(ContentManager.msg.banned);

        // 메인 메뉴
        if (session.screen === "MAIN" || msg === "메뉴" || session.screen === "IDLE") {
            session.screen = "MAIN";
            var head = LayoutManager.renderProfileHead(data, sender);
            var body = LayoutManager.templates.menuList("메인 메뉴", ContentManager.menus.main);
            return replier.reply(LayoutManager.renderFrame("소환사의 협곡", head + "\n" + Utils.getFixedDivider() + "\n" + body));
        }

        // 1. 내 정보 조회 (강화 메뉴 진입)
        if (session.screen === "MAIN" && msg === "1") {
            session.screen = "STAT_SELECT";
            var head = LayoutManager.renderProfileHead(data, sender);
            var body = LayoutManager.templates.menuList("강화할 능력치 선택", ContentManager.menus.stats);
            return replier.reply(LayoutManager.renderFrame("내 정보", head + "\n" + Utils.getFixedDivider() + "\n" + body, ["메뉴"]));
        }
        if (session.screen === "STAT_SELECT") {
            var statMap = { "1": "acc", "2": "ref", "3": "com", "4": "int" };
            var nameMap = { "1": "정확", "2": "반응", "3": "침착", "4": "직관" };
            if (statMap[msg]) {
                session.temp.statKey = statMap[msg];
                session.temp.statName = nameMap[msg];
                session.screen = "STAT_INPUT";
                var body = LayoutManager.templates.inputRequest(session.temp.statName + " 강화", data.stats[session.temp.statKey], "보유 포인트: " + data.point + " P");
                return replier.reply(LayoutManager.renderFrame("강화 진행", body, ["취소", "메뉴"]));
            }
        }
        if (session.screen === "STAT_INPUT") {
            var amount = parseInt(msg);
            if (isNaN(amount) || amount <= 0) return replier.reply(ContentManager.msg.onlyNumber);
            if (data.point < amount) return replier.reply(ContentManager.msg.notEnoughPoint);
            
            data.point -= amount;
            data.stats[session.temp.statKey] += amount;
            Database.save();

            var resultMsg = session.temp.statName + " 수치가 " + amount + " 상승했습니다.\n 현재 수치: " + data.stats[session.temp.statKey];
            session.screen = "STAT_SELECT";
            return replier.reply(LayoutManager.renderFrame("결과 확인", LayoutManager.templates.result("강화 성공", resultMsg), ["1. 계속 강화", "메뉴"]));
        }

        // 2. 컬렉션
        if (session.screen === "MAIN" && msg === "2") {
            session.screen = "COLLECTION_MAIN";
            return replier.reply(LayoutManager.renderFrame("컬렉션", LayoutManager.templates.menuList("컬렉션 분류", ContentManager.menus.collection), ["메뉴"]));
        }
        if (session.screen === "COLLECTION_MAIN") {
             if (msg === "1") {
                 session.screen = "TITLE_EQUIP";
                 var list = LayoutManager.templates.list("보유 칭호 목록", data.inventory.titles);
                 return replier.reply(LayoutManager.renderFrame("칭호 관리", list + "\n\n장착할 칭호 이름을 정확히 입력하세요.", ["메뉴"]));
             }
             if (msg === "2") {
                 var list = LayoutManager.templates.list("보유 캐릭터 목록", data.inventory.characters);
                 return replier.reply(LayoutManager.renderFrame("캐릭터 관리", list, ["메뉴"]));
             }
        }
        if (session.screen === "TITLE_EQUIP") {
            if (data.inventory.titles.indexOf(msg) === -1) return replier.reply("보유하지 않은 칭호입니다.");
            data.title = msg;
            Database.save();
            session.screen = "COLLECTION_MAIN";
            return replier.reply(LayoutManager.renderFrame("장착 완료", LayoutManager.templates.result("알림", "[" + msg + "] 칭호를 장착했습니다."), ["메뉴"]));
        }

        // 3. 대전 모드 (준비중)
        if (session.screen === "MAIN" && msg === "3") {
            return replier.reply(LayoutManager.renderFrame("대전 모드", ContentManager.msg.battlePrep, ["메뉴"]));
        }

        // 4. 포인트 상점 (원본 항목 복구)
        if (session.screen === "MAIN" && msg === "4") {
            session.screen = "SHOP_BUY";
            var head = LayoutManager.renderProfileHead(data, sender);
            var body = LayoutManager.templates.menuList("판매 목록", ContentManager.menus.shop);
            return replier.reply(LayoutManager.renderFrame("포인트 상점", head + "\n" + Utils.getFixedDivider() + "\n" + body + "\n\n구매할 번호를 입력하세요.", ["메뉴"]));
        }
        if (session.screen === "SHOP_BUY") {
            var price = 0, itemName = "";
            var action = "";

            if (msg === "1") { price = 1000; itemName = "티어 승급권"; action = "tier"; }
            else if (msg === "2") { price = 500; itemName = "닉네임 변경권"; action = "name"; }
            else if (msg === "3") { price = 2000; itemName = "전적 초기화권"; action = "reset_score"; }
            else if (msg === "4") { price = 1500; itemName = "스탯 초기화권"; action = "reset_stat"; }
            else if (msg === "5") { price = 300; itemName = "랜덤 박스"; action = "random"; }
            
            if (price > 0) {
                if (data.point < price) return replier.reply(ContentManager.msg.notEnoughPoint);
                data.point -= price;
                
                var resultText = itemName + " 구매 완료!";

                // 아이템별 로직
                if (action === "tier") { data.lp += 100; resultText += "\n(LP가 100 상승했습니다)"; }
                else if (action === "name") { 
                    resultText += "\n(닉네임 변경 기능은 관리자에게 문의하세요)"; 
                    data.point += price; // 기능 미구현으로 환불 예시
                }
                else if (action === "reset_score") { data.win = 0; data.lose = 0; resultText += "\n(전적이 0승 0패로 초기화되었습니다)"; }
                else if (action === "reset_stat") { 
                    data.stats = { acc: 10, ref: 10, com: 10, int: 10 }; 
                    resultText += "\n(모든 스탯이 초기화되었습니다)"; 
                }
                else if (action === "random") {
                    var r = Math.floor(Math.random() * 100);
                    data.point += r * 10;
                    resultText += "\n(랜덤 포인트 " + (r*10) + "P 획득!)";
                }

                Database.save();
                return replier.reply(LayoutManager.renderFrame("구매 성공", LayoutManager.templates.result("상점 이용", resultText + "\n남은 포인트: " + data.point), ["메뉴"]));
            }
        }

        // 5. 문의하기
        if (session.screen === "MAIN" && msg === "5") {
            return replier.reply("관리자에게 전달할 내용을 입력하세요. (현재는 기능 준비중)");
        }
        
        // 6. 로그아웃
        if (session.screen === "MAIN" && msg === "6") {
            SessionManager.reset(sender);
            return replier.reply("로그아웃 되었습니다.");
        }
    }
};

// 5-3. 관리자 컨트롤러
var AdminController = {
    handle: function(msg, session, sender, replier) {
        if (session.screen === "IDLE" || msg === "메뉴") {
            session.screen = "ADMIN_MAIN";
            var body = LayoutManager.templates.menuList("관리자 기능", ContentManager.menus.adminMain);
            return replier.reply(LayoutManager.renderFrame("관리자 모드", body));
        }
        if (session.screen === "ADMIN_MAIN" && msg === "1") {
            session.screen = "ADMIN_SEARCH";
            return replier.reply(LayoutManager.renderFrame("유저 조회", LayoutManager.templates.inputRequest("검색", "선택 안됨", ContentManager.msg.adminSearch), ["취소"]));
        }
        if (session.screen === "ADMIN_SEARCH") {
            if (!Database.data[msg]) return replier.reply(ContentManager.msg.noData);
            session.temp.targetUser = msg;
            session.screen = "ADMIN_USER_DETAIL";
            var targetData = Database.data[msg];
            var head = LayoutManager.renderProfileHead(targetData, msg);
            var body = LayoutManager.templates.menuList("제어 메뉴", ContentManager.menus.adminUser);
            return replier.reply(LayoutManager.renderFrame("유저 상세 관리", head + "\n" + Utils.getFixedDivider() + "\n" + body, ["메뉴"]));
        }
        if (session.screen === "ADMIN_USER_DETAIL") {
            var tData = Database.data[session.temp.targetUser];
            if (msg === "1") {
                session.screen = "ADMIN_EDIT_POINT";
                return replier.reply(LayoutManager.renderFrame("포인트 수정", "현재: " + tData.point + "\n값을 입력하세요.", ["취소"]));
            }
            if (msg === "4") {
                 tData.banned = !tData.banned;
                 Database.save();
                 return replier.reply("차단 상태가 변경되었습니다.");
            }
        }
        if (session.screen === "ADMIN_EDIT_POINT") {
             var val = parseInt(msg);
             if(!isNaN(val)) {
                 Database.data[session.temp.targetUser].point += val;
                 Database.save();
                 return replier.reply("수정 완료.");
             }
        }
    }
};

// ━━━━━━━━ [6. 메인 라우터] ━━━━━━━━
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    try {
        Database.load();
        
        var realMsg = msg.trim();
        var session = SessionManager.get(sender);

        // 네비게이션
        if (realMsg === "취소" || realMsg === "메뉴") {
            SessionManager.reset(sender);
            if (room === Config.AdminRoom) return AdminController.handle("메뉴", session, sender, replier);
            if (Database.data[sender]) return UserController.handle("메뉴", session, sender, replier);
        }

        // 라우팅
        if (room === Config.AdminRoom) return AdminController.handle(realMsg, session, sender, replier);
        if (!Database.data[sender]) return AuthController.handle(realMsg, session, sender, replier);
        return UserController.handle(realMsg, session, sender, replier);

    } catch (e) {
        replier.reply("⛔ 에러: " + e);
    }
}
