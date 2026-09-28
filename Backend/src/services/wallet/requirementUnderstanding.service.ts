import { SearchIntent, RequirementProfile } from '../../types';

/**
 * Requirement Understanding Service — Pipeline Step 2
 * Normalizes SearchIntent into an explicit RequirementProfile without over-inferring narrow domains.
 */
export class RequirementUnderstandingService {
  /**
   * Builds a normalized RequirementProfile from a parsed SearchIntent.
   */
  public static buildProfile(intent: SearchIntent): RequirementProfile {
    return this.buildRequirementProfile(intent);
  }

  public static buildRequirementProfile(intent: SearchIntent): RequirementProfile {
    const goal = intent.primaryGoal || intent.originalQuery;

    // Workflow construction from explicit/inferred tasks
    const workflow: string[] = intent.tasks.length > 0
      ? intent.tasks
      : [goal];

    // Capabilities required
    const requiredCapabilities = Array.from(new Set(intent.requiredCapabilities || []));
    const optionalCapabilities = Array.from(new Set(intent.optionalCapabilities || []));

    // Determine domain specificity & domain
    let primaryDomain = 'Research & Knowledge';
    let domainSpecificity: RequirementProfile['domainSpecificity'] = 'unspecified';

    if (intent.domain && intent.domain.length > 0 && !intent.domain.includes('General')) {
      primaryDomain = intent.domain[0];
      domainSpecificity = intent.domainConfidence >= 0.90 ? 'explicit' : (intent.domainConfidence >= 0.75 && intent.specificity !== 'broad' ? 'inferred' : 'unspecified');
    } else {
      primaryDomain = 'General';
      domainSpecificity = 'unspecified';
    }

    // Determine output expectation
    let desiredOutput = 'Structured AI solution';
    if (intent.outputTypes && intent.outputTypes.length > 0) {
      desiredOutput = intent.outputTypes.join(', ');
    } else if (goal.toLowerCase().includes('document') || goal.toLowerCase().includes('report') || goal.toLowerCase().includes('paper')) {
      desiredOutput = 'Structured Research Document';
    } else if (goal.toLowerCase().includes('presentation') || goal.toLowerCase().includes('deck') || goal.toLowerCase().includes('slide')) {
      desiredOutput = 'Interactive Slide Deck / Presentation';
    } else if (goal.toLowerCase().includes('chart') || goal.toLowerCase().includes('graph') || goal.toLowerCase().includes('visual')) {
      desiredOutput = 'Data Visualizations & Charts';
    } else if (goal.toLowerCase().includes('video')) {
      desiredOutput = 'AI Generated Video';
    }

    // Ambiguity level
    let ambiguityLevel: RequirementProfile['ambiguityLevel'] = 'none';
    if (intent.ambiguity.isAmbiguous) {
      ambiguityLevel = intent.specificity === 'broad' ? 'moderate' : 'low';
    } else if (intent.specificity === 'broad') {
      ambiguityLevel = 'low';
    }

    return {
      goal,
      workflow,
      requiredCapabilities,
      optionalCapabilities,
      desiredOutput,
      domain: primaryDomain,
      domainSpecificity,
      constraints: intent.constraints || {},
      ambiguityLevel,
      knownTools: intent.knownTools || []
    };
  }
}
