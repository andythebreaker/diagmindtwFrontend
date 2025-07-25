/**
 * Process date/time information in the HTML document
 * @param {object} $ - Cheerio object
 * @returns {object} - Modified Cheerio object
 */
function dateTimeProcessor($) {
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

    /*if ($('time[datetime]').length === 0) {
      $('body').prepend(`<time datetime="${publishDate.split(' ')[0]}">${publishDate.split(' ')[0]}</time>`);
    }*/

    if ($('head title').length === 0) {
        const $topicDiv = $('.topicStringDom');
        let titleText = '';
        if ($topicDiv.length) {
            // Try to get text from first <p> child
            const $p = $topicDiv.find('p').first();
            if ($p.length) {
                titleText = $p.text().trim();
            } else {
                titleText = $topicDiv.text().trim();
            }
        }
        if (titleText) {
            $('head').append(`<title>${titleText}</title>`);
        }
    }

    $('head').append(`<link href="https://fonts.googleapis.com/css2?family=Quicksand&display=swap" rel="stylesheet">
        <script src="//s3-ap-northeast-1.amazonaws.com/justfont-user-script/jf-65691.js"></script>
        <script src="https://kit.fontawesome.com/65b47a30d3.js" crossorigin="anonymous"></script>`);

    return $;
}

module.exports = {
    dateTimeProcessor
};