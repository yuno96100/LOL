/**
 * main.js
 * 버전: v1.3.5
 */
const libConst = Bridge.getScopeOf("Const.js").bridge();
const DB = Bridge.getScopeOf("DataBase.js").bridge();
const Obj = Bridge.getScopeOf("Object.js").bridge();
const Login = Bridge.getScopeOf("LoginManager.js").bridge();
const Helper = Bridge.getScopeOf("Helper.js").bridge();

let sessions = {}; 

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    try {
        if (!msg.startsWith(libConst.Prefix)) return;
        const args = msg.split(" ");
        const command = args[0].slice(libConst.Prefix.length);
        const params = args.slice(1);

        let userSession = sessions[sender];
        let isLoggedIn = !!userSession;

        if (command === "메뉴") {
            return replier.reply(Helper.getMenu(room, isGroupChat, isLoggedIn));
        }

        function replyBox(title, content) {
            var res = "━━━━━━━━━━━━━━━\n🧪 " + title + "\n━━━━━━━━━━━━━━━\n" + content + "\n━━━━━━━━━━━━━━━";
            replier.reply(res);
        }

        if (room.trim() === libConst.ErrorLogRoom.trim()) {
            switch (command) {
                case "도움말": replier.reply(Helper.getAdminHelp()); break;
                case "유저조회":
                    let userList = DB.getUserList();
                    if (userList.length === 0) return replier.reply("가입 유저 없음");
                    replyBox("가입 유저 명단", userList.join("\n"));
                    break;
                case "유저정보":
                    if (params.length < 1) return replier.reply("⚠️ .유저정보 [ID]");
                    let target = DB.loadUser(params[0]);
                    if (!target) return replier.reply("❌ 존재하지 않는 ID");
                    replyBox("상세 정보", "👤 이름: " + target.info.name + "\n📈 LV: " + target.status.level + "\n⚔️ 전적: " + target.status.win + "승 " + target.status.loss + "패");
                    break;
                case "유저초기화":
                    if (params.length < 1) return replier.reply("⚠️ .유저초기화 [ID]");
                    let targetInit = DB.loadUser(params[0]);
                    if (!targetInit) return replier.reply("❌ 대상 없음");
                    DB.deleteUser(params[0]);
                    DB.saveUser(params[0], Obj.getNewUser(targetInit.info.id, targetInit.info.pw, targetInit.info.name));
                    replier.reply("🧹 " + params[0] + " 초기화 완료 (백업됨)");
                    break;
                case "유저삭제":
                    if (params.length < 1) return replier.reply("⚠️ .유저삭제 [ID]");
                    if (DB.deleteUser(params[0])) replier.reply("🗑️ " + params[0] + " 삭제됨 (백업됨)");
                    break;
                case "유저롤백":
                    if (params.length < 1) return replier.reply("⚠️ .유저롤백 [ID]");
                    if (DB.rollbackUser(params[0])) replier.reply("⏪ " + params[0] + " 복구됨");
                    break;
                case "관리자임명":
                    let adminsA = DB.getAdmins();
                    if (adminsA.indexOf(params[0]) === -1) {
                        adminsA.push(params[0]);
                        DB.saveAdmins(adminsA);
                        replier.reply("✅ " + params[0] + " 임명");
                    }
                    break;
                case "관리자해임":
                    let adminsD = DB.getAdmins();
                    let idx = adminsD.indexOf(params[0]);
                    if (idx !== -1) {
                        adminsD.splice(idx, 1);
                        DB.saveAdmins(adminsD);
                        replier.reply("🗑️ " + params[0] + " 해임");
                    }
                    break;
                case "정보":
                    replyBox("서버 정보", "• 버전: " + libConst.Version + "\n• 세션: " + Object.keys(sessions).length);
                    break;
            }
            return;
        }

        if (room.trim() === libConst.MainRoomName.trim()) {
            switch (command) {
                case "도움말": replier.reply(Helper.getMainHelp()); break;
                case "정보":
                    let admins = DB.getAdmins();
                    replyBox("시스템 정보", "• 버전: " + libConst.Version + "\n• 관리자: " + admins.join(", "));
                    break;
                case "등록":
                    replyBox("가입 안내", "개인톡으로 '.가입 [ID] [PW]'를 보내주세요.");
                    break;
            }
            return;
        }

        if (!isGroupChat) {
            switch (command) {
                case "가입":
                    if (params.length < 2) return replyBox("가입 실패", ".가입 [ID] [PW]");
                    var regRes = Login.tryRegister(params[0], params[1], sender, DB, Obj);
                    replyBox("가입 결과", regRes.msg);
                    if (regRes.success) Api.replyRoom(libConst.ErrorLogRoom, "🔔 가입: " + sender + "(" + params[0] + ")");
                    break;
                case "로그인":
                    if (params.length < 2) return replyBox("로그인 실패", ".로그인 [ID] [PW]");
                    var logRes = Login.tryLogin(params[0], params[1], DB);
                    if (logRes.success) sessions[sender] = logRes.data;
                    replyBox("로그인 결과", logRes.msg);
                    break;
                case "내정보":
                    if (!isLoggedIn) return replyBox("실패", "로그인이 필요합니다.");
                    replyBox("내 정보", "👤 이름: " + userSession.info.name + "\n📈 LV: " + userSession.status.level + "\n⚔️ " + userSession.status.win + "승 " + userSession.status.loss + "패");
                    break;
                case "로그아웃":
                    delete sessions[sender];
                    replier.reply("🚪 로그아웃 되었습니다.");
                    break;
                case "도움말": replier.reply(Helper.getPrivateHelp(isLoggedIn)); break;
            }
        }
    } catch (e) {
        var errorLog = "🚨 [에러] " + e.message + " (라인: " + e.lineNumber + ")";
        Api.replyRoom(libConst.ErrorLogRoom, errorLog);
    }
}
