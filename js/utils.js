/* ═══════════════════════════════════════════
   utils.js — Shared utilities for all visualizations
   Greek Brain Drain · Data Visualization Project
   ═══════════════════════════════════════════ */

// ── Color Palette ──
const COLORS = {
  greece: "#1B6B93",
  greeceLight: "#A3D5E8",
  abroad: "#E85D2A",
  abroadLight: "#F5C5A3",
  highlight: "#E8B931",
  text: "#333333",
  textSecondary: "#666666",
  textLight: "#999999",
  grid: "#E5E5E5",
  bgAlt: "#F7F9FC",
};

// ── Number Formatting ──
function fmtNum(n) {
  if (n == null || isNaN(n)) return "\u2014";
  return n.toLocaleString("zh-CN");
}
function fmtPct(n, decimals) {
  if (n == null || isNaN(n)) return "\u2014";
  decimals = (decimals === undefined) ? 1 : decimals;
  return Number(n).toFixed(decimals) + "%";
}

// ── Tooltip ──
const tooltip = d3.select("#tooltip");

function showTooltip(html) {
  tooltip.html(html).classed("visible", true);
}
function moveTooltip(event) {
  var node = tooltip.node();
  var ttW = node.offsetWidth;
  var ttH = node.offsetHeight;
  var x = event.clientX + 15;
  var y = event.clientY + 15;
  if (x + ttW > window.innerWidth - 10) x = event.clientX - ttW - 15;
  if (y + ttH > window.innerHeight - 10) y = event.clientY - ttH - 15;
  tooltip.style("left", x + "px").style("top", y + "px");
}
function hideTooltip() {
  tooltip.classed("visible", false);
}

// ── Data Loading (with cache) ──
var DATA_CACHE = {};
function loadData(filename) {
  if (DATA_CACHE[filename]) return Promise.resolve(DATA_CACHE[filename]);
  return fetch("data/" + filename)
    .then(function (resp) {
      if (!resp.ok) throw new Error("Failed to load " + filename + ": " + resp.status);
      return resp.json();
    })
    .then(function (json) {
      DATA_CACHE[filename] = json;
      return json;
    });
}

// ── Intersection Observer helper ──
function observeSection(elementId, callback, threshold) {
  threshold = (threshold === undefined) ? 0.3 : threshold;
  var el = document.getElementById(elementId);
  if (!el) return null;
  var fired = false;
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !fired) {
        fired = true;
        callback();
        observer.unobserve(el);
      }
    });
  }, { threshold: threshold });
  observer.observe(el);
  // Fallback: if already in viewport, fire after layout is complete
  // Use double rAF to ensure browser has finished at least one layout pass
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      if (fired) return;
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0 && !fired) {
        fired = true;
        callback();
        observer.unobserve(el);
      }
    });
  });
  return observer;
}

// ── Scroll throttling ──
function onScroll(callback) {
  var ticking = false;
  window.addEventListener("scroll", function () {
    if (!ticking) {
      requestAnimationFrame(function () {
        callback();
        ticking = false;
      });
      ticking = true;
    }
  });
}

