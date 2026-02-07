/**
 * [main.js] v8.9.65
 * 업데이트 내용: 주석 상세화 및 전체 로직 무생략 통합
 */

// ━━━━━━━━ [1. 설정 및 상수] ━━━━━━━━
/**
 * 시스템 운영에 필요한 핵심 설정값과 게임 데이터를 정의하는 구역입니다.
 * 모든 상수는 Config 객체 내에서 관리되어 유지보수가 용이합니다.
 */
var Config = {
    Prefix: ".",                // 명령어 인식용 접두사
    AdminHash: "2056407147",    // 관리자 본인 식별을 위한 고유 프로필 해시값
    AdminRoom: "소환사의협곡관리", // 관리자 전용 명령어를 수신할 방 이름
    GroupRoom: "소환사의협곡",     // 일반 유저들이 활동하는 공식 단체 채팅방
    BotName: "소환사의 협곡",     // 시스템 메시지 출력 시 표시될 봇의 이름
    DB_PATH: "/sdcard/msgbot/Bots/main/database.json",     // 유저 데이터가 저장된 JSON 파일 경로
    SESSION_PATH: "/sdcard/msgbot/Bots/main/sessions.json", // 유저의 현재 화면 위치 등 세션 저장 경로
    LINE_CHAR: "━",             // UI 구분에 사용될 특수 문자
    FIXED_LINE: 17,             // UI 구분선의 고정 길이 (17자)
    NAV_LEFT: "     ",          // 네비게이션 바 좌측 여백 (정렬용)
    NAV_RIGHT: " ",             // 네비게이션 바 우측 여백
    // 하단 네비게이션 바에 표시될 버튼 텍스트 배열
    NAV_ITEMS: ["⬅️ 이전", "❌ 취소", "🏠 메뉴"] 
};

/**
 * UI 레이아웃 생성 및 텍스트 처리를 위한 보조 함수 모음입니다.
 */
var Utils = {
    /** @returns {string} 설정된 길이에 맞춘 구분선 문자열 생성 */
    getFixedDivider: function() { 
        return Array(Config.FIXED_LINE + 1).join(Config.LINE_CHAR); 
    },
    /** @returns {string} 하단 네비게이션 UI 문자열 조합 */
    getNav: function() { 
        return Config.NAV_LEFT + Config.NAV_ITEMS.join("      ") + Config.NAV_RIGHT; 
    }
};

/**
 * 유저의 LP(랭크 점수)를 기준으로 부여될 티어 정보 배열입니다.
 */
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

/**
 * 상점에서 판매될 챔피언 데이터와 역할군 아이콘 정의입니다.
 */
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
var RoleKeys = Object.keys(SystemData.roles); // 역할군 이름만 추출한 배열

/**
 * 유저의 현재 LP를 입력받아 해당하는 티어 명칭과 아이콘을 반환합니다.
 * @param {number} lp - 유저의 랭크 점수
 * @returns {object} 티어 정보 객체
 */
function getTierInfo(lp) {
    lp = lp || 0; // 점수가 없을 경우 0점으로 기본 설정
    for (var i = 0; i < TierData.length; i++) {
        if (lp >= TierData[i].minLp) return { name: TierData[i].name, icon: TierData[i].icon };
    }
    return { name: "아이언", icon: "⚫" };
}

// ━━━━━━━━ [2. 모듈: UI 엔진] ━━━━━━━━
/**
 * 봇의 모든 시각적 출력 화면을 생성하고 제어하는 엔진입니다.
 */
