const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: { 'User-Agent': 'TheFinalsLoadoutApp/2.0 (https://github.com/lulu1hao/shetuanzudui)' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function parseInfobox(wikitext) {
  if (!wikitext) return {};
  const props = {};
  const lines = wikitext.split('\n');
  let currentKey = null;
  let currentVal = '';

  for (const line of lines) {
    const match = line.match(/^\s*\|\s*([a-zA-Z0-9_\-]+)\s*=\s*(.*)$/);
    if (match) {
      if (currentKey) {
        props[currentKey] = currentVal.trim();
      }
      currentKey = match[1].toLowerCase();
      currentVal = match[2];
    } else if (currentKey) {
      currentVal += ' ' + line;
    }
  }
  if (currentKey) {
    props[currentKey] = currentVal.trim();
  }

  // Clean values (strip wiki brackets [[...]], {{Quote|text=...}}, etc.)
  for (const k in props) {
    let v = props[k];
    v = v.replace(/\{\{Quote\|text=([^}]+)\}\}/i, '$1');
    v = v.replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1');
    v = v.replace(/\{\{[^}]+\}\}/g, '');
    props[k] = v.trim();
  }
  return props;
}

const CHINESE_NAMES = {
  // Weapons - Light
  '93R': { nameZh: '93R 三连发手枪', role: '突击/爆发', descZh: '三连发战术手枪，拥有极快的爆发射速与中近距离压制力。' },
  'ARN-220': { nameZh: 'ARN-220 突击步枪', role: '全自动/全距离', descZh: '高精度全自动步枪，平衡的后坐力与射速。' },
  'Dagger': { nameZh: '匕首 (Dagger)', role: '背刺刺客', descZh: '轻巧致命的近战武器，背刺攻击可直接秒杀脆皮目标。' },
  'LH1': { nameZh: 'LH1 精确半自动步枪', role: '中远距离压制', descZh: '高威力的半自动步枪，考验点射节奏与跟枪精准度。' },
  'M11': { nameZh: 'M11 冲锋枪', role: '近身泼水/极速射速', descZh: '拥有极高射速的大容量微型冲锋枪，近战爆发极为凶悍。' },
  'M26 Matter': { nameZh: 'M26 泵动霰弹枪', role: '近战散弹', descZh: '紧凑型战术霰弹枪，具备高额单发近距离散射面伤。' },
  'Recurve Bow': { nameZh: '反曲弓 (Recurve Bow)', role: '无声狙击/蓄力穿透', descZh: '静音远程武器，支持蓄力攻击与高额爆头伤害。' },
  'SH1900': { nameZh: 'SH1900 双管霰弹枪', role: '贴脸两喷瞬间秒杀', descZh: '双管猎枪，近距离两连发拥有全游天花板级的瞬间爆发。' },
  'SR-84': { nameZh: 'SR-84 狙击步枪', role: '超远距离架枪', descZh: '高倍镜栓动狙击枪，精准爆头对重装目标造成毁灭性打击。' },
  'Sword': { nameZh: '长剑 (Sword)', role: '突进刺斩/身法流', descZh: '附带突刺冲刺蓄力的近战武器，兼具高机动与斩杀能力。' },
  'Throwing Knives': { nameZh: '飞刀 (Throwing Knives)', role: '无限弹药/双刀齐掷', descZh: '无装填冷却的投掷飞刀，两连掷具有极高爆头伤害。' },
  'V9S': { nameZh: 'V9S 消音半自动手枪', role: '高机动点射', descZh: '消音精准半自动手枪，手速越快DPS上限越高。' },
  'XP-54': { nameZh: 'XP-54 战术冲锋枪', role: '红点瞄准/稳定压枪', descZh: '配备全息瞄具与消音器的战术冲锋枪，控枪手感极其平稳。' },

  // Weapons - Medium
  'AKM': { nameZh: 'AKM 经典突击步枪', role: '全能中坚/大弹夹', descZh: '36发大弹夹全自动步枪，容错率高，适合全距离中坚交火。' },
  'CB-01 Repeater': { nameZh: 'CB-01 杠杆步枪', role: '精准连发/中程威慑', descZh: '杠杆式精准步枪，高单发伤害与快速再填装。' },
  'Cerberus 12GA': { nameZh: '地狱犬 12GA 连发霰弹枪', role: '三管喷火/面伤覆盖', descZh: '三联装特种霰弹枪，近距离喷射高温散射弹丸。' },
  'Chimera-XB': { nameZh: '奇美拉 XB 重弩', role: '静音破甲/特种弹药', descZh: '高精度复合弩，发射高穿透特种弩箭。' },
  'CL-40': { nameZh: 'CL-40 泵动榴弹发射器', role: '范围爆破/拆迁控场', descZh: '面杀伤榴弹枪，能够快速摧毁掩体并溅射打击抱团敌人。' },
  'Dual Blades': { nameZh: '双刀 (Dual Blades)', role: '格挡弹反/近战连击', descZh: '双持利刃，按住右键可正面格挡反弹敌方子弹。' },
  'FAMAS': { nameZh: 'FAMAS 三连发突击步枪', role: '中远距离高精准', descZh: '三发点射突击步枪，集束落点集中，中距离对枪优势显著。' },
  'FCAR': { nameZh: 'FCAR 全息突击步枪', role: '高单发伤害/红点瞄准', descZh: '配备红点瞄准镜的重型突击步枪，单发伤害高，精准击杀极快。' },
  'Model 1887': { nameZh: '1887 杠杆霰弹枪', role: '节奏喷子/中近爆发', descZh: '杠杆式霰弹枪，具备较远致死距离与极高单发面伤。' },
  'P90': { nameZh: 'P90 战术冲锋枪', role: '大弹鼓高射速', descZh: '超大弹容中型冲锋枪，近身交火火力压制极强。' },
  'Pike-556': { nameZh: 'Pike-556 精确射手步枪', role: '中远距离高威连点', descZh: '配备高倍瞄具的精确射手步枪，远距离制衡狙击手。' },
  'R .357': { nameZh: 'R .357 左轮手枪', role: '高爆头单发手炮', descZh: '经典大口径左轮手枪，高风险高回报的重炮点射神器。' },
  'Riot Shield': { nameZh: '防暴盾牌 (Riot Shield)', role: '战术防线/掩护推进', descZh: '正面完全抵御伤害的防弹盾牌配合警棍近身敲击。' },

  // Weapons - Heavy
  '.50 Akimbo': { nameZh: '.50 双持大口径手枪', role: '近战双持双喷重炮', descZh: '双持五十口径巨兽，近距离双发齐射威力惊人。' },
  'BFR Titan': { nameZh: 'BFR 泰坦转轮炮', role: '超重型精准手炮', descZh: '巨大口径的手持重炮，单发毁天灭地。' },
  'Flamethrower': { nameZh: '火焰喷射器 (Flamethrower)', role: '持续燃烧/掩体穿透', descZh: '持续高温火舌，无视防弹盾牌并持续点燃地面与目标。' },
  'KS-23': { nameZh: 'KS-23 独头弹霰弹枪', role: '远距离独头弹/破墙', descZh: '发射重型独头弹的霰弹枪，兼具远距离高伤害与掩体破坏。' },
  'Lewis Gun': { nameZh: '路易斯轻机枪 (Lewis Gun)', role: '稳定持续火力输出', descZh: '47发弹盘经典轻机枪，后坐力平稳，适合阵地压制。' },
  'M134 Minigun': { nameZh: 'M134 转轮机枪 (Minigun)', role: '极限狂暴火力狂澜', descZh: '需要预热旋转的六管加特林机枪，倾泻毁灭性弹幕。' },
  'M60': { nameZh: 'M60 通用机枪', role: '70发大弹箱扫射', descZh: '70发超大弹箱，提供持久不间断的压制火力与破拆能力。' },
  'MGL32': { nameZh: 'MGL32 转轮榴弹发射器', role: '弹跳榴弹阵地洗地', descZh: '六连发转轮榴弹枪，适合在室内或掩体后进行弹跳覆盖打击。' },
  'SA1216': { nameZh: 'SA1216 四转轮霰弹枪', role: '四连发极速清场', descZh: '旋转四管全自动霰弹枪，16发连喷可瞬间融化重型单位。' },
  'ShAK-50': { nameZh: 'ShAK-50 巨型大口径步枪', role: '重型穿甲点射', descZh: '发射大口径重弹的突击步枪，单发冲击力极强。' },
  'Sledgehammer': { nameZh: '大锤 (Sledgehammer)', role: '全场景毁灭拆迁/重砸', descZh: '物理引擎终极拆迁武器，右键重击可瞬间砸穿楼板与墙体。' },
  'Spear': { nameZh: '长矛 (Spear)', role: '长距离戳刺/旋风回斩', descZh: '长柄战矛，右键可施展范围大风车横扫打击多个目标。' },

  // Specializations
  'Cloaking Device': { nameZh: '隐身装置 (Cloaking Device)', role: '光学隐身', descZh: '静止或移动时进入隐形状态，打破敌方视觉侦测。' },
  'Evasive Dash': { nameZh: '闪烁冲刺 (Evasive Dash)', role: '三段瞬移', descZh: '支持充能3次的多向快速突进，极速改变交火身位。' },
  'Grappling Hook': { nameZh: '抓钩 (Grappling Hook)', role: '立体机动', descZh: '发射抓钩高速牵引自身，快速飞跃楼宇与垂直制高点。' },
  'Dematerializer': { nameZh: '物质解构仪 (Dematerializer)', role: '虚空穿墙', descZh: '暂时抹除墙面或天花板物理碰撞，开辟奇袭通道。' },
  'Guardian Turret': { nameZh: '哨戒炮塔 (Guardian Turret)', role: '自动防守', descZh: '部署全自动防守炮塔，自动搜寻射击进入范围的敌人。' },
  'Healing Beam': { nameZh: '治疗光束 (Healing Beam)', role: '团队续航', descZh: '持续发射纳米医疗光束，为队友快速恢复生命值。' },
  'Shockwave': { nameZh: '冲击波发生器 (Shockwave)', role: '范围震退', descZh: '释放高能震荡波，强力击退敌人并打乱阵型。' },
  'Recon Senses': { nameZh: '侦察感知 (Recon Senses)', role: '透视侦察', descZh: '短暂开启红外透视扫描，标记掩体后方的敌人轮廓。' },
  "Charge 'N' Slam": { nameZh: '强力冲撞 (Charge N Slam)', role: '开路冲撞', descZh: '化身人形推土机向前冲刺砸毁一切，空中下砸造成巨大面伤。' },
  'Goo Gun': { nameZh: '粘胶枪 (Goo Gun)', role: '快速筑墙', descZh: '连续喷射凝固胶泡沫，构建临时掩体、桥梁或封堵门窗。' },
  'Mesh Shield': { nameZh: '网格护盾 (Mesh Shield)', role: '移动巨盾', descZh: '展开巨型高耐久电磁能量护盾，吸收所有正面飞行弹道。' },
  'Winch Claw': { nameZh: '绞盘利爪 (Winch Claw)', role: '强力拉拽', descZh: '发射金属钩爪将远处的敌人、提现机或重物直接拽至身前。' },

  // Gadgets
  'Breach Charge': { nameZh: '定点爆破药 (Breach Charge)', role: '定点爆破', descZh: '可吸附在任何表面的遥控炸药，精准爆破墙面地板。' },
  'Gateway': { nameZh: '传送门 (Gateway)', role: '双向传送', descZh: '部署两个传送门节点，允许队伍在两点之间极速穿梭。' },
  'Glitch Grenade': { nameZh: '失灵手雷 (Glitch Grenade)', role: '技能封锁', descZh: '引爆电磁脉冲，短时间内使范围内敌人的技能道具彻底瘫痪。' },
  'Gravity Vortex': { nameZh: '重力涡流 (Gravity Vortex)', role: '引力聚怪', descZh: '生成引力黑洞，将周围敌人与碎片强行吸附聚拢。' },
  'Infuser': { nameZh: '强心注射器 (H+ Infuser)', role: '急速回血', descZh: '刺激 contestant 生命体征，在交火中强行加速自愈。' },
  'Nullifier': { nameZh: '净化发生器 (Nullifier)', role: '净化负面', descZh: '消除范围内的毒气、火焰、烟雾与负面状态效果。' },
  'Sonar Grenade': { nameZh: '声呐手雷 (Sonar Grenade)', role: '声呐透视', descZh: '脉冲声呐扫描，周期性向全队暴露掩体后敌人的精确位置。' },
  'Thermal Bore': { nameZh: '热能钻孔枪 (Thermal Bore)', role: '远程破壁', descZh: '远距离发射高温钻孔弹，延时融毁远处建筑结构。' },
  'Thermal Vision': { nameZh: '热成像目镜 (Thermal Vision)', role: '透烟热显', descZh: '开启热成像视觉，无视烟雾并高亮突出所有热源目标。' },
  'Tracking Dart': { nameZh: '追踪镖 (Tracking Dart)', role: '锁定标记', descZh: '击中目标后在全队视野中长时间实时追踪其行动轨迹。' },
  'Vanishing Bomb': { nameZh: '隐身炸弹 (Vanishing Bomb)', role: '范围隐身', descZh: '掷出烟雾使自己和接触到的队友立即获得群体隐身。' },
  'APS Turret': { nameZh: 'APS 防空拦截炮 (APS Turret)', role: '投掷拦截', descZh: '部署主动防御系统，自动击落射入范围内的所有敌方榴弹手雷。' },
  'Breach Drill': { nameZh: '破障钻 (Breach Drill)', role: '强力破障', descZh: '吸附式高转速破障钻头，迅速在坚固墙体上开出通孔。' },
  'Data Reshaper': { nameZh: '数据重构器 (Data Reshaper)', role: '战术重构', descZh: '将敌方地雷、炮塔等危险设施瞬间重构成椅子、花盆等无害物品。' },
  'Defibrillator': { nameZh: '除颤仪 (Defibrillator)', role: '瞬间救人', descZh: '电击救起阵亡队友雕像，战地救援神器。' },
  'Gas Mine': { nameZh: '毒气地雷 (Gas Mine)', role: '阵地封锁', descZh: '触发后释放大范围剧毒浓烟，持续削减敌人高额生命值。' },
  'Glitch Trap': { nameZh: '失灵陷阱 (Glitch Trap)', role: '封印陷阱', descZh: '触发式失灵装置，剥夺踏入陷阱者的武器射击与技能使用。' },
  'Hover Pad': { nameZh: '悬浮踏板 (Hover Pad)', role: '滞空悬浮', descZh: '生成反重力悬浮立足点，提供全新制高射击位。' },
  'Jump Pad': { nameZh: '跳板 (Jump Pad)', role: '战术弹射', descZh: '部署高弹性弹射板，将全队或提现箱瞬间弹射至高空屋顶。' },
  'Zipline': { nameZh: '滑索发射器 (Zipline)', role: '高空索道', descZh: '搭建长距离高空滑索通道，快速横渡复杂地形。' },
  'Anti-Gravity Cube': { nameZh: '反重力方块 (Anti-Gravity Cube)', role: '失重力场', descZh: '生成立方体失重区域，使提现机、废墟与敌人全部漂浮至空中。' },
  'Barricade': { nameZh: '防护路障 (Barricade)', role: '便携掩体', descZh: '可瞬间部署高耐久金属防护掩体，抵御猛烈正面火力。' },
  'C4': { nameZh: 'C4 遥控炸药 (C4)', role: '高爆遥控', descZh: '高威力炸药，可吸附在可抛掷物品或墙体上遥控引爆。' },
  'Dome Shield': { nameZh: '圆顶护盾 (Dome Shield)', role: '全向防御', descZh: '投掷球形能量护盾发生器，提供360度全方位火力庇护。' },
  'Healing Emitter': { nameZh: '治疗发射器 (Healing Emitter)', role: '范围自愈', descZh: '部署范围治疗信标，为进入力场范围的队友持续输送生命。' },
  'Lockbolt': { nameZh: '锁弹发射器 (Lockbolt)', role: '战术束缚', descZh: '发射高张力锚索，将敌人牵制锁止在特定区域。' },
  'Pyro Mine': { nameZh: '燃烧地雷 (Pyro Mine)', role: '火焰封锁', descZh: '触发后产生剧烈爆燃火海，破坏凝胶并造成持续灼烧。' },
  'RPG-7': { nameZh: 'RPG-7 火箭筒', role: '攻坚破拆', descZh: '单发高爆火箭筒，提供超高单发瞬间爆发与大范围掩体瓦解。' },
  'Flashbang': { nameZh: '闪光手雷 (Flashbang)', role: '全白致盲', descZh: '引爆强光与爆音，使范围内敌人陷入完全致盲与耳鸣状态。' },
  'Frag Grenade': { nameZh: '破片手雷 (Frag Grenade)', role: '基础爆破', descZh: '经典延时高爆破片手雷，基础伤害高且便于反弹几何打击。' },
  'Gas Grenade': { nameZh: '毒气手雷 (Gas Grenade)', role: '范围毒杀', descZh: '大范围毒气弹，迫使抢点防守敌人离开关键提现机。' },
  'Goo Grenade': { nameZh: '凝胶手雷 (Goo Grenade)', role: '速凝筑墙', descZh: '爆开生成大量凝胶掩体墙，阻挡视线与弹道。' },
  'Pyro Grenade': { nameZh: '燃烧手雷 (Pyro Grenade)', role: '火海封路', descZh: '投掷后立即点燃地面化为火海，克制毒气并迅速清理凝胶。' },
  'Smoke Grenade': { nameZh: '烟雾手雷 (Smoke Grenade)', role: '遮蔽视线', descZh: '大范围致密烟幕，熄灭火焰并彻底封锁敌方狙击视线。' },
  'Proximity Sensor': { nameZh: '近程感应器 (Proximity Sensor)', role: '预警侦测', descZh: '小型感应探头，当敌人靠近时向全队发出高亮报警。' },
  'Explosive Mine': { nameZh: '爆破地雷 (Explosive Mine)', role: '陷阱杀伤', descZh: '高伤害触发行地雷，是守护提现机与楼梯转角的经典利器。' }
};

