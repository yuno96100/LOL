const libConst = Bridge.getScopeOf("Const.js").bridge();
const DB = Bridge.getScopeOf("DataBase.js").bridge();
const Obj = Bridge.getScopeOf("Object.js").bridge();
const Login = Bridge.getScopeOf("LoginManager.js").bridge();
const Helper = Bridge.getScopeOf("Helper.js").bridge();

if (!global.sessions) global.sessions = {}; 
if (!global.adminAction) global.adminAction = {}; 

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    try {
        if (!global.sessions[sender]) {
            global.sessions[sender] = { isMenuOpen: false, data: null, waitAction: null };
        }
        let session = global.sessions[sender];
        let isLoggedIn = !!session.data;
        let isMainRoom = (room.trim() === libConst.MainRoomName.trim());
        let isAdminRoom = (room.trim() === libConst.ErrorLogRoom.trim());

        if (session.waitAction) {
            handleWaitAction(sender, msg, replier);
            return;
        }

        if (isAdminRoom && global.adminAction[sender]) {
            if (msg === "확인") {
                let action = global.adminAction[sender];
                if (action.type === "삭제") DB.deleteUser(action.target);
                else if (action.type === "초기화") {
                    let u = DB.readUser(action.target);
                    if (u) DB.writeUser(action.target, Obj.getNewUser(u.info.id, "0", u.info.name));
                }
                replier.reply("✅ 처리 완료.");
                delete global.adminAction[sender];
            } else if (msg === "취소") {
                delete global.adminAction[sender];
                replier.reply("❌ 취소됨.");
            }
            session.isMenuOpen = false;
            return;
        }

        if (msg === libConst.Prefix + "메뉴") {
            session.isMenuOpen = true;
            session.waitAction = null;
            replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, null, session.data, DB));
            return;
        }

        if (!isNaN(msg) && session.isMenuOpen) {
            let cmd = Helper.getRootCmdByNum(room, isAdminRoom, isMainRoom, isLoggedIn, msg.trim());
            if (!cmd) return;

            switch (cmd) {
                case "가입":
                    if (isGroupChat) return replier.reply("📢 개인톡에서 가입해주세요.");
                    replier.reply("📝 사용할 [게임 닉네임]을 입력해주세요.");
                    session.waitAction = "가입";
                    break;
                case "로그인":
                    if (isGroupChat) return replier.reply("📢 개인톡에서 로그인해주세요.");
                    replier.reply("🔑 본인의 [카카오톡 닉네임]을 입력해주세요.");
                    session.waitAction = "로그인";
                    break;
                case "내정보":
                    replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, "내정보", session.data, DB));
                    session.isMenuOpen = false;
                    break;
                case "로그아웃":
                    session.data = null; session.isMenuOpen = false;
                    replier.reply("🚪 로그아웃 되었습니다.");
                    break;
                case "유저조회":
                    if (isAdminRoom) {
                        replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, "유저조회", session.data, DB) + "\n\n🔍 상세조회할 카톡 닉네임 입력.");
                        session.waitAction = "상세조회";
                    }
                    break;
                default:
                    replier.reply(Helper.getMenu(room, isMainRoom, isLoggedIn, cmd, session.data, DB));
                    break;
            }
        }
    } catch (e) {
        Api.replyRoom(libConst.ErrorLogRoom, "🚨 에러: " + e.message);
    }
}

function handleWaitAction(sender, msg, replier) {
    let session = global.sessions[sender];
    let action = session.waitAction;
    let input = msg.trim();

    if (input === "취소") {
        session.waitAction = null; session.isMenuOpen = false;
        return replier.reply("❌ 취소되었습니다.");
    }

    switch (action) {
        case "가입":
            let regRes = Login.tryRegister(sender, input, DB, Obj);
            replier.reply(regRes.msg);
            break;
        case "로그인":
            let res = Login.tryLogin(input, DB);
            if (res.success) {
                session.data = res.data;
                replier.reply("✅ 로그인 성공! 반갑습니다, " + res.data.info.name + "님.");
            } else {
                replier.reply("🚫 " + res.msg);
            }
            break;
        case "상세조회":
            let ud = DB.readUser(input);
            if (!ud) return replier.reply("❌ 유저 없음.");
            replier.reply("👤 [" + ud.info.name + "] 상세\n돈: " + ud.status.money + "G");
            break;
    }
    session.waitAction = null; session.isMenuOpen = false;
}
