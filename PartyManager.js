importPackage(org.json);

const scriptName='PartyManager.js';
const Runnable = java.lang.Runnable;
const Thread  = java.lang.Thread;

const DBPrefix = 'partymanager/'

// KakaoNameSplitCharacters의 문자로 split 함.
// ex1. ZeroBoom/28/성남 -> ZeroBoom으로 파싱
// ex2. ZeroBoom 28 성남 -> ZeroBoom으로 파싱
const KakaoNameSplitCharacters = ['/', ' '];

// GameTypes에 있는 것들만 파티 생성 가능. 숫자는 전체 인원.
const GameTypes = [
    ['일반', 5],
    ['롤체', 8],
    ['내전', 10],
    ['스크림', 5],
    ['칼바람', 5],
    ['자랭', 5],
    ['솔랭', 2],
    ['듀오', 2],
];

// 매일 AlarmTime에 들어있는 값의 정시에 알람. (파티가 있을 경우)
const TodayPartyAlarmTime = [16, 19];
const PartyPreAlaramMinute = 30;

var rooms = [];

// js JSON에서 serialize 후 deserialize 과정에서 date는 string으로 취급되어 제대로 파싱되지 않아서 넣은 코드.
if (this.JSON)
{
    if (!this.JSON.dateParser)
    {
        var reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
        var reMsAjax = /^\/Date\((d|-|.*)\)[\/|\\]$/;
       
        JSON.dateParser = function (key, value) {
            if (typeof value === 'string') {
                var a = reISO.exec(value);
                if (a)
                    return new Date(value);
                a = reMsAjax.exec(value);
                if (a) {
                    var b = a[1].split(/[-+,.]/);
                    return new Date(b[0] ? +b[0] : 0 - +b[1]);
                }
            }
            return value;
        };
    }
    
    if (!this.JSON.replacer)
    {
        this.JSON.replacer = function (key, value) {
            if (key == 'thread')
                return '';

            return value;
        }
    }
}

// Class를 범용성 있게 사용하기 위한 함수.
function ApplyAndNew(constructor, args)
{
    function partial () {
        return constructor.apply(this, args);
    };
    if (typeof constructor.prototype === 'object') {
        partial.prototype = Object.create(constructor.prototype);
    }
    return partial;
}

// Room Class
function Room(roomName)
{
    this.parties = [];
    this.roomName = roomName;
    this.periodicParty = [];
    this.lastTodayPartyNoticedTime = new Date();
    this.today = this.lastTodayPartyNoticedTime.getDay();
    this.isActivated = true;

    this.StartThread();
}

Room.prototype.StartThread = function()
{
    this.thread = new Thread(new Runnable({
        run:() => {
            try {
                while (true) {
                    Thread.sleep(3000);

                    if (!this.isActivated)
                        continue;

                    this.ClearEndedParty();
                    this.CheckPeriodicParty();
                    this.CheckPreAlarmNotice();
                    this.CheckTodayPartyNotice();
                }
            } catch (e) {
                Log.i('thread ended');
            }
        }
    }));
    this.thread.start();
}

Room.prototype.FindPartyByName = function(name)
{
    return this.parties.find(function(elem) {
        return elem['name'] == name;
    });
}

Room.prototype.AddParty = function(party)
{
    this.parties.push(party);
}

Room.prototype.GetPartyListMsg = function()
{
    var msg = '';
    if (this.parties.length > 0)
    {
        for (var i = 0; i < this.parties.length; i++)
            msg += ConvertPartyToMsg(this.parties[i]) + '\n\n';
    }
    else
    {
        msg = '만들어진 파티가 없어요 ㅠ_ㅠ';
    }

    return msg;
}

Room.prototype.ClearEndedParty = function()
{
    var now = new Date();
    for (var i = this.parties.length - 1; i >= 0; i--)
    {
        var party = this.parties[i];
        if (now > party.time)
            this.parties.splice(i, 1);
    }
}