async function buildEquipmentDatabase() {
  const allTitles = [
    // Weapons
    '93R', 'ARN-220', 'Dagger', 'LH1', 'M11', 'M26 Matter', 'Recurve Bow', 'SH1900', 'SR-84', 'Sword', 'Throwing Knives', 'V9S', 'XP-54',
    'AKM', 'CB-01 Repeater', 'Cerberus 12GA', 'Chimera-XB', 'CL-40', 'Dual Blades', 'FAMAS', 'FCAR', 'Model 1887', 'P90', 'Pike-556', 'R .357', 'Riot Shield',
    '.50 Akimbo', 'BFR Titan', 'Flamethrower', 'KS-23', 'Lewis Gun', 'M134 Minigun', 'M60', 'MGL32', 'SA1216', 'ShAK-50', 'Sledgehammer', 'Spear',
    // Specializations
    'Cloaking Device', 'Evasive Dash', 'Grappling Hook', 'Dematerializer', 'Guardian Turret', 'Healing Beam', 'Shockwave', 'Recon Senses', "Charge 'N' Slam", 'Goo Gun', 'Mesh Shield', 'Winch Claw',
    // Gadgets
    'Breach Charge', 'Gateway', 'Glitch Grenade', 'Gravity Vortex', 'Infuser', 'Nullifier', 'Sonar Grenade', 'Thermal Bore', 'Thermal Vision', 'Tracking Dart', 'Vanishing Bomb',
    'APS Turret', 'Breach Drill', 'Data Reshaper', 'Defibrillator', 'Gas Mine', 'Glitch Trap', 'Hover Pad', 'Jump Pad', 'Zipline',
    'Anti-Gravity Cube', 'Barricade', 'C4', 'Dome Shield', 'Healing Emitter', 'Lockbolt', 'Pyro Mine', 'RPG-7',
    'Flashbang', 'Frag Grenade', 'Gas Grenade', 'Goo Grenade', 'Pyro Grenade', 'Smoke Grenade', 'Proximity Sensor', 'Explosive Mine'
  ];

  console.log('Fetching', allTitles.length, 'pages from THE FINALS wiki...');
  const chunks = [];
  for (let i = 0; i < allTitles.length; i += 25) {
    chunks.push(allTitles.slice(i, i + 25));
  }

  const rawPages = {};
  for (const chunk of chunks) {
    const titleStr = chunk.map(encodeURIComponent).join('|');
    const url = 'https://www.thefinals.wiki/w/api.php?action=query&titles=' + titleStr + '&prop=revisions&rvprop=content&format=json';
    const res = await fetchJson(url);
    if (res && res.query && res.query.pages) {
      for (const pid in res.query.pages) {
        const page = res.query.pages[pid];
        if (page.revisions && page.revisions[0]) {
          rawPages[page.title] = page.revisions[0]['*'];
        }
      }
    }
  }

  const imageFiles = [];
  const parsedItems = [];

  for (const title of allTitles) {
    const wikiContent = rawPages[title] || rawPages[title.replace(/'/g, '&#039;')];
    const info = parseInfobox(wikiContent);
    const zh = CHINESE_NAMES[title] || { nameZh: title, role: '装备', descZh: '' };

    let category = 'weapons';
    if (['Cloaking Device', 'Evasive Dash', 'Grappling Hook', 'Dematerializer', 'Guardian Turret', 'Healing Beam', 'Shockwave', 'Recon Senses', "Charge 'N' Slam", 'Goo Gun', 'Mesh Shield', 'Winch Claw'].includes(title)) {
      category = 'specializations';
    } else if (!['93R', 'ARN-220', 'Dagger', 'LH1', 'M11', 'M26 Matter', 'Recurve Bow', 'SH1900', 'SR-84', 'Sword', 'Throwing Knives', 'V9S', 'XP-54', 'AKM', 'CB-01 Repeater', 'Cerberus 12GA', 'Chimera-XB', 'CL-40', 'Dual Blades', 'FAMAS', 'FCAR', 'Model 1887', 'P90', 'Pike-556', 'R .357', 'Riot Shield', '.50 Akimbo', 'BFR Titan', 'Flamethrower', 'KS-23', 'Lewis Gun', 'M134 Minigun', 'M60', 'MGL32', 'SA1216', 'ShAK-50', 'Sledgehammer', 'Spear'].includes(title)) {
      category = 'gadgets';
    }

    let build = info.build || 'All';
    if (build.toLowerCase().includes('light')) build = 'Light';
    else if (build.toLowerCase().includes('medium') && build.toLowerCase().includes('heavy')) build = 'Medium & Heavy';
    else if (build.toLowerCase().includes('medium')) build = 'Medium';
    else if (build.toLowerCase().includes('heavy')) build = 'Heavy';
    else if (['Flashbang', 'Frag Grenade', 'Gas Grenade', 'Goo Grenade', 'Pyro Grenade', 'Smoke Grenade', 'Explosive Mine'].includes(title)) build = 'All';
    else if (['Proximity Sensor'].includes(title)) build = 'Medium & Heavy';

    let imageName = info.image || `${title.replace(/\s+/g, '_')}_Sideview.png`;
    if (!imageName.includes('.')) imageName += '.png';
    imageFiles.push('File:' + imageName);

    const item = {
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
      name: title,
      nameZh: zh.nameZh,
      category,
      build,
      role: zh.role,
      description: info.weaponquote || info.quote || zh.descZh,
      descZh: zh.descZh,
      imageFile: imageName,
      imageUrl: '',
      unlock: info.unlock || 'Free',
      wtype: info.wtype || info.type || category,
      stats: {
        damage: info.bodydamage || info.damage || (category === 'weapons' ? '25' : '—'),
        crit: info.crit || info.headshot || (category === 'weapons' ? '1.5×' : '—'),
        dps: info.dps || (category === 'weapons' ? '180' : '—'),
        rpm: info.rpm || info.firerate || (category === 'weapons' ? '500' : '—'),
        magazine: info.magazinesize || info.magazine || (category === 'weapons' ? '30' : '—'),
        reload: info.tactreload ? `${info.tactreload} / ${info.emptyreload || info.tactreload}` : (info.reload || '2.5s'),
        falloff: info.falloffmin ? `${info.falloffmin} - ${info.falloffmax || '35m'}` : (category === 'weapons' ? '25m - 35m' : '—'),
        destruction: info.environmentaldmgbar || info.environmentaldamage || (['Sledgehammer', 'RPG-7', 'C4', 'Breach Charge', 'Thermal Bore', 'CL-40', 'MGL32'].includes(title) ? 'High' : 'Low'),
        cooldown: info.cooldown || info.duration || (category !== 'weapons' ? '20s' : '—'),
        charges: info.charges || (['Evasive Dash'].includes(title) ? '3' : (['Gateway', 'Barricade', 'Explosive Mine', 'Gas Mine', 'Pyro Mine'].includes(title) ? '2' : '1'))
      },
      tips: [
        `与队友战术协同：可结合体型速度优势进行交叉火力掩护。`,
        `注意射程衰减与弹道散布，在最佳交战距离发挥最大威力。`,
        `合理利用物理破坏特性打乱敌方防守阵型。`
      ],
      wikiUrl: `https://thefinals.wiki/wiki/${encodeURIComponent(title.replace(/\s+/g, '_'))}`
    };

    parsedItems.push(item);
  }

  console.log('Fetching image URLs for', imageFiles.length, 'images...');
  const imgChunks = [];
  for (let i = 0; i < imageFiles.length; i += 25) {
    imgChunks.push(imageFiles.slice(i, i + 25));
  }

  const imageUrlMap = {};
  for (const chunk of imgChunks) {
    const url = 'https://www.thefinals.wiki/w/api.php?action=query&titles=' + chunk.map(encodeURIComponent).join('|') + '&prop=imageinfo&iiprop=url&format=json';
    const res = await fetchJson(url);
    if (res && res.query && res.query.pages) {
      for (const pid in res.query.pages) {
        const page = res.query.pages[pid];
        if (page.imageinfo && page.imageinfo[0]) {
          const rawTitle = page.title.replace(/^File:/, '');
          imageUrlMap[rawTitle.toLowerCase()] = page.imageinfo[0].url;
        }
      }
    }
  }

  for (const item of parsedItems) {
    const cleanImg = item.imageFile.toLowerCase();
    if (imageUrlMap[cleanImg]) {
      item.imageUrl = imageUrlMap[cleanImg];
    } else {
      item.imageUrl = `https://www.thefinals.wiki/w/images/thumb/${item.name.replace(/\s+/g, '_')}_Sideview.png/300px-${item.name.replace(/\s+/g, '_')}_Sideview.png`;
    }
  }

  const outputPayload = {
    version: 'Season 11 Live (Wiki Sync)',
    lastUpdated: new Date().toISOString(),
    itemCount: parsedItems.length,
    builds: [
      { key: 'all', name: '全职业通用 (All Builds)', health: '—', speed: '—' },
      { key: 'Light', name: '轻型 (Light)', health: '150 HP', speed: '极速 (100%)', desc: '高机动、刺客与突袭' },
      { key: 'Medium', name: '中型 (Medium)', health: '250 HP', speed: '标准 (90%)', desc: '团队中坚、医疗与战场支援' },
      { key: 'Heavy', name: '重型 (Heavy)', health: '350 HP', speed: '坚毅 (80%)', desc: '重火力、阵地防御与物理破拆' }
    ],
    categories: [
      { key: 'all', name: '全部装备', icon: '✦' },
      { key: 'weapons', name: '主武器 (Weapons)', icon: '🔫' },
      { key: 'specializations', name: '特殊能力 (Specializations)', icon: '✨' },
      { key: 'gadgets', name: '战术道具 (Gadgets)', icon: '💣' }
    ],
    items: parsedItems
  };

  const targetPath = path.resolve(__dirname, '..', 'data', 'finalsEquipmentData.json');
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(outputPayload, null, 2), 'utf-8');
  console.log('Successfully saved finalsEquipmentData.json with', parsedItems.length, 'items to', targetPath);
}

buildEquipmentDatabase().catch(err => {
  console.error('Error:', err);
});
