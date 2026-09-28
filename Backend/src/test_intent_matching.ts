import { SearchIntentService } from './services/wallet/searchIntent.service';
import { RequirementUnderstandingService } from './services/wallet/requirementUnderstanding.service';
import { ToolMatchingService } from './services/wallet/toolMatching.service';
import { ToolCatalogService } from './services/wallet/toolCatalog.service';

function runTests() {
  console.log('====================================================');
  console.log('AINOVA SEARCH INTENT & REQUIREMENT MATCHING BENCHMARK');
  console.log('====================================================\n');

  // Initialize tool catalog
  ToolCatalogService.initializeCatalog();

  const testCases = [
    {
      id: 1,
      query: 'for research document making',
      assert: (intent: any, profile: any, results: any) => {
        const notClinical = !intent.tasks.some((t: string) => t.toLowerCase().includes('clinical'));
        const isResearchDoc = profile.goal.toLowerCase().includes('research document') || intent.primaryGoal.toLowerCase().includes('research document');
        const notMedicalDomain = !profile.domain.toLowerCase().includes('health');
        return isResearchDoc && notClinical && notMedicalDomain;
      },
      description: 'Goal: Research Document Creation | NOT clinical document summarization'
    },
    {
      id: 2,
      query: 'find AI tools for academic research',
      assert: (intent: any, profile: any, results: any) => {
        return profile.domain.toLowerCase().includes('education') || intent.domain.some((d: string) => d.toLowerCase().includes('education'));
      },
      description: 'Research + Academic context'
    },
    {
      id: 3,
      query: 'research market trends and create a report',
      assert: (intent: any, profile: any, results: any) => {
        return profile.goal.toLowerCase().includes('research') && profile.workflow.some((w: string) => w.toLowerCase().includes('report') || w.toLowerCase().includes('analysis'));
      },
      description: 'Market Research + Analysis + Report Generation'
    },
    {
      id: 4,
      query: 'understand a 100 page PDF',
      assert: (intent: any, profile: any, results: any) => {
        const isDocUnderstand = profile.goal.toLowerCase().includes('document') || intent.tasks.some((t: string) => t.toLowerCase().includes('document'));
        return isDocUnderstand;
      },
      description: 'Document Understanding | NOT research'
    },
    {
      id: 5,
      query: 'make a presentation from my research',
      assert: (intent: any, profile: any, results: any) => {
        const hasPres = profile.workflow.some((w: string) => w.toLowerCase().includes('presentation') || w.toLowerCase().includes('slide'));
        return hasPres;
      },
      description: 'Research synthesis + Presentation generation'
    },
    {
      id: 6,
      query: 'analyze my CSV and create charts',
      assert: (intent: any, profile: any, results: any) => {
        const hasData = profile.workflow.some((w: string) => w.toLowerCase().includes('data') || w.toLowerCase().includes('chart') || w.toLowerCase().includes('analysis'));
        return hasData;
      },
      description: 'Data Analysis + Visualization'
    },
    {
      id: 7,
      query: 'free AI tool for video creation',
      assert: (intent: any, profile: any, results: any) => {
        return intent.constraints.freeOnly === true && profile.goal.toLowerCase().includes('video');
      },
      description: 'Video Generation + free constraint'
    },
    {
      id: 8,
      query: 'something like ChatGPT but for research',
      assert: (intent: any, profile: any, results: any) => {
        return intent.comparisonIntent?.type === 'alternative' && intent.knownTools.includes('chatgpt');
      },
      description: 'Alternative-to-known-tool intent + research requirement'
    },
    {
      id: 9,
      query: 'I want to research AI agents, summarize papers, and create a presentation',
      assert: (intent: any, profile: any, results: any) => {
        return intent.tasks.length >= 2 && profile.workflow.length >= 2;
      },
      description: 'Multi-intent workflow'
    },
    {
      id: 10,
      query: 'research',
      assert: (intent: any, profile: any, results: any) => {
        return profile.goal.toLowerCase().includes('research') && profile.domainSpecificity === 'unspecified';
      },
      description: 'Broad research intent | No fabricated subdomain'
    },
    {
      id: 11,
      query: 'medical research report',
      assert: (intent: any, profile: any, results: any) => {
        return intent.domain.some((d: string) => d.toLowerCase().includes('health')) || profile.domain.toLowerCase().includes('health');
      },
      description: 'Medical/health domain because user explicitly provided it'
    },
    {
      id: 12,
      query: 'legal research document',
      assert: (intent: any, profile: any, results: any) => {
        return intent.domain.some((d: string) => d.toLowerCase().includes('legal')) || profile.domain.toLowerCase().includes('legal');
      },
      description: 'Legal research because user explicitly provided legal context'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    console.log(`Test #${tc.id}: "${tc.query}"`);
    console.log(`Expected: ${tc.description}`);

    const intent = SearchIntentService.extractIntent(tc.query);
    const profile = RequirementUnderstandingService.buildRequirementProfile(intent);
    const searchResults = ToolMatchingService.searchTools(tc.query);

    const ok = tc.assert(intent, profile, searchResults);

    if (ok) {
      console.log(`✅ PASSED`);
      console.log(`   Goal: "${profile.goal}" | Domain: "${profile.domain}"`);
      console.log(`   Top match: ${searchResults.matches[0]?.tool.name || 'None'} (${searchResults.matches[0]?.matchScore || 0}% - ${searchResults.matches[0]?.matchLabel || 'N/A'})\n`);
      passed++;
    } else {
      console.log(`❌ FAILED`);
      console.log(`   Goal: "${profile.goal}" | Domain: "${profile.domain}"`);
      console.log(`   Tasks: ${JSON.stringify(intent.tasks)}\n`);
      failed++;
    }
  }

  console.log('----------------------------------------------------');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED (${testCases.length} total)`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