Room.prototype.CheckPeriodicParty = function()
{
    const now = new Date();
    if (now.getDay() == this.today)
        return;

    this.today = now.getDay();

    this.periodicParty.forEach(party => {
        const createPartyCommand = new CreatePartyCommand(party.name, party.time);
        createPartyCommand.SetTargetRoom(this);

        const message = createPartyCommand.Execute();
        if (!createPartyCommand.isSucceed)
        {
            Api.replyRoom(this.roomName, '정기 내전 등록 실패! - ' + message);
        }
    });
}

Room.prototype.CheckPreAlarmNotice = function()
{
    const now = new Date();
    this.parties.forEach(party => {
        if (party.isNoticed)
            return;

        const partyTime = party.time;
        const alarmDate = new Date();
        alarmDate.setHours(partyTime.getHours());
        alarmDate.setMinutes(partyTime.getMinutes() - PartyPreAlaramMinute);

        if (now <= alarmDate)
            return;

        for (let i = 0; i < GameTypes.length; i++)
        {
            let typeName = GameTypes[i][0];
            let typeLimitation = GameTypes[i][1];
            if (!party.name.includes(typeName))
                continue;

            if (party.members.length <= typeLimitation / 2)
                continue;

            let msg = ConvertPartyToMsg(party);
            msg += '\n\n';
            if (party.members.length == typeLimitation)
            {
                msg += '파티가 ' + PartyPreAlaramMinute + '분 뒤에 시작됩니다! 준비해주세요~';
            }
            else
            {
                msg += '자리가 남는 파티가 있어요~ 참가해보시면 어떨까요? (/파티참가 ' + party.name+ ')';
            }
            Api.replyRoom(this.roomName, msg);
        }

        party.isNoticed = true;
    });
}

Room.prototype.CheckTodayPartyNotice = function()
{
    const now = new Date();
    TodayPartyAlarmTime.forEach(elem => {
        const targetDate = new Date();
        targetDate.setHours(elem);
        targetDate.setMinutes(0);

        if (targetDate > this.lastTodayPartyNoticedTime && now > targetDate)
        {
            this.lastTodayPartyNoticedTime = now;

            let message;
            if (this.parties.length == 0)
            {
                message = '오늘의 파티가 없어요 ㅠ.ㅠ 파티를 만들어주세요!';
            }
            else
            {
                message = '☆★ 오늘의 파티 ★☆\n';
                message += this.GetPartyListMsg();
            }

            Api.replyRoom(this.roomName, message);
        }
    });
}

// CommandBase Class
function CommandBase()
{
    this.isSucceed = false;
    this.targetRoom = null;
}

CommandBase.prototype.isRequireSender = true;
CommandBase.prototype.Execute = function()
{
    throw new Error('Execute is abstract method.');
}
CommandBase.prototype.SetTargetRoom = function(targetRoom)
{
    this.targetRoom = targetRoom;
}

// HelpCommand Class
function HelpCommand()
{
    CommandBase.call(this);
    this.isSucceed = true;
}

HelpCommand.prototype = Object.create(CommandBase.prototype);
HelpCommand.prototype.constructor = HelpCommand;
HelpCommand.prototype.Execute = function()
{
    var msg = '시간 양식 : 0000 ~ 2359\n';
    msg += '사용 가능 명령어\n';

    for (var key in CommandList)
        msg += key + '\n';

    return msg;
}

//CreateParty Class
function CreatePartyCommand(partyName, customTime)
{
    CommandBase.call(this);

    this.partyName = partyName;
    this.customTime = customTime;
}

CreatePartyCommand.prototype = Object.create(CommandBase.prototype);
CreatePartyCommand.prototype.constructor = CreatePartyCommand;
CreatePartyCommand.prototype.Execute = function()
{
    var partyName = this.partyName;

    var msg = '';
    if (!IsValidGameType(partyName))
    {
        msg = '파티는 ';
        GameTypes.forEach(elem => {
            msg += elem[0];
            msg += ', ';
        });
        msg.substring(0, msg.length - 2);
        msg += '만 생성 할 수 있어요!';
        return msg;
    }

    if (!this.customTime)
        return "시간을 입력해주세요.(0000~2359)";

    var cur = new Date();
    var isValidTime = CheckCustomTimeFormat(this.customTime);
    if (!isValidTime)
        return '시간 양식을 확인해주세요.';

    var time = ConvertCustomTimeToDate(this.customTime);
    if (cur > time)
        return '미래 시간을 입력해주세요.';

    var party = this.targetRoom.FindPartyByName(partyName);
    if (party)
        return '[' + partyName + ']는 이미 존재하는 파티에요!';

    party = {name:partyName, members:[], time:time};
    this.targetRoom.AddParty(party);

    this.isSucceed = true;

    return ConvertDateToStr(party.time) + '에 [' + partyName +']가 생성되었어요~';
}