var UI = {
    /** 일반적인 텍스트 화면을 UI 틀에 맞춰 렌더링 */
    make: function(title, content, help) {
        var div = Utils.getFixedDivider();
        var res = "『 " + title + " 』\n" + div + "\n" + content + "\n" + div + "\n";
        if (help) res += "💡 " + help + "\n" + div + "\n";
        return res + Utils.getNav();
    },
    /** 유저의 전적, 골드, 티어 정보가 포함된 프로필 전용 화면 렌더링 */
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
    /** 특정 화면으로 이동하며 히스토리를 기록하는 내비게이션 함수 */
    go: function(session, screen, title, content, help) {
        if (session.screen && session.screen !== screen && session.screen !== "IDLE") {
            if (!session.history) session.history = [];
            // 이전 화면의 이름과 스크린 코드를 히스토리에 저장 (되돌아가기용)
            session.history.push({ screen: session.screen, title: session.lastTitle });
        }
        session.screen = screen;
        session.lastTitle = title;
        
        // 프로필 관련 화면인 경우 전용 렌더러 호출
        if (screen.indexOf("PROFILE") !== -1 || screen.indexOf("DETAIL") !== -1) {
            var tid = session.targetUser || session.tempId;
            var td = (session.targetUser) ? Database.data[session.targetUser] : session.data;
            return UI.renderProfile(tid, td, help, content);
        }
        return this.make(title, content, help);
    },
    /** 권한 및 현재 로그인 상태에 맞는 메인 메뉴 화면 출력 */
    renderMenu: function(session) {
        session.history = []; // 메뉴로 돌아올 시 히스토리 초기화
        
        // 관리자인 경우
        if (session.type === "ADMIN") return this.go(session, "ADMIN_MAIN", "관리자 메뉴", "1. 시스템 정보\n2. 유저 관리", "번호를 입력하세요.");
        
        // 단체톡방 세션인 경우
        if (session.type === "GROUP") {
            if (!session.data) {
                session.screen = "IDLE"; 
                return UI.make("알림", "'시스템' 개인톡에서\n로그인을 해주세요.", "보안이 필요합니다."); 
            }
            return this.go(session, "GROUP_MAIN", "단톡방 메뉴", "1. 내 정보 확인", "번호를 입력하세요.");
        }
        
        // 비회원 또는 로그아웃 상태인 경우
        if (!session.data) return this.go(session, "GUEST_MAIN", "환영합니다", "1. 회원가입\n2. 로그인", "번호를 선택하세요.");
        
        // 로그인 완료된 일반 유저 메인 메뉴
        return this.go(session, "USER_MAIN", "메인 메뉴", "1. 프로필\n2. 컬렉션\n3. 대전\n4. 상점\n5. 로그아웃", "작업 번호를 입력하세요.");
    }
};

// ━━━━━━━━ [3. DB 및 세션 매니저] ━━━━━━━━
/**
 * 파일 시스템을 이용해 유저 정보와 세션 정보를 유지하는 모듈입니다.
 */
var Database = {
    data: {},
    /** DB 파일 읽기 */
    load: function() { try { return JSON.parse(FileStream.read(Config.DB_PATH)); } catch(e) { return {}; } },
    /** DB 파일 쓰기 */
    save: function(d) { this.data = d; FileStream.write(Config.DB_PATH, JSON.stringify(d, null, 4)); },
    /** 신규 가입 시 초기 지급 데이터 생성 */
    getInitData: function(pw) { return { pw: pw, gold: 1000, level: 1, lp: 0, win: 0, lose: 0, title: "뉴비", collection: { titles: ["뉴비"], characters: [] } }; }
};

var SessionManager = {
    sessions: {},
    /** 세션 파일 읽기 */
    load: function() { try { this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH)); } catch(e) { this.sessions = {}; } },
    /** 세션 파일 저장 */
    save: function() { FileStream.write(Config.SESSION_PATH, JSON.stringify(this.sessions)); },
    /** 유저의 식별 해시값을 통해 세션 객체 반환 및 권한 설정 */
    get: function(r, h, g) {
        if (!this.sessions[h]) this.sessions[h] = { data: null, screen: "IDLE", history: [], lastTitle: "메뉴", tempId: null, userListCache: [], targetUser: null, editType: null };
        var s = this.sessions[h];
        if (r === Config.AdminRoom) s.type = "ADMIN";
        else if (g && r === Config.GroupRoom) s.type = "GROUP";
        else s.type = "DIRECT";
        return s;
    },
    /** 세션 상태 초기화 */
    reset: function(session) { 
        session.screen = "IDLE"; 
        session.history = []; 
        session.userListCache = []; 
        session.targetUser = null; 
        session.editType = null; 
    },
    /** 특정 유저의 모든 활성 세션을 강제 종료 (로그아웃/삭제 시) */
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
 * 관리자 전용 명령어와 시스템 관리 로직을 처리합니다.
 */
