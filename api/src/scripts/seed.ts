import { database } from '../config/database';
import { companyRepository } from '../repositories/company.repository';
import { userRepository } from '../repositories/user.repository';
import { projectRepository } from '../repositories/project.repository';
import { SubscriptionTier, UserRole, Visibility } from '@rag/types';
import { logger } from '../utils/logger';
import { CreateCompanyDTO, ICompany } from '../schemas/company.schema';
import { CreateUserDTO, IUser } from '../schemas/user.schema';
import { CreateProjectDTO, IProject } from '../schemas/project.schema';

// Extended DTOs for seeding with explicit IDs
type SeedCompanyDTO = CreateCompanyDTO & { _id: string };
type SeedUserDTO = Omit<CreateUserDTO, 'password'> & { _id: string; passwordHash: string };
type SeedProjectDTO = CreateProjectDTO & { _id: string };

// Helper function to find or create a company
async function findOrCreateCompany(
  seedData: SeedCompanyDTO
): Promise<{ company: ICompany; created: boolean }> {
  // Try to find by _id first, then by slug
  let existing = await companyRepository.findById(seedData._id);
  if (!existing) {
    existing = await companyRepository.findBySlug(seedData.slug);
  }

  if (existing) {
    logger.info('Company already exists, skipping', {
      companyId: existing._id,
      slug: existing.slug,
    });
    return { company: existing, created: false };
  }

  const company = await companyRepository.create(seedData as CreateCompanyDTO & { _id: string });
  logger.info('Company created', { companyId: company._id, apiKey: company.apiKey });
  return { company, created: true };
}

// Helper function to find or create a user
async function findOrCreateUser(seedData: SeedUserDTO): Promise<{ user: IUser; created: boolean }> {
  // Try to find by _id first, then by email
  let existing = await userRepository.findById(seedData._id);
  if (!existing) {
    existing = await userRepository.findByEmail(seedData.email);
  }

  if (existing) {
    logger.info('User already exists, skipping', { userId: existing._id, email: existing.email });
    return { user: existing, created: false };
  }

  const user = await userRepository.create(seedData as SeedUserDTO);
  logger.info('User created', { userId: user._id, email: user.email });
  return { user, created: true };
}

// Helper function to find or create a project
async function findOrCreateProject(
  seedData: SeedProjectDTO
): Promise<{ project: IProject; created: boolean }> {
  // Try to find by _id first (including soft-deleted), then by slug within the company
  let existing = await projectRepository.findByIdIncludingDeleted(seedData._id);
  if (!existing) {
    existing = await projectRepository.findBySlug(seedData.companyId, seedData.slug);
  }

  if (existing) {
    logger.info('Project already exists, skipping', {
      projectId: existing._id,
      slug: existing.slug,
    });
    return { project: existing, created: false };
  }

  const project = await projectRepository.create(seedData as CreateProjectDTO & { _id: string });
  logger.info('Project created', { projectId: project._id, slug: project.slug });
  return { project, created: true };
}

