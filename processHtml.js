const fs = require('fs');
const path = require('path');
const { toChineseWithUnits, toUpperCase } = require('chinese-number-format');
const cheerio = require('cheerio');
const { htmlPreprocessMiddleware } = require('./htmlMiddleware');

const fontSizeSetAll = new Set();
const colorSetAll = new Set();
const bool_flag_use_gpu_background = false;

function readTextFileSync(fileName) {
  try {
    const fullPath = path.resolve(fileName);
    const content = fs.readFileSync(fullPath, 'utf-8');
    return content;
  } catch (err) {
    return `Error reading file: ${err.message}`;
  }
}

/**
 * 處理 HTML：加上 class 並移除指定 inline style。
 * @param {string} html - 原始 HTML 字串。
 * @returns {string} - 修改後的 HTML 字串。
 */
function processHtml(html) {
  // 使用 middleware 對 HTML 字串進行預處理
  const preprocessedHtml = htmlPreprocessMiddleware(html);

  const $ = cheerio.load(preprocessedHtml);

  const titleText = $('head > title').text().replace(/\s+/g, '').toLowerCase();

  // Don't skip files with empty titles - many OneNote exported files don't have title tags
  // if (!titleText.trim()) {
  //   console.log('Skipped: title is empty');
  //   return '';
  // }

  const skipTitleKeywords = ['圖庫資源', '模板試作', '工程組', '示範']; // 可加其他你想排除的關鍵詞

  const shouldSkipByTitle = titleText && skipTitleKeywords.some(keyword => titleText.includes(keyword));

  if (shouldSkipByTitle) {
    console.log('Skipped: title contains keyword indicating a gallery page');
    return '';
  }

  if (shouldSkipByTitle) {
    console.log('Skipped: title contains keyword indicating a gallery page');
    return '';
  }

  const bodyText = $('body').text().replace(/\s+/g, '');
  if (bodyText.length < 100) {  // Reduced from 300 to 100
    console.log('Skipped: body inner text < 100');
    return ''; // 回傳空字串，作為「略過」訊號
  }

  const firstDiv = $('body > div').first();
  const innerDiv = firstDiv.children('div').first();
  if (innerDiv.length) {
    innerDiv.prependTo('body');
    innerDiv.addClass('outerSpaceWithTopic');
  }

  // outerSpaceWithTopic > div first: add class = topicStringDom, 2nd add class dateTimeStringDom; index = 3 and all index >3 add outerSpace and move prepend to body
  if (innerDiv.length) {
    const $children = innerDiv.children('div');
    if ($children.length > 0) {
      $children.eq(0).addClass('topicStringDom');
    }
    if ($children.length > 1) {
      $children.eq(1).addClass('dateTimeStringDom');
    }
    $children.each((idx, el) => {
      if (idx === 2 || idx > 2) {
        const $el = $(el);
        $el.addClass('outerSpace');
        $el.prependTo('body');
      }
    });
  }

  $('body > div').each((_, el) => {
    const $el = $(el);
    const innerText = $el.text().trim();
    if ((!$el.hasClass('outerSpaceWithTopic')) && (!$el.hasClass('outerSpace'))) {
      if (innerText) {
        $el.addClass('outerSpaceOld'); $el.addClass('display-none');
      } else {
        $el.addClass('display-none');
      }
    }
  });

  const fontSizeSetPage = new Set();
  const colorSetPage = new Set();

  $('*').each((_, el) => {
    const $el = $(el);
    const style = $el.attr('style');
    if (!style) return;

    // 處理 font-size
    const fontSizeMatch = style.match(/font-size\s*:\s*([\d.]+)pt/i);
    if (fontSizeMatch) {
      const size = fontSizeMatch[1];
      fontSizeSetPage.add(size);
      fontSizeSetAll.add(size);
      $el.addClass(`oldFontSize-${size}Pt`);
    }

    // 處理 color
    const colorMatch = style.match(/color\s*:\s*(#[0-9a-fA-F]{3,6})/i);
    if (colorMatch) {
      let hex = colorMatch[1].toLowerCase();
      // 確保是6位
      if (hex.length === 4) {
        hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
      }
      colorSetAll.add(hex);
      colorSetPage.add(hex);
      $el.addClass(`oldColor-${hex.replace('#', '')}`);
    }

    // 加上 data-aos="fade-up"
    $el.attr('data-aos', 'fade-up');

  });

  const fontSizes = Array.from(fontSizeSetPage).map(Number).sort((a, b) => b - a);
  const fontSizeRankMap = new Map();
  fontSizes.forEach((size, idx) => {
    fontSizeRankMap.set(size.toString(), idx + 1); // 最大為1
  });

  if (fontSizes.length > 6) {
    $('body').addClass('flagTooMuchFontSize');
  }

  $('*').each((_, el) => {
    const $el = $(el);
    const style = $el.attr('style');
    if (!style) return;
    const fontSizeMatch = style.match(/font-size\s*:\s*([\d.]+)pt/i);
    if (fontSizeMatch) {
      const size = fontSizeMatch[1];
      const rank = fontSizeRankMap.get(size);
      if (rank) {
        $el.addClass(`newFontSizeRank-${rank}`);
      }
    }
  });

  $('.outerSpace > ul > li').each((_, el) => {
    const $el = $(el);

    if ($el.text().length > 800) {
      $el.find('> ul').addClass('titleL2ul');
      //$el.find('> ul > li').addClass('titleL2');
      $el.find('> ul > li').each((idx, li) => {
        const $li = $(li);
        $li.addClass('titleL2li');
        $li.find('> p:first-of-type').addClass('titleL2p');
        $li.find('> span:first-of-type').addClass('titleL2p');//重要 20250724 新增!
        $li.find('> p:first-of-type > span:first-of-type').addClass('titleL2span');
        $li.find('> span:first-of-type > span:first-of-type').addClass('titleL2span');//重要 20250724 新增!

        let origText = $li.find('> span:first-of-type > span:first-of-type, > p:first-of-type > span:first-of-type').text();
        $li.find('> span:first-of-type > span:first-of-type, > p:first-of-type > span:first-of-type').text(`${toChineseWithUnits(idx + 1, 'zh-TW').replace(/一十/gm, '十')}、${origText}`);
      });
    }
  });

  var bool_flag_idx_dont_count = 0;
  $('.outerSpace > ul > li > p:first-of-type > span:first-of-type').each((idx, el) => {
    const $el = $(el);
    const style = $el.attr('style');

    // 在既有文字前加上 toChineseWithUnits(index, 'zh-TW');
    const origText = $el.text();

    if (origText.includes('編輯格式')) {
      // 找到父層 li，並隱藏
      $el.closest('li').css('display', 'none');
      bool_flag_idx_dont_count = 1; // 設置標誌，表示這個元素不計數
      return; // 不處理、不計數
    }

    $el.text(`${toUpperCase(toChineseWithUnits(idx + 1 - bool_flag_idx_dont_count, 'zh-TW').replace(/一十/gm, '十'), 'zh-TW')}、${origText}`);

    if (style) {
      const newStyle = style
        .split(';')
        .map(s => s.trim())
        .filter(s => !s.toLowerCase().startsWith('font-size'))
        .join('; ');

      if (newStyle) {
        $el.attr('style', newStyle);
      } else {
        $el.removeAttr('style');
      }
    }
  });

  const styleTag = `<style>
  ${readTextFileSync('fonts.css')}
  ${readTextFileSync('index.css')}
  </style>`;

  if ($('head').length > 0) {
    $('head').append(styleTag);
  } else {
    $('html').prepend(`<head>${styleTag}</head>`);
  }

  // 插入 <canvas> 為 body 的第一個子元素
  if (bool_flag_use_gpu_background) {
    $('body').prepend(`
    <canvas id="glsl-canvas"></canvas>
    `);
  }

  // 插入 script 為 body 的最後一個子元素
  $('body').append(readTextFileSync("index.html"));

  // $('img').each((_, el) => {
  //   const $img = $(el);
  //   $img.wrap('<div class="image-wrapper-h-center"></div>');
  // });

  $('*').each((_, el) => {//跟上面只移除部分fontsize有功能重複一點點
    const $el = $(el);
    const style = $el.attr('style');
    if (!style) return;
    const newStyle = style
      .split(';')
      .map(s => s.trim())
      .filter(s => !/^font-size\s*:/i.test(s))
      .join('; ');
    if (newStyle) {
      $el.attr('style', newStyle);
    } else {
      $el.removeAttr('style');
    }
  });

  $('table > tbody > tr > td > span').each((_, el) => {
    $(el).addClass('in-table-text-resize');
  });

  $('img').each((_, el) => {
    const $el = $(el);
    let width, height;

    // 先檢查 width 和 height 屬性
    const widthAttr = $el.attr('width');
    const heightAttr = $el.attr('height');

    if (widthAttr && heightAttr) {
      width = parseInt(widthAttr, 10);
      height = parseInt(heightAttr, 10);
    } else {
      // 如果沒有屬性，再檢查 style
      const style = $el.attr('style');
      if (!style) return;
      const widthMatch = style.match(/width\s*:\s*(\d+)\s*;?/i);
      const heightMatch = style.match(/height\s*:\s*(\d+)\s*;?/i);
      if (widthMatch && heightMatch) {
        width = parseInt(widthMatch[1], 10);
        height = parseInt(heightMatch[1], 10);
      } else {
        return;
      }
    }

    if (width < 20 && height < 20) {
      $el.addClass('display-none');
    }
  });

//MOVE THE DATE TIME to NEW JS FILE -----------------

  // Extract publish date/time from meta or DOM
  let publishDate = '1987/8/7 8:7:00';

  // Try meta tags first
  const metaDate = $('meta[name="publish_date"]').attr('content') ||
           $('meta[property="article:published_time"]').attr('content');
  if (metaDate) {
    publishDate = metaDate;
  } else {
    // Try to extract from .dateTimeStringDom
    const $dateDiv = $('.dateTimeStringDom');
    if ($dateDiv.length) {
    // Try to get date and time from <p> children
    const $ps = $dateDiv.find('p');
    let dateStr = '';
    let timeStr = '';
    if ($ps.length >= 1) {
      dateStr = $ps.eq(0).text().trim();
    }
    if ($ps.length >= 2) {
      timeStr = $ps.eq(1).text().trim();
    }
    // Try to parse date and time
    if (dateStr) {
      // Remove weekday if present
      dateStr = dateStr.replace(/^[A-Za-z]+,\s*/, '');
      // Convert "April 11, 2025" to "2025/04/11"
      const dateMatch = dateStr.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
      if (dateMatch) {
      const months = {
        January: '01', February: '02', March: '03', April: '04',
        May: '05', June: '06', July: '07', August: '08',
        September: '09', October: '10', November: '11', December: '12'
      };
      const month = months[dateMatch[1]] || '01';
      const day = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3];
      publishDate = `${year}/${month}/${day}`;
      }
    }
    if (timeStr) {
      // Convert "10:53 PM" to 22:53:00
      let timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const minute = timeMatch[2].padStart(2, '0');
      let ampm = timeMatch[3];
      if (ampm) {
        ampm = ampm.toUpperCase();
        if (ampm === 'PM' && hour < 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
      }
      hour = hour.toString().padStart(2, '0');
      publishDate += ` ${hour}:${minute}:00`;
      }
    }
    // If only date or only time, fill missing part
    if (dateStr && !timeStr) publishDate += ' 00:00:00';
    if (!dateStr && timeStr) publishDate = `1987/8/7 ${publishDate}`;
    }
  }

  // Insert meta and time tag if not present
  if ($('meta[name="publish_date"]').length === 0) {
    $('head').append(`<meta name="publish_date" content="${publishDate.split(' ')[0]}">`);
  }
  if ($('meta[property="article:published_time"]').length === 0) {
    $('head').append(`<meta property="article:published_time" content="${publishDate.replace(' ', 'T')}Z">`);
  }
  if ($('time[datetime]').length === 0) {
    $('body').prepend(`<time datetime="${publishDate.split(' ')[0]}">${publishDate.split(' ')[0]}</time>`);
  }

  //MOVE THE DATE TIME DO NEW JS FILE ----------------- end of


  return $.html();
}

module.exports = {
  processHtml,
  fontSizeSetAll,
  colorSetAll
};

module.exports = {
  processHtml,
  fontSizeSetAll,
  colorSetAll
};