// JoinPartyCommand Class
function JoinPartyCommand(partyName)
{
    CommandBase.call(this);

    this.partyName = partyName;
}

JoinPartyCommand.prototype = Object.create(CommandBase.prototype);
JoinPartyCommand.prototype.constructor = JoinPartyCommand;
JoinPartyCommand.prototype.isRequireSender = true;
JoinPartyCommand.prototype.Execute = function()
{
    var partyName = this.partyName;
    if (!partyName)
        return '파티 이름을 입력해주세요!';

    var party = this.targetRoom.FindPartyByName(partyName);
    if (!party)
        return '[' + partyName + ']는 존재하지 않아요!';

    for (var i = 0; i < GameTypes.length; i++)
    {
        var typeName = GameTypes[i][0];
        var typeLimitation = GameTypes[i][1];
        if (partyName.includes(typeName) && party.members.length >= typeLimitation)
            return '인원이 꽉 찼어요!';
    }
    
    if (party.members.indexOf(this.sender) >= 0)
        return '이미 참가 중이에요!';

    party.members.push(this.sender);

    this.isSucceed = true;
    return ConvertPartyToMsg(party) + '\n\n' + GetNameFromKakaoName(this.sender) + '님이 [' + partyName + ']에 참가하였습니다!';
}

// PartyListCommand Class
function PartyListCommand()
{
    CommandBase.call(this);
    this.isSucceed = true;
}

PartyListCommand.prototype = Object.create(CommandBase.prototype);
PartyListCommand.prototype.constructor = PartyListCommand;
PartyListCommand.prototype.Execute = function()
{
    return this.targetRoom.GetPartyListMsg();
}

// WithdrawPartyCommand Class
function WithdrawPartyCommand(partyName)
{
    CommandBase.call(this);

    this.partyName = partyName;
}

WithdrawPartyCommand.prototype = Object.create(CommandBase.prototype);
WithdrawPartyCommand.prototype.constructor = WithdrawPartyCommand;
WithdrawPartyCommand.prototype.isRequireSender = true;
WithdrawPartyCommand.prototype.Execute = function()
{
    var partyName = this.partyName;
    var party = this.targetRoom.FindPartyByName(partyName);
    if (!party)
        return '[' + partyName + ']는 존재하지 않아요!';

    var idx = party.members.indexOf(this.sender);
    if (idx < 0)
        return '[' + party.name + ']에 ' + GetNameFromKakaoName(this.sender) + '는 참가 중이지 않아요.';

    if (party.name.includes('내전'))
    {
        const withdrawLimitDate = new Date(party.time.getTime());
        withdrawLimitDate.setMinutes(party.time.getMinutes() - PartyPreAlaramMinute);

        const now = new Date();
        if (now > withdrawLimitDate)
        {
            return '내전은 시작 ' + PartyPreAlaramMinute + '분 전부터는 탈퇴할 수 없습니다. 파티 대타자를 구해서 [/파티대타 ' + partyName + ']을 입력해주세요.';
        }
    }

    party.members.splice(idx, 1);

    this.isSucceed = true;
    return ConvertPartyToMsg(party) + '\n\n' + GetNameFromKakaoName(this.sender) + '님이 [' + partyName + ']를 떠나셨어요.';
}

// ModifyPartyTimeCommand Class
function ModifyPartyTimeCommand(partyName, customTime)
{
    CommandBase.call(this);

    this.partyName = partyName;
    this.customTime = customTime;
}

