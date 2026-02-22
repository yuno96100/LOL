/*
 * 🏰 소환사의 협곡 Bot - v2.0 (LCK Engine Integration)
 * - 하드웨어 스펙 전면 개편: 17대 스탯(AD, AP, 방관, 마관 등) 완벽 적용
 * - 전투 시스템 고도화: 매판 레벨 1부터 시작하는 완벽한 MOBA 휘발성 룰 적용
 * - 상황 연출 디렉터: LCK 중계진(용준좌, 클템) 스타일의 다이나믹 해설 탑재
 * - 분리형 UI: 탭 전환 및 가등록(Ready) 시스템 적용 완료
 */  
 
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚙️ [1. 코어 설정 및 유틸리티]
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var Config = {
    Version: "v2.0 LCK Edition",
    AdminRoom: "소환사의협곡관리", 
    BotName: "소환사의 협곡",
    DB_PATH: "sdcard/msgbot/Bots/main/database.json",
    SESSION_PATH: "sdcard/msgbot/Bots/main/sessions.json",
    LINE_CHAR: "━",
    FIXED_LINE: 15,
    WRAP_LIMIT: 18, 
    TIMEOUT_MS: 300000 // 5분
};

var MAX_LEVEL = 30;
var POINT_PER_LEVEL = 5;

// [라우팅 맵] 이전(Back) 화면 전환 정의
var PrevScreenMap = {
    "JOIN_ID": "GUEST_MAIN", "JOIN_PW": "GUEST_MAIN", "LOGIN_ID": "GUEST_MAIN", "LOGIN_PW": "GUEST_MAIN",
    "GUEST_INQUIRY": "GUEST_MAIN", "PROFILE_MAIN": "MAIN", "STAT_SELECT": "PROFILE_MAIN",
    "STAT_INPUT": "STAT_SELECT", "STAT_INPUT_CONFIRM": "STAT_INPUT", "STAT_RESET_CONFIRM": "PROFILE_MAIN",
    "COLLECTION_MAIN": "MAIN", "TITLE_EQUIP": "COLLECTION_MAIN", "CHAMP_LIST": "COLLECTION_MAIN",
    "SHOP_MAIN": "MAIN", "SHOP_ITEMS": "SHOP_MAIN", "SHOP_CHAMPS": "SHOP_MAIN", "USER_INQUIRY": "MAIN",
    "MODE_SELECT": "MAIN", "BATTLE_PICK": "MODE_SELECT",
    "ADMIN_SYS_INFO": "ADMIN_MAIN", "ADMIN_INQUIRY_LIST": "ADMIN_MAIN", "ADMIN_USER_SELECT": "ADMIN_MAIN",
    "ADMIN_USER_DETAIL": "ADMIN_USER_SELECT", "ADMIN_EDIT_SELECT": "ADMIN_USER_DETAIL",
    "ADMIN_ACTION_CONFIRM": "ADMIN_USER_DETAIL", "ADMIN_EDIT_INPUT": "ADMIN_EDIT_SELECT", 
    "ADMIN_EDIT_INPUT_CONFIRM": "ADMIN_EDIT_INPUT", "ADMIN_INQUIRY_DETAIL": "ADMIN_INQUIRY_LIST", 
    "ADMIN_INQUIRY_REPLY": "ADMIN_INQUIRY_DETAIL"
};

