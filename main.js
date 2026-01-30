if (!global.L) {
    global.L = {
        Const: Bridge.getScopeOf("Const.js").bridge(),
        DB: Bridge.getScopeOf("DataBase.js").bridge(),
        Obj: Bridge.getScopeOf("Object.js").bridge(),
        Login: Bridge.getScopeOf("LoginManager.js").bridge(),
        Helper: Bridge.getScopeOf("Helper.js").bridge()
    };
}
const { Const, DB, Obj, Login, Helper } = global.L;

if (!global.sessions) global.sessions = {}; 
if (!global.adminAction) global.adminAction = {}; 
if (!global.tempUserList) global.tempUserList = []; 

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    let input = msg.trim();
    if (!input.startsWith(Const.Prefix) && isNaN(input) && !global.sessions[sender]?.waitAction && input !== "취소") return;

    try {
        if (!global.sessions[sender]) {
            global.sessions[sender] = { isMenuOpen: false, data: null, waitAction: null, currentView: "메인" };
        }
        let session = global.sessions[sender];

        if (input === "취소") {
            if (session.isMenuOpen || session.waitAction || global.adminAction[sender]) {
                session.isMenuOpen = false; session.waitAction = null; session.currentView = "메인";
                global.adminAction[sender] = null;
                return replier.reply("❌ 취소되었습니다.");
            }
            return;
        }

        let roomName = room.trim();
        let isAdminRoom = (roomName === Const.ErrorLogRoom);
        let isMainRoom = (roomName === Const.MainRoomName);

        if (isAdminRoom && global.adminAction[sender]) {
            handleAdminConfirm(sender, input, replier);
            return;
        }

        if (session.waitAction) {
            handleWaitAction(sender, input, replier, session, isAdminRoom);
            return;
        }

        if (input === Const.Prefix + "메뉴") {
            session.isMenuOpen = true; session.currentView = "메인";
            replier.reply(Helper.getMenu(roomName, isMainRoom, isAdminRoom, !!session.data, "메인", session.data, DB));
            return;
        }

        if (session.isMenuOpen && !isNaN(input)) {
            if (session.currentView === "유저조회") {
                let idx = parseInt(input) - 1;
                if (global.tempUserList[idx]) return showUserDetail(global.tempUserList[idx], replier);
            }
            let cmd = Helper.getRootCmdByNum(isAdminRoom, isMainRoom, !!session.data, input);
            if (cmd) { session.currentView = cmd; executeCommand(cmd, sender, session, isGroupChat, replier, roomName, isMainRoom, isAdminRoom); }
        }
    } catch (e) { Api.replyRoom(Const.ErrorLogRoom, "🚨 에러: " + e.message); }
}

function executeCommand(cmd, sender, session, isGroupChat, replier, room, isMainRoom, isAdminRoom) {
    let menuRes = Helper.getMenu(room, isMainRoom, isAdminRoom, !!session.data, cmd, session.data, DB);
    if (cmd === "가입" || cmd === "로그인" || cmd === "삭제" || cmd === "초기화" || cmd === "복구") {
        let m = { "가입": "📝 사용할 닉네임", "로그인": "🔑 본인 닉네임", "삭제": "🛠️ 삭제 대상", "초기화": "🛠️ 초기화 대상", "복구": "🛠️ 복구 대상" };
        replier.reply(m[cmd] + " 입력 (취소: '취소')");
        session.waitAction = cmd;
    } else if (cmd === "로그아웃") {
        session.data = null; session.isMenuOpen = false; replier.reply("🚪 로그아웃 되었습니다.");
    } else {
        replier.reply(menuRes);
        if (cmd !== "유저조회" && cmd !== "상점" && cmd !== "내정보") session.isMenuOpen = false;
    }
}

function handleWaitAction(sender, msg, replier, session, isAdminRoom) {
    let action = session.waitAction;
    if (action === "가입") replier.reply(Login.tryRegister(sender, msg, DB, Obj).msg);
    else if (action === "로그인") {
        let res = Login.tryLogin(msg, DB);
        if (res.success) { session.data = res.data; replier.reply("✅ 로그인 성공!"); }
        else replier.reply("🚫 " + res.msg);
    } else if (isAdminRoom && (action === "삭제" || action === "초기화")) {
        global.adminAction[sender] = { type: action, target: msg };
        replier.reply("⚠️ [" + msg + "] " + action + " 진행? (확인/취소)");
    } else if (isAdminRoom && action === "복구") replier.reply(DB.restoreUser(msg) ? "✅ 복구 완료" : "❌ 복구 실패");
    session.waitAction = null; session.isMenuOpen = false;
}

function handleAdminConfirm(sender, msg, replier) {
    let action = global.adminAction[sender];
    if (msg === "확인") {
        if (action.type === "삭제") DB.deleteUser(action.target);
        else if (action.type === "초기화") {
            let u = DB.readUser(action.target);
            if (u) DB.writeUser(action.target, Obj.getNewUser(u.info.id, "0", u.info.name));
        }
        replier.reply("✅ 완료.");
    } else replier.reply("❌ 취소.");
    delete global.adminAction[sender];
}

function showUserDetail(userId, replier) {
    let u = DB.readUser(userId);
    if (!u) return;
    replier.reply("👤 [" + u.info.name + "] 유저 정보\n• LV: " + u.status.level + "\n• GOLD: " + u.status.money + "G");
}
