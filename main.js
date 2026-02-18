/*
 * 🏰 소환사의 협곡 Bot - FINAL COMPLETE VERSION
 * 구조: MVC (LayoutManager + ContentManager + Controllers)
 * 모든 기능 이식 완료: 강화, 상점, 컬렉션, 관리자 등
 */

// ━━━━━━━━ [1. 설정 및 인프라] ━━━━━━━━
var Config = {
    Version: "v1.0.0 Final",
    Prefix: ".",
    AdminRoom: "소환사의협곡관리", 
    BotName: "소환사의 협곡",
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",
    LINE_CHAR: "━",
    FIXED_LINE: 14
};

var MAX_LEVEL = 30;

var Utils = {
    getFixedDivider: function() { return Array(Config.FIXED_LINE + 1).join(Config.LINE_CHAR); },
    
    // 티어 계산 로직 (전 구간 포함)
    getTierInfo: function(lp) {
        if (lp >= 3000) return { name: "챌린저", icon: "💎" };
        if (lp >= 2500) return { name: "그랜드마스터", icon: "👑" };
        if (lp >= 2000) return { name: "마스터", icon: "🔮" };
        if (lp >= 1500) return { name: "다이아몬드", icon: "💠" };
        if (lp >= 1000) return { name: "플래티넘", icon: "❇️" };
        if (lp >= 500) return { name: "골드", icon: "🥇" };
        if (lp >= 200) return { name: "실버", icon: "🥈" };
        if (lp >= 100) return { name: "브론즈", icon: "🥉" };
        return { name: "아이언", icon: "🔩" };
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
    // 초기 유저 생성
    createUser: function(sender, nickname) {
        this.data[sender] = {
            name: nickname,
            title: "뉴비",
            lp: 0, win: 0, lose: 0,
            level: 1, exp: 0,
            gold: 1000, point: 100,
            // 스탯: 정확, 반응, 침착, 직관
            stats: { acc: 10, ref: 10, com: 10, int: 10 }, 
            inventory: { titles: ["뉴비"], characters: [] },
            banned: false
        };
        this.save();
    }
};

// 세션 관리 (유저의 현재 화면 상태 기억)
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

// ━━━━━━━━ [3. 콘텐츠 매니저 (텍스트/데이터 관리)] ━━━━━━━━
var ContentManager = {
    menus: {
        main: ["1. 내 정보 (능력치 강화)", "2. 컬렉션", "3. 상점", "4. 문의하기", "5. 로그아웃"],
        stats: ["1. 정확", "2. 반응", "3. 침착", "4. 직관"],
        collection: ["1. 보유 칭호 (장착)", "2. 보유 캐릭터"],
        shop: ["1. 랜덤 칭호 상자 (500P)", "2. 캐릭터 뽑기 (1000P)", "3. 경험치 부스트 (300P)"],
        adminMain: ["1. 유저 조회", "2. 전체 공지"],
        adminUser: ["1. 포인트 수정", "2. 경험치 수정", "3. 칭호 지급", "4. 차단/해제"]
    },
    msg: {
        welcome: "소환사의 협곡에 오신 것을 환영합니다.\n사용하실 닉네임을 입력해 주세요.",
        registerComplete: "가입이 완료되었습니다! '.메뉴'를 입력해 주세요.",
        inputPoint: "투자할 포인트 액수를 입력하세요.",
        notEnoughPoint: "포인트가 부족합니다.",
        onlyNumber: "숫자만 입력해 주세요.",
        itemBought: "구매가 완료되었습니다!",
        equipTitle: "칭호가 변경되었습니다.",
        adminSearch: "조회할 유저의 전체 닉네임(ID)을 입력하세요.",
        banned: "🚫 관리자에 의해 이용이 제한된 계정입니다.",
        noData: "데이터가 존재하지 않습니다."
    }
};

// ━━━━━━━━ [4. 레이아웃 매니저 (순수 디자인)] ━━━━━━━━
var LayoutManager = {
    // [프레임] 전체 창 틀
    renderFrame: function(title, content, navItems) {
        var div = Utils.getFixedDivider();
        var nav = navItems ? "\n" + div + "\n[ " + navItems.join(" | ") + " ]" : "";
        return "『 " + title + " 』\n" + div + "\n" + content + nav;
    },

    // [헤더] 유저 상세 프로필 (기존 세로형 디자인 유지)
    renderProfileHead: function(data, targetName) {
        var div = Utils.getFixedDivider();
        var tier = Utils.getTierInfo(data.lp);
        var win = data.win || 0, lose = data.lose || 0, total = win + lose;
        var winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
        var st = data.stats;
        var expDisplay = (data.level >= MAX_LEVEL) ? "MAX" : data.exp + "/" + (data.level * 100);
        var banStatus = data.banned ? " [🚫차단]" : "";
        
        return "👤 대상: " + targetName + banStatus + "\n" +
               "🏅 칭호: [" + data.title + "]\n" +
               div + "\n" +
               "🏅 티어: " + tier.icon + tier.name + " (" + data.lp + ")\n" +
               "💰 골드: " + (data.gold || 0).toLocaleString() + " G\n" +
               "⚔️ 전적: " + win + "승 " + lose + "패 (" + winRate + "%)\n" + 
               "🆙 레벨: Lv." + data.level + "\n" +
               "🔷 경험: (" + expDisplay + ")\n" +
               div + "\n" +
               " [ 상세 능력치 ]\n" +
               "🎯 정확: " + st.acc + "\n" +
               "⚡ 반응: " + st.ref + "\n" +
               "🧘 침착: " + st.com + "\n" +
               "🧠 직관: " + st.int + "\n" +
               div + "\n" +
               "✨ 포인트: " + (data.point || 0) + " P";
    },

    // [템플릿] 각종 하단부(Body) 디자인
    templates: {
        menuList: function(subtitle, items) {
            return " [ " + subtitle + " ]\n\n " + items.join("\n ");
        },
        inputRequest: function(subtitle, currentVal, info) {
            return " [ " + subtitle + " ]\n\n 현재 수치 : " + currentVal + "\n " + info + "\n\n 값을 입력하세요.";
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

// ━━━━━━━━ [5. 컨트롤러 (로직 및 기능 구현)] ━━━━━━━━

// 5-1. 인증 컨트롤러 (로그인/가입)
var AuthController = {
    handle: function(msg, session, sender, replier) {
        if (session.screen === "REGISTER") {
            if (Database.data[msg]) return replier.reply("이미 존재하는 닉네임입니다. 다른 이름을 입력하세요.");
            Database.createUser(sender, msg);
            SessionManager.reset(sender);
            return replier.reply(ContentManager.msg.registerComplete);
        }
        // 초기 가입 화면
        session.screen = "REGISTER";
        return replier.reply(LayoutManager.renderFrame("회원가입", ContentManager.msg.welcome));
    }
};

// 5-2. 유저 컨트롤러 (메인 게임 기능)
var UserController = {
    handle: function(msg, session, sender, replier) {
        var data = Database.data[sender];
        if (data.banned) return replier.reply(ContentManager.msg.banned);

        // [메인 메뉴]
        if (session.screen === "MAIN" || msg === "메뉴") {
            session.screen = "MAIN";
            var head = LayoutManager.renderProfileHead(data, sender);
            var body = LayoutManager.templates.menuList("메인 메뉴", ContentManager.menus.main);
            return replier.reply(LayoutManager.renderFrame("소환사의 협곡", head + "\n" + Utils.getFixedDivider() + "\n" + body));
        }

        // [기능 1] 내 정보 & 강화
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
                
                // 입력창은 중복 방지를 위해 Body만 깔끔하게 출력
                var body = LayoutManager.templates.inputRequest(session.temp.statName + " 강화", data.stats[session.temp.statKey], "보유 포인트: " + data.point + " P");
                return replier.reply(LayoutManager.renderFrame("강화 진행", body, ["취소", "메뉴"]));
            }
        }
        if (session.screen === "STAT_INPUT") {
            var amount = parseInt(msg);
            if (isNaN(amount) || amount <= 0) return replier.reply(ContentManager.msg.onlyNumber);
            if (data.point < amount) return replier.reply(ContentManager.msg.notEnoughPoint);
            
            // 데이터 업데이트
            data.point -= amount;
            data.stats[session.temp.statKey] += amount;
            Database.save();

            var resultMsg = session.temp.statName + " 수치가 " + amount + " 상승했습니다.\n 현재 수치: " + data.stats[session.temp.statKey];
            session.screen = "STAT_SELECT"; // 다시 선택 화면으로
            return replier.reply(LayoutManager.renderFrame("결과 확인", LayoutManager.templates.result("강화 성공", resultMsg), ["1. 계속 강화", "메뉴"]));
        }

        // [기능 2] 컬렉션 & 칭호 장착
        if (session.screen === "MAIN" && msg === "2") {
            session.screen = "COLLECTION_MAIN";
            return replier.reply(LayoutManager.renderFrame("컬렉션", LayoutManager.templates.menuList("컬렉션 분류", ContentManager.menus.collection), ["메뉴"]));
        }
        if (session.screen === "COLLECTION_MAIN") {
             if (msg === "1") { // 칭호
                 session.screen = "TITLE_EQUIP";
                 var list = LayoutManager.templates.list("보유 칭호 목록", data.inventory.titles);
                 return replier.reply(LayoutManager.renderFrame("칭호 관리", list + "\n\n장착할 칭호 이름을 정확히 입력하세요.", ["메뉴"]));
             }
             if (msg === "2") { // 캐릭터
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

        // [기능 3] 상점 & 아이템 뽑기
        if (session.screen === "MAIN" && msg === "3") {
            session.screen = "SHOP_BUY";
            var head = LayoutManager.renderProfileHead(data, sender);
            var body = LayoutManager.templates.menuList("판매 목록", ContentManager.menus.shop);
            return replier.reply(LayoutManager.renderFrame("포인트 상점", head + "\n" + Utils.getFixedDivider() + "\n" + body + "\n\n구매할 번호를 입력하세요.", ["메뉴"]));
        }
        if (session.screen === "SHOP_BUY") {
            var price = 0, itemName = "", type = "";
            if (msg === "1") { price = 500; itemName = "랜덤 칭호"; type = "title"; }
            else if (msg === "2") { price = 1000; itemName = "캐릭터 뽑기"; type = "char"; }
            else if (msg === "3") { price = 300; itemName = "경험치 부스트"; type = "exp"; }
            
            if (price > 0) {
                if (data.point < price) return replier.reply(ContentManager.msg.notEnoughPoint);
                data.point -= price;
                
                // 아이템 지급 로직
                var reward = "";
                if (type === "title") {
                    var newTitle = "용사" + Math.floor(Math.random() * 100); // 예시 랜덤 칭호
                    data.inventory.titles.push(newTitle);
                    reward = "[" + newTitle + "] 칭호 획득!";
                } else if (type === "char") {
                    var newChar = "전사" + Math.floor(Math.random() * 100);
                    data.inventory.characters.push(newChar);
                    reward = "[" + newChar + "] 캐릭터 획득!";
                } else {
                    data.exp += 50;
                    reward = "경험치 50 획득!";
                }
                Database.save();
                
                return replier.reply(LayoutManager.renderFrame("구매 성공", LayoutManager.templates.result("상점 이용", itemName + " 구매 완료!\n" + reward + "\n남은 포인트: " + data.point), ["메뉴"]));
            }
        }

        // [기능 4] 로그아웃
        if (session.screen === "MAIN" && msg === "5") {
            SessionManager.reset(sender);
            return replier.reply("로그아웃 되었습니다.");
        }
        
        // [기능 5] 문의하기
        if (session.screen === "MAIN" && msg === "4") {
            return replier.reply("관리자에게 문의할 내용을 입력해주세요. (현재는 기능 준비중)");
        }
    }
};

// 5-3. 관리자 컨트롤러 (유저 제어)
var AdminController = {
    handle: function(msg, session, sender, replier) {
        // 관리자 메인
        if (session.screen === "IDLE" || msg === "메뉴") {
            session.screen = "ADMIN_MAIN";
            var body = LayoutManager.templates.menuList("관리자 기능", ContentManager.menus.adminMain);
            return replier.reply(LayoutManager.renderFrame("관리자 모드", body));
        }

        // [관리 1] 유저 조회 시작
        if (session.screen === "ADMIN_MAIN" && msg === "1") {
            session.screen = "ADMIN_SEARCH";
            return replier.reply(LayoutManager.renderFrame("유저 조회", LayoutManager.templates.inputRequest("검색", "선택 안됨", ContentManager.msg.adminSearch), ["취소"]));
        }

        // [관리 2] 유저 검색 처리
        if (session.screen === "ADMIN_SEARCH") {
            if (!Database.data[msg]) return replier.reply(ContentManager.msg.noData);
            
            session.temp.targetUser = msg; // 타겟 고정
            session.screen = "ADMIN_USER_DETAIL";
            
            var targetData = Database.data[msg];
            // 관리자가 보더라도 디자인은 똑같이!
            var head = LayoutManager.renderProfileHead(targetData, msg);
            var body = LayoutManager.templates.menuList("제어 메뉴", ContentManager.menus.adminUser);
            
            return replier.reply(LayoutManager.renderFrame("유저 상세 관리", head + "\n" + Utils.getFixedDivider() + "\n" + body, ["메뉴"]));
        }

        // [관리 3] 유저 상세 제어
        if (session.screen === "ADMIN_USER_DETAIL") {
            var target = session.temp.targetUser;
            var tData = Database.data[target];
            
            if (msg === "1") { // 포인트 수정
                session.screen = "ADMIN_EDIT_POINT";
                return replier.reply(LayoutManager.renderFrame("포인트 수정", "현재 포인트: " + tData.point + "\n\n추가/차감할 값을 입력하세요.\n(예: 100 또는 -100)", ["취소"]));
            }
            if (msg === "2") { // 경험치 수정
                session.screen = "ADMIN_EDIT_EXP";
                return replier.reply(LayoutManager.renderFrame("경험치 수정", "현재 경험치: " + tData.exp + "\n\n추가할 값을 입력하세요.", ["취소"]));
            }
            if (msg === "3") { // 칭호 지급
                session.screen = "ADMIN_GIVE_TITLE";
                return replier.reply(LayoutManager.renderFrame("칭호 지급", "지급할 칭호 이름을 입력하세요.", ["취소"]));
            }
            if (msg === "4") { // 차단/해제
                tData.banned = !tData.banned;
                Database.save();
                var status = tData.banned ? "차단됨" : "해제됨";
                
                // 화면 갱신
                var head = LayoutManager.renderProfileHead(tData, target);
                var body = LayoutManager.templates.menuList("제어 메뉴", ContentManager.menus.adminUser);
                return replier.reply(LayoutManager.renderFrame("처리 결과", head + "\n\n[알림] " + target + "님이 " + status + "\n" + Utils.getFixedDivider() + "\n" + body, ["메뉴"]));
            }
        }
        
        // [관리 4] 값 입력 처리
        if (session.screen === "ADMIN_EDIT_POINT") {
            var val = parseInt(msg);
            if (isNaN(val)) return replier.reply(ContentManager.msg.onlyNumber);
            Database.data[session.temp.targetUser].point += val;
            Database.save();
            return AdminController.returnToDetail(session, replier, "포인트가 수정되었습니다.");
        }
        if (session.screen === "ADMIN_EDIT_EXP") {
            var val = parseInt(msg);
            if (isNaN(val)) return replier.reply(ContentManager.msg.onlyNumber);
            Database.data[session.temp.targetUser].exp += val;
            Database.save();
            return AdminController.returnToDetail(session, replier, "경험치가 수정되었습니다.");
        }
        if (session.screen === "ADMIN_GIVE_TITLE") {
            Database.data[session.temp.targetUser].inventory.titles.push(msg);
            Database.save();
            return AdminController.returnToDetail(session, replier, "[" + msg + "] 칭호를 지급했습니다.");
        }
    },

    // 관리자용 편의 함수: 작업 후 상세화면 복귀
    returnToDetail: function(session, replier, resultMsg) {
        var target = session.temp.targetUser;
        session.screen = "ADMIN_USER_DETAIL";
        var head = LayoutManager.renderProfileHead(Database.data[target], target);
        var body = LayoutManager.templates.menuList("제어 메뉴", ContentManager.menus.adminUser);
        return replier.reply(LayoutManager.renderFrame("처리 완료", head + "\n\n[알림] " + resultMsg + "\n" + Utils.getFixedDivider() + "\n" + body, ["메뉴"]));
    }
};

// ━━━━━━━━ [6. 메인 라우터 (진입점)] ━━━━━━━━
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    Database.load(); // 항상 최신 DB 로드
    
    // 1. 접두사 체크
    if (msg.indexOf(Config.Prefix) !== 0) return;
    var realMsg = msg.slice(Config.Prefix.length);
    var session = SessionManager.get(sender);

    // 2. 글로벌 명령어 (취소, 메뉴)
    if (realMsg === "취소" || realMsg === "메뉴") {
        SessionManager.reset(sender);
        // 관리자방이면 관리자 초기화면, 아니면 유저 메뉴
        if (room === Config.AdminRoom) return AdminController.handle("메뉴", session, sender, replier);
        if (Database.data[sender]) return UserController.handle("메뉴", session, sender, replier);
    }

    // 3. 관리자 모드
    if (room === Config.AdminRoom) {
        return AdminController.handle(realMsg, session, sender, replier);
    }

    // 4. 회원가입 모드 (데이터 없음)
    if (!Database.data[sender]) {
        return AuthController.handle(realMsg, session, sender, replier);
    }

    // 5. 일반 유저 모드
    return UserController.handle(realMsg, session, sender, replier);
}
