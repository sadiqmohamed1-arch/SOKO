import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface UserEntity {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'buyer' | 'supplier' | 'contractor' | 'admin';
  company: string;
  title: string;
  phone: string;
  tradeLicenseNo?: string;
  vatTrn?: string;
  avatarUrl: string;
  location: string;
  isVerified: boolean;
  rewardPoints: number;
  streakDays: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

// In-memory + persisted JSON file database
const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default seeded users (Passwords are hashed 'Password123!')
const DEFAULT_PASSWORD_HASH = '$2b$10$qhnZGqrgBMdEyM7q.pLIFeiX05EmsRtL9mOh91aOnVdl3wVLcFe5W';

const DEFAULT_USERS: UserEntity[] = [
  {
    id: 'usr_admin_zackary',
    name: 'Zackary Al-Hassan',
    email: 'admin@soko.ae',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'admin',
    company: 'soko.ae Central Operations & Governance',
    title: 'Chief Governance & Platform Super Admin',
    phone: '+971 4 200 9999',
    tradeLicenseNo: 'GOV-SOKO-001',
    vatTrn: '100100100100003',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    location: 'DIFC Gate Precinct, Dubai, UAE',
    isVerified: true,
    rewardPoints: 9999,
    streakDays: 365,
    createdAt: '2025-01-01T08:00:00.000Z',
    updatedAt: '2026-09-26T10:00:00.000Z',
    lastLoginAt: '2026-09-26T12:00:00.000Z',
  },
  {
    id: 'usr_buyer_marcus',
    name: 'Marcus Vance',
    email: 'buyer@soko.ae',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'buyer',
    company: 'Vance Infrastructure Group UAE',
    title: 'Director of Strategic Sourcing & EPC Contracts',
    phone: '+971 4 388 9100',
    tradeLicenseNo: 'CN-1092831',
    vatTrn: '100293847500003',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    location: 'Downtown Dubai, UAE',
    isVerified: true,
    rewardPoints: 720,
    streakDays: 4,
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-09-22T10:00:00.000Z',
    lastLoginAt: '2026-09-22T12:00:00.000Z',
  },
  {
    id: 'usr_supplier_elena',
    name: 'Elena Rostova',
    email: 'supplier@soko.ae',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'supplier',
    company: 'Apex Industrial Castings & Alloys',
    title: 'VP of Commercial Sales & Operations',
    phone: '+971 4 881 4099',
    tradeLicenseNo: 'CN-4491028',
    vatTrn: '100394857600003',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    location: 'Jebel Ali Free Zone (JAFZA), Dubai',
    isVerified: true,
    rewardPoints: 1150,
    streakDays: 7,
    createdAt: '2026-01-15T09:30:00.000Z',
    updatedAt: '2026-09-22T10:00:00.000Z',
    lastLoginAt: '2026-09-22T13:30:00.000Z',
  },
  {
    id: 'usr_contractor_sarah',
    name: 'Sarah Jenkins',
    email: 'contractor@soko.ae',
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: 'contractor',
    company: 'Apex Industrial Mechanical GC',
    title: 'Executive Project Director & General Contractor',
    phone: '+971 2 677 3400',
    tradeLicenseNo: 'CN-8819201',
    vatTrn: '100882736400003',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    location: 'Al Maryah Island, Abu Dhabi',
    isVerified: true,
    rewardPoints: 540,
    streakDays: 3,
    createdAt: '2026-02-01T11:00:00.000Z',
    updatedAt: '2026-09-22T10:00:00.000Z',
    lastLoginAt: '2026-09-22T11:15:00.000Z',
  },
];

class UserDatabase {
  private users: UserEntity[] = [];

  constructor() {
    this.loadDatabase();
  }

  private loadDatabase() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.users = JSON.parse(fileContent);
        // Ensure default users like admin are present
        let updated = false;
        for (const defaultUser of DEFAULT_USERS) {
          if (!this.users.some((u) => u.email.toLowerCase() === defaultUser.email.toLowerCase())) {
            this.users.push(defaultUser);
            updated = true;
          }
        }
        if (updated) {
          this.saveDatabase();
        }
      } else {
        this.users = [...DEFAULT_USERS];
        this.saveDatabase();
      }
    } catch (err) {
      console.warn('Error reading database file, re-initializing defaults:', err);
      this.users = [...DEFAULT_USERS];
      this.saveDatabase();
    }
  }

  private saveDatabase() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.users, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write to database file:', err);
    }
  }

  public findByEmail(email: string): UserEntity | undefined {
    return this.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  }

  public findById(id: string): UserEntity | undefined {
    return this.users.find((u) => u.id === id);
  }

  public getAll(): Omit<UserEntity, 'passwordHash'>[] {
    return this.users.map(({ passwordHash, ...rest }) => rest);
  }

  public async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: 'buyer' | 'supplier' | 'contractor';
    company: string;
    title?: string;
    phone: string;
    tradeLicenseNo?: string;
    vatTrn?: string;
    location?: string;
  }): Promise<Omit<UserEntity, 'passwordHash'>> {
    const existing = this.findByEmail(data.email);
    if (existing) {
      throw new Error('An account with this corporate email already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const defaultAvatars: Record<string, string> = {
      buyer: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      supplier: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      contractor: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    };

    const now = new Date().toISOString();
    const newUser: UserEntity = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      passwordHash,
      role: data.role,
      company: data.company.trim(),
      title: data.title?.trim() || (data.role === 'buyer' ? 'Procurement Lead' : data.role === 'supplier' ? 'Sales Director' : 'Project Manager'),
      phone: data.phone.trim(),
      tradeLicenseNo: data.tradeLicenseNo?.trim() || `CN-${Math.floor(1000000 + Math.random() * 9000000)}`,
      vatTrn: data.vatTrn?.trim() || `100${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      avatarUrl: defaultAvatars[data.role],
      location: data.location || 'Dubai, UAE',
      isVerified: true,
      rewardPoints: 100, // 100 bonus welcome points for new members
      streakDays: 1,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    this.users.unshift(newUser);
    this.saveDatabase();

    const { passwordHash: _, ...sanitized } = newUser;
    return sanitized;
  }

  public updateLastLogin(id: string) {
    const user = this.findById(id);
    if (user) {
      user.lastLoginAt = new Date().toISOString();
      this.saveDatabase();
    }
  }
}

export const userDb = new UserDatabase();