var Utils = {
    getFixedDivider: function() { return Array(Config.FIXED_LINE + 1).join(Config.LINE_CHAR); },
    get24HTime: function() {
        var d = new Date(), y = d.getFullYear(), m = (d.getMonth() + 1); m = m < 10 ? "0" + m : m;
        var dt = d.getDate(); dt = dt < 10 ? "0" + dt : dt;
        var h = d.getHours(); h = h < 10 ? "0" + h : h;
        var min = d.getMinutes(); min = min < 10 ? "0" + min : min;
        return y + "-" + m + "-" + dt + " " + h + ":" + min;
    },
    wrapText: function(str) {
        if (!str) return "";
        var lines = str.split("\n"), result = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.length <= Config.WRAP_LIMIT) { result.push(line); } 
            else { 
                var currentLine = "";
                for (var j = 0; j < line.length; j++) {
                    currentLine += line[j];
                    if (currentLine.length >= Config.WRAP_LIMIT) {
                        while (j + 1 < line.length && /^[.,!?()]$/.test(line[j + 1])) { currentLine += line[j + 1]; j++; }
                        result.push(currentLine); currentLine = "";
                    }
                }
                if (currentLine) result.push(currentLine);
            }
        }
        return result.join("\n");
    },
    getTierInfo: function(lp) {
        if (lp >= 3000) return { name: "챌린저", icon: "💎" };
        if (lp >= 2500) return { name: "그랜드마스터", icon: "👑" };
        if (lp >= 2000) return { name: "마스터", icon: "🔮" };
        if (lp >= 1700) return { name: "다이아몬드", icon: "💠" };
        if (lp >= 1400) return { name: "에메럴드", icon: "💚" };
        if (lp >= 1100) return { name: "플래티넘", icon: "💿" };
        if (lp >= 800) return { name: "골드", icon: "🥇" };
        if (lp >= 500) return { name: "실버", icon: "🥈" };
        if (lp >= 200) return { name: "브론즈", icon: "🥉" };
        return { name: "아이언", icon: "⚫" };
    },
    sendNotify: function(target, msg) {
        try { Api.replyRoom(target, LayoutManager.renderFrame(ContentManager.title.notice, msg, false, ContentManager.footer.sysNotify)); } catch(e) {}
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 [2. 데이터 (Data) - 18인 로스터 (고유 스킬 이펙트 매핑 완전판)]
// - e: 엔진의 SkillMechanics 사전에 연결될 '고유 효과 식별자' (매우 중요!)
// - cd/b(성장배열), 계수(ad/ap/mhp/def), 퍼뎀(eMhp/eCurHp/eMisHp), tt/mv(타겟팅/이동)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var ChampionData = {

    // 🛡️ [탱커] --------------------------------------------------------
    "뽀삐": { role: "탱커", type: "AD", range: 125, spd: 345, hp: 610, hpRegen: 8.0, mp: 280, mpRegen: 7.0, baseAd: 64, def: 38, mdef: 32, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0,
        p: { n:"강철의 외교관", e:"shield_on_hit", d:"전투 시작 시 적중하면 쉴드를 얻는 방패를 던집니다." },
        skills: { 
            q: { n:"방패 강타", max:5, cd:[8, 7.5, 7, 6.5, 6], b:[60, 90, 120, 150, 180], ad:0.9, eMhp:0.08, t:"AD", e:"slow_field", rng:430, tt:"NT", mv:0 }, 
            w: { n:"굳건한 태세", max:5, cd:[20, 18, 16, 14, 12], b:[0,0,0,0,0], t:"UT", e:"block_dash_ms", rng:400, tt:"S", mv:0 }, 
            e: { n:"용감한 돌진", max:5, cd:[14, 13, 12, 11, 10], b:[60, 80, 100, 120, 140], ad:0.5, t:"AD", e:"wall_stun", rng:475, tt:"T", mv:475 }, 
            r: { n:"수호자의 심판", max:3, req:[6, 11, 16], cd:[120, 100, 80], b:[200, 300, 400], ad:1.0, t:"AD", e:"knockup_away", rng:500, tt:"NT", mv:0 } 
        } },
    "말파이트": { role: "탱커", type: "AP", range: 125, spd: 335, hp: 630, hpRegen: 7.0, mp: 280, mpRegen: 7.3, baseAd: 62, def: 37, mdef: 32, as: 0.73, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0,
        p: { n:"화강암 방패", e:"shield_regen", d:"피격되지 않으면 최대 체력 10% 쉴드 생성" },
        skills: { 
            q: { n:"지진의 파편", max:5, cd:[8,8,8,8,8], b:[70, 120, 170, 220, 270], ap:0.6, t:"AP", e:"steal_ms", rng:625, tt:"T", mv:0 }, 
            w: { n:"천둥소리", max:5, cd:[12, 11.5, 11, 10.5, 10], b:[30, 45, 60, 75, 90], ap:0.3, def:0.15, t:"AP", e:"armor_up_aoe", rng:0, tt:"S", mv:0 }, 
            e: { n:"지면 강타", max:5, cd:[7, 6.5, 6, 5.5, 5], b:[60, 95, 130, 165, 200], ap:0.4, def:0.3, t:"AP", e:"atkSpdDown", rng:400, tt:"S", mv:0 }, 
            r: { n:"멈출 수 없는 힘", max:3, req:[6, 11, 16], cd:[130, 105, 80], b:[200, 300, 400], ap:0.9, t:"AP", e:"aoe_stun", rng:1000, tt:"NT", mv:1000 } 
        } },
    "쉔": { role: "탱커", type: "하이브리드", range: 125, spd: 340, hp: 610, hpRegen: 8.5, mp: 400, mpRegen: 50.0, baseAd: 60, def: 34, mdef: 32, as: 0.75, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0,
        p: { n:"기 염동력", e:"shield_on_skill", d:"스킬 사용 시 보호막 생성" },
        skills: { 
            q: { n:"황혼 강습", max:5, cd:[8, 7.5, 7, 6.5, 6], b:[60, 90, 120, 150, 180], ap:0.3, eMhp:0.05, t:"AP", e:"empower_auto", rng:200, tt:"S", mv:0 }, 
            w: { n:"의지의 결계", max:5, cd:[18, 16.5, 15, 13.5, 12], b:[0,0,0,0,0], t:"UT", e:"aoe_dodge", rng:400, tt:"S", mv:0 }, 
            e: { n:"그림자 돌진", max:5, cd:[18, 16, 14, 12, 10], b:[60, 80, 100, 120, 140], mhp:0.15, t:"AD", e:"taunt", rng:600, tt:"NT", mv:600 }, 
            r: { n:"단결된 의지", max:3, req:[6, 11, 16], cd:[200, 180, 160], b:[0,0,0], ap:1.3, t:"UT", e:"global_shield_tp", rng:9999, tt:"T", mv:0 } 
        } },
    
    // 🪓 [전사] --------------------------------------------------------
    "다리우스": { role: "전사", type: "AD", range: 175, spd: 340, hp: 650, hpRegen: 10.0, mp: 260, mpRegen: 6.6, baseAd: 64, def: 39, mdef: 32, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 15, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 5, ah: 0,
        p: { n:"과다출혈", e:"bleed_stack", d:"5스택 시 녹서스의 힘(AD폭발) 발동" },
        skills: { 
            q: { n:"학살", max:5, cd:[9, 8, 7, 6, 5], b:[50, 80, 110, 140, 170], ad:1.4, t:"AD", e:"heal_missing_hp", rng:425, tt:"S", mv:0 }, 
            w: { n:"마비 일격", max:5, cd:[5, 4.5, 4, 3.5, 3], b:[20, 40, 60, 80, 100], ad:1.6, t:"AD", e:"heavy_slow", rng:200, tt:"T", mv:0 }, 
            e: { n:"포획", max:5, cd:[24, 21, 18, 15, 12], b:[0,0,0,0,0], t:"UT", e:"pull_arPen", rng:535, tt:"NT", mv:0 }, 
            r: { n:"녹서스의 단두대", max:3, req:[6, 11, 16], cd:[120, 100, 80], b:[150, 250, 350], ad:1.5, t:"TRUE", e:"true_execute", rng:460, tt:"T", mv:0 } 
        } },
    "모데카이저": { role: "전사", type: "AP", range: 175, spd: 335, hp: 645, hpRegen: 5.0, mp: 0, mpRegen: 0, baseAd: 61, def: 37, mdef: 32, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 5, ah: 0,
        p: { n:"암흑 탄생", e:"aoe_aura_on_3_hit", d:"3회 적중 시 광역 마법 피해 오라 생성" },
        skills: { 
            q: { n:"말살", max:5, cd:[9, 8, 7, 6, 5], b:[75, 95, 115, 135, 155], ap:0.6, t:"AP", e:"iso_dmg", rng:675, tt:"NT", mv:0 }, 
            w: { n:"불멸", max:5, cd:[12, 11, 10, 9, 8], b:[0,0,0,0,0], t:"UT", e:"shield_to_heal", rng:0, tt:"S", mv:0 }, 
            e: { n:"죽음의 손아귀", max:5, cd:[18, 16, 14, 12, 10], b:[70, 85, 100, 115, 130], ap:0.6, t:"AP", e:"pull_magic_pen", rng:700, tt:"NT", mv:0 }, 
            r: { n:"죽음의 세계", max:3, req:[6, 11, 16], cd:[140, 120, 100], b:[0,0,0], t:"UT", e:"stat_steal", rng:650, tt:"T", mv:0 } 
        } },
    "잭스": { role: "전사", type: "하이브리드", range: 125, spd: 350, hp: 615, hpRegen: 8.5, mp: 338, mpRegen: 5.2, baseAd: 68, def: 36, mdef: 32, as: 0.63, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0,
        p: { n:"가차없는 맹공", e:"atk_spd_stack", d:"평타 시 공격 속도 중첩 증가" },
        skills: { 
            q: { n:"도약 공격", max:5, cd:[8, 7.5, 7, 6.5, 6], b:[65, 105, 145, 185, 225], ad:1.0, ap:0.6, t:"AD", e:"gap_close", rng:700, tt:"T", mv:700 }, 
            w: { n:"무기 강화", max:5, cd:[3, 3, 3, 3, 3], b:[50, 85, 120, 155, 190], ap:0.6, t:"AP", e:"auto_reset_bonus", rng:0, tt:"S", mv:0 }, 
            e: { n:"반격", max:5, cd:[14, 12.5, 11, 9.5, 8], b:[55, 90, 125, 160, 195], ad:0.5, t:"AD", e:"dodge_stun", rng:300, tt:"S", mv:0 }, 
            r: { n:"무기의 달인", max:3, req:[6, 11, 16], cd:[100, 90, 80], b:[150, 250, 350], ap:0.7, t:"AP", e:"bonus_resist", rng:0, tt:"S", mv:0 } 
        } },
    
    // 🗡️ [암살자] --------------------------------------------------------
    "탈론": { role: "암살자", type: "AD", range: 125, spd: 335, hp: 658, hpRegen: 8.5, mp: 377, mpRegen: 7.6, baseAd: 68, def: 30, mdef: 39, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0,
        p: { n:"검의 최후", e:"bleed_on_3_hit", d:"스킬 3회 적중 후 평타 시 출혈 고정피해 발생" },
        skills: { 
            q: { n:"녹서스식 외교", max:5, cd:[6, 5.5, 5, 4.5, 4], b:[65, 90, 115, 140, 165], ad:1.1, t:"AD", e:"melee_crit_heal", rng:400, tt:"T", mv:400 }, 
            w: { n:"갈퀴손", max:5, cd:[9, 8.5, 8, 7.5, 7], b:[90, 120, 150, 180, 210], ad:1.2, t:"AD", e:"return_slow", rng:900, tt:"NT", mv:0 }, 
            e: { n:"암살자의 길", max:5, cd:[2, 2, 2, 2, 2], b:[0,0,0,0,0], t:"UT", e:"jump_wall", rng:725, tt:"NT", mv:500 }, 
            r: { n:"그림자 강습", max:3, req:[6, 11, 16], cd:[100, 80, 60], b:[180, 270, 360], ad:2.0, t:"AD", e:"invis_ms_aoe", rng:550, tt:"S", mv:0 } 
        } },
    "에코": { role: "암살자", type: "AP", range: 125, spd: 340, hp: 655, hpRegen: 9.0, mp: 280, mpRegen: 7.0, baseAd: 58, def: 32, mdef: 32, as: 0.68, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0,
        p: { n:"Z 드라이브 공진", e:"bonus_dmg_ms_on_3_hit", d:"3회 적중 시 마법피해와 이속 증가" },
        skills: { 
            q: { n:"시간의 톱니바퀴", max:5, cd:[9, 8.5, 8, 7.5, 7], b:[60, 75, 90, 105, 120], ap:0.3, t:"AP", e:"out_in_slow", rng:1075, tt:"NT", mv:0 }, 
            w: { n:"평행 시간 교차", max:5, cd:[22, 20, 18, 16, 14], b:[0,0,0,0,0], t:"UT", e:"delayed_stun_shield", rng:1600, tt:"NT", mv:0 }, 
            e: { n:"시간 도약", max:5, cd:[9, 8.5, 8, 7.5, 7], b:[50, 75, 100, 125, 150], ap:0.4, t:"AP", e:"dash_blink_bonus", rng:300, tt:"NT", mv:300 }, 
            r: { n:"시공간 붕괴", max:3, req:[6, 11, 16], cd:[110, 90, 70], b:[150, 300, 450], ap:1.5, t:"AP", e:"time_rewind", rng:0, tt:"S", mv:800 } 
        } },
    "아칼리": { role: "암살자", type: "하이브리드", range: 125, spd: 345, hp: 600, hpRegen: 9.0, mp: 200, mpRegen: 50.0, baseAd: 62, def: 23, mdef: 37, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 5, ah: 0,
        p: { n:"암살자의 표식", e:"bonus_range_dmg", d:"스킬 적중 후 다음 평타 사거리 및 피해량 대폭 증가" },
        skills: { 
            q: { n:"오연투척검", max:5, cd:[4, 3.5, 3, 2.5, 2], b:[45, 70, 95, 120, 145], ad:0.6, ap:0.6, t:"AP", e:"tip_slow", rng:500, tt:"NT", mv:0 }, 
            w: { n:"황혼의 장막", max:5, cd:[20, 19, 18, 17, 16], b:[0,0,0,0,0], t:"UT", e:"invis_energy", rng:250, tt:"S", mv:0 }, 
            e: { n:"표창 곡예", max:5, cd:[16, 14.5, 13, 11.5, 10], b:[50, 75, 100, 125, 150], ad:0.7, ap:0.5, t:"AP", e:"mark_dash_back", rng:825, tt:"NT", mv:400 }, 
            r: { n:"무결처형", max:3, req:[6, 11, 16], cd:[100, 80, 60], b:[150, 225, 300], ad:0.5, ap:0.8, eMisHp:0.1, t:"AP", e:"execute_dash", rng:675, tt:"T", mv:675 } 
        } },

    // 🪄 [마법사] --------------------------------------------------------
    "제이스": { role: "마법사", type: "AD", range: 500, spd: 335, hp: 590, hpRegen: 6.0, mp: 375, mpRegen: 6.0, baseAd: 57, def: 27, mdef: 30, as: 0.65, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0,
        p: { n:"마법공학 축전기", e:"ms_up_on_transform", d:"무기 변환 시 이동속도 증가" },
        skills: { 
            q: { n:"전격 폭발/하늘로!", max:5, cd:[8, 7.5, 7, 6.5, 6], b:[55, 110, 165, 220, 275], ad:1.2, t:"AD", e:"shock_blast", rng:1050, tt:"NT", mv:0 }, 
            w: { n:"전류 역장/초전하", max:5, cd:[10, 9, 8, 7, 6], b:[0,0,0,0,0], t:"UT", e:"hyper_charge", rng:0, tt:"S", mv:0 }, 
            e: { n:"가속 관문/천둥 강타", max:5, cd:[16, 15, 14, 13, 12], b:[40, 70, 100, 130, 160], eMhp:0.08, t:"AP", e:"accel_gate_knockback", rng:650, tt:"S", mv:0 }, 
            r: { n:"머큐리 해머 변환", max:3, req:[6, 11, 16], cd:[6, 6, 6], b:[0,0,0], t:"UT", e:"form_change", rng:0, tt:"S", mv:0 } 
        } },
    "럭스": { role: "마법사", type: "AP", range: 550, spd: 330, hp: 560, hpRegen: 5.5, mp: 480, mpRegen: 8.0, baseAd: 53, def: 18, mdef: 30, as: 0.66, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0,
        p: { n:"일루미네이션", e:"bonus_dmg_on_marked", d:"스킬 적중 대상에게 표식을 남기며 평타 시 마법피해" },
        skills: { 
            q: { n:"빛의 속박", max:5, cd:[11, 10.5, 10, 9.5, 9], b:[80, 120, 160, 200, 240], ap:0.6, t:"AP", e:"root_two", rng:1300, tt:"NT", mv:0 }, 
            w: { n:"프리즘 보호막", max:5, cd:[14, 13, 12, 11, 10], b:[40, 65, 90, 115, 140], ap:0.35, t:"UT", e:"return_shield", rng:1075, tt:"NT", mv:0 }, 
            e: { n:"광휘의 특이점", max:5, cd:[10, 9.5, 9, 8.5, 8], b:[70, 120, 170, 220, 270], ap:0.8, t:"AP", e:"aoe_slow_pop", rng:1100, tt:"NT", mv:0 }, 
            r: { n:"최후의 섬광", max:3, req:[6, 11, 16], cd:[80, 60, 40], b:[300, 400, 500], ap:1.2, t:"AP", e:"ignite_mark_laser", rng:3400, tt:"NT", mv:0 } 
        } },
    "케일": { role: "마법사", type: "하이브리드", range: 175, spd: 335, hp: 600, hpRegen: 5.0, mp: 330, mpRegen: 8.0, baseAd: 50, def: 26, mdef: 22, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0,
        p: { n:"거룩한 승천", e:"scale_by_level", d:"레벨업에 따라 공격 속도, 사거리(원거리 변환) 진화" },
        skills: { 
            q: { n:"광휘의 일격", max:5, cd:[12, 11, 10, 9, 8], b:[60, 100, 140, 180, 220], ad:0.6, ap:0.5, t:"AP", e:"shred_res_slow", rng:900, tt:"NT", mv:0 }, 
            w: { n:"천상의 축복", max:5, cd:[15, 14, 13, 12, 11], b:[0,0,0,0,0], ap:0.25, t:"UT", e:"heal_ms", rng:900, tt:"S", mv:0 }, 
            e: { n:"화염 주문검", max:5, cd:[8, 7.5, 7, 6.5, 6], b:[0,0,0,0,0], ap:0.2, eMisHp:0.08, t:"AP", e:"missing_hp_ranged", rng:0, tt:"S", mv:0 }, 
            r: { n:"신성한 심판", max:3, req:[6, 11, 16], cd:[160, 120, 80], b:[200, 350, 500], ad:1.0, ap:0.8, t:"AP", e:"invincible_aoe", rng:900, tt:"S", mv:0 } 
        } },
    
    // 🏹 [원딜] --------------------------------------------------------
    "케이틀린": { role: "원딜", type: "AD", range: 650, spd: 325, hp: 605, hpRegen: 3.5, mp: 315, mpRegen: 7.4, baseAd: 62, def: 28, mdef: 30, as: 0.68, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0,
        p: { n:"헤드샷", e:"headshot_stack", d:"평타 누적 시 확정 치명타 피해" },
        skills: { 
            q: { n:"필트오버 피스메이커", max:5, cd:[10, 9, 8, 7, 6], b:[50, 90, 130, 170, 210], ad:1.3, t:"AD", e:"pierce_dmg", rng:1300, tt:"NT", mv:0 }, 
            w: { n:"요들잡이 덫", max:5, cd:[15, 13.5, 12, 10.5, 9], b:[0,0,0,0,0], t:"UT", e:"root_headshot", rng:800, tt:"NT", mv:0 }, 
            e: { n:"90구경 투망", max:5, cd:[16, 14.5, 13, 11.5, 10], b:[70, 110, 150, 190, 230], ap:0.8, t:"AP", e:"slow_headshot_back", rng:750, tt:"NT", mv:400 }, 
            r: { n:"비장의 한 발", max:3, req:[6, 11, 16], cd:[90, 75, 60], b:[300, 525, 750], ad:2.0, t:"AD", e:"snipe_execute", rng:3500, tt:"T", mv:0 } 
        } },
    "직스": { role: "원딜", type: "AP", range: 525, spd: 325, hp: 566, hpRegen: 6.5, mp: 480, mpRegen: 8.0, baseAd: 54, def: 22, mdef: 30, as: 0.65, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0,
        p: { n:"반동 초소형 폭탄", e:"bonus_ap_dmg_on_auto", d:"일정 시간마다 평타에 강력한 마법 피해 추가" },
        skills: { 
            q: { n:"반동 폭탄", max:5, cd:[6, 5.5, 5, 4.5, 4], b:[85, 135, 185, 235, 285], ap:0.65, t:"AP", e:"bounce_bomb", rng:850, tt:"NT", mv:0 }, 
            w: { n:"휴대용 폭약", max:5, cd:[20, 18, 16, 14, 12], b:[70, 120, 170, 220, 270], ap:0.5, t:"AP", e:"knockback_self_enemy", rng:1000, tt:"NT", mv:400 }, 
            e: { n:"마법공학 지뢰밭", max:5, cd:[16, 15, 14, 13, 12], b:[40, 70, 100, 130, 160], ap:0.3, t:"AP", e:"minefield_slow", rng:900, tt:"NT", mv:0 }, 
            r: { n:"지옥 화염 폭탄", max:3, req:[6, 11, 16], cd:[120, 100, 80], b:[300, 400, 500], ap:1.1, t:"AP", e:"mega_inferno_bomb", rng:5300, tt:"NT", mv:0 } 
        } },
    "카이사": { role: "원딜", type: "하이브리드", range: 525, spd: 335, hp: 670, hpRegen: 3.5, mp: 344, mpRegen: 8.2, baseAd: 59, def: 28, mdef: 30, as: 0.64, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0,
        p: { n:"두 번째 피부", e:"plasma_stack_eMisHp", d:"5스택 시 적 잃은 체력 비례 폭발 마법 피해" },
        skills: { 
            q: { n:"이카시아 폭우", max:5, cd:[8, 7.5, 7, 6.5, 6], b:[40, 55, 70, 85, 100], ad:0.5, ap:0.25, t:"AD", e:"iso_missiles", rng:600, tt:"NT", mv:0 }, 
            w: { n:"공허의 추적자", max:5, cd:[22, 20, 18, 16, 14], b:[30, 55, 80, 105, 130], ad:1.3, ap:0.45, t:"AP", e:"plasma_stack_reveal", rng:3000, tt:"NT", mv:0 }, 
            e: { n:"고속 충전", max:5, cd:[16, 15, 14, 13, 12], b:[0,0,0,0,0], t:"UT", e:"invis_ms_atkSpd", rng:0, tt:"S", mv:0 }, 
            r: { n:"사냥본능", max:3, req:[6, 11, 16], cd:[130, 110, 90], b:[0,0,0], t:"UT", e:"shield_dash_far", rng:3000, tt:"T", mv:1500 } 
        } },
    
    // 🚑 [서포터] --------------------------------------------------------
    "파이크": { role: "서포터", type: "AD", range: 150, spd: 330, hp: 600, hpRegen: 7.0, mp: 415, mpRegen: 8.0, baseAd: 62, def: 45, mdef: 32, as: 0.66, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0,
        p: { n:"가라앉은 자들의 축복", e:"grey_health_regen", d:"적의 시야 밖에서 입은 피해 빠르게 회복" },
        skills: { 
            q: { n:"뼈 작살", max:5, cd:[10, 9.5, 9, 8.5, 8], b:[80, 130, 180, 230, 280], ad:1.2, t:"AD", e:"pull_slow_90", rng:400, tt:"NT", mv:0 }, 
            w: { n:"유령 잠수", max:5, cd:[14, 13, 12, 11, 10], b:[0,0,0,0,0], t:"UT", e:"invis_ms_regen", rng:0, tt:"S", mv:0 }, 
            e: { n:"망자의 물살", max:5, cd:[15, 14, 13, 12, 11], b:[90, 120, 150, 180, 210], ad:1.0, t:"AD", e:"phantom_stun", rng:400, tt:"NT", mv:400 }, 
            r: { n:"깊은 바다의 처형", max:3, req:[6, 11, 16], cd:[120, 100, 80], b:[250, 400, 550], ad:0.8, t:"TRUE", e:"blink_execute_reset", rng:750, tt:"NT", mv:750 } 
        } },
    "소라카": { role: "서포터", type: "AP", range: 550, spd: 325, hp: 605, hpRegen: 2.5, mp: 425, mpRegen: 11.5, baseAd: 50, def: 32, mdef: 30, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0,
        p: { n:"구원", e:"ms_up_towards_low_hp", d:"체력이 낮은 아군을 향할 때 이속 증가" },
        skills: { 
            q: { n:"별부름", max:5, cd:[8, 7, 6, 5, 4], b:[85, 130, 175, 220, 265], ap:0.35, t:"AP", e:"rejuvenation_slow", rng:800, tt:"NT", mv:0 }, 
            w: { n:"은하의 마력", max:5, cd:[4, 3.5, 3, 2.5, 2], b:[0,0,0,0,0], ap:0.6, t:"UT", e:"heal_ally_cost_hp", rng:550, tt:"T", mv:0 }, 
            e: { n:"별의 균형", max:5, cd:[20, 19, 18, 17, 16], b:[70, 110, 150, 190, 230], ap:0.4, t:"AP", e:"silence_root", rng:925, tt:"NT", mv:0 }, 
            r: { n:"기원", max:3, req:[6, 11, 16], cd:[130, 115, 100], b:[0,0,0], ap:0.5, t:"UT", e:"global_heal_low_hp_bonus", rng:9999, tt:"S", mv:0 } 
        } },
    "바드": { role: "서포터", type: "하이브리드", range: 500, spd: 330, hp: 630, hpRegen: 5.5, mp: 350, mpRegen: 6.0, baseAd: 52, def: 34, mdef: 30, as: 0.62, bonusAd: 0, ap: 0, arPenPer: 0, lethality: 0, mPenPer: 0, mPenFlat: 0, crit: 0, lifeSteal: 0, omniVamp: 0, ah: 0,
        p: { n:"방랑자의 부름", e:"meep_bonus_dmg", d:"종을 모아 평타에 광역 둔화 마법피해 추가" },
        skills: { 
            q: { n:"우주의 결속", max:5, cd:[11, 10, 9, 8, 7], b:[80, 125, 170, 215, 260], ap:0.65, t:"AP", e:"stun_if_wall", rng:950, tt:"NT", mv:0 }, 
            w: { n:"수호자의 성소", max:5, cd:[14, 14, 14, 14, 14], b:[0,0,0,0,0], ap:0.3, t:"UT", e:"heal_ms_shrine", rng:800, tt:"NT", mv:0 }, 
            e: { n:"신비한 차원문", max:5, cd:[18, 17, 16, 15, 14], b:[0,0,0,0,0], t:"UT", e:"magical_journey", rng:900, tt:"NT", mv:900 }, 
            r: { n:"운명의 소용돌이", max:3, req:[6, 11, 16], cd:[110, 90, 70], b:[0,0,0], t:"UT", e:"stasis_aoe", rng:3300, tt:"NT", mv:0 } 
        } }

};
var ChampionList = Object.keys(ChampionData);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💾 [3. 코어 모델 & 데이터베이스]
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var Database = {
    data: {}, inquiries: [], isLoaded: false,
    load: function() {
        if (this.isLoaded) return; 
        var file = new java.io.File(Config.DB_PATH);
        if (file.exists()) {
            try { 
                var d = JSON.parse(FileStream.read(Config.DB_PATH)); 
                this.data = d.users || {}; this.inquiries = d.inquiries || []; 
            } catch (e) { this.data = {}; this.inquiries = []; }
        }
        this.isLoaded = true;
    },
    save: function() {
        var currentData = JSON.stringify({ users: this.data, inquiries: this.inquiries }, null, 4);
        var tempPath = Config.DB_PATH + ".temp", realPath = Config.DB_PATH;
        new java.lang.Thread(new java.lang.Runnable({
            run: function() {
                try {
                    FileStream.write(tempPath, currentData);
                    var tempFile = new java.io.File(tempPath), realFile = new java.io.File(realPath);
                    if (tempFile.exists() && tempFile.length() > 0) {
                        if (realFile.exists()) realFile.delete();
                        tempFile.renameTo(realFile);
                    }
                } catch(e) {}
            }
        })).start();
    },
    createUser: function(sender, pw) {
        this.data[sender] = {
            pw: pw, name: sender, title: "뉴비", lp: 0, win: 0, lose: 0, level: 1, exp: 0, gold: 1000, point: 0,
            stats: { acc: 50, ref: 50, com: 50, int: 50 }, inventory: { titles: ["뉴비"], champions: [] }, items: { statReset: 0, nameChange: 0 }, banned: false
        };
        this.save();
    }
};

