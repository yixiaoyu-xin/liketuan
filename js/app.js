(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var KEY = 'chatApp.v1';
  var PRESETS = ['#07C160', '#576B95', '#FA9D3B', '#E64340', '#7B68EE', '#00A3B4', '#F76F76', '#4A90E2'];
  var PENCIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M13.5 6.5l3 3"/></svg>';
  var PHONE_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5.2 3.8h3.3l1.5 4.2-2 1.6a12.4 12.4 0 0 0 6.4 6.4l1.6-2 4.2 1.5v3.3c0 1-.8 1.8-1.8 1.8C10.6 20.2 3.8 13.4 3.8 5.6c0-1 .8-1.8 1.4-1.8z"/></svg>';
  var NAMES = { chat: '聊天', contacts: '通讯录', discover: '发现', me: '我' };
  var BOUNDS = ['阿', '八', '擦', '搭', '蛾', '发', '噶', '哈', '击', '喀', '垃', '妈', '拿', '哦', '啪', '期', '然', '撒', '塌', '挖', '夕', '压', '匝'];
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'W', 'X', 'Y', 'Z'];
  var COLL = (function () { try { return new Intl.Collator('zh-Hans-CN-u-co-pinyin'); } catch (e) { return null; } })();
  var EMOJIS = ['😀', '😄', '😁', '😆', '😊', '😍', '🥰', '😘', '😜', '😝', '🤪', '😎', '🤓', '😏', '😴', '😪',
    '😭', '😢', '🥺', '😤', '😡', '🤬', '😱', '😨', '😰', '🤔', '🤨', '😐', '😑', '🙄', '😬', '🤗',
    '🤭', '🤫', '😶', '😮', '😲', '🥳', '🤩', '🤤', '😋', '😵', '🤯', '🥶', '😇', '🤠', '💩', '👻',
    '👍', '👌', '✌️', '🙏', '👏', '💪', '🤝', '❤️', '💔', '💯', '🔥', '🎉', '🌹', '🍉', '🍺', '🐶'];
  var STATUS_POOL = ['在线', '忙碌中', '摸鱼中', '在听歌', '发呆', '出门散步', '学习中', '追剧中', '健身中', '准备休息'];
  var DEFAULT_EMOJI_GROUP = 'eg_default';

  var DB = loadDB();
  var LIKETUAN_ID = 'g_liketuan';
  var LT_COLORS = [
    { k: 'red', cn: '红', hex: '#FF6B6B' },
    { k: 'orange', cn: '橙', hex: '#FF9F45' },
    { k: 'yellow', cn: '黄', hex: '#FFD24C' },
    { k: 'green', cn: '绿', hex: '#6FD08C' },
    { k: 'cyan', cn: '青', hex: '#4EC8C8' },
    { k: 'blue', cn: '蓝', hex: '#6FA8FF' },
    { k: 'purple', cn: '紫', hex: '#B38CFF' }
  ];
  var LT_TIERS = [
    { k: 'li', cn: '粒' },
    { k: 'ke', cn: '颗' },
    { k: 'tuan', cn: '团' }
  ];
  var LIKETUAN_MEMBERS = (function () {
    var out = [];
    LT_TIERS.forEach(function (t) {
      LT_COLORS.forEach(function (c) {
        out.push({ id: 'lm_' + c.k + '_' + t.k, name: c.cn + t.cn, color: c.hex, tier: t.k });
      });
    });
    return out;
  })();
  seedLiketuan();
  var activeTab = 'chat';
  var activeGroupId = null;
  var selected = {};
  var editingFriend = null;
  var editingCard = null;
  var activeFriendId = null;
  var pendingCallGroupId = null;
  var toastTimer = null;
  var libSearch = '';
  var libFilterGroup = null;
  var libBatchMode = false;
  var libSelected = {};
  var replyTimer = null;
  var typingOn = false;
  var statusTimer = null;
  var profileIsMe = false;
  var editingMe = false;
  var emojiGroupId = 'eg_default';
  var editingEmojiGroup = null;
  var editingEmojiImages = [];
  var emojiTab = 'emoji';

  var GROUP_COLORS = ['#FF6B6B', '#FF8E53', '#FFC542', '#51CF66', '#20C997', '#4DABF7', '#748FFC', '#DA77F2', '#F783AC', '#A9E34B', '#38D9A9', '#868E96'];

  /* ================= 数据 ================= */
  function normalizeMe(me) {
    me = me && typeof me === 'object' ? me : {};
    return {
      name: typeof me.name === 'string' && me.name.trim() ? me.name : '我',
      avatar: typeof me.avatar === 'string' ? me.avatar : '',
      color: me.color || '#07C160',
      region: typeof me.region === 'string' ? me.region : '',
      wxid: typeof me.wxid === 'string' ? me.wxid : '',
      status: typeof me.status === 'string' ? me.status : ''
    };
  }

  function normalizeEmojiItem(x) {
    if (typeof x === 'string' && x.trim()) return x.trim();
    if (x && typeof x === 'object' && typeof x.src === 'string' && x.src) {
      return { src: x.src, name: typeof x.name === 'string' ? x.name.slice(0, 16) : '表情' };
    }
    return null;
  }

  function normalizeEmojiGroups(list) {
    var out = (Array.isArray(list) ? list : []).map(function (g) {
      var items = (Array.isArray(g.items) ? g.items : []).map(normalizeEmojiItem).filter(Boolean);
      return {
        id: g.id || uid('eg_'),
        name: g.name || '表情库',
        items: items,
        builtin: !!g.builtin
      };
    });
    if (!out.some(function (g) { return g.builtin; })) {
      out.unshift({ id: DEFAULT_EMOJI_GROUP, name: '默认表情', items: EMOJIS.slice(), builtin: true });
    }
    return out;
  }

  function loadDB() {
    try {
      var raw = localStorage.getItem(KEY);
      var d = raw ? JSON.parse(raw) : {};
      var db = {
        me: normalizeMe(d.me),
        friends: Array.isArray(d.friends) ? d.friends : [],
        groups: (Array.isArray(d.groups) ? d.groups : []).map(function (g) {
          g.memberIds = Array.isArray(g.memberIds) ? g.memberIds : [];
          g.messages = (Array.isArray(g.messages) ? g.messages : []).map(function (m) {
            if (!m.type) m.type = 'text';
            if (typeof m.mine !== 'boolean') m.mine = true;
            return m;
          });
          g.pinned = !!g.pinned;
          g.muted = !!g.muted;
          g.bg = g.bg || 'gray';
          if (Array.isArray(g.members)) g.members.forEach(function (m) { delete m._av; });
          return g;
        }),
        cards: (Array.isArray(d.cards) ? d.cards : []).map(function (c) {
          if (typeof c.groupId !== 'string') c.groupId = null;
          if (typeof c.disabled !== 'boolean') c.disabled = false;
          return c;
        }),
        cardGroups: Array.isArray(d.cardGroups) ? d.cardGroups : [],
        emojiGroups: normalizeEmojiGroups(d.emojiGroups),
        settings: d.settings && typeof d.settings === 'object' ? d.settings : {}
      };
      var s = db.settings;
      if (typeof s.replyDelayMin !== 'number') s.replyDelayMin = 3000;
      if (typeof s.replyDelayMax !== 'number') s.replyDelayMax = 7000;
      if (typeof s.typingIndicatorEnabled !== 'boolean') s.typingIndicatorEnabled = true;
      if (!Array.isArray(s.statusPool) || !s.statusPool.length) s.statusPool = STATUS_POOL.slice();

      if (typeof db.me.wxid !== 'string' || !db.me.wxid) db.me.wxid = 'asdf' + Math.floor(100000 + Math.random() * 899999);
      if (typeof db.me.status !== 'string') db.me.status = '';
      if (!Array.isArray(db.favorites)) db.favorites = [];

      db.friends.forEach(function (f) {
        if (typeof f.region !== 'string') f.region = '';
        if (typeof f.autoReply !== 'boolean') f.autoReply = true;
        if (typeof f.status !== 'string' || !f.status) f.status = randomFrom(s.statusPool);
        if (typeof f.statusAt !== 'number') f.statusAt = Date.now();
        if (typeof f.statusNext !== 'number') f.statusNext = 1 + Math.random() * 7;
      });
      return db;
    } catch (e) {
      return {
        me: normalizeMe(null),
        friends: [],
        groups: [],
        cards: [],
        cardGroups: [],
        favorites: [],
        emojiGroups: normalizeEmojiGroups(null),
        settings: { replyDelayMin: 3000, replyDelayMax: 7000, typingIndicatorEnabled: true, statusPool: ['在线', '忙碌中', '摸鱼中', '在听歌', '发呆', '出门散步', '学习中', '追剧中', '健身中', '准备休息'] }
      };
    }
  }

  function saveDB() {
    try {
      localStorage.setItem(KEY, JSON.stringify(DB));
      return true;
    } catch (e) {
      toast('本地存储空间不足，头像可换小一点');
      return false;
    }
  }

  // 默认系统会话「粒颗团」：21 人（7 色 × 粒/颗/团 三种大小），每人一张带脸带名字标签的头像
  function seedLiketuan() {
    var now = Date.now();
    var seededMsgs = [
      { id: 'm_lt1', type: 'text', mine: false, senderId: 'lm_red_li', text: '新来的团子，先滚一圈打个招呼吧～', ts: now - 9 * 60 * 1000 },
      { id: 'm_lt2', type: 'text', mine: false, senderId: 'lm_yellow_ke', text: '刚刚被捏了一下，我鼓起来了', ts: now - 6 * 60 * 1000 },
      { id: 'm_lt3', type: 'text', mine: false, senderId: 'lm_cyan_tuan', text: '安静一会，能量在慢慢散开', ts: now - 3 * 60 * 1000 },
      { id: 'm_lt4', type: 'text', mine: false, senderId: 'lm_purple_li', text: '我先滚到角落睡一觉啦', ts: now - 40 * 1000 }
    ];
    var g = groupById(LIKETUAN_ID);
    if (!g) {
      DB.groups.unshift({
        id: LIKETUAN_ID,
        name: '粒颗团',
        memberIds: [],
        members: LIKETUAN_MEMBERS.slice(),
        memberCount: 21,
        avatar: 'img/liketuan.svg',
        system: true,
        createdAt: now - 10 * 60 * 1000,
        messages: seededMsgs,
        pinned: false,
        muted: false,
        bg: 'gray'
      });
      saveDB();
      return;
    }
    // 旧版本已注入过：补上成员，并只替换系统种子消息
    if (!Array.isArray(g.members) || !g.members.length) {
      g.members = LIKETUAN_MEMBERS.slice();
      if (!g.memberCount) g.memberCount = 21;
      g.messages = seededMsgs.concat((g.messages || []).filter(function (m) {
        return String(m.id || '').indexOf('m_lt') !== 0;
      }));
      saveDB();
    }
  }

  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function friendById(id) { return DB.friends.filter(function (f) { return f.id === id; })[0] || null; }
  function groupById(id) { return DB.groups.filter(function (g) { return g.id === id; })[0] || null; }
  function cardById(id) { return DB.cards.filter(function (c) { return c.id === id; })[0] || null; }
  function cardGroupById(id) { return DB.cardGroups.filter(function (g) { return g.id === id; })[0] || null; }
  function cardsByGroup(gid) { return DB.cards.filter(function (c) { return c.groupId === gid; }); }
  function randomColor() { return GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)]; }
  function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randomStatus() { return randomFrom(DB.settings.statusPool); }
  function emojiGroupById(id) { return DB.emojiGroups.filter(function (g) { return g.id === id; })[0] || null; }
  function activeEmojiGroup() { return emojiGroupById(emojiGroupId) || DB.emojiGroups[0] || null; }

  /* ================= 工具 ================= */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function initial(name) { var n = (name || '').trim(); return n ? n.charAt(0) : '友'; }
  function fmtListTime(ts) {
    var d = new Date(ts), n = new Date();
    if (d.toDateString() === n.toDateString()) return pad(d.getHours()) + ':' + pad(d.getMinutes());
    var y = new Date(n.getTime() - 86400000);
    if (d.toDateString() === y.toDateString()) return '昨天';
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }
  function msgTimeHTML(ts) {
    var d = new Date(ts), n = new Date();
    var hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
    var y = new Date(n.getTime() - 86400000);
    var main = d.toDateString() === y.toDateString() ? '昨天 ' + hm : hm;
    var date = (d.getMonth() + 1) + '月' + d.getDate() + '日';
    return '<div class="msg-time">' + main + '<em>' + date + '</em></div>';
  }
  function fmtDur(sec) {
    sec = Math.max(0, Math.round(sec));
    return pad(Math.floor(sec / 60)) + ':' + pad(sec % 60);
  }
  function collate(a, b) {
    if (COLL) return COLL.compare(a, b);
    try { return String(a).localeCompare(String(b), 'zh-Hans-CN'); }
    catch (e) { return 0; }
  }
  function letterOf(name) {
    var c = (name || '').trim().charAt(0);
    if (!c) return '#';
    if (/[A-Za-z]/.test(c)) return c.toUpperCase();
    if (!/[\u4e00-\u9fa5]/.test(c)) return '#';
    var lo = 0, hi = BOUNDS.length - 1, res = '#';
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (collate(BOUNDS[mid], c) <= 0) {
        res = LETTERS[mid];
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return res;
  }

  // 毫秒 → 秒（去掉多余的 .0）
  function secOf(ms) {
    var s = Math.round((Number(ms) || 0) / 100) / 10;
    return String(s);
  }

  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1600);
  }

  function avatarHTML(f, uid) {
    var attr = uid ? ' data-uid="' + uid + '"' : '';
    if (f && f.avatar) return '<div class="av"' + attr + '><img src="' + f.avatar + '" alt=""></div>';
    return '<div class="av"' + attr + ' style="background:' + ((f && f.color) || '#07C160') + '">' + esc(initial(f && f.name)) + '</div>';
  }

  function memberCountOf(g) {
    return g.memberCount || g.memberIds.length;
  }

  var LIKETUAN_AVATAR_CACHE = {};

  // 「粒颗团」成员头像：像开场动画里落地散开的纯色团子，底部沉到框外，只露到嘴巴下面一点，带腮红
  function blobAvatarFor(mem) {
    if (LIKETUAN_AVATAR_CACHE[mem.id]) return LIKETUAN_AVATAR_CACHE[mem.id];
    var r = mem.tier === 'tuan' ? 42 : mem.tier === 'ke' ? 33 : 26;
    var ry = Math.round(r * 0.94 * 10) / 10;
    var cy = 110 - ry;
    var ey = Math.round((cy - r * 0.1) * 10) / 10;
    var my = Math.round((cy + r * 0.2) * 10) / 10;
    var ex = Math.round(r * 0.2 * 10) / 10;
    var ew = Math.round(r * 0.1 * 10) / 10;
    var eh = Math.round(r * 0.16 * 10) / 10;
    var mw = Math.round(r * 0.36 * 10) / 10;
    var bx = Math.round(r * 0.62 * 10) / 10;
    var by = Math.round((my - r * 0.02) * 10) / 10;
    var brx = Math.round(r * 0.18 * 10) / 10;
    var bry = Math.round(r * 0.11 * 10) / 10;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<rect width="100" height="100" fill="#FFFBF4"/>' +
      '<ellipse cx="50" cy="' + cy + '" rx="' + r + '" ry="' + ry + '" fill="' + mem.color + '"/>' +
      '<ellipse cx="' + (50 - ex) + '" cy="' + ey + '" rx="' + ew + '" ry="' + eh + '" fill="#5C4436"/>' +
      '<ellipse cx="' + (50 + ex) + '" cy="' + ey + '" rx="' + ew + '" ry="' + eh + '" fill="#5C4436"/>' +
      '<path d="M' + (50 - mw / 2) + ',' + my + ' q' + (mw / 2) + ',' + (Math.round(r * 0.12 * 10) / 10) + ' ' + mw + ',0" stroke="#5C4436" stroke-width="' + (Math.round(r * 0.055 * 10) / 10) + '" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="' + (50 - bx) + '" cy="' + by + '" rx="' + brx + '" ry="' + bry + '" fill="#F58A96" opacity=".55"/>' +
      '<ellipse cx="' + (50 + bx) + '" cy="' + by + '" rx="' + brx + '" ry="' + bry + '" fill="#F58A96" opacity=".55"/>' +
      '</svg>';
    LIKETUAN_AVATAR_CACHE[mem.id] = 'data:image/svg+xml,' + encodeURIComponent(svg);
    return LIKETUAN_AVATAR_CACHE[mem.id];
  }

  function memberAsFriend(mem) {
    return { id: mem.id, name: mem.name, color: mem.color, avatar: blobAvatarFor(mem) };
  }

  function liketuanMember(id) {
    var g = groupById(activeGroupId);
    if (!g || !Array.isArray(g.members)) return null;
    for (var i = 0; i < g.members.length; i++) {
      if (g.members[i].id === id) return g.members[i];
    }
    return null;
  }

  function groupAvatarHTML(g) {
    if (g.avatar) return '<div class="gav gav-1"><img src="' + g.avatar + '" alt=""></div>';
    var members = g.memberIds.map(friendById).filter(Boolean).slice(0, 4);
    if (!members.length) return '<div class="gav gav-1"><span style="background:#C9C9C9">群</span></div>';
    return '<div class="gav gav-' + members.length + '">' + members.map(function (m) {
      if (m.avatar) return '<img src="' + m.avatar + '" alt="">';
      return '<span style="background:' + (m.color || '#07C160') + '">' + esc(initial(m.name)) + '</span>';
    }).join('') + '</div>';
  }

  function groupName(members) {
    var names = members.map(function (m) { return m.name; });
    if (names.length === 1) return names[0];
    if (names.length <= 3) return names.join('、');
    return names.slice(0, 2).join('、') + '等' + names.length + '人';
  }

  function shrinkImage(file, cb) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var size = 160;
      var canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      var ctx = canvas.getContext('2d');
      var side = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      cb(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = function () { URL.revokeObjectURL(url); cb(null); };
    img.src = url;
  }

  function copyText(text) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        toast('已复制到剪贴板');
      } catch (e) {
        toast('复制失败');
      }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('已复制到剪贴板'); }, fallback);
    } else {
      fallback();
    }
  }

  /* ================= 时间 ================= */
  function renderClock() {
    var d = new Date();
    var t = pad(d.getHours()) + ':' + pad(d.getMinutes());
    $('#sbClock').textContent = (d.getMonth() + 1) + '月' + d.getDate() + '日';
    $('#sbYear').textContent = d.getFullYear();
    if (activeTab === 'chat') {
      var title = $('#title');
      if (!title.classList.contains('live')) title.classList.add('live');
      title.textContent = t;
    }
  }
  function clockLoop() {
    renderClock();
    applyBottleTheme();
    setTimeout(clockLoop, 1000 - (Date.now() % 1000));
  }

  /* ================= 菜单 / 页面切换 ================= */
  function openMenu() {
    $('#plusMenu').classList.add('open');
    $('#mask').classList.add('open');
    $('#btnPlus').classList.add('active');
  }
  function closeMenu() {
    $('#plusMenu').classList.remove('open');
    $('#mask').classList.remove('open');
    $('#btnPlus').classList.remove('active');
  }

  function switchTab(key) {
    activeTab = key;
    $$('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === key); });
    closeMenu();
    $('#page-chat').classList.toggle('active', key === 'chat');
    $('#page-contacts').classList.toggle('active', key === 'contacts');
    $('#page-discover').classList.toggle('active', key === 'discover');
    $('#page-me').classList.toggle('active', key === 'me');
    // 我：微信「我」页没有导航标题栏
    $('.header').classList.toggle('header-off', key === 'me');
    $('#headerActions').classList.toggle('hidden', key === 'me');
    var title = $('#title');
    if (key === 'chat') {
      renderClock();
    } else if (key === 'me') {
      title.classList.remove('live');
      title.textContent = '';
    } else {
      title.classList.remove('live');
      title.textContent = NAMES[key];
    }
    if (key === 'contacts') renderContacts();
    if (key === 'me') renderMe();
  }

  function openScreen(id) {
    closeSheets();
    var el = document.getElementById(id);
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
  }
  function closeScreen(id) {
    var el = document.getElementById(id);
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
  }

  /* ---------------- 漂流瓶 ---------------- */
  var BOTTLE_NOTES = [
    { t: '今天海面很安静，我把没说出口的话装进瓶子。', s: '匿名的旅人' },
    { t: '如果你捡到它，替我看一眼今天的晚霞吧。', s: '海边的人' },
    { t: '有些话不适合说出口，只好交给海。', s: '某个陌生人' },
    { t: '愿你被这世界温柔以待，哪怕只有一点点。', s: '匿名的旅人' },
    { t: '瓶子漂了很久，希望你比我勇敢。', s: '海边的人' },
    { t: '今天路过一家面包店，想起一个很久没联系的人。', s: '某个陌生人' },
    { t: '如果生活有点累，就来海边坐一会儿。', s: '匿名的旅人' },
    { t: '我把好天气分你一半，剩下的留给明天。', s: '海边的人' }
  ];
  // 署名取自通讯录，15% 概率匿名
  function pickNoteSign() {
    var names = DB.friends.map(function (f) { return f.name; }).filter(function (n) { return typeof n === 'string' && n.trim(); });
    if (names.length && Math.random() < .85) return randomFrom(names);
    return '匿名的旅人';
  }
  var driftNotes = {};
  // 纸条内容由字卡库里的字卡拼成
  function composeNoteText() {
    var pool = getReplyPool();
    var texts = [];
    pool.forEach(function (c) {
      var v = (c.content || '').replace(/\s+/g, ' ').trim().replace(/[，。！？、；：,\.!?]+$/, '');
      if (v) texts.push(v);
    });
    if (!texts.length) {
      return BOTTLE_NOTES[Math.floor(Math.random() * BOTTLE_NOTES.length)].t;
    }
    var count = Math.min(texts.length, 1 + Math.floor(Math.random() * 3));
    var out = [];
    for (var i = 0; i < count; i++) {
      out.push(texts.splice(Math.floor(Math.random() * texts.length), 1)[0]);
    }
    return out.join('，');
  }
  // 拿上来的瓶子里装什么：纸条 / 空瓶 / 只有装饰品
  function makeDriftContent() {
    var r = Math.random();
    if (r < .12) {
      return { kind: 'empty', head: '空空的瓶子', text: '把瓶子拿起来晃了晃，里面空空的，只有一点海水在瓶底荡来荡去。', sign: '' };
    }
    if (r < .3) {
      return { kind: 'deco', head: '只有一点装饰品', text: '瓶子里没有纸条，只有几枚小小的贝壳和一点细沙，安静地躺在瓶底。', sign: '' };
    }
    return { kind: 'note', head: '来自海上的信', text: composeNoteText(), sign: pickNoteSign() };
  }
  var BOTTLE_STYLES = {
    round: '<g><rect x="-7" y="-98" width="14" height="11" rx="3.4" fill="#D9AE79" stroke="#B08E63" stroke-width="1"/>'
      + '<path d="M-6,-88 h12 v8 h-12 z" fill="url(#bGlass)" stroke="#8FA6BE" stroke-width=".9"/>'
      + '<path d="M-6,-80 C-16,-74 -22,-62 -22,-46 C-22,-24 -14,-2 -6,0 h12 C14,-2 22,-24 22,-46 C22,-62 16,-74 6,-80 Z" fill="url(#bGlass)" stroke="#8FA6BE" stroke-width="1"/>'
      + '<rect x="-10" y="-44" width="20" height="14" rx="1.6" fill="#FBF4E4" stroke="#CBB69A" stroke-width=".8" transform="rotate(-6)"/>'
      + '<path d="M-14,-62 C-19,-48 -17,-26 -11,-8" stroke="#FFFFFF" stroke-opacity=".7" stroke-width="1.6" fill="none"/>'
      + '<g class="bottle-contents"></g></g>',
    slim: '<g><rect x="-6" y="-112" width="12" height="10" rx="3" fill="#D9AE79" stroke="#B08E63" stroke-width="1"/>'
      + '<path d="M-5,-102 h10 v6 h-10 z" fill="url(#bGlass)" stroke="#8FA6BE" stroke-width=".9"/>'
      + '<path d="M-5,-96 C-6,-88 -8,-78 -9,-68 C-11,-52 -14,-26 -13,-4 h26 C14,-26 11,-52 9,-68 C8,-78 6,-88 5,-96 Z" fill="url(#bGlass)" stroke="#8FA6BE" stroke-width="1"/>'
      + '<rect x="-9.5" y="-46" width="19" height="12" rx="1.4" fill="#FBF4E4" stroke="#CBB69A" stroke-width=".8" transform="rotate(5)"/>'
      + '<path d="M-9,-78 C-12,-60 -13,-34 -11,-10" stroke="#FFFFFF" stroke-opacity=".7" stroke-width="1.4" fill="none"/>'
      + '<g class="bottle-contents"></g></g>',
    jar: '<g><rect x="-11" y="-92" width="22" height="12" rx="3.5" fill="#D9AE79" stroke="#B08E63" stroke-width="1"/>'
      + '<path d="M-9,-80 C-19,-70 -26,-50 -26,-24 C-26,-8 -20,0 -12,2 h24 C20,0 26,-8 26,-24 C26,-50 19,-70 9,-80 Z" fill="url(#bGlass)" stroke="#8FA6BE" stroke-width="1"/>'
      + '<rect x="-12" y="-50" width="24" height="14" rx="1.6" fill="#FBF4E4" stroke="#CBB69A" stroke-width=".8" transform="rotate(-4)"/>'
      + '<path d="M-18,-58 C-23,-44 -21,-20 -15,-6" stroke="#FFFFFF" stroke-opacity=".7" stroke-width="1.6" fill="none"/>'
      + '<g class="bottle-contents"></g></g>'
  };
  var BOTTLE_SHELL_ART = [
    '<path d="M0,-6 l2,4 4,0 -3,3 1,4 -4,-2 -4,2 1,-4 -3,-3 4,0 Z" fill="#EBA893" stroke="#C98C7A" stroke-width=".6"/>',
    '<path d="M-6,4 C-6,-4 -3,-7 0,-7 C3,-7 6,-4 6,4 Z" fill="#F0D3C2" stroke="#C8A08D" stroke-width=".6"/>',
    '<path d="M-5,4 C-5,-3 -2,-6 1,-6 C5,-6 6,-3 6,4 Z" fill="#E3CBA8" stroke="#BFA47E" stroke-width=".6"/>',
    '<path d="M-5,4 C-5,-3 -2,-6 1,-6 C4,-6 5,-3 5,4 Z" fill="#EFE0CB" stroke="#CBB79C" stroke-width=".6"/>'
  ];
  var BOTTLE_SLOTS = [[-8, -10], [7, -16], [0, -25], [-9, -30]];
  var BOTTLE_SEA = { x: 196, y: 470 };
  var dropTimers = [];
  var BOTTLE_NOTE_KEY = 'bottleNotes.v1';
  var bottleState = { style: 'round', collected: [], horizontal: false, notes: loadBottleNotes() };

  function loadBottleNotes() {
    try {
      var a = JSON.parse(localStorage.getItem(BOTTLE_NOTE_KEY) || '[]');
      return Array.isArray(a) ? a.filter(function (x) { return typeof x === 'string' && x; }).slice(0, 8) : [];
    } catch (e) { return []; }
  }

  function renderBottleArt() {
    var el = $('#mainBottleArt');
    if (!el) return;
    el.innerHTML = BOTTLE_STYLES[bottleState.style];
    var c = el.querySelector('.bottle-contents');
    if (!c) return;
    for (var k = 0; k < bottleState.collected.length && k < BOTTLE_SLOTS.length; k++) {
      var p = BOTTLE_SLOTS[k];
      c.insertAdjacentHTML('beforeend',
        '<g transform="translate(' + p[0] + ',' + p[1] + ') scale(.62) rotate(' + (k * 22 - 20) + ')">' +
        BOTTLE_SHELL_ART[bottleState.collected[k]] + '</g>');
    }
    for (var n = 0; n < bottleState.notes.length && n < 3; n++) {
      c.insertAdjacentHTML('beforeend',
        '<g transform="translate(' + (-2 + n * 2.5) + ',' + (-13 - n * 3) + ') rotate(' + (n * 8 - 10) + ')">' +
        '<rect x="-6" y="-4.6" width="12" height="9" rx="1.1" fill="#FFFDF3" stroke="#D8C9A6" stroke-width=".7"/>' +
        '<path d="M-4,-2.2 h8 M-4,0 h8 M-4,2.2 h5.4" stroke="#C0AE8C" stroke-width=".5" fill="none"/>' +
        '</g>');
    }
  }
  function applyBottleState() {
    var art = $('#mainBottleArt');
    if (!art) return;
    art.style.transform = bottleState.horizontal ? 'translate(-42px,6px) rotate(84deg)' : 'rotate(7deg)';
  }
  function playSplash() {
    var s = $('#bottleSplash');
    if (!s) return;
    s.classList.remove('play');
    setTimeout(function () { s.classList.add('play'); }, 30);
    setTimeout(function () { s.classList.remove('play'); }, 860);
  }
  function bottlePhase() {
    var h = new Date().getHours();
    if (h < 5) return 'dawn';
    if (h < 9) return 'morning';
    if (h < 12) return 'am';
    if (h < 14) return 'noon';
    if (h < 18) return 'pm';
    if (h < 20) return 'dusk';
    return 'night';
  }
  var BOTTLE_THEME_CLASSES = ['t-dawn', 't-morning', 't-am', 't-noon', 't-pm', 't-dusk', 't-night'];
  function applyBottleTheme() {
    var el = $('#pageBottle');
    if (!el) return;
    var cls = 't-' + bottlePhase();
    if (el.classList.contains(cls)) return;
    for (var i = 0; i < BOTTLE_THEME_CLASSES.length; i++) el.classList.remove(BOTTLE_THEME_CLASSES[i]);
    el.classList.add(cls);
  }
  function openBottle() {
    ensureSeaState();
    startSeaClock();
    applyShellState();
    startShellClock();
    renderDriftBottles();
    renderNoteBox();
    renderBottleArt();
    stowMain();
    applyBottleTheme();
    startBottleWind();
    openScreen('pageBottle');
  }
  var BOX_KEY = 'bottleBox.v1';
  var bottleBox = (function () {
    try { var v = JSON.parse(localStorage.getItem(BOX_KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  })();
  function saveBottleBox() {
    try { localStorage.setItem(BOX_KEY, JSON.stringify(bottleBox)); } catch (e) {}
  }
  function renderNoteBox() {
    var list = $('#noteBoxList');
    if (!list) return;
    if (!bottleBox.length) {
      list.innerHTML = '<div class="nb-empty">还没有收起来的纸条</div>';
      return;
    }
    var html = '';
    for (var i = bottleBox.length - 1; i >= 0; i--) {
      var n = bottleBox[i];
      html += '<button class="nb-item" data-box="' + i + '"><span class="nb-line">' + esc(n.t) + '</span><em>' + esc(n.s) + '</em></button>';
    }
    list.innerHTML = html;
  }

  var activeLetterBottle = null;
  var activeLetterNote = null;
  function paintLetter(n) {
    var head = $('#bottleLetterHead');
    if (head) head.textContent = n.head || '来自海上的信';
    $('#bottleLetterText').textContent = n.text;
    var signEl = $('#bottleLetterSign');
    signEl.textContent = n.sign ? '— ' + n.sign : '';
    signEl.style.display = n.sign ? '' : 'none';
    var keep = $('#blKeep');
    if (keep) keep.style.display = n.kind === 'note' ? '' : 'none';
    var acts = $('.bl-actions');
    if (acts) acts.style.display = activeLetterBottle ? '' : 'none';
    var box = $('#bottleLetter');
    box.classList.remove('hidden');
    box.setAttribute('aria-hidden', 'false');
  }
  function showBottleLetter(id, el) {
    var n = driftNotes[id];
    if (!n) return;
    activeLetterNote = n.kind === 'note' ? { t: n.text, s: n.sign } : null;
    activeLetterBottle = el || null;
    if (el) el.classList.add('holding');
    paintLetter(n);
  }
  function showBoxNote(i) {
    var n = bottleBox[i];
    if (!n) return;
    activeLetterBottle = null;
    activeLetterNote = null;
    paintLetter({ text: n.t, sign: n.s });
  }
  function closeBottleLetter() {
    var box = $('#bottleLetter');
    box.classList.add('hidden');
    box.setAttribute('aria-hidden', 'true');
    if (activeLetterBottle) {
      if (!activeLetterBottle.classList.contains('picked')) activeLetterBottle.classList.remove('holding');
      activeLetterBottle = null;
    }
    activeLetterNote = null;
  }
  function keepLetterBottle() {
    var el = activeLetterBottle;
    var note = activeLetterNote;
    if (note) {
      bottleBox.push({ t: note.t, s: note.s });
      saveBottleBox();
      renderNoteBox();
    }
    if (el) {
      removeDriftSlot(el.getAttribute('data-note'));
      el.classList.remove('holding');
      el.classList.add('picked');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 560);
      activeLetterBottle = null;
      toast('纸条收进盒子了');
    }
    activeLetterNote = null;
    closeBottleLetter();
  }
  // 让瓶子继续漂：3 秒后瓶子向上消失
  function releaseLetterBottle() {
    var el = activeLetterBottle;
    closeBottleLetter();
    if (!el) return;
    el.classList.add('releasing');
    setTimeout(function () {
      el.classList.add('floating-up');
      setTimeout(function () {
        removeDriftSlot(el.getAttribute('data-note'));
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 640);
    }, 3000);
  }
  function openBottleNote() {
    var t = $('#noteText');
    if (!t) return;
    t.value = '';
    openSheet('sheetNote');
    setTimeout(function () { try { t.focus(); } catch (e) {} }, 260);
  }
  function saveBottleNote() {
    var t = $('#noteText');
    var v = t && typeof t.value === 'string' ? t.value.replace(/\s+/g, ' ').trim() : '';
    if (!v) { toast('先写点什么吧'); return; }
    bottleState.notes.unshift(v.slice(0, 200));
    bottleState.notes = bottleState.notes.slice(0, 8);
    try { localStorage.setItem(BOTTLE_NOTE_KEY, JSON.stringify(bottleState.notes)); } catch (e) {}
    renderBottleArt();
    closeSheets();
    toast('纸条已塞进瓶子');
  }

  /* ---- 海面漂流瓶：随风缓慢漂移 ---- */
  var DRIFT_SPOTS = [
    [38, 300, .5, 8], [112, 284, .46, -14], [298, 292, .52, 6], [356, 348, .58, -8],
    [64, 384, .62, 12], [210, 352, .56, -6], [286, 416, .72, 10], [48, 458, .78, -10],
    [170, 500, .84, 7], [326, 480, .8, -12], [108, 528, .9, 5]
  ];
  var BOTTLE_TAP_ART = '<path d="M-12,-20 C-15,-8 -15,16 -11,26 C-4,30 4,30 11,26 C15,16 15,-8 12,-20 Z" fill="url(#bGlass)" stroke="#8FA6BE" stroke-opacity=".5" stroke-width="1"/>'
    + '<rect x="-6" y="-31" width="12" height="11" rx="3.5" fill="#D9AE79" stroke="#B08E63" stroke-opacity=".5" stroke-width="1"/>'
    + '<rect x="-6.6" y="-22" width="13.2" height="3" fill="#F1E6D3" opacity=".92"/>'
    + '<path d="M-9,-6 C-11,6 -9,16 -5,21" stroke="#FFFFFF" stroke-opacity=".65" stroke-width="1.4" fill="none"/>';

  function bottleInnerArt(kind, seed) {
    if (kind === 'empty') return '';
    if (kind === 'deco') {
      var out = '<rect x="-9" y="17" width="18" height="5" rx="2.4" fill="#EFE0CB" opacity=".7"/>';
      var n = 1 + (seed % 3);
      for (var k = 0; k < n; k++) {
        out += '<g transform="translate(' + (k * 6 - 6 + (seed % 3)) + ',' + (13 + (k % 2) * 6) + ') scale(.42) rotate(' + (k * 28 - 24) + ')">'
          + BOTTLE_SHELL_ART[(seed + k) % 4] + '</g>';
      }
      return out;
    }
    return '<rect x="-8" y="1" width="16" height="11" rx="1.5" fill="#FBF4E4" stroke="#CBB69A" stroke-opacity=".55" stroke-width=".8" transform="rotate(-7)"/>'
      + '<path d="M-5,4 h10 M-5,7 h7" stroke="#D8C9A6" stroke-width=".9" opacity=".8" transform="rotate(-7)"/>';
  }

  function driftBottleMarkup(x, y, s, rot, i, content) {
    var dur = 7 + (i % 5) * 2.2;
    var c = content || makeDriftContent();
    driftNotes[i] = c;
    return '<g class="bottle-tap" data-i="' + i + '" data-x="' + x + '" data-y="' + y + '" data-note="' + i + '" transform="translate(' + x + ',' + y + ') scale(' + s + ') rotate(' + rot + ')">'
      + '<g class="pickwrap">'
      + '<g class="drift" style="animation-duration:' + dur + 's;animation-delay:' + (-(i % 7) * 1.3) + 's">'
      + '<ellipse cx="0" cy="16" rx="27" ry="4.4" fill="none" stroke="var(--foam)" stroke-width="1" opacity=".42"/>'
      + '<g class="bob" style="animation-delay:' + (-(i % 6) * .7) + 's">'
      + '<g class="tilt" style="animation-delay:' + (-(i % 4) * 1.1) + 's">'
      + BOTTLE_TAP_ART
      + bottleInnerArt(c.kind, i)
      + '</g></g></g></g></g>';
  }

  /* ---- 海上瓶子的新陈代谢：6-48 小时刷新一只，海满则替换最久没被捞的 ---- */
  var SEA_KEY = 'bottleSea.v2';
  var SEA_HOUR = 3600000;
  var seaState = null;
  var seaTimer = null;

  function randSeaHours() { return 6 + Math.random() * 42; }

  function loadSeaState() {
    try {
      var s = JSON.parse(localStorage.getItem(SEA_KEY) || 'null');
      if (s && typeof s === 'object' && s.slots && typeof s.slots === 'object') return s;
    } catch (e) {}
    return null;
  }
  function saveSeaState() {
    try { localStorage.setItem(SEA_KEY, JSON.stringify(seaState)); } catch (e) {}
  }
  function makeSlotContent() {
    var c = makeDriftContent();
    return { kind: c.kind, head: c.head, text: c.text, sign: c.sign, bornAt: Date.now() };
  }
  function firstEmptySlot() {
    for (var i = 0; i < DRIFT_SPOTS.length; i++) {
      if (!seaState.slots[i]) return i;
    }
    return -1;
  }
  function oldestSlot() {
    var best = -1, oldest = Infinity;
    for (var i = 0; i < DRIFT_SPOTS.length; i++) {
      var c = seaState.slots[i];
      if (!c) continue;
      var at = c.bornAt || 0;
      if (at < oldest) { oldest = at; best = i; }
    }
    return best;
  }
  function nearestEmptySlot(x, y) {
    var best = -1, dist = Infinity;
    for (var i = 0; i < DRIFT_SPOTS.length; i++) {
      if (seaState.slots[i]) continue;
      var p = DRIFT_SPOTS[i];
      var d = (p[0] - x) * (p[0] - x) + (p[1] - y) * (p[1] - y);
      if (d < dist) { dist = d; best = i; }
    }
    return best;
  }
  function checkSeaRefill() {
    if (!seaState) return false;
    var changed = false, guard = 0;
    while (Date.now() >= seaState.next && guard < 60) {
      var empty = firstEmptySlot();
      if (empty >= 0) {
        seaState.slots[empty] = makeSlotContent();
      } else {
        var old = oldestSlot();
        if (old >= 0) seaState.slots[old] = makeSlotContent();
      }
      seaState.next += randSeaHours() * SEA_HOUR;
      changed = true;
      guard++;
    }
    if (guard >= 60) seaState.next = Date.now() + randSeaHours() * SEA_HOUR;
    if (changed) saveSeaState();
    return changed;
  }
  function ensureSeaState() {
    if (seaState) return checkSeaRefill();
    var changed = false;
    seaState = loadSeaState();
    if (!seaState) {
      seaState = { next: Date.now() + randSeaHours() * SEA_HOUR, slots: {} };
      for (var i = 0; i < DRIFT_SPOTS.length; i++) seaState.slots[i] = makeSlotContent();
      saveSeaState();
      changed = true;
    }
    if (checkSeaRefill()) changed = true;
    return changed;
  }
  function startSeaClock() {
    if (seaTimer) return;
    seaTimer = setInterval(function () {
      if (!seaState) return;
      if (checkSeaRefill()) {
        renderDriftBottles();
        toast('海上又漂来一只新瓶子');
      }
    }, 60000);
  }
  function removeDriftSlot(id) {
    if (!seaState || !seaState.slots[id]) return;
    delete seaState.slots[id];
    saveSeaState();
  }

  /* ---- 沙滩贝壳：捡走后 5 分钟 - 6 小时随机补回一枚 ---- */
  var SHELL_KEY = 'bottleShells.v1';
  var shellRefreshTimer = null;
  var shellState = loadShellState();

  function loadShellState() {
    try {
      var s = JSON.parse(localStorage.getItem(SHELL_KEY) || 'null');
      if (s && Array.isArray(s.taken)) {
        return {
          taken: s.taken.filter(function (n) { return typeof n === 'number'; }),
          next: Number(s.next) || 0
        };
      }
    } catch (e) {}
    return { taken: [], next: 0 };
  }
  function saveShellState() {
    try { localStorage.setItem(SHELL_KEY, JSON.stringify(shellState)); } catch (e) {}
  }
  function randShellDelay() {
    return (5 * 60 + Math.random() * (6 * 3600 - 5 * 60)) * 1000;
  }
  function applyShellState() {
    $$('.sand-shell').forEach(function (el) {
      var i = parseInt(el.getAttribute('data-shell'), 10);
      el.classList.toggle('taken', shellState.taken.indexOf(i) >= 0);
    });
  }
  function checkShellRefresh() {
    if (!shellState.next || Date.now() < shellState.next) return false;
    if (!shellState.taken.length) {
      shellState.next = 0;
      saveShellState();
      return false;
    }
    var k = Math.floor(Math.random() * shellState.taken.length);
    shellState.taken.splice(k, 1);
    shellState.next = shellState.taken.length ? Date.now() + randShellDelay() : 0;
    saveShellState();
    applyShellState();
    return true;
  }
  function startShellClock() {
    if (shellRefreshTimer) return;
    shellRefreshTimer = setInterval(function () {
      if (checkShellRefresh()) toast('沙滩上又多了一枚贝壳');
    }, 60000);
  }

  function renderDriftBottles() {
    var box = $('#driftBottles');
    if (!box || !seaState) return;
    var html = '';
    for (var i = 0; i < DRIFT_SPOTS.length; i++) {
      var c = seaState.slots[i];
      if (!c) continue;
      var p = DRIFT_SPOTS[i];
      var x = typeof c.x === 'number' ? c.x : p[0];
      var y = typeof c.y === 'number' ? c.y : p[1];
      var s = typeof c.s === 'number' ? c.s : p[2];
      var rot = typeof c.rot === 'number' ? c.rot : p[3];
      html += driftBottleMarkup(x, y, s, rot, i, c);
    }
    box.innerHTML = html;
  }

  var bottleWindTimer = null;
  function setBottleWind(w) {
    var el = $('#pageBottle');
    if (el) el.style.setProperty('--wind', w.toFixed(2));
  }
  function bottleWindTick() {
    setBottleWind(Math.random() * 2 - 1);
    bottleWindTimer = setTimeout(bottleWindTick, 14000 + Math.random() * 14000);
  }
  function startBottleWind() {
    if (bottleWindTimer) return;
    setBottleWind((Math.random() * 2 - 1) * .8);
    bottleWindTimer = setTimeout(bottleWindTick, 14000 + Math.random() * 14000);
  }

  /* ---- 主瓶：收起 / 出现在屏幕中央 / 长按抛掷 ---- */
  var TOSS_TARGETS = { near: { x: 96, y: 528, s: .92 }, mid: { x: 252, y: 418, s: .74 }, far: { x: 312, y: 302, s: .52 } };
  var bottleLongTimer = null;
  var bottleLongFired = false;

  function hideTossPop() {
    var p = $('#tossPop');
    if (p) { p.classList.add('hidden'); p.setAttribute('aria-hidden', 'true'); }
  }
  function openTossPop() {
    var p = $('#tossPop');
    if (!p) return;
    p.classList.remove('hidden');
    p.setAttribute('aria-hidden', 'false');
  }
  function stowMain() {
    var b = $('#mainBottle'), r = $('#mainRing');
    if (!b) return;
    b.classList.remove('tossing', 'showing');
    b.classList.add('stowed');
    if (r) r.classList.add('stowed');
    bottleState.horizontal = false;
    applyBottleState();
    hideTossPop();
  }
  function showMain() {
    var b = $('#mainBottle'), a = $('#mainAnchor');
    if (!b) return;
    if (a) a.setAttribute('transform', 'translate(195,352)');
    b.classList.remove('stowed', 'tossing');
    void b.offsetWidth;
    b.classList.add('showing');
    bottleState.horizontal = false;
    applyBottleState();
  }
  function spawnTossedBottle(t) {
    var box = $('#driftBottles');
    if (!box || !seaState) return;
    var idx = nearestEmptySlot(t.x, t.y);
    if (idx < 0) {
      idx = oldestSlot();
      if (idx >= 0) {
        var old = box.querySelector('[data-i="' + idx + '"]');
        if (old && old.parentNode) old.parentNode.removeChild(old);
      }
    }
    if (idx < 0) return;
    var c = makeSlotContent();
    c.x = t.x;
    c.y = t.y;
    c.s = t.s;
    c.rot = 4;
    seaState.slots[idx] = c;
    saveSeaState();
    box.insertAdjacentHTML('beforeend', driftBottleMarkup(t.x, t.y, t.s, 4, idx, c));
    var el = box.querySelector('[data-i="' + idx + '"]');
    if (el) {
      setTimeout(function () {
        if (!el.parentNode || el.classList.contains('holding')) return;
        el.classList.add('floating-up');
        setTimeout(function () {
          removeDriftSlot(idx);
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 640);
      }, 3000);
    }
  }
  function tossMain(to) {
    var t = TOSS_TARGETS[to];
    var b = $('#mainBottle'), r = $('#mainRing');
    if (!t || !b) return;
    hideTossPop();
    closeBottleLetter();
    dropTimers.forEach(function (x) { clearTimeout(x); });
    dropTimers = [];
    b.style.setProperty('--tx', (t.x - 195) + 'px');
    b.style.setProperty('--ty', (t.y - 352) + 'px');
    b.classList.remove('showing', 'stowed');
    void b.offsetWidth;
    b.classList.add('tossing');
    if (r) r.classList.add('stowed');
    dropTimers.push(setTimeout(function () {
      var sp = $('#mainSplash');
      if (sp) sp.setAttribute('transform', 'translate(' + t.x + ',' + t.y + ')');
      playSplash();
      var sr = $('#seaRing');
      if (sr) sr.classList.add('on');
      spawnTossedBottle(t);
      dropTimers.push(setTimeout(function () { if (sr) sr.classList.remove('on'); }, 1300));
    }, 1300));
    dropTimers.push(setTimeout(function () {
      stowMain();
      toast('瓶子顺着风漂走了');
    }, 1480));
  }
  function bindBottleLongPress() {
    var b = $('#mainBottle');
    if (!b) return;
    b.addEventListener('pointerdown', function () {
      if (b.classList.contains('stowed')) return;
      bottleLongFired = false;
      clearTimeout(bottleLongTimer);
      bottleLongTimer = setTimeout(function () {
        bottleLongFired = true;
        openTossPop();
      }, 520);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
      b.addEventListener(ev, function () { clearTimeout(bottleLongTimer); });
    });
  }

  /* ---------------- 我的点滴日常 ---------------- */
  var DIARY_KEY = 'diary.v1';
  var DIARY_PHOTO_MAX = 720;
  var DIARY_STICKERS = [
    { key: 'star', label: '星星', art: '<path d="M20 4.2l4.6 10 11 1.2-8.3 7.6 2.4 10.8L20 28.4l-9.7 5.4 2.4-10.8L4.4 15.4l11-1.2z" fill="#F7C948" stroke="#DFA72B" stroke-width="1.4" stroke-linejoin="round"/>' },
    { key: 'heart', label: '爱心', art: '<path d="M20 33.4C10.6 26 4 20.6 4 14.6 4 9.8 7.7 6 12.2 6c3 0 5.7 1.9 7.8 4.7C22.1 7.9 24.8 6 27.8 6 32.3 6 36 9.8 36 14.6c0 6-6.6 11.4-16 18.8z" fill="#F28A8A" stroke="#D96B6B" stroke-width="1.3" stroke-linejoin="round"/>' },
    { key: 'flower', label: '小花', art: '<g fill="#F7B2C8" stroke="#DE8FAB" stroke-width="1.2"><circle cx="20" cy="10" r="6"/><circle cx="28.6" cy="16.4" r="6"/><circle cx="25.3" cy="26.4" r="6"/><circle cx="14.7" cy="26.4" r="6"/><circle cx="11.4" cy="16.4" r="6"/></g><circle cx="20" cy="20" r="5" fill="#F7D774" stroke="#E0B840" stroke-width="1.1"/>' },
    { key: 'shell', label: '贝壳', art: '<path d="M20 8C10.4 8 5 16.4 5 26c0 3.2 2.2 5.4 5.4 5.4h19.2c3.2 0 5.4-2.2 5.4-5.4 0-9.6-5.4-18-15-18z" fill="#F3D2C0" stroke="#C99C86" stroke-width="1.3" stroke-linejoin="round"/><g stroke="#C99C86" stroke-width=".9" fill="none"><path d="M20 10.5v20M13.2 12.6l-2 17M26.8 12.6l2 17M8.4 19.4l-1 10.6M31.6 19.4l1 10.6"/></g>' },
    { key: 'sun', label: '太阳', art: '<circle cx="20" cy="20" r="8" fill="#FFD06A" stroke="#E8A93B" stroke-width="1.2"/><g stroke="#F5B94B" stroke-width="1.8" stroke-linecap="round"><path d="M20 3.6v5M20 31.4v5M3.6 20h5M31.4 20h5M8.4 8.4l3.5 3.5M28.1 28.1l3.5 3.5M31.6 8.4l-3.5 3.5M11.9 28.1L8.4 31.6"/></g>' },
    { key: 'leaf', label: '叶子', art: '<path d="M31 7.6C18.6 7.6 7.6 15.8 7.6 27c0 3.2 2.2 5.4 5.4 5.4C24 32.4 32 21.4 32 9.4c0-1-.3-1.8-1-1.8z" fill="#9ED3A7" stroke="#6FA97B" stroke-width="1.3" stroke-linejoin="round"/><path d="M11.6 32.2C15.6 24 22 18 30 14.4" stroke="#6FA97B" stroke-width="1.2" fill="none"/>' }
  ];
  var diaryIndex = 0;
  var diarySelectedId = null;
  var diaryFlipLock = false;
  var diaryFlipTimer = null;
  var diaryCrop = null;
  var DIARY = diarySeed();

  function diaryBlankEntry() {
    return { id: uid('d_'), title: '', text: '', items: [], createdAt: Date.now() };
  }

  function normalizeDiaryEntry(e) {
    if (!e || typeof e !== 'object') return null;
    if (typeof e.id !== 'string' || !e.id) e.id = uid('d_');
    if (typeof e.title !== 'string') e.title = '';
    if (typeof e.text !== 'string') e.text = '';
    if (!Array.isArray(e.items)) e.items = [];
    e.items = e.items.filter(function (it) {
      return it && it.src && (it.type === 'photo' || it.type === 'sticker');
    }).map(function (it) {
      return {
        id: typeof it.id === 'string' && it.id ? it.id : uid('i_'),
        type: it.type,
        src: it.src,
        x: Number(it.x) || 0,
        y: Number(it.y) || 0,
        w: Number(it.w) || 72,
        h: Number(it.h) || 72,
        rot: Number(it.rot) || 0
      };
    });
    if (typeof e.createdAt !== 'number') e.createdAt = Date.now();
    return e;
  }

  function diaryReadRaw() {
    try {
      var raw = localStorage.getItem(DIARY_KEY);
      var d = raw ? JSON.parse(raw) : null;
      if (d && Array.isArray(d.entries)) return d.entries.map(normalizeDiaryEntry).filter(Boolean);
    } catch (e) {}
    return null;
  }

  function diarySeed() {
    var entries = diaryReadRaw();
    if (entries && entries.length) return { entries: entries };
    var d = { entries: [diaryBlankEntry()] };
    try { localStorage.setItem(DIARY_KEY, JSON.stringify(d)); } catch (e) { toast('本地存储不可用，日记可能无法保存'); }
    return d;
  }

  function saveDiary() {
    try {
      localStorage.setItem(DIARY_KEY, JSON.stringify(DIARY));
      return true;
    } catch (e) {
      toast('存储空间不足，图片可以裁小一点');
      return false;
    }
  }

  function currentDiaryEntry() {
    if (!DIARY.entries.length) DIARY.entries.push(diaryBlankEntry());
    if (diaryIndex < 0) diaryIndex = 0;
    if (diaryIndex >= DIARY.entries.length) diaryIndex = DIARY.entries.length - 1;
    return DIARY.entries[diaryIndex];
  }

  function diaryItemById(id) {
    if (!id) return null;
    var e = DIARY.entries[diaryIndex];
    if (!e) return null;
    for (var i = 0; i < e.items.length; i++) {
      if (e.items[i].id === id) return e.items[i];
    }
    return null;
  }

  function diaryDateLabel(ts) {
    var d = new Date(Number(ts) || Date.now());
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function diaryClamp(v, min, max) {
    if (max < min) return min;
    return Math.min(Math.max(v, min), max);
  }

  function diaryPageSize() {
    var wrap = $('#diaryLayers');
    return { w: wrap ? wrap.clientWidth : 260, h: wrap ? wrap.clientHeight : 340 };
  }

  function diaryStickerData(art) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">' + art + '</svg>');
  }

  function openDiary() {
    if (!DIARY.entries.length) DIARY.entries.push(diaryBlankEntry());
    if (diaryIndex >= DIARY.entries.length) diaryIndex = DIARY.entries.length - 1;
    if (diaryIndex < 0) diaryIndex = 0;
    diarySelectedId = null;
    $('#diaryTray').classList.add('hidden');
    closeDiaryCrop();
    closeDiaryToc();
    openScreen('pageDiary');
    renderDiary(true);
  }

  function closeDiary() {
    diaryFlushFields();
    diarySelectedId = null;
    $('#diaryTray').classList.add('hidden');
    closeDiaryCrop();
    closeDiaryToc();
    closeScreen('pageDiary');
  }

  function diaryFlushFields() {
    var e = DIARY.entries[diaryIndex];
    if (!e) return;
    var t = $('#diaryTitleInput');
    var b = $('#diaryTextInput');
    var changed = false;
    if (t && e.title !== t.value) { e.title = t.value; changed = true; }
    if (b && e.text !== b.value) { e.text = b.value; changed = true; }
    if (changed) saveDiary();
  }

  function renderDiary(resetFields) {
    var e = currentDiaryEntry();
    if (!e) return;
    var total = DIARY.entries.length;
    var no = $('#diaryPageNo');
    if (no) no.textContent = (diaryIndex + 1) + ' / ' + total;
    var stamp = $('#diaryStamp');
    if (stamp) stamp.textContent = diaryDateLabel(e.createdAt) + ' · 第 ' + (diaryIndex + 1) + ' 页';
    var title = $('#diaryTitleInput');
    var text = $('#diaryTextInput');
    if (resetFields) {
      if (title) title.value = e.title || '';
      if (text) { text.value = e.text || ''; text.scrollTop = 0; }
    }
    renderDiaryItems();
  }

  function renderDiaryItems() {
    var wrap = $('#diaryLayers');
    if (!wrap) return;
    var e = currentDiaryEntry();
    var html = '';
    e.items.forEach(function (it) {
      html += '<div class="diary-item ' + (it.type === 'sticker' ? 'sticker' : 'photo') +
        (it.id === diarySelectedId ? ' selected' : '') + '" data-iid="' + it.id + '" data-itype="' + it.type +
        '" style="left:' + it.x + 'px;top:' + it.y + 'px;width:' + it.w + 'px;height:' + it.h +
        'px;transform:rotate(' + it.rot + 'deg)"><img src="' + esc(it.src) + '" alt=""></div>';
    });
    wrap.innerHTML = html;
    updateDiaryItemBar();
  }

  function updateDiaryItemBar() {
    var bar = $('#diaryItemBar');
    if (!bar) return;
    var it = diaryItemById(diarySelectedId);
    if (!it) {
      bar.innerHTML = '';
      bar.dataset.iid = '';
      bar.classList.add('hidden');
      return;
    }
    var acts = [['bigger', '放大'], ['smaller', '缩小'], ['left', '左转'], ['right', '右转']];
    if (it.type === 'photo') acts.push(['crop', '裁剪']);
    acts.push(['del', '删除']);
    if (bar.dataset.iid !== it.id) {
      bar.innerHTML = acts.map(function (a) {
        return '<button data-dact="' + a[0] + '"' + (a[0] === 'del' ? ' class="del"' : '') + '>' + a[1] + '</button>';
      }).join('');
      bar.dataset.iid = it.id;
    }
    var page = diaryPageSize();
    var left = diaryClamp(it.x + it.w / 2, 140, Math.max(140, page.w - 140));
    var top = it.y - 38;
    if (top < 4) top = diaryClamp(it.y + it.h + 6, 4, page.h - 32);
    bar.style.left = left + 'px';
    bar.style.top = top + 'px';
    bar.classList.remove('hidden');
  }

  function selectDiaryItem(id) {
    if (diarySelectedId === id) {
      updateDiaryItemBar();
      return;
    }
    diarySelectedId = id;
    $$('#diaryLayers .diary-item').forEach(function (el) {
      el.classList.toggle('selected', el.getAttribute('data-iid') === id);
    });
    updateDiaryItemBar();
  }

  function addDiaryItem(part) {
    var e = currentDiaryEntry();
    var page = diaryPageSize();
    var it = {
      id: uid('i_'),
      type: part.type,
      src: part.src,
      x: Math.round((page.w - part.w) / 2),
      y: Math.round((page.h - part.h) / 2),
      w: part.w,
      h: part.h,
      rot: 0
    };
    e.items.push(it);
    diarySelectedId = it.id;
    saveDiary();
    renderDiaryItems();
  }

  function gotoDiaryPage(i, flip) {
    if (diaryFlipLock) return;
    i = Math.max(0, Math.min(DIARY.entries.length - 1, i));
    diaryFlushFields();
    diarySelectedId = null;
    $('#diaryTray').classList.add('hidden');
    if (!flip || i === diaryIndex) {
      diaryIndex = i;
      renderDiary(true);
      return;
    }
    flipDiaryTo(i, i > diaryIndex ? 'next' : 'prev');
  }

  function flipDiaryTo(i, dir) {
    var leaf = $('#diaryLeaf');
    if (!leaf) { diaryIndex = i; renderDiary(true); return; }
    diaryFlipLock = true;
    var cls = dir === 'next' ? 'flip-next' : 'flip-prev';
    leaf.classList.remove('flip-next', 'flip-prev');
    void leaf.offsetWidth;
    leaf.classList.add(cls);
    clearTimeout(diaryFlipTimer);
    diaryFlipTimer = setTimeout(function () {
      diaryIndex = i;
      renderDiary(true);
    }, 300);
    setTimeout(function () {
      leaf.classList.remove('flip-next', 'flip-prev');
      diaryFlipLock = false;
    }, 640);
  }

  function newDiaryPage() {
    if (diaryFlipLock) return;
    diaryFlushFields();
    DIARY.entries.push(diaryBlankEntry());
    saveDiary();
    diarySelectedId = null;
    flipDiaryTo(DIARY.entries.length - 1, 'next');
  }

  function toggleDiaryTray() {
    var tray = $('#diaryTray');
    if (!tray) return;
    tray.classList.toggle('hidden');
  }

  function renderDiaryTray() {
    var tray = $('#diaryTray');
    if (!tray) return;
    tray.innerHTML = DIARY_STICKERS.map(function (s) {
      return '<button class="diary-sticker" data-sticker="' + s.key + '" aria-label="' + s.label + '">' +
        '<svg viewBox="0 0 40 40" aria-hidden="true">' + s.art + '</svg></button>';
    }).join('');
  }

  function diaryPhotoFromFile(file, cb) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var ratio = Math.min(1, DIARY_PHOTO_MAX / Math.max(img.width, img.height));
      var w = Math.max(1, Math.round(img.width * ratio));
      var h = Math.max(1, Math.round(img.height * ratio));
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      var data = null;
      try { data = canvas.toDataURL('image/jpeg', 0.75); } catch (e) { data = null; }
      URL.revokeObjectURL(url);
      cb(data, w, h);
    };
    img.onerror = function () { URL.revokeObjectURL(url); cb(null); };
    img.src = url;
  }

  function onDiaryPhotoPick() {
    var file = this.files && this.files[0];
    this.value = '';
    if (!file) return;
    diaryPhotoFromFile(file, function (data, w, h) {
      if (!data) { toast('图片处理失败'); return; }
      var page = diaryPageSize();
      var dw = Math.min(200, page.w * 0.7, w);
      var scale = dw / w;
      addDiaryItem({ type: 'photo', src: data, w: Math.round(dw), h: Math.max(28, Math.round(h * scale)) });
    });
  }

  function openDiaryCrop(it) {
    if (!it) return;
    var overlay = $('#diaryCrop');
    overlay.classList.remove('hidden');
    var frame = $('#diaryCropFrame');
    var fw = frame.clientWidth || 240;
    var fh = frame.clientHeight || 240;
    var imgEl = $('#diaryCropImg');
    var probe = new Image();
    probe.onload = function () {
      var nw = probe.naturalWidth || probe.width;
      var nh = probe.naturalHeight || probe.height;
      var base = Math.max(fw / nw, fh / nh);
      diaryCrop = {
        item: it, img: probe, fw: fw, fh: fh, base: base, scale: base,
        tx: (fw - nw * base) / 2, ty: (fh - nh * base) / 2
      };
      imgEl.src = it.src;
      $('#diaryCropZoom').value = 1;
      diaryCropApply();
    };
    probe.onerror = function () { closeDiaryCrop(); toast('图片读取失败'); };
    probe.src = it.src;
  }

  function diaryCropApply() {
    if (!diaryCrop) return;
    var c = diaryCrop;
    var imgEl = $('#diaryCropImg');
    imgEl.style.width = (c.img.naturalWidth * c.scale) + 'px';
    imgEl.style.height = (c.img.naturalHeight * c.scale) + 'px';
    imgEl.style.left = c.tx + 'px';
    imgEl.style.top = c.ty + 'px';
  }

  function diaryCropClamp() {
    var c = diaryCrop;
    var iw = c.img.naturalWidth * c.scale;
    var ih = c.img.naturalHeight * c.scale;
    c.tx = Math.min(0, Math.max(c.fw - iw, c.tx));
    c.ty = Math.min(0, Math.max(c.fh - ih, c.ty));
  }

  function diaryCropZoomTo(v) {
    var c = diaryCrop;
    if (!c) return;
    var cx = c.fw / 2, cy = c.fh / 2;
    var ux = (cx - c.tx) / c.scale;
    var uy = (cy - c.ty) / c.scale;
    c.scale = c.base * (Number(v) || 1);
    c.tx = cx - ux * c.scale;
    c.ty = cy - uy * c.scale;
    diaryCropClamp();
    diaryCropApply();
  }

  function closeDiaryCrop() {
    var el = $('#diaryCrop');
    if (el) {
      el.classList.add('hidden');
      el.setAttribute('aria-hidden', 'true');
    }
    diaryCrop = null;
  }

  function confirmDiaryCrop() {
    var c = diaryCrop;
    if (!c) return;
    var out = 300;
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = out;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, out, out);
    var sw = c.fw / c.scale;
    ctx.drawImage(c.img, -c.tx / c.scale, -c.ty / c.scale, sw, sw, 0, 0, out, out);
    var data = null;
    try { data = canvas.toDataURL('image/jpeg', 0.85); } catch (e) { data = null; }
    if (!data) { toast('裁剪失败'); return; }
    var it = c.item;
    it.src = data;
    it.h = it.w;
    closeDiaryCrop();
    saveDiary();
    diarySelectedId = it.id;
    renderDiaryItems();
    toast('已经裁成方块啦');
  }

  function openDiaryToc() {
    var sheet = $('#diaryTocSheet');
    var s = $('#diaryTocSearch');
    if (s) s.value = '';
    renderDiaryToc('');
    sheet.classList.remove('hidden');
    sheet.setAttribute('aria-hidden', 'false');
    void sheet.offsetWidth;
    sheet.classList.add('open');
    setTimeout(function () { try { s.focus(); } catch (e) {} }, 220);
  }

  function closeDiaryToc() {
    var el = $('#diaryTocSheet');
    if (!el) return;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    setTimeout(function () {
      if (!el.classList.contains('open')) el.classList.add('hidden');
    }, 320);
  }

  function renderDiaryToc(q) {
    var list = $('#diaryTocList');
    if (!list) return;
    var kw = (q || '').trim().toLowerCase();
    var visible = [];
    DIARY.entries.forEach(function (e, i) {
      if (kw) {
        var hay = ((e.title || '') + ' ' + (e.text || '')).toLowerCase();
        if (hay.indexOf(kw) < 0) return;
      }
      visible.push({ e: e, i: i });
    });
    if (!visible.length) {
      list.innerHTML = '<div class="diary-toc-empty">' + (kw ? '没有找到这一页' : '还没有记录，写点什么吧') + '</div>';
      return;
    }
    list.innerHTML = visible.map(function (o) {
      var name = (o.e.title || '').trim() || (o.e.text || '').trim().slice(0, 18) || '空白一页';
      return '<button class="diary-toc-item' + (o.i === diaryIndex ? ' active' : '') + '" data-di="' + o.i + '">' +
        '<span class="diary-toc-name">' + esc(name) + '</span>' +
        '<em class="diary-toc-date">' + esc(diaryDateLabel(o.e.createdAt)) + '</em></button>';
    }).join('');
  }

  // 聊天里偶尔冒出来一句「我想聊聊这个」，打开的是某一天的小事
  function maybeDiaryTopic(g, f) {
    if (!g || g.id === LIKETUAN_ID || g.system === true) return null;
    if (Math.random() >= 0.06) return null;
    var entries = diaryReadRaw();
    if (!entries || !entries.length) return null;
    var pool = entries.filter(function (e) {
      return (e.text || '').trim() || (e.items && e.items.length);
    });
    if (!pool.length) return null;
    var e = pool[Math.floor(Math.random() * pool.length)];
    var d = {
      title: (e.title || '').trim(),
      text: (e.text || '').trim()
    };
    for (var i = 0; i < e.items.length; i++) {
      if (e.items[i].type === 'photo' && e.items[i].src) { d.thumb = e.items[i].src; break; }
    }
    return {
      id: uid('m_'),
      type: 'diary',
      text: '我想聊聊这个',
      diary: d,
      ts: Date.now(),
      mine: false,
      senderId: f ? f.id : null
    };
  }

  function bindDiaryEvents() {
    renderDiaryTray();
    $('#diaryBack').addEventListener('click', closeDiary);
    $('#diaryDock').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-dtool]');
      if (!btn) return;
      var act = btn.getAttribute('data-dtool');
      if (act === 'text') {
        var t = $('#diaryTextInput');
        if (t) t.focus();
      } else if (act === 'photo') {
        $('#diaryPhotoFile').click();
      } else if (act === 'sticker') {
        toggleDiaryTray();
      } else if (act === 'newpage') {
        newDiaryPage();
      }
    });
    $('#diaryDockFold').addEventListener('click', function () {
      var dock = $('#diaryDock');
      dock.classList.toggle('folded');
      var folded = dock.classList.contains('folded');
      this.textContent = folded ? '«' : '»';
      this.setAttribute('aria-label', folded ? '展开' : '收纳');
    });
    $('#diaryPhotoFile').addEventListener('change', onDiaryPhotoPick);
    $('#diaryTray').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-sticker]');
      if (!btn) return;
      var key = btn.getAttribute('data-sticker');
      var s = DIARY_STICKERS.filter(function (x) { return x.key === key; })[0];
      if (!s) return;
      addDiaryItem({ type: 'sticker', src: diaryStickerData(s.art), w: 60, h: 60 });
      $('#diaryTray').classList.add('hidden');
    });
    $('#diaryTitleInput').addEventListener('input', function () {
      var e = DIARY.entries[diaryIndex];
      if (!e) return;
      e.title = this.value;
      saveDiary();
    });
    $('#diaryTextInput').addEventListener('blur', function () {
      var e = DIARY.entries[diaryIndex];
      if (!e) return;
      if (e.text !== this.value) { e.text = this.value; saveDiary(); }
    });
    $('#diaryToc').addEventListener('click', openDiaryToc);
    $('#diaryTocClose').addEventListener('click', closeDiaryToc);
    $('#diaryTocSheet').addEventListener('click', function (e) {
      if (e.target === this) closeDiaryToc();
    });
    // 目录左侧抽屉可拖动宽度（1/3 ~ 2/3）
    $('#diaryTocGrip').addEventListener('pointerdown', function (e) {
      e.preventDefault();
      var panel = $('#diaryTocPanel');
      var sheet = $('#diaryTocSheet');
      if (!panel || !sheet) return;
      var pageW = sheet.clientWidth;
      var startX = e.clientX;
      var startW = panel.offsetWidth;
      var min = Math.max(126, Math.round(pageW / 3));
      var max = Math.round(pageW * 2 / 3);
      function onMove(ev) {
        var w = startW + (ev.clientX - startX);
        w = Math.max(min, Math.min(max, w));
        panel.style.width = w + 'px';
      }
      function onUp() {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
      }
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
    // 左右滑动翻页
    (function bindDiarySwipe() {
      var book = $('#diaryBook');
      if (!book) return;
      var sx = 0, sy = 0, active = false;
      book.addEventListener('pointerdown', function (e) {
        if (e.target.closest('.diary-item') || e.target.closest('input') || e.target.closest('textarea')) return;
        active = true;
        sx = e.clientX;
        sy = e.clientY;
      });
      book.addEventListener('pointerup', function (e) {
        if (!active) return;
        active = false;
        var dx = e.clientX - sx;
        var dy = e.clientY - sy;
        if (Math.abs(dx) < 46 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
        if (dx < 0) gotoDiaryPage(diaryIndex + 1, true);
        else gotoDiaryPage(diaryIndex - 1, true);
      });
      book.addEventListener('pointercancel', function () { active = false; });
    }());
    $('#diaryTocSearch').addEventListener('input', function () { renderDiaryToc(this.value); });
    $('#diaryTocList').addEventListener('click', function (e) {
      var item = e.target.closest('.diary-toc-item');
      if (!item) return;
      var i = parseInt(item.getAttribute('data-di'), 10);
      closeDiaryToc();
      gotoDiaryPage(i, true);
    });
    $('#diaryCropCancel').addEventListener('click', closeDiaryCrop);
    $('#diaryCropOk').addEventListener('click', confirmDiaryCrop);
    $('#diaryCropZoom').addEventListener('input', function () { diaryCropZoomTo(this.value); });

    // 选中物件后的小控制条
    $('#diaryItemBar').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-dact]');
      if (!btn) return;
      var it = diaryItemById(diarySelectedId);
      if (!it) return;
      var act = btn.getAttribute('data-dact');
      var page = diaryPageSize();
      if (act === 'bigger' || act === 'smaller') {
        var k = act === 'bigger' ? 1.15 : 1 / 1.15;
        var nw = Math.round(it.w * k);
        var nh = Math.round(it.h * k);
        if (nw < 24 || nh < 24 || nw > page.w * 1.4) return;
        it.x = Math.round(it.x - (nw - it.w) / 2);
        it.y = Math.round(it.y - (nh - it.h) / 2);
        it.w = nw;
        it.h = nh;
      } else if (act === 'left') {
        it.rot = (it.rot - 15) % 360;
      } else if (act === 'right') {
        it.rot = (it.rot + 15) % 360;
      } else if (act === 'crop') {
        openDiaryCrop(it);
        return;
      } else if (act === 'del') {
        var e2 = DIARY.entries[diaryIndex];
        if (!e2) return;
        e2.items = e2.items.filter(function (x) { return x.id !== it.id; });
        diarySelectedId = null;
        saveDiary();
        renderDiaryItems();
        return;
      }
      saveDiary();
      renderDiaryItems();
    });

    // 点空白处取消选中
    $('#pageDiary').addEventListener('pointerdown', function (e) {
      if (!diarySelectedId) return;
      if (e.target.closest('.diary-item') || e.target.closest('#diaryItemBar')) return;
      diarySelectedId = null;
      renderDiaryItems();
    }, true);

    // 拖动图片 / 贴纸
    $('#diaryLayers').addEventListener('pointerdown', function (e) {
      var el = e.target.closest('.diary-item');
      if (!el) return;
      var it = diaryItemById(el.getAttribute('data-iid'));
      if (!it) return;
      e.preventDefault();
      selectDiaryItem(it.id);
      var host = $('#pageDiary');
      var sc = host.offsetWidth ? host.getBoundingClientRect().width / host.offsetWidth : 1;
      if (!sc || sc <= 0) sc = 1;
      var sx = e.clientX, sy = e.clientY;
      var ox = it.x, oy = it.y;
      var page = diaryPageSize();
      var moved = false;
      el.classList.add('dragging');
      function move(ev) {
        var dx = (ev.clientX - sx) / sc;
        var dy = (ev.clientY - sy) / sc;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
        it.x = Math.round(diaryClamp(ox + dx, 24 - it.w, page.w - 24));
        it.y = Math.round(diaryClamp(oy + dy, 24 - it.h, page.h - 24));
        el.style.left = it.x + 'px';
        el.style.top = it.y + 'px';
        updateDiaryItemBar();
      }
      function up() {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);
        el.classList.remove('dragging');
        if (moved) saveDiary();
        updateDiaryItemBar();
      }
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
      document.addEventListener('pointercancel', up);
    });

    // 裁剪框里拖动图片
    $('#diaryCropFrame').addEventListener('pointerdown', function (e) {
      if (!diaryCrop) return;
      e.preventDefault();
      var host = $('#pageDiary');
      var sc = host.offsetWidth ? host.getBoundingClientRect().width / host.offsetWidth : 1;
      if (!sc || sc <= 0) sc = 1;
      var sx = e.clientX, sy = e.clientY, ox = diaryCrop.tx, oy = diaryCrop.ty;
      var frame = this;
      frame.classList.add('dragging');
      function move(ev) {
        diaryCrop.tx = ox + (ev.clientX - sx) / sc;
        diaryCrop.ty = oy + (ev.clientY - sy) / sc;
        diaryCropClamp();
        diaryCropApply();
      }
      function up() {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        frame.classList.remove('dragging');
      }
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    });
  }

  /* ================= 标题栏小团子 ================= */
  /* 波浪形团子身体：边缘用弯曲一点的线条 + 减淡的颜色表现毛绒感 */
  function fuzzWobblePath(cx, cy, r, seed) {
    var pts = [], n = 16, i, a, rr;
    for (i = 0; i < n; i++) {
      a = Math.PI * 2 * i / n;
      rr = r * (1 + 0.055 * Math.sin(3 * a + seed) + 0.038 * Math.sin(5 * a + seed * 1.7));
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
    var d = '';
    for (i = 0; i < n; i++) {
      var p0 = pts[i], p1 = pts[(i + 1) % n];
      var mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
      d += (i === 0 ? 'M' + mx.toFixed(1) + ',' + my.toFixed(1) : '') +
        ' Q' + p0[0].toFixed(1) + ',' + p0[1].toFixed(1) + ' ' + mx.toFixed(1) + ',' + my.toFixed(1);
    }
    return d + ' Z';
  }
  /* 21 个团子（7 色 × 粒小 / 颗中 / 团大）复用粒颗团成员形象，保持原来的位置和大小 */
  function fuzzBodyHTML(mem) {
    var r = mem.tier === 'tuan' ? 13.2 : mem.tier === 'ke' ? 11.6 : 10;
    var seed = mem.id.length + mem.name.charCodeAt(0);
    return '<path d="' + fuzzWobblePath(17, 19, r * 0.86, seed + 9) + '" fill="' + mem.color + '" opacity=".3"/>' +
      '<path d="' + fuzzWobblePath(17, 19, r, seed) + '" fill="' + mem.color + '"/>';
  }
  /* 日期一变就换团子；中午 12 点或晚上 0 点各有 30% 概率换 */
  var FUZZ_ROTATE_KEY = 'fuzzDaily.v1';
  function fuzzPickOfDay() {
    var d = new Date();
    var day = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    var h = d.getHours();
    var slot = (h === 12 || h === 0) ? 'h' + h : '';
    var saved = null, idx;
    try { saved = JSON.parse(localStorage.getItem(FUZZ_ROTATE_KEY) || 'null'); } catch (e) {}
    if (saved && saved.day === day && typeof saved.idx === 'number') {
      idx = saved.idx;
      if (slot && saved.slot !== slot) {
        if (Math.random() < 0.3) idx = (idx + 1 + Math.floor(Math.random() * 20)) % LIKETUAN_MEMBERS.length;
        try { localStorage.setItem(FUZZ_ROTATE_KEY, JSON.stringify({ day: day, slot: slot, idx: idx })); } catch (e) {}
      }
    } else {
      idx = Math.floor(Math.random() * LIKETUAN_MEMBERS.length);
      if (saved && typeof saved.idx === 'number' && saved.idx === idx) idx = (idx + 1) % LIKETUAN_MEMBERS.length;
      try { localStorage.setItem(FUZZ_ROTATE_KEY, JSON.stringify({ day: day, slot: slot, idx: idx })); } catch (e) {}
    }
    return LIKETUAN_MEMBERS[idx];
  }
  function fuzzRender() {
    var body = fuzzBodyHTML(fuzzPickOfDay());
    [$('#fuzzBody'), $('#fuzzBody2')].forEach(function (box) {
      if (box) box.innerHTML = body;
    });
    fuzzSetFace(fuzzIdx);
  }
  var FUZZ_FACES = [
    '<ellipse cx="13.4" cy="17.9" rx="1.65" ry="2.45" fill="#5C4A38"/><ellipse cx="20.6" cy="17.9" rx="1.65" ry="2.45" fill="#5C4A38"/>' +
    '<circle cx="13.95" cy="17.1" r=".55" fill="#FFFDF8"/><circle cx="21.15" cy="17.1" r=".55" fill="#FFFDF8"/>' +
    '<path d="M15.8,21.5 q1.2,1.2 2.4,0" stroke="#8A6A52" stroke-width=".85" fill="none" stroke-linecap="round"/>',
    '<path d="M11.4,18.5 q2,-2.2 4,0" stroke="#5C4A38" stroke-width="1.1" fill="none" stroke-linecap="round"/>' +
    '<path d="M18.6,18.5 q2,-2.2 4,0" stroke="#5C4A38" stroke-width="1.1" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="17" cy="21.9" rx="1.9" ry="1.3" fill="#E89A92"/>' +
    '<ellipse cx="11.2" cy="20.6" rx="1.7" ry="1.05" fill="#F2A9A2" opacity=".55"/><ellipse cx="22.8" cy="20.6" rx="1.7" ry="1.05" fill="#F2A9A2" opacity=".55"/>',
    '<ellipse cx="13.4" cy="18.3" rx="1.65" ry="1.5" fill="#5C4A38"/><ellipse cx="20.6" cy="18.3" rx="1.65" ry="1.5" fill="#5C4A38"/>' +
    '<path d="M11.7,17.1 h3.4M18.9,17.1 h3.4" stroke="#8A6A52" stroke-width=".8" stroke-linecap="round" opacity=".65"/>' +
    '<ellipse cx="17" cy="21.7" rx="1.05" ry=".8" fill="#8A6A52" opacity=".8"/>',
    '<ellipse cx="13.4" cy="17.6" rx="1.9" ry="2.9" fill="#5C4A38"/><ellipse cx="20.6" cy="17.6" rx="1.9" ry="2.9" fill="#5C4A38"/>' +
    '<circle cx="13.9" cy="16.6" r=".6" fill="#FFFDF8"/><circle cx="21.1" cy="16.6" r=".6" fill="#FFFDF8"/>' +
    '<ellipse cx="17" cy="22.2" rx="1.5" ry="1.8" fill="#8A6A52"/>',
    '<ellipse cx="13.4" cy="17.9" rx="1.65" ry="2.45" fill="#5C4A38"/><circle cx="13.95" cy="17.1" r=".55" fill="#FFFDF8"/>' +
    '<path d="M18.4,18.5 q2,-2.2 4,0" stroke="#5C4A38" stroke-width="1.1" fill="none" stroke-linecap="round"/>' +
    '<path d="M15.9,21.6 q1.1,1 2.2,0" stroke="#8A6A52" stroke-width=".85" fill="none" stroke-linecap="round"/>',
    '<ellipse cx="13.4" cy="17.9" rx="1.65" ry="2.45" fill="#5C4A38"/><ellipse cx="20.6" cy="17.9" rx="1.65" ry="2.45" fill="#5C4A38"/>' +
    '<circle cx="13.95" cy="17.1" r=".55" fill="#FFFDF8"/><circle cx="21.15" cy="17.1" r=".55" fill="#FFFDF8"/>' +
    '<path d="M15.9,21.2 q1.1,1.4 2.2,0" stroke="#8A6A52" stroke-width=".9" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="17" cy="22.7" rx="1.25" ry="1.35" fill="#F0A0A0"/>'
  ];
  var fuzzIdx = 0;
  var fuzzIdleTimer = null;
  var fuzzLoopTimer = null;
  /* 系统库1：小团子随机会说的话（只存在代码里，不对外展示） */
  var SYS_LIB_1 = [
    '当前链接不错哦',
    '当前链接不稳',
    '现在能量平稳',
    'ta好像很想你啦，理理ta？',
    '能量好杂乱，头晕晕，平静一会吧……'
  ];
  var fuzzSpeakTimer = null;
  var fuzzHideTimer = null;
  var fuzzAnimTimer = null;
  var fuzzHidden = false;
  var fuzzAskKind = null;
  var fuzzEnergyNext = 0;   /* 能量问答的冷却截止时间：3 分钟内只问一次 */

  function fuzzEls() {
    return [$('#btnFuzz'), $('#btnFuzz2')].filter(Boolean);
  }
  function fuzzSay(text, ms) {
    var el = $('#fuzzBubble');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(fuzzHideTimer);
    fuzzHideTimer = setTimeout(function () { el.classList.remove('show'); }, ms || 6200);
  }
  function fuzzSpeak() {
    if (fuzzHidden) return;
    fuzzSay(SYS_LIB_1[Math.floor(Math.random() * SYS_LIB_1.length)]);
  }
  /* 说下一句的时间在 0.6 秒 ~ 20 分钟之间随机，同一句可以连续出现 */
  function fuzzScheduleSpeak() {
    clearTimeout(fuzzSpeakTimer);
    var delay = 600 + Math.random() * (1200000 - 600);
    fuzzSpeakTimer = setTimeout(function () {
      fuzzSpeak();
      fuzzScheduleSpeak();
    }, delay);
  }

  function fuzzHideAsk() {
    $('#fuzzAsk').classList.remove('show');
    fuzzAskKind = null;
  }
  function fuzzShowAsk(kind) {
    if (fuzzHidden) return;
    fuzzAskKind = kind;
    var txt = $('#fuzzAskTxt');
    var btns = $('#fuzzAskBtns');
    if (kind === 'energy') {
      txt.textContent = '要感应一下现在的能量吗？';
      btns.innerHTML = '<button class="fuzz-chip main" data-act="yes">感应一下</button>' +
        '<button class="fuzz-chip" data-act="no">先不了</button>';
    } else {
      var qs = ['我要回避一下吗？', '我们一会再见？'];
      txt.textContent = qs[Math.floor(Math.random() * qs.length)];
      btns.innerHTML = '<button class="fuzz-chip main" data-act="bye">我们下次玩</button>' +
        '<button class="fuzz-chip" data-act="stay">一起玩</button>';
    }
    $('#fuzzAsk').classList.add('show');
  }
  function fuzzHideAll() {
    fuzzHidden = true;
    clearTimeout(fuzzIdleTimer);
    clearTimeout(fuzzSpeakTimer);
    clearTimeout(fuzzHideTimer);
    clearTimeout(fuzzAnimTimer);
    if (fuzzLoopTimer) { clearInterval(fuzzLoopTimer); fuzzLoopTimer = null; }
    fuzzEls().forEach(function (el) { el.classList.add('hidden'); });
    $('#fuzzBubble').classList.remove('show');
    fuzzHideAsk();
  }
  function fuzzRevive() {
    if (!fuzzHidden) return;
    fuzzHidden = false;
    fuzzEls().forEach(function (el) { el.classList.remove('hidden', 'fuzz-bye'); });
    fuzzSetFace(0);
    fuzzIdleReset();
    fuzzScheduleSpeak();
  }
  function fuzzBye() {
    fuzzHideAsk();
    fuzzSay('下次见', 900);
    setTimeout(function () { fuzzPlay('fuzz-bye', 900); }, 120);
    setTimeout(fuzzHideAll, 1040);
  }

  function fuzzSetFace(i) {
    fuzzIdx = i;
    [$('#fuzzFace'), $('#fuzzFace2')].forEach(function (box) {
      if (box) box.innerHTML = FUZZ_FACES[i];
    });
  }
  function fuzzRandomFace() {
    var i = fuzzIdx;
    while (i === fuzzIdx) i = Math.floor(Math.random() * FUZZ_FACES.length);
    fuzzSetFace(i);
  }
  function fuzzPlay(cls, ms) {
    var els = fuzzEls();
    if (!els.length) return;
    els.forEach(function (el) { el.classList.remove('fuzz-hop', 'fuzz-lie', 'fuzz-spin', 'fuzz-pop'); });
    setTimeout(function () { els.forEach(function (el) { el.classList.add(cls); }); }, 16);
    clearTimeout(fuzzAnimTimer);
    fuzzAnimTimer = setTimeout(function () {
      els.forEach(function (el) { el.classList.remove(cls); });
    }, ms);
  }
  function fuzzAction() {
    if (fuzzHidden) return;
    var r = Math.floor(Math.random() * 3);
    if (r === 0) fuzzPlay('fuzz-hop', 820);
    else if (r === 1) fuzzPlay('fuzz-lie', 2820);
    else fuzzPlay('fuzz-spin', 1220);
  }
  function fuzzIdleReset() {
    clearTimeout(fuzzIdleTimer);
    if (fuzzLoopTimer) { clearInterval(fuzzLoopTimer); fuzzLoopTimer = null; }
    if (fuzzHidden) return;
    fuzzIdleTimer = setTimeout(function () {
      fuzzAction();
      fuzzLoopTimer = setInterval(fuzzAction, 7200);
    }, 9000);
  }

  function openSheet(id) {
    closeSheets();
    closeMenu();
    var el = document.getElementById(id);
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    $('#sheetMask').classList.add('open');
  }
  function closeSheets() {
    $$('.sheet.open').forEach(function (s) {
      s.classList.remove('open');
      s.setAttribute('aria-hidden', 'true');
    });
    $('#sheetMask').classList.remove('open');
  }

  /* ================= 好友 ================= */
  function openFriendsSheet() {
    renderFriendsSheet();
    openSheet('sheetFriends');
  }

  function renderFriendsSheet() {
    var box = $('#friendList');
    if (!DB.friends.length) {
      box.innerHTML = '<div class="sheet-empty">还没有好友<br>点右上角「添加」创建</div>';
      return;
    }
    box.innerHTML = DB.friends.map(function (f) {
      return '<div class="friend-row" data-fid="' + f.id + '">' + avatarHTML(f) +
        '<div class="friend-name">' + esc(f.name) + '</div>' +
        '<button class="row-edit" aria-label="编辑">' + PENCIL + '</button></div>';
    }).join('');
  }

  function openFriendEdit(f) {
    editingMe = false;
    editingFriend = f
      ? { id: f.id, name: f.name, avatar: f.avatar || null, color: f.color || PRESETS[0], region: f.region || '' }
      : { id: null, name: '', avatar: null, color: PRESETS[0], region: '' };
    $('#friendEditTitle').textContent = f ? '编辑好友' : '添加好友';
    $('#friendName').value = editingFriend.name;
    $('#friendRegion').value = editingFriend.region;
    $('#friendDelete').classList.toggle('hidden', !f);
    renderAvatarEditor();
    openSheet('sheetFriendEdit');
    if (!f) setTimeout(function () { $('#friendName').focus(); }, 280);
  }

  function openMyEdit() {
    editingMe = true;
    editingFriend = {
      id: null,
      name: DB.me.name,
      avatar: DB.me.avatar || null,
      color: DB.me.color || PRESETS[0],
      region: DB.me.region || ''
    };
    $('#friendEditTitle').textContent = '编辑我的资料';
    $('#friendName').value = editingFriend.name;
    $('#friendRegion').value = editingFriend.region;
    $('#friendDelete').classList.add('hidden');
    renderAvatarEditor();
    openSheet('sheetFriendEdit');
  }

  function renderAvatarEditor() {
    var box = $('#avatarPreview');
    if (editingFriend.avatar) {
      box.style.background = 'transparent';
      box.innerHTML = '<img src="' + editingFriend.avatar + '" alt="">';
    } else {
      box.style.background = editingFriend.color;
      box.textContent = initial(editingFriend.name);
    }
    $('#swatches').innerHTML = PRESETS.map(function (c) {
      var active = (!editingFriend.avatar && c === editingFriend.color) ? ' active' : '';
      return '<button class="swatch' + active + '" style="background:' + c + '" data-color="' + c + '" aria-label="颜色"></button>';
    }).join('');
  }

  function saveFriend() {
    var name = $('#friendName').value.trim();
    if (!name) {
      toast(editingMe ? '请输入昵称' : '请输入好友昵称');
      $('#friendName').focus();
      return;
    }
    var region = $('#friendRegion').value.trim();
    if (editingMe) {
      DB.me.name = name;
      DB.me.avatar = editingFriend.avatar;
      DB.me.color = editingFriend.color;
      DB.me.region = region;
      saveDB();
      closeSheets();
      renderProfile();
      renderMessages();
      toast('已保存');
      return;
    }
    if (editingFriend.id) {
      var f = friendById(editingFriend.id);
      if (f) {
        f.name = name;
        f.avatar = editingFriend.avatar;
        f.color = editingFriend.color;
        f.region = region;
        DB.groups.forEach(function (g) {
          if (g.memberIds.length === 1 && g.memberIds[0] === f.id) g.name = name;
        });
      }
    } else {
      DB.friends.push({
        id: uid('f_'),
        name: name,
        avatar: editingFriend.avatar,
        color: editingFriend.color,
        region: region,
        createdAt: Date.now()
      });
    }
    saveDB();
    closeSheets();
    renderChatList();
    renderContacts();
    renderProfile();
    toast('已保存');
  }

  function deleteFriend() {
    if (editingMe || !editingFriend || !editingFriend.id) return;
    if (!confirm('删除好友「' + editingFriend.name + '」？')) return;
    var fid = editingFriend.id;
    DB.friends = DB.friends.filter(function (f) { return f.id !== fid; });
    DB.groups = DB.groups.filter(function (g) {
      g.memberIds = g.memberIds.filter(function (id) { return id !== fid; });
      return g.memberIds.length > 0;
    });
    saveDB();
    closeSheets();
    closeScreen('pageProfile');
    renderChatList();
    renderContacts();
    toast('已删除');
  }

  /* ================= 发起群聊 ================= */
  function openGroupSheet() {
    selected = {};
    renderGroupSheet();
    openSheet('sheetGroup');
  }

  function renderGroupSheet() {
    var box = $('#groupList');
    if (!DB.friends.length) {
      box.innerHTML = '<div class="sheet-empty">还没有好友，先添加好友<br><button class="empty-btn" id="emptyAddFriend">去添加好友</button></div>';
    } else {
      box.innerHTML = DB.friends.map(function (f) {
        var on = selected[f.id] ? ' selected' : '';
        return '<div class="pick' + on + '" data-fid="' + f.id + '">' + avatarHTML(f) +
          '<div class="pick-name">' + esc(f.name) + '</div><span class="check"></span></div>';
      }).join('');
    }
    $('#groupDone').disabled = !Object.keys(selected).length;
  }

  function createGroupFromSelection() {
    var members = Object.keys(selected).map(friendById).filter(Boolean);
    if (!members.length) return;
    var group;
    if (members.length === 1) {
      group = groupById(findOrCreateSingle(members[0].id));
    } else {
      group = {
        id: uid('g_'),
        name: groupName(members),
        memberIds: members.map(function (m) { return m.id; }),
        createdAt: Date.now(),
        messages: [],
        pinned: false,
        muted: false,
        bg: 'gray'
      };
      DB.groups.unshift(group);
      saveDB();
    }
    closeSheets();
    renderChatList();
    if (group) openChat(group.id);
  }

  /* ================= 通讯录 ================= */
  function renderContacts() {
    var box = $('#contactsList');
    var byLetter = {};
    DB.friends.forEach(function (f) {
      var l = letterOf(f.name);
      (byLetter[l] = byLetter[l] || []).push(f);
    });
    var letters = Object.keys(byLetter).sort(function (a, b) {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a < b ? -1 : 1;
    });
    letters.forEach(function (l) {
      byLetter[l].sort(function (a, b) { return collate(a.name, b.name); });
    });
    var html = '<div class="contacts-tool">' +
      '<div class="tool-row" id="newFriendRow">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#FE9C1E" stroke-width="1.6" stroke-linecap="round"><circle cx="10" cy="8.6" r="3.6"/><path d="M3.6 19.4c.5-3.3 3-5.4 6.4-5.4 1 0 1.8.2 2.6.6"/><path d="M18 12.6v6M15 15.6h6"/></svg>' +
      '<span>新的朋友</span></div></div>';
    letters.forEach(function (l) {
      html += '<div class="group-letter" id="grp-' + l + '">' + l + '</div>';
      byLetter[l].forEach(function (f) {
        html += '<div class="contact-row" data-fid="' + f.id + '">' + avatarHTML(f) +
          '<div class="contact-name">' + esc(f.name) + '</div></div>';
      });
    });
    if (!DB.friends.length) html += '<div class="library-empty">还没有好友<br>点右上角「+」添加朋友</div>';
    box.innerHTML = html;

    var rail = $('#indexRail');
    if (!letters.length) {
      rail.innerHTML = '';
      rail.classList.add('hidden');
    } else {
      rail.classList.remove('hidden');
      rail.innerHTML = letters.map(function (l) {
        return '<span data-letter="' + l + '">' + l + '</span>';
      }).join('');
    }
  }

  /* ================= 我 / 朋友圈 ================= */
  var STATUS_OPTS = [
    { e: '😊', t: '开心' }, { e: '😴', t: '睡觉' }, { e: '😵', t: '忙' },
    { e: '🐟', t: '摸鱼' }, { e: '🏃', t: '运动' }, { e: '✈️', t: '出差' },
    { e: '📚', t: '学习' }, { e: '🎵', t: '听歌' }
  ];

  function renderMe() {
    var me = DB.me;
    var av = $('#meAvatar');
    if (me.avatar) {
      av.innerHTML = '<img src="' + me.avatar + '" alt="">';
      av.style.background = 'transparent';
    } else {
      av.innerHTML = esc(initial(me.name));
      av.style.background = me.color;
    }
    $('#meName').textContent = me.name;
    $('#meWxid').textContent = '微信号：' + (me.wxid || '');
    $('#meStatusText').textContent = me.status || '状态';
    $('#meStatusBtn').querySelector('.plus').classList.toggle('hidden', !!me.status);
  }

  function openStatusSheet() {
    var list = STATUS_OPTS.map(function (o) {
      return '<button class="status-opt" data-status="' + esc(o.t) + '"><span class="so-emoji">' + o.e + '</span><span>' + esc(o.t) + '</span></button>';
    }).join('');
    if (DB.me.status) list += '<button class="status-opt" data-status=""><span class="so-emoji">✖️</span><span>清除状态</span></button>';
    $('#statusOptions').innerHTML = list;
    openSheet('sheetStatus');
  }

  var PHOTO_GRADS = [
    'linear-gradient(150deg,#8FA9BF,#5B7488 55%,#3E5566)',
    'linear-gradient(160deg,#A8C3A0,#6E8F6E 60%,#4A6650)',
    'linear-gradient(140deg,#E0C9A6,#C29B75 55%,#8E6F51)',
    'linear-gradient(150deg,#C7B9D6,#9A86B5 60%,#6E5C8C)',
    'linear-gradient(160deg,#F0D5CF,#D9A79C 60%,#A9736A)',
    'linear-gradient(150deg,#BFD3D9,#8FAEB8 60%,#5E7C86)'
  ];

  function avatarMini(f) {
    if (f && f.avatar) return '<img src="' + f.avatar + '" alt="">';
    return '<span style="background:' + ((f && f.color) || '#999') + '">' + esc(initial(f && f.name)) + '</span>';
  }

  var MOMENTS_FEED = [
    {
      who: 'f1',
      text: '雨停了，出门散步，空气很干净。',
      pics: [0, 1, 2],
      time: '2小时前',
      likes: ['f2', 'me'],
      comments: [{ who: 'f2', text: '好会拍' }]
    },
    {
      who: 'f2',
      text: '随手写了几句，抽到了这句还挺喜欢。',
      pics: [3],
      time: '5小时前',
      likes: ['me'],
      comments: []
    },
    {
      who: 'me',
      text: '第一次用这个聊天原型，还挺像那么回事。',
      pics: [5],
      time: '昨天',
      likes: ['f1'],
      comments: [{ who: 'f1', text: '不错啊' }]
    }
  ];

  function personOf(who) {
    return who === 'me' ? DB.me : friendById(who) || { name: '好友', color: '#9AA7B4' };
  }

  function renderMoments() {
    var me = DB.me;
    $('#momentsName').textContent = me.name;
    var muav = $('#momentsAvatar');
    if (me.avatar) { muav.innerHTML = '<img src="' + me.avatar + '" alt="">'; muav.style.background = 'transparent'; }
    else { muav.innerHTML = esc(initial(me.name)); muav.style.background = me.color; }
    $('#momentsCoverArt').style.background = 'linear-gradient(165deg,#A9C1D2,#6E889C 58%,#41576B)';

    var html = MOMENTS_FEED.map(function (p) {
      var person = personOf(p.who);
      var imgs = p.pics.length ? '<div class="mp-imgs n' + Math.min(p.pics.length, 3) + '">' +
        p.pics.map(function (i) {
          return '<div class="mp-img" style="background:' + PHOTO_GRADS[i % PHOTO_GRADS.length] + '"></div>';
        }).join('') + '</div>' : '';
      var likes = p.likes.length ? '<div class="mp-likes"><span class="mp-like-ico">♥</span>' +
        p.likes.map(function (w) { return esc(personOf(w).name); }).join('、') + '</div>' : '';
      var comments = p.comments.map(function (c) {
        return '<div class="mp-comment"><b>' + esc(personOf(c.who).name) + '：</b>' + esc(c.text) + '</div>';
      }).join('');
      return '<div class="mp">' +
        '<div class="mp-av">' + avatarMini(person) + '</div>' +
        '<div class="mp-main">' +
        '<div class="mp-name">' + esc(person.name) + '</div>' +
        '<div class="mp-text">' + esc(p.text) + '</div>' + imgs +
        '<div class="mp-foot"><span class="mp-time">' + esc(p.time) + '</span>' +
        '<span class="mp-acts"><button class="mp-act" data-like="1">♥</button><button class="mp-act" data-cmt="1">💬</button></span></div>' +
        (likes || comments ? '<div class="mp-social">' + likes + comments + '</div>' : '') +
        '</div></div>';
    }).join('');
    $('#momentsList').innerHTML = html;
    $('#momentsScroll').scrollTop = 0;
  }

  /* ================= 好友资料 ================= */
  function openProfile(fid) {
    var f = friendById(fid);
    if (!f) return;
    profileIsMe = false;
    activeFriendId = fid;
    renderProfile();
    openScreen('pageProfile');
  }

  function openMyProfile() {
    profileIsMe = true;
    activeFriendId = null;
    renderProfile();
    openScreen('pageProfile');
  }

  function renderProfile() {
    var f = profileIsMe ? DB.me : friendById(activeFriendId);
    if (!f) return;
    $('#profileName').textContent = f.name;
    $('#profileRegion').textContent = f.region || '未设置';
    var av = $('#profileAvatar');
    if (f.avatar) {
      av.style.background = 'transparent';
      av.innerHTML = '<img src="' + f.avatar + '" alt="">';
    } else {
      av.style.background = f.color || '#07C160';
      av.innerHTML = esc(initial(f.name));
    }
    $('#profileChat').classList.toggle('hidden', profileIsMe);
    $('#profileCall').classList.toggle('hidden', profileIsMe);
  }

  function openRegionSheet() {
    var f = profileIsMe ? DB.me : friendById(activeFriendId);
    if (!f) return;
    $('#regionInput').value = f.region || '';
    openSheet('sheetRegion');
    setTimeout(function () { $('#regionInput').focus(); }, 260);
  }

  function saveRegion() {
    var f = profileIsMe ? DB.me : friendById(activeFriendId);
    if (!f) return;
    f.region = $('#regionInput').value.trim();
    saveDB();
    renderProfile();
    closeSheets();
    toast('地区已更新');
  }

  function findOrCreateSingle(fid) {
    var f = friendById(fid);
    var g = DB.groups.filter(function (x) {
      return x.memberIds.length === 1 && x.memberIds[0] === fid;
    })[0];
    if (!g) {
      g = {
        id: uid('g_'),
        name: f ? f.name : '聊天',
        memberIds: [fid],
        createdAt: Date.now(),
        messages: [],
        pinned: false,
        muted: false,
        bg: 'gray'
      };
      DB.groups.unshift(g);
      saveDB();
    }
    return g.id;
  }

  /* ================= 会话列表 ================= */
  function sortedGroups() {
    return DB.groups.slice().sort(function (a, b) {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      var la = a.messages.length ? a.messages[a.messages.length - 1].ts : a.createdAt;
      var lb = b.messages.length ? b.messages[b.messages.length - 1].ts : b.createdAt;
      return lb - la;
    });
  }

  function previewOf(m) {
    if (!m) return '';
    if (m.type === 'voice') return '[语音] ' + (m.dur || 1) + '"';
    if (m.type === 'sticker') return '[动画表情]';
    if (m.type === 'card') return '[字卡] ' + (m.text || '');
    if (m.type === 'diary') {
      var dt = m.diary && (m.diary.title || '').trim();
      return '[点滴日常] ' + (dt || '我想聊聊这个');
    }
    if (m.type === 'call') return m.text;
    return m.text;
  }

  function renderChatList() {
    var list = $('#chatList');
    var groups = sortedGroups();
    if (!groups.length) {
      list.innerHTML = '<div class="library-empty">还没有聊天<br>点右上角「+」「发起群聊」开始</div>';
      return;
    }
    list.innerHTML = groups.map(function (g) {
      var last = g.messages[g.messages.length - 1];
      var sub = last ? previewOf(last) : memberCountOf(g) + ' 人';
      return '<div class="cell" data-gid="' + g.id + '">' + groupAvatarHTML(g) +
        '<div class="cell-main"><div class="cell-title">' + (g.muted ? '<span class="muted-ico">🔕</span> ' : '') + esc(g.name) + (memberCountOf(g) > 1 ? '<span class="cell-count">(' + memberCountOf(g) + ')</span>' : '') + '</div>' +
        '<div class="cell-sub">' + esc(sub) + '</div></div>' +
        '<div class="cell-time">' + (last ? fmtListTime(last.ts) : '') + '</div></div>';
    }).join('');
  }

  /* ================= 聊天详情 ================= */
  function openChat(id) {
    var g = groupById(id);
    if (!g) return;
    if (replyTimer) { clearTimeout(replyTimer); replyTimer = null; }
    hideTyping();
    activeGroupId = id;
    typingOn = false;
    updateChatHeader();
    $('#msgInput').value = '';
    setVoiceMode(false);
    closePanels();
    updateSendState();
    applyBg(g.bg);
    renderMessages();
    openScreen('pageChatDetail');
    fuzzRevive();
    setTimeout(scrollMessages, 80);
  }

  function applyBg(bg) {
    var area = $('#msgArea');
    area.classList.remove('bg-gray', 'bg-white', 'bg-warm');
    area.classList.add('bg-' + (bg || 'gray'));
  }

  function renderMessages() {
    var g = groupById(activeGroupId);
    if (!g) return;
    var area = $('#msgArea');
    if (!g.messages.length) {
      area.innerHTML = '<div class="chat-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><path d="M20.5 4.5H3.5c-.6 0-1 .4-1 1v9c0 .6.4 1 1 1h6.7l3.6 3.4v-3.4h6.7c.6 0 1-.4 1-1v-9c0-.6-.4-1-1-1z"/></svg><div>打个招呼吧</div></div>';
      return;
    }
    var html = '', prev = 0;
    g.messages.forEach(function (m) {
      if (m.ts - prev > 5 * 60 * 1000) html += msgTimeHTML(m.ts);
      prev = m.ts;
      html += bubbleHTML(m);
    });
    area.innerHTML = html;
  }

  function bubbleHTML(m) {
    // 撤回消息
    if (m.recalled) {
      var who = m.mine !== false ? '你' : (m.senderId ? (friendById(m.senderId) || {}).name || '对方' : '对方');
      return '<div class="msg recalled"><div class="msg-body"><div class="recall-tip">' + esc(who) + '撤回了一条消息</div></div></div>';
    }
    var inner;
    if (m.type === 'voice') {
      inner = '<div class="bubble voice" data-play="1"><span class="voice-bars"><i></i><i></i><i></i></span><span class="voice-len">' + (m.dur || 1) + '"</span></div>';
    } else if (m.type === 'sticker') {
      if (m.sticker) {
        inner = '<div class="bubble sticker pic"><img src="' + m.sticker + '" alt=""></div>';
      } else {
        var long = Array.from(String(m.text || '')).length > 2;
        inner = '<div class="bubble sticker' + (long ? ' sm' : '') + '">' + esc(m.text) + '</div>';
      }
    } else if (m.type === 'card') {
      inner = '<div class="bubble card"><div class="cd-text">' + esc(m.text) + '</div></div>';
    } else if (m.type === 'diary') {
      var dj = m.diary || {};
      inner = '<div class="bubble diary-bubble">' +
        '<div class="diary-bub-hint">' + esc(m.text || '我想聊聊这个') + '</div>' +
        '<div class="diary-bub-card">' +
          (dj.thumb ? '<div class="diary-bub-thumb"><img src="' + esc(dj.thumb) + '" alt=""></div>' : '') +
          (dj.title ? '<div class="diary-bub-title">' + esc(dj.title) + '</div>' : '') +
          '<div class="diary-bub-text">' + esc(dj.text || '') + '</div>' +
          '<div class="diary-bub-foot">点滴日常</div>' +
        '</div></div>';
    } else if (m.type === 'call') {
      inner = '<div class="call-note">' + PHONE_ICO + '<span>' + esc(m.text) + '</span></div>';
    } else {
      inner = '<div class="bubble">' + esc(m.text) + '</div>';
    }
    var mine = m.mine !== false;
    var cls = mine ? 'mine' : 'their';
    var nameLine = '';
    var av;
    if (mine) {
      av = avatarHTML(DB.me, '__me__');
      // 已读未读：我的气泡最末端红点 = 未读，无红点 = 已读
      if (m.read === false && m.type !== 'call') {
        inner = '<div class="bubble-row"><i class="read-dot" title="未读"></i>' + inner + '</div>';
      }
    } else {
      var mem = m.senderId ? liketuanMember(m.senderId) : null;
      var f = (m.senderId ? friendById(m.senderId) : null) || (mem ? memberAsFriend(mem) : null) || singleFriend() || { name: m.senderName || '友', color: m.senderColor || '#9AA7B4' };
      av = avatarHTML(f, mem ? '' : (f.id || ''));
      var g = groupById(activeGroupId);
      if (g && memberCountOf(g) >= 3 && f && f.name) nameLine = '<div class="msg-sender">' + esc(f.name) + '</div>';
    }
    var body = '<div class="msg-body">' + nameLine + inner + '</div>';
    return '<div class="msg ' + cls + (m.type === 'diary' ? ' diary-msg' : '') + '" data-mid="' + m.id + '">' + (mine ? body + av : av + body) + '</div>';
  }

  function updateChatHeader() {
    var g = groupById(activeGroupId);
    if (!g) return;
    $('#chatTitle').textContent = typingOn ? '对方正在输入…' : g.name;
    var count = memberCountOf(g);
    $('#chatCount').textContent = count > 1 ? '(' + count + ')' : '';
    var st = $('#chatStatus');
    var f = g.memberIds.length === 1 ? friendById(g.memberIds[0]) : null;
    if (f && f.status) {
      st.textContent = f.status;
      st.classList.remove('hidden');
    } else {
      st.classList.add('hidden');
    }
  }

  function singleFriend() {
    var g = groupById(activeGroupId);
    if (!g || g.memberIds.length !== 1) return null;
    return friendById(g.memberIds[0]);
  }

  function scrollMessages() {
    var area = $('#msgArea');
    area.scrollTop = area.scrollHeight;
  }

  function updateSendState() {
    var el = $('#msgInput');
    var has = !!el.value.trim();
    $('#sendBtn').classList.toggle('hidden', !has);
    $('#sendBtn').disabled = !has;
    $('#cardDots').classList.toggle('hidden', has);
    // 微信式多行输入：随内容自动长高，超过 5 行可上下滑动
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 112) + 'px';
    el.style.overflowY = el.scrollHeight > 112 ? 'auto' : 'hidden';
  }

  function sendMsg(m) {
    var g = groupById(activeGroupId);
    if (!g) return;
    m.id = m.id || uid('m_');
    m.ts = m.ts || Date.now();
    if (typeof m.mine !== 'boolean') m.mine = true;
    if (m.mine && typeof m.read !== 'boolean') m.read = false;
    g.messages.push(m);
    saveDB();
    renderMessages();
    renderChatList();
    scrollMessages();
    if (m.mine) triggerAutoReply();
  }

  function sendText() {
    var text = $('#msgInput').value.trim();
    if (!text) return;
    $('#msgInput').value = '';
    updateSendState();
    sendMsg({ type: 'text', text: text });
  }

  /* ================= 自动回复 ================= */
  function getReplyPool() {
    var disabledGroups = {};
    DB.cardGroups.forEach(function (g) { if (g.disabled) disabledGroups[g.id] = true; });
    return DB.cards.filter(function (c) {
      if (c.disabled) return false;
      if (c.groupId && disabledGroups[c.groupId]) return false;
      return true;
    });
  }

  function showTyping(friend) {
    if (!DB.settings.typingIndicatorEnabled) return;
    if (!friend) friend = singleFriend();
    if (!friend) return;
    typingOn = true;
    updateChatHeader();
  }

  function hideTyping() {
    typingOn = false;
    updateChatHeader();
  }

  function triggerAutoReply() {
    var g = groupById(activeGroupId);
    if (!g || g.memberIds.length !== 1) return;
    var f = friendById(g.memberIds[0]);
    if (!f || !f.autoReply) return;
    var pool = getReplyPool();
    if (!pool.length) return;

    if (replyTimer) { clearTimeout(replyTimer); replyTimer = null; }
    hideTyping();

    if (DB.settings.typingIndicatorEnabled) showTyping(f);

    var range = Math.max(0, DB.settings.replyDelayMax - DB.settings.replyDelayMin);
    var delay = DB.settings.replyDelayMin + Math.random() * range;
    replyTimer = setTimeout(function () {
      replyTimer = null;
      hideTyping();
      var g2 = groupById(activeGroupId);
      if (!g2) return;
      // 用户自建的会话里，偶尔把某一天的小事带进聊天
      var diaryMsg = maybeDiaryTopic(g2, f);
      if (diaryMsg) {
        markMineRead(g2);
        g2.messages.push(diaryMsg);
        saveDB();
        renderMessages();
        renderChatList();
        scrollMessages();
        return;
      }
      var card = pool[Math.floor(Math.random() * pool.length)];
      markMineRead(g2);
      g2.messages.push({
        id: uid('m_'),
        type: 'text',
        text: card.content,
        ts: Date.now(),
        mine: false,
        senderId: f.id
      });
      saveDB();
      renderMessages();
      renderChatList();
      scrollMessages();
    }, delay);
  }

  // 对方回复后，我的气泡红点消失（标记已读）
  function markMineRead(g) {
    var changed = false;
    g.messages.forEach(function (m) {
      if (m.mine !== false && m.read === false) { m.read = true; changed = true; }
    });
    return changed;
  }

  // 输入框右侧三个点：让对方随机用字卡说话
  function partnerCardReply() {
    var g = groupById(activeGroupId);
    if (!g) return;
    if (g.memberIds.length !== 1) { toast('群聊暂不支持'); return; }
    var f = friendById(g.memberIds[0]);
    if (!f) return;
    var pool = getReplyPool();
    if (!pool.length) { toast('字卡库是空的，先去加号里添加字卡'); return; }
    if (replyTimer) { clearTimeout(replyTimer); replyTimer = null; }
    showTyping(f);
    replyTimer = setTimeout(function () {
      replyTimer = null;
      hideTyping();
      var g2 = groupById(activeGroupId);
      if (!g2) return;
      var card = pool[Math.floor(Math.random() * pool.length)];
      markMineRead(g2);
      g2.messages.push({
        id: uid('m_'),
        type: 'text',
        text: card.content,
        ts: Date.now(),
        mine: false,
        senderId: f.id
      });
      saveDB();
      renderMessages();
      renderChatList();
      scrollMessages();
    }, 900 + Math.random() * 1600);
  }

  function tickStatuses() {
    var now = Date.now();
    var changed = false, activeChanged = false;
    var g = groupById(activeGroupId);
    var activeFid = g && g.memberIds.length === 1 ? g.memberIds[0] : null;
    DB.friends.forEach(function (f) {
      if (now - f.statusAt >= f.statusNext * 3600000) {
        f.status = randomStatus();
        f.statusAt = now;
        f.statusNext = 1 + Math.random() * 7;
        changed = true;
        if (f.id === activeFid) activeChanged = true;
      }
    });
    if (changed) {
      saveDB();
      if (activeChanged) updateChatHeader();
      if (profileIsMe === false && activeFriendId) renderProfile();
    }
    statusTimer = setTimeout(tickStatuses, 60000);
    fuzzRender();
  }

  /* ================= 语音 ================= */
  var PDOWN = window.PointerEvent ? 'pointerdown' : 'touchstart';
  var PUP = window.PointerEvent ? 'pointerup' : 'touchend';
  var PCANCEL = window.PointerEvent ? 'pointercancel' : 'touchcancel';
  var recStart = 0, recTimer = null;

  function setVoiceMode(on) {
    voiceMode = !!on;
    $('#msgInput').classList.toggle('hidden', voiceMode);
    $('#cardDots').classList.add('hidden');
    $('#holdTalk').classList.toggle('hidden', !voiceMode);
    $('#icoVoice').classList.toggle('hidden', voiceMode);
    $('#icoKeyboard').classList.toggle('hidden', !voiceMode);
    if (voiceMode) {
      $('#sendBtn').classList.add('hidden');
      closePanels();
    } else {
      updateSendState();
    }
  }

  function startRec(e) {
    if (recStart) return;
    if (e && e.cancelable) e.preventDefault();
    recStart = Date.now();
    $('#holdTalk').classList.add('active');
    $('#recOverlay').classList.remove('hidden');
    $('#recTime').textContent = '0:00';
    clearInterval(recTimer);
    recTimer = setInterval(function () {
      var s = Math.floor((Date.now() - recStart) / 1000);
      $('#recTime').textContent = '0:' + pad(s);
    }, 200);
  }

  function stopRec(cancel) {
    if (!recStart) return;
    var ms = Date.now() - recStart;
    recStart = 0;
    clearInterval(recTimer);
    $('#holdTalk').classList.remove('active');
    $('#recOverlay').classList.add('hidden');
    if (cancel) return;
    if (ms < 600) {
      toast('说话时间太短');
      return;
    }
    sendMsg({ type: 'voice', text: '[语音]', dur: Math.max(1, Math.round(ms / 1000)) });
  }

  /* ================= 表情 / 字卡面板 ================= */
  var voiceMode = false;
  var plusPage = 0;
  var libraryFromChat = false;
  var callState = null;

  function closePanels() {
    $('#emojiPanel').classList.add('hidden');
    $('#plusPanel').classList.add('hidden');
    $('#emojiToggle').classList.remove('active');
    $('#plusToggle').classList.remove('active');
  }

  function openEmojiPanel() {
    if (voiceMode) setVoiceMode(false);
    $('#msgInput').blur();
    $('#plusPanel').classList.add('hidden');
    $('#plusToggle').classList.remove('active');
    $('#emojiPanel').classList.remove('hidden');
    $('#emojiToggle').classList.add('active');
    switchEmojiTab('emoji');
  }

  function switchEmojiTab(tab) {
    emojiTab = tab;
    $$('.panel-tab').forEach(function (t) { t.classList.toggle('active', t.dataset.etab === tab); });
    $('#emojiLibBar').classList.toggle('hidden', tab !== 'emoji');
    $('#emojiGrid').classList.toggle('hidden', tab !== 'emoji');
    $('#cardPick').classList.toggle('hidden', tab !== 'cards');
    $('#manageCards').classList.remove('hidden');
    if (tab === 'cards') renderCardPick();
    else { renderEmojiLibBar(); renderEmojiGrid(); }
  }

  function renderEmojiLibBar() {
    var bar = $('#emojiLibBar');
    var html = DB.emojiGroups.map(function (g) {
      return '<button class="chip' + (g.id === emojiGroupId ? ' active' : '') + '" data-egid="' + g.id + '">' + esc(g.name) + '</button>';
    }).join('');
    html += '<button class="chip add" data-egid="__mgr__">＋ 新建</button>';
    bar.innerHTML = html;
  }

  function renderEmojiGrid() {
    var grid = $('#emojiGrid');
    var g = activeEmojiGroup();
    if (!g) { grid.innerHTML = ''; return; }
    grid.classList.toggle('img-grid', g.items.some(function (it) { return it && typeof it === 'object'; }));
    if (!g.items.length) {
      grid.innerHTML = '<div class="emoji-empty">这个表情库还是空的<br>点上方「＋ 新建」或「管理」添加</div>';
      return;
    }
    grid.innerHTML = g.items.map(function (it, idx) {
      if (typeof it === 'string') return '<button data-emoji="' + esc(it) + '">' + esc(it) + '</button>';
      return '<button class="eg-img" data-emoji-img="' + idx + '"><img src="' + it.src + '" alt=""><span>' + esc(it.name) + '</span></button>';
    }).join('');
  }

  function openEmojiMgr() {
    renderEmojiMgr();
    openSheet('sheetEmojiMgr');
  }

  function renderEmojiMgr() {
    var box = $('#emojiMgrList');
    box.innerHTML = DB.emojiGroups.map(function (g) {
      var first = g.items[0];
      var ico = !first ? '🙂' : (typeof first === 'string' ? esc(first) : '<img src="' + first.src + '" alt="">');
      return '<div class="emoji-mgr-row" data-egid="' + g.id + '">' +
        '<div class="emoji-mgr-ico">' + ico + '</div>' +
        '<div class="emoji-mgr-name">' + esc(g.name) + '</div>' +
        (g.builtin ? '<span class="emoji-mgr-badge">默认</span>' : '') +
        '<span class="emoji-mgr-count">' + g.items.length + ' 个</span></div>';
    }).join('');
  }

  function openEmojiEdit(g) {
    editingEmojiGroup = g
      ? { id: g.id, name: g.name, builtin: !!g.builtin }
      : { id: null, name: '', builtin: false };
    editingEmojiImages = g ? g.items.filter(function (it) { return it && typeof it === 'object'; }).map(function (it) {
      return { src: it.src, name: it.name };
    }) : [];
    $('#emojiGroupTitle').textContent = g ? (g.builtin ? '默认表情' : '编辑表情库') : '新建表情库';
    $('#emojiGroupName').value = editingEmojiGroup.name;
    $('#emojiItems').value = g ? g.items.filter(function (it) { return typeof it === 'string'; }).join('\n') : '';
    renderEmojiImgList();
    $('#emojiGroupDelete').classList.toggle('hidden', !g || !!g.builtin);
    openSheet('sheetEmojiEdit');
    if (!g) setTimeout(function () { $('#emojiGroupName').focus(); }, 260);
  }

  function renderEmojiImgList() {
    var box = $('#emojiImgList');
    if (!editingEmojiImages.length) {
      box.innerHTML = '<div class="emoji-img-empty">还没有图片表情</div>';
      return;
    }
    box.innerHTML = editingEmojiImages.map(function (it, i) {
      return '<div class="emoji-img-row" data-idx="' + i + '">' +
        '<img src="' + it.src + '" alt="">' +
        '<input class="emoji-img-name" data-idx="' + i + '" maxlength="16" value="' + esc(it.name) + '" placeholder="表情名称">' +
        '<button class="emoji-img-del" data-idx="' + i + '" aria-label="删除">×</button></div>';
    }).join('');
  }

  function saveEmojiGroup() {
    var name = $('#emojiGroupName').value.trim();
    if (!name) { toast('请输入表情库名称'); $('#emojiGroupName').focus(); return; }
    var seen = {};
    var textItems = $('#emojiItems').value.split('\n').map(function (s) { return s.trim(); }).filter(function (s) {
      if (!s || seen[s]) return false;
      seen[s] = true;
      return true;
    });
    var imgItems = editingEmojiImages.map(function (it) {
      return { src: it.src, name: (it.name || '').trim() || '表情' };
    });
    var items = textItems.concat(imgItems);
    if (editingEmojiGroup.id) {
      var g = emojiGroupById(editingEmojiGroup.id);
      if (g) { g.name = name; g.items = items; }
    } else {
      var ng = { id: uid('eg_'), name: name, items: items, builtin: false };
      DB.emojiGroups.push(ng);
      emojiGroupId = ng.id;
    }
    saveDB();
    renderEmojiLibBar();
    renderEmojiGrid();
    closeSheets();
    openEmojiMgr();
    toast('已保存');
  }

  function deleteEmojiGroup() {
    if (!editingEmojiGroup || !editingEmojiGroup.id) return;
    var target = emojiGroupById(editingEmojiGroup.id);
    if (!target || target.builtin) return;
    if (!confirm('删除表情库「' + target.name + '」？')) return;
    DB.emojiGroups = DB.emojiGroups.filter(function (x) { return x.id !== target.id; });
    if (emojiGroupId === target.id) emojiGroupId = DEFAULT_EMOJI_GROUP;
    saveDB();
    closeSheets();
    renderEmojiLibBar();
    renderEmojiGrid();
    openEmojiMgr();
    toast('已删除表情库');
  }

  function importEmojiFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result || '');
      var items;
      try {
        var data = JSON.parse(text);
        if (Array.isArray(data)) items = data.map(String);
        else if (data && Array.isArray(data.items)) items = data.items.map(String);
        else items = text.split(/\r?\n/);
      } catch (e) {
        items = text.split(/\r?\n/);
      }
      items = items.map(function (s) { return s.trim(); }).filter(Boolean);
      if (!items.length) { toast('文件里没有可导入的表情'); return; }
      var seen = {};
      var merged = $('#emojiItems').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean).concat(items).filter(function (s) {
        if (seen[s]) return false;
        seen[s] = true;
        return true;
      });
      $('#emojiItems').value = merged.join('\n');
      toast('已导入 ' + items.length + ' 个表情，记得保存');
    };
    reader.onerror = function () { toast('文件读取失败'); };
    reader.readAsText(file);
  }

  function shrinkStickerImage(file, cb) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var max = 140;
      var scale = Math.min(1, max / Math.max(img.width, img.height));
      var w = Math.max(1, Math.round(img.width * scale));
      var h = Math.max(1, Math.round(img.height * scale));
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      var out;
      try { out = canvas.toDataURL('image/webp', 0.86); } catch (e) { out = canvas.toDataURL('image/png'); }
      cb(out);
    };
    img.onerror = function () { URL.revokeObjectURL(url); cb(null); };
    img.src = url;
  }

  function importEmojiImages(files) {
    var list = Array.prototype.slice.call(files || []);
    if (!list.length) return;
    var remain = list.length, added = 0;
    list.forEach(function (file) {
      shrinkStickerImage(file, function (src) {
        if (src) {
          var name = file.name.replace(/\.[^.]+$/, '').slice(0, 16) || '表情';
          editingEmojiImages.push({ src: src, name: name });
          added++;
        }
        if (--remain === 0) {
          renderEmojiImgList();
          toast(added ? '已导入 ' + added + ' 张图片，命名后记得保存' : '图片处理失败');
        }
      });
    });
  }

  var cardPickFilter = null;
  function renderCardPick() {
    var filterBox = $('#cardPickFilter');
    var list = $('#cardPickList');
    var disabledGroups = {};
    DB.cardGroups.forEach(function (g) { if (g.disabled) disabledGroups[g.id] = true; });
    var available = DB.cards.filter(function (c) { return !c.disabled && !(c.groupId && disabledGroups[c.groupId]); });

    var filterHtml = '<button class="chip' + (cardPickFilter === null ? ' active' : '') + '" data-gid="">全部</button>';
    DB.cardGroups.forEach(function (g) {
      if (g.disabled) return;
      filterHtml += '<button class="chip' + (cardPickFilter === g.id ? ' active' : '') + '" data-gid="' + g.id + '"><span class="dot" style="display:inline-block;width:5px;height:5px;border-radius:50%;background:' + g.color + ';margin-right:3px;vertical-align:middle"></span>' + esc(g.name) + '</button>';
    });
    filterBox.innerHTML = filterHtml;

    var cards = available.filter(function (c) {
      return cardPickFilter === null || c.groupId === cardPickFilter;
    });
    if (!cards.length) {
      list.innerHTML = '<div class="library-empty">字卡库还是空的<br>点右上角「管理」新建</div>';
      return;
    }
    list.innerHTML = cards.map(function (c) {
      return '<button class="card-pick-item" data-cid="' + c.id + '"><span>' + esc(c.content) + '</span></button>';
    }).join('');
  }

  function setPlusPage(p) {
    plusPage = p ? 1 : 0;
    $('#plusTrack').style.transform = 'translateX(-' + (plusPage * 50) + '%)';
    $$('#plusDots i').forEach(function (d, i) { d.classList.toggle('active', i === plusPage); });
  }

  function openPlusPanel() {
    if (voiceMode) setVoiceMode(false);
    $('#msgInput').blur();
    $('#emojiPanel').classList.add('hidden');
    $('#emojiToggle').classList.remove('active');
    $('#plusPanel').classList.remove('hidden');
    $('#plusToggle').classList.add('active');
    setPlusPage(plusPage);
  }

  function onPlusAction(key) {
    if (key === 'video') {
      openCallOptions(activeGroupId);
      return;
    }
    var tips = {
      album: '相册：暂未接入图片消息',
      camera: '拍摄：暂未接入相机',
      location: '位置：功能待开发',
      redpacket: '红包：功能待开发',
      gift: '礼物：功能待开发',
      transfer: '转账：功能待开发',
      voiceinput: '语音输入：功能待开发',
      favorite: '收藏：功能待开发',
      contact: '个人名片：功能待开发',
      file: '文件：功能待开发',
      music: '音乐：功能待开发'
    };
    toast(tips[key] || '功能待开发');
  }

  /* ================= 聊天信息页 ================= */
  function openChatSettings() {
    var g = groupById(activeGroupId);
    if (!g) return;
    $('#swPinned').classList.toggle('active', !!g.pinned);
    $('#swMuted').classList.toggle('active', !!g.muted);
    $('#swRemind').classList.toggle('active', !!g.remind);
    $$('#bgSwatches .bg-swatch').forEach(function (b) {
      b.classList.toggle('active', b.dataset.bg === (g.bg || 'gray'));
    });
    $('#ciBgRow').classList.add('hidden');
    var isSingle = g.memberIds.length === 1;
    var autoRow = $('#autoReplyRow');
    if (isSingle) {
      var f = friendById(g.memberIds[0]);
      autoRow.classList.remove('hidden');
      $('#swAutoReply').classList.toggle('active', !!(f && f.autoReply));
    } else {
      autoRow.classList.add('hidden');
    }
    renderCiMembers(g);
    openScreen('pageChatInfo');
  }

  function renderCiMembers(g) {
    var html = '';
    if (Array.isArray(g.members) && g.members.length) {
      html = g.members.map(function (m) {
        var f = memberAsFriend(m);
        return '<div class="ci-member">' + avatarHTML(f) + '<div class="nm">' + esc(f.name) + '</div></div>';
      }).join('');
      $('#ciMembers').innerHTML = html;
      return;
    }
    if (!g.memberIds.length && g.memberCount) html = '<div class="ci-count">群成员 ' + g.memberCount + ' 人</div>';
    html += g.memberIds.map(friendById).filter(Boolean).map(function (f) {
      return '<div class="ci-member">' + avatarHTML(f, f.id) + '<div class="nm">' + esc(f.name) + '</div></div>';
    }).join('');
    html += '<button class="ci-add" id="ciAddMember" aria-label="添加成员">＋</button>';
    $('#ciMembers').innerHTML = html;
  }

  function openAddMember() {
    var g = groupById(activeGroupId);
    if (!g) return;
    var inGroup = {};
    g.memberIds.forEach(function (id) { inGroup[id] = true; });
    var rest = DB.friends.filter(function (f) { return !inGroup[f.id]; });
    var list = $('#addMemberList');
    if (!rest.length) {
      list.innerHTML = '<div class="empty-tip">没有更多好友可添加了</div>';
    } else {
      list.innerHTML = rest.map(function (f) {
        return '<div class="friend-row" data-addmid="' + f.id + '">' + avatarHTML(f) + '<div class="friend-name">' + esc(f.name) + '</div></div>';
      }).join('');
    }
    openSheet('sheetAddMember');
  }

  function openAppSettings() {
    $('#swTyping').classList.toggle('active', !!DB.settings.typingIndicatorEnabled);
    $('#delayMin').value = secOf(DB.settings.replyDelayMin);
    $('#delayMax').value = secOf(DB.settings.replyDelayMax);
    openSheet('sheetAppSettings');
  }

  /* ================= 音视频通话 ================= */
  function openCallOptions(gid) {
    pendingCallGroupId = gid || activeGroupId;
    if (!pendingCallGroupId) {
      toast('请先选择聊天');
      return;
    }
    openSheet('sheetCallOptions');
  }

  function startCall(mode) {
    var g = groupById(pendingCallGroupId || activeGroupId);
    if (!g) return;
    closeSheets();
    var members = g.memberIds.map(friendById).filter(Boolean);
    var target = members.length === 1 ? members[0] : null;
    callState = { gid: g.id, mode: mode, connected: false, startTs: 0, timer: null, connectTimer: null };

    $('#callName').textContent = g.name;
    var av = $('#callAvatar');
    if (target && target.avatar) {
      av.style.background = 'transparent';
      av.innerHTML = '<img src="' + target.avatar + '" alt="">';
    } else if (target) {
      av.style.background = target.color || '#07C160';
      av.innerHTML = esc(initial(target.name));
    } else {
      av.style.background = '#3E4E48';
      av.innerHTML = esc(initial(g.name));
    }
    $('#callStatus').textContent = '正在呼叫…';
    $$('.call-btn').forEach(function (b) { b.classList.remove('active'); });
    var screen = $('#callScreen');
    screen.classList.toggle('video', mode === 'video');
    screen.classList.add('open');
    screen.setAttribute('aria-hidden', 'false');

    callState.connectTimer = setTimeout(connectCall, 2200);
  }

  function connectCall() {
    if (!callState) return;
    callState.connected = true;
    callState.startTs = Date.now();
    $('#callStatus').textContent = '00:00';
    callState.timer = setInterval(function () {
      if (!callState) return;
      $('#callStatus').textContent = fmtDur((Date.now() - callState.startTs) / 1000);
    }, 1000);
  }

  function hangupCall() {
    if (!callState) return;
    var st = callState;
    clearTimeout(st.connectTimer);
    clearInterval(st.timer);
    callState = null;

    var screen = $('#callScreen');
    screen.classList.remove('open', 'video');
    screen.setAttribute('aria-hidden', 'true');

    var g = groupById(st.gid);
    if (!g) return;
    var label = st.mode === 'video' ? '视频通话' : '语音通话';
    var text = st.connected
      ? label + ' 通话时长 ' + fmtDur((Date.now() - st.startTs) / 1000)
      : label + ' 已取消';
    g.messages.push({ id: uid('m_'), type: 'call', text: text, ts: Date.now() });
    saveDB();
    renderChatList();
    if (activeGroupId === g.id) {
      renderMessages();
      scrollMessages();
    }
  }

  /* ================= 字卡库 ================= */
  function openLibrary(fromChat) {
    libraryFromChat = !!fromChat;
    libSearch = '';
    libFilterGroup = null;
    libBatchMode = false;
    libSelected = {};
    $('#libSearchBar').classList.add('hidden');
    $('#libSearchInput').value = '';
    $('#libBatchBar').classList.add('hidden');
    renderLibrary();
    openScreen('pageLibrary');
  }

  function closeLibrary() {
    closeScreen('pageLibrary');
    if (libraryFromChat) {
      libraryFromChat = false;
      openEmojiPanel();
      switchEmojiTab('cards');
    }
  }

  function filteredCards() {
    var q = libSearch.trim().toLowerCase();
    return DB.cards.filter(function (c) {
      if (libFilterGroup !== null && c.groupId !== libFilterGroup) return false;
      if (!q) return true;
      return (c.content || '').toLowerCase().indexOf(q) >= 0;
    });
  }

  function renderFilterBar() {
    var bar = $('#libFilterBar');
    var allCount = DB.cards.length;
    var html = '<button class="chip' + (libFilterGroup === null ? ' active' : '') + '" data-gid="">全部 ' + allCount + '</button>';
    DB.cardGroups.forEach(function (g) {
      var count = cardsByGroup(g.id).length;
      html += '<button class="chip' + (libFilterGroup === g.id ? ' active' : '') + (g.disabled ? ' disabled' : '') + '" data-gid="' + g.id + '" style="color:' + g.color + ';border-color:' + g.color + '40">' +
        '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:' + g.color + ';margin-right:4px;vertical-align:middle"></span>' + esc(g.name) + ' ' + count + '</button>';
    });
    var noGroup = DB.cards.filter(function (c) { return !c.groupId; }).length;
    if (noGroup) html += '<button class="chip' + (libFilterGroup === '' ? ' active' : '') + '" data-gid="__none__">未分组 ' + noGroup + '</button>';
    bar.innerHTML = html;
  }

  function renderLibrary() {
    renderFilterBar();
    var box = $('#cardList');
    var cards = filteredCards();
    if (!DB.cards.length) {
      box.innerHTML = '<div class="library-empty">字卡库还是空的<br><button class="empty-btn" id="emptyNewCard">新建字卡</button></div>';
      return;
    }
    if (!cards.length) {
      box.innerHTML = '<div class="library-empty">没有匹配的字卡</div>';
      return;
    }
    box.innerHTML = cards.map(function (c) {
      var grp = c.groupId ? cardGroupById(c.groupId) : null;
      var badge = grp ? '<span class="card-badge" style="background:' + grp.color + '18;color:' + grp.color + ';border-color:' + grp.color + '40"><span style="width:5px;height:5px;border-radius:50%;background:' + grp.color + '"></span>' + esc(grp.name) + '</span>' : '';
      var sel = libSelected[c.id] ? ' selected' : '';
      var dis = c.disabled ? ' disabled' : '';
      var batchCls = libBatchMode ? ' batch' + sel : '';
      var check = libBatchMode ? '<span class="card-check"></span>' : '';
      return '<div class="card-row' + batchCls + dis + '" data-cid="' + c.id + '">' + check + '<div class="card-main">' +
        '<div class="card-text">' + esc(c.content) + '</div>' + badge + '</div>' +
        (libBatchMode ? '' : '<button class="row-edit" aria-label="编辑">' + PENCIL + '</button>') + '</div>';
    }).join('');
  }

  function updateBatchBar() {
    var n = Object.keys(libSelected).length;
    $('#libBatchBar').classList.toggle('hidden', !libBatchMode);
    $('.lib-batch-count').textContent = '已选 ' + n + ' 项';
  }

  function toggleBatchMode() {
    libBatchMode = !libBatchMode;
    libSelected = {};
    updateBatchBar();
    renderLibrary();
  }

  function openCardEdit(c) {
    editingCard = c
      ? { id: c.id, content: c.content || '', groupId: c.groupId || null }
      : { id: null, content: '', groupId: libFilterGroup && libFilterGroup !== '__none__' && libFilterGroup !== '' ? libFilterGroup : null };
    $('#cardEditTitle').textContent = c ? '编辑字卡' : '新建字卡';
    $('#cardContent').value = editingCard.content;
    $('#cardDelete').classList.toggle('hidden', !c);
    renderCardGroupChips();
    openSheet('sheetCardEdit');
    setTimeout(function () { $('#cardContent').focus(); }, 280);
  }

  function renderCardGroupChips() {
    var box = $('#cardGroupChips');
    var html = '<button class="chip' + (!editingCard.groupId ? ' active' : '') + '" data-gid="">未分组</button>';
    DB.cardGroups.forEach(function (g) {
      var active = editingCard.groupId === g.id ? ' active' : '';
      html += '<button class="chip' + active + '" data-gid="' + g.id + '"><span class="dot" style="background:' + g.color + '"></span>' + esc(g.name) + '</button>';
    });
    box.innerHTML = html;
  }

  function saveCard() {
    // 每行一条：回车即一条字卡
    var lines = $('#cardContent').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!lines.length) {
      toast('写点内容再保存');
      $('#cardContent').focus();
      return;
    }
    if (editingCard.id) {
      var c = cardById(editingCard.id);
      if (c) { c.content = lines.join('\n'); c.groupId = editingCard.groupId; delete c.title; }
      toast('已保存');
    } else {
      var created = lines.map(function (line) {
        return { id: uid('c_'), content: line, groupId: editingCard.groupId, disabled: false, createdAt: Date.now() };
      });
      DB.cards = created.concat(DB.cards);
      toast(lines.length > 1 ? '已保存 ' + lines.length + ' 条字卡' : '已保存');
    }
    saveDB();
    closeSheets();
    renderLibrary();
    renderCardPick();
  }

  function deleteCard() {
    if (!editingCard || !editingCard.id) return;
    DB.cards = DB.cards.filter(function (c) { return c.id !== editingCard.id; });
    saveDB();
    closeSheets();
    renderLibrary();
    renderCardPick();
    toast('已删除');
  }

  function runDedup() {
    var seen = {};
    var before = DB.cards.length;
    DB.cards = DB.cards.filter(function (c) {
      var key = (c.content || '').trim();
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
    var removed = before - DB.cards.length;
    saveDB();
    renderLibrary();
    renderCardPick();
    toast(removed > 0 ? '已清理 ' + removed + ' 条重复字卡' : '没有重复字卡');
  }

  function exportCards() {
    var data = { cards: DB.cards, cardGroups: DB.cardGroups, exportedAt: new Date().toISOString() };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = '字卡库_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('已导出 ' + DB.cards.length + ' 条字卡');
  }

  function importCards(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        var cards = Array.isArray(data) ? data : (data.cards || []);
        var groups = Array.isArray(data.cardGroups) ? data.cardGroups : [];
        if (!cards.length) { toast('文件中没有字卡'); return; }
        var idMap = {};
        groups.forEach(function (g) {
          var newId = uid('cg_');
          idMap[g.id] = newId;
          DB.cardGroups.push({ id: newId, name: g.name || '导入分组', color: g.color || randomColor(), disabled: !!g.disabled });
        });
        var added = 0;
        cards.forEach(function (c) {
          if (!c.content) return;
          DB.cards.unshift({
            id: uid('c_'),
            content: c.content,
            groupId: c.groupId && idMap[c.groupId] ? idMap[c.groupId] : null,
            disabled: !!c.disabled,
            createdAt: Date.now()
          });
          added++;
        });
        saveDB();
        renderLibrary();
        renderCardPick();
        toast('已导入 ' + added + ' 条字卡');
      } catch (e) {
        toast('导入失败：文件格式错误');
      }
    };
    reader.readAsText(file);
  }

  /* ================= 分组管理 ================= */
  function openGroupMgr() {
    renderGroupMgr();
    openSheet('sheetGroupMgr');
  }

  function renderGroupMgr() {
    var box = $('#groupMgrList');
    if (!DB.cardGroups.length) {
      box.innerHTML = '<div class="gm-empty">还没有分组<br>点右上角「新建」创建</div>';
      return;
    }
    box.innerHTML = DB.cardGroups.map(function (g) {
      var count = cardsByGroup(g.id).length;
      return '<div class="gm-row' + (g.disabled ? ' disabled' : '') + '" data-gid="' + g.id + '">' +
        '<span class="gm-dot" style="background:' + g.color + '"></span>' +
        '<span class="gm-name">' + esc(g.name) + '</span>' +
        '<span class="gm-count">' + count + ' 条</span>' +
        '<div class="gm-actions">' +
        '<button data-act="toggle" title="' + (g.disabled ? '启用' : '屏蔽') + '">' + (g.disabled ? '👁' : '🚫') + '</button>' +
        '<button data-act="edit" title="编辑">' + PENCIL + '</button>' +
        '<button class="danger" data-act="del" title="删除">🗑</button>' +
        '</div></div>';
    }).join('');
  }

  var editingGroup = null;
  function openGroupEdit(g) {
    editingGroup = g ? { id: g.id, name: g.name, color: g.color } : { id: null, name: '', color: randomColor() };
    $('#groupEditTitle').textContent = g ? '编辑分组' : '新建分组';
    $('#groupName').value = editingGroup.name;
    $('#groupDelete').classList.toggle('hidden', !g);
    renderGroupSwatches();
    openSheet('sheetGroupEdit');
    setTimeout(function () { $('#groupName').focus(); }, 280);
  }

  function renderGroupSwatches() {
    $('#groupSwatches').innerHTML = GROUP_COLORS.map(function (c) {
      var active = c === editingGroup.color ? ' active' : '';
      return '<button class="swatch' + active + '" style="background:' + c + '" data-color="' + c + '" aria-label="颜色"></button>';
    }).join('');
  }

  function saveGroup() {
    var name = $('#groupName').value.trim();
    if (!name) { toast('请输入分组名称'); $('#groupName').focus(); return; }
    if (editingGroup.id) {
      var g = cardGroupById(editingGroup.id);
      if (g) { g.name = name; g.color = editingGroup.color; }
    } else {
      DB.cardGroups.push({ id: uid('cg_'), name: name, color: editingGroup.color, disabled: false });
    }
    saveDB();
    closeSheets();
    renderGroupMgr();
    renderLibrary();
    renderCardPick();
    toast('已保存');
  }

  function deleteGroup() {
    if (!editingGroup || !editingGroup.id) return;
    var gid = editingGroup.id;
    DB.cardGroups = DB.cardGroups.filter(function (g) { return g.id !== gid; });
    DB.cards.forEach(function (c) { if (c.groupId === gid) c.groupId = null; });
    saveDB();
    closeSheets();
    renderGroupMgr();
    renderLibrary();
    renderCardPick();
    toast('分组已删除，字卡保留');
  }

  function batchSetGroup(gid) {
    var ids = Object.keys(libSelected);
    if (!ids.length) return;
    ids.forEach(function (id) {
      var c = cardById(id);
      if (c) c.groupId = gid || null;
    });
    saveDB();
    libSelected = {};
    renderLibrary();
    renderCardPick();
    toast('已更新 ' + ids.length + ' 张字卡的分组');
  }

  function batchToggleDisable() {
    var ids = Object.keys(libSelected);
    if (!ids.length) return;
    var anyEnabled = ids.some(function (id) { var c = cardById(id); return c && !c.disabled; });
    ids.forEach(function (id) {
      var c = cardById(id);
      if (c) c.disabled = anyEnabled;
    });
    saveDB();
    libSelected = {};
    renderLibrary();
    toast(anyEnabled ? '已屏蔽选中字卡' : '已启用选中字卡');
  }

  function batchDelete() {
    var ids = Object.keys(libSelected);
    if (!ids.length) return;
    if (!confirm('删除选中的 ' + ids.length + ' 张字卡？')) return;
    DB.cards = DB.cards.filter(function (c) { return !libSelected[c.id]; });
    libSelected = {};
    saveDB();
    renderLibrary();
    renderCardPick();
    toast('已删除');
  }

  /* ================= 事件绑定 ================= */
  function bindEvents() {
    /* 顶部 */
    $('#btnPlus').addEventListener('click', function (e) {
      e.stopPropagation();
      if (activeTab === 'contacts') {
        openFriendsSheet();
        return;
      }
      $('#plusMenu').classList.contains('open') ? closeMenu() : openMenu();
    });
    $('#mask').addEventListener('click', closeMenu);
    var fuzzLongPressed = false;
    fuzzEls().forEach(function (el) {
      el.addEventListener('click', function () {
        if (fuzzLongPressed) { fuzzLongPressed = false; return; }
        if (fuzzHidden) return;
        fuzzRandomFace();
        fuzzPlay('fuzz-pop', 440);
        fuzzIdleReset();
        if (Date.now() >= fuzzEnergyNext) {
          fuzzEnergyNext = Date.now() + 180000;
          fuzzShowAsk('energy');
        }
      });
    });

    /* 聊天页长按团子：问要不要回避 */
    (function () {
      var el = $('#btnFuzz2');
      if (!el) return;
      var timer = null;
      el.addEventListener('pointerdown', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          fuzzLongPressed = true;
          fuzzShowAsk('hide');
        }, 460);
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
        el.addEventListener(ev, function () { clearTimeout(timer); });
      });
    })();

    /* 问答按钮 */
    $('#fuzzAskBtns').addEventListener('click', function (e) {
      var btn = e.target.closest('.fuzz-chip');
      if (!btn) return;
      var act = btn.dataset.act;
      if (act === 'yes') {
        fuzzHideAsk();
        setTimeout(function () { fuzzSpeak(); }, 320);
      } else if (act === 'no') {
        fuzzHideAsk();
      } else if (act === 'bye') {
        fuzzBye();
      } else if (act === 'stay') {
        fuzzHideAsk();
        fuzzSay('好呐', 4200);
      }
    });

    /* 点空白处收起问答 */
    document.addEventListener('pointerdown', function (e) {
      if (!$('#fuzzAsk').classList.contains('show')) return;
      if (e.target.closest('.fuzz-ask') || e.target.closest('#btnFuzz') || e.target.closest('#btnFuzz2')) return;
      fuzzHideAsk();
    }, true);

    document.addEventListener('pointerdown', fuzzIdleReset, true);
    document.addEventListener('keydown', fuzzIdleReset, true);
    fuzzRender();
    fuzzIdleReset();
    fuzzScheduleSpeak();

    /* 加号菜单 */
    $('#plusMenu').addEventListener('click', function (e) {
      var item = e.target.closest('.menu-item');
      if (!item) return;
      closeMenu();
      var action = item.dataset.action;
      if (action === 'group') openGroupSheet();
      else if (action === 'friend') openFriendsSheet();
      else if (action === 'cards') openLibrary(false);
      else if (action === 'pay') toast('收付款功能待开发');
    });

    /* 底部 tab */
    $('#tabbar').addEventListener('click', function (e) {
      var tab = e.target.closest('.tab');
      if (tab) switchTab(tab.dataset.tab);
    });

    /* 发现 / 我 */
    $('#page-discover').addEventListener('click', function (e) {
      var row = e.target.closest('.wx-row');
      if (!row) return;
      if (row.dataset.route === 'moments') openMoments();
      else if (row.dataset.route === 'bottle') openBottle();
      else if (row.dataset.route === 'diary') openDiary();
      else toast((row.dataset.todo || '该功能') + '待开发');
    });

    /* 漂流瓶 */
    renderBottleArt();
    applyBottleState();
    $('#bottleBack').addEventListener('click', function () { closeScreen('pageBottle'); });
    $('#pageBottle').addEventListener('click', function (e) {
      if (e.target.closest('.toss-pop')) return;
      if (bottleLongFired) {
        bottleLongFired = false;
        return;
      }
      var pop = $('#tossPop');
      if (pop && !pop.classList.contains('hidden') && !e.target.closest('.bottle-main')) {
        hideTossPop();
      }
      var b = e.target.closest('.bottle-tap');
      if (b) { showBottleLetter(b.getAttribute('data-note'), b); return; }
      if (e.target.closest('.bottle-main')) { openBottleNote(); return; }
      var sh = e.target.closest('.sand-shell');
      if (sh && !sh.classList.contains('taken')) {
        var idx = parseInt(sh.getAttribute('data-shell'), 10);
        sh.classList.add('taken');
        if (shellState.taken.indexOf(idx) < 0) shellState.taken.push(idx);
        if (!shellState.next) shellState.next = Date.now() + randShellDelay();
        saveShellState();
        if (bottleState.collected.indexOf(idx) < 0) bottleState.collected.push(idx);
        renderBottleArt();
        toast('捡起一枚贝壳，放进瓶子');
      }
    });
    $$('#bottleStyles .bs-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('#bottleStyles .bs-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        bottleState.style = btn.getAttribute('data-style');
        renderBottleArt();
        showMain();
      });
    });
    $('#bottleFold').addEventListener('click', function () {
      var dock = $('#bottleDock');
      dock.classList.toggle('folded');
      var folded = dock.classList.contains('folded');
      this.textContent = folded ? '»' : '«';
      this.setAttribute('aria-label', folded ? '展开' : '收纳');
      if (folded) stowMain();
    });
    $('#noteFold').addEventListener('click', function () {
      var box = $('#noteBox');
      box.classList.toggle('open');
      var open = box.classList.contains('open');
      this.textContent = open ? '«' : '»';
      this.setAttribute('aria-label', open ? '收起' : '纸条盒子');
    });
    $('#noteBoxList').addEventListener('click', function (e) {
      var it = e.target.closest('.nb-item');
      if (it) showBoxNote(Number(it.getAttribute('data-box')));
    });
    $('#bottleLetter').addEventListener('click', function (e) {
      if (e.target === this) closeBottleLetter();
    });
    $('#blKeep').addEventListener('click', keepLetterBottle);
    $('#blReturn').addEventListener('click', releaseLetterBottle);
    $$('#tossPop .tp-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { tossMain(btn.getAttribute('data-to')); });
    });
    bindBottleLongPress();
    $('#noteSave').addEventListener('click', saveBottleNote);

    /* 我的点滴日常 */
    bindDiaryEvents();

    $('#page-me').addEventListener('click', function (e) {
      var row = e.target.closest('.wx-row');
      if (row) {
        if (row.dataset.route === 'moments') openMoments();
        else toast((row.dataset.todo || '该功能') + '待开发');
      }
    });
    $('#meProfileBtn').addEventListener('click', openMyProfile);
    $('#meMomentsBtn').addEventListener('click', openMoments);
    $('#meStatusBtn').addEventListener('click', openStatusSheet);
    $('#statusOptions').addEventListener('click', function (e) {
      var b = e.target.closest('[data-status]');
      if (!b) return;
      DB.me.status = b.dataset.status;
      saveDB();
      renderMe();
      closeSheets();
      toast(DB.me.status ? '状态已更新' : '已清除状态');
    });

    /* 朋友圈 */
    function openMoments() {
      renderMoments();
      openScreen('pageMoments');
    }
    $('#momentsBack').addEventListener('click', function () { closeScreen('pageMoments'); });
    $('#momentsCam').addEventListener('click', function () { toast('发表朋友圈待开发'); });
    $('#momentsList').addEventListener('click', function (e) {
      if (e.target.closest('[data-like]')) { toast('已点赞'); return; }
      if (e.target.closest('[data-cmt]')) { toast('评论待开发'); return; }
    });

    /* 弹层关闭 */
    $('#sheetMask').addEventListener('click', closeSheets);
    $$('[data-close]').forEach(function (btn) {
      btn.addEventListener('click', closeSheets);
    });

    /* 好友列表 */
    $('#friendList').addEventListener('click', function (e) {
      var row = e.target.closest('.friend-row');
      if (row) openFriendEdit(friendById(row.dataset.fid));
    });
    $('#friendAddBtn').addEventListener('click', function () { openFriendEdit(null); });
    $('#friendEditCancel').addEventListener('click', closeSheets);
    $('#friendSave').addEventListener('click', saveFriend);
    $('#friendDelete').addEventListener('click', deleteFriend);
    $('#friendName').addEventListener('input', function () {
      editingFriend.name = this.value;
      if (!editingFriend.avatar) renderAvatarEditor();
    });
    $('#friendRegion').addEventListener('input', function () {
      editingFriend.region = this.value;
    });
    $('#swatches').addEventListener('click', function (e) {
      var sw = e.target.closest('.swatch');
      if (!sw) return;
      editingFriend.color = sw.dataset.color;
      editingFriend.avatar = null;
      renderAvatarEditor();
    });
    $('#avatarFile').addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (!file) return;
      shrinkImage(file, function (data) {
        if (data) {
          editingFriend.avatar = data;
          renderAvatarEditor();
        } else {
          toast('图片处理失败');
        }
      });
      this.value = '';
    });

    /* 发起群聊 */
    $('#groupList').addEventListener('click', function (e) {
      if (e.target.closest('#emptyAddFriend')) {
        openFriendsSheet();
        return;
      }
      var row = e.target.closest('.pick');
      if (!row) return;
      var id = row.dataset.fid;
      if (selected[id]) {
        delete selected[id];
        row.classList.remove('selected');
      } else {
        selected[id] = 1;
        row.classList.add('selected');
      }
      $('#groupDone').disabled = !Object.keys(selected).length;
    });
    $('#groupDone').addEventListener('click', createGroupFromSelection);

    /* 通讯录 */
    $('#contactsList').addEventListener('click', function (e) {
      if (e.target.closest('#newFriendRow')) {
        openFriendsSheet();
        return;
      }
      var row = e.target.closest('.contact-row');
      if (row) openProfile(row.dataset.fid);
    });
    $('#indexRail').addEventListener('click', function (e) {
      var s = e.target.closest('span');
      if (!s) return;
      var target = document.getElementById('grp-' + s.dataset.letter);
      if (target) target.scrollIntoView({ block: 'start' });
    });

    /* 会话列表 / 详情 */
    $('#chatList').addEventListener('click', function (e) {
      var cell = e.target.closest('.cell');
      if (cell) openChat(cell.dataset.gid);
    });
    $('#chatBack').addEventListener('click', function () {
      if (replyTimer) { clearTimeout(replyTimer); replyTimer = null; }
      hideTyping();
      closeScreen('pageChatDetail');
      closePanels();
      activeGroupId = null;
      fuzzRevive();
    });
    $('#chatMore').addEventListener('click', openChatSettings);
    $('#msgInput').addEventListener('input', updateSendState);
    // 点输入框：收起表情 / 加号面板，只留输入框和键盘
    $('#msgInput').addEventListener('focus', closePanels);
    $('#msgInput').addEventListener('click', closePanels);
    var _compField = document.querySelector('#pageChatDetail .comp-field');
    if (_compField) {
      _compField.addEventListener('click', function (e) {
        if (e.target.closest('#cardDots')) return;
        closePanels();
      });
    }
    $('#msgInput').addEventListener('keydown', function (e) {
      // 桌面端 Enter 发送、Shift+Enter 换行；手机端回车 = 换行（微信行为）
      if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) {
        e.preventDefault();
        sendText();
      }
    });
    $('#sendBtn').addEventListener('click', sendText);
    $('#msgArea').addEventListener('click', function (e) {
      var av = e.target.closest('.av[data-uid]');
      if (av) {
        if (av.dataset.uid === '__me__') openMyProfile();
        else openProfile(av.dataset.uid);
        return;
      }
      if (e.target.closest('.bubble.voice')) { toast('语音播放（模拟）'); return; }
      if (!e.target.closest('.msg')) {
        closePanels();
        if (document.activeElement === $('#msgInput')) $('#msgInput').blur();
      }
    });

    /* 长按气泡菜单 */
    var longPressTimer = null;
    var longPressMsg = null;
    var longPressEl = null;
    var longPressX = 0, longPressY = 0;
    var _PDOWN = 'ontouchstart' in window ? 'touchstart' : 'mousedown';
    var _PUP = 'ontouchstart' in window ? 'touchend' : 'mouseup';
    var _PCANC = 'ontouchstart' in window ? 'touchcancel' : 'mouseleave';
    $('#msgArea').addEventListener(_PDOWN, function (e) {
      var msgEl = e.target.closest('.msg');
      if (!msgEl || msgEl.classList.contains('recalled')) return;
      longPressEl = msgEl;
      longPressMsg = msgEl.dataset.mid;
      var rect = msgEl.querySelector('.bubble') ? msgEl.querySelector('.bubble').getBoundingClientRect() : msgEl.getBoundingClientRect();
      longPressX = rect.left + rect.width / 2;
      longPressY = rect.top;
      longPressTimer = setTimeout(openBubbleMenu, 320);
    });
    $('#msgArea').addEventListener(_PUP, function () {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    });
    $('#msgArea').addEventListener(_PCANC, function () {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    });
    $('#msgArea').addEventListener('click', function () {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }, true); // 捕获阶段优先清掉

    function openBubbleMenu() {
      if (!longPressMsg) return;
      var g = groupById(activeGroupId);
      if (!g) return;
      var m = g.messages.filter(function (x) { return x.id === longPressMsg; })[0];
      if (!m) return;

      // 渲染菜单按钮：根据消息类型和时间禁用/启用
      var now = Date.now();
      var within2min = now - (m.ts || 0) <= 2 * 60 * 1000;
      var mine = m.mine !== false;
      var hasText = m.type === 'text' || m.type === 'card' || (m.type === 'sticker' && !m.sticker);

      var btns = {
        reply: !mine,                 // 只能回复对方
        quote: true,                  // 引用总可用
        copy: hasText,                // 有文字才能复制
        collect: true,                // 收藏总可用
        translate: hasText,           // 有文字才能翻译
        recall: mine && within2min,   // 自己发的2分钟内
        delete: true,                 // 删除总可用
        multi: true                   // 多选总可用
      };

      var menu = $('#bubbleMenu');
      var mask = $('#bubbleMenuMask');
      menu.innerHTML = BUBBLE_MENU_HTML.map(function (b) {
        var d = btns[b.key] ? '' : ' disabled';
        return '<button class="bm-btn' + d + '" data-bm="' + b.key + '">' + b.html + '<span>' + b.label + '</span></button>';
      }).join('');

      // 定位：整块浮在气泡正上方，空间不够才放到下方
      var hostRect = menu.parentNode.getBoundingClientRect();
      var elRect = longPressEl.querySelector('.bubble').getBoundingClientRect();
      menu.classList.remove('hidden', 'below');
      var mh = menu.offsetHeight;
      var mw = menu.offsetWidth;
      var cx = elRect.left - hostRect.left + elRect.width / 2;
      var minX = mw / 2 + 8;
      var maxX = hostRect.width - mw / 2 - 8;
      if (cx < minX) cx = minX;
      if (cx > maxX) cx = maxX;
      var top = elRect.top - hostRect.top - 12;
      if (top - mh < 8) {
        menu.classList.add('below');
        top = elRect.bottom - hostRect.top + 12;
        if (top + mh > hostRect.height - 8) top = hostRect.height - mh - 8;
      }
      menu.style.left = cx + 'px';
      menu.style.top = top + 'px';

      mask.classList.remove('hidden');
      requestAnimationFrame(function () { menu.classList.add('show'); });

    }

    function closeBubbleMenu() {
      $('#bubbleMenuMask').classList.add('hidden');
      $('#bubbleMenu').classList.remove('show');
      $('#bubbleMenu').classList.add('hidden');
      longPressEl = null;
      longPressMsg = null;
    }
    $('#bubbleMenuMask').addEventListener('click', closeBubbleMenu);
    $('#bubbleMenu').addEventListener('click', function (e) {
      var b = e.target.closest('[data-bm]');
      if (!b || b.classList.contains('disabled')) { closeBubbleMenu(); return; }
      var key = b.dataset.bm;
      var g = groupById(activeGroupId);
      var m = g && g.messages.filter(function (x) { return x.id === longPressMsg; })[0];
      closeBubbleMenu();
      if (!m) return;
      handleBubbleAction(key, m);
    });

    function handleBubbleAction(key, m) {
      switch (key) {
        case 'reply':
        case 'quote':
          // 引用/回复：把原消息内容塞到输入框前面
          var text = m.type === 'card' ? m.text : (m.text || '[图片]');
          $('#msgInput').value = (key === 'reply' ? '回复：' : '引用：') + text + '\n';
          updateSendState();
          $('#msgInput').focus();
          $('#msgInput').selectionStart = 20;
          break;
        case 'copy':
          (navigator.clipboard || { writeText: function (s) { document.execCommand('copy'); var ta = document.createElement('textarea'); ta.value = s; document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, s.length); document.execCommand('copy'); document.body.removeChild(ta); } }).writeText(m.text || '');
          toast('已复制');
          break;
        case 'collect':
          DB.favorites.push({ mid: m.id, ts: m.ts || Date.now(), msg: m });
          saveDB();
          toast('已收藏');
          break;
        case 'translate':
          toast('翻译（即将上线）');
          break;
        case 'recall':
          m.recalled = true;
          saveDB();
          renderMessages();
          renderChatList();
          toast('已撤回');
          break;
        case 'delete': {
          var g = groupById(activeGroupId);
          g.messages = g.messages.filter(function (x) { return x.id !== m.id; });
          saveDB();
          renderMessages();
          renderChatList();
          break;
        }
        case 'multi':
          toast('多选待开发');
          break;
      }
    }
    var BUBBLE_MENU_HTML = [
      { key: 'reply', label: '回复', html: '<span class="bm-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14.4l-4-4 4-4"/><path d="M5 10.4h10.4a4 4 0 0 1 4 4v3.2"/></svg></span>' },
      { key: 'collect', label: '收藏', html: '<span class="bm-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3.6l7 4v8.8l-7 4-7-4V7.6z"/></svg></span>' },
      { key: 'recall', label: '撤回', html: '<span class="bm-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 4v8M6 8l6-4 6 4"/></svg></span>' }
    ];

    /* 语音 */
    $('#voiceToggle').addEventListener('click', function () {
      setVoiceMode(!voiceMode);
    });
    $('#cardDots').addEventListener('click', partnerCardReply);
    $('#holdTalk').addEventListener(PDOWN, function (e) {
      e.preventDefault();
      startRec(e);
    });
    document.addEventListener(PUP, function () { stopRec(false); });
    document.addEventListener(PCANCEL, function () { stopRec(true); });
    $('#emojiToggle').addEventListener('click', function () {
      if ($('#emojiPanel').classList.contains('hidden')) openEmojiPanel();
      else closePanels();
    });
    $('#plusToggle').addEventListener('click', function () {
      if ($('#plusPanel').classList.contains('hidden')) openPlusPanel();
      else closePanels();
    });
    $('#emojiPanel').addEventListener('click', function (e) {
      var tab = e.target.closest('.panel-tab');
      if (tab) { switchEmojiTab(tab.dataset.etab); return; }
      if (e.target.closest('#manageCards')) {
        if (emojiTab === 'cards') openLibrary(true);
        else openEmojiMgr();
        return;
      }
      var libChip = e.target.closest('#emojiLibBar .chip');
      if (libChip) {
        if (libChip.dataset.egid === '__mgr__') openEmojiMgr();
        else {
          emojiGroupId = libChip.dataset.egid;
          renderEmojiLibBar();
          renderEmojiGrid();
        }
        return;
      }
      var filt = e.target.closest('#cardPickFilter .chip');
      if (filt) {
        cardPickFilter = filt.dataset.gid === '' ? null : filt.dataset.gid;
        renderCardPick();
        return;
      }
      var emoImg = e.target.closest('[data-emoji-img]');
      if (emoImg) {
        var eg = activeEmojiGroup();
        var eitem = eg && eg.items[+emoImg.dataset.emojiImg];
        if (eitem && typeof eitem === 'object') {
          sendMsg({ type: 'sticker', text: eitem.name, sticker: eitem.src });
        }
        return;
      }
      var emo = e.target.closest('[data-emoji]');
      if (emo) { sendMsg({ type: 'sticker', text: emo.dataset.emoji }); return; }
      var cp = e.target.closest('.card-pick-item');
      if (cp) {
        var c = cardById(cp.dataset.cid);
        if (c) {
          sendMsg({ type: 'card', text: c.content });
          closePanels();
        }
      }
    });
    $('#plusPanel').addEventListener('click', function (e) {
      var dot = e.target.closest('#plusDots i');
      if (dot) {
        setPlusPage($$('#plusDots i').indexOf(dot));
        return;
      }
      var item = e.target.closest('.plus-item');
      if (item) onPlusAction(item.dataset.plus);
    });
    var swipeX = null;
    $('#plusTrack').addEventListener('touchstart', function (e) {
      swipeX = e.touches[0].clientX;
    }, { passive: true });
    $('#plusTrack').addEventListener('touchend', function (e) {
      if (swipeX == null) return;
      var dx = e.changedTouches[0].clientX - swipeX;
      swipeX = null;
      if (Math.abs(dx) > 36) setPlusPage(dx < 0 ? 1 : 0);
    }, { passive: true });

    /* 消息设置 */
    $('#chatInfoBack').addEventListener('click', function () {
      closeScreen('pageChatInfo');
      renderCiRefresh();
    });
    function renderCiRefresh() {
      var g = groupById(activeGroupId);
      if (g) { renderChatList(); updateChatHeader(); }
    }
    $('#swRemind').addEventListener('click', function () {
      var g = groupById(activeGroupId);
      if (!g) return;
      g.remind = !g.remind;
      this.classList.toggle('active', g.remind);
      saveDB();
      toast(g.remind ? '已开启提醒' : '已关闭提醒');
    });
    $('#ciBg').addEventListener('click', function () {
      $('#ciBgRow').classList.toggle('hidden');
    });
    $('#ciFind').addEventListener('click', function () { toast('查找聊天记录（即将上线）'); });
    $('#ciReport').addEventListener('click', function () { toast('已提交投诉（模拟）'); });
    $('#ciMembers').addEventListener('click', function (e) {
      if (e.target.closest('#ciAddMember')) { openAddMember(); return; }
      var av = e.target.closest('.av[data-uid]');
      if (av) openProfile(av.dataset.uid);
    });
    $('#addMemberList').addEventListener('click', function (e) {
      var row = e.target.closest('[data-addmid]');
      if (!row) return;
      var g = groupById(activeGroupId);
      var f = friendById(row.dataset.addmid);
      if (!g || !f) return;
      g.memberIds.push(f.id);
      if (g.memberIds.length > 1 && g.memberIds.indexOf(f.id) === 1) {
        // 单聊加人变群聊：更新会话名
        g.name = g.memberIds.map(function (id) { var x = friendById(id); return x ? x.name : ''; }).filter(Boolean).join('、');
      }
      saveDB();
      closeSheets();
      renderCiMembers(g);
      renderChatList();
      updateChatHeader();
      toast('已添加 ' + f.name);
    });
    $('#swPinned').addEventListener('click', function () {
      var g = groupById(activeGroupId);
      if (!g) return;
      g.pinned = !g.pinned;
      this.classList.toggle('active', g.pinned);
      saveDB();
      renderChatList();
      toast(g.pinned ? '已置顶聊天' : '已取消置顶');
    });
    $('#swMuted').addEventListener('click', function () {
      var g = groupById(activeGroupId);
      if (!g) return;
      g.muted = !g.muted;
      this.classList.toggle('active', g.muted);
      saveDB();
      renderChatList();
      toast(g.muted ? '已开启消息免打扰' : '已关闭消息免打扰');
    });
    $('#bgSwatches').addEventListener('click', function (e) {
      var b = e.target.closest('.bg-swatch');
      var g = groupById(activeGroupId);
      if (!b || !g) return;
      g.bg = b.dataset.bg;
      saveDB();
      applyBg(g.bg);
      $$('#bgSwatches .bg-swatch').forEach(function (x) { x.classList.toggle('active', x === b); });
      toast('聊天背景已更新');
    });
    $('#clearChat').addEventListener('click', function () {
      var g = groupById(activeGroupId);
      if (!g) return;
      if (!g.messages.length) { toast('还没有聊天记录'); return; }
      if (!confirm('清空当前聊天记录？')) return;
      g.messages = [];
      saveDB();
      renderMessages();
      renderChatList();
      closeSheets();
      toast('已清空');
    });

    /* 通话 */
    $('#sheetCallOptions').addEventListener('click', function (e) {
      var row = e.target.closest('[data-callmode]');
      if (row) startCall(row.dataset.callmode);
    });
    $('#callScreen').addEventListener('click', function (e) {
      var btn = e.target.closest('.call-btn');
      if (!btn) return;
      if (btn.dataset.callbtn === 'hangup') hangupCall();
      else btn.classList.toggle('active');
    });

    /* 字卡库 */
    $('#libraryBack').addEventListener('click', closeLibrary);
    $('#cardAdd').addEventListener('click', function () { openCardEdit(null); });
    $('#libSearchBtn').addEventListener('click', function () {
      var bar = $('#libSearchBar');
      bar.classList.toggle('hidden');
      if (!bar.classList.contains('hidden')) setTimeout(function () { $('#libSearchInput').focus(); }, 100);
      else { libSearch = ''; $('#libSearchInput').value = ''; renderLibrary(); }
    });
    $('#libSearchInput').addEventListener('input', function () { libSearch = this.value; renderLibrary(); });
    $('#libSearchClear').addEventListener('click', function () { libSearch = ''; $('#libSearchInput').value = ''; renderLibrary(); });
    $('#libBatchBtn').addEventListener('click', toggleBatchMode);
    $('#libFilterBar').addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      var gid = chip.dataset.gid;
      if (gid === '') libFilterGroup = null;
      else if (gid === '__none__') libFilterGroup = '';
      else libFilterGroup = gid;
      renderLibrary();
    });
    $('#cardList').addEventListener('click', function (e) {
      if (e.target.closest('#emptyNewCard')) { openCardEdit(null); return; }
      var row = e.target.closest('.card-row');
      if (!row) return;
      var cid = row.dataset.cid;
      if (libBatchMode) {
        if (libSelected[cid]) delete libSelected[cid];
        else libSelected[cid] = true;
        updateBatchBar();
        renderLibrary();
        return;
      }
      if (e.target.closest('.row-edit')) { openCardEdit(cardById(cid)); return; }
      var card = cardById(cid);
      if (card) copyText(card.content);
    });
    $('#libBatchGroup').addEventListener('click', function () {
      var ids = Object.keys(libSelected);
      if (!ids.length) { toast('请先选择字卡'); return; }
      if (!DB.cardGroups.length) { toast('请先创建分组'); openGroupMgr(); return; }
      var names = DB.cardGroups.map(function (g, i) { return (i + 1) + '. ' + g.name; }).join('\n');
      var choice = prompt('选择分组（输入序号，0 为取消分组）：\n' + names);
      if (choice == null) return;
      var n = parseInt(choice);
      if (isNaN(n) || n < 0 || n > DB.cardGroups.length) { toast('无效序号'); return; }
      batchSetGroup(n === 0 ? null : DB.cardGroups[n - 1].id);
    });
    $('#libBatchDisable').addEventListener('click', batchToggleDisable);
    $('#libBatchDelete').addEventListener('click', batchDelete);
    $('#libGroupMgr').addEventListener('click', openGroupMgr);
    $('#libDedup').addEventListener('click', runDedup);
    $('#libExport').addEventListener('click', exportCards);
    $('#libImport').addEventListener('click', function () { $('#libImportFile').click(); });
    $('#libImportFile').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (f) importCards(f);
      this.value = '';
    });
    $('#libSettings').addEventListener('click', openAppSettings);
    $('#cardSave').addEventListener('click', saveCard);
    $('#cardDelete').addEventListener('click', deleteCard);
    $('#cardGroupChips').addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      editingCard.groupId = chip.dataset.gid || null;
      renderCardGroupChips();
    });

    /* 分组管理 */
    $('#groupAddBtn').addEventListener('click', function () { openGroupEdit(null); });
    $('#groupMgrList').addEventListener('click', function (e) {
      var row = e.target.closest('.gm-row');
      if (!row) return;
      var g = cardGroupById(row.dataset.gid);
      if (!g) return;
      var btn = e.target.closest('button');
      if (!btn) return;
      var act = btn.dataset.act;
      if (act === 'toggle') { g.disabled = !g.disabled; saveDB(); renderGroupMgr(); renderLibrary(); toast(g.disabled ? '分组已屏蔽' : '分组已启用'); }
      else if (act === 'edit') { openGroupEdit(g); }
      else if (act === 'del') {
        if (confirm('删除分组「' + g.name + '」？（字卡不会被删除）')) {
          DB.cardGroups = DB.cardGroups.filter(function (x) { return x.id !== g.id; });
          DB.cards.forEach(function (c) { if (c.groupId === g.id) c.groupId = null; });
          saveDB(); renderGroupMgr(); renderLibrary(); renderCardPick(); toast('已删除分组');
        }
      }
    });
    $('#groupSave').addEventListener('click', saveGroup);
    $('#groupDelete').addEventListener('click', deleteGroup);
    $('#groupSwatches').addEventListener('click', function (e) {
      var sw = e.target.closest('.swatch');
      if (!sw) return;
      editingGroup.color = sw.dataset.color;
      renderGroupSwatches();
    });
    $('#groupName').addEventListener('input', function () { editingGroup.name = this.value; });

    /* 表情库管理 */
    $('#emojiGroupAddBtn').addEventListener('click', function () { openEmojiEdit(null); });
    $('#emojiMgrList').addEventListener('click', function (e) {
      var row = e.target.closest('.emoji-mgr-row');
      if (row) openEmojiEdit(emojiGroupById(row.dataset.egid));
    });
    $('#emojiGroupSave').addEventListener('click', saveEmojiGroup);
    $('#emojiGroupDelete').addEventListener('click', deleteEmojiGroup);
    $('#emojiImportFile').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (f) importEmojiFile(f);
      this.value = '';
    });
    $('#emojiImgFile').addEventListener('change', function () {
      importEmojiImages(this.files);
      this.value = '';
    });
    $('#emojiImgList').addEventListener('input', function (e) {
      var inp = e.target.closest('.emoji-img-name');
      if (!inp) return;
      var it = editingEmojiImages[+inp.dataset.idx];
      if (it) it.name = inp.value;
    });
    $('#emojiImgList').addEventListener('click', function (e) {
      var del = e.target.closest('.emoji-img-del');
      if (!del) return;
      editingEmojiImages.splice(+del.dataset.idx, 1);
      renderEmojiImgList();
    });

    /* 全局设置 */
    $('#swTyping').addEventListener('click', function () {
      DB.settings.typingIndicatorEnabled = !DB.settings.typingIndicatorEnabled;
      this.classList.toggle('active', DB.settings.typingIndicatorEnabled);
      saveDB();
    });
    $('#delayMin').addEventListener('change', function () {
      var v = parseFloat(this.value) || 0;
      DB.settings.replyDelayMin = Math.max(0, Math.round(v * 1000));
      if (DB.settings.replyDelayMin > DB.settings.replyDelayMax) DB.settings.replyDelayMax = DB.settings.replyDelayMin;
      this.value = secOf(DB.settings.replyDelayMin);
      $('#delayMax').value = secOf(DB.settings.replyDelayMax);
      saveDB();
    });
    $('#delayMax').addEventListener('change', function () {
      var v = parseFloat(this.value) || 0;
      DB.settings.replyDelayMax = Math.max(DB.settings.replyDelayMin, Math.round(v * 1000));
      this.value = secOf(DB.settings.replyDelayMax);
      saveDB();
    });
    $$('.delay-presets button').forEach(function (b) {
      b.addEventListener('click', function () {
        var parts = this.dataset.preset.split(',');
        DB.settings.replyDelayMin = Math.round(parseFloat(parts[0]) * 1000);
        DB.settings.replyDelayMax = Math.round(parseFloat(parts[1]) * 1000);
        $('#delayMin').value = secOf(DB.settings.replyDelayMin);
        $('#delayMax').value = secOf(DB.settings.replyDelayMax);
        saveDB();
        toast('已应用');
      });
    });

    /* 自动回复开关 */
    $('#swAutoReply').addEventListener('click', function () {
      var g = groupById(activeGroupId);
      if (!g || g.memberIds.length !== 1) return;
      var f = friendById(g.memberIds[0]);
      if (!f) return;
      f.autoReply = !f.autoReply;
      this.classList.toggle('active', f.autoReply);
      saveDB();
      toast(f.autoReply ? '已开启自动回复' : '已关闭自动回复');
    });

    /* 好友资料 */
    $('#profileBack').addEventListener('click', function () { closeScreen('pageProfile'); });
    $('#profileEdit').addEventListener('click', function () {
      if (profileIsMe) openMyEdit();
      else openFriendEdit(friendById(activeFriendId));
    });
    $('#profileMore').addEventListener('click', function () { toast('更多功能待开发'); });
    $('#profileAvatar').addEventListener('click', function () { $('#profileAvatarFile').click(); });
    $('#profileAvatarFile').addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (!file) return;
      shrinkImage(file, function (data) {
        if (!data) { toast('图片处理失败'); return; }
        if (profileIsMe) {
          DB.me.avatar = data;
          saveDB();
          renderProfile();
          renderMessages();
          toast('头像已更新');
          return;
        }
        var f = friendById(activeFriendId);
        if (!f) { toast('图片处理失败'); return; }
        f.avatar = data;
        saveDB();
        renderProfile();
        renderContacts();
        renderChatList();
        toast('头像已更新');
      });
      this.value = '';
    });
    $('#profileRegionRow').addEventListener('click', openRegionSheet);
    $('#regionSave').addEventListener('click', saveRegion);
    $('#profileChat').addEventListener('click', function () {
      if (profileIsMe) return;
      var gid = findOrCreateSingle(activeFriendId);
      closeScreen('pageProfile');
      renderChatList();
      openChat(gid);
    });
    $('#profileCall').addEventListener('click', function () {
      if (profileIsMe) return;
      var gid = findOrCreateSingle(activeFriendId);
      renderChatList();
      openCallOptions(gid);
    });
  }

  /* ================= 启动 ================= */
  function initSplash() {
    var splash = $('#splash');
    setTimeout(function () {
      splash.classList.add('hide');
      setTimeout(function () { splash.remove(); }, 520);
    }, 6400);
  }

  function fitPhone() {
    var phone = $('#phone');
    if (window.innerWidth <= 520) {
      phone.style.transform = '';
      return;
    }
    var scale = Math.min(1, (window.innerHeight - 24) / 844, (window.innerWidth - 24) / 390);
    phone.style.transform = 'scale(' + scale + ')';
    phone.style.transformOrigin = 'center center';
  }

  function init() {
    clockLoop();
    renderChatList();
    renderContacts();
    bindEvents();
    fitPhone();
    window.addEventListener('resize', fitPhone);
    initSplash();
    tickStatuses();
  }

  init();
})();
