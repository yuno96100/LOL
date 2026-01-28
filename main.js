/**
 * main.js
 * 역할: 메인 컨트롤러 및 지정된 방으로 에러 보고
 */

const libConst = Bridge.getScopeOf("Const.js").bridge();
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

        /** [1] 단체톡방 로직 **/
        if (room.trim() === libConst.MainRoomName.trim()) {
            switch (command) {
                case "등록":
                    replyBox("유저 등록 안내", 
                        sender + "님, 가입 안내입니다.\n" +
                        libConst.AdminName + "에게 1:1 메시지로\n" +
                        "'.가입 [ID] [PW]'를 보내주세요."
                    );
                    break;
                case "정보":
                    var systemInfo = "• 서버 버전: v" + libConst.Version + "\n" +
                                     "• 관리 주체: " + libConst.AdminName + "\n\n" +
                                     "[🛡️ 보호막 시스템]\n" +
                                     "• 에러 트래킹: 전용 채널 전송\n" +
                                     "• 보고 위치: [" + libConst.ErrorLogRoom + "]\n\n" +
                                     "[📍 접속 정보]\n" +
                                     "• 현재 방: " + room;
                    replyBox("시스템 상세 정보", systemInfo);
                    break;
                case "도움말":
                    replier.reply(Helper.getMainHelp());
                    break;
            }
            return;
        }

        /** [2] 개인톡방 로직 **/
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
                case "정보":
                    replyBox("개인 세션 정보", "• 대상: " + sender + "\n• 상태: 인증 필요");
                    break;
                case "도움말":
                    replier.reply(Helper.getPrivateHelp(isLoggedIn));
                    break;
            }
        }

    } catch (e) {
        // [수정 포인트] 에러 발생 시 지정된 "게임봇" 방으로만 메시지를 보냅니다.
        var fullPath = e.fileName || "알 수 없는 파일";
        var fileName = fullPath.split("/").pop(); 

        var errorLog = "🚨 [실험실 에러 리포트]\n";
        errorLog += "━━━━━━━━━━━━━━━\n";
        errorLog += "• 발생 위치: " + room + "\n";
        errorLog += "• 에러 파일: " + fileName + "\n";
        errorLog += "• 라인 번호: " + e.lineNumber + "줄\n";
        errorLog += "• 에러 내용: " + e.message + "\n";
        errorLog += "━━━━━━━━━━━━━━━";
        
        // Api.replyRoom을 사용하여 특정 방으로 메시지 전송
        Api.replyRoom(libConst.ErrorLogRoom, errorLog);
        
        // 현재 방에는 간략한 안내만 (선택 사항)
        // replier.reply("⚠️ 시스템 오류가 발생하여 관리자에게 보고되었습니다.");
        
        Log.e("Error in " + fileName + " (Line " + e.lineNumber + "): " + e.message);
    }
}