var SessionManager = {
    sessions: {}, isLoaded: false,
    init: function() {
        if (this.isLoaded) return;
        var file = new java.io.File(Config.SESSION_PATH);
        if (file.exists()) { try { this.sessions = JSON.parse(FileStream.read(Config.SESSION_PATH)); } catch (e) { this.sessions = {}; } }
        this.isLoaded = true;
    },
    save: function() {
        var currentData = JSON.stringify(this.sessions, null, 4);
        var tempPath = Config.SESSION_PATH + ".temp", realPath = Config.SESSION_PATH;
        new java.lang.Thread(new java.lang.Runnable({
            run: function() {
                try {
                    FileStream.write(tempPath, currentData);
                    var tempFile = new java.io.File(tempPath), realFile = new java.io.File(realPath);
                    if (tempFile.exists() && tempFile.length() > 0) {
                        if (realFile.exists()) realFile.delete();
                        tempFile.renameTo(realFile);
                    }
                } catch(e) {}
            }
        })).start();
    },
    getKey: function(room, sender) { return room + "_" + sender; },
    get: function(room, sender) {
        var key = this.getKey(room, sender);
        if (!this.sessions[key]) { this.sessions[key] = { screen: "IDLE", temp: {}, lastTime: Date.now() }; this.save(); }
        return this.sessions[key];
    },
    checkTimeout: function(room, sender, replier) {
        var key = this.getKey(room, sender), s = this.get(room, sender);
        // 전투 중에는 세션 타임아웃을 넉넉하게 주거나 무시할 수 있지만 기본 로직 유지
        if (s && s.screen !== "IDLE" && (Date.now() - s.lastTime > Config.TIMEOUT_MS)) {
            var backupId = s.tempId; this.reset(room, sender);
            if(backupId) { this.sessions[key].tempId = backupId; this.save(); } 
            replier.reply(LayoutManager.renderFrame(ContentManager.title.notice, ContentManager.msg.timeout, false, ContentManager.footer.reStart));
            return true; 
        }
        return false;
    },
    reset: function(room, sender) {
        var key = this.getKey(room, sender);
        this.sessions[key] = { screen: "IDLE", temp: {}, lastTime: Date.now() };
        this.save();
    },
    startAutoTimer: function(room, sender) {
        var key = this.getKey(room, sender), s = this.sessions[key];
        if (!s || s.screen === "IDLE") return;
        s.lastTime = Date.now(); this.save();
        var targetTime = s.lastTime, timeLimit = Config.TIMEOUT_MS, roomStr = String(room);
        var msgStr = String(LayoutManager.renderFrame(ContentManager.title.notice, ContentManager.msg.timeout, false, ContentManager.footer.reStart));
        new java.lang.Thread(new java.lang.Runnable({
            run: function() {
                try {
                    java.lang.Thread.sleep(timeLimit);
                    var curSession = SessionManager.sessions[key];
                    if (curSession && curSession.screen !== "IDLE" && curSession.lastTime === targetTime) {
                        var backupId = curSession.tempId;
                        SessionManager.sessions[key] = { screen: "IDLE", temp: {}, lastTime: Date.now() };
                        if (backupId) SessionManager.sessions[key].tempId = backupId;
                        SessionManager.save();
                        Api.replyRoom(roomStr, msgStr);
                    }
                } catch (e) {}
            }
        })).start();
    }
};

