const path = require('path');
const request = require('sync-request'); // Blocking request

function fetchJsonBlocking(url) {
  const res = request('GET', url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive'
    }
  });

  if (res.statusCode === 200) {
    return JSON.parse(res.getBody('utf8'));
  }
  throw new Error(`Request failed to ${url}: ${res.statusCode}`);
}

function toUrlSafeBase64(input) {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function transformHtmlImages(htmlString) {
  const basePath = 'ZGlzdFxwYWdlcw'; // already base64 encoded fixed path

  return htmlString.replace(/<img[^>]+src="([^"]+)"[^>]*>/g, (match, src) => {
    const filename = path.basename(src);
    const filenameB64 = toUrlSafeBase64(filename);

    const apiUrl = `https://diagmindtw.com/sql_read_api/persist.php?findFileUrlSafe&path=${basePath}&filename=${filenameB64}`;

    try {
      const response = fetchJsonBlocking(apiUrl);
      if (response.file_hash) {
        const newSrc = `https://diagmindtw.com/sql_read_api/persist.php?getFile=${response.file_hash}`;
        return match.replace(src, newSrc);
      }
    } catch (err) {
      console.error(`Error fetching hash for ${src}: ${err.message}`);
    }

    return match; // If anything fails, keep the original image tag
  });
}

// Example usage
// const inputHtml = '<img src="2a86d481b1d042089330172f055b23cd_asset_1.png">';
// const outputHtml = transformHtmlImages(inputHtml);
// console.log(outputHtml);


module.exports = {
    fetchJsonBlocking,
    toUrlSafeBase64,
    transformHtmlImages
    };