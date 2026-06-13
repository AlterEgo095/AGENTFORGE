/**
 * ALTER EGO OS — Browser Capability Demo
 *
 * Démonstration réelle : Le Browser Capability cherche
 * sur GitHub les meilleurs projets Agentic AI.
 *
 * Usage: npx tsx src/__tests__/demo-github-search.ts
 */

import { BrowserCapability } from '../index.js';

async function main() {
  console.log('🌐 ALTER EGO OS — Browser Capability Demo');
  console.log('='.repeat(50));
  console.log('');

  const browser = new BrowserCapability({
    headless: true,
    stealth: false,
    defaultTimeout: 20000,
    navigationTimeout: 30000,
  });

  try {
    // 1. Launch
    console.log('🚀 Launching browser...');
    await browser.launch();
    console.log('✅ Browser launched');
    console.log('');

    // 2. Search GitHub
    console.log('🔍 Searching GitHub for "Agentic AI"...');
    const searchResult = await browser.search('Agentic AI', 'github');

    if (searchResult.status === 'success' && searchResult.data) {
      console.log(`✅ Found ${searchResult.data.results.length} results`);
      console.log('');

      // 3. Display results
      console.log('📊 Top Results:');
      console.log('-'.repeat(50));
      for (const item of searchResult.data.results.slice(0, 10)) {
        console.log(`  ${item.position}. ${item.title}`);
        console.log(`     🔗 ${item.url}`);
        if (item.snippet) {
          console.log(`     📝 ${item.snippet.substring(0, 100)}...`);
        }
        console.log('');
      }
    } else {
      console.log('❌ Search failed:', searchResult.error);
    }

    // 4. Try DuckDuckGo as fallback
    console.log('');
    console.log('🔍 Searching DuckDuckGo for "Agentic AI frameworks 2026"...');
    const ddgResult = await browser.search('Agentic AI frameworks 2026', 'duckduckgo');

    if (ddgResult.status === 'success' && ddgResult.data) {
      console.log(`✅ Found ${ddgResult.data.results.length} results`);
      console.log('');

      console.log('📊 Top Results:');
      console.log('-'.repeat(50));
      for (const item of ddgResult.data.results.slice(0, 5)) {
        console.log(`  ${item.position}. ${item.title}`);
        console.log(`     🔗 ${item.url}`);
        if (item.snippet) {
          console.log(`     📝 ${item.snippet.substring(0, 120)}...`);
        }
        console.log('');
      }
    }

    // 5. Navigate to a specific repo
    if (searchResult.data?.results[0]?.url) {
      const repoUrl = searchResult.data.results[0].url;
      console.log('');
      console.log(`📖 Opening top result: ${repoUrl}`);
      const openResult = await browser.open(repoUrl);

      if (openResult.status === 'success') {
        const content = await browser.extractPageContent();
        if (content.status === 'success' && content.data) {
          console.log(`✅ Page: ${content.data.title}`);
          console.log(`   Description: ${content.data.meta.description ?? 'N/A'}`);
          console.log(`   Links on page: ${content.data.links.length}`);
          console.log(`   Images on page: ${content.data.images.length}`);

          // Save to browser memory
          await browser.getMemory().addBookmark(repoUrl, content.data.title, ['agentic-ai', 'github']);
        }
      }
    }

    // 6. Show browser memory
    console.log('');
    console.log('📚 Browser Memory:');
    console.log('-'.repeat(50));
    const history = await browser.getMemory().getHistory(5);
    console.log(`   History entries: ${history.length}`);
    for (const entry of history) {
      console.log(`   - ${entry.title}: ${entry.url}`);
    }

    const bookmarks = await browser.getMemory().getBookmarks();
    console.log(`   Bookmarks: ${bookmarks.length}`);
    for (const bm of bookmarks) {
      console.log(`   - [${bm.tags.join(',')}] ${bm.title}: ${bm.url}`);
    }

    console.log('');
    console.log('='.repeat(50));
    console.log('✅ Demo completed successfully!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
}

main().catch(console.error);
