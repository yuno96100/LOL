/**
 * main.js
 * 버전: v1.3.1
 * 통합 내용: 가입/로그인, 관리자 시스템(임명/해임), 유저 관리(조회/정보/초기화/삭제/롤백), 세션 유지
 */

const libConst = Bridge.getScopeOf("Const.js").bridge();
const DB = Bridge.getScopeOf("DataBase.js").bridge();
const Obj = Bridge.getScopeOf("Object.js").bridge();
const Login = Bridge.getScopeOf("LoginManager.js").bridge();
const Helper = Bridge.getScopeOf("Helper.js").bridge();

// 로그인 세션을 저장할 전역 객체
let sessions = {}; 

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

        /**
         * [1] 게임봇 방 (관리자 전용 제어 센터)
         */
        if (room.trim() === libConst.ErrorLogRoom.trim()) {
            switch (command) {
                case "도움말":
                    replier.reply(Helper.getAdminHelp());
                    break;

                case "관리자임명":
                    if (params.length < 1) return replier.reply("⚠️ 사용법: .관리자
