/**
 * main.js
 * 버전: v1.1.9
 */

const libConst = Bridge.getScopeOf("Const.js").bridge();
const DB = Bridge.getScopeOf("DataBase.js").bridge();
const Login = Bridge.getScopeOf("LoginManager.js").bridge();
const Helper = Bridge.getScopeOf("Helper.js").bridge();

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    
    try {
        if (!msg.startsWith(libConst.Prefix)) return;

        const args = msg.split(" ");
        const command = args[0].slice(libConst.Prefix.length);
        const params = args.slice(1);

        function replyBox(title, content) {
            var res = "━━━━━━━━━━━━━━━\n";
            res += "🧪 " + title + "\n";
            res += "━━━━━━━━━━━━━━━\n";
            res += content + "\n";
            res += "━━━━━━━━━━━━━━━";
            replier.reply(res);
        }

        /** [1] 게임봇 방 (관리자 전용) **/
        if (room.trim() === libConst.ErrorLogRoom.trim()) {
            switch (command) {
                case "도움말":
                case "명령어":
                    replier.reply(Helper.getAdminHelp());
                    break;

                case "관리자임명":
                    if (params.length < 1) return replier.reply("⚠️ 사용법: .관리자임명 [닉네임]");
                    let targetAdd = params[0];
                    let adminsAdd = DB.getAdmins();
                    
                    if (adminsAdd.indexOf(targetAdd) === -1) {
                        adminsAdd.push(targetAdd);
                        DB.saveAdmins(adminsAdd);
                        replier.reply("✅ " + targetAdd + " 님을 관리자로 임명했습니다.");
                        Api.replyRoom(libConst.MainRoomName, "📢 [관리자 임명 공지]\n━━━━━━━━━━━━━━━\n" + targetAdd + " 님이 새로운 관리자로 지정되었습니다.\n━━━━━━━━━━━━━━━");
                    } else {
                        replier.reply("⚠️ 이미 관리자인 유저입니다.");
                    }
                    break;

                case "관리자해임":
                    if (params.length < 1) return replier.reply("⚠️ 사용법: .관리자해임 [닉네임]");
                    let targetDel = params[0];
                    let adminsDel = DB.getAdmins();
                    let idx = adminsDel.indexOf(targetDel);
                    
                    if (idx !== -1) {
                        adminsDel.splice(idx, 1);
                        DB.saveAdmins(adminsDel);
                        replier.reply("🗑️ " + targetDel + " 님을 해임했습니다.");
                    } else {
                        replier.reply("⚠️ 관리자 명단에 없는 유저입니다.");
                    }
                    break;

                case "정보":
                    replyBox("관리자 시스템 정보", "• 서버 버전: " + libConst.Version + "\n• 에러 수집: 활성화\n• 타겟 방: " + libConst.MainRoomName);
                    break;
            }
            return;
        }

        /** [2] LOL실험실 방 (퍼블릭) **/
        if (room.trim() === libConst.MainRoomName.trim()) {
            switch (command) {
                case "등록":
                    replyBox("유저 등록 안내", sender + "님, 가입 안내입니다.\n관리자를 태그하여 1:1 메시지로\n'.가입 [ID] [PW]'를 보내주세요.");
                    break;
                case "정보":
                    let admins = DB.getAdmins();
                    let adminStr = admins.length > 0 ? admins.join(", ") : "없음";
                    replyBox("시스템 정보", "• 버전: v" + libConst.Version + "\n• 관리자: (" + adminStr + ")\n• 상태: 정상 가동 중");
                    break;
                case "도움말":
                    replier.reply(Helper.getMainHelp());
                    break;
            }
            return;
        }

        /** [3] 개인톡 로직 **/
        if (!isGroupChat) {
            let isLoggedIn = false; 
            switch (command) {
                case "가입":
                    if (params.length < 2) return replyBox("가입 실패", "⚠️ .가입 [ID] [PW]");
                    replyBox("가입 결과", Login.tryRegister(params[0], params[1], sender).msg);
                    break;
                case "로그인":
                    if (params.length < 2) return replyBox("로그인 실패", "⚠️ .로그인 [ID] [PW]");
                    replyBox("로그인 결과", Login.tryLogin(params[0], params[1]).msg);
                    break;
                case "도움말":
                    replier.reply(Helper.getPrivateHelp(isLoggedIn));
                    break;
            }
        }

    } catch (e) {
        var fullPath = e.fileName || "알 수 없는 파일";
        var fileName = fullPath.split("/").pop(); 
        var errorLog = "🚨 [에러 리포트]\n━━━━━━━━━━━━━━━\n• 방: " + room + "\n• 파일: " + fileName + "\n• 라인: " + e.lineNumber + "\n• 내용: " + e.message + "\n━━━━━━━━━━━━━━━";
        Api.replyRoom(libConst.ErrorLogRoom, errorLog);
        Log.e("Error: " + e.message);
    }
}
