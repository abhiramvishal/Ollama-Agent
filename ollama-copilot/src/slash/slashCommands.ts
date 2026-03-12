export interface SlashCommand {
  name: string;
  usage: string;
  description: string;
  expandTo?: string;
  isDynamic?: boolean;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: 'help',
    usage: '/help',
    description: 'Show all available slash commands',
    isDynamic: true
  },
  {
    name: 'clear',
    usage: '/clear',
    description: 'Clear the current session messages',
    isDynamic: true
  },
  {
    name: 'new',
    usage: '/new [session name]',
    description: 'Start a new chat session',
    isDynamic: true
  },
  {
    name: 'status',
    usage: '/status',
    description: 'Ask Ollama to summarise the current git status',
    expandTo:
      'Run git_status and git_log to summarise the current state of the repo. ' +
      'List modified files and the last 5 commits. Be concise.'
  },
  {
    name: 'commit',
    usage: '/commit <message>',
    description: 'Stage all changes and commit with the given message',
    isDynamic: true
  },
  {
    name: 'search',
    usage: '/search <query>',
    description: 'Search the workspace with RAG and show top results',
    isDynamic: true
  },
  {
    name: 'explain',
    usage: '/explain',
    description: 'Explain the current editor selection',
    isDynamic: true
  },
  {
    name: 'fix',
    usage: '/fix',
    description: 'Find and fix bugs in the current editor selection',
    isDynamic: true
  },
  {
    name: 'tests',
    usage: '/tests',
    description: 'Write unit tests for the current editor selection',
    isDynamic: true
  },
  {
    name: 'model',
    usage: '/model <name>',
    description: 'Switch the active Ollama model',
    isDynamic: true
  }
];

export function matchSlashCommand(input: string): {
  command: SlashCommand;
  arg: string;
} | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return null;
  const parts = trimmed.slice(1).split(/\s+/);
  const name = parts[0]?.toLowerCase() ?? '';
  const arg = parts.slice(1).join(' ');
  const command = SLASH_COMMANDS.find(c => c.name === name);
  return command ? { command, arg } : null;
}

export function filterCommands(prefix: string): SlashCommand[] {
  const p = prefix.slice(1).toLowerCase();
  return SLASH_COMMANDS.filter(c => c.name.startsWith(p));
}