SessionManager.init();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 [4. 코어 뷰 및 레이아웃 매니저]
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var ContentManager = {
    menus: {
        guest: ["1. 회원가입", "2. 로그인", "3. 운영진 문의"],
        main: ["1. 내 정보", "2. 컬렉션 확인", "3. 대전 모드", "4. 상점 이용", "5. 운영진 문의", "6. 로그아웃"],
        modeSelect: ["1. AI 대전", "2. 유저 PVP - (준비중)"],
        profileSub: ["1. 능력치 강화", "2. 능력치 초기화"],
        stats: ["1. 정확", "2. 반응", "3. 침착", "4. 직관"],
        shopMain: ["1. 아이템 상점", "2. 챔피언 상점"],
        shopItems: ["1. 닉네임 변경권 (500G)", "2. 스탯 초기화권 (1500G)"],
        adminUser: ["1. 정보 수정", "2. 데이터 초기화", "3. 계정 삭제", "4. 차단/해제"],
        adminEdit: ["1. 골드 수정", "2. LP 수정", "3. 레벨 수정"],
        yesNo: ["1. 예", "2. 아니오"],
        adminInqDetail: ["1. 답변 전송", "2. 문의 삭제"],
        getAdminMain: function(unreadCount) { return ["1. 시스템 정보", "2. 전체 유저", "3. 문의 관리" + (unreadCount > 0 ? " [" + unreadCount + "]" : "")]; }
    },
    adminMap: { editType: { "1": "gold", "2": "lp", "3": "level" }, editName: { "gold": "골드", "lp": "LP", "level": "레벨" }, actionName: { "2": "데이터 초기화", "3": "계정 삭제", "4": "차단/해제" } },
    screen: {
        gMain: "비회원 메뉴", joinId: "회원가입", joinPw: "비밀번호 설정", loginId: "로그인", loginPw: "로그인",
        inq: "문의 접수", main: "메인 로비", profile: "내 정보", statSel: "능력치 강화", statCon: "강화 확인",
        resetCon: "초기화 확인", col: "컬렉션", title: "보유 칭호", champ: "보유 챔피언", shop: "상점",
        shopItem: "아이템 상점", shopChamp: "챔피언 상점 (500G)", modeSel: "대전 모드 선택",
        aMain: "관리자 메뉴", aSys: "시스템 정보", aUser: "유저 목록", aActionCon: "작업 확인",
        aInqList: "문의 목록", aInqDet: "문의 상세", aInqRep: "답변 작성", aUserDetail: " 관리",
        aEditSel: "정보 수정", aEditIn: "값 수정", aEditCon: "수정 확인"
    },
    footer: {
        selectNum: "번호를 선택하세요.", inputId: "아이디 입력", inputPw: "비밀번호 입력", inputContent: "내용 입력",
        selectAction: "작업을 선택하세요.", selectStat: "강화할 스탯 선택", inputPoint: "투자할 포인트를 입력하세요.",
        inputTitle: "장착할 칭호 이름을 정확히 입력해 주세요.", checkList: "목록 확인 완료",
        selectCat: "상점 카테고리를 선택하세요.", inputBuyNum: "구매할 번호를 입력하세요.", inputHireNum: "구입할 번호를 입력하세요.",
        aSelectUser: "유저 번호 입력", aInputInq: "문의 번호 입력", aInputRep: "답변 내용을 입력하세요.",
        reStart: "다시 시작하려면 '메뉴'를 입력하세요.", sysNotify: "시스템 알림", wait: "잠시만 기다려주세요..."
    },
    title: { error: "오류", fail: "실패", success: "성공", complete: "완료", notice: "알림", sysError: "시스템 오류" },
    statMap: { keys: {"1":"acc", "2":"ref", "3":"com", "4":"int"}, names: {"1":"정확", "2":"반응", "3":"침착", "4":"직관"} },
    ui: { replyMark: "🔔 [운영진 답변 도착]", sender: "👤 보낸이: ", date: "📅 날짜: ", time: "⏰ 시간: ", read: " ✅ ", unread: " ⬜ ", datePrefix: "📅 [", dateSuffix: "]", pTarget: "👤 대상: ", pTitle: "🏅 칭호: [", pTier: "🏅 티어: ", pLp: "🏆 점수: ", pGold: "💰 골드: ", pRecord: "⚔️ 전적: ", pLevel: "🆙 레벨: Lv.", pExp: "🔷 경험: ", pStatH: " [ 상세 능력치 ]", pAcc: "🎯 정확: ", pRef: "⚡ 반응: ", pCom: "🧘 침착: ", pInt: "🧠 직관: ", pPoint: "✨ 포인트: " },
    msg: {
        welcome: "소환사의 협곡에 오신 것을 환영합니다.\n원하시는 기능을 선택해 주세요.",
        inputID_Join: "사용하실 아이디를 입력해 주세요.", inputID_Login: "로그인할 아이디를 입력해 주세요.", inputPW: "비밀번호를 입력해 주세요.",
        registerComplete: "가입이 완료되었습니다!\n자동으로 로그인됩니다.", loginFail: "정보가 일치하지 않습니다.",
        notEnoughGold: "골드가 부족합니다.", onlyNumber: "숫자만 입력해 주세요.",
        invalidLevel: "레벨은 1부터 " + MAX_LEVEL + "까지만 설정할 수 있습니다.",
        banned: "🚫 이용이 제한된 계정입니다.", inputNewVal: "새로운 값을 입력하세요.",
        noChamp: "🚫 보유 중인 챔피언이 없어 출전할 수 없습니다.\n먼저 상점에서 챔피언을 영입해 주세요.",
        pvpPrep: "랭크 게임은 현재 시스템 점검 중입니다.",
        cancel: "작업을 중단하고 대기 상태로 전환합니다.", timeout: "⌛ 세션이 만료되었습니다.",
        noPrevious: "이전 단계가 없습니다.", logout: "성공적으로 로그아웃되었습니다.",
        noItem: "보유 중인 스탯 초기화권이 없습니다.", statResetSuccess: "스탯이 초기화되었습니다.",
        noTitleError: "보유하지 않은 칭호입니다.", titleEquipSuccess: function(t) { return "칭호가 [" + t + "](으)로 변경되었습니다."; },
        buySuccess: function(item) { return item + " 구매 완료!"; },
        champFail: "이미 보유 중이거나 골드가 부족합니다.", champSuccess: function(c) { return c + "님이 합류했습니다!"; },
        statResetConfirm: function(count) { return "능력치를 초기화하시겠습니까?\n보유권: " + count + "개"; },
        statEnhanceConfirm: function(stat, amt) { return "[" + stat + "] 능력치를 " + amt + "만큼 강화하시겠습니까?"; },
        statEnhanceSuccess: function(stat, amt) { return stat + " 수치가 " + amt + " 상승했습니다."; },
        inqSubmitSuccess: "문의가 접수되었습니다.", notifyNewUser: function(id) { return "📢 [신규] " + id + "님 가입"; },
        notifyNewInq: function(sender) { return "🔔 새 문의: " + sender; },
        adminNoUser: "유저가 없습니다.", adminNoInq: "문의가 없습니다.",
        adminSysInfo: function(used, users, ver) { return "📟 메모리: " + used + "MB\n👥 유저: " + users + "명\n🛡️ 버전: " + ver; },
        adminEditConfirm: function(type, val) { return "[" + type + "] 수치를 " + val + "(으)로 수정하시겠습니까?"; },
        adminActionConfirm: function(action) { return "[" + action + "] 작업을 진행하시겠습니까?"; },
        adminCancel: "취소합니다.", adminInitSuccess: "초기화 완료.", adminDelSuccess: "계정 삭제 완료.", adminBanSuccess: "차단 상태 변경.",
        adminInqDelSuccess: "문의 삭제 완료.", adminReplySuccess: "답변 전송 완료.", adminEditSuccess: "수정 완료.", adminEditCancel: "수정 취소.",
        adminNotifyInit: "계정 초기화됨.", adminNotifyDelete: "계정 삭제됨.", adminNotifyBan: "차단됨.", adminNotifyUnban: "차단 해제됨.",
        adminNotifyEdit: function(type, val) { return "[" + type + "] " + val + "(으)로 수정됨."; },
        sysErrorLog: function(e) { return ["⛔ 오류 발생!", "💬 내용: " + e.message].join("\n"); }
    }
};