// ── ISO 3166-1 alpha-3   Chinese name ──
var ISO3_NAME = {
  grc:"希腊", usa:"美国", gbr:"英国", deu:"德国", cyp:"塞浦路斯",
  aus:"澳大利亚", fra:"法国", can:"加拿大", che:"瑞士", nld:"荷兰",
  swe:"瑞典", ita:"意大利", bel:"比利时", esp:"西班牙", aut:"奥地利",
  dnk:"丹麦", nor:"挪威", irl:"爱尔兰", zaf:"南非", fin:"芬兰",
  prt:"葡萄牙", pol:"波兰", jpn:"日本", chn:"中国大陆", isr:"以色列",
  nzl:"新西兰", bra:"巴西", hun:"匈牙利", lux:"卢森堡",
  sau:"沙特阿拉伯", kwt:"科威特", qat:"卡塔尔", are:"阿联酋",
  hrv:"克罗地亚", svn:"斯洛文尼亚", rou:"罗马尼亚", bgr:"保加利亚",
  srb:"塞尔维亚", tur:"土耳其", ind:"印度", kor:"韩国", sgp:"新加坡",
  hkg:"中国香港", mys:"马来西亚", tha:"泰国", idn:"印度尼西亚",
  mex:"墨西哥", arg:"阿根廷", chl:"智利", col:"哥伦比亚",
  egy:"埃及", rus:"俄罗斯", ukr:"乌克兰", lva:"拉脱维亚",
  ltu:"立陶宛", est:"爱沙尼亚", svk:"斯洛伐克", cze:"捷克",
  pak:"巴基斯坦", bgd:"孟加拉国", lka:"斯里兰卡",
  tun:"突尼斯", mar:"摩洛哥", ken:"肯尼亚", nga:"尼日利亚",
  gha:"加纳", uga:"乌干达", eth:"埃塞俄比亚", tza:"坦桑尼亚",
  isl:"冰岛", mlt:"马耳他", per:"秘鲁", ven:"委内瑞拉",
  ury:"乌拉圭", cri:"哥斯达黎加", pan:"巴拿马", cub:"古巴",
  jam:"牙买加", tto:"特立尼达和多巴哥", omn:"阿曼", bhr:"巴林",
  jor:"约旦", lbn:"黎巴嫩", arm:"亚美尼亚", geo:"格鲁吉亚",
  kaz:"哈萨克斯坦", dza:"阿尔及利亚", lby:"利比亚", sdn:"苏丹",
  cmr:"喀麦隆", civ:"科特迪瓦", sen:"塞内加尔", mli:"马里",
  bfa:"布基纳法索", ben:"贝宁", tgo:"多哥", ner:"尼日尔",
  moz:"莫桑比克", zwe:"津巴布韦", zmb:"赞比亚", mwi:"马拉维",
  nam:"纳米比亚", bwa:"博茨瓦纳", swz:"斯威士兰", lso:"莱索托",
  mdg:"马达加斯加", mus:"毛里求斯", syc:"塞舌尔", alb:"阿尔巴尼亚",
  mkd:"北马其顿", mne:"黑山", bih:"波黑", twn:"中国台湾",
  phl:"菲律宾", vnm:"越南", irn:"伊朗", irq:"伊拉克",
  syr:"叙利亚", mda:"摩尔多瓦", blr:"白俄罗斯", mmr:"缅甸",
  lao:"老挝", khm:"柬埔寨", npl:"尼泊尔", mng:"蒙古",
  uzb:"乌兹别克斯坦", tkm:"土库曼斯坦", kgz:"吉尔吉斯斯坦",
  tjk:"塔吉克斯坦", aze:"阿塞拜疆", afg:"阿富汗",
  ssd:"南苏丹", cod:"刚果(金)", cog:"刚果(布)",
  som:"索马里", caf:"中非", gab:"加蓬", gnq:"赤道几内亚",
  eri:"厄立特里亚", dji:"吉布提", bdi:"布隆迪", rwa:"卢旺达",
  ago:"安哥拉", gin:"几内亚", sle:"塞拉利昂", lbr:"利比里亚",
  rwa:"卢旺达", bdi:"布隆迪", tcd:"乍得", mrt:"毛里塔尼亚",
  esh:"西撒哈拉", aut:"奥地利", hrv:"克罗地亚",
  brn:"文莱", png:"巴布亚新几内亚", tls:"东帝汶",
  fji:"斐济", slb:"所罗门群岛", vut:"瓦努阿图", ncl:"新喀里多尼亚",
  grl:"格陵兰", sur:"苏里南", guy:"圭亚那", guf:"法属圭亚那",
  gtm:"危地马拉", hnd:"洪都拉斯", slv:"萨尔瓦多", nic:"尼加拉瓜",
  blz:"伯利兹", bhs:"巴哈马", dom:"多米尼加", hti:"海地",
  bol:"玻利维亚", pry:"巴拉圭", ecu:"厄瓜多尔",
  and:"安道尔", smr:"圣马力诺", mco:"摩纳哥", lie:"列支敦士登",
  vat:"梵蒂冈", ltu:"立陶宛", lva:"拉脱维亚", est:"爱沙尼亚",
  prk:"朝鲜", yem:"也门", pse:"巴勒斯坦",
};

function isoName(code) {
  return ISO3_NAME[code] || code;
}

