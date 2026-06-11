-- Link Dump bulk import (19 links).
-- Run in the Supabase SQL editor. Resolves your user_id by email and inserts via
-- the service role (RLS-safe). The app's realtime subscription on `links` will
-- make these appear live in any open /links tab. Titles/summaries were pulled
-- from the app's own /api/fetch-metadata so they match what the add form stores.
--
-- New tags created here: claude, dev, tools, design, ui, inspo, python
-- (existing tags reused where they fit: ai, guide).

insert into links (user_id, url, note, title, summary, tags)
select u.id, v.url, v.note, v.title, v.summary, v.tags
from (select id from auth.users where email = 'deepammck@gmail.com') u
cross join (values
  ('https://github.com/garrytan/gstack',
   'Garry Tan''s exact Claude Code agent setup (23 tools)',
   'GitHub - garrytan/gstack: Use Garry Tan''s exact Claude Code setup: 23 opinionated tools that serve as CEO, Designer, Eng Manager, Release Manager, Doc Engineer, and QA',
   'Use Garry Tan''s exact Claude Code setup: 23 opinionated tools that serve as CEO, Designer, Eng Manager, Release Manager, Doc Engineer, and QA - garrytan/gstack',
   array['claude','dev','tools']),

  ('https://glass3d.dev/',
   '3D glassmorphism CSS generator',
   'Glass3D generator',
   'A modern 3d glassmorphism generator',
   array['design','ui','tools']),

  ('https://60fps.design/',
   'curated UI/UX animation inspiration',
   '60fps - UI/UX animation inspiration for mobile & web apps',
   '60fps is a curated collection of UI/UX animation and interaction design details from the world’s best iOS, and web apps.',
   array['design','ui','inspo']),

  ('https://21st.dev/community/components',
   'community library of copy-paste React components',
   'Discover community-made UI components | 21st',
   'Explore, copy, and remix thousands of high-quality React components published to the 21st.dev Community by designers and developers.',
   array['ui','dev']),

  ('https://www.instagram.com/p/DYd5m1QjKfv/',
   'saved instagram post — add context',
   'Instagram',
   null,
   array['inspo']),

  ('https://github.com/multica-ai/andrej-karpathy-skills/tree/main',
   'CLAUDE.md tuned from Karpathy''s LLM coding pitfalls',
   'GitHub - multica-ai/andrej-karpathy-skills: A single CLAUDE.md file to improve Claude Code behavior, derived from Andrej Karpathy''s observations on LLM coding pitfalls.',
   'A single CLAUDE.md file to improve Claude Code behavior, derived from Andrej Karpathy''s observations on LLM coding pitfalls. - multica-ai/andrej-karpathy-skills',
   array['claude','ai','dev']),

  ('https://www.instagram.com/p/DY4gcNRkseO/',
   'saved instagram post — add context',
   'Instagram',
   null,
   array['inspo']),

  ('https://www.instagram.com/reels/DZAHD52StPQ/',
   'saved instagram reel — add context',
   'Instagram',
   null,
   array['inspo']),

  ('https://www.instagram.com/p/DZC_LU8johF/',
   'saved instagram post — add context',
   'Instagram',
   null,
   array['inspo']),

  ('https://pypi.org/project/yt-dlp/',
   'CLI to download audio/video from youtube and more',
   'yt-dlp',
   'A feature-rich command-line audio/video downloader',
   array['tools','python']),

  ('https://browser-use.com/',
   'open-source browser automation for AI agents',
   'Browser Use - The way AI uses the internet',
   '78,000+ GitHub stars. Trusted by Fortune 500. The #1 open-source browser automation platform.',
   array['ai','tools']),

  ('https://happenstance.ai/',
   'AI search across your network for warm intros',
   'Happenstance | Search your network with AI',
   'AI-powered network search for sales, recruiting, finding a job, fundraising, and more. Find warm intros, discover mutual connections, and research people across LinkedIn, Gmail, Twitter, and other networks.',
   array['ai','tools']),

  ('https://www.ycombinator.com/companies/conductor',
   'YC profile — run a team of coding agents on your mac',
   'Conductor: Run a team of coding agents on your Mac | Y Combinator',
   'Run a team of coding agents on your Mac. Founded in 2024 by Jackson de Campos and Charlie Holtz, Conductor has 6 employees based in San Francisco, CA, USA. Conductor is hiring for 4 roles in engineering and design.',
   array['ai','dev']),

  ('https://www.conductor.build/docs',
   'docs for Conductor (parallel coding agents)',
   'Introduction | Conductor Docs',
   'Learn what Conductor is and where to start in the docs',
   array['ai','dev','claude']),

  ('https://github.com/superbasicstudio/claude-conductor',
   'lightweight Claude Code framework / config generator',
   'GitHub - superbasicstudio/claude-conductor: Claude Conductor - a simple Claude Code framework',
   'Claude Conductor - a simple Claude Code framework. Contribute to superbasicstudio/claude-conductor development by creating an account on GitHub.',
   array['claude','dev']),

  ('https://github.com/Shubhamsaboo/awesome-llm-apps',
   '100+ runnable AI agent and RAG app examples',
   'GitHub - Shubhamsaboo/awesome-llm-apps: 100+ AI Agent & RAG apps you can actually run — clone, customize, ship.',
   '100+ AI Agent & RAG apps you can actually run — clone, customize, ship. - Shubhamsaboo/awesome-llm-apps',
   array['ai','dev']),

  ('https://ui.watermelon.sh/',
   'premium copy-paste React components and dashboards',
   'Watermelon UI — Premium React Components, Dashboards & Blocks',
   'A collection of high-quality React components, dashboards, and UI blocks. Copy and paste production-ready UI with ease.',
   array['ui','dev']),

  ('https://www.cult-ui.com/',
   'open-source shadcn animated components and templates',
   'Cult UI – Shadcn UI Components, Blocks & Templates',
   'Open-source Shadcn UI components, animated blocks, and full templates you can copy-paste into any TypeScript/Next.js project.',
   array['ui','dev']),

  ('https://skiper-ui.com/',
   'uncommon shadcn/ui components via the CLI',
   'Skiper UI - Un-common Components for shadcn/ui',
   'Brand new uncommon components for your Next.js project. Use with ease through shadcn CLI 3.0, featuring fast-growing components and collections that are easy to edit and use.',
   array['ui','dev'])
) as v(url, note, title, summary, tags);