var LayoutManager = {
    renderFrame: function(title, content, showNav, footer) {
        var div = Utils.getFixedDivider();
        var res = "『 " + title + " 』\n" + div + "\n" + Utils.wrapText(content);
        if (showNav === true) res += "\n" + div + "\n[ ◀이전 | ✖취소 | 🏠메뉴 ]";
        else if (Array.isArray(showNav)) res += "\n" + div + "\n[ " + showNav.join(" | ") + " ]";
        if (footer) res += "\n" + div + "\n💡 " + Utils.wrapText(footer).replace(/\n/g, "\n   ");
        return res;
    },
    renderAlert: function(title, content) { return this.renderFrame(title, content, false, ContentManager.footer.wait); },
    renderProfileHead: function(data, targetName) {
        var div = Utils.getFixedDivider(), u = ContentManager.ui, tier = Utils.getTierInfo(data.lp);
        var win = data.win || 0, lose = data.lose || 0, total = win + lose, winRate = total === 0 ? 0 : Math.floor((win / total) * 100);
        var st = data.stats, expDisplay = (data.level >= MAX_LEVEL) ? "MAX" : data.exp + "/" + (data.level * 100);
        return [
            u.pTarget + targetName + (data.banned ? " [🚫차단]" : ""), u.pTitle + data.title + "]", div,
            u.pTier + tier.icon + tier.name, u.pLp + data.lp + " LP", u.pGold + (data.gold || 0).toLocaleString() + " G",
            u.pRecord + win + "승 " + lose + "패 (" + winRate + "%)", u.pLevel + data.level, u.pExp + expDisplay + ")", div,
            u.pStatH, u.pAcc + st.acc, u.pRef + st.ref, u.pCom + st.com, u.pInt + st.int, div, u.pPoint + (data.point || 0) + " P"
        ].join("\n");
    },
    templates: {
        menuList: function(subtitle, items) { return " " + (items || []).join("\n "); },
        inputRequest: function(subtitle, currentVal, info) { return [" 현재 상태 : " + currentVal, " " + info, "", " 값을 입력하세요."].join("\n"); }
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚔️ [5. 독립 모듈] LCK 전투 시스템 (전투/파밍 기록 분리 & 타격 횟수 연산)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var BattleSystem = {
    
    // 🎙️ [5-1. 디렉터] 상황 연출 (LCK 중계진)
    Director: {
        Templates: {
            Aggressive: {
                MildTrade: [
                    "🎙️ 캐스터: 가벼운 딜교환이 오갑니다. 양 선수 모두 깊게 들어가진 않네요.",
                    "🎙️ 해설: 툭툭 건드려보는 {myChamp}! 상대의 반응을 살피는 탐색전입니다."
                ],
                Kiting: [
                    "🎙️ 캐스터: 아~ {myChamp}! 거리 재기 예술입니다! {aiChamp} 선수는 닿질 않아요!",
                    "🎙️ 해설: 이게 바로 사거리의 폭력이죠!! {aiChamp}가 다가가려 해보지만 체력만 떨어집니다!"
                ],
                Assassinate: [
                    "🎙️ 해설: 승부수 띄우나요!! 아아앗! 들어갑니다!! {myChamp}가 순식간에 파고들어서 명치에 콤보를 꽂습니다!",
                    "🎙️ 캐스터: 사거리 불리함을 완벽한 진입 타이밍으로 극복해내는 {myChamp}!"
                ],
                Bloodbath: [
                    "🎙️ 캐스터: 자, 라인 한가운데서 영혼의 맞다이!! 서로 뺄 생각이 없어요!! 엄청난 난타전입니다!",
                    "🎙️ 해설: 유혈사태 발생!! 서로 묵직한 카운터로 맞불을 놓으며 살을 내주고 뼈를 취합니다!"
                ],
                Countered: [
                    "🎙️ 해설: 아~~ {myChamp} 선수, 딜교환 설계가 꼬였습니다! {aiChamp}가 매섭게 역공을 가합니다!",
                    "🎙️ 캐스터: 이거 뼈아픈데요! 공격이 빗나간 틈을 타 역으로 완벽한 카운터를 맞았습니다!"
                ],
                MissAll: [
                    "🎙️ 캐스터: 두 선수 모두 화려한 무빙을 보여주지만 유효타는 없는 평화로운 협곡입니다."
                ]
            },
            Defensive: {
                NormalFarm: [
                    "🎙️ 해설: {myChamp} 선수, 무리하지 않고 안정적으로 미니언을 챙기고 있습니다.",
                    "🎙️ 캐스터: 네, 지금은 서로 CS에 집중하는 타이밍이죠. 조용한 라인전이 이어집니다."
                ],
                PerfectCS: ["🎙️ 해설: 야~ {myChamp} 선수 침착함 보세요! 살벌한 견제 속에서도 미니언 막타만 쏙쏙 빼먹습니다!"],
                CannonMissed: ["🎙️ 해설: 아아아!! 대포 미니언!! {myChamp} 선수 대포를 놓쳤어요!! 이거 뼈아프거든요!!"],
                GreedyCS: ["🎙️ 해설: 아! 대포 미니언은 못 참거든요!! CS를 챙기는 틈을 타 {aiChamp}가 딜교환을 강제합니다!"],
                ZonedOut: ["🎙️ 캐스터: 아~ {aiChamp}의 라인 장악력이 숨 막힙니다! {myChamp} 선수가 미니언 근처도 못 가고 있어요!"],
                Disaster: ["🎙️ 해설: 이건 최악의 구도입니다!! 파밍도 놓치고 견제는 다 맞았어요! 주도권이 넘어갑니다!"]
            }
        },
        generateLog: function(ctx) {
            var pool = [];
            var totalDmg = ctx.mDmg + ctx.aDmg; 
            if (ctx.strat === 1) { 
                if (ctx.myHit && !ctx.aiHit) pool = (ctx.rangeDiff > 0) ? this.Templates.Aggressive.Kiting : this.Templates.Aggressive.Assassinate;
                else if (ctx.myHit && ctx.aiHit) pool = (totalDmg < 50) ? this.Templates.Aggressive.MildTrade : this.Templates.Aggressive.Bloodbath;
                else if (!ctx.myHit && ctx.aiHit) pool = this.Templates.Aggressive.Countered;
                else pool = this.Templates.Aggressive.MissAll;
            } else if (ctx.strat === 2) {
                if (ctx.isCannonPhase && !ctx.gotCannon) pool = this.Templates.Defensive.CannonMissed;
                else {
                    if (!ctx.aiHit && ctx.csPercent >= 80) pool = (totalDmg < 20) ? this.Templates.Defensive.NormalFarm : this.Templates.Defensive.PerfectCS;
                    else if (ctx.aiHit && ctx.csPercent >= 60) pool = this.Templates.Defensive.GreedyCS;
                    else if (!ctx.aiHit && ctx.csPercent < 60) pool = this.Templates.Defensive.ZonedOut;
                    else pool = this.Templates.Defensive.Disaster;
                }
            } else return "🏠 우물로 귀환하여 전열을 가다듬습니다. {aiChamp}가 그 틈을 타 미니언을 타워에 밀어넣습니다.".replace("{aiChamp}", ctx.aiChamp);
            return pool[Math.floor(Math.random() * pool.length)].replace(/{myChamp}/g, ctx.myChamp).replace(/{aiChamp}/g, ctx.aiChamp);
        }
    },

    // ⚙️ [5-2. 엔진] (타격 횟수 난수 및 로그 완전 분리)
    Engine: {
        generateAI: function() {
            var rChamp = ChampionList[Math.floor(Math.random() * ChampionList.length)];
            var aiStats = { acc: 40+Math.random()*40, ref: 40+Math.random()*40, com: 40+Math.random()*40, int: 40+Math.random()*40 };
            return { champion: rChamp, stats: { acc: Math.floor(aiStats.acc), ref: Math.floor(aiStats.ref), com: Math.floor(aiStats.com), int: Math.floor(aiStats.int) } };
        },
        calcProb: function(base, myStat, enStat, bonus) { return Math.max(10, Math.min(90, base + (myStat - enStat) * 0.5 + (bonus || 0))); },
        calcDmg: function(atk, def) {
            var effDef = Math.max(0, def.def * (1 - atk.arPenPer / 100) - atk.lethality);
            return Math.floor((atk.baseAd + atk.bonusAd) * (100 / (100 + effDef)));
        },
        playPhase: function(me, ai, stratMe, phaseIdx) {
            var stratAi = Math.floor(Math.random() * 2) + 1; 
            var mRawDmg = 0, aRawDmg = 0;

            // 주사위 판정
            var rangeDiff = me.hw.range - ai.hw.range;
            var myInit = (Math.random() * 100 <= this.calcProb(50, me.sw.int, ai.sw.int, rangeDiff / 10));
            var myHit = (Math.random() * 100 <= this.calcProb(50, me.sw.acc, ai.sw.ref, stratMe === 1 ? 10 : -10));
            var aiHit = (Math.random() * 100 <= this.calcProb(50, ai.sw.acc, me.sw.ref, stratAi === 1 ? 10 : -10));

            var comboMe = this.calcDmg(me.hw, ai.hw) * (stratMe === 1 ? 2.0 : 0.8);
            var comboAi = this.calcDmg(ai.hw, me.hw) * (stratAi === 1 ? 2.0 : 0.8);

            if (myHit && stratMe !== 3) aRawDmg += comboMe;
            if (aiHit && stratMe !== 3) mRawDmg += comboAi;

            // CS 연산
            var isCannonPhase = (phaseIdx === 2);
            var wave = { melee: 3, caster: 3, siege: isCannonPhase ? 1 : 0 };
            var mGold = 0, kMelee = 0, kCaster = 0, kSiege = 0;
            var csChance = this.calcProb(50, me.sw.com, ai.sw.int, (stratMe === 2 ? 30 : -20) + (aiHit ? -15 : 10));

            if (stratMe !== 3) {
                for(var m=0; m<wave.melee; m++) if(Math.random()*100 <= csChance) { kMelee++; mGold += 21; }
                for(var c=0; c<wave.caster; c++) if(Math.random()*100 <= csChance) { kCaster++; mGold += 14; }
                if(wave.siege > 0 && Math.random()*100 <= (csChance - 10)) { kSiege++; mGold += 60; }
            }
            var csPercent = ((kMelee + kCaster + kSiege) / (wave.melee + wave.caster + wave.siege)) * 100;

            // ⚔️ [신규] 전투 기록 분리 연산
            var combatLogs = [];
            var myHits = myHit ? Math.floor(Math.random() * 3) + 2 : 0; // 2~4대의 유효타 생성
            var aiHits = aiHit ? Math.floor(Math.random() * 3) + 2 : 0;

            if (stratMe === 3) {
                combatLogs.push("💤 전투 없음 (안전한 장소에서 귀환 대기중)");
            } else if (stratMe === 1) { // 공격 전략
                combatLogs.push(myInit ? "🔹 [" + me.champ + "]가 딜교환 주도권을 잡고 압박을 시작합니다." : "🔹 [" + ai.champ + "]의 기습적인 압박에 말려듭니다.");
                
                if (myHit && !aiHit) combatLogs.push("🎯 [일방적 딜교환] 상대의 방어를 뚫고 " + myHits + "대의 유효타를 꽂아 넣습니다.");
                else if (myHit && aiHit) combatLogs.push("⚔️ [치열한 난타전] 서로 물러서지 않고 타격을 교환합니다. (내 유효타: " + myHits + "회 / 적 유효타: " + aiHits + "회)");
                else if (!myHit && aiHit) combatLogs.push("💥 [역관광] 내 공격이 빗나간 틈을 타 적에게 스킬/평타 " + aiHits + "대를 허용합니다.");
                else combatLogs.push("💤 전투 없음 (서로 스킬을 날렸으나 무빙으로 모두 회피하며 유효타 0회)");
            } else if (stratMe === 2) { // 파밍 전략
                if (aiHit) combatLogs.push("💥 [일방적 견제 허용] 파밍을 하는 도중 적의 견제 스킬 " + aiHits + "대를 뼈아프게 맞습니다.");
                else combatLogs.push("💤 전투 없음 (서로 적당한 거리를 유지하며 대치합니다.)");
            }

            // 🌾 [신규] 파밍 기록 분리 연산
            var farmLogs = [];
            if (stratMe === 3) {
                farmLogs.push("❌ 라인을 비운 사이 적이 미니언 웨이브를 타워에 박아 넣습니다. (파밍 불가)");
            } else {
                var csLog = "💰 [CS 막타] 근거리 " + kMelee + "/3, 원거리 " + kCaster + "/3";
                if (isCannonPhase) csLog += (kSiege > 0) ? ", 대포 1/1" : ", ❌대포 놓침";
                farmLogs.push(csLog + " (총 " + mGold + "G)");

                if (stratMe === 1) farmLogs.push("⚠️ 딜교환에 집중하느라 CS의 막타를 다수 흘렸습니다.");
                else farmLogs.push("✨ 미니언 해체에 고도로 집중하며 안정적으로 라인을 당겨 먹습니다.");
            }

            // 유지력 연산
            var mRegen = me.hw.hpRegen * 6 + Math.floor(aRawDmg * (me.hw.omniVamp / 100));
            var aRegen = ai.hw.hpRegen * 6 + Math.floor(mRawDmg * (ai.hw.omniVamp / 100));
            if (stratMe === 3) mRegen = 9999; 
            
            var finalMDmg = Math.max(0, mRawDmg - mRegen);
            var finalADmg = Math.max(0, aRawDmg - aRegen);

            if (stratMe !== 3 && mRegen > 20) combatLogs.push("💚 [" + me.champ + "]의 유지력(체젠/흡혈) 발동! (+" + mRegen + " 회복)");

            // 디렉터 해설 생성
            var ctx = { strat: stratMe, myInit: myInit, myHit: myHit, aiHit: aiHit, rangeDiff: rangeDiff, csPercent: csPercent, isCannonPhase: isCannonPhase, gotCannon: (kSiege > 0), mDmg: mRawDmg, aDmg: aRawDmg, myChamp: me.champ, aiChamp: ai.champ };
            
            return { 
                lckLog: BattleSystem.Director.generateLog(ctx), 
                combatLogs: combatLogs.join("\n"), 
                farmLogs: farmLogs.join("\n"), 
                mDmg: Math.floor(finalMDmg), aDmg: Math.floor(finalADmg), gold: mGold 
            };
        }
    },

    // 🎨 [5-3. 뷰] LCK 현황판
    View: {
        Content: {
            screen: { match: "매칭중", matchFound: "매칭 완료", pick: "전투 준비", load: "로딩중", analyzed: "분석 완료" },
            msg: {
                find: "🔍 적합한 훈련 상대를 탐색하고 있습니다...\n\n[ 예상 대기 시간: 6초 ]", matchOk: "✅ 상대와 매칭되었습니다!\n전장에 참가할 준비중입니다.",
                loadRift: "⏳ 협곡의 지형과 데이터를 불러오는 중입니다...", pickIntro: "전장에 출전할 챔피언을 선택하세요.\n\n",
                analyze: function(u, uc, a, ac) { return "🎯 [ " + u + " ]\n🤖 챔피언: " + uc + "\n\n━━━━━━━ VS ━━━━━━━\n\n🎯 [ " + a + " ]\n🤖 챔피언: " + ac + "\n\n소환사의 협곡으로 이동합니다..."; }
            }
        },
        Board: {
            getBar: function(exp) { var fill = Math.floor(exp / 10); var bar = ""; for(var i=0; i<10; i++) bar += (i < fill) ? "█" : "░"; return bar; },
            render: function(state) {
                var isMe = (state.viewTab === "ME"); var t = isMe ? state.me : state.ai;
                var ui = "『 📊 라인전 현황판 [ " + state.turn + "턴 대기중 ] 』\n━━━━━━━━━━━━━━\n";
                ui += "[" + (isMe ? " 👤 내 정보 (" : " 🤖 적 정보 (") + t.champ + ") ]\n";
                ui += "🆙 Lv." + t.level + " [" + this.getBar(t.exp) + "] " + t.exp + "%\n";
                ui += "🩸 체력: " + t.hp + " / " + t.hw.hp + " (재생: +" + t.hw.hpRegen + ")\n";
                ui += "💧 마나: " + t.mp + " / " + t.hw.mp + "\n\n";
                ui += "⚔️ 핵심: AD " + (t.hw.baseAd + t.hw.bonusAd) + " | 방어 " + t.hw.def + " | 사거리 " + t.hw.range + "\n";
                ui += "💰 골드: " + t.gold + " G   🛡️ 멘탈: " + t.mental + "\n━━━━━━━━━━━━━━\n";
                var stratName = ["없음", "⚔️ 공격적인 라인전", "🛡️ 안정적인 파밍", "🏠 귀환 및 정비"][state.strat || 0];
                ui += "💡 [ 전략 수립 및 대기실 ]\n▶ 현재 선택: [ " + stratName + " ]\n\n[ 정보 탭 전환 ]\n0. " + (isMe ? "🤖 상대" : "👤 내") + " 정보 보기\n\n[ 이번 턴 전략 선택 ]\n1. 공격 2. 파밍 3. 귀환\n\n[ 턴 시작 ]\n4. ✅ 준비 완료\n\n[ ✖항복 (메뉴로) ]";
                return ui;
            }
        }
    },
    
    // 🎮 [5-4. 컨트롤러] 전투/파밍 로그 출력 분리
    Controller: {
        handle: function(msg, session, sender, replier, room, userData) {
            var vC = BattleSystem.View.Content;
            var bM = BattleSystem.Engine;
            if (!session.battle) session.battle = {};

            if (msg === "refresh_screen") {
                if (session.screen === "BATTLE_MATCHING") {
                    replier.reply(LayoutManager.renderFrame(vC.screen.match, vC.msg.find, false, "잠시만 기다려주세요..."));
                    var roomStr = String(room), sessionKey = SessionManager.getKey(String(room), String(sender));
                    var matchFoundUI = String(LayoutManager.renderFrame(vC.screen.matchFound, vC.msg.matchOk, false, "잠시만 기다려주세요..."));
                    var champs = userData.inventory.champions || [];
                    var pickList = champs.map(function(c, i) { return (i+1) + ". " + c + " (" + (ChampionData[c] ? ChampionData[c].role : "?") + ")"; }).join("\n");
                    var pickUI = String(LayoutManager.renderFrame(vC.screen.pick, vC.msg.pickIntro + pickList, true, "챔피언 번호 선택"));

                    new java.lang.Thread(new java.lang.Runnable({
                        run: function() {
                            try {
                                java.lang.Thread.sleep(4000); Api.replyRoom(roomStr, matchFoundUI);
                                java.lang.Thread.sleep(2000); 
                                var cS = SessionManager.sessions[sessionKey];
                                if (cS && cS.screen === "BATTLE_MATCHING") { cS.screen = "BATTLE_PICK"; SessionManager.save(); Api.replyRoom(roomStr, pickUI); }
                            } catch(e) {}
                        }
                    })).start();
                    return;
                }
                if (session.screen === "BATTLE_PICK") {
                    var champs = userData.inventory.champions || [];
                    var list = champs.map(function(c, i) { return (i+1) + ". " + c + " (" + (ChampionData[c] ? ChampionData[c].role : "?") + ")"; }).join("\n");
                    return replier.reply(LayoutManager.renderFrame(vC.screen.pick, vC.msg.pickIntro + list, true, "챔피언 번호 선택"));
                }
                if (session.screen === "BATTLE_MAIN") return replier.reply(BattleSystem.View.Board.render(session.battle.instance));
            }

            if (session.screen === "BATTLE_PICK") {
                var idx = parseInt(msg) - 1;
                var champs = userData.inventory.champions || [];
                if (champs && champs[idx]) {
                    session.battle.myChamp = champs[idx]; session.battle.enemy = bM.generateAI(); 
                    session.screen = "BATTLE_LOADING"; SessionManager.save();
                    replier.reply(LayoutManager.renderFrame(vC.screen.load, vC.msg.loadRift, false, "로딩중..."));
                    
                    var roomStr = String(room), sessionKey = SessionManager.getKey(String(room), String(sender));
                    var analyzedUI = String(LayoutManager.renderFrame(vC.screen.analyzed, vC.msg.analyze(userData.name || sender, session.battle.myChamp, "AI 소환사", session.battle.enemy.champion), false, "로딩중..."));
                    
                    new java.lang.Thread(new java.lang.Runnable({
                        run: function() {
                            try {
                                java.lang.Thread.sleep(3000); Api.replyRoom(roomStr, analyzedUI); 
                                java.lang.Thread.sleep(3000); 
                                var cS = SessionManager.sessions[sessionKey];
                                if (cS && cS.screen === "BATTLE_LOADING") {
                                    cS.screen = "BATTLE_MAIN"; 
                                    var mHw = JSON.parse(JSON.stringify(ChampionData[cS.battle.myChamp]));
                                    var aHw = JSON.parse(JSON.stringify(ChampionData[cS.battle.enemy.champion]));
                                    cS.battle.instance = {
                                        viewTab: "ME", turn: 1, strat: 0,
                                        me: { champ: cS.battle.myChamp, level: 1, exp: 0, hp: mHw.hp, mp: mHw.mp, gold: 0, mental: 100, hw: mHw, sw: userData.stats },
                                        ai: { champ: cS.battle.enemy.champion, level: 1, exp: 0, hp: aHw.hp, mp: aHw.mp, gold: 0, mental: 100, hw: aHw, sw: cS.battle.enemy.stats }
                                    };
                                    SessionManager.save(); Api.replyRoom(roomStr, BattleSystem.View.Board.render(cS.battle.instance)); 
                                }
                            } catch(e) {}
                        }
                    })).start();
                    return; 
                } 
            }

            if (session.screen === "BATTLE_MAIN") {
                var state = session.battle.instance;
                if (msg === "0") { state.viewTab = (state.viewTab === "ME") ? "ENEMY" : "ME"; return replier.reply(BattleSystem.View.Board.render(state)); }
                if (msg === "1" || msg === "2" || msg === "3") { state.strat = parseInt(msg); return replier.reply(BattleSystem.View.Board.render(state)); }
                if (msg === "항복" || msg === "취소") {
                    SessionManager.reset(room, sender); var newS = SessionManager.get(room, sender); newS.tempId = session.tempId; SessionManager.save();
                    return SystemAction.go(replier, "항복", "전투를 포기하고 로비로 돌아갑니다.", function(){ UserController.handle("refresh_screen", newS, sender, replier, room); });
                }

                if (msg === "4") {
                    if (state.strat === 0) return replier.reply("⚠️ 전략을 먼저 선택하세요! (1, 2, 3)");
                    
                    var stratMe = state.strat; state.strat = 0; 
                    var roomStr = String(room);
                    var sessionKey = SessionManager.getKey(roomStr, String(sender));

                    replier.reply("『 ⚔️ " + state.turn + "턴 LCK 교전 중계 시작 』\n━━━━━━━━━━━━━━\n(약 10초 간격으로 현장 상황이 중계됩니다.)");

                    new java.lang.Thread(new java.lang.Runnable({
                        run: function() {
                            try {
                                var cS = SessionManager.sessions[sessionKey];
                                var st = cS.battle.instance;
                                var turnTotalGold = 0;
                                var isGameOver = false;

                                for (var i = 1; i <= 3; i++) {
                                    java.lang.Thread.sleep(10000);
                                    if (isGameOver) break;

                                    var p = bM.playPhase(st.me, st.ai, stratMe, i);
                                    st.me.hp -= p.mDmg; st.ai.hp -= p.aDmg; 
                                    st.me.gold += p.gold; turnTotalGold += p.gold;
                                    
                                    if (st.me.hp > st.me.hw.hp) st.me.hp = st.me.hw.hp;
                                    if (st.ai.hp > st.ai.hw.hp) st.ai.hp = st.ai.hw.hp;

                                    var mentalLog = "";
                                    if (st.me.hp <= 0) { st.me.mental -= 20; st.me.hp = st.me.hw.hp; mentalLog = "\n☠️ 유저가 솔로 킬을 당했습니다! (멘탈 -20)"; isGameOver = true; }
                                    if (st.ai.hp <= 0) { st.ai.mental -= 20; st.ai.hp = st.ai.hw.hp; mentalLog = "\n🔥 유저가 적을 솔로 킬 냈습니다! (적 멘탈 -20)"; isGameOver = true; }

                                    // 📝 [수정] 4단 분리 출력 포맷팅 (해설 / 전투 / 파밍 / 수치)
                                    var phaseMsg = "『 ⏱️ [ " + i + "페이즈 ] 현장 중계 』\n━━━━━━━━━━━━━━\n";
                                    phaseMsg += p.lckLog + mentalLog + "\n\n";
                                    phaseMsg += "⚔️ [ 전투 기록 ]\n" + p.combatLogs + "\n\n";
                                    phaseMsg += "🌾 [ 파밍 기록 ]\n" + p.farmLogs + "\n\n";
                                    phaseMsg += "📊 [ 수치 변화 ]\n";
                                    phaseMsg += "🩸 나: -" + p.mDmg + " HP / 🤖 적: -" + p.aDmg + " HP\n";
                                    phaseMsg += "💰 획득 골드: +" + p.gold + " G";

                                    Api.replyRoom(roomStr, phaseMsg);
                                }

                                java.lang.Thread.sleep(4000); 

                                if (st.me.mental <= 0 || st.ai.mental <= 0 || st.turn >= 18) {
                                    var isWin = (st.ai.mental <= 0) || (st.me.mental > st.ai.mental);
                                    var reward = isWin ? 150 : 50;
                                    userData.gold += reward; Database.save();
                                    
                                    Api.replyRoom(roomStr, "━━━━━━━━━━━━━━\n🏆 [ 게임 종료! ]\n" + (isWin ? "승리했습니다!" : "패배했습니다...") + "\n보상 골드: +" + reward + "G\n(잠시 후 메인 로비로 돌아갑니다.)");
                                    
                                    SessionManager.reset(roomStr, String(sender)); 
                                    var endS = SessionManager.get(roomStr, String(sender)); endS.tempId = cS.tempId; SessionManager.save();
                                    java.lang.Thread.sleep(2000);
                                    return UserController.handle("refresh_screen", endS, sender, {reply: function(msg){ Api.replyRoom(roomStr, msg); }}, roomStr);
                                }

                                var expGain = 0;
                                if (stratMe === 3) expGain = 0; 
                                else if (stratMe === 2 && turnTotalGold <= 100) expGain = 70; 
                                else expGain = 100; 

                                st.me.exp += expGain;
                                if (st.me.exp >= 100) { st.me.level++; st.me.exp -= 100; st.me.hw.baseAd += 3; st.me.hw.hp += 80; st.me.hp += 80; }
                                
                                st.ai.exp += 100;
                                if (st.ai.exp >= 100) { st.ai.level++; st.ai.exp -= 100; st.ai.hw.baseAd += 4; st.ai.hw.hp += 90; st.ai.hp += 90; }

                                st.turn++; st.viewTab = "ME";
                                SessionManager.save();
                                
                                Api.replyRoom(roomStr, BattleSystem.View.Board.render(st));

                            } catch(e) {}
                        }
                    })).start();
                    return;
                }
            }
            if (session.screen === "BATTLE_MATCHING" || session.screen === "BATTLE_LOADING") return replier.reply(ContentManager.footer.wait);
        }
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🕹️ [6. 시스템 유틸 & 컨트롤러 연결]
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
var SystemAction = {
    go: function(replier, title, msg, nextFunc) {
        replier.reply(LayoutManager.renderAlert(title, msg));
        java.lang.Thread.sleep(1200); 
        if (nextFunc) nextFunc();
    }
};

var AuthController = { /* 기존 생략: 위 1번 블록과 동일하게 동작합니다. 글자수 제한으로 줄이지 않고 원본 유지됨 */
    handle: function(msg, session, sender, replier, room) {
        var s = ContentManager.screen, f = ContentManager.footer, m = ContentManager.msg, t = ContentManager.title;
        if (msg === "refresh_screen") {
            if (session.screen === "IDLE" || session.screen === "GUEST_MAIN") {
                session.screen = "GUEST_MAIN"; return replier.reply(LayoutManager.renderFrame(s.gMain, LayoutManager.templates.menuList(null, ContentManager.menus.guest), false, f.selectNum)); 
            }
            if (session.screen === "JOIN_ID") return replier.reply(LayoutManager.renderFrame(s.joinId, m.inputID_Join, true, f.inputId));
            if (session.screen === "JOIN_PW") return replier.reply(LayoutManager.renderFrame(s.joinPw, m.inputPW, true, f.inputPw));
            if (session.screen === "LOGIN_ID") return replier.reply(LayoutManager.renderFrame(s.loginId, m.inputID_Login, true, f.inputId));
            if (session.screen === "LOGIN_PW") return replier.reply(LayoutManager.renderFrame(s.loginPw, m.inputPW, true, f.inputPw));
            if (session.screen === "GUEST_INQUIRY") return replier.reply(LayoutManager.renderFrame(s.inq, "운영진에게 보낼 내용을 입력하세요.", true, f.inputContent));
        }
        if (session.screen === "GUEST_MAIN") {
            if (msg === "1") { session.screen = "JOIN_ID"; return AuthController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "2") { session.screen = "LOGIN_ID"; return AuthController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "3") { session.screen = "GUEST_INQUIRY"; return AuthController.handle("refresh_screen", session, sender, replier, room); }
        }
        if (session.screen === "JOIN_ID") {
            if (msg.length > 10) return SystemAction.go(replier, t.error, "아이디는 10자 이내여야 합니다.", function(){ AuthController.handle("refresh_screen", session, sender, replier, room); });
            if (Database.data[msg]) return SystemAction.go(replier, t.error, "이미 존재하는 아이디입니다.", function(){ AuthController.handle("refresh_screen", session, sender, replier, room); });
            session.temp.id = msg; session.screen = "JOIN_PW"; return AuthController.handle("refresh_screen", session, sender, replier, room);
        }
        if (session.screen === "JOIN_PW") {
            Database.createUser(session.temp.id, msg); session.tempId = session.temp.id; session.screen = "MAIN"; SessionManager.save(); 
            return SystemAction.go(replier, t.success, m.registerComplete, function() { UserController.handle("refresh_screen", session, sender, replier, room); });
        }
        if (session.screen === "LOGIN_ID") {
            if (!Database.data[msg]) return SystemAction.go(replier, t.error, "존재하지 않는 아이디입니다.", function(){ AuthController.handle("refresh_screen", session, sender, replier, room); });
            session.temp.id = msg; session.screen = "LOGIN_PW"; return AuthController.handle("refresh_screen", session, sender, replier, room);
        }
        if (session.screen === "LOGIN_PW") {
            if (Database.data[session.temp.id] && Database.data[session.temp.id].pw === msg) {
                session.tempId = session.temp.id; session.screen = "MAIN"; SessionManager.save(); 
                return SystemAction.go(replier, t.success, session.tempId + "님 환영합니다!", function() { UserController.handle("refresh_screen", session, sender, replier, room); });
            } else return SystemAction.go(replier, t.fail, m.loginFail, function(){ AuthController.handle("refresh_screen", session, sender, replier, room); });
        }
        if (session.screen === "GUEST_INQUIRY") {
            Database.inquiries.push({ sender: "비회원(" + sender + ")", room: room, content: msg, time: Utils.get24HTime(), read: false }); Database.save(); SessionManager.reset(room, sender);
            return SystemAction.go(replier, t.complete, m.inqSubmitSuccess, function(){ AuthController.handle("refresh_screen", SessionManager.get(room, sender), sender, replier, room); });
        }
    }
};

var UserController = {
    handle: function(msg, session, sender, replier, room) {
        var data = Database.data[session.tempId]; 
        var s = ContentManager.screen, f = ContentManager.footer, m = ContentManager.msg, t = ContentManager.title;
        
        if (data) {
            var needSave = false;
            if (!data.items) { data.items = { statReset: 0, nameChange: 0 }; needSave = true; }
            if (!data.inventory) { data.inventory = { titles: ["뉴비"], champions: [] }; needSave = true; }
            if (!data.inventory.champions) { data.inventory.champions = []; needSave = true; }
            if (!data.inventory.titles) { data.inventory.titles = ["뉴비"]; needSave = true; }
            if (needSave) Database.save();
        }
        
        if (!data) return AuthController.handle(msg, session, sender, replier, room);
        if (data.banned) return replier.reply(LayoutManager.renderFrame(t.notice, m.banned, false, null));

        if (msg === "refresh_screen") {
            if (session.screen === "MAIN") return replier.reply(LayoutManager.renderFrame(s.main, LayoutManager.templates.menuList(null, ContentManager.menus.main), false, f.selectNum));
            if (session.screen === "MODE_SELECT") return replier.reply(LayoutManager.renderFrame(s.modeSel, LayoutManager.templates.menuList(null, ContentManager.menus.modeSelect), true, f.selectNum));
            if (session.screen === "PROFILE_MAIN") {
                var head = LayoutManager.renderProfileHead(data, session.tempId);
                return replier.reply(LayoutManager.renderFrame(s.profile, head + "\n" + Utils.getFixedDivider() + "\n" + LayoutManager.templates.menuList(null, ContentManager.menus.profileSub), true, f.selectAction));
            }
            if (session.screen === "STAT_SELECT") return replier.reply(LayoutManager.renderFrame(s.statSel, LayoutManager.templates.menuList(null, ContentManager.menus.stats), true, f.selectStat));
            if (session.screen === "STAT_RESET_CONFIRM") return replier.reply(LayoutManager.renderFrame(s.resetCon, m.statResetConfirm(data.items.statReset || 0) + "\n\n" + LayoutManager.templates.menuList(null, ContentManager.menus.yesNo), true, f.selectNum));
            if (session.screen === "STAT_INPUT") return replier.reply(LayoutManager.renderFrame(session.temp.statName + " 강화", LayoutManager.templates.inputRequest(null, data.stats[session.temp.statKey], "보유 포인트: " + data.point + " P"), true, f.inputPoint));
            if (session.screen === "STAT_INPUT_CONFIRM") return replier.reply(LayoutManager.renderFrame(s.statCon, m.statEnhanceConfirm(session.temp.statName, session.temp.statAmt) + "\n\n" + LayoutManager.templates.menuList(null, ContentManager.menus.yesNo), true, f.selectNum));
            if (session.screen === "COLLECTION_MAIN") return replier.reply(LayoutManager.renderFrame(s.col, LayoutManager.templates.menuList(null, ["1. 보유 칭호", "2. 보유 챔피언"]), true, f.selectNum));
            if (session.screen === "TITLE_EQUIP") return replier.reply(LayoutManager.renderFrame(s.title, "👑 현재 칭호: [" + data.title + "]\n" + Utils.getFixedDivider() + "\n" + data.inventory.titles.map(function(t, i) { return (i+1) + ". " + t + (t === data.title ? " [장착중]" : ""); }).join("\n"), true, f.inputTitle));
            if (session.screen === "CHAMP_LIST") return replier.reply(LayoutManager.renderFrame(s.champ, "📊 수집 챔피언: " + data.inventory.champions.length + "명\n" + Utils.getFixedDivider() + "\n" + ((data.inventory.champions.length > 0) ? data.inventory.champions.map(function(c, i){ return (i+1) + ". " + c; }).join("\n") : "보유 챔피언 없음"), true, f.checkList));
            if (session.screen === "SHOP_MAIN") return replier.reply(LayoutManager.renderFrame(s.shop, LayoutManager.templates.menuList(null, ContentManager.menus.shopMain), true, f.selectCat));
            if (session.screen === "SHOP_ITEMS") return replier.reply(LayoutManager.renderFrame(s.shopItem, "💰 보유 골드: " + (data.gold || 0).toLocaleString() + " G\n" + Utils.getFixedDivider() + "\n" + LayoutManager.templates.menuList(null, ContentManager.menus.shopItems), true, f.inputBuyNum));
            if (session.screen === "SHOP_CHAMPS") return replier.reply(LayoutManager.renderFrame(s.shopChamp, "💰 보유 골드: " + (data.gold || 0).toLocaleString() + " G\n" + Utils.getFixedDivider() + "\n" + ChampionList.map(function(c, i){ return (i+1) + ". " + c + (data.inventory.champions.indexOf(c)!==-1?" [보유]":""); }).join("\n"), true, f.inputHireNum));
            if (session.screen === "USER_INQUIRY") return replier.reply(LayoutManager.renderFrame(s.inq, "운영진에게 보낼 내용을 입력해 주세요.", true, f.inputContent));
        }

        if (session.screen === "MAIN") {
            if (msg === "1") { session.screen = "PROFILE_MAIN"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "2") { session.screen = "COLLECTION_MAIN"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "3") { session.screen = "MODE_SELECT"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "4") { session.screen = "SHOP_MAIN"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "5") { session.screen = "USER_INQUIRY"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "6") { 
                var backupId = session.tempId; SessionManager.reset(room, sender); 
                return SystemAction.go(replier, t.notice, m.logout, function() { AuthController.handle("refresh_screen", SessionManager.get(room, sender), sender, replier, room); });
            }
        }
        
        if (session.screen === "MODE_SELECT") {
            if (msg === "1") {
                if (data.inventory.champions.length === 0) return SystemAction.go(replier, t.fail, m.noChamp, function() { session.screen = "MAIN"; UserController.handle("refresh_screen", session, sender, replier, room); });
                session.screen = "BATTLE_MATCHING"; SessionManager.save();
                return BattleSystem.Controller.handle("refresh_screen", session, sender, replier, room, data);
            }
            if (msg === "2") return SystemAction.go(replier, t.notice, m.pvpPrep, function() { UserController.handle("refresh_screen", session, sender, replier, room); });
        }

        if (session.screen === "PROFILE_MAIN") {
            if (msg === "1") { session.screen = "STAT_SELECT"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "2") { session.screen = "STAT_RESET_CONFIRM"; return UserController.handle("refresh_screen", session, sender, replier, room); }
        }

        if (session.screen === "STAT_RESET_CONFIRM") {
            if (msg === "1") {
                if ((data.items.statReset || 0) <= 0) return SystemAction.go(replier, t.error, m.noItem, function() { UserController.handle("refresh_screen", session, sender, replier, room); });
                data.items.statReset -= 1; data.stats = { acc: 50, ref: 50, com: 50, int: 50 }; data.point = (data.level - 1) * POINT_PER_LEVEL; Database.save();
                return SystemAction.go(replier, t.success, m.statResetSuccess, function() { session.screen = "PROFILE_MAIN"; UserController.handle("refresh_screen", session, sender, replier, room); });
            } else if (msg === "2") { return SystemAction.go(replier, t.notice, m.adminCancel, function() { session.screen = "PROFILE_MAIN"; UserController.handle("refresh_screen", session, sender, replier, room); }); }
        }

        if (session.screen === "STAT_SELECT") {
            if (ContentManager.statMap.keys[msg]) {
                session.temp.statKey = ContentManager.statMap.keys[msg]; session.temp.statName = ContentManager.statMap.names[msg]; 
                session.screen = "STAT_INPUT"; return UserController.handle("refresh_screen", session, sender, replier, room);
            }
        }

        if (session.screen === "STAT_INPUT") {
            var amt = parseInt(msg);
            if (isNaN(amt) || amt <= 0) return SystemAction.go(replier, t.error, m.onlyNumber, function() { UserController.handle("refresh_screen", session, sender, replier, room); }); 
            if (data.point < amt) return SystemAction.go(replier, t.fail, "포인트가 부족합니다.", function() { UserController.handle("refresh_screen", session, sender, replier, room); });
            session.temp.statAmt = amt; session.screen = "STAT_INPUT_CONFIRM"; return UserController.handle("refresh_screen", session, sender, replier, room);
        }
        
        if (session.screen === "STAT_INPUT_CONFIRM") {
            if (msg === "1") {
                var amt = session.temp.statAmt;
                if (data.point < amt) return SystemAction.go(replier, t.fail, "포인트 부족", function() { session.screen = "STAT_SELECT"; UserController.handle("refresh_screen", session, sender, replier, room); });
                data.point -= amt; data.stats[session.temp.statKey] += amt; Database.save(); 
                return SystemAction.go(replier, t.success, m.statEnhanceSuccess(session.temp.statName, amt), function() { session.screen = "STAT_SELECT"; UserController.handle("refresh_screen", session, sender, replier, room); });
            } else if (msg === "2") { return SystemAction.go(replier, t.notice, m.adminCancel, function() { session.screen = "STAT_SELECT"; UserController.handle("refresh_screen", session, sender, replier, room); }); }
        }

        if (session.screen === "COLLECTION_MAIN") {
             if (msg === "1") { session.screen = "TITLE_EQUIP"; return UserController.handle("refresh_screen", session, sender, replier, room); }
             if (msg === "2") { session.screen = "CHAMP_LIST"; return UserController.handle("refresh_screen", session, sender, replier, room); }
        }
        if (session.screen === "TITLE_EQUIP") {
            if (data.inventory.titles.indexOf(msg) === -1) return SystemAction.go(replier, t.error, m.noTitleError, function() { UserController.handle("refresh_screen", session, sender, replier, room); });
            data.title = msg; Database.save();
            return SystemAction.go(replier, t.complete, m.titleEquipSuccess(msg), function() { session.screen = "COLLECTION_MAIN"; UserController.handle("refresh_screen", session, sender, replier, room); });
        }

        if (session.screen === "SHOP_MAIN") {
            if (msg === "1") { session.screen = "SHOP_ITEMS"; return UserController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "2") { session.screen = "SHOP_CHAMPS"; return UserController.handle("refresh_screen", session, sender, replier, room); }
        }
        if (session.screen === "SHOP_ITEMS") {
            var p = 0, n = "", act = "";
            if (msg === "1") { p = 500; n = "닉네임 변경권"; act = "name"; } else if (msg === "2") { p = 1500; n = "스탯 초기화권"; act = "reset"; }
            if (p > 0) {
                if (data.gold < p) return SystemAction.go(replier, t.fail, m.notEnoughGold, function(){ UserController.handle("refresh_screen", session, sender, replier, room); });
                data.gold -= p; if (act === "reset") data.items.statReset = (data.items.statReset || 0) + 1; if (act === "name") data.items.nameChange = (data.items.nameChange || 0) + 1; Database.save();
                return SystemAction.go(replier, t.success, m.buySuccess(n), function(){ session.screen = "SHOP_MAIN"; UserController.handle("refresh_screen", session, sender, replier, room); });
            }
        }
        if (session.screen === "SHOP_CHAMPS") {
            var idx = parseInt(msg) - 1;
            if (ChampionList[idx]) {
                var target = ChampionList[idx];
                if (data.inventory.champions.indexOf(target) !== -1 || data.gold < 500) return SystemAction.go(replier, t.fail, m.champFail, function(){ UserController.handle("refresh_screen", session, sender, replier, room); });
                data.gold -= 500; data.inventory.champions.push(target); Database.save();
                return SystemAction.go(replier, t.success, m.champSuccess(target), function(){ session.screen = "SHOP_MAIN"; UserController.handle("refresh_screen", session, sender, replier, room); });
            }
        }

        if (session.screen === "USER_INQUIRY") {
            Database.inquiries.push({ sender: session.tempId, room: room, content: msg, time: Utils.get24HTime(), read: false }); Database.save(); session.screen = "MAIN";
            return SystemAction.go(replier, t.complete, m.inqSubmitSuccess, function() { UserController.handle("refresh_screen", session, sender, replier, room); });
        }
    }
};

var AdminController = { /* 기존 생략: Admin 코어 유지 (글자수 제한으로 원문 형태 그대로 유지합니다.) */
    handle: function(msg, session, sender, replier, room) {
        var s = ContentManager.screen, f = ContentManager.footer, m = ContentManager.msg, t = ContentManager.title, ui = ContentManager.ui;
        if (msg === "refresh_screen") {
            if (session.screen === "IDLE" || session.screen === "ADMIN_MAIN") {
                session.screen = "ADMIN_MAIN"; var unreadCount = Database.inquiries.filter(function(iq){ return !iq.read; }).length;
                return replier.reply(LayoutManager.renderFrame(s.aMain, LayoutManager.templates.menuList(null, ContentManager.menus.getAdminMain(unreadCount)), false, f.selectNum));
            }
            if (session.screen === "ADMIN_SYS_INFO") {
                var rt = java.lang.Runtime.getRuntime(), used = Math.floor((rt.totalMemory() - rt.freeMemory()) / 1024 / 1024);
                return replier.reply(LayoutManager.renderFrame(s.aSys, m.adminSysInfo(used, Object.keys(Database.data).length, Config.Version), true, "확인 완료"));
            }
            if (session.screen === "ADMIN_USER_SELECT") {
                var users = Object.keys(Database.data);
                if (users.length === 0) return SystemAction.go(replier, t.notice, m.adminNoUser, function(){ session.screen = "ADMIN_MAIN"; AdminController.handle("refresh_screen", session, sender, replier, room); });
                session.temp.userList = users; var listText = users.map(function(u, i) { return (i+1) + ". " + u; }).join("\n");
                return replier.reply(LayoutManager.renderFrame(s.aUser, listText, true, f.selectNum));
            }
            if (session.screen === "ADMIN_USER_DETAIL") {
                var head = LayoutManager.renderProfileHead(Database.data[session.temp.targetUser], session.temp.targetUser);
                return replier.reply(LayoutManager.renderFrame(session.temp.targetUser + s.aUserDetail, head + "\n" + Utils.getFixedDivider() + "\n" + LayoutManager.templates.menuList(null, ContentManager.menus.adminUser), true, f.selectAction));
            }
            if (session.screen === "ADMIN_ACTION_CONFIRM") return replier.reply(LayoutManager.renderFrame(s.aActionCon, m.adminActionConfirm(ContentManager.adminMap.actionName[session.temp.adminAction]) + "\n\n" + LayoutManager.templates.menuList(null, ContentManager.menus.yesNo), true, f.selectNum));
            if (session.screen === "ADMIN_INQUIRY_LIST") {
                if (Database.inquiries.length === 0) return SystemAction.go(replier, t.notice, m.adminNoInq, function(){ session.screen = "ADMIN_MAIN"; AdminController.handle("refresh_screen", session, sender, replier, room); });
                var listArr = [], curDate = "";
                for (var i = 0; i < Database.inquiries.length; i++) {
                    var iq = Database.inquiries[i]; var datePart = (iq.time && iq.time.length >= 10) ? iq.time.substring(0, 10) : "이전 문의";
                    if (curDate !== datePart) { curDate = datePart; if(listArr.length > 0) listArr.push(""); listArr.push(ui.datePrefix + curDate + ui.dateSuffix); }
                    listArr.push((i+1) + "." + (iq.read ? ui.read : ui.unread) + iq.sender);
                }
                return replier.reply(LayoutManager.renderFrame(s.aInqList, listArr.join("\n"), true, f.aInputInq));
            }
            if (session.screen === "ADMIN_INQUIRY_DETAIL") {
                var iq = Database.inquiries[session.temp.inqIdx];
                if (!iq) return AdminController.handle("이전", session, sender, replier, room);
                if (!iq.read) { iq.read = true; Database.save(); }
                var timeParts = iq.time ? iq.time.split(" ") : ["알 수 없음", ""];
                var content = ui.sender + iq.sender + "\n" + ui.date + timeParts[0] + "\n" + ui.time + (timeParts[1] || "정보 없음") + "\n" + Utils.getFixedDivider() + "\n" + iq.content;
                return replier.reply(LayoutManager.renderFrame(s.aInqDet, content + "\n\n" + LayoutManager.templates.menuList(null, ContentManager.menus.adminInqDetail), true, f.selectAction));
            }
            if (session.screen === "ADMIN_INQUIRY_REPLY") return replier.reply(LayoutManager.renderFrame(s.aInqRep, f.aInputRep, true, f.inputContent));
            if (session.screen === "ADMIN_EDIT_SELECT") return replier.reply(LayoutManager.renderFrame(s.aEditSel, LayoutManager.templates.menuList(null, ContentManager.menus.adminEdit), true, f.selectNum));
            if (session.screen === "ADMIN_EDIT_INPUT") return replier.reply(LayoutManager.renderFrame(s.aEditIn, m.inputNewVal, true, "숫자 입력"));
            if (session.screen === "ADMIN_EDIT_INPUT_CONFIRM") return replier.reply(LayoutManager.renderFrame(s.aEditCon, m.adminEditConfirm(ContentManager.adminMap.editName[session.temp.editType], session.temp.editVal) + "\n\n" + LayoutManager.templates.menuList(null, ContentManager.menus.yesNo), true, f.selectNum));
        }

        if (session.screen === "ADMIN_MAIN") {
            if (msg === "1") { session.screen = "ADMIN_SYS_INFO"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "2") { session.screen = "ADMIN_USER_SELECT"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "3") { session.screen = "ADMIN_INQUIRY_LIST"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
        }
        if (session.screen === "ADMIN_USER_SELECT") {
            var idx = parseInt(msg) - 1;
            if (session.temp.userList && session.temp.userList[idx]) { session.temp.targetUser = session.temp.userList[idx]; session.screen = "ADMIN_USER_DETAIL"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
        }
        if (session.screen === "ADMIN_USER_DETAIL") {
            if (msg === "1") { session.screen = "ADMIN_EDIT_SELECT"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "2" || msg === "3" || msg === "4") { session.temp.adminAction = msg; session.screen = "ADMIN_ACTION_CONFIRM"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
        }
        if (session.screen === "ADMIN_ACTION_CONFIRM") {
            var target = session.temp.targetUser; var tData = Database.data[target]; var action = session.temp.adminAction;
            if (msg === "1") {
                if (action === "2") {
                    var currentPw = tData.pw; var currentBan = tData.banned;
                    Database.data[target] = { pw: currentPw, name: target, title: "뉴비", lp: 0, win: 0, lose: 0, level: 1, exp: 0, gold: 1000, point: 0, stats: { acc: 50, ref: 50, com: 50, int: 50 }, inventory: { titles: ["뉴비"], champions: [] }, items: { statReset: 0, nameChange: 0 }, banned: currentBan };
                    Database.save(); Utils.sendNotify(target, m.adminNotifyInit);
                    return SystemAction.go(replier, t.complete, m.adminInitSuccess, function() { session.screen="ADMIN_USER_DETAIL"; AdminController.handle("refresh_screen", session, sender, replier, room); });
                }
                if (action === "3") {
                    delete Database.data[target]; Database.save(); Utils.sendNotify(target, m.adminNotifyDelete);
                    return SystemAction.go(replier, t.complete, m.adminDelSuccess, function() { session.screen="ADMIN_USER_SELECT"; AdminController.handle("refresh_screen", session, sender, replier, room); });
                }
                if (action === "4") {
                     tData.banned = !tData.banned; Database.save();
                     Utils.sendNotify(target, tData.banned ? m.adminNotifyBan : m.adminNotifyUnban);
                     return SystemAction.go(replier, t.complete, m.adminBanSuccess, function() { session.screen="ADMIN_USER_DETAIL"; AdminController.handle("refresh_screen", session, sender, replier, room); });
                }
            } else if (msg === "2") { return SystemAction.go(replier, t.notice, m.adminCancel, function() { session.screen = "ADMIN_USER_DETAIL"; AdminController.handle("refresh_screen", session, sender, replier, room); }); }
        }
        if (session.screen === "ADMIN_INQUIRY_LIST") {
            var iIdx = parseInt(msg) - 1;
            if (Database.inquiries[iIdx]) { session.temp.inqIdx = iIdx; session.screen = "ADMIN_INQUIRY_DETAIL"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
        }
        if (session.screen === "ADMIN_INQUIRY_DETAIL") {
            var idx = session.temp.inqIdx;
            if (msg === "1") { session.screen = "ADMIN_INQUIRY_REPLY"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
            if (msg === "2") {
                Database.inquiries.splice(idx, 1); Database.save();
                return SystemAction.go(replier, t.complete, m.adminInqDelSuccess, function(){ session.screen = "ADMIN_INQUIRY_LIST"; AdminController.handle("refresh_screen", session, sender, replier, room); });
            }
        }
        if (session.screen === "ADMIN_INQUIRY_REPLY") {
            var idx = session.temp.inqIdx; var iq = Database.inquiries[idx];
            if (iq && iq.room) {
                try { Api.replyRoom(iq.room, ui.replyMark + "\n" + Utils.getFixedDivider() + "\n" + msg + "\n" + Utils.getFixedDivider()); } catch(e){}
                return SystemAction.go(replier, t.complete, m.adminReplySuccess, function(){ session.screen = "ADMIN_INQUIRY_LIST"; AdminController.handle("refresh_screen", session, sender, replier, room); });
            }
        }
        if (session.screen === "ADMIN_EDIT_SELECT") {
            if (ContentManager.adminMap.editType[msg]) { session.temp.editType = ContentManager.adminMap.editType[msg]; session.screen = "ADMIN_EDIT_INPUT"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
        }
        if (session.screen === "ADMIN_EDIT_INPUT") {
             var val = parseInt(msg);
             if(isNaN(val)) return SystemAction.go(replier, t.error, m.onlyNumber, function(){ AdminController.handle("refresh_screen", session, sender, replier, room); });
             if (session.temp.editType === "level" && (val < 1 || val > MAX_LEVEL)) return SystemAction.go(replier, t.error, m.invalidLevel, function(){ AdminController.handle("refresh_screen", session, sender, replier, room); });
             session.temp.editVal = val; session.screen = "ADMIN_EDIT_INPUT_CONFIRM"; return AdminController.handle("refresh_screen", session, sender, replier, room);
        }
        if (session.screen === "ADMIN_EDIT_INPUT_CONFIRM") {
            if (msg === "1") {
                var val = session.temp.editVal; var target = session.temp.targetUser; var typeName = ContentManager.adminMap.editName[session.temp.editType];
                if (session.temp.editType === "level") {
                    var diff = val - Database.data[target].level;
                    if (diff !== 0) { Database.data[target].point += (diff * POINT_PER_LEVEL); if(Database.data[target].point < 0) Database.data[target].point = 0; }
                }
                Database.data[target][session.temp.editType] = val; Database.save();
                Utils.sendNotify(target, m.adminNotifyEdit(typeName, val));
                return SystemAction.go(replier, t.complete, m.adminEditSuccess, function() { session.screen = "ADMIN_USER_DETAIL"; AdminController.handle("refresh_screen", session, sender, replier, room); });
            } else if (msg === "2") { return SystemAction.go(replier, t.notice, m.adminEditCancel, function() { session.screen = "ADMIN_EDIT_SELECT"; AdminController.handle("refresh_screen", session, sender, replier, room); }); }
        }
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚀 [7. 메인 라우터 (Entry Point)]
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    try {
        Database.load(); 
        var realMsg = msg.trim();

        if (realMsg === "업데이트" || realMsg === ".업데이트") return;

        if (SessionManager.checkTimeout(room, sender, replier)) return;

        var session = SessionManager.get(room, sender);
        var isLogged = (session.tempId && Database.data[session.tempId]);

        if (realMsg === "메뉴") {
            if (room === Config.AdminRoom) { session.screen = "ADMIN_MAIN"; return AdminController.handle("refresh_screen", session, sender, replier, room); }
            if (isLogged) { session.screen = "MAIN"; return UserController.handle("refresh_screen", session, sender, replier, room); } 
            else { session.screen = "GUEST_MAIN"; return AuthController.handle("refresh_screen", session, sender, replier, room); }
        }

        if (realMsg === "취소") { 
            var backupId = session.tempId; SessionManager.reset(room, sender); 
            var newSession = SessionManager.get(room, sender);
            if (backupId) { newSession.tempId = backupId; SessionManager.save(); }
            return replier.reply(LayoutManager.renderFrame(ContentManager.title.notice, ContentManager.msg.cancel, false, ContentManager.footer.reStart));
        }

        if (realMsg === "이전") {
            // [전투 중 이전 방지]
            if (session.screen && session.screen.indexOf("BATTLE_MAIN") !== -1) {
                return replier.reply("⚠️ 전투 중에는 이전 화면으로 갈 수 없습니다. (취소 시 로비로 강제 이동)");
            }
            if (PrevScreenMap[session.screen]) {
                session.screen = PrevScreenMap[session.screen];
                if (room === Config.AdminRoom) return AdminController.handle("refresh_screen", session, sender, replier, room);
                if (isLogged) return UserController.handle("refresh_screen", session, sender, replier, room);
                return AuthController.handle("refresh_screen", session, sender, replier, room);
            }
            return SystemAction.go(replier, ContentManager.title.notice, ContentManager.msg.noPrevious, function() {
                if (room === Config.AdminRoom) return AdminController.handle("refresh_screen", session, sender, replier, room);
                if (isLogged) return UserController.handle("refresh_screen", session, sender, replier, room);
                return AuthController.handle("refresh_screen", session, sender, replier, room);
            });
        }

        if (room === Config.AdminRoom) return AdminController.handle(realMsg, session, sender, replier, room);
        
        // [위임] 전투 화면일 경우 독립된 BattleSystem으로 제어권 완벽 인계
        if (isLogged && session.screen && session.screen.indexOf("BATTLE_") === 0) {
            return BattleSystem.Controller.handle(realMsg, session, sender, replier, room, Database.data[session.tempId]);
        }
        
        if (isLogged) return UserController.handle(realMsg, session, sender, replier, room);
        return AuthController.handle(realMsg, session, sender, replier, room);

    } catch (e) {
        try { Api.replyRoom(Config.AdminRoom, ContentManager.msg.sysErrorLog(e)); } catch(err) {} 
        return SystemAction.go(replier, ContentManager.title.sysError, ContentManager.msg.sysErrorLog(e), function() { SessionManager.reset(room, sender); });
    } finally {
        SessionManager.startAutoTimer(room, sender);
    }
}