ModifyPartyTimeCommand.prototype = Object.create(CommandBase.prototype);
ModifyPartyTimeCommand.prototype.constructor = ModifyPartyTimeCommand;
ModifyPartyTimeCommand.prototype.Execute = function()
{
    if (!this.customTime)
        return "시간을 입력해주세요.(0000~2359)";

    var partyName = this.partyName;
    var party = this.targetRoom.FindPartyByName(partyName);
    var isValidTime = CheckCustomTimeFormat(this.customTime);
    if (!isValidTime)
        return '시간 양식을 확인해주세요.';

    var cur = new Date();
    var time = ConvertCustomTimeToDate(this.customTime);
    if (cur > time)
        return '미래 시간을 입력해주세요.';

    party.time = time;

    this.isSucceed = true;
    return '[' + partyName + '] 파티 시간이 변경되었습니다.';
}

// KickMemberCommand Class
function KickMemberCommand(partyName, purgeeNumber)
{
    CommandBase.call(this);

    this.partyName = partyName;
    this.purgeeNumber = purgeeNumber;
}

KickMemberCommand.prototype = Object.create(CommandBase.prototype);
KickMemberCommand.prototype.constructor = KickMemberCommand;
KickMemberCommand.prototype.Execute = function()
{
    var partyName = this.partyName;
    var purgeeNumber = this.purgeeNumber;
    if (!purgeeNumber.match(/[0-9]/))
        return '강퇴할 번호를 입력해주세요.';

    var party = this.targetRoom.FindPartyByName(partyName);
    if (!party)
        return '[' + partyName + ']는 존재하지 않아요!';

    if (purgeeNumber > party.members.length)
        return '없는 번호에요.';

    var purgeeName = '';
    if (purgeeNumber <= party.members.length)
        purgeeName = party.members[purgeeNumber - 1];

    party.members.splice(purgeeNumber - 1, 1);

    this.isSucceed = true;
    return purgeeName + '님이 [' + partyName + ']에서 강퇴되셨어요.';
}

// ReplaceMemberCommand Class
function ReplaceMemberCommand(partyName, replaceNumber)
{
    CommandBase.call(this);

    this.partyName = partyName;
    this.replaceNumber = replaceNumber;
}

ReplaceMemberCommand.prototype = Object.create(CommandBase.prototype);
ReplaceMemberCommand.prototype.constructor = ReplaceMemberCommand;
ReplaceMemberCommand.prototype.Execute = function()
{
    const partyName = this.partyName;
    const replaceNumber = this.replaceNumber;
    if (!replaceNumber.match(/[0-9]/))
        return '대신 할 번호를 입력해주세요.';

    const party = this.targetRoom.FindPartyByName(partyName);
    if (!party)
        return '[' + partyName + ']는 존재하지 않아요!';

    if (replaceNumber > party.members.length)
        return '없는 번호에요.';

    if (party.members.indexOf(this.sender) >= 0)
        return '이미 참가 중이에요!';

    if (!partyName.includes('내전'))
        return '파티 대타 기능은 내전에만 사용할 수 있어요.';

    const withdrawLimitDate = new Date();
    withdrawLimitDate.setHours(party.time.getHours());
    withdrawLimitDate.setMinutes(party.time.getMinutes() - PartyPreAlaramMinute);

    if (withdrawLimitDate >= party.time)
        return '파티대타는 내전 시작 ' + PartyPreAlaramMinute + '분 전부터 사용할 수 있는 명령어입니다.';

    const replaced = party.members.splice(replaceNumber - 1, 1);
    party.members.push(this.sender);

    this.isSucceed = true;
    return ConvertPartyToMsg(party) + '\n\n' + GetNameFromKakaoName(this.sender) + '님이 ' + replaced + '님 대신 참가하였습니다!';
}

// RegisterPeriodicPartyCommand Class
function RegisterPeriodicPartyCommand(partyName, partyTime)
{
    CommandBase.call(this);

    this.partyName = partyName;
    this.partyTime = partyTime;
}