var AdminManager = {
    handle: function(msg, session, replier, startTime) {
        var screen = session.screen;

        // 관리자 메인 메뉴에서의 선택 처리
        if (screen === "ADMIN_MAIN") {
            if (msg === "1") { // 시스템 리소스 확인
                var rt = java.lang.Runtime.getRuntime();
                var used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
                var info = "⚡ 속도: " + (new Date().getTime() - startTime) + "ms\n📟 RAM: " + used + " MB\n👥 총원: " + Object.keys(Database.data).length + "명";
                return replier.reply(UI.go(session, "ADMIN_SYS_INFO", "시스템 정보", info, "시스템 모니터링"));
            }
            if (msg === "2") { // 가입된 유저 리스트 출력
                session.userListCache = Object.keys(Database.data);
                var list = session.userListCache.map(function(id, i){ return (i+1)+". "+id; }).join("\n");
                return replier.reply(UI.go(session, "ADMIN_USER_LIST", "유저 관리", list, "조회할 번호 입력"));
            }
        }

        // 유저 리스트에서 특정 번호 선택 시 상세 관리 화면으로 이동
        if (screen === "ADMIN_USER_LIST") {
            var idx = parseInt(msg) - 1;
            if (session.userListCache[idx]) {
                session.targetUser = session.userListCache[idx];
                return replier.reply(UI.go(session, "ADMIN_USER_DETAIL", session.targetUser, "1. 정보 수정\n2. 데이터 초기화\n3. 계정 삭제", "기능 번호 선택"));
            }
        }

        // 상세 관리 옵션 선택
        if (screen === "ADMIN_USER_DETAIL") {
            if (msg === "1") return replier.reply(UI.go(session, "ADMIN_EDIT_SELECT", "수정 항목", "1. 골드\n2. LP\n3. 레벨", "항목 선택"));
            if (msg === "2") return replier.reply(UI.go(session, "ADMIN_RESET_CONFIRM", "초기화", "[확인] 입력 시 리셋", "경고: 복구 불가"));
            if (msg === "3") return replier.reply(UI.go(session, "ADMIN_DELETE_CONFIRM", "삭제", "[삭제확인] 입력 시 삭제", "경고: 영구 삭제"));
        }

        // 데이터 리셋 및 삭제 최종 확인 처리
        if (screen === "ADMIN_RESET_CONFIRM" && msg === "확인") {
            var pw = Database.data[session.targetUser].pw;
            Database.data[session.targetUser] = Database.getInitData(pw);
            Database.save(Database.data);
            return replier.reply(UI.make("완료", "데이터 초기화가\n성공하였습니다.", "시스템 동기화"));
        }
        if (screen === "ADMIN_DELETE_CONFIRM" && msg === "삭제확인") {
            delete Database.data[session.targetUser]; Database.save(Database.data);
            SessionManager.forceLogout(session.targetUser); // 삭제된 유저의 모든 세션 만료
            return replier.reply(UI.make("완료", "해당 계정이\n영구 삭제되었습니다.", "DB 업데이트"));
        }
    }
};

// ━━━━━━━━ [5. 매니저: 개인톡(DIRECT) 시스템] ━━━━━━━━
/**
 * 개인톡 환경에서의 회원가입, 로그인, 유저 기능 전반을 처리합니다.
 */
var UserManager = {
    handle: function(msg, session, replier) {
        var d = session.data;
        
        // [비로그인 상태] 회원가입 및 로그인 절차
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
                    // 가입 사실을 관리자 방에 알림
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

        // [로그인 상태] 메인 메뉴 조작 처리
        if (session.screen === "USER_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "PROFILE_VIEW", session.tempId, "", "내 정보 조회"));
            if (msg === "2") return replier.reply(UI.go(session, "COL_MAIN", "컬렉션", "1. 칭호 장착\n2. 보유 캐릭터", "나의 수집함"));
            if (msg === "3") return replier.reply(UI.go(session, "BATTLE_MAIN", "대전", "1. AI 봇 매칭\n2. 유저 매칭", "대전 모드를 선택하세요."));
            if (msg === "4") return replier.reply(UI.go(session, "SHOP_MAIN", "상점", "1. 캐릭터 구매", "구매 대기 중"));
            if (msg === "5") { // 로그아웃
                SessionManager.forceLogout(session.tempId); 
                return replier.reply(UI.make("알림", "로그아웃이\n완료되었습니다.", "시스템 종료")); 
            }
        }

        // [대전 시스템] 매칭 대기 로직 (추후 전투 로직 확장 가능)
        if (session.screen === "BATTLE_MAIN") {
            if (msg === "1") return replier.reply(UI.make("AI 봇 매칭", "상대를 찾는 중입니다...", "잠시만 기다려 주세요."));
            if (msg === "2") return replier.reply(UI.make("유저 매칭", "대기열에 등록되었습니다.", "매칭 시 알림이 전송됩니다."));
        }

        // [컬렉션 시스템] 보유한 칭호 변경 및 챔피언 리스트 조회
        if (session.screen === "COL_MAIN") {
            if (msg === "1") { // 칭호 변경 화면
                var tList = d.collection.titles.map(function(t, i) { return (i+1) + ". " + (t === d.title ? "✅ " : "") + t; }).join("\n");
                return replier.reply(UI.go(session, "COL_TITLE_ACTION", "칭호 변경", tList, "장착할 번호 선택"));
            }
            if (msg === "2") { // 보유 캐릭터 출력 로직
                var cList = (d.collection.characters && d.collection.characters.length > 0) ? d.collection.characters.join("\n") : "보유 유닛이\n없습니다.";
                return replier.reply(UI.go(session, "COL_CHAR_VIEW", "보유 리스트", cList, "전략적 팀원"));
            }
        }

        // [상점 시스템] 카테고리별 캐릭터 구매 처리
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
                // 구매 성공 시 골드 차감 및 데이터 저장
                d.gold -= 500; d.collection.characters.push(target); Database.save(Database.data);
                return replier.reply(UI.make("성공", target + " 유닛을\n영입 완료했습니다!", "잔액: "+d.gold+"G"));
            }
        }
    }
};