async function seed(): Promise<void> {
  try {
    logger.info('Starting database seed (additive mode - existing data will be preserved)...');

    // Connect to MongoDB
    await database.connect();

    // Create companies (only if they don't exist)
    logger.info('Seeding companies...');

    const seedCompany1: SeedCompanyDTO = {
      _id: '507f1f77bcf86cd799439011',
      name: 'Acme Corporation',
      slug: 'acme-corp',
      email: 'admin@acme-corp.com',
      apiKey: 'dev-key-123',
      subscriptionTier: SubscriptionTier.PROFESSIONAL,
      storageLimit: 10737418240, // 10GB
      maxUsers: 50,
      maxProjects: 100,
      settings: {
        notifications: {
          email: true,
          slack: false,
        },
        features: {
          advancedSearch: true,
          apiAccess: true,
        },
      },
    };
    const { company: company1 } = await findOrCreateCompany(seedCompany1);

    const seedCompany2: SeedCompanyDTO = {
      _id: '507f1f77bcf86cd799439012',
      name: 'TechStart Inc',
      slug: 'techstart',
      email: 'hello@techstart.io',
      subscriptionTier: SubscriptionTier.STARTER,
      storageLimit: 5368709120, // 5GB
      maxUsers: 10,
      maxProjects: 20,
    };
    const { company: company2 } = await findOrCreateCompany(seedCompany2);

    // Create users (only if they don't exist)
    logger.info('Seeding users for Acme Corporation...');

    const passwordHash = await userRepository.hashPassword('password123');

    const seedUser1: SeedUserDTO = {
      _id: '507f1f77bcf86cd799439020',
      companyId: company1._id,
      email: 'john.doe@acme-corp.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.OWNER,
      permissions: {
        canUpload: true,
        canDelete: true,
        canShare: true,
        canManageUsers: true,
      },
    };
    const { user: user1 } = await findOrCreateUser(seedUser1);

    const seedUser2: SeedUserDTO = {
      _id: '507f1f77bcf86cd799439021',
      companyId: company1._id,
      email: 'jane.smith@acme-corp.com',
      passwordHash,
      firstName: 'Jane',
      lastName: 'Smith',
      role: UserRole.ADMIN,
      permissions: {
        canUpload: true,
        canDelete: true,
        canShare: true,
        canManageUsers: false,
      },
    };
    const { user: user2 } = await findOrCreateUser(seedUser2);

    const seedUser3: SeedUserDTO = {
      _id: '507f1f77bcf86cd799439022',
      companyId: company1._id,
      email: 'bob.johnson@acme-corp.com',
      passwordHash,
      firstName: 'Bob',
      lastName: 'Johnson',
      role: UserRole.MEMBER,
      permissions: {
        canUpload: true,
        canDelete: false,
        canShare: true,
        canManageUsers: false,
      },
    };
    const { user: user3 } = await findOrCreateUser(seedUser3);

    // Create users for company2
    logger.info('Seeding users for TechStart Inc...');

    const seedUser4: SeedUserDTO = {
      _id: '507f1f77bcf86cd799439023',
      companyId: company2._id,
      email: 'sarah.wilson@techstart.io',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Wilson',
      role: UserRole.OWNER,
    };
    const { user: user4 } = await findOrCreateUser(seedUser4);

    // Create projects (only if they don't exist)
    logger.info('Seeding projects for Acme Corporation...');

    const seedProject1: SeedProjectDTO = {
      _id: '507f1f77bcf86cd799439030',
      companyId: company1._id,
      ownerId: user1._id,
      name: 'Product Documentation',
      slug: 'product-docs',
      description: 'Centralized product documentation and user guides',
      color: '#3B82F6',
      icon: '📚',
      tags: ['documentation', 'product', 'guides'],
      visibility: Visibility.COMPANY,
      settings: {
        autoIndex: true,
        chunkSize: 1000,
        chunkOverlap: 200,
      },
      metadata: {
        department: 'Product',
        category: 'Documentation',
      },
    };
    const { project: project1 } = await findOrCreateProject(seedProject1);

    const seedProject2: SeedProjectDTO = {
      _id: '507f1f77bcf86cd799439031',
      companyId: company1._id,
      ownerId: user2._id,
      name: 'Customer Support KB',
      slug: 'support-kb',
      description: 'Customer support knowledge base and FAQs',
      color: '#10B981',
      icon: '💬',
      tags: ['support', 'kb', 'customer-service'],
      visibility: Visibility.TEAM,
      settings: {
        autoIndex: true,
        chunkSize: 800,
        chunkOverlap: 150,
      },
      metadata: {
        department: 'Support',
        category: 'Knowledge Base',
      },
    };
    const { project: project2 } = await findOrCreateProject(seedProject2);

    const seedProject3: SeedProjectDTO = {
      _id: '507f1f77bcf86cd799439032',
      companyId: company1._id,
      ownerId: user1._id,
      name: 'Legal Documents',
      slug: 'legal-docs',
      description: 'Company legal documents and contracts',
      color: '#EF4444',
      icon: '⚖️',
      tags: ['legal', 'contracts', 'confidential'],
      visibility: Visibility.PRIVATE,
      metadata: {
        department: 'Legal',
        category: 'Confidential',
      },
    };
    const { project: project3 } = await findOrCreateProject(seedProject3);

    // Create projects for company2
    logger.info('Seeding projects for TechStart Inc...');

    const seedProject4: SeedProjectDTO = {
      _id: '507f1f77bcf86cd799439033',
      companyId: company2._id,
      ownerId: user4._id,
      name: 'Engineering Docs',
      slug: 'eng-docs',
      description: 'Technical documentation and architecture docs',
      color: '#8B5CF6',
      icon: '🔧',
      tags: ['engineering', 'technical', 'architecture'],
      visibility: Visibility.COMPANY,
      settings: {
        autoIndex: true,
        chunkSize: 1200,
        chunkOverlap: 200,
      },
      metadata: {
        department: 'Engineering',
        category: 'Technical',
      },
    };
    const { project: project4 } = await findOrCreateProject(seedProject4);

    logger.info('✅ Database seed completed successfully (existing data preserved)!');
    logger.info('');
    logger.info('='.repeat(80));
    logger.info('SEED DATA SUMMARY (created or already existed)');
    logger.info('='.repeat(80));
    logger.info('');
    logger.info('Companies:');
    logger.info(`  1. ${company1.name} (${company1.slug})`);
    logger.info(`     API Key: ${company1.apiKey}`);
    logger.info(`     Email: ${company1.email}`);
    logger.info(`     Tier: ${company1.subscriptionTier}`);
    logger.info('');
    logger.info(`  2. ${company2.name} (${company2.slug})`);
    logger.info(`     API Key: ${company2.apiKey}`);
    logger.info(`     Email: ${company2.email}`);
    logger.info(`     Tier: ${company2.subscriptionTier}`);
    logger.info('');
    logger.info('Users (Password for new users: password123):');
    logger.info(`  - ${user1.email} (${user1.role}) - Acme Corporation`);
    logger.info(`  - ${user2.email} (${user2.role}) - Acme Corporation`);
    logger.info(`  - ${user3.email} (${user3.role}) - Acme Corporation`);
    logger.info(`  - ${user4.email} (${user4.role}) - TechStart Inc`);
    logger.info('');
    logger.info('Projects:');
    logger.info(`  - ${project1.name} (${project1.slug}) - Acme Corporation`);
    logger.info(`  - ${project2.name} (${project2.slug}) - Acme Corporation`);
    logger.info(`  - ${project3.name} (${project3.slug}) - Acme Corporation`);
    logger.info(`  - ${project4.name} (${project4.slug}) - TechStart Inc`);
    logger.info('');
    logger.info('='.repeat(80));
    logger.info('');
    logger.info('💡 Use the API Keys above to test the API endpoints');
    logger.info('   Example: curl -H "x-api-key: YOUR_API_KEY" http://localhost:8000/health');
    logger.info('');

    // Disconnect
    await database.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Seed failed', { error });
    process.exit(1);
  }
}

// Run seed
seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