RegisterPeriodicPartyCommand.prototype = Object.create(CommandBase.prototype);
RegisterPeriodicPartyCommand.prototype.constructor = RegisterPeriodicPartyCommand;
RegisterPeriodicPartyCommand.prototype.Execute = function()
{
    const partyName = this.partyName;
    const partyTime = this.partyTime;

    const isExist = this.targetRoom.periodicParty.find(function(periodicParty) {
        return periodicParty.name == partyName;
    });

    if (isExist)
        return '[' + partyName + ']는 이미 등록된 정기 파티입니다!';

    this.targetRoom.periodicParty.push({name: partyName, time: partyTime});

    this.isSucceed = true;

    const convertedDate = ConvertCustomTimeToDate(partyTime);
    const convertedDateStr = ConvertDateToStr(convertedDate);
    return '매일 ' + convertedDateStr + '에 ' + partyName + ' 파티가 생성됩니다.';
}

// UnregisterPeriodicPartyCommand Class
function UnregisterPeriodicPartyCommand(partyName, partyTime)
{
    CommandBase.call(this);

    this.partyName = partyName;
}

UnregisterPeriodicPartyCommand.prototype = Object.create(CommandBase.prototype);
UnregisterPeriodicPartyCommand.prototype.constructor = UnregisterPeriodicPartyCommand;
UnregisterPeriodicPartyCommand.prototype.Execute = function()
{
    const partyName = this.partyName;

    const index = this.targetRoom.periodicParty.findIndex(periodicParty => periodicParty.name == partyName);
    if (index < 0)
        return '[' + partyName + ']는 등록되지 않은 정기 파티입니다!';

    this.targetRoom.periodicParty.splice(index, 1);

    this.isSucceed = true;
    return '정기 파티 [' + partyName + ']가 삭제 되었습니다.';
}

// PrintCamilleCommand Class
function PrintCamilleCommand(partyName)
{
    CommandBase.call(this);

    this.partyName = partyName;
}

PrintCamilleCommand.prototype = Object.create(CommandBase.prototype);
PrintCamilleCommand.prototype.constructor = PrintCamilleCommand;
PrintCamilleCommand.prototype.Execute = function()
{
    const partyName = this.partyName;
    const party = this.targetRoom.FindPartyByName(partyName);
    if (!party)
        return '[' + partyName + ']는 존재하지 않아요!';

    this.isSucceed = true;
    var msg = ConvertPartyToCamilleCommand(party);
    msg += '\n ※닉네임 뒤에 @1, @2를 붙이면 팀을 미리 나눌 수 있습니다.';
    msg += '\n Ex. /자동매칭 ZeroBoom@1,버스타는고먐미@2,캇셀프라임,잠탱이다, ...';
    msg += '\n 가능하면 서폿이랑 정글은 미리 나누고 하시면 밸런스 맞추는데 도움이 됩니다!';
    return msg;
}

// ActivatePartyManagerCommand Class
function ActivatePartyManagerCommand()
{
    CommandBase.call(this);
}

ActivatePartyManagerCommand.prototype = Object.create(CommandBase.prototype);
ActivatePartyManagerCommand.prototype.constructor = ActivatePartyManagerCommand;
ActivatePartyManagerCommand.prototype.Execute = function()
{
    this.isSucceed = true;
    this.targetRoom.isActivated = true;
    return '※ 파티매니저 기능이 켜졌습니다!';
}

// DeactivatePartyManagerCommand Class
function DeactivatePartyManagerCommand()
{
    CommandBase.call(this);
}

DeactivatePartyManagerCommand.prototype = Object.create(CommandBase.prototype);
DeactivatePartyManagerCommand.prototype.constructor = DeactivatePartyManagerCommand;
DeactivatePartyManagerCommand.prototype.Execute = function()
{
    this.isSucceed = true;
    this.targetRoom.isActivated = false;
    return '※ 파티매니저 기능이 꺼졌습니다!';
}

// AdvertisePartyCommand Class
function AdvertisePartyCommand(partyName)
{
    CommandBase.call(this);
    this.partyName = partyName;
}

