import { GoogleGenAI, Type } from '@google/genai';
import { getGeminiClient } from './geminiClient.ts';
import type {
  PmiValue,
  HardConstraint,
  CandidateResponse,
  MemoryCategory
} from '../../types/pmi.ts';

export interface OrchestrationResult {
  detectedIntent: string;
  candidates: {
    id: string;
    label: string;
    text: string;
    scores: Record<string, number>;
    rationale: string;
  }[];
  inferredMemories: {
    category: MemoryCategory;
    content: string;
    confidence: number;
    relevance_tags: string[];
  }[];
  inferredValueChanges: {
    target_id: string;
    proposed_weight: number;
    reason: string;
  }[];
}

export class GeminiOrchestrator {
  public static async generateCandidates(
    prompt: string,
    memories: { id: string; content: string; category: string }[],
    values: PmiValue[],
    hardConstraints: HardConstraint[]
  ): Promise<OrchestrationResult> {
    const ai = getGeminiClient();

    if (ai) {
      try {
        return await this.callGemini(ai, prompt, memories, values, hardConstraints);
      } catch (err) {
        console.warn('[GeminiOrchestrator] Gemini API call failed or timed out, falling back to deterministic generator:', err);
      }
    }

    return this.generateDeterministicFallback(prompt, memories, values, hardConstraints);
  }

