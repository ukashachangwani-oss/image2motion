IMAGE2MOTION AI  -  Website + Daily Blog System
=================================================

FOLDERS
  static/            Pages: index.html (tool), guides/, admin/, robots.txt, Google verification file
  posts/             YOUR BLOG POSTS (one .md file per post)  <-- add a file here every day
  api/generate.js    Tool backend (image -> motion plan)
  api/draft.js       AI blog-draft writer (used by /admin/)
  build.js           Builds the site: blog pages, blog index, RSS, sitemap, latest posts on homepage
  site.json          Your domain + site name
  vercel.json        Tells Vercel to run the build

ONE-TIME SETUP (Vercel)
  1. Put your real domain in site.json  ("siteUrl": "https://yourdomain.com")
     (or set an env variable SITE_URL in Vercel instead).
  2. Vercel -> Settings -> Environment Variables:
       ANTHROPIC_API_KEY  = your key                (required)
       ADMIN_CODE         = a strong password       (needed for /admin/ draft writer)
       DAILY_LIMIT        = 5                       (optional, tool uses per visitor per day)
       ACCESS_CODE        = ...                     (optional, makes the tool private)
       CLAUDE_MODEL       = claude-sonnet-5-5       (optional)
  3. Redeploy. Do NOT enable "cleanUrls" (it breaks the Google verification file).
  4. Search Console: submit  https://yourdomain.com/sitemap.xml  once.
     New posts are added to the sitemap automatically.

DAILY POSTING WORKFLOW
  Option A - with AI help:
    1. Open  https://yourdomain.com/admin/  and enter ADMIN_CODE.
    2. Type a topic, click "Generate draft".
    3. READ and EDIT the draft (add your own examples, tips, screenshots).
    4. GitHub -> posts folder -> Add file -> Create new file. Paste the file name and the text. Commit.
    5. Vercel rebuilds automatically; the post is live in about a minute.

  Option B - write it yourself:
    Copy posts/_TEMPLATE.md, rename it like  2026-10-21-my-post-title.md, edit, commit.

  Post format (top of every file):
    ---
    title: Your title (under 65 characters)
    date: 2026-10-21
    description: 140-155 character summary for Google
    tags: tag one, tag two
    ---
    Then your text in Markdown (## headings, - lists, **bold**, [links](/), > quotes).

  Extras:
    - Future date  = scheduled: it appears on the first deploy on/after that date.
    - draft: true  = hidden.
    - Files starting with _ are ignored.
    - Every post gets its own page, blog index entry, RSS entry, sitemap entry and homepage "Latest" link.

QUALITY TIP FOR GOOGLE
  Google rewards helpful, original content. Do not publish raw AI drafts unchanged:
  add real experience, your own prompt tests and examples. 1 good post/day beats low-quality filler.
