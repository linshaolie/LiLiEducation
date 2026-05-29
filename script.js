const source = document.getElementById('source-markdown').textContent.trim();
const chapterList = document.getElementById('chapter-list');
const pageCard = document.getElementById('page-card');
const pageRunningHead = document.getElementById('page-running-head');
const runningLeft = document.getElementById('running-left');
const runningRight = document.getElementById('running-right');
const pageKicker = document.getElementById('page-kicker');
const pageTitle = document.getElementById('page-title');
const pageContent = document.getElementById('page-content');
const pageFolio = document.getElementById('page-folio');
const progressText = document.getElementById('progress-text');
const progressPercent = document.getElementById('progress-percent');
const progressBar = document.getElementById('progress-bar');
const prevButton = document.getElementById('prev-page');
const nextButton = document.getElementById('next-page');
const dots = document.getElementById('page-dots');
const menuToggle = document.getElementById('menu-toggle');
const drawerBackdrop = document.getElementById('drawer-backdrop');
const mobileLayout = window.matchMedia('(max-width: 880px)');
const SIDEBAR_STORAGE_KEY = 'lili-book-sidebar-collapsed';
let current = 0;
let last = 0;
let sidebarPreferenceCollapsed = readStoredSidebarPreference();
const pages = buildPages(source);
renderNav();
renderDots();
applySidebarPreference();
showPage(0, 'next');
prevButton.addEventListener('click', function () { goTo(current - 1); });
nextButton.addEventListener('click', function () { goTo(current + 1); });
menuToggle.addEventListener('click', function () {
  if (isMobileLayout()) {
    if (document.body.classList.contains('drawer-open')) closeDrawer();
    else openDrawer();
    return;
  }
  setSidebarCollapsed(!sidebarPreferenceCollapsed);
});
drawerBackdrop.addEventListener('click', closeDrawer);
mobileLayout.addEventListener('change', handleViewportChange);
pageContent.addEventListener('click', function (event) {
  const control = event.target.closest('[data-story-index], [data-story-dir]');
  if (!control) return;
  const player = control.closest('[data-story-player]');
  if (!player) return;
  const currentIndex = Number(player.dataset.active || 0);
  const maxIndex = player.querySelectorAll('.story-slide').length - 1;
  let nextIndex = currentIndex;
  if (control.dataset.storyIndex) nextIndex = Number(control.dataset.storyIndex);
  if (control.dataset.storyDir === 'prev') nextIndex = currentIndex - 1;
  if (control.dataset.storyDir === 'next') nextIndex = currentIndex + 1;
  setStoryStep(player, Math.max(0, Math.min(maxIndex, nextIndex)));
});
window.addEventListener('keydown', function (event) {
  if (event.key === 'ArrowRight' || event.key === 'PageDown') goTo(current + 1);
  if (event.key === 'ArrowLeft' || event.key === 'PageUp') goTo(current - 1);
  if (event.key === 'Escape') closeDrawer();
});
window.addEventListener('resize', updateMenuToggleState);
function buildPages(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let active = null;
  for (const line of lines) {
    if (line.startsWith('# ')) {
      if (!active) active = { title: line.replace(/^#\s+/, '').trim(), lines: [] };
      else active.lines.push(line);
      continue;
    }
    if (line.startsWith('## ')) {
      if (active) sections.push(active);
      active = { title: line.replace(/^##\s+/, '').trim(), lines: [] };
      continue;
    }
    if (active) active.lines.push(line);
  }
  if (active) sections.push(active);
  const cover = sections.shift() || { title: '里里 3-4 岁成长计划', lines: [] };
  const coverInfo = parseCoverInfo(cover.lines.join('\n'));
  const frontMatter = [
    { title: '里里的成长计划', kicker: '', layout: 'cover', html: renderBookCover(coverInfo) },
    { title: '序言', navTitle: '序言', kicker: '', layout: 'intro', hideTitle: true, html: renderIntro(coverInfo, sections.length) }
  ];
  return frontMatter.concat(sections.flatMap(function (section) {
    if (section.title.startsWith('模块')) {
      const moduleInfo = parseModuleTitle(section.title);
      return [
        {
          title: section.title,
          navTitle: section.title,
          kicker: '',
          layout: 'chapter-opener',
          hideTitle: true,
          html: renderChapterOpener(moduleInfo)
        },
        {
          title: section.title,
          navTitle: moduleInfo.name + ' · 内容',
          kicker: '',
          layout: 'module-content',
          hideTitle: true,
          html: markdownToHtml(section.lines.join('\n'), section.title)
        }
      ];
    }
    return [{ title: section.title, kicker: '', layout: 'page', html: markdownToHtml(section.lines.join('\n'), section.title) }];
  }));
}
function pageKickerFor(title, index) {
  return '';
}
function parseModuleTitle(title) {
  const match = title.match(/^(模块[一二三四五六七八九十]+)：(.+)$/);
  const prefix = match ? match[1] : title;
  const name = match ? match[2].trim() : title;
  const chineseNumber = prefix.replace(/^模块/, '');
  const chapterNumber = moduleNumberFromChinese(chineseNumber);
  return { full: title, prefix: prefix, name: name, chapterNumber: chapterNumber };
}
function moduleNumberFromChinese(text) {
  const map = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
    '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
    '十六': 16, '十七': 17, '十八': 18
  };
  return map[text] || 0;
}
function parseCoverInfo(text) {
  const lines = text.split('\n').map(function (line) { return line.trim(); }).filter(Boolean);
  const meta = lines.filter(function (line) { return line.includes('：'); });
  return {
    meta: meta,
    child: metaValue(meta, '孩子') || '里里',
    age: metaValue(meta, '当前年龄') || '3-4 岁',
    created: metaValue(meta, '原始书写日期') || '2026年4月15日',
    organized: metaValue(meta, '整理日期') || '2026年5月20日'
  };
}
function renderBookCover(coverInfo) {
  return [
    '<section class="book-cover" aria-label="书本封面">',
      '<img class="book-cover-photo" src="assets/lili/lili.jpg" alt="里里坐在窗边的照片" loading="eager">',
      '<div class="book-cover-overlay"></div>',
      '<div class="book-cover-copy">',
        '<p class="book-cover-mark">Family Growth Book</p>',
        '<h3>里里的成长计划</h3>',
        '<p class="book-cover-subtitle">在自信勇敢中长大</p>',
      '</div>',
      '<p class="book-cover-footer">未来人生属于你，我能为你做点什么</p>',
    '</section>'
  ].join('');
}
function renderIntro(coverInfo, chapterCount) {
  return [
    '<section class="intro-spread">',
      '<div class="intro-copy-shell">',
        '<p class="intro-series">Preface</p>',
        '<h3>写在前面</h3>',
        '<p class="intro-lead">孩子的成长从来不是一条可以被精确规划的直线。我们能做的，往往不是替他把未来安排妥当，而是在他还小的时候，尽力给他一份稳稳的爱、清楚的边界和可以反复依靠的日常。</p>',
        '<p class="intro-lead">于是，这本书被慢慢写了下来。它记录的不是某种完美育儿答案，而是我们在陪伴里里长大的过程中，一点一点想明白、试出来、也愿意继续修正的事。关于吃饭、睡觉、表达、规则、勇敢、自理，关于怎样在普通日子里，把成长变成看得见、做得到的一页一页。</p>',
        '<blockquote class="intro-quote">未来人生终究属于你，那么此刻我们能为你做的，也许就是把爱落实成今天的陪伴，把期待落成明天仍然可以重复的生活。</blockquote>',
      '</div>',
      '<div class="intro-summary" aria-label="简介信息">',
        '<div><span>孩子</span><b>' + escapeHtml(coverInfo.child) + '</b></div>',
        '<div><span>阶段</span><b>' + escapeHtml(coverInfo.age) + '</b></div>',
      '</div>',
    '</section>',
    '<section class="intro-colophon">',
      '<div class="intro-colophon-main">',
        '<p class="intro-note">这一年的目标，并不是把里里塑造成某种标准答案，而是陪他在被爱、被尊重和被看见中，慢慢长出自信、勇敢、边界感和责任感。等很多年后再翻开它，我们希望看见的，不只是计划本身，而是一个家庭认真爱过孩子的证据。</p>',
        '<p class="intro-signoff">谨以此书，献给里里的 3-4 岁。</p>',
      '</div>',
      '<div class="intro-timeline">',
        '<p><span>写作起点</span><b>' + escapeHtml(coverInfo.created) + '</b></p>',
        '<p><span>整理成册</span><b>' + escapeHtml(coverInfo.organized) + '</b></p>',
      '</div>',
    '</section>'
  ].join('');
}
function renderChapterOpener(moduleInfo) {
  const chapterLabel = moduleInfo.chapterNumber ? String(moduleInfo.chapterNumber).padStart(2, '0') : '--';
  const epigraph = chapterEpigraphFor(moduleInfo.name);
  return [
    '<section class="chapter-opener" aria-label="' + escapeHtml(moduleInfo.full) + '章首页">',
      '<p class="chapter-mark">Chapter ' + chapterLabel + '</p>',
      '<h3>' + escapeHtml(moduleInfo.name) + '</h3>',
      '<p class="chapter-epigraph">' + escapeHtml(epigraph) + '</p>',
    '</section>'
  ].join('');
}
function chapterEpigraphFor(name) {
  const quotes = {
    '自主吃饭': '每一次把勺子送到嘴边，都是孩子在学着掌握自己的生活。',
    '如厕训练': '身体发出的信号，被看见、被理解，孩子才会慢慢学会回应它。',
    '穿衣穿鞋': '自己把衣服穿好，并不只是动作熟练，更是“我可以”的感觉在长出来。',
    '刷牙': '重复的日常，最后会变成孩子身体里最稳的秩序感。',
    '睡眠与独立入睡': '安稳地睡去，往往来自白天足够的陪伴和夜里足够的安心。',
    '喝水与杯子': '长大常常藏在最小的转换里，比如从吸管到杯口。',
    '情绪表达': '当孩子开始说出感受，很多哭闹就不再只是哭闹。',
    '捏人、道歉与关系修复': '边界不是靠凶出来的，而是在一次次修复里慢慢学会的。',
    '阅读与书籍安排': '书先进入生活，语言和世界才会一点点进入孩子心里。',
    '数字、字母与写字': '兴趣比速度更重要，好奇心比标准答案走得更远。',
    '运动与户外': '跑起来、跳起来、出门去，孩子的身体和心都会更开阔。',
    '聊天与表达': '真正的表达，常常从有人愿意慢慢听开始。',
    '独处能力': '能和自己安稳地待在一起，是很早就该得到的力量。',
    '社交能力': '学着靠近别人，也学着保留自己，这是社交真正的开始。',
    '小责任': '责任感不是命令出来的，而是在一次次被托付里慢慢长大的。',
    '生活安全与身体边界': '安全感来自爱，边界感来自清楚而稳定的规则。',
    '屏幕使用': '真正吸引孩子的，从来不只是屏幕，而是生活本身够不够丰富。',
    '爸爸专属时间': '被爸爸认真陪伴的时光，会在孩子心里留下很深很久的底色。'
  };
  return quotes[name] || '每一个成长主题，都是孩子走向自立与自信的一小步。';
}
function metaValue(lines, label) {
  const hit = lines.find(function (line) { return line.startsWith(label + '：'); });
  return hit ? hit.split('：').slice(1).join('：').trim() : '';
}
function markdownToHtml(markdown, title) {
  if (title.includes('家庭执行看板')) return tableMarkdownToHtml(markdown);
  const lines = markdown.split('\n');
  let html = '';
  let listType = null;
  let paragraph = [];
  function flushParagraph() {
    if (!paragraph.length) return;
    html += '<p>' + inline(paragraph.join(' ')) + '</p>';
    paragraph = [];
  }
  function closeList() {
    if (!listType) return;
    html += '</' + listType + '>';
    listType = null;
  }
  function openList(type) {
    flushParagraph();
    if (listType === type) return;
    closeList();
    html += '<' + type + '>';
    listType = type;
  }
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) { flushParagraph(); closeList(); continue; }
    if (/^\|/.test(line)) {
      flushParagraph(); closeList();
      html += tableMarkdownToHtml(lines.slice(i).join('\n'));
      break;
    }
    if (/^\d+\.\s+/.test(line)) { openList('ol'); html += '<li>' + inline(line.replace(/^\d+\.\s+/, '')) + '</li>'; continue; }
    if (/^-\s+/.test(line)) { openList('ul'); html += '<li>' + inline(line.replace(/^-\s+/, '')) + '</li>'; continue; }
    if (/^(目标|行动|避免|句式|固定提醒时间|观察信号|本周最小目标|参考底线|建议流程|推进方式|每日情绪词|可接受的修复方式|书架分区|练习句式|每日责任|每周责任|家庭规则|视频记录的目的|对外分享边界|可记录主题)：?$/.test(line)) {
      flushParagraph(); closeList(); html += '<p class="label">' + escapeHtml(line) + '</p>'; continue;
    }
    paragraph.push(line);
  }
  flushParagraph(); closeList();
  return applyOpeningParagraphStyle(enhanceSpecialBlocks(html, title, markdown));
}
function applyOpeningParagraphStyle(html) {
  if (!html.startsWith('<p>')) return html;
  return html.replace('<p>', '<p class="opening-paragraph">');
}
function tableMarkdownToHtml(markdown) {
  const rows = markdown.split('\n').filter(function (line) { return line.trim().startsWith('|'); });
  if (!rows.length) return markdownToHtml(markdown.replace(/\|/g, ''), '');
  const useful = rows.filter(function (line) { return !/^\|\s*-/.test(line.trim()); });
  return '<table>' + useful.map(function (row, rowIndex) {
    const cells = row.split('|').slice(1, -1).map(function (cell) { return inline(cell.trim()) || '&nbsp;'; });
    const tag = rowIndex === 0 ? 'th' : 'td';
    return '<tr>' + cells.map(function (cell) { return '<' + tag + '>' + cell + '</' + tag + '>'; }).join('') + '</tr>';
  }).join('') + '</table>';
}
function enhanceSpecialBlocks(html, title, markdown) {
  if (title === '目的与目标') return purposeGoalsHtml(markdown);
  if (title === '每周复盘模板') return weeklyReviewTemplateHtml(markdown);
  if (title === '模块一：自主吃饭') return moduleOneEatingHtml();
  const moduleStory = (window.MODULE_STORIES || []).find(function (story) { return story.moduleTitle === title; });
  if (moduleStory) return moduleStoryHtml(moduleStory);
  if (title === '第一个 4 周执行计划') {
    return '<div class="week-grid">' + html.replace(/<p>(第 \d 周：[^<]+)<\/p>/g, '<div class="info-tile"><b>$1</b>').replace(/<\/ul>/g, '</ul></div>') + '</div>';
  }
  return html;
}
function purposeGoalsHtml(markdown) {
  const lines = markdown.split('\n').map(function (line) { return line.trim(); }).filter(Boolean);
  const dividerIndex = lines.indexOf('年度目标');
  const purposeText = dividerIndex === -1 ? lines.join(' ') : lines.slice(0, dividerIndex).join(' ');
  const goalLines = dividerIndex === -1 ? [] : lines.slice(dividerIndex + 1).filter(function (line) { return /^-\s+/.test(line); }).map(function (line) {
    return line.replace(/^-\s+/, '').trim();
  });
  return [
    '<section class="goal-manifesto" aria-label="年度目的与目标">',
      '<section class="purpose-panel">',
        '<p class="goal-eyebrow">年度目的</p>',
        '<p class="purpose-copy">' + inline(purposeText) + '</p>',
      '</section>',
      '<section class="goal-cluster">',
        '<div class="goal-cluster-head">',
          '<p class="goal-eyebrow">年度目标</p>',
          '<p class="goal-cluster-note">把期待落成今年能看见、能反复执行的几个具体变化。</p>',
        '</div>',
        '<div class="goal-checklist">',
          goalLines.map(function (line, index) { return goalItemHtml(line, index); }).join(''),
        '</div>',
      '</section>',
    '</section>'
  ].join('');
}
function goalItemHtml(line, index) {
  const parts = line.split('：');
  const title = parts.shift() || '';
  const detail = parts.join('：');
  return [
    '<article class="goal-item">',
      '<span class="goal-index">' + String(index + 1).padStart(2, '0') + '</span>',
      '<div class="goal-copy">',
        '<h4>' + escapeHtml(title) + '</h4>',
        '<p>' + inline(detail) + '</p>',
      '</div>',
    '</article>'
  ].join('');
}
function weeklyReviewTemplateHtml(markdown) {
  const lines = markdown.split('\n').map(function (line) { return line.trim(); }).filter(Boolean);
  const fields = lines.map(function (line) { return line.replace(/：$/, '').trim(); }).filter(Boolean);
  const headerFields = fields.slice(0, 4);
  const habitFields = fields.slice(4, 14);
  const nextStepFields = fields.slice(14);
  return [
    '<section class="review-sheet" aria-label="每周复盘模板">',
      '<section class="review-block review-header-block">',
        '<div class="review-block-head">',
          '<p class="goal-eyebrow">Weekly Review</p>',
          '<p class="review-note">每周只复盘一次，记录最重要的变化，不求写满，只求写清楚。</p>',
        '</div>',
        '<div class="review-top-grid">',
          headerFields.map(function (field) { return reviewFieldHtml(field, 'wide'); }).join(''),
        '</div>',
      '</section>',
      '<section class="review-block">',
        '<div class="review-block-head">',
          '<p class="goal-eyebrow">习惯追踪</p>',
          '<p class="review-note">这一页只记录本周最关键的观察，方便下周继续接着做。</p>',
        '</div>',
        '<div class="review-grid">',
          habitFields.map(function (field) { return reviewFieldHtml(field, 'compact'); }).join(''),
        '</div>',
      '</section>',
      '<section class="review-block review-next-block">',
        '<div class="review-block-head">',
          '<p class="goal-eyebrow">下周行动</p>',
        '</div>',
        '<div class="review-top-grid review-next-grid">',
          nextStepFields.map(function (field) { return reviewFieldHtml(field, 'wide'); }).join(''),
        '</div>',
      '</section>',
    '</section>'
  ].join('');
}
function reviewFieldHtml(label, density) {
  const spec = reviewFieldSpec(label, density);
  const className = 'review-field' + (spec.className ? ' ' + spec.className : '');
  return [
    '<article class="' + className + '">',
      '<h4>' + escapeHtml(label) + '</h4>',
      '<div class="review-lines" aria-hidden="true">',
        Array.from({ length: spec.lines }).map(function () { return '<span></span>'; }).join(''),
      '</div>',
    '</article>'
  ].join('');
}
function reviewFieldSpec(label, density) {
  if (label === '复盘日期') return { className: 'short', lines: 1 };
  if (label === '本周主攻习惯') return { className: 'medium', lines: 2 };
  if (label === '本周最明显进步' || label === '本周最难的问题') return { className: 'wide tall', lines: 4 };
  if (label === '情绪表达' || label === '捏人和关系修复') return { className: 'wide medium', lines: 3 };
  if (label === '下周只重点改 1 件事') return { className: 'wide tall', lines: 4 };
  if (label === '需要爸爸做的事' || label === '需要妈妈做的事' || label === '需要外婆统一配合的事') return { className: 'medium tall', lines: 3 };
  if (density === 'compact') return { className: 'compact', lines: 2 };
  return { className: '', lines: 3 };
}
function moduleOneEatingHtml() {
  const actionCards = [
    {
      image: 'assets/module1-action-1-pause-toys.png',
      title: '玩具先暂停',
      bubble: '马上吃饭了，玩具先暂停。',
      note: '先停下玩具，再去餐桌。',
      alt: '妈妈提醒里里吃饭前先暂停玩具'
    },
    {
      image: 'assets/module1-action-2-small-portion.png',
      title: '先吃一小碗',
      bubble: '先吃这一小碗，吃完可以再添。',
      note: '碗里少一点，吃饭压力小一点。',
      alt: '里里面前放着适合入口的小份量饭菜'
    },
    {
      image: 'assets/module1-action-3-modeling.png',
      title: '大人一起示范',
      bubble: '妈妈也自己吃，你也试试看。',
      note: '大人坐下来一起吃，不追着喂。',
      alt: '妈妈坐在餐桌旁自己吃饭给里里示范'
    },
    {
      image: 'assets/module1-action-4-return-bowl.png',
      title: '碗勺送回家',
      bubble: '吃完啦，把碗勺送回家。',
      note: '吃完参与收拾，知道东西有固定位置。',
      alt: '里里吃完后把自己的碗勺放到固定位置'
    },
    {
      image: 'assets/module1-action-5-praise.png',
      title: '表扬具体行为',
      bubble: '你刚才自己吃了 5 口青菜。',
      note: '让孩子知道自己哪里做得好。',
      alt: '妈妈具体表扬里里自己吃了青菜'
    }
  ];
  const avoidCards = [
    {
      image: 'assets/module1-avoid-1-reward.png',
      title: '不用奖励换一口',
      bubble: '我们不用奖励换一口饭。',
      note: '吃饭不是交换玩具。',
      alt: '妈妈拿奖励引导里里再吃一口饭的避免示例'
    },
    {
      image: 'assets/module1-avoid-2-negotiate.png',
      title: '不长期谈判',
      bubble: '吃饭不用一直谈条件。',
      note: '规则清楚，比反复讲条件更稳。',
      alt: '大人围着里里反复谈吃饭条件的避免示例'
    },
    {
      image: 'assets/module1-avoid-3-screen.png',
      title: '餐桌没有屏幕',
      bubble: '吃饭时，屏幕先休息。',
      note: '吃饭时看食物、看家人，不看手机视频。',
      alt: '里里和大人在餐桌上被屏幕分心的避免示例'
    }
  ];
  const storyCards = actionCards.map(function (card, index) {
    return Object.assign({ kind: 'do', group: '行动', number: index + 1 }, card);
  }).concat(avoidCards.map(function (card, index) {
    return Object.assign({ kind: 'avoid', group: '避免', number: index + 1 }, card);
  }));
  return [
    '<div class="module-hero story-hero">',
      '<div>',
        '<p class="module-label">本周只抓一个习惯</p>',
        '<h3>里里自己吃饭小故事</h3>',
        '<p>把吃饭规则拆成一张一张可共读的家庭小场景。</p>',
      '</div>',
      imageScene('assets/lili-self-feeding-module1.png', '里里坐在餐桌自己用勺子吃饭，妈妈在旁边鼓励'),
    '</div>',
    '<section class="story-player" data-story-player data-active="0" aria-label="自主吃饭故事子页面">',
      '<div class="story-player-head">',
        '<div>',
          '<p class="module-label">自主吃饭</p>',
          '<h3>行动与边界</h3>',
        '</div>',
      '</div>',
      '<div class="story-slide-track">',
        storyCards.map(function (card, index) { return storySlide(card, index, storyCards.length); }).join(''),
      '</div>',
      '<div class="story-player-controls">',
        '<button class="nav-button secondary story-control" type="button" data-story-dir="prev" disabled>上一个</button>',
        '<p class="story-position">第 <span data-story-current>1</span> / ' + storyCards.length + ' 页</p>',
        '<button class="nav-button primary story-control" type="button" data-story-dir="next">下一个</button>',
      '</div>',
    '</section>',
    '<div class="minimum-goal story-goal">',
      '<b>本周最小目标</b>',
      '<span>每天至少 1 餐做到“不喂、在餐桌、自己吃”。</span>',
    '</div>',
  ].join('');
}
function moduleStoryHtml(module) {
  const storyCards = module.actionCards.map(function (card, index) {
    return Object.assign({ kind: 'do', group: '行动', number: index + 1, moduleKey: module.moduleKey }, card);
  }).concat((module.avoidCards || []).map(function (card, index) {
    return Object.assign({ kind: 'avoid', group: '避免', number: index + 1, moduleKey: module.moduleKey }, card);
  }));
  const firstCard = storyCards[0];
  return [
    '<div class="module-hero story-hero">',
      '<div>',
        '<p class="module-label">成长模块</p>',
        '<h3>' + escapeHtml(module.moduleTitle.replace(/^模块[一二三四五六七八九十]+：/, '')) + '</h3>',
        '<p>' + escapeHtml(module.intro || '把目标拆成孩子能看懂、家里能执行的小场景。') + '</p>',
      '</div>',
      imageScene(storyImageSrc(firstCard, 0), firstCard ? firstCard.alt : module.moduleTitle),
    '</div>',
    '<section class="story-player" data-story-player data-active="0" aria-label="' + escapeHtml(module.moduleTitle) + '子页面">',
      '<div class="story-player-head">',
        '<div>',
          '<p class="module-label">' + escapeHtml(module.moduleTitle.replace(/^模块[一二三四五六七八九十]+：/, '')) + '</p>',
          '<h3>行动与边界</h3>',
        '</div>',
      '</div>',
      '<div class="story-slide-track">',
        storyCards.map(function (card, index) { return storySlide(card, index, storyCards.length); }).join(''),
      '</div>',
      '<div class="story-player-controls">',
        '<button class="nav-button secondary story-control" type="button" data-story-dir="prev" disabled>上一个</button>',
        '<p class="story-position">第 <span data-story-current>1</span> / ' + storyCards.length + ' 页</p>',
        '<button class="nav-button primary story-control" type="button" data-story-dir="next">下一个</button>',
      '</div>',
    '</section>',
    '<div class="minimum-goal story-goal">',
      '<b>本周最小目标</b>',
      '<span>' + escapeHtml(module.minimumGoal || '先固定一个最小可执行动作，连续练习一周。') + '</span>',
    '</div>',
  ].join('');
}
function detailCard(title, items) {
  return '<section class="detail-card"><h4>' + escapeHtml(title) + '</h4><ul>' + items.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul></section>';
}
function routineStep(number, title, text) {
  return '<div class="routine-step"><span>' + number + '</span><b>' + escapeHtml(title) + '</b><p>' + escapeHtml(text) + '</p></div>';
}
function exampleCard(kind, eyebrow, title, text, art, bullets) {
  return '<section class="example-card ' + kind + '"><div class="example-heading">' + statusIcon(kind) + '<div><p class="example-eyebrow">' + escapeHtml(eyebrow) + '</p><h4>' + escapeHtml(title) + '</h4></div></div>' + art + '<p>' + escapeHtml(text) + '</p><ul>' + bullets.map(function (bullet) { return '<li>' + escapeHtml(bullet) + '</li>'; }).join('') + '</ul></section>';
}
function statusIcon(kind) {
  if (kind === 'do') {
    return '<span class="status-icon do" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
  }
  return '<span class="status-icon avoid" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></span>';
}
function storySlide(card, index, total) {
  const activeClass = index === 0 ? ' active' : '';
  const hidden = index === 0 ? '' : ' hidden';
  return '<article class="story-slide ' + card.kind + activeClass + '"' + hidden + ' data-story-slide="' + index + '"><figure class="story-slide-media"><img src="' + escapeHtml(storyImageSrc(card, index)) + '" alt="' + escapeHtml(card.alt) + '" loading="lazy"></figure><div class="story-dialogue"><div class="story-dialogue-head">' + statusIcon(card.kind) + '<div><p class="module-label">' + escapeHtml(card.group) + ' ' + card.number + ' / ' + total + '</p><h4>' + escapeHtml(card.title) + '</h4></div></div><div class="speech-panel"><p class="speech-speaker">妈妈说</p><p>' + escapeHtml(card.bubble) + '</p></div><p class="story-note">' + escapeHtml(card.note) + '</p></div></article>';
}
function storyCard(kind, number, card) {
  return '<article class="story-card ' + kind + '"><div class="story-card-top"><span class="story-number">' + number + '</span>' + statusIcon(kind) + '</div>' + storyPicture(card.image, card.alt, card.bubble, kind) + '<div class="story-card-copy"><h4>' + escapeHtml(card.title) + '</h4><p>' + escapeHtml(card.note) + '</p></div></article>';
}
function storyPicture(src, alt, bubble, kind) {
  return '<figure class="story-picture ' + kind + '"><img src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt) + '" loading="lazy"><figcaption class="speech-bubble">' + escapeHtml(bubble) + '</figcaption></figure>';
}
function imageScene(src, alt) {
  return '<figure class="cartoon-scene photo-scene"><img src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt) + '" loading="lazy"></figure>';
}
function storyImageSrc(card, index) {
  if (card && card.image) return card.image;
  return storyPlaceholderSrc(card || {}, index || 0);
}
function storyPlaceholderSrc(card, index) {
  const isAvoid = card.kind === 'avoid';
  const hue = isAvoid ? '#c45b3d' : '#256f6c';
  const soft = isAvoid ? '#fff1ea' : '#eef8f5';
  const boyShirt = index % 2 === 0 ? '#1f3b5b' : '#dfe8ee';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">' +
    '<defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#fff0ca"/><stop offset="1" stop-color="' + soft + '"/></linearGradient></defs>' +
    '<rect width="1600" height="900" fill="url(#bg)"/>' +
    '<rect x="92" y="110" width="330" height="230" rx="34" fill="#f4c169"/>' +
    '<rect x="1010" y="155" width="360" height="255" rx="28" fill="#fff8e8" opacity=".78"/>' +
    '<circle cx="1280" cy="250" r="78" fill="#f2ca72"/>' +
    '<rect x="230" y="595" width="1130" height="105" rx="52" fill="#b98145"/>' +
    '<rect x="385" y="700" width="45" height="130" rx="22" fill="#8a633f"/>' +
    '<rect x="1160" y="700" width="45" height="130" rx="22" fill="#8a633f"/>' +
    '<circle cx="650" cy="360" r="108" fill="#f0b38e"/>' +
    '<path d="M552 335c42-112 177-96 210 1-54-40-145-38-210-1Z" fill="#17202a"/>' +
    '<circle cx="612" cy="378" r="13" fill="#1f2933"/><circle cx="686" cy="378" r="13" fill="#1f2933"/>' +
    '<path d="M612 432c42 34 82 34 124 0" fill="none" stroke="#1f2933" stroke-width="12" stroke-linecap="round"/>' +
    '<rect x="550" y="475" width="205" height="205" rx="70" fill="' + boyShirt + '"/>' +
    '<path d="M548 535c-96 24-153 74-184 144" fill="none" stroke="#f0b38e" stroke-width="40" stroke-linecap="round"/>' +
    '<path d="M746 535c90 24 153 75 188 142" fill="none" stroke="#f0b38e" stroke-width="40" stroke-linecap="round"/>' +
    '<circle cx="1010" cy="330" r="112" fill="#e6aa86"/>' +
    '<path d="M904 315c54-116 190-100 224 4-66-42-157-41-224-4Z" fill="#3d2b20"/>' +
    '<circle cx="972" cy="365" r="12" fill="#1f2933"/><circle cx="1044" cy="365" r="12" fill="#1f2933"/>' +
    '<path d="M972 420c42 30 80 30 120 0" fill="none" stroke="#1f2933" stroke-width="11" stroke-linecap="round"/>' +
    '<rect x="900" y="472" width="225" height="215" rx="76" fill="#9570c9"/>' +
    '<path d="M1060 538c96 16 159 58 202 112" fill="none" stroke="#e6aa86" stroke-width="40" stroke-linecap="round"/>' +
    '<ellipse cx="760" cy="585" rx="122" ry="54" fill="#fff8e8"/>' +
    '<path d="M650 580h220c-12 82-48 124-110 124S662 662 650 580Z" fill="#f3b45b"/>' +
    '<circle cx="1240" cy="620" r="52" fill="' + hue + '" opacity=".18"/>' +
    '<path d="' + (isAvoid ? 'M1208 588l64 64M1272 588l-64 64' : 'M1200 620l34 35 70-82') + '" fill="none" stroke="' + hue + '" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}
function cartoonMealScene(mode) {
  const isAvoid = mode === 'avoid';
  const isDo = mode === 'do';
  const boyX = isAvoid ? 108 : 124;
  const adultX = isAvoid ? 34 : 42;
  const tableColor = isAvoid ? '#d88968' : '#6aa89e';
  const toyOpacity = isAvoid ? '1' : '.28';
  const bowlX = isAvoid ? 74 : 136;
  return '<figure class="cartoon-scene" aria-label="' + (isAvoid ? '边玩边喂的错误示例' : isDo ? '坐在餐桌自己吃的推荐示例' : '孩子准备坐到餐桌吃饭') + '">' +
    '<svg viewBox="0 0 220 150" role="img" aria-hidden="true">' +
      '<rect x="0" y="0" width="220" height="150" rx="18" fill="#fbf3e8"/>' +
      '<circle cx="178" cy="24" r="16" fill="#f1c86b" opacity=".9"/>' +
      '<rect x="30" y="88" width="160" height="14" rx="7" fill="' + tableColor + '"/>' +
      '<rect x="48" y="100" width="12" height="34" rx="6" fill="#8a6f55"/>' +
      '<rect x="160" y="100" width="12" height="34" rx="6" fill="#8a6f55"/>' +
      '<ellipse cx="' + bowlX + '" cy="82" rx="22" ry="10" fill="#ffffff"/>' +
      '<path d="M' + (bowlX - 20) + ' 82h40c-2 13-8 20-20 20s-18-7-20-20Z" fill="#f3b45b"/>' +
      '<circle cx="' + boyX + '" cy="48" r="19" fill="#f1b28d"/>' +
      '<path d="M' + (boyX - 17) + ' 43c8-18 29-15 35 0-7-5-26-5-35 0Z" fill="#27384a"/>' +
      '<circle cx="' + (boyX - 7) + '" cy="50" r="2" fill="#1f2933"/>' +
      '<circle cx="' + (boyX + 7) + '" cy="50" r="2" fill="#1f2933"/>' +
      '<path d="M' + (boyX - 6) + ' 59c5 4 10 4 15 0" stroke="#1f2933" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<rect x="' + (boyX - 22) + '" y="66" width="44" height="42" rx="14" fill="#7fb6d9"/>' +
      '<path d="M' + (boyX - 18) + ' 78c-16 2-24 8-28 18" stroke="#f1b28d" stroke-width="8" fill="none" stroke-linecap="round"/>' +
      '<path d="M' + (boyX + 18) + ' 78c14 2 20 7 27 18" stroke="#f1b28d" stroke-width="8" fill="none" stroke-linecap="round"/>' +
      '<circle cx="' + adultX + '" cy="52" r="16" fill="#e6a985"/>' +
      '<path d="M' + (adultX - 14) + ' 46c7-13 23-11 29 0-7-4-20-4-29 0Z" fill="#4b3628"/>' +
      '<rect x="' + (adultX - 18) + '" y="68" width="36" height="45" rx="13" fill="#d96f54"/>' +
      '<path d="M' + (adultX + 12) + ' 78c18 3 26 7 38 15" stroke="#e6a985" stroke-width="8" fill="none" stroke-linecap="round"/>' +
      '<rect x="120" y="116" width="34" height="18" rx="5" fill="#88b779" opacity="' + toyOpacity + '"/>' +
      '<circle cx="128" cy="136" r="4" fill="#536b4a" opacity="' + toyOpacity + '"/>' +
      '<circle cx="146" cy="136" r="4" fill="#536b4a" opacity="' + toyOpacity + '"/>' +
      (isAvoid ? '<path d="M58 32c10-11 22-11 32 0" stroke="#c45b3d" stroke-width="4" fill="none" stroke-linecap="round"/>' : '<path d="M58 31l8 9 18-21" stroke="#256f6c" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>') +
    '</svg>' +
  '</figure>';
}
function inline(text) {
  return escapeHtml(text).replace(/“([^”]+)”/g, '<strong>“$1”</strong>').replace(/\x60([^\x60]+)\x60/g, '<code>$1</code>');
}
function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function renderNav() {
  chapterList.innerHTML = pages.map(function (page, index) {
    const navTitle = page.navTitle || page.title;
    return '<li><button type="button" data-page="' + index + '" aria-label="跳到' + escapeHtml(navTitle) + '"><span class="chapter-index">' + String(index + 1).padStart(2, '0') + '</span><span class="chapter-title">' + escapeHtml(navTitle) + '</span></button></li>';
  }).join('');
  chapterList.querySelectorAll('button').forEach(function (button) {
    button.addEventListener('click', function () { goTo(Number(button.dataset.page)); closeDrawer(); });
  });
}
function renderDots() {
  dots.innerHTML = pages.map(function (_, index) { return '<button class="page-dot" type="button" data-page="' + index + '" aria-label="第 ' + (index + 1) + ' 页"></button>'; }).join('');
  dots.querySelectorAll('button').forEach(function (button) { button.addEventListener('click', function () { goTo(Number(button.dataset.page)); }); });
}
function goTo(next) {
  if (next < 0 || next >= pages.length || next === current) return;
  last = current;
  current = next;
  showPage(current, current > last ? 'next' : 'prev');
}
function showPage(index, direction) {
  const page = pages[index];
  pageCard.classList.toggle('cover-page', page.layout === 'cover');
  pageCard.classList.toggle('intro-page', page.layout === 'intro');
  pageCard.classList.toggle('body-page', page.layout === 'page');
  pageCard.classList.toggle('chapter-opener-page', page.layout === 'chapter-opener');
  pageCard.classList.toggle('module-content-page', page.layout === 'module-content');
  pageCard.classList.toggle('recto-page', isRectoPage(index, page));
  pageCard.classList.toggle('verso-page', isVersoPage(index, page));
  pageKicker.textContent = page.kicker;
  pageKicker.hidden = !page.kicker;
  pageTitle.textContent = page.title;
  pageTitle.hidden = Boolean(page.hideTitle);
  pageContent.innerHTML = page.html;
  pageCard.scrollTop = 0;
  pageCard.classList.remove('enter-next', 'enter-prev');
  void pageCard.offsetWidth;
  pageCard.classList.add(direction === 'prev' ? 'enter-prev' : 'enter-next');
  pageCard.focus({ preventScroll: true });
  prevButton.disabled = index === 0;
  nextButton.disabled = index === pages.length - 1;
  progressText.textContent = '第 ' + (index + 1) + ' / ' + pages.length + ' 页';
  const percent = Math.round(((index + 1) / pages.length) * 100);
  progressPercent.textContent = percent + '%';
  progressBar.style.width = percent + '%';
  updateBookChrome(page, index);
  chapterList.querySelectorAll('button').forEach(function (button, buttonIndex) {
    if (buttonIndex === index) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  dots.querySelectorAll('button').forEach(function (button, buttonIndex) { button.classList.toggle('active', buttonIndex === index); });
}
function updateBookChrome(page, index) {
  const running = runningTitles(page, index);
  if (pageFolio) pageFolio.textContent = running.folio;
  if (runningLeft) runningLeft.textContent = running.left;
  if (runningRight) runningRight.textContent = running.right;
  if (pageRunningHead) pageRunningHead.hidden = page.layout === 'cover' || page.layout === 'chapter-opener';
}
function runningTitles(page, index) {
  if (page.layout === 'cover') return { folio: '', left: '', right: '', spine: '' };
  if (page.layout === 'intro') return { folio: 'i', left: 'Preface', right: '写在前面', spine: 'Preface' };
  if (page.layout === 'chapter-opener') return { folio: String(index - 1), left: '', right: '', spine: page.title };
  const bodyNumber = index - 1;
  return {
    folio: String(bodyNumber),
    left: '里里的成长计划',
    right: page.title,
    spine: '里里的成长计划'
  };
}
function isRectoPage(index, page) {
  if (page.layout === 'cover') return false;
  if (page.layout === 'intro') return false;
  return (index - 1) % 2 === 1;
}
function isVersoPage(index, page) {
  if (page.layout === 'intro') return true;
  if (page.layout !== 'page') return false;
  return !isRectoPage(index, page);
}
function setStoryStep(player, index) {
  const slides = Array.from(player.querySelectorAll('.story-slide'));
  const tabs = Array.from(player.querySelectorAll('.story-tab'));
  const currentLabel = player.querySelector('[data-story-current]');
  const prev = player.querySelector('[data-story-dir="prev"]');
  const next = player.querySelector('[data-story-dir="next"]');
  player.dataset.active = index;
  slides.forEach(function (slide, slideIndex) {
    const isActive = slideIndex === index;
    slide.classList.toggle('active', isActive);
    slide.hidden = !isActive;
  });
  tabs.forEach(function (tab, tabIndex) {
    tab.setAttribute('aria-selected', tabIndex === index ? 'true' : 'false');
  });
  if (currentLabel) currentLabel.textContent = String(index + 1);
  if (prev) prev.disabled = index === 0;
  if (next) next.disabled = index === slides.length - 1;
}
function isMobileLayout() {
  return mobileLayout.matches;
}
function readStoredSidebarPreference() {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  } catch (error) {
    return false;
  }
}
function persistSidebarPreference() {
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarPreferenceCollapsed));
  } catch (error) {
    /* no-op */
  }
}
function applySidebarPreference() {
  document.body.classList.toggle('sidebar-collapsed', sidebarPreferenceCollapsed && !isMobileLayout());
  updateMenuToggleState();
}
function setSidebarCollapsed(collapsed) {
  sidebarPreferenceCollapsed = Boolean(collapsed);
  persistSidebarPreference();
  applySidebarPreference();
}
function updateMenuToggleState() {
  const drawerOpen = document.body.classList.contains('drawer-open');
  const label = isMobileLayout()
    ? (drawerOpen ? '关闭目录' : '打开目录')
    : (sidebarPreferenceCollapsed ? '展开目录' : '收起目录');
  menuToggle.setAttribute('aria-label', label);
  menuToggle.title = label;
}
function handleViewportChange() {
  closeDrawer();
  applySidebarPreference();
}
function openDrawer() {
  document.body.classList.add('drawer-open');
  drawerBackdrop.hidden = false;
  updateMenuToggleState();
}
function closeDrawer() {
  document.body.classList.remove('drawer-open');
  drawerBackdrop.hidden = true;
  updateMenuToggleState();
}
