/**
 * HTML 字串預處理 middleware
 * 使用 regex 對 HTML 字串進行預處理操作
 * @param {string} htmlString - 原始 HTML 字串
 * @returns {string} - 處理後的 HTML 字串
 */

const { transformHtmlImages } = require('./imgswap');


function htmlPreprocessMiddleware(htmlString) {
    let processedHtml = htmlString;

    processedHtml = processedHtml.replace(/(<br\s*\/?>\s*){2,}/gi, '<br class="there-were-several-br">');

    processedHtml = processedHtml
        .replace(/\b(en-US|en-[a-zA-Z]{2})\b/gi, 'zh-TW')
        .replace(/lang\s*=\s*["']en["']/gi, 'lang="zh-TW"');

    processedHtml = processedHtml.replace(/[➔→]/g, '<i class="fa-light fa-arrow-right"></i>');
    processedHtml = processedHtml.replace(/[⬆️↑⭡]/g, '<i class="fa-solid fa-arrow-up"></i>');
    processedHtml = processedHtml.replace(/[⬇️↓⭣]/g, '<i class="fa-solid fa-arrow-down"></i>');

    //TODO:important//processedHtml = transformHtmlImages(processedHtml);

    return processedHtml;
}

module.exports = {
    htmlPreprocessMiddleware
};
