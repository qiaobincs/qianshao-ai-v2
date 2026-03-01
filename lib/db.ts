import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'data', 'store.json');

export interface User {
  id: string;
  phone: string;
  password: string;
  name: string;
  created_at: string;
}

export interface Agent {
  id: string;
  name: string;
  category: string;
  description: string;
  bot_id: string;
  api_key: string;
  enabled: number;
  created_at: string;
}

interface Store {
  users: User[];
  agents: Agent[];
  config: {
    global_api_key: string;
    global_bot_id: string;
  };
}

function readStore(): Store {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeStore(store: Store): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

// User operations
export function getUsers(): Omit<User, 'password'>[] {
  const store = readStore();
  return store.users.map(({ password, ...rest }) => rest);
}

export function getUserByPhone(phone: string): User | undefined {
  const store = readStore();
  return store.users.find(u => u.phone === phone);
}

export function getUserById(id: string): User | undefined {
  const store = readStore();
  return store.users.find(u => u.id === id);
}

export function addUser(user: Omit<User, 'id' | 'created_at'> & { id?: string }): User {
  const store = readStore();
  const newUser: User = {
    id: user.id || `u${String(store.users.length + 1).padStart(3, '0')}`,
    phone: user.phone,
    password: user.password,
    name: user.name,
    created_at: new Date().toISOString(),
  };
  store.users.push(newUser);
  writeStore(store);
  return newUser;
}

export function deleteUser(id: string): boolean {
  const store = readStore();
  const idx = store.users.findIndex(u => u.id === id);
  if (idx === -1) return false;
  store.users.splice(idx, 1);
  writeStore(store);
  return true;
}

// Agent operations
export function getAgents(): Agent[] {
  const store = readStore();
  return store.agents;
}

export function getAgentsSafe(): Omit<Agent, 'bot_id' | 'api_key'>[] {
  const store = readStore();
  return store.agents
    .filter(a => a.enabled)
    .map(({ bot_id, api_key, ...rest }) => rest);
}

export function getAgentById(id: string): Agent | undefined {
  const store = readStore();
  return store.agents.find(a => a.id === id);
}

export function addAgent(agent: Omit<Agent, 'id' | 'created_at'>): Agent {
  const store = readStore();
  const newAgent: Agent = {
    ...agent,
    id: `a${String(store.agents.length + 1).padStart(3, '0')}`,
    created_at: new Date().toISOString(),
  };
  store.agents.push(newAgent);
  writeStore(store);
  return newAgent;
}

export function updateAgent(id: string, data: Partial<Agent>): Agent | null {
  const store = readStore();
  const idx = store.agents.findIndex(a => a.id === id);
  if (idx === -1) return null;
  store.agents[idx] = { ...store.agents[idx], ...data, id };
  writeStore(store);
  return store.agents[idx];
}

export function deleteAgent(id: string): boolean {
  const store = readStore();
  const idx = store.agents.findIndex(a => a.id === id);
  if (idx === -1) return false;
  store.agents.splice(idx, 1);
  writeStore(store);
  return true;
}

// Config
export function getConfig() {
  return readStore().config;
}

export function updateConfig(config: Partial<Store['config']>) {
  const store = readStore();
  store.config = { ...store.config, ...config };
  writeStore(store);
  return store.config;
}