// ── GeoJSON name   ISO3 lookup (for world map) ──
var GEO_NAME_TO_ISO = {
  "greece":"grc","united states of america":"usa","united kingdom":"gbr",
  "germany":"deu","cyprus":"cyp","australia":"aus","france":"fra",
  "canada":"can","switzerland":"che","netherlands":"nld","sweden":"swe",
  "italy":"ita","belgium":"bel","spain":"esp","austria":"aut",
  "denmark":"dnk","norway":"nor","ireland":"irl","south africa":"zaf",
  "finland":"fin","united arab emirates":"are","brazil":"bra","china":"chn",
  "saudi arabia":"sau","singapore":"sgp","israel":"isr","luxembourg":"lux",
  "russia":"rus","japan":"jpn","portugal":"prt","qatar":"qat",
  "turkey":"tur","poland":"pol","new zealand":"nzl","hungary":"hun",
  "india":"ind","south korea":"kor","mexico":"mex","argentina":"arg",
  "chile":"chl","colombia":"col","egypt":"egy","ukraine":"ukr",
  "croatia":"hrv","slovenia":"svn","romania":"rou","bulgaria":"bgr",
  "serbia":"srb","thailand":"tha","indonesia":"idn","malaysia":"mys",
  "pakistan":"pak","nigeria":"nga","kenya":"ken","ethiopia":"eth",
  "morocco":"mar","senegal":"sen","cameroon":"cmr","peru":"per",
  "venezuela":"ven","cuba":"cub","costa rica":"cri","panama":"pan",
  "lebanon":"lbn","jordan":"jor","oman":"omn","bahrain":"bhr",
  "kuwait":"kwt","armenia":"arm","georgia":"geo","kazakhstan":"kaz",
  "azerbaijan":"aze","iceland":"isl","estonia":"est","latvia":"lva",
  "lithuania":"ltu","slovakia":"svk","czech republic":"cze",
  "albania":"alb","montenegro":"mne","malta":"mlt","liechtenstein":"lie",
  "monaco":"mco","uruguay":"ury","paraguay":"pry","bolivia":"bol",
  "ecuador":"ecu","taiwan":"twn","hong kong":"hkg","philippines":"phl",
  "vietnam":"vnm","bangladesh":"bgd","sri lanka":"lka","nepal":"npl",
  "uganda":"uga","tanzania":"tza","ghana":"gha","mozambique":"moz",
  "zimbabwe":"zwe","zambia":"zmb","malawi":"mwi","madagascar":"mdg",
  "botswana":"bwa","namibia":"nam","seychelles":"syc","mauritius":"mus",
  "trinidad and tobago":"tto","jamaica":"jam","dominican rep.":"dom",
  "haiti":"hti","bahamas":"bhs","belize":"blz","guatemala":"gtm",
  "honduras":"hnd","el salvador":"slv","nicaragua":"nic",
  "papua new guinea":"png","timor-leste":"tls","fiji":"fji",
  "solomon is.":"slb","vanuatu":"vut","new caledonia":"ncl","brunei":"brn",
  "greenland":"grl","suriname":"sur","guyana":"guy","french guiana":"guf",
  "iran":"irn","iraq":"irq","syria":"syr","yemen":"yem",
  "libya":"lby","tunisia":"tun","algeria":"dza","w. sahara":"esh",
  "mauritania":"mrt","mali":"mli","niger":"ner","chad":"tcd",
  "sudan":"sdn","s. sudan":"ssd","south sudan":"ssd","eritrea":"eri",
  "djibouti":"dji","somalia":"som","somaliland":"som","burundi":"bdi",
  "rwanda":"rwa","angola":"ago","eswatini":"swz","lesotho":"lso",
  "burkina faso":"bfa","benin":"ben","togo":"tgo","guinea":"gin",
  "sierra leone":"sle","liberia":"lbr","gabon":"gab","eq. guinea":"gnq",
  "central african rep.":"caf","côte d'ivoire":"civ","côte d'ivoire":"civ",
  "swaziland":"swz","north macedonia":"mkd","bosnia and herzegovina":"bih",
  "andorra":"and","san marino":"smr","vatican":"vat",
  "myanmar":"mmr","laos":"lao","cambodia":"khm",
  "uzbekistan":"uzb","turkmenistan":"tkm","kyrgyzstan":"kgz",
  "tajikistan":"tjk","mongolia":"mng","afghanistan":"afg",
  "belarus":"blr","moldova":"mda","palestine":"pse",
  "n. cyprus":"cyp","kosovo":"srb","north korea":"prk",
};

function geoNameToIso(name) {
  if (!name) return "";
  var key = name.toLowerCase().trim();
  return GEO_NAME_TO_ISO[key] || "";
}
