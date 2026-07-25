import axios from 'axios';
import * as cheerio from 'cheerio';

export async function scrapeURL(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const title = $('title').text().trim();
    const description = $('meta[name="description"]').attr('content')?.trim() || '';

    // Remove unwanted elements
    $('script, style, nav, footer, header, aside, iframe, .ad, .advertisement, .sidebar').remove();

    // Select main content
    let contentNode = $('article, main, .post-content, .entry-content, .article-body');
    if (contentNode.length === 0) {
      contentNode = $('body');
    }

    let content = contentNode.text();

    // Clean up whitespace
    content = content.replace(/\n\s*\n/g, '\n\n').trim();

    // Truncate to max 25000 characters
    if (content.length > 25000) {
      content = content.substring(0, 25000);
    }

    // Calculate word count
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

    return {
      title,
      description,
      content,
      url,
      wordCount
    };
  } catch (error) {
    return {
      title: '',
      description: '',
      content: '',
      url,
      wordCount: 0,
      error: error.message
    };
  }
}