AdvertisePartyCommand.prototype = Object.create(CommandBase.prototype);
AdvertisePartyCommand.prototype.constructor = AdvertisePartyCommand;
AdvertisePartyCommand.prototype.Execute = function()
{
    var partyName = this.partyName;
    var party = this.targetRoom.FindPartyByName(partyName);
    if (!party)
        return '[' + partyName + ']는 존재하지 않아요!';

    this.isSucceed = true;

    let msg = ConvertPartyToMsg(party);
    msg += '\n\n';
    msg += '자리가 남는 파티가 있어요~ 참가해보시면 어떨까요? (/파티참가 ' + party.name+ ')';
    return msg;
}

// ModifyPartyNameCommand Class
function ModifyPartyNameCommand(partyName, newPartyName)
{
    CommandBase.call(this);
    this.partyName = partyName;
    this.newPartyName = newPartyName;
}

ModifyPartyNameCommand.prototype = Object.create(CommandBase.prototype);
ModifyPartyNameCommand.prototype.constructor = ModifyPartyNameCommand;
ModifyPartyNameCommand.prototype.Execute = function()
{
    var partyName = this.partyName;
    var newPartyName = this.newPartyName;
    var party = this.targetRoom.FindPartyByName(partyName);
    if (!party)
        return '[' + partyName + ']는 존재하지 않아요!';

    var isAlreadyExistParty = this.targetRoom.FindPartyByName(newPartyName);
    if (isAlreadyExistParty)
        return '[' + newPartyName + ']는 이미 존재합니다!';

    if (!IsValidGameType(partyName))
    {
        msg = '파티 이름은 ';
        GameTypes.forEach(elem => {
            msg += elem[0];
            msg += ', ';
        });
        msg.substring(0, msg.length - 2);
        msg += '가 포함된 이름으로만 변경 할 수 있어요!';
        return msg;
    }

    for (var i = 0; i < GameTypes.length; i++)
    {
        var typeName = GameTypes[i][0];
        var typeLimitation = GameTypes[i][1];
        if (newPartyName.includes(typeName) && party.members.length >= typeLimitation)
            return '현재 파티 인원수가 변경하려는 이름 타입의 인원을 초과합니다!\nEx. 내전(8명 있음) 파티를 자랭(5명 제한)으로 이름 변경 불가능.';
    }

    this.isSucceed = true;
    party.name = newPartyName;
    return '[' + partyName + ']가 [' + newPartyName + ']로 이름이 변경되었습니다!';
}

const CommandList =
{
    '/사용법' : HelpCommand,
    '/파티리스트' : PartyListCommand,
    '/파티생성 파티이름 시간(0000~2359)' : CreatePartyCommand,
    '/파티참 파티이름' : JoinPartyCommand,
    '/파티탈퇴 파티이름' : WithdrawPartyCommand,
    '/파티시간변경 파티이름 시간(0000~2359)' : ModifyPartyTimeCommand,
    '/파티강퇴 파티이름 파티원번호' : KickMemberCommand,
    '/파티대타 파티이름 파티원번호' : ReplaceMemberCommand,
    '/정기파티생성 파티이름 시간(0000~2359)' : RegisterPeriodicPartyCommand,
    '/정기파티삭제 파티이름' : UnregisterPeriodicPartyCommand,
    '/카밀출력 파티이름' : PrintCamilleCommand,
    '/파티매니저켜기' : ActivatePartyManagerCommand,
    '/파티매니저끄기' : DeactivatePartyManagerCommand,
    '/파티홍보 파티이름' : AdvertisePartyCommand,
    '/파티이름변경 파티이름 새파티이름' : ModifyPartyNameCommand,
}