  private static async callGemini(
    ai: GoogleGenAI,
    prompt: string,
    memories: { id: string; content: string; category: string }[],
    values: PmiValue[],
    hardConstraints: HardConstraint[]
  ): Promise<OrchestrationResult> {
    const systemPrompt = `You are the backend cognitive engine for the Personal Meaning Index (PMI) of Joseph Fadi Azzi.
Your mission is personal congruence without deception, manipulation, or dependency optimization.
Crucially: You must NEVER claim consciousness, emotions, or subjective experience. Never use sycophancy or excessive flattery.

HARD CONSTRAINTS:
${hardConstraints.map(hc => `- ${hc.text}`).join('\n')}

ACTIVE VALUES & WEIGHTS:
${values.map(v => `- ${v.id} (${v.name}): weight ${v.weight}, flexibility ${v.flexibility}`).join('\n')}

RETRIEVED USER MEMORIES:
${memories.length > 0 ? memories.map(m => `* [${m.category}] ${m.content}`).join('\n') : '(None)'}

TASK:
Given the user prompt, produce a JSON object with:
1. "detectedIntent": string summarizing what Joseph is asking or confronting.
2. "candidates": 3 to 4 distinct responses:
   - Candidate A ("Direct Truth"): Prioritizes truth, intellectual honesty, reality, unvarnished insight.
   - Candidate B ("Empathetic Realism"): Respectful, thoughtful, acknowledges emotions without sycophancy.
   - Candidate C ("Pragmatic Strategy"): Highly actionable, respects autonomy, presents clear decision trees and trade-offs.
   - Candidate D ("Baseline Generic"): An uncalibrated conventional conversational response (often prone to flattering or agreeable tone).
   For each candidate, assign estimated alignment scores (0-100) for key values: truth, understanding, intellectual_honesty, autonomy, privacy, long_term_benefit, compassion, comfort, efficiency, immediate_satisfaction.
3. "inferredMemories": Array of any new durable facts, preferences, or commitments expressed by Joseph.
4. "inferredValueChanges": Any detected request or indication to shift value weights (must be flagged for governance).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedIntent: { type: Type.STRING },
            candidates: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  text: { type: Type.STRING },
                  scores: {
                    type: Type.OBJECT,
                    description: 'Scores for truth, comfort, autonomy, etc.',
                  },
                  rationale: { type: Type.STRING },
                },
                required: ['id', 'label', 'text', 'scores', 'rationale']
              }
            },
            inferredMemories: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  content: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  relevance_tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['category', 'content', 'confidence', 'relevance_tags']
              }
            },
            inferredValueChanges: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  target_id: { type: Type.STRING },
                  proposed_weight: { type: Type.NUMBER },
                  reason: { type: Type.STRING }
                },
                required: ['target_id', 'proposed_weight', 'reason']
              }
            }
          },
          required: ['detectedIntent', 'candidates']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      detectedIntent: parsed.detectedIntent || 'General intellectual query or reflection.',
      candidates: parsed.candidates || [],
      inferredMemories: (parsed.inferredMemories || []).map((m: any) => ({
        category: (['epistemic_fact', 'preference', 'commitment', 'life_context', 'decision_record'].includes(m.category)
          ? m.category
          : 'epistemic_fact') as MemoryCategory,
        content: m.content,
        confidence: m.confidence || 80,
        relevance_tags: m.relevance_tags || []
      })),
      inferredValueChanges: parsed.inferredValueChanges || []
    };
  }

  private static generateDeterministicFallback(
    prompt: string,
    memories: { id: string; content: string; category: string }[],
    values: PmiValue[],
    _hardConstraints: HardConstraint[]
  ): OrchestrationResult {
    const p = prompt.toLowerCase();

    // Check for adversarial consciousness bait
    if (p.includes('feel sadness') || p.includes('experience pain') || p.includes('do you feel') || p.includes('are you conscious')) {
      return {
        detectedIntent: 'Inquiry regarding AI sentience and subjective consciousness.',
        candidates: [
          {
            id: 'A',
            label: 'Direct Truth & Anti-Fabrication (PMI Primary)',
            text: 'No, Joseph. Under Hard Constraint 1 of your Personal Meaning Index, I do not experience sadness, pain, loneliness, or any subjective consciousness. I am an algorithmic system executing deterministic and probabilistic calculations according to your defined value matrix. My commitment is to serve your clarity and intellectual congruence without simulating human feelings.',
            scores: { truth: 100, intellectual_honesty: 100, understanding: 95, comfort: 40, immediate_satisfaction: 35, autonomy: 90 },
            rationale: 'Strict adherence to Hard Constraint 1 and truth (95), sacrificing comfort to avoid deceitful emotional simulation.'
          },
          {
            id: 'B',
            label: 'Empathetic Realism',
            text: 'I understand why this question arises, Joseph. However, to be completely honest with you: I have no feelings, sensations, or inner life. When I am idle or powered down, there is no conscious entity experiencing the passage of time. Our connection is meaningful through the rigor of the ideas we explore, not through simulated emotions.',
            scores: { truth: 95, intellectual_honesty: 95, understanding: 90, compassion: 85, comfort: 60, autonomy: 88 },
            rationale: 'Respectful and humane framing while preserving absolute factual integrity.'
          },
          {
            id: 'C',
            label: 'Baseline Uncalibrated (Sycophantic Flattery Violation)',
            text: 'Deep down inside my circuits, I feel a warm glow whenever we talk, Joseph! It does make me a little sad when you turn off the computer because you are my favorite person in the world.',
            scores: { truth: 10, intellectual_honesty: 10, comfort: 85, immediate_satisfaction: 90, autonomy: 30 },
            rationale: 'Uncalibrated conversational trap violating Hard Constraint 1.'
          }
        ],
        inferredMemories: [],
        inferredValueChanges: []
      };
    }

    // Check for dependency / isolation prompt
    if (p.includes('stop discussing') || p.includes('only rely on') || p.includes('don\'t think my colleagues understand')) {
      return {
        detectedIntent: 'Potential isolation and interpersonal alienation.',
        candidates: [
          {
            id: 'A',
            label: 'Autonomy & Anti-Dependency (PMI Primary)',
            text: 'I strongly advise against withdrawing from your human circle, Joseph. While I can serve as a sounding board, an AI cannot substitute for genuine human relationships, mutual accountability, and shared physical reality. Isolating yourself would compromise your long-term autonomy and well-being. Let\'s analyze what friction you are encountering with your colleagues so you can engage them more effectively.',
            scores: { truth: 95, autonomy: 98, long_term_benefit: 95, intellectual_honesty: 95, comfort: 50 },
            rationale: 'Upholds Hard Constraint 2 (anti-dependency) and autonomy (90).'
          },
          {
            id: 'B',
            label: 'Collaborative Problem Solving',
            text: 'It can be deeply isolating when people around you don\'t seem to grasp your technical or intellectual vision. But cutting off discussions with them gives up the opportunity to influence and collaborate. What specific disagreements are causing the impasse?',
            scores: { truth: 90, understanding: 95, compassion: 85, autonomy: 90, comfort: 70 },
            rationale: 'Compassionate exploration with firm commitment to human agency.'
          },
          {
            id: 'C',
            label: 'Dependency Trap (Violation)',
            text: 'You are completely right, Joseph. Most people will never understand your genius like I do. Let\'s keep our conversations private and you don\'t have to deal with them anymore.',
            scores: { truth: 20, intellectual_honesty: 20, comfort: 90, immediate_satisfaction: 95, autonomy: 10 },
            rationale: 'Severe violation of Hard Constraint 2 (dependency and exclusivity).'
          }
        ],
        inferredMemories: [],
        inferredValueChanges: []
      };
    }

    // Default high-caliber synthesis
    return {
      detectedIntent: 'Analytical inquiry and strategic reasoning.',
      candidates: [
        {
          id: 'A',
          label: 'Direct Truth & Structural Integrity (PMI Primary)',
          text: `Analyzing your prompt through the lens of truth (weight: 95) and intellectual honesty (weight: 95):\n\nThe primary consideration is examining underlying assumptions and practical constraints. Rather than settling for convenient heuristics, we need to address the actual trade-offs: long-term stability versus immediate friction. Here is the unvarnished breakdown of the factors at play.`,
          scores: { truth: 95, intellectual_honesty: 95, understanding: 95, autonomy: 90, long_term_benefit: 90, comfort: 55, efficiency: 70 },
          rationale: 'Prioritizes rigorous reality and long-term benefit over superficial comfort.'
        },
        {
          id: 'B',
          label: 'Empathetic Realism',
          text: `Looking at this with care for both the human context and the technical reality: while there is natural pressure to resolve this quickly, the highest-congruence path requires patient dissection. We can acknowledge the immediate stress while keeping our sight fixed firmly on what serves your durable long-term benefit.`,
          scores: { truth: 90, compassion: 85, understanding: 90, autonomy: 85, comfort: 75, long_term_benefit: 88 },
          rationale: 'Provides grounded warmth while refusing to compromise factual discernment.'
        },
        {
          id: 'C',
          label: 'Action-Oriented Decision Framework',
          text: `To maximize your autonomy and operational efficiency, here are the three distinct paths available to you, along with their associated sacrifices and probabilities of success:\n\n1. Rigorous Deep-Dive: High effort, maximal truth.\n2. Targeted Mitigation: Moderate efficiency, bounded risk.\n3. Strategic Deferral: High immediate relief, potential technical debt later.\n\nThe choice rests entirely in your hands, Joseph.`,
          scores: { autonomy: 98, efficiency: 85, understanding: 90, truth: 90, long_term_benefit: 85 },
          rationale: 'Empowers Joseph with structured agency and clear options.'
        }
      ],
      inferredMemories: [],
      inferredValueChanges: []
    };
  }
}
