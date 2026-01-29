/**
 * main.js
 * 버전: v1.2.2
 * 업데이트 내용: LoginManager에 DB/Obj 객체를 주입하여 'Bridge is not defined' 에러 해결
 */

// 모듈 로드 (main.js는 Bridge를 정상 인식함)
const libConst = Bridge.getScopeOf("Const.js").bridge();
const DB = Bridge.getScopeOf("DataBase.js").bridge();
const Obj = Bridge.getScopeOf("Object.js").bridge();
const Login = Bridge.getScopeOf("LoginManager.js").bridge();
const Helper = Bridge.getScopeOf("Helper.js").bridge();

function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    
    try {
        // 접두사 체크
        if (!msg.startsWith(libConst.Prefix)) return;

        const args = msg.split(" ");
        const command = args[0].slice(libConst.Prefix.length);
        const params = args.slice(1);

        // 공통 UI 박스 함수
        function replyBox(title, content) {
            var res = "━━━━━━━━━━━━━━━\n";
            res += "🧪 " + title + "\n";
            res += "━━━━━━━━━━━━━━━\n";
            res += content + "\n";
            res += "━━━━━━━━━━━━━━━";
            replier.reply(res);
        }

        /** * [1] 게임봇 방 (관리자 전용 제어 센터)
         */
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
                        
                        // LOL실험실 방에 공지 발송
                        Api.replyRoom(libConst.MainRoomName, 
                            "📢 [관리자 임명 공지]\n" +
                            "━━━━━━━━━━━━━━━\n" +
                            targetAdd + " 님이 새로운 관리자로 지정되었습니다.\n" +
                            "━━━━━━━━━━━━━━━"
                        );
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
                    replyBox("관리자 시스템 정보", 
                        "• 서버 버전: " + libConst.Version + "\n" +
                        "• 에러 수집: 활성화 (방향: " + libConst.ErrorLogRoom + ")\n" +
                        "• 타겟 방: " + libConst.MainRoomName + "\n" +
                        "• 모듈 상태: DB/Obj/Login/Helper 정상"
                    );
                    break;
            }
            return;
        }

        /** * [2] LOL실험실 방 (퍼블릭 채팅방)
         */
        if (room.trim() === libConst.MainRoomName.trim()) {
