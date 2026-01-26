const libConst = Bridge.getScopeOf("Const.js"); // const 변수들 Lib
const libCommon = Bridge.getScopeOf("Common.js"); // 일반 function Lib

function DBManager() {
    var DB = {};

    var _LoadData, _Find, _FindList, _Dic;

    _LoadData = function() {
        DB.SPECIES = libCommon.read(libConst.DBNameList["Species"]);
        DB.WEARITEM = libCommon.read(libConst.DBNameList["WearItem"]);
        DB.SUNDRYITEM = libCommon.read(libConst.DBNameList["SundryItem"]);
        DB.FUNCTIONALITYITEM = libCommon.read(libConst.DBNameList["FunctionalityItem"]);
        DB.MONSTER = libCommon.read(libConst.DBNameList["Monster"]);
        DB.NATION = libCommon.read(libConst.DBNameList["Nation"]);
        DB.CITY = libCommon.read(libConst.DBNameList["City"]);
        DB.FACILITY = libCommon.read(libConst.DBNameList["Facility"]);
        DB.FIELD = libCommon.read(libConst.DBNameList["Field"]);
        DB.SKILL = libCommon.read(libConst.DBNameList["Skill"]);
        DB.MENUFACTURE = libCommon.read(libConst.DBNameList["Menufacture"]);
        DB.SALE = libCommon.read(libConst.DBNameList["Sale"]);
        DB.SKILLSALE = libCommon.read(libConst.DBNameList["Skillsale"]);
        DB.CC = libCommon.read(libConst.DBNameList["Cc"]);
        DB.PROPERTY = libCommon.read(libConst.DBNameList["Property"]);
    }();

    _Find = function(_table, _colume, _compare) {
        var infos = DB[_table];
        var data = null;
        for(var i = 0; i < infos.length; ++i) {
            if(infos[i][_colume] === _compare) {
                data = infos[i];
                break;
            }
        }
        return data;
    };
    _FindList = function(_table, _city, _facility, _kind) {
        var infos = DB[_table];
        var list = [];

        for(var i = 0; i < infos.length; ++i) {
            if(infos[i]["city"] === _city && infos[i]["facility"] === _facility && (_kind === "all"?true:infos[i]["itemkind"] === _kind)) {
                list.push(infos[i]);
            }
        }
        return list;
    };
    _Dic = function(_name) {
        var obj = null, i, tmpobj, tmp;
        var rtnStr = "[" + _name + " 의 검색 결과]\n\n";
        obj = _Find("SPECIES", "spec_name", _name);
        if(obj !== null) {
            rtnStr += "[종족]\n";
            rtnStr += "  - 종족명 : " + obj.spec_name + "\n";
            rtnStr += "  - 힘 : " + obj.inc_stat.str + ", 체질 : " + obj.inc_stat.con + ", 민첩 : " + obj.inc_stat.dex + ", 재주 : " + obj.inc_stat.agi + ", 지능 : " + obj.inc_stat.int + ", 운 : " + obj.inc_stat.luk + "\n";
            rtnStr += "  - 설명 : " + obj.description + "\n";
            rtnStr += "\n";
        }

        obj = _Find("WEARITEM", "name", _name);
        if(obj !== null) {
            rtnStr += "[장비 아이템]\n";
            rtnStr += "  - 장비명 : " + obj.name + "\n";
            rtnStr += "  - 장착 위치 : " + obj.wearpos + "\n";
            rtnStr += "  - 가격(룬) : " + obj.needrune + "\n";
            rtnStr += "  - 공격력 : " + obj.performance.attack +
                        ", 마법력 : " + obj.performance.magic +
                        ", 방어력 : " + obj.performance.defense +
                        ", 공격속도 : " + obj.performance.atkspeed +
                        ", 정확도 : " + obj.performance.accuracy +
                        ", 회피력 : " + obj.performance.avoid +
                        ", 치명률 : " + obj.performance.critical +
                        ", 체력 : " + obj.performance.hp +
                        ", 마력 : " + obj.performance.mp +
                        ", 기력 : " + obj.performance.sp +
                        ", 행동력 : " + obj.performance.ap + "\n";
            rtnStr += "  - 설명 : " + obj.description + "\n";
            rtnStr += "\n";
        }

        obj = _Find("SUNDRYITEM", "name", _name);
        if(obj !== null) {
            rtnStr += "[잡화 아이템]\n";
            rtnStr += "  - 아이템명 : " + obj.name + "\n";
            rtnStr += "  - 가격(룬) : " + obj.needrune + "\n";
            rtnStr += "  - 설명 : " + obj.description + "\n";
            rtnStr += "\n";
        }

        obj = _Find("FUNCTIONALITYITEM", "name", _name);
        if(obj !== null) {
            rtnStr += "[포션 아이템]\n";
            rtnStr += "  - 아이템명 : " + obj.name + "\n";
            rtnStr += "  - 가격(룬) : " + obj.needrune + "\n";
            rtnStr += "  - 기능 : " + obj.effect + "을(를) " + obj.amount + "%만큼 회복한다.\n";
            rtnStr += "  - 설명 : " + obj.description + "\n";
            rtnStr += "\n";
        }

        obj = _Find("MONSTER", "name", _name);
        if(obj !== null) {
            rtnStr += "[몬스터]\n";
            rtnStr += "  - 몬스터명 : " + obj.name + "\n";
            rtnStr += "  - 드랍(룬) : " + obj.droprune + "\n";
            rtnStr += "  - 드랍(아이템) : " + "\n";
            for(i = 0; i < obj.dropItem.length; ++i) {
                tmpobj = _Find("SUNDRYITEM", "index", obj.dropItem[i].itemIdx);
                rtnStr += "      L " + tmpobj.name + "\n";
            }
            rtnStr += "  - 공격력 : " + obj.ability.attack +
                        ", 마법력 : " + obj.ability.magic +
                        ", 방어력 : " + obj.ability.defense +
                        ", 공격속도 : " + obj.ability.atkspeed +
                        ", 정확도 : " + obj.ability.accuracy +
                        ", 회피력 : " + obj.ability.avoid +
                        ", 치명률 : " + obj.ability.critical +
                        ", 체력 : " + obj.ability.hp +
                        ", 마력 : " + obj.ability.mp +
                        ", 기력 : " + obj.ability.sp + "\n";
            rtnStr += "  - 사용스킬 : " + "\n";
            for(i = 0; i < obj.skill.length; ++i) {
                tmpobj = _Find("SKILL", "index", obj.skill[i]);
                rtnStr += "      L " + tmpobj.name + "\n";
            }
            rtnStr += "  - 설명 : " + obj.description + "\n";
            rtnStr += "\n";
        }

        obj = _Find("NATION", "name", _name);
        if(obj !== null) {
            rtnStr += "[나라]\n";
            rtnStr += "  - 나라명 : " + obj.name + "\n";
            rtnStr += "  - 유형 : " + obj.kind + "\n";
            rtnStr += "  - 보유 마을 항목 : " + "\n";
            for(i = 0; i < obj.cities.length; ++i) {
                tmpobj = _Find("CITY", "index", obj.cities[i]);
                rtnStr += "      L " + tmpobj.name + "\n";
            }
            rtnStr += "  - 설명 : " + obj.description + "\n";
            rtnStr += "\n";
        }

        obj = _Find("CITY", "name", _name);
        if(obj !== null) {
            rtnStr += "[마을]\n";
            rtnStr += "  - 마을명 : " + obj.name + "\n";
            rtnStr += "  - 유형 : " + obj.kind + "\n";
            rtnStr += "  - 보유 시설 항목 : " + "\n";
            for(i = 0; i < obj.facilities.length; ++i) {
                tmpobj = _Find("FACILITY", "index", obj.facilities[i]);
                rtnStr += "      L " + tmpobj.name + "\n";
            }
            rtnStr += "  - 보유 사냥터 항목 : " + "\n";
            for(i = 0; i < obj.fields.length; ++i) {
                tmpobj = _Find("FIELD", "index", obj.fields[i]);
                rtnStr += "      L " + tmpobj.name + "\n";
            }
            rtnStr += "  - 설명 : " + obj.description + "\n";
            rtnStr += "\n";
        }

        obj = _Find("FIELD", "name", _name);
        if(obj !== null) {
            rtnStr += "[몬스터 필드]\n";
            rtnStr += "  - 필드명 : " + obj.name + "\n";
            rtnStr += "  - 몬스터 출현 숫자 : " + obj.mobcount + "\n";
            rtnStr += "  - 출현 몬스터 : " + "\n";
            for(i = 0; i < obj.monster.length; ++i) {
                tmpobj = _Find("MONSTER", "index", obj.monster[i]);
                rtnStr += "      L " + tmpobj.name + "\n";
            }
            tmpobj = _Find("MONSTER", "index", obj.boss);
            rtnStr += "  - 출현 보스 몬스터 : " + tmpobj.name + "\n";
            tmpobj = _Find("SUNDRYITEM", "index", obj.summonitem);
            rtnStr += "  - 보스 소환 아이템 : " + tmpobj.name + "\n";
            rtnStr += "  - 설명 : " + obj.description + "\n";
            rtnStr += "\n";
        }

        obj = _Find("SKILL", "name", _name);
        if(obj !== null) {
            if(obj.weapon === "mw") tmp = "지팡이류 무기";
            else if(obj.weapon === "nw") tmp = "근거리 무기";
            else if(obj.weapon === "fw") tmp = "원거리 무기";
            else if(obj.weapon === "as") tmp = "방패";

            rtnStr += "[스킬]\n";
            rtnStr += "  - 스킬명 : " + obj.name + "\n";
            rtnStr += "  - 종류 : " + obj.kind + "\n";
            rtnStr += "  - 사용가능 무기 : " + tmp + "\n";
            rtnStr += "  - 구매 가격(룬) : " + obj.needrune + "\n";
            rtnStr += (obj.needhp === "0"?"":("  - 소모 체력 : " + obj.needhp + "\n"));
            rtnStr += (obj.needsp === "0"?"":("  - 소모 기력 : " + obj.needsp + "\n"));
            rtnStr += (obj.needmp === "0"?"":("  - 소모 마력 : " + obj.needmp + "\n"));
            rtnStr += "  - 적용 범위 : " + (obj.range==="single"?"단일":"전체") + " 적에게 적용\n";
            rtnStr += "  - 효과 : " + obj.effect + "배의 데미지\n";
            tmp = _Find("CC", "index", obj.cc);
            if(tmp !== null) {
                rtnStr += "  - 적용 CC : " + tmp.name + "\n";
            }
            rtnStr += "  - 설명 : " + obj.description + "\n";
            rtnStr += "\n";
        }

        obj = _Find("PROPERTY", "name", _name);
        if(obj !== null) {
            rtnStr += "[특성]\n";
            rtnStr += "  - 특성명 : " + obj.name + "\n";
            rtnStr += "(적용 능력치)\n";
            rtnStr += "  - 공격력 : " + obj.performance.attack +
                        ", 마법력 : " + obj.performance.magic +
                        ", 방어력 : " + obj.performance.defense +
                        ", 공격속도 : " + obj.performance.atkspeed +
                        ", 정확도 : " + obj.performance.accuracy +
                        ", 회피력 : " + obj.performance.avoid +
                        ", 치명률 : " + obj.performance.critical +
                        ", 체력 : " + obj.performance.hp +
                        ", 마력 : " + obj.performance.mp +
                        ", 기력 : " + obj.performance.sp +
                        ", 행동력 : " + obj.performance.ap + "\n";
            rtnStr += "  - 힘 : " + obj.stat.str +
                        ", 체질 : " + obj.stat.con +
                        ", 민첩 : " + obj.stat.dex +
                        ", 재주 : " + obj.stat.agi +
                        ", 지능 : " + obj.stat.int +
                        ", 운 : " + obj.stat.luk + "\n";
            rtnStr += "  - 설명 : " + obj.description + "\n";
            rtnStr += "\n";
        }

        return rtnStr;
    };

    return {
        Search:function(_target, _table, _colume) {
            return _Find(_table, _colume, _target);
        },
        Dictionary:function(_name) {
            libCommon.log_i("Dictionary", "name : " + _name);
            return _Dic(_name);
        },
        isSpecies:function(_specname) {
          var obj = _Find("SPECIES", "spec_name", _specname);
          return (obj !== null?true:false);
        },
        getSpecies:function(_specname) {
            return _Find("SPECIES", "spec_name", _specname);
        },
        isWearItem:function(_itemidx) {
          var obj = _Find("WEARITEM", "index", _itemidx);
          return (obj !== null?true:false);
        },
        getWearItem:function(_itemidx) {
            return _Find("WEARITEM", "index", _itemidx);
        },
        isSundryItem:function(_itemidx) {
          var obj = _Find("SUNDRYITEM", "index", _itemidx);
          return (obj !== null?true:false);
        },
        getSundryItem:function(_itemidx) {
            return _Find("SUNDRYITEM", "index", _itemidx);
        },
        isFunctionalityItem:function(_itemidx) {
          var obj = _Find("FUNCTIONALITYITEM", "index", _itemidx);
          return (obj !== null?true:false);
        },
        getFunctionalityItem:function(_itemidx) {
            return _Find("FUNCTIONALITYITEM", "index", _itemidx);
        },
        getItem:function(_itemidx){
            var rtnObj = this.getWearItem(_itemidx);
            if(rtnObj === null)
                rtnObj = this.getSundryItem(_itemidx);
            if(rtnObj === null)
                rtnObj = this.getFunctionalityItem(_itemidx);

            return rtnObj;
        },
        isSkill:function(_skillidx) {
          var obj = _Find("SKILL", "index", _skillidx);
          return (obj !== null?true:false);
        },
        getSkill:function(_skillidx) {
            return _Find("SKILL", "index", _skillidx);
        },
        isNation:function(_idx) {
          var obj = _Find("NATION", "index", _idx);
          return (obj !== null?true:false);
        },
        getNation:function(_idx) {
            return _Find("NATION", "index", _idx);
        },
        isCity:function(_idx) {
          var obj = _Find("CITY", "index", _idx);
          return (obj !== null?true:false);
        },
        getCity:function(_idx) {
            return _Find("CITY", "index", _idx);
        },
        isFacility:function(_idx) {
          var obj = _Find("FACILITY", "index", _idx);
          return (obj !== null?true:false);
        },
        getFacility:function(_idx) {
            return _Find("FACILITY", "index", _idx);
        },
        isField:function(_idx) {
          var obj = _Find("FIELD", "index", _idx);
          return (obj !== null?true:false);
        },
        getField:function(_idx) {
            return _Find("FIELD", "index", _idx);
        },
        getMonster:function(_monsteridx) {
            return _Find("MONSTER", "index", _monsteridx);
        },
        getSaleList:function(_city, _facility, _kind) {
            return _FindList("SALE", _city, _facility, _kind);
        },
        getMenufacture:function(_itemidx) {
            return _Find("MENUFACTURE", "index", _itemidx);
        },
        getMenufactureList:function(_city, _facility, _kind) {
            if(_city === "all" && _facility === "all" && _kind === "all")
                return DB["MENUFACTURE"];

            return _FindList("MENUFACTURE", _city, _facility, _kind);
        },
        getCC:function(_idx) {
            return _Find("CC", "index", _idx);
        },
        getSkillSaleList:function(_city, _facility) {
            return _FindList("SKILLSALE", _city, _facility, "all");
        },
        getProperty:function(_idx) {
            return _Find("PROPERTY", "index", _idx);
        }
    };
}

