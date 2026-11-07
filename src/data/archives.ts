import { youtubeVideoId } from '../services/targets';
export { youtubeVideoId } from '../services/targets';

export interface ArchiveService {
  id: string;
  name: string;
  description: string;
  country: string;
  flag: string;
  category: string;
  searchUrl: (url: string, date?: string) => string;
  homepage: string;
  notes?: string;
  supportsDate?: boolean;
  instructions?: string;
  linkLabel?: string;
  tlds?: string[]; // Country TLDs this archive is relevant for
}

export const categories = [
  { id: 'major', name: 'Major Web Archives', icon: '🌐' },
  { id: 'national', name: 'National Web Archives', icon: '🏛️' },
  { id: 'aggregators', name: 'Aggregators & Tools', icon: '🔍' },
  { id: 'cache', name: 'Search Engines', icon: '💾' },
  { id: 'specialized', name: 'Specialized Archives', icon: '📚' },
  { id: 'video', name: 'YouTube & Video Recovery', icon: '🎬' },
];

function youtubeUrl(input: string): boolean {
  try {
    return ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtu.be', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(new URL(input).hostname.toLowerCase());
  } catch { return false; }
}

export const archives: ArchiveService[] = [
  {
    id: 'archivarix-echo',
    name: 'Archivarix Echo',
    description: 'Routes URLs and other identifiers to relevant archives across many collections',
    country: 'International', flag: '🌍', category: 'aggregators',
    homepage: 'https://echo.archivarix.net/',
    searchUrl: (url) => `https://echo.archivarix.net/search?q=${encodeURIComponent(url)}`,
    instructions: 'Searches open in Echo. Some sources provide only links; a listed archive is not proof that it holds your URL.',
  },
  {
    id: 'archivarix',
    name: 'Archivarix Tools',
    description: 'Directory of Archivarix tools for web archives, deleted videos, and image research',
    country: 'International', flag: '🌍', category: 'aggregators',
    homepage: 'https://archivarix.net/',
    searchUrl: () => 'https://archivarix.net/',
    linkLabel: 'Browse tools',
    instructions: 'This is a tools directory. Use Echo for web URLs or Tube for YouTube videos.',
  },
  {
    id: 'archivarix-tube',
    name: 'Archivarix Tube',
    description: 'Find archived YouTube video metadata, subtitles, thumbnails, and possible video copies',
    country: 'International', flag: '🎬', category: 'video',
    homepage: 'https://tube.archivarix.net/',
    searchUrl: (url) => youtubeUrl(url) ? `https://tube.archivarix.net/search?q=${encodeURIComponent(youtubeVideoId(url) || url)}` : 'https://tube.archivarix.net/',
    instructions: 'For YouTube video or channel URLs. Other URLs open the tool home page. Metadata may exist even when the video file is unavailable.',
  },
  {
    id: 'filmot',
    name: 'Filmot',
    description: 'Search YouTube subtitles and metadata, including records of unavailable videos',
    country: 'International', flag: '🎬', category: 'video',
    homepage: 'https://filmot.com/',
    searchUrl: (url) => { const id = youtubeVideoId(url); return id ? `https://filmot.com/video/${id}` : 'https://filmot.com/'; },
    instructions: 'A YouTube video URL opens its metadata page; other URLs open the home page for keyword search. May require a CAPTCHA. A record does not confirm a playable copy.',
  },
  {
    id: 'quite-a-playlist',
    name: 'Quite a Playlist',
    description: 'Identify deleted or private YouTube videos from video and playlist links',
    country: 'International', flag: '🎬', category: 'video',
    homepage: 'https://quiteaplaylist.com/',
    searchUrl: (url) => youtubeUrl(url) ? `https://quiteaplaylist.com/search?url=${encodeURIComponent(url)}` : 'https://quiteaplaylist.com/',
    instructions: 'For YouTube videos and playlists. Other URLs open the home page. Restored titles or metadata do not guarantee the video can be watched.',
  },
  // Major Web Archives
  {
    id: 'wayback',
    name: 'Internet Archive (Wayback Machine)',
    description: 'The largest web archive in the world with billions of captured pages',
    country: 'USA',
    flag: '🇺🇸',
    category: 'major',
    supportsDate: true,
    searchUrl: (url, date) => {
      if (date) {
        const dateStr = date.replace(/-/g, '') + '000000';
        return `https://web.archive.org/web/${dateStr}/${url}`;
      }
      return `https://web.archive.org/web/*/${url}`;
    },
    homepage: 'https://web.archive.org',
    notes: 'Supports exact date lookup — see the page as it was on a specific day',
  },
  {
    id: 'archive-it',
    name: 'Archive-It',
    description: 'Web archiving service from the Internet Archive for institutions',
    country: 'USA',
    flag: '🇺🇸',
    category: 'major',
    searchUrl: (url) => `https://www.archive-it.org/search?q=${encodeURIComponent(url)}`,
    homepage: 'https://archive-it.org',
    notes: 'Contains curated collections from partner institutions',
  },
  {
    id: 'archive-today',
    name: 'archive.today',
    description: 'On-demand web page archiving service, captures snapshots',
    country: 'International',
    flag: '🌍',
    category: 'major',
    supportsDate: true,
    searchUrl: (url, date) => {
      if (date) {
        return `https://archive.ph/${date.replace(/-/g, '')}/${url}`;
      }
      return `https://archive.ph/newest/${url}`;
    },
    homepage: 'https://archive.ph',
    notes: 'Also available at archive.today, archive.li, archive.md',
  },
  {
    id: 'arquivo-pt',
    name: 'Arquivo.pt',
    description: 'Portuguese web archive with full-text search and API',
    country: 'Portugal',
    flag: '🇵🇹',
    category: 'major',
    supportsDate: true,
    tlds: ['.pt'],
    searchUrl: (url, date) => {
      if (date) {
        return `https://arquivo.pt/search?q=${encodeURIComponent(url)}&date=${date.replace(/-/g, '')}`;
      }
      return `https://arquivo.pt/search?q=${encodeURIComponent(url)}`;
    },
    homepage: 'https://arquivo.pt',
    notes: 'One of the few archives with a full CDX API compatible with Wayback',
  },
  {
    id: 'ghost-archive',
    name: 'Ghostarchive',
    description: 'Archived web pages and YouTube captures; search for a page or video URL',
    country: 'International',
    flag: '🌍',
    category: 'major',
    searchUrl: (url) => `https://ghostarchive.org/search?term=${encodeURIComponent(url)}`,
    homepage: 'https://ghostarchive.org',
  },

  // National Web Archives
  {
    id: 'uk-web-archive',
    name: 'UK Web Archive',
    description: 'UK web archive managed by the British Library',
    country: 'United Kingdom',
    flag: '🇬🇧',
    category: 'national',
    tlds: ['.uk', '.co.uk', '.org.uk', '.gov.uk'],
    searchUrl: (url) => `https://www.webarchive.org.uk/ukwa/search?search_location=full_text&text=${encodeURIComponent(url)}`,
    homepage: 'https://www.webarchive.org.uk',
    notes: 'Covers .uk domains and UK-related content',
  },
  {
    id: 'uk-gov-archive',
    name: 'UK Government Web Archive',
    description: 'Archive of UK government websites and publications',
    country: 'United Kingdom',
    flag: '🇬🇧',
    category: 'national',
    tlds: ['.gov.uk'],
    searchUrl: (url) => `https://www.nationalarchives.gov.uk/webarchive/?q=${encodeURIComponent(url)}`,
    homepage: 'https://www.nationalarchives.gov.uk/webarchive/',
  },
  {
    id: 'loc-archive',
    name: 'Library of Congress Web Archive',
    description: 'US Library of Congress web archive collections',
    country: 'USA',
    flag: '🇺🇸',
    category: 'national',
    tlds: ['.gov', '.mil'],
    searchUrl: (url) => `https://www.loc.gov/collections/web-archives/?fo=json&q=${encodeURIComponent(url)}`,
    homepage: 'https://www.loc.gov/web-archives/',
  },
  {
    id: 'nla-archive',
    name: 'National Library of Australia (PANDORA)',
    description: 'Australian web archive including PANDORA and .au domain crawls',
    country: 'Australia',
    flag: '🇦🇺',
    category: 'national',
    tlds: ['.au', '.com.au', '.gov.au', '.org.au'],
    searchUrl: (url) => `https://pandora.nla.gov.au/search.html?q=${encodeURIComponent(url)}`,
    homepage: 'https://pandora.nla.gov.au',
  },
  {
    id: 'bnf-archive',
    name: 'Bibliothèque nationale de France',
    description: 'French national library web archive collections',
    country: 'France',
    flag: '🇫🇷',
    category: 'national',
    tlds: ['.fr'],
    searchUrl: (url) => `https://www.bnf.fr/fr/recherche?query=${encodeURIComponent(url)}`,
    homepage: 'https://www.bnf.fr',
    notes: 'Access archived web content through their digital collections',
  },
  {
    id: 'kb-sweden',
    name: 'National Library of Sweden',
    description: 'Swedish web archive (Kungliga biblioteket)',
    country: 'Sweden',
    flag: '🇸🇪',
    category: 'national',
    tlds: ['.se'],
    searchUrl: (url) => `https://www.kb.se/sok?query=${encodeURIComponent(url)}`,
    homepage: 'https://www.kb.se',
  },
  {
    id: 'dnb-archive',
    name: 'German National Library (DNB)',
    description: 'German web archive from the Deutsche Nationalbibliothek',
    country: 'Germany',
    flag: '🇩🇪',
    category: 'national',
    tlds: ['.de'],
    searchUrl: (url) => `https://www.dnb.de/DE/Themen/W/webarchiv/webarchiv-node.html`,
    homepage: 'https://www.dnb.de',
    notes: 'Web archive accessible through their catalog',
  },
  {
    id: 'nl-netherlands',
    name: 'National Library of the Netherlands (KB)',
    description: 'Dutch national web archive',
    country: 'Netherlands',
    flag: '🇳🇱',
    category: 'national',
    tlds: ['.nl'],
    searchUrl: (url) => `https://www.kb.nl/zoeken?query=${encodeURIComponent(url)}`,
    homepage: 'https://www.kb.nl',
    notes: 'Contains archived .nl websites',
  },
  {
    id: 'nb-norway',
    name: 'National Library of Norway',
    description: 'Norwegian web archive (Nasjonalbiblioteket)',
    country: 'Norway',
    flag: '🇳🇴',
    category: 'national',
    tlds: ['.no'],
    searchUrl: (url) => `https://www.nb.no/search?query=${encodeURIComponent(url)}`,
    homepage: 'https://www.nb.no',
  },
  {
    id: 'ndl-japan',
    name: 'National Diet Library of Japan (WARP)',
    description: 'Japanese web archive (Web Archiving Project)',
    country: 'Japan',
    flag: '🇯🇵',
    category: 'national',
    tlds: ['.jp', '.co.jp', '.go.jp'],
    searchUrl: (url) => `https://warp.da.ndl.go.jp/`,
    homepage: 'https://warp.da.ndl.go.jp/',
    notes: 'Archives Japanese government and political websites',
  },
  {
    id: 'nli-israel',
    name: 'National Library of Israel',
    description: 'Israeli web archive collections',
    country: 'Israel',
    flag: '🇮🇱',
    category: 'national',
    tlds: ['.il'],
    searchUrl: (url) => `https://www.nli.org.il/discover?query=${encodeURIComponent(url)}`,
    homepage: 'https://www.nli.org.il',
  },
  {
    id: 'nlb-singapore',
    name: 'National Library Board Singapore',
    description: 'Singapore web archive (Web Archive Singapore)',
    country: 'Singapore',
    flag: '🇸🇬',
    category: 'national',
    tlds: ['.sg', '.gov.sg'],
    searchUrl: (url) => `https://www.nlb.gov.sg/main/search?query=${encodeURIComponent(url)}`,
    homepage: 'https://www.nlb.gov.sg',
  },
  {
    id: 'nz-archive',
    name: 'National Library of New Zealand',
    description: 'New Zealand Government Web Archive',
    country: 'New Zealand',
    flag: '🇳🇿',
    category: 'national',
    tlds: ['.nz', '.govt.nz', '.co.nz'],
    searchUrl: (url) => `https://natlib.govt.nz/search?query=${encodeURIComponent(url)}`,
    homepage: 'https://natlib.govt.nz',
  },
  {
    id: 'vefsafn-iceland',
    name: 'Icelandic Web Archive (Vefsafn)',
    description: 'National and University Library of Iceland web archive',
    country: 'Iceland',
    flag: '🇮🇸',
    category: 'national',
    tlds: ['.is'],
    searchUrl: (url) => `https://vefsafn.is/`,
    homepage: 'https://vefsafn.is/',
  },
  {
    id: 'bn-poland',
    name: 'National Library of Poland',
    description: 'Polish web archive (Biblioteka Narodowa)',
    country: 'Poland',
    flag: '🇵🇱',
    category: 'national',
    tlds: ['.pl'],
    searchUrl: (url) => `https://www.bn.org.pl/pl/badania-naukowe/web-archiwum.html`,
    homepage: 'https://www.bn.org.pl',
  },
  {
    id: 'nkc-czech',
    name: 'National Library of the Czech Republic',
    description: 'Czech web archive (Webarch)',
    country: 'Czech Republic',
    flag: '🇨🇿',
    category: 'national',
    tlds: ['.cz'],
    searchUrl: (url) => `https://webarchiv.cz/en/search?q=${encodeURIComponent(url)}`,
    homepage: 'https://webarchiv.cz',
  },
  {
    id: 'slu-finland',
    name: 'National Library of Finland',
    description: 'Finnish web archive (Kansalliskirjasto)',
    country: 'Finland',
    flag: '🇫🇮',
    category: 'national',
    tlds: ['.fi'],
    searchUrl: (url) => `https://www.kansalliskirjasto.fi/en/collections/digital-collections/web-archives`,
    homepage: 'https://www.kansalliskirjasto.fi',
  },
  {
    id: 'bac-canada',
    name: 'Library and Archives Canada',
    description: 'Canadian Government Web Archive',
    country: 'Canada',
    flag: '🇨🇦',
    category: 'national',
    tlds: ['.ca', '.gc.ca'],
    searchUrl: (url) => `https://library-archives.canada.ca/eng/collection/search?query=${encodeURIComponent(url)}`,
    homepage: 'https://library-archives.canada.ca',
  },

  // Aggregators & Tools
  {
    id: 'memento',
    name: 'Memento Time Travel',
    description: 'Aggregator searching across 30+ web archives worldwide',
    country: 'International',
    flag: '🌍',
    category: 'aggregators',
    supportsDate: true,
    searchUrl: (url, date) => {
      if (date) {
        return `https://timetravel.mementoweb.org/memento/${date.replace(/-/g, '')}/${url}`;
      }
      return `https://timetravel.mementoweb.org/`;
    },
    homepage: 'https://mementoweb.org',
    notes: 'Aggregator across many archives (may be temporarily unavailable)',
  },
  {
    id: 'common-crawl',
    name: 'Common Crawl',
    description: 'Open repository of web crawl data, multiple petabytes',
    country: 'International',
    flag: '🌍',
    category: 'aggregators',
    searchUrl: (url) => `https://index.commoncrawl.org/?url=${encodeURIComponent(url)}`,
    homepage: 'https://commoncrawl.org',
    notes: 'Massive crawl data, CDX API available for programmatic access',
  },
  {
    id: 'cachedview',
    name: 'CachedView',
    description: 'Search Google, Bing, and Wayback Machine caches at once',
    country: 'International',
    flag: '🌍',
    category: 'aggregators',
    searchUrl: (url) => `https://cachedview.nl/`,
    homepage: 'https://cachedview.nl',
    notes: 'Enter URL manually - aggregates Google Cache, Bing, and Wayback',
  },
  {
    id: 'eot-archive',
    name: 'End of Term Web Archive',
    description: 'Archive of US government websites during presidential transitions',
    country: 'USA',
    flag: '🇺🇸',
    category: 'aggregators',
    tlds: ['.gov', '.mil'],
    searchUrl: (url) => `https://eotarchive.org/search?q=${encodeURIComponent(url)}`,
    homepage: 'https://eotarchive.org',
    notes: 'Partnership between Internet Archive, Library of Congress, and others',
  },
  {
    id: 'gov-archive',
    name: 'Webrecorder US GovArchive',
    description: 'High-fidelity replay of US government web archives',
    country: 'USA',
    flag: '🇺🇸',
    category: 'aggregators',
    tlds: ['.gov', '.mil'],
    searchUrl: (url) => `https://govarchive.us/`,
    homepage: 'https://govarchive.us',
    notes: 'Enter URL to search US government archived pages',
  },

  // Search Engine Caches
  {
    id: 'google-cache',
    name: 'Google URL Search',
    description: 'Search for references to this URL on the live web; not an archive lookup',
    country: 'International',
    flag: '🌍',
    category: 'cache',
    searchUrl: (url) => `https://www.google.com/search?q=${encodeURIComponent(`"${url}"`)}`,
    homepage: 'https://www.google.com',
    instructions: 'Live search for references and snippets. Google no longer provides its former public cache operator.',
  },
  {
    id: 'bing-cache',
    name: 'Bing URL Search',
    description: 'Find live-web references to a URL; does not verify archived copies',
    country: 'International',
    flag: '🌍',
    category: 'cache',
    searchUrl: (url) => `https://www.bing.com/search?q=${encodeURIComponent(`"${url}"`)}`,
    homepage: 'https://www.bing.com',
  },
  {
    id: 'duckduckgo-search',
    name: 'DuckDuckGo URL Search',
    description: 'Find live-web references and snippets for a URL; not a historical page-cache lookup',
    country: 'International',
    flag: '🌍',
    category: 'cache',
    searchUrl: (url) => `https://duckduckgo.com/?q=${encodeURIComponent(`"${url}"`)}`,
    homepage: 'https://duckduckgo.com/',
    instructions: 'Search results are discovery leads. A snippet does not confirm that the full page or file is preserved.',
  },
  {
    id: 'yandex-cache',
    name: 'Yandex URL Search',
    description: 'Search the live web for references to a URL; availability of cached content varies',
    country: 'Russia',
    flag: '🇷🇺',
    category: 'cache',
    tlds: ['.ru', '.su'],
    searchUrl: (url) => `https://yandex.com/search/?text=${encodeURIComponent(url)}`,
    homepage: 'https://yandex.com',
    notes: 'Live search results are discovery leads, not confirmed archive records',
  },

  // Specialized Archives
  {
    id: 'rhizome',
    name: 'Rhizome ArtBase',
    description: 'Archive of new media art and culture',
    country: 'USA',
    flag: '🇺🇸',
    category: 'specialized',
    searchUrl: (url) => `https://rhizome.org/artbase/`,
    homepage: 'https://rhizome.org',
    notes: 'Focuses on born-digital art and internet culture',
  },
  {
    id: 'archive-org-books',
    name: 'Internet Archive (Books & Media)',
    description: 'Digital library of books, audio, video, and software',
    country: 'USA',
    flag: '🇺🇸',
    category: 'specialized',
    searchUrl: (url) => `https://archive.org/search?query=${encodeURIComponent(url)}`,
    homepage: 'https://archive.org',
    notes: 'Search across all Internet Archive collections',
  },
  {
    id: 'tempas',
    name: 'Tempas',
    description: 'Temporal web archive search based on link analysis',
    country: 'Germany',
    flag: '🇩🇪',
    category: 'specialized',
    tlds: ['.de'],
    searchUrl: (url) => `http://tempas.l3s.de/v2/query?q=${encodeURIComponent(url)}`,
    homepage: 'http://tempas.l3s.de/v2',
    notes: 'Searches by keywords across archived German web content',
  },
  {
    id: 'securitytrails',
    name: 'SecurityTrails',
    description: 'Historical DNS records and domain information',
    country: 'International',
    flag: '🌍',
    category: 'specialized',
    searchUrl: (url) => {
      try {
        const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
        return `https://securitytrails.com/domain/${domain}/dns`;
      } catch {
        return `https://securitytrails.com/`;
      }
    },
    homepage: 'https://securitytrails.com',
    notes: 'Shows historical DNS records for domains',
  },
  {
    id: 'shodan',
    name: 'Shodan',
    description: 'Search engine for internet-connected devices and services',
    country: 'International',
    flag: '🌍',
    category: 'specialized',
    searchUrl: (url) => {
      try {
        const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
        return `https://www.shodan.io/search?query=${encodeURIComponent(domain)}`;
      } catch {
        return `https://www.shodan.io/`;
      }
    },
    homepage: 'https://www.shodan.io',
    notes: 'Shows historical server information and open ports',
  },
];
