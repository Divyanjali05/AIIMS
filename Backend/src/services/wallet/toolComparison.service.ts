import { AITool, RequirementToolComparison, ComparisonCriterion } from '../../types';
import { ToolCatalogService } from './toolCatalog.service';

/**
 * Tool Comparison Service — Requirement-First Dynamic Tool Comparison Engine
 * Evaluates 2–4 selected tools against a specific user requirement or domain task.
 * Dynamically selects comparison criteria tailored to the domain (Research, Coding, Video, Data, Presentation, etc.).
 * Delivers neutral synthesis, scenario suitability, trade-off analysis, and pricing comparison.
 */
export class ToolComparisonService {
  public static compareToolsForRequirement(
    toolIds: string[],
    userRequirement?: string
  ): RequirementToolComparison {
    const catalog = ToolCatalogService.getCatalog();
    const selectedTools: AITool[] = [];

    for (const id of toolIds) {
      const tool = catalog.find(t => t.id === id || t.id.toLowerCase() === id.toLowerCase());
      if (tool) selectedTools.push(tool);
    }

    if (selectedTools.length === 0) {
      throw new Error('No valid tools provided for comparison.');
    }

    const primaryCategory = selectedTools[0].category;
    const taskDomain = selectedTools[0].domains[0] || 'General AI Workflows';

    const criteria = this.generateCriteriaForDomain(primaryCategory, selectedTools);

    const fitAnalysis: RequirementToolComparison['fitAnalysis'] = {};
    for (const tool of selectedTools) {
      fitAnalysis[tool.id] = {
        whyItFits: `Provides ${tool.capabilities.slice(0, 2).join(' and ')} tailored for ${tool.category} tasks.`,
        bestSuitedScenario: tool.useCases[0] || `Ideal for ${tool.relevantRoles?.join(' or ') || 'professionals'}.`,
        keyTradeoff: tool.limitations[0] || `Requires ${tool.pricingDetails.summary}.`
      };
    }

    const toolNames = selectedTools.map(t => t.name).join(', ');
    const overallSynthesis = userRequirement
      ? `For your task ("${userRequirement}"), ${selectedTools[0].name} provides strong ${selectedTools[0].capabilities[0] || 'capabilities'}, while ${selectedTools[1]?.name || 'alternative tools'} offer distinct trade-offs in ${selectedTools[1]?.strengths[0] || 'features'}. Choose based on whether your priority is ${selectedTools[0].strengths[0]} or ${selectedTools[1]?.strengths[0] || 'flexibility'}.`
      : `Comparing ${toolNames}: Each tool excels in specific sub-workflows. Review the dynamic criteria below to select the option best aligned with your needs.`;

    return {
      userRequirement,
      taskDomain,
      tools: selectedTools,
      comparisonCriteria: criteria,
      fitAnalysis,
      overallSynthesis
    };
  }

  private static generateCriteriaForDomain(category: string, tools: AITool[]): ComparisonCriterion[] {
    const criteria: ComparisonCriterion[] = [];

    if (category === 'Research & RAG') {
      criteria.push({
        criterion: 'Document & PDF Handling',
        importance: 'High',
        evaluations: this.evalMap(tools, t => t.capabilities.some(c => c.toLowerCase().includes('pdf') || c.toLowerCase().includes('document')) ? 'Full document ingestion & vector search' : 'Standard text prompt context')
      });
      criteria.push({
        criterion: 'Live Web Citation & Verification',
        importance: 'High',
        evaluations: this.evalMap(tools, t => t.capabilities.some(c => c.toLowerCase().includes('citation') || c.toLowerCase().includes('web')) ? 'Verifiable URL sources attached to every claim' : 'Internal model knowledge')
      });
      criteria.push({
        criterion: 'Audio & Multi-modal Overview',
        importance: 'Medium',
        evaluations: this.evalMap(tools, t => t.capabilities.some(c => c.toLowerCase().includes('audio') || c.toLowerCase().includes('podcast')) ? '2-person podcast audio discussion synthesis' : 'Text-based summaries')
      });
    } else if (category === 'Agentic Coding') {
      criteria.push({
        criterion: 'Workspace Codebase Indexing',
        importance: 'High',
        evaluations: this.evalMap(tools, t => t.capabilities.some(c => c.toLowerCase().includes('indexing') || c.toLowerCase().includes('workspace')) ? 'Full repository indexing and semantic code lookup' : 'Single-file code snippets')
      });
      criteria.push({
        criterion: 'Multi-file Agent Composer',
        importance: 'High',
        evaluations: this.evalMap(tools, t => t.capabilities.some(c => c.toLowerCase().includes('composer') || c.toLowerCase().includes('multi-file')) ? 'Drafts diffs across multiple files simultaneously' : 'Single-file inline code edits')
      });
      criteria.push({
        criterion: 'Terminal Error Debugging Loop',
        importance: 'Medium',
        evaluations: this.evalMap(tools, t => t.capabilities.some(c => c.toLowerCase().includes('terminal') || c.toLowerCase().includes('error')) ? 'Parses terminal tracebacks and suggests patches' : 'Manual copy-paste stack traces')
      });
    } else if (category === 'Data Analysis') {
      criteria.push({
        criterion: 'Python Sandbox Code Execution',
        importance: 'High',
        evaluations: this.evalMap(tools, t => t.capabilities.some(c => c.toLowerCase().includes('python') || c.toLowerCase().includes('sandbox')) ? 'Executes live Python code in sandbox' : 'Generates Python code for manual copy')
      });
      criteria.push({
        criterion: 'Interactive Chart Export',
        importance: 'High',
        evaluations: this.evalMap(tools, t => t.capabilities.some(c => c.toLowerCase().includes('chart') || c.toLowerCase().includes('plot')) ? 'Renders downloadable PNG/SVG charts' : 'Textual table output')
      });
    } else {
      // Default domain criteria
      criteria.push({
        criterion: 'Core Capability Specialization',
        importance: 'High',
        evaluations: this.evalMap(tools, t => t.capabilities.slice(0, 2).join(', '))
      });
      criteria.push({
        criterion: 'Free Tier & Trial Availability',
        importance: 'High',
        evaluations: this.evalMap(tools, t => t.pricingDetails.summary)
      });
      criteria.push({
        criterion: 'Primary Limitation / Trade-off',
        importance: 'Medium',
        evaluations: this.evalMap(tools, t => t.limitations[0] || 'None reported')
      });
    }

    // Always include Pricing & Free Tier comparison
    criteria.push({
      criterion: 'Pricing & Free Availability',
      importance: 'High',
      evaluations: this.evalMap(tools, t => `${t.pricingDetails.type} (${t.pricingDetails.summary})`)
    });

    return criteria;
  }

  private static evalMap(tools: AITool[], fn: (t: AITool) => string): Record<string, string> {
    const res: Record<string, string> = {};
    for (const t of tools) {
      res[t.id] = fn(t);
    }
    return res;
  }
}
