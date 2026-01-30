const libConst = Bridge.getScopeOf("Const.js").bridge();
const DB = Bridge.getScopeOf("DataBase.js").bridge();
const Obj = Bridge.getScopeOf("Object.js").bridge();
const Login = Bridge.getScopeOf("LoginManager.js").bridge();
const Helper = Bridge.getScopeOf("Helper.js").bridge();

if (!global.sessions) global.sessions = {}; 
if (!global.tempUserList) global.tempUserList = []; 

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    if (!msg.startsWith(libConst.Prefix) && isNaN(msg) && !global.sessions[sender]?.waitAction) return;

    try {
        if (!global.sessions[sender]) {
            global.sessions[sender] = { isMenuOpen: false, data: null, waitAction: null, lastTime: Date.now(), currentView: null };
        }
        let session = global.sessions[sender];
        
        // 도배 방지 (속도 최적화 유지)
        if (Date.now() - session.lastTime < 300) return;
        session.lastTime = Date.now();

        let isMainRoom = (room.trim() === libConst.MainRoomName);
        let isAdminRoom = (room.trim() === libConst.ErrorLogRoom);

        // [1] 대기 입력 처리 (가입/로그인 등)
        if (session.waitAction) {
            handleWaitAction(sender, msg, replier, session);
            return;
        }

        // [2] 메뉴 호출
        if (msg === libConst.Prefix + "메뉴") {
            session.isMenuOpen = true;
            session.currentView = "메인";
            replier.reply(Helper.getMenu(room, isMainRoom, !!session.data, null, session.data, DB));
            return;
        }

        // [3] 숫자 입력 처리
        if (session.isMenuOpen && !isNaN(msg)) {
            let num = parseInt(msg.trim()) - 1;

            // 유저조회 목록 화면에서 번호를 눌렀을 때 상세조회 실행
            if (session.currentView === "유저조회" && global.tempUserList[num]) {
                showUserDetail(global.tempUserList[num], replier);
                return;
            }

            // 일반 메뉴 이동
            let cmd = Helper.getRootCmdByNum(room, isAdminRoom, isMainRoom, !!session.data, msg.trim());
            if (cmd) {
                session.currentView = cmd; 
                executeCommand(cmd, sender, session, isGroupChat, replier, room, isMainRoom, isAdminRoom);
            }
        }
    } catch (e) {
        Api.replyRoom(libConst.ErrorLogRoom, "🚨 에러: " + e.message + "\n라인: " + e.lineNumber);
    }
}

function executeCommand(cmd, sender, session, isGroupChat, replier, room, isMainRoom, isAdminRoom) {
    if (cmd === "유저조회") {
        replier.reply(Helper.getUserListWithStatus(DB));
    } else if (cmd === "가입") {
        if (isGroupChat) return replier.reply("📢 가입은 개인톡에서 가능합니다.");
        replier.reply("📝 사용할 [게임 닉네임]을 입력해주세요.\n(입력창에 닉네임만 적어주세요)");
        session.waitAction = "가입";
    } else if (cmd === "로그인") {
        if (isGroupChat) return replier.reply("📢 로그인은 개인톡에서 가능합니다.");
        replier.reply("🔑 본인의 [카카오톡 닉네임]을 입력해주세요.");
        session.waitAction = "로그인";
    } else if (cmd === "로그아웃") {
        session.data = null; session.isMenuOpen = false;
        replier.reply("🚪 로그아웃 되었습니다.");
    } else {
        // 내정보 등 일반 메뉴
        replier.reply(Helper.getMenu(room, isMainRoom, !!session.data, cmd, session.data, DB));
        if (cmd !== "유저조회") session.isMenuOpen = false;
    }
}

function showUserDetail(userId, replier) {
    let u = DB.readUser(userId);
    if (!u) return replier.reply("❌ 정보를 불러올 수 없습니다.");

    let isOnline = false;
    for (var s in global.sessions) {
        if (global.sessions[s].data && global.sessions[s].data.info.id === userId) {
            isOnline = true; break;
        }
    }

    let detail = "👤 [" + u.info.name + "] 유저 상세\n";
    detail += "━".repeat(12) + "\n";
    detail += "• 상태: " + (isOnline ? "🟢 접속중" : "⚪ 오프라인") + "\n";
    detail += "• 카톡ID: " + u.info.id + "\n";
    detail += "• 레벨: " + u.status.level + " (Exp: " + u.status.exp + ")\n";
    detail += "• 소지금: " + u.status.money + "G\n";
    detail += "• 체력: " + u.status.hp + " / " + u.status.maxHp + "\n";
    detail += "• 가입일: " + new Date(u.info.joinDate).toLocaleDateString() + "\n";
    detail += "━".repeat(12);
    replier.reply(detail);
}

function handleWaitAction(sender, msg, replier, session) {
    let action = session.waitAction;
    let input = msg.trim();
    if (input === "취소") { session.waitAction = null; return replier.reply("❌ 취소됨."); }

    if (action === "가입") {
        replier.reply(Login.tryRegister(sender, input, DB, Obj).msg);
    } else if (action === "로그인") {
        let res = Login.tryLogin(input, DB);
        if (res.success) {
            session.data = res.data;
            replier.reply("✅ 로그인 성공! [" + res.data.info.name + "]님 반갑습니다.");
        } else {
            replier.reply("🚫 " + res.msg);
        }
    }
    session.waitAction = null;
    session.isMenuOpen = false;
}
