const platforms = [
  { platform: 'GitHub', url: 'https://github.com/{u}', reliable: true },
  { platform: 'Reddit', url: 'https://www.reddit.com/user/{u}', reliable: true },
  { platform: 'Twitter/X', url: 'https://twitter.com/{u}', reliable: false, note: 'May be inaccurate due to strict bot detection' },
  { platform: 'Instagram', url: 'https://www.instagram.com/{u}/', reliable: false, note: 'May be inaccurate due to strict bot detection' },
  { platform: 'TikTok', url: 'https://www.tiktok.com/@{u}', reliable: false, note: 'May be inaccurate due to strict bot detection' },
  { platform: 'Twitch', url: 'https://www.twitch.tv/{u}', reliable: true },
  { platform: 'YouTube', url: 'https://www.youtube.com/@{u}', reliable: true },
  { platform: 'LinkedIn', url: 'https://www.linkedin.com/in/{u}', reliable: false, note: 'Requires login usually, inaccurate' },
  { platform: 'Pinterest', url: 'https://www.pinterest.com/{u}/', reliable: true },
  { platform: 'SoundCloud', url: 'https://soundcloud.com/{u}', reliable: true },
  { platform: 'Steam', url: 'https://steamcommunity.com/id/{u}', reliable: true },
  { platform: 'Telegram', url: 'https://t.me/{u}', reliable: true },
  { platform: 'Snapchat', url: 'https://www.snapchat.com/add/{u}', reliable: true },
  { platform: 'Medium', url: 'https://medium.com/@{u}', reliable: true },
  { platform: 'Dev.to', url: 'https://dev.to/{u}', reliable: true },
  { platform: 'GitLab', url: 'https://gitlab.com/{u}', reliable: true },
  { platform: 'HackerNews', url: 'https://news.ycombinator.com/user?id={u}', reliable: true },
  { platform: 'Pastebin', url: 'https://pastebin.com/u/{u}', reliable: true },
  { platform: 'ProductHunt', url: 'https://www.producthunt.com/@{u}', reliable: true },
  { platform: 'GitHub API', url: 'https://api.github.com/users/{u}', reliable: true },
];

export async function checkPlatform(username: string, platformData: any) {
  const url = platformData.url.replace('{u}', encodeURIComponent(username));
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
      redirect: 'follow', // Fetch follows up to 20 redirects by default
    });
    
    clearTimeout(id);

    if (res.status === 200 || res.status === 301 || res.status === 302) {
      return { status: 'FOUND', url, ...platformData };
    }
    if (res.status === 404) {
      return { status: 'NOT_FOUND', url, ...platformData };
    }
    
    return { status: 'UNCERTAIN', note: `HTTP ${res.status}`, url, ...platformData };

  } catch (error: any) {
    clearTimeout(id);
    return { status: 'UNCERTAIN', note: error.name === 'AbortError' ? 'Timeout' : 'Network error', url, ...platformData };
  }
}

export async function checkAllPlatforms(username: string) {
  const promises = platforms.map(p => checkPlatform(username, p));
  const results = await Promise.all(promises);

  return {
    found: results.filter(r => r.status === 'FOUND'),
    notFound: results.filter(r => r.status === 'NOT_FOUND'),
    uncertain: results.filter(r => r.status === 'UNCERTAIN'),
  };
}