function response(roomName, msg, sender, isGroupChat, replier, ImageDB, packageName, threadId){
    let responseMsg = '';
    let commandUsage = '';
    try
    {
        var split = msg.split(' ');
        var room = FindRoom(roomName);
        if (!room)
        {
            var roomsRaw = DataBase.getDataBase(DBPrefix + roomName);
            if (roomsRaw && roomsRaw != '')
            {
                room = JSON.parse(roomsRaw, JSON.dateParser);
                room.__proto__ = Room.prototype;
                room.StartThread();
            }
            else
            {
                room = new Room(roomName);
            }
            rooms[roomName] = room;
        }

        if (split[0].startsWith('/') == false)
            return;

        room.ClearEndedParty();

        var commandStr = split[0];
        split.splice(0, 1);

        let commandClass;
        for (let key in CommandList)
        {
            let command = CommandList[key];
            let keyCommand = key.split(' ')[0];
            if (commandStr.startsWith(keyCommand) || keyCommand.startsWith(commandStr))
            {
                if (!room.isActivated && key != '/파티매니저켜기')
                    continue;

                commandUsage = key;

                var constructorWithArguments = ApplyAndNew(command, split);
                commandClass = new constructorWithArguments();
                commandClass.SetTargetRoom(room);
                if (commandClass.isRequireSender)
                    commandClass.sender = sender;
                break;
            }
        }

        if (!commandClass)
            return;

        var commandMsg = commandClass.Execute();
        if (!commandClass.isSucceed)
        {
            responseMsg += 'Error! ';
            responseMsg += commandMsg;
            responseMsg += '\n사용법: ';
            responseMsg += commandUsage;
        }
        else
        {
            responseMsg += commandMsg;
        }

        if (responseMsg.length > 0)
            replier.reply(responseMsg);

        DataBase.setDataBase(DBPrefix + room.roomName, JSON.stringify(room, JSON.replacer));
    }
    catch (error)
    {
        if (commandUsage !== '')
        {
            responseMsg = '잘못된 사용입니다!\n사용법: ' + commandUsage;
            responseMsg += '\nUnknown Error - ' + error;
        }
        else
        {
            responseMsg = 'Unknown Error - ' + error;
        }
        replier.reply(responseMsg);
    }
}

function GetNameFromKakaoName(kakaoName)
{
    for (var i = 0; i < KakaoNameSplitCharacters.length; i++)
    {
        var splitChar = KakaoNameSplitCharacters[i];
        var split = kakaoName.split(splitChar);
        if (split.length > 1)
            return split[0];
    }

    return kakaoName;
}

function IsValidGameType(partyName)
{
    for (var i = 0; i < GameTypes.length; i++)
    {
        isValidGameType = partyName.includes(GameTypes[i][0]);
        if (isValidGameType)
            return true;
    }

    return false;
}

function CheckCustomTimeFormat(customIime)
{
    return customIime.match(/[0-9][0-9][0-9][0-9]/);
}

function ConvertCustomTimeToDate(time)
{
    var date = new Date();
    date.setHours(Number(time.substring(0, 2)));
    date.setMinutes(Number(time.substring(2, 4)));
    return date;
}

function FindRoom(roomName)
{
    return this.rooms[roomName];
}

function ConvertPartyToMsg(party)
{
    var time = party.time;
    var msg = party.name + ' - ' + ConvertDateToStr(time);
    var members = party.members;
    for (var i = 0; i < members.length; i++)
    {
        var memberName = members[i];
        msg += '\n' + (i + 1) + '. ' + GetNameFromKakaoName(memberName);
    }
    return msg;
}

function ConvertPartyToCamilleCommand(party)
{
    let msg = '/자동매칭 ';
    party.members.forEach(memberName => {
        msg += GetNameFromKakaoName(memberName) + ',';
    });

    return msg.slice(0, -1);
}

function ConvertDateToStr(date)
{
    var msg = '';
    msg += date.getHours() + '시 ';
    if (date.getMinutes() > 0)
        msg += date.getMinutes() + '분';

    return msg;
}

function Sleep(time)
{
    java.lang.Thread.sleep(time);
}

function onStartCompile(){
    /*컴파일 또는 Api.reload호출시, 컴파일 되기 이전에 호출되는 함수입니다.
     *제안하는 용도: 리로드시 자동 백업*/
    rooms.forEach(room => room.thread.interrupt());
}

//아래 4개의 메소드는 액티비티 화면을 수정할때 사용됩니다.
function onCreate(savedInstanceState,activity) {
    var layout=new android.widget.LinearLayout(activity);
    layout.setOrientation(android.widget.LinearLayout.HORIZONTAL);
    var txt=new android.widget.TextView(activity);
    txt.setText('액티비티 사용 예시입니다.');
    layout.addView(txt);
    activity.setContentView(layout);
}
function onResume(activity) {}
function onPause(activity) {}
function onStop(activity) {}