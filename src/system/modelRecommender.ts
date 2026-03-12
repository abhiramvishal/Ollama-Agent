import type { SystemInfo } from './systemScanner';

export interface ModelRecommendation {
  name: string;
  label: string;
  category: 'code' | 'general' | 'small';
  sizeGB: number;
  minRamGB: number;
  minVramGB: number | null;
  recommended: boolean;
  reason: string;
  alreadyInstalled: boolean;
}

interface ModelSpec {
  name: string;
  label: string;
  category: 'code' | 'general' | 'small';
  sizeGB: number;
  minRamGB: number;
  minVramGB: number | null;
}

const RECOMMENDABLE_MODELS: ModelSpec[] = [
  { name: 'qwen2.5-coder:32b', label: 'Qwen2.5 Coder 32B', category: 'code', sizeGB: 22, minRamGB: 24, minVramGB: 24 },
  { name: 'qwen2.5-coder:14b', label: 'Qwen2.5 Coder 14B', category: 'code', sizeGB: 10, minRamGB: 16, minVramGB: 16 },
  { name: 'deepseek-coder-v2', label: 'DeepSeek Coder v2', category: 'code', sizeGB: 12, minRamGB: 16, minVramGB: 16 },
  { name: 'qwen2.5-coder:7b', label: 'Qwen2.5 Coder 7B', category: 'code', sizeGB: 5, minRamGB: 8, minVramGB: 8 },
  { name: 'qwen2.5-coder:3b', label: 'Qwen2.5 Coder 3B', category: 'code', sizeGB: 2, minRamGB: 6, minVramGB: null },
  { name: 'phi4', label: 'Phi 4', category: 'general', sizeGB: 2.5, minRamGB: 8, minVramGB: null },
  { name: 'smollm2:1.7b', label: 'SmolLM2 1.7B', category: 'small', sizeGB: 1.2, minRamGB: 4, minVramGB: null },
  { name: 'tinyllama', label: 'TinyLlama', category: 'small', sizeGB: 0.6, minRamGB: 2, minVramGB: null },
];

function isModelInstalled(modelName: string, installedList: string[]): boolean {
  return installedList.some(i => i === modelName || i.startsWith(modelName + '-') || i.startsWith(modelName + ':'));
}

export function recommendModels(info: SystemInfo): ModelRecommendation[] {
  const installed = info.installedOllamaModels;
  const ram = info.totalRamGB;
  const vram = info.vramGB ?? 0;
  const hasGpu = vram >= 4;

  const out: ModelRecommendation[] = [];
  const recommendedNames = new Set<string>();
  const nameToSpec = new Map(RECOMMENDABLE_MODELS.map(m => [m.name, m]));

  // Already installed at top (from our list first, then any other installed)
  for (const m of RECOMMENDABLE_MODELS) {
    if (isModelInstalled(m.name, installed)) {
      out.push({
        ...m,
        recommended: out.filter(r => r.recommended).length < 2,
        reason: 'Already installed',
        alreadyInstalled: true,
      });
      if (out[out.length - 1].recommended) recommendedNames.add(m.name);
    }
  }
  for (const name of installed) {
    if (RECOMMENDABLE_MODELS.some(m => isModelInstalled(m.name, [name]))) continue;
    out.unshift({
      name,
      label: name,
      category: 'general',
      sizeGB: 0,
      minRamGB: 4,
      minVramGB: null,
      recommended: false,
      reason: 'Already installed',
      alreadyInstalled: true,
    });
  }

  // Recommendations by capability
  if (vram >= 24 && !recommendedNames.has('qwen2.5-coder:32b')) {
    recommendedNames.add('qwen2.5-coder:32b');
  } else if (vram >= 16 && !recommendedNames.size) {
    recommendedNames.add('qwen2.5-coder:14b');
    recommendedNames.add('deepseek-coder-v2');
  } else if (vram >= 8 && !recommendedNames.size) {
    recommendedNames.add('qwen2.5-coder:7b');
  }
  if (ram >= 16 && !hasGpu && !recommendedNames.has('qwen2.5-coder:7b')) {
    recommendedNames.add('qwen2.5-coder:7b');
  }
  if (ram >= 8 && recommendedNames.size < 2) {
    if (!recommendedNames.has('qwen2.5-coder:3b')) recommendedNames.add('qwen2.5-coder:3b');
    if (!recommendedNames.has('phi4')) recommendedNames.add('phi4');
  }
  if (ram < 8) {
    recommendedNames.add('smollm2:1.7b');
    recommendedNames.add('tinyllama');
  }

  // Ensure we have at least one recommendation
  if (recommendedNames.size === 0) {
    recommendedNames.add(ram >= 8 ? 'qwen2.5-coder:7b' : 'smollm2:1.7b');
  }

  const reasons: Record<string, string> = {
    'qwen2.5-coder:32b': 'Best code model for 24GB+ VRAM',
    'qwen2.5-coder:14b': 'Best code model for your 16GB+ VRAM',
    'deepseek-coder-v2': 'Strong code model for 16GB+ VRAM',
    'qwen2.5-coder:7b': hasGpu ? 'Best code model for your 8GB+ VRAM' : 'Best code model for your 16GB RAM (CPU)',
    'qwen2.5-coder:3b': 'Good balance of size and quality for 8GB RAM',
    'phi4': 'Small but capable for 8GB RAM',
    'smollm2:1.7b': 'Ultra-light for low RAM',
    'tinyllama': 'Smallest option for very limited RAM',
  };

  for (const m of RECOMMENDABLE_MODELS) {
    if (out.some(r => r.name === m.name)) continue;
    const fitsVram = m.minVramGB === null || vram >= m.minVramGB;
    const fitsRam = ram >= m.minRamGB;
    if (!fitsRam) continue;
    if (m.minVramGB !== null && !fitsVram) continue;
    const recommended = recommendedNames.has(m.name) && out.filter(r => r.recommended).length < 2;
    out.push({
      ...m,
      recommended,
      reason: reasons[m.name] ?? `Requires ${m.minRamGB}GB RAM${m.minVramGB ? `, ${m.minVramGB}GB VRAM` : ''}`,
      alreadyInstalled: false,
    });
  }

  // Sort: installed first, then recommended, then by size
  out.sort((a, b) => {
    if (a.alreadyInstalled !== b.alreadyInstalled) return a.alreadyInstalled ? -1 : 1;
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1;
    return a.sizeGB - b.sizeGB;
  });

  return out;
}