// ━━━━━━━━ [6. 매니저: 단체방(GROUP) 시스템] ━━━━━━━━
/**
 * 단체 채팅방에서의 전적 조회 등 공개 기능을 처리합니다.
 */
var GroupManager = {
    handle: function(msg, session, replier) {
        if (session.screen === "GROUP_MAIN") {
            if (msg === "1") return replier.reply(UI.go(session, "GROUP_PROFILE", session.tempId, "", "전적 및 상태"));
        }
    }
};

// ━━━━━━━━ [7. 메인 응답 핸들러] ━━━━━━━━
/**
 * 메신저에서 메시지가 올 때마다 실행되는 최상위 함수입니다.
 */
Database.data = Database.load(); // 실행 시 DB 로드
SessionManager.load();         // 실행 시 세션 로드

function response(room, msg, sender, isGroupChat, replier, imageDB) {
    var startTime = new Date().getTime(); // 응답 시간 측정을 위한 시작 시각
    try {
        if (!msg) return; // 메시지가 비어있으면 무시
        var hash = String(imageDB.getProfileHash()); // 유저 고유 해시값 추출
        var session = SessionManager.get(room, hash, isGroupChat); // 현재 유저의 세션 정보 획득
        msg = msg.trim(); // 메시지 좌우 공백 제거
        
        // [공통 명령어] 취소, 메뉴 입력 시 무조건 메인 메뉴로 이동
        if (msg.indexOf("취소") !== -1 || msg.indexOf("메뉴") !== -1) { 
            SessionManager.reset(session); 
            return replier.reply(UI.renderMenu(session)); 
        }
        // [공통 명령어] 이전, 돌아가기 입력 시 히스토리에 저장된 이전 화면으로 이동
        if (msg.indexOf("이전") !== -1 || msg.indexOf("돌아가기") !== -1) {
            if (session.history && session.history.length > 0) {
                var p = session.history.pop();
                session.screen = p.screen;
                session.lastTitle = p.title;
                return replier.reply(UI.renderMenu(session));
            }
        }
        
        // 1. 관리자 방 명령어 우선 처리
        if (session.type === "ADMIN" && hash === Config.AdminHash) return AdminManager.handle(msg, session, replier, startTime);
        
        // 2. 단체톡방에서의 유저 데이터 연동 처리 (개인톡 로그인 연동)
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

        // 3. 현재 화면이 IDLE(대기) 상태이면 응답하지 않음
        if (session.screen === "IDLE") return;
        
        // 4. 각 환경(단체톡/개인톡)에 맞는 핸들러로 전달
        if (session.type === "GROUP") GroupManager.handle(msg, session, replier);
        else UserManager.handle(msg, session, replier);
        
        // 모든 처리 후 세션 저장
        SessionManager.save();
    } catch (e) { 
        // 런타임 에러 발생 시 관리자 방으로 오류 내용 상세 전송
        Api.replyRoom(Config.AdminRoom, UI.make("시스템 오류", "런타임 에러:\n" + e.message + "\n(라인: " + e.lineNumber + ")", "v8.9.65")); 
    }
}
